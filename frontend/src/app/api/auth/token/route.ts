import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint has been deprecated and disabled for security reasons. Use /api/auth/verify-otp instead." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been deprecated and disabled for security reasons. Use /api/auth/verify-otp instead." },
    { status: 410 }
  );
}
