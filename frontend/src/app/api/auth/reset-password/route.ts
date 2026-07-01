import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as pgdb from "@/lib/pgdb";
import { verifyJwt } from "@/lib/jwt";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file in reset-password API", err);
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database file in reset-password API", err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }

    const payload = verifyJwt(token, jwtSecret);
    if (!payload || !payload.user_id) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Yangi parol kiritilishi shart." }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Update in Railway Postgres if configured
    if (pgdb.isConfigured()) {
      try {
        const usersList = await pgdb.getValue("global_users") || [];
        const idx = usersList.findIndex((u: any) => u.id === payload.user_id);
        if (idx > -1) {
          usersList[idx].password = hashedPassword;
          await pgdb.setValue("global_users", usersList);
          console.log(`[reset-password] Successfully updated password for user ID: ${payload.user_id} in PostgreSQL`);
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
        }
      } catch (e: any) {
        console.error("Failed to update password in pgdb:", e);
        return NextResponse.json({ error: "Baza bilan bog'lanishda xatolik: " + e.message }, { status: 500 });
      }
    }

    // Fallback: update in local db.json file
    const dbData = readDb();
    const users = dbData.users || [];
    const idx = users.findIndex((u: any) => u.id === payload.user_id);
    if (idx > -1) {
      users[idx].password = hashedPassword;
      dbData.users = users;
      writeDb(dbData);
      console.log(`[reset-password] Successfully updated password for user ID: ${payload.user_id} in db.json`);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
    }
  } catch (err: unknown) {
    console.error("[reset-password-api] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "Parolni tiklashda xatolik yuz berdi.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
