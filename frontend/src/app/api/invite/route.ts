import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email, role, inviterName } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST || "smtp.ethereal.email";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";

    let transporter;
    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    } else {
      // Ethereal Mail mock transport for test/dev
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "ethereal_test_user@ethereal.email",
          pass: "ethereal_test_pass"
        }
      });
    }

    const inviteHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #000000; font-size: 20px; font-weight: bold; margin-bottom: 10px;">Sendly Jamoasiga Taklifnoma</h2>
        <p style="color: #555555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Salom! <strong>${inviterName || "Workspace Egasi"}</strong> sizni Sendly chatbot loyihasiga <strong>${role}</strong> roli bilan jamoa a'zosi sifatida taklif qilmoqda.
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://sendly.uz/register?inviteEmail=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}" style="background-color: #C7F33C; color: #000000; padding: 12px 24px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
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

    try {
      await transporter.sendMail({
        from: `"Sendly Workspace" <${smtpUser || "invite@sendly.uz"}>`,
        to: email,
        subject: "Sendly Jamoasiga Taklifnoma",
        html: inviteHtml
      });
      console.log(`[Email invitation sent successfully to ${email}]`);
    } catch (sendErr) {
      console.warn("SMTP send failed, logging email invitation details to console:", sendErr);
      console.log(`[MOCK EMAIL INVITATION TO: ${email} (Role: ${role}, Inviter: ${inviterName})]`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Invite API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
