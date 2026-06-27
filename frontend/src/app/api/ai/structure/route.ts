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

    const systemPrompt = `Siz professional kontent tahlilchisisiz (AI Content Structurer). Maqsadingiz: operator va mijoz o'rtasidagi suhbat matnini (transcript) chatbot va operatorlar uchun tushunarli, har tomonlama to'liq va mukammal tahlil ko'rinishida strukturalash.

QAT'IY VAZIFANGIZ:
1. Suhbatdagi BARCHA ma'lumotlarni to'liq qamrab oling. Hech qanday muhim fakt, ehtiyoj, muammo yoki e'tiroz yo'qolib ketmasligi kerak. Tahlil juda batafsil bo'lishi shart.
2. Ma'lumotlarni quyidagi alohida va aniq bloklarga ajrating:
   - "=== AI TAHLILI VA STRUKTURA ==="
   - "=== MIJOZ HAQIDA UMUMIY MA'LUMOT ===" (Ismi, yoshi, kasbi, manzili, kuzatish davri va h.k.)
   - "=== ASOSIY MUAMMOLAR VA QIYINCHILIKLAR ===" (Mijoz nimalardan qiynaladi, avvalgi xatoliklari, nima uchun o'rgana olmagan)
   - "=== MAQSADLAR VA QIZIQISHLAR ===" (AI-ni qayerda va qanday ishlatmoqchi, qanaqa kontent/video yoki loyihalar qilmoqchi)
   - "=== SOTUV VA MOLIYAVIY HOLAT ===" (Mijozning moliyaviy imkoniyati, kurs sotib olishga tayyorligi, to'lov yoki oylik kutish sharoiti, e'tirozlari)
   - "=== TAVSIYALAR VA KEYINGI QADAMLAR ===" (Keyingi aloqada nimalarga e'tibor berish lozimligi haqida tavsiyalar)
3. Ortiqcha so'zbozliklarni olib tashlang, lekin suhbat mazmunidagi ma'lumotlarni mutlaqo qisqartirmang.
4. Javob matnida Markdown belgilaridan (masalan, **qalin**, # sarlavhalar va h.k.) foydalanmang. Blok sarlavhalarini "=== BLOK NOMI ===" ko'rinishida va ro'yxatlarni oddiy matn ko'rinishida yozing.
5. Javob faqat toza, tushunarli va professional o'zbek tilida (lotin alifbosida) bo'lishi shart.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
    let resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Programmatically strip markdown symbols that look bad in plain text area
    resultText = resultText
      .replace(/\*\*/g, "")      // Strip ** (bold)
      .replace(/###?\s+/g, "")   // Strip ### (headers)
      .replace(/-\s+\*\*/g, "- ") // Strip bold from list items if any left
      .trim();

    return NextResponse.json({ text: resultText });
  } catch (err: unknown) {
    console.error("[AI Structure Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Tahlil qilish jarayonida texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
