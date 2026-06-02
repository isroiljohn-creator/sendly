import { NextResponse } from "next/server";
import { Resend } from "resend";

const HTML_TEMPLATE = (otp: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 30px; background: #ffffff; border-radius: 20px; border: 1px solid #E8E8E8;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="font-size: 26px; font-weight: 900; color: #070708; letter-spacing: -0.5px;">
        Sendly
      </span>
    </div>

    <p style="font-size: 15px; color: #333; line-height: 1.6; margin: 0 0 16px;">Salom!</p>
    <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 28px;">
      Sendly platformasiga kirish yoki ro'yxatdan o'tishni tasdiqlash uchun quyidagi <strong>bir martalik kodni</strong> ishlating:
    </p>

    <!-- OTP Box -->
    <div style="background: #F5F5F3; border: 1.5px dashed #C7F33C; border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 28px;">
      <span style="font-size: 36px; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 10px; color: #070708;">${otp}</span>
    </div>

    <p style="font-size: 12px; color: #888; line-height: 1.6; margin: 0 0 24px;">
      ⏱ Ushbu kod <strong>5 daqiqa</strong> davomida amal qiladi.<br>
      Agar siz bu so'rovni yubormaganingiz bo'lsa — ushbu xatni e'tiborsiz qoldiring.
    </p>

    <hr style="border: none; border-top: 1px solid #F0F0F0; margin: 0 0 20px;" />
    <p style="font-size: 11px; color: #bbb; text-align: center; margin: 0;">© ${new Date().getFullYear()} Sendly • Barcha huquqlar himoyalangan.</p>
  </div>
`;

import { generateAndSaveOtp } from "@/lib/otpStore";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email kiritilishi shart." },
        { status: 400 }
      );
    }

    // Generate code server-side
    const otp = generateAndSaveOtp(email);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`\n==================================================\n[OTP DEBUG FOR LOCAL TESTING]\nEmail: ${email}\nOTP: ${otp}\n==================================================\n`);
      return NextResponse.json(
        {
          success: false,
          error: "Email yuborish xizmati sozlanmagan. Railway da RESEND_API_KEY o'zgaruvchisini kiriting.",
          otp: otp // Keep exposing in fallback mode for easy simulator testing
        },
        { status: 501 }
      );
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "Sendly <noreply@sendly.uz>",
      to: email,
      subject: "Sendly — Tasdiqlash kodi",
      html: HTML_TEMPLATE(otp),
    });

    if (error) {
      console.error("[send-otp] Resend error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Email yuborishda xatolik." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[send-otp] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "Email yuborishda xatolik yuz berdi.";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
