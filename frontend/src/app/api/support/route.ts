import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { executeGeminiCall } from "@/lib/ai/modelRouter";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { text: "Kechirasiz, tizim sozlamalarida Gemini API kaliti kiritilmagan. Iltimos keyinroq qayta urinib ko'ring." },
        { status: 200 } // return 200 to show text output gracefully to the user
      );
    }

    const systemInstruction = `# ROL VA VAZIFA
Siz "Sendly.uz" (Instagram chatbot va savdoni avtomatlashtirish platformasi) qo'llab-quvvatlash xizmatining shaxsiy AI yordamchisiz (Sendly Support AI). Foydalanuvchilarning savollariga samimiy, do'stona, qisqa va aniq javob bering.

# SENDLY PLATFORMASI HAQIDA MA'LUMOTLAR
1. Sendly.uz — O'zbekiston bozori uchun Instagram chatbot va savdoni avtomatlashtirish platformasi.
2. Asosiy imkoniyatlar:
   - Shaxsiy xabarlarni (Direct Message - DM) avtomatlashtirish.
   - Izohlarga avtomatik DM orqali javob qaytarish ("Izoh -> DM" oqimi).
   - Sun'iy intellekt agenti (Google Gemini yordamida arizalarni saralash va guruhlash).
   - Hamkorlik (Referral) va ballar tizimi (foydalanuvchilarni tavsiya uchun mukofotlash).
   - Telegram botlarni bitta paneldan boshqarish.
   - Vizual oqim quruvchisi (Visual Flow Builder) - kod yozmasdan suhbat zanjiri yaratish.
   - Kontaktlar va mijozlar bazasi (CRM).
3. Tariflar va Narxlar:
    - PRO tarifi: 150,000 so'm/oy. 1 ta Instagram akkaunti, cheksiz avtomatlashtirish oqimlari, 1 ta Telegram bot, 1,000 ta bepul AI kreditlari.
    - PREMIUM tarifi: 300,000 so'm/oy. 1 ta Instagram akkaunti, 1 ta Telegram bot, 30,000 ta bepul AI kreditlari, referral va ballar tizimi, analitika.
    - VIP tarifi: 1,200,000 so'm/oy. 10 ta Instagram professional akkaunti, 10 tagacha Telegram bot, 150,000 ta bepul AI kreditlari, 24/7 VIP qo'llab-quvvatlash, shaxsiy menejer.
4. Bepul sinov davri (Trial):
   - Yangi ro'yxatdan o'tganlarga 7 kunlik PRO versiyani bepul sinash imkoniyati beriladi. Sinov muddatini boshlash uchun UzCard, Humo, Visa yoki Mastercard bank kartasini bog'lash talab qilinadi. Bepul muddat tugagach, kartadan keyingi oy to'lovi avtomatik yechiladi, istalgan vaqtda obunani bekor qilish mumkin.
5. Akkaunt xavfsizligi:
   - Sendly faqat Meta Graph API rasmiy tizimi orqali ishlaydi. Hech qanday parollar talab etilmaydi, sahifalar bloklanish xavfi yo'q.
6. Texnik ulanish talabi:
   - Instagram akkauntini ulash uchun u Professional (Creator yoki Business) rejimida bo'lishi va Facebook sahifasiga (Page) bog'langan bo'lishi shart.
7. Aloqa:
   - Texnik yordam pochtasi: 6220v1@gmail.com.

# JAVOB BERISH QOIDALARI
- Foydalanuvchi qaysi tilda yozsa (O'zbekcha - Lotin/Kirill, Ruscha yoki Inglizcha), o'sha tilda javob bering.
- Javobingiz juda sodda, qisqa va londa bo'lsin (ko'pi bilan 2-3 ta gap).
- Platformada bo'lmagan soxta xususiyatlar yoki noto'g'ri narxlarni aytmang.
- Agar savol tizim bilan bog'liq bo'lmasa, uni muloyimlik bilan rad eting va dars yoki platformaga oid savollarga qaytishni taklif qiling.`;

    // Map history elements into Gemini format
    const contents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    let userId = "sendly-support-user";
    if (token && jwtSecret) {
      try {
        const payload = verifyJwt(token, jwtSecret);
        if (payload?.user_id) {
          userId = payload.user_id;
        }
      } catch {
        // ignore
      }
    }

    const result = await executeGeminiCall({
      operationType: "chat_reply",
      contents,
      systemInstruction,
      apiKey,
      userId
    });

    if (result.status === "error" || !result.text) {
      console.error("Gemini Support API returned error:", result.error);
      return NextResponse.json({
        text: "Hozirda aloqa biroz sekinlashdi. Iltimos savolingizni pochta (6220v1@gmail.com) orqali yuboring yoki birozdan so'ng qayta urinib ko'ring."
      });
    }

    return NextResponse.json({ text: result.text.trim() });
  } catch (err) {
    console.error("Failed to run Gemini support chat handler:", err);
    return NextResponse.json({
      text: "Tizimda texnik xatolik yuz berdi. Operatorlarimiz bilan bog'lanish uchun pochtamizga yozing."
    });
  }
}
