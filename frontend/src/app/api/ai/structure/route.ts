import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tizim sozlamalarida Gemini API kaliti kiritilmagan." },
        { status: 400 }
      );
    }

    if (!transcript || transcript.trim() === "") {
      return NextResponse.json(
        { error: "Tahlil qilish uchun matn kiritilmagan." },
        { status: 400 }
      );
    }

    const systemPrompt = `Siz professional kontent tahlilchisisiz (AI Content Structurer). Maqsadingiz: tartibsiz, xom dars konspektlari yoki kompaniya hujjatlari matnini chatbot oson tushunadigan va aniq javob qaytara oladigan shaklda strukturalash va tartibga solish.

VAZIFANGIZ:
1. Matndagi muhim faktlar, savol va javob zanjirlari, narxlar, shartlar va qoidalarni aniqlang.
2. Ularni aniq savol-javob (Q&A) yoki qisqa faktlar ko'rinishida tartiblang.
3. Ortiqcha so'zbozlik, salomlashishlar va takrorlanishlarni olib tashlang.
4. Javob matni faqat toza, tushunarli va professional o'zbek tilida (lotin alifbosida) bo'lishi shart.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: `Quyidagi xom matnni tahlil qiling va chatbot uchun bilimlar bazasi ko'rinishida strukturalab bering:\n\n${transcript}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Gemini 3.5 Flash Error]:", response.status, errText);
      return NextResponse.json(
        { error: "Gemini API tahlil qilishda xatoga yo'l qo'ydi." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ text: resultText.trim() });
  } catch (err: unknown) {
    console.error("[AI Structure Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Tahlil qilish jarayonida texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
