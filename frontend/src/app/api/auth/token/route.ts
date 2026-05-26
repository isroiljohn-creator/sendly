import { NextResponse } from "next/server";
import crypto from "crypto";

// Helper function to convert Buffer or string to base64url format
function base64url(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Custom JWT sign function using HMAC-SHA256 and native Node crypto
function signJwt(payload: object, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const tokenInput = `${encodedHeader}.${encodedPayload}`;
  
  const signature = crypto.createHmac("sha256", secret)
    .update(tokenInput)
    .digest();
  const encodedSignature = base64url(signature);
  
  return `${tokenInput}.${encodedSignature}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // Load JWT secret matching the backend default
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not configured");
    }

    // Create standard payload with user_id and expiration (1 hour)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      user_id: userId,
      iat: now,
      exp: now + 3600 // 1 hour expiration
    };

    const token = signJwt(payload, jwtSecret);

    return NextResponse.json({ token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
