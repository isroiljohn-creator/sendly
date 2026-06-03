import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyJwt } from "@/lib/jwt";

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    // 1. Enforce JWT authentication
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    
    const payload = verifyJwt(token, jwtSecret);
    if (!payload) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { email, role, inviterName } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // 2. Escape user inputs to prevent HTML Injection / Phishing template manipulation
    const cleanEmail = escapeHtml(email.trim().toLowerCase());
    const cleanRole = escapeHtml(role || "Jamoa a'zosi");
    const cleanInviterName = escapeHtml(inviterName || "Workspace Egasi");

    // Enforce email format validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const inviteHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #000000; font-size: 20px; font-weight: bold; margin-bottom: 10px;">Sendly Jamoasiga Taklifnoma</h2>
        <p style="color: #555555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Salom! <strong>${cleanInviterName}</strong> sizni Sendly chatbot loyihasiga <strong>${cleanRole}</strong> roli bilan jamoa a'zosi sifatida taklif qilmoqda.
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://sendly.uz/register?inviteEmail=${encodeURIComponent(cleanEmail)}&role=${encodeURIComponent(cleanRole)}" style="background-color: #C7F33C; color: #000000; padding: 12px 24px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
            Taklifni qabul qilish
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e8e8e8; margin: 30px 0;" />
        <p style="color: #a0a0a0; font-size: 11px; text-align: center;">
          Agar bu xat xatolik tufayli kelgan bo'lsa, uni shunchaki e'tiborsiz qoldiring.<br />
          &copy; 2026 Sendly. Barcha huquqlar himoyalangan.
        </p>
      </div>
    `;

    if (smtpUser && smtpPass && smtpHost) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        await transporter.sendMail({
          from: `"Sendly Workspace" <${smtpUser}>`,
          to: cleanEmail,
          subject: "Sendly Jamoasiga Taklifnoma",
          html: inviteHtml
        });
        console.log(`[Email invitation sent successfully to ${cleanEmail}]`);
      } catch (sendErr) {
        console.warn("SMTP send failed, logging email invitation details to console:", sendErr);
        console.log(`[MOCK EMAIL INVITATION TO: ${cleanEmail} (Role: ${cleanRole}, Inviter: ${cleanInviterName})]`);
      }
    } else {
      console.log(`[MOCK EMAIL INVITATION TO: ${cleanEmail} (Role: ${cleanRole}, Inviter: ${cleanInviterName})]`);
      console.log(`[MOCK EMAIL HTML CONTENT]:`, inviteHtml);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Invite API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
