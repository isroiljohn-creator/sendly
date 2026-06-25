import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyJwt } from "@/lib/jwt";
import * as pgdb from "@/lib/pgdb";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

class Mutex {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const parent = this.queue;
    this.queue = this.queue.then(() => pending);
    await parent;
    return release!;
  }
}

const voucherLocks = new Map<string, Mutex>();

function getVoucherMutex(code: string): Mutex {
  let mutex = voucherLocks.get(code);
  if (!mutex) {
    mutex = new Mutex();
    voucherLocks.set(code, mutex);
  }
  return mutex;
}

const LOCK_DIR = path.join(process.cwd(), "db.lock");

function acquireFileLock(): boolean {
  const maxRetries = 15;
  const retryDelay = 50; // ms
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(LOCK_DIR);
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        const start = Date.now();
        while (Date.now() - start < retryDelay) {
          // block
        }
      } else {
        return false;
      }
    }
  }
  return false;
}

function releaseFileLock() {
  try {
    if (fs.existsSync(LOCK_DIR)) {
      fs.rmdirSync(LOCK_DIR);
    }
  } catch (e) {
    // ignore
  }
}

interface CreditTransaction {
  id: string;
  type: "purchase" | "usage";
  amount: number;
  description: string;
  date: string;
}

interface CreditsData {
  balance: number;
  used: number;
  history: CreditTransaction[];
  usedVouchers?: string[];
}

function getInitialCredits(): CreditsData {
  return {
    balance: 100, // 100 welcome credits
    used: 0,
    history: [
      {
        id: `init-${Date.now()}`,
        type: "purchase",
        amount: 100,
        description: "Ro'yxatdan o'tish sovg'asi (Welcome bonus)",
        date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }),
      }
    ],
    usedVouchers: []
  };
}

function readDbUnlocked() {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  const data = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(data);
}

function writeDbUnlocked(data: unknown) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  return true;
}

function readDb() {
  const hasLock = acquireFileLock();
  try {
    return readDbUnlocked();
  } catch (err) {
    console.error("Error reading database file in credits API", err);
    return {};
  } finally {
    if (hasLock) releaseFileLock();
  }
}

function writeDb(data: unknown) {
  const hasLock = acquireFileLock();
  try {
    return writeDbUnlocked(data);
  } catch (err) {
    console.error("Error writing to database file in credits API", err);
    return false;
  } finally {
    if (hasLock) releaseFileLock();
  }
}

async function readUserCredits(userId: string): Promise<CreditsData> {
  if (pgdb.isConfigured()) {
    try {
      const uData = await pgdb.getValue("global_settings_" + userId) || {};
      if (uData.replai_ai_credits_data) {
        const creditsData = typeof uData.replai_ai_credits_data === "string"
          ? JSON.parse(uData.replai_ai_credits_data)
          : uData.replai_ai_credits_data;
        if (!creditsData.usedVouchers) {
          creditsData.usedVouchers = [];
        }
        return creditsData;
      }
    } catch (e) {
      console.error("Failed to read user credits from pgdb", e);
    }
  }

  // Fallback to local db.json
  const dbData = readDb();
  const userData = dbData.userData?.[userId] || {};
  let creditsData: CreditsData;
  if (!userData["replai_ai_credits_data"]) {
    creditsData = getInitialCredits();
  } else {
    try {
      creditsData = typeof userData["replai_ai_credits_data"] === "string"
        ? JSON.parse(userData["replai_ai_credits_data"])
        : userData["replai_ai_credits_data"];
      if (!creditsData.usedVouchers) {
        creditsData.usedVouchers = [];
      }
    } catch {
      creditsData = getInitialCredits();
    }
  }
  return creditsData;
}

async function writeUserCredits(userId: string, creditsData: CreditsData): Promise<boolean> {
  if (pgdb.isConfigured()) {
    try {
      const uData = await pgdb.getValue("global_settings_" + userId) || {};
      uData.replai_ai_credits_data = creditsData;
      await pgdb.setValue("global_settings_" + userId, uData);
      return true;
    } catch (e) {
      console.error("Failed to write user credits to pgdb", e);
    }
  }

  // Fallback to local db.json
  try {
    const dbData = readDb();
    if (!dbData.userData) dbData.userData = {};
    if (!dbData.userData[userId]) dbData.userData[userId] = {};
    dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);
    return writeDb(dbData);
  } catch (e) {
    console.error("Failed to write user credits to local db", e);
    return false;
  }
}

async function redeemVoucher(userId: string, normalizedCode: string, creditsData: CreditsData): Promise<{ error?: string }> {
  let promoCodes = [];
  let usersList = [];
  let adminData: any = {};

  if (pgdb.isConfigured()) {
    try {
      usersList = await pgdb.getValue("global_users") || [];
      adminData = await pgdb.getValue("global_admin_data") || {};
      promoCodes = adminData.promoCodes || [];
    } catch (e) {
      console.error("Failed to read voucher data from pgdb", e);
    }
  } else {
    const dbData = readDb();
    usersList = dbData.users || [];
    promoCodes = dbData.promoCodes || [];
  }

  // Filter legacy vouchers
  promoCodes = promoCodes.filter((v: any) => v && v.code !== "SENDLY10" && v.code !== "WELCOME" && v.code !== "PROMO50");

  const voucherInfo = promoCodes.find((v: any) => v.code === normalizedCode);
  if (!voucherInfo) {
    return { error: "Bunday promokod mavjud emas yoki muddati tugagan." };
  }

  if (voucherInfo.expiresAt) {
    const expiryDate = new Date(voucherInfo.expiresAt);
    if (expiryDate.getTime() < Date.now()) {
      return { error: "Ushbu promokodning amal qilish muddati tugagan." };
    }
  }

  if (creditsData.usedVouchers?.includes(normalizedCode)) {
    return { error: "Ushbu promokod allaqachon faollashtirilgan!" };
  }

  // Check max uses limit
  if (voucherInfo.usedCount >= (voucherInfo.maxUses || 1000)) {
    return { error: "Ushbu promokodning faollashtirish limiti tugagan." };
  }

  // Check email restriction
  const userObj = usersList.find((u: any) => u.id === userId);
  const userEmail = userObj?.email || "";
  if (
    voucherInfo.restrictedToEmail && 
    voucherInfo.restrictedToEmail.trim() !== "" && 
    voucherInfo.restrictedToEmail.toLowerCase() !== userEmail.toLowerCase()
  ) {
    return { error: "Ushbu ramziy kod faqat maxsus ruxsat berilgan email manzili uchun amal qiladi." };
  }

  // Redeem
  voucherInfo.usedCount = (voucherInfo.usedCount || 0) + 1;
  creditsData.balance = (creditsData.balance || 0) + voucherInfo.amount;
  if (!creditsData.usedVouchers) {
    creditsData.usedVouchers = [];
  }
  creditsData.usedVouchers.push(normalizedCode);

  const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  creditsData.history.unshift({
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "purchase",
    amount: voucherInfo.amount,
    description: `Promokod faollashtirildi: ${normalizedCode}`,
    date: timestamp
  });

  // Save promo code status back
  if (pgdb.isConfigured()) {
    try {
      adminData.promoCodes = promoCodes;
      await pgdb.setValue("global_admin_data", adminData);
    } catch (e) {
      console.error("Failed to save updated vouchers to pgdb", e);
    }
  } else {
    const dbData = readDb();
    dbData.promoCodes = promoCodes;
    writeDb(dbData);
  }

  return {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "guest";

  if (userId === "guest") {
    return NextResponse.json({ error: "Unauthorized: Guests have no credits data" }, { status: 401 });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;
  
  if (!token || !jwtSecret || !jwtPattern.test(token)) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
  }
  
  const payload = verifyJwt(token, jwtSecret);
  if (!payload || payload.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  const creditsData = await readUserCredits(userId);
  return NextResponse.json(creditsData);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "guest";

    if (userId === "guest") {
      return NextResponse.json({ error: "Unauthorized: Guests have no credits data" }, { status: 401 });
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;
    
    if (!token || !jwtSecret || !jwtPattern.test(token)) {
      return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }
    
    const payload = verifyJwt(token, jwtSecret);
    if (!payload || payload.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { action, amount, description } = body;

    const creditsData = await readUserCredits(userId);
    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    if (action === "buy") {
      // Allow simulated credit purchase for all users in prototype/demo mode
      creditsData.balance = (creditsData.balance || 0) + amount;
      creditsData.history.unshift({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "purchase",
        amount,
        description: description || `${amount} AI kredit paketi sotib olindi`,
        date: timestamp
      });
    } else if (action === "deduct") {
      if (creditsData.balance < amount) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
      }
      creditsData.balance = Math.max(0, creditsData.balance - amount);
      creditsData.used = (creditsData.used || 0) + amount;
      creditsData.history.unshift({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "usage",
        amount,
        description: description || "AI yordamchi javobi",
        date: timestamp
      });
    } else if (action === "redeem_voucher") {
      const code = body.code;
      if (!code) {
        return NextResponse.json({ error: "Kupon kodi kiritilmagan." }, { status: 400 });
      }
      const normalizedCode = code.trim().toUpperCase();

      const mutex = getVoucherMutex(normalizedCode);
      const release = await mutex.acquire();
      try {
        const freshCreditsData = await readUserCredits(userId);
        const redeemRes = await redeemVoucher(userId, normalizedCode, freshCreditsData);
        if (redeemRes.error) {
          return NextResponse.json({ error: redeemRes.error }, { status: 400 });
        }
        await writeUserCredits(userId, freshCreditsData);
        return NextResponse.json(freshCreditsData);
      } finally {
        release();
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await writeUserCredits(userId, creditsData);
    return NextResponse.json(creditsData);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
