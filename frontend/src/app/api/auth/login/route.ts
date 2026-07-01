import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as pgdb from "@/lib/pgdb";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file in login API", err);
    return {};
  }
}

async function findUserByEmail(email: string): Promise<any | null> {
  const emailLower = email.toLowerCase().trim();

  if (pgdb.isConfigured()) {
    try {
      const users = await pgdb.getValue("global_users");
      if (Array.isArray(users)) {
        const found = users.find((u: any) => u.email && u.email.toLowerCase().trim() === emailLower);
        if (found) return found;
      }
    } catch (e) {
      console.error("Railway read failed in login auth", e);
    }
  }

  const dbData = readDb();
  const users = dbData.users || [];
  return users.find((u: any) => u.email && u.email.toLowerCase().trim() === emailLower) || null;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email va parol kiritilishi shart." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Email yoki parol noto'g'ri." },
        { status: 400 }
      );
    }

    // Compare stored password with hashed input (handling bcrypt and legacy sha256/plaintext)
    const storedPassword = user.password || "";
    let passwordValid = false;

    try {
      passwordValid = bcrypt.compareSync(password, storedPassword);
    } catch {
      // Not a bcrypt hash
    }

    if (!passwordValid) {
      const legacyHashed = crypto.createHash("sha256").update(password).digest("hex");
      if (storedPassword === legacyHashed || storedPassword === password) {
        passwordValid = true;
        
        // Upgrade legacy hash to bcrypt
        const upgradedBcryptHash = bcrypt.hashSync(password, 10);
        user.password = upgradedBcryptHash;

        if (pgdb.isConfigured()) {
          try {
            const usersList = await pgdb.getValue("global_users") || [];
            const idx = usersList.findIndex((u: any) => u.id === user.id);
            if (idx > -1) {
              usersList[idx].password = upgradedBcryptHash;
              await pgdb.setValue("global_users", usersList);
            }
          } catch (dbErr) {
            console.error("Failed to upgrade password to bcrypt in Postgres:", dbErr);
          }
        } else {
          try {
            const dbData = readDb();
            const idx = dbData.users?.findIndex((u: any) => u.id === user.id);
            if (idx > -1) {
              dbData.users[idx].password = upgradedBcryptHash;
              fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf8");
            }
          } catch (dbErr) {
            console.error("Failed to upgrade password to bcrypt in local db:", dbErr);
          }
        }
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Email yoki parol noto'g'ri." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan || "free",
        role: user.role || "user"
      }
    });
  } catch (err: unknown) {
    console.error("[login-auth] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "Tizimga kirishda xatolik yuz berdi.";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
