import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email va OTP kod kiritilishi shart." },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || "Sendly <noreply@sendly.uz>";

    if (!host || !port || !user || !pass) {
      console.warn("SMTP email settings are not configured in environment variables.");
      return NextResponse.json(
        { 
          success: false, 
          error: "SMTP email sozlamalari (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD) serverda topilmadi. Iltimos, Railway yoki server sozlamalarida ularni kiriting." 
        },
        { status: 501 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465, // true for port 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to: email,
      subject: "Sendly.uz — Tasdiqlash Kodi",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #070708;">Sendly<span style="color: #C7F33C;">.uz</span></span>
          </div>
          <p style="font-size: 14px; color: #333333; line-height: 1.6;">
            Salom!
          </p>
          <p style="font-size: 14px; color: #333333; line-height: 1.6;">
            Sendly.uz platformasida tizimga kirish yoki ro'yxatdan o'tishni tasdiqlash uchun quyidagi bir martalik koddan foydalaning:
          </p>
          <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f9f9f7; border-radius: 12px; border: 1px dashed #D8D8D8;">
            <span style="font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 5px; color: #070708;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #777777; line-height: 1.6;">
            Ushbu kod 5 daqiqa davomida faol bo'ladi. Agar siz Sendly.uz da ro'yxatdan o'tishni so'ramagan bo'lsangiz, ushbu xatga e'tibor bermang.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <div style="text-align: center; font-size: 11px; color: #aaaaaa;">
            © 2026 Sendly.uz. Barcha huquqlar himoyalangan.
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to send OTP email via SMTP:", err);
    const errMsg = err instanceof Error ? err.message : "Email yuborishda xatolik yuz berdi.";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
