import { NextResponse } from "next/server";

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
    - PRO tarifi: 75,000 so'm/oy (50% chegirma bilan, odatda 150,000 so'm). 1 ta Instagram akkaunti, cheksiz avtomatlashtirish oqimlari, 1 ta Telegram bot, referral va ballar tizimi, analitika.
    - PREMIUM tarifi: 600,000 so'm/oy (50% chegirma bilan, odatda 1,200,000 so'm). 10 tagacha Instagram akkaunti, Google Gemini/AI agent saralash, 24/7 VIP qo'llab-quvvatlash, shaxsiy menejer.
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

    const response = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
       {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini Support API returned error:", response.status, await response.text());
      return NextResponse.json({
        text: "Hozirda aloqa biroz sekinlashdi. Iltimos savolingizni pochta (6220v1@gmail.com) orqali yuboring yoki birozdan so'ng qayta urinib ko'ring."
      });
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Kechirasiz, javobni shakllantirishda xatolik yuz berdi.";
    return NextResponse.json({ text: replyText.trim() });
  } catch (err) {
    console.error("Failed to run Gemini support chat handler:", err);
    return NextResponse.json({
      text: "Tizimda texnik xatolik yuz berdi. Operatorlarimiz bilan bog'lanish uchun pochtamizga yozing."
    });
  }
}
