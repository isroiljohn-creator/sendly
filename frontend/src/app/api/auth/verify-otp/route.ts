import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as pgdb from "@/lib/pgdb";
import { verifyOtpCode, checkRateLimit } from "@/lib/otpStore";
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
    console.error("Error reading database file in verify-otp API", err);
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
      console.error("Railway read failed in verify-otp, falling back to local file", e);
    }
  }

  // Fallback to local DB file
  const dbData = readDb();
  const users = dbData.users || [];
  return users.find((u: any) => u.email && u.email.toLowerCase().trim() === emailLower) || null;
}

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email va OTP kod kiritilishi shart." },
        { status: 400 }
      );
    }

    // Rate Limiting per IP: Max 10 attempts per 5 minutes (using secure IP extraction)
    const rawIp = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || "unknown";
    const ip = rawIp.split(",")[0].trim();
    
    const ipLimit = checkRateLimit(`verify_ip_${ip}`, 5 * 60 * 1000, 10);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Ko'p so'rov yuborildi. Iltimos ${ipLimit.retryAfter} soniyadan so'ng qayta urinib ko'ring.` },
        { status: 429 }
      );
    }

    // Rate Limiting per Email: Max 5 verification attempts per 5 minutes to prevent brute-forcing
    const emailLimit = checkRateLimit(`verify_email_${email}`, 5 * 60 * 1000, 5);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Ushbu elektron pochta uchun ko'p urinishlar qilindi. Iltimos ${emailLimit.retryAfter} soniyadan so'ng qayta urinib ko'ring.` },
        { status: 429 }
      );
    }

    // Verify OTP using memory cache
    const isValid = verifyOtpCode(email, otp);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Tasdiqlash kodi noto'g'ri yoki uning muddati tugagan." },
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

    // Sign 30 days JWT token
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      user_id: userId,
      email: email.toLowerCase().trim(),
      iat: now,
      exp: now + 30 * 24 * 3600 // 30 days expiration
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
    console.error("[verify-otp] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "OTP tasdiqlashda xatolik yuz berdi.";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
