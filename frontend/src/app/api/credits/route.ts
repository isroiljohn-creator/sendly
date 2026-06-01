import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

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

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file in credits API", err);
    return {};
  }
}

function writeDb(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing to database file in credits API", err);
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "guest";

  const dbData = readDb();
  if (!dbData.userData) {
    dbData.userData = {};
  }
  if (!dbData.userData[userId]) {
    dbData.userData[userId] = {};
  }

  let creditsData: CreditsData;
  if (!dbData.userData[userId]["replai_ai_credits_data"]) {
    creditsData = getInitialCredits();
    dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);
    writeDb(dbData);
  } else {
    try {
      creditsData = JSON.parse(dbData.userData[userId]["replai_ai_credits_data"]);
      if (!creditsData.usedVouchers) {
        creditsData.usedVouchers = [];
      }
    } catch {
      creditsData = getInitialCredits();
      dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);
      writeDb(dbData);
    }
  }

  return NextResponse.json(creditsData);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "guest";
    const body = await request.json();
    const { action, amount, description } = body;

    const dbData = readDb();
    if (!dbData.userData) {
      dbData.userData = {};
    }
    if (!dbData.userData[userId]) {
      dbData.userData[userId] = {};
    }

    let creditsData: CreditsData;
    if (!dbData.userData[userId]["replai_ai_credits_data"]) {
      creditsData = getInitialCredits();
    } else {
      try {
        creditsData = JSON.parse(dbData.userData[userId]["replai_ai_credits_data"]);
        if (!creditsData.usedVouchers) {
          creditsData.usedVouchers = [];
        }
      } catch {
        creditsData = getInitialCredits();
      }
    }

    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    if (action === "buy") {
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

      // Find user's email
      const usersList = dbData.users || [];
      const userObj = usersList.find((u: any) => u.id === userId);
      const userEmail = userObj?.email || "";

      // Initialize promoCodes database if not present
      if (!dbData.promoCodes) {
        dbData.promoCodes = [];
      } else {
        dbData.promoCodes = dbData.promoCodes.filter((v: any) => v && v.code !== "SENDLY10" && v.code !== "WELCOME" && v.code !== "PROMO50");
      }

      const voucherInfo = dbData.promoCodes.find((v: any) => v.code === normalizedCode);
      if (!voucherInfo) {
        return NextResponse.json({ error: "Bunday promokod mavjud emas yoki muddati tugagan." }, { status: 400 });
      }

      if (creditsData.usedVouchers?.includes(normalizedCode)) {
        return NextResponse.json({ error: "Ushbu promokod allaqachon faollashtirilgan!" }, { status: 400 });
      }

      // Check max uses limit
      if (voucherInfo.usedCount >= (voucherInfo.maxUses || 1000)) {
        return NextResponse.json({ error: "Ushbu promokodning faollashtirish limiti tugagan." }, { status: 400 });
      }

      // Check email restriction
      if (
        voucherInfo.restrictedToEmail && 
        voucherInfo.restrictedToEmail.trim() !== "" && 
        voucherInfo.restrictedToEmail.toLowerCase() !== userEmail.toLowerCase()
      ) {
        return NextResponse.json({ error: "Ushbu promokod faqat maxsus ruxsat berilgan email manzili uchun amal qiladi." }, { status: 400 });
      }

      // Redeem
      voucherInfo.usedCount = (voucherInfo.usedCount || 0) + 1;
      creditsData.balance = (creditsData.balance || 0) + voucherInfo.amount;
      if (!creditsData.usedVouchers) {
        creditsData.usedVouchers = [];
      }
      creditsData.usedVouchers.push(normalizedCode);

      creditsData.history.unshift({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "purchase",
        amount: voucherInfo.amount,
        description: `Promokod faollashtirildi: ${normalizedCode}`,
        date: timestamp
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);
    writeDb(dbData);

    return NextResponse.json(creditsData);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
