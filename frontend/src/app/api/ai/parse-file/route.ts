import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { base64Data, mimeType, fileName } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tizim sozalamalarida Gemini API kaliti kiritilmagan." },
        { status: 400 }
      );
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Fayl ma'lumotlari (base64) kiritilmagan." },
        { status: 400 }
      );
    }

    const promptText = `Siz professional kontent tahlilchisisiz (AI Document Parser). Maqsadingiz: yuklangan hujjat tarkibini tahlil qilish va undan chatbot foydalanishi uchun barcha muhim ma'lumotlar, faktlar, savol-javoblar va darslik mazmunini o'zbek tilida (lotin alifbosida) to'liq va tushunarli qilib matnga aylantirish.

VAZIFANGIZ:
1. Hujjat ichidagi barcha ma'lumotlarni tahlil qiling va matnga o'giring.
2. Ma'lumotlarni tartibli, mavzulashtirilgan va tushunarli ko'rinishda taqdim eting.
3. Chatbot ushbu ma'lumotlar asosida mijozlar savoliga to'g'ri javob bera olishi uchun muhim faktlar va savol-javoblarni batafsil saqlab qoling.
4. Javob matni faqat toza, tushunarli o'zbek tilida bo'lsin. Hech qanday kirish so'zlari yoki ortiqcha izohlar qo'shmang, faqat olingan bilimlar bazasini qaytaring.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "application/pdf",
                    data: base64Data
                  }
                },
                {
                  text: promptText
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Gemini File Parse Error]:", response.status, errText);
      return NextResponse.json(
        { error: "Gemini API hujjatni tahlil qilishda xatoga yo'l qo'ydi." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ text: resultText.trim() });
  } catch (err: unknown) {
    console.error("[AI Parse File Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Faylni tahlil qilishda texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
