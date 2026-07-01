import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
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
    console.error("Error reading database file in check-email API", err);
    return {};
  }
}

async function userExists(email: string): Promise<boolean> {
  const emailLower = email.toLowerCase().trim();

  if (pgdb.isConfigured()) {
    try {
      const users = await pgdb.getValue("global_users");
      if (Array.isArray(users)) {
        return users.some((u: any) => u.email && u.email.toLowerCase().trim() === emailLower);
      }
    } catch (e) {
      console.error("Railway read failed in check-email auth", e);
    }
  }

  const dbData = readDb();
  const users = dbData.users || [];
  return users.some((u: any) => u.email && u.email.toLowerCase().trim() === emailLower);
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email kiritilishi shart." },
        { status: 400 }
      );
    }

    const exists = await userExists(email);
    return NextResponse.json({ success: true, exists });
  } catch (err: unknown) {
    console.error("[check-email-auth] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "Emailni tekshirishda xatolik yuz berdi.";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
