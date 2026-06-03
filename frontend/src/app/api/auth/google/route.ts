import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as pgdb from "@/lib/pgdb";
import { signJwt } from "@/lib/jwt";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file in google auth API", err);
    return {};
  }
}

async function findUserByEmail(email: string): Promise<any | null> {
  const emailLower = email.toLowerCase().trim();

  // Try Railway PostgreSQL first
  if (pgdb.isConfigured()) {
    try {
      const users = await pgdb.getValue("global_users");
      if (Array.isArray(users)) {
        const found = users.find((u: any) => u.email && u.email.toLowerCase().trim() === emailLower);
        if (found) return found;
      }
    } catch (e) {
      console.error("Railway read failed in google auth, falling back to local file", e);
    }
  }

  // Fallback to local DB file
  const dbData = readDb();
  const users = dbData.users || [];
  return users.find((u: any) => u.email && u.email.toLowerCase().trim() === emailLower) || null;
}

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Google credential kiritilishi shart." },
        { status: 400 }
      );
    }

    // 1. Verify Google ID token using Google TokenInfo API
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenInfoRes.ok) {
      const errData = await tokenInfoRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errData.error_description || "Google ID Token faollashtirilmadi yoki noto'g'ri." },
        { status: 400 }
      );
    }

    const payload = await tokenInfoRes.json();
    const email = payload.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Google tokenida elektron pochta topilmadi." },
        { status: 400 }
      );
    }

    // Check allowed domains (only @gmail.com or @icloud.com)
    if (!email.endsWith("@gmail.com") && !email.endsWith("@icloud.com")) {
      return NextResponse.json(
        { success: false, error: "Faqat @gmail.com yoki @icloud.com elektron pochta manzillari qabul qilinadi." },
        { status: 400 }
      );
    }

    // Load JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not configured on the server");
    }

    // Find if user already exists
    const user = await findUserByEmail(email);
    let userId = "";

    if (user) {
      userId = user.id || "11111111-1111-1111-1111-111111111111";
    } else {
      // User is registering, generate a temporary UUID to sign token
      userId = crypto.randomUUID();
    }

    // Sign 1 hour JWT token
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      user_id: userId,
      email: email,
      iat: now,
      exp: now + 3600 // 1 hour expiration
    };

    const token = signJwt(tokenPayload, jwtSecret);

    return NextResponse.json({
      success: true,
      token,
      userId,
      isRegistered: !!user,
      user: user || null
    });
  } catch (err: unknown) {
    console.error("[google-auth] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "Google orqali kirishda xatolik yuz berdi.";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
