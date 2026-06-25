import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { fileName, fileType, base64Data } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tizim sozalamalarida Gemini API kaliti kiritilmagan." },
        { status: 400 }
      );
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Hujjat ma'lumotlari yuborilmagan." },
        { status: 400 }
      );
    }

    const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    const isTxt = fileType?.startsWith("text/") || fileName.toLowerCase().endsWith(".txt");

    let promptText = "Ushbu hujjat tarkibini o'qib, o'quv chatbotining bilimlar bazasi uchun batafsil strukturalangan matnga o'giring. Hech qanday muhim fakt, savol-javob, narx yoki qoidani tashlab ketmang. Barcha matnlarni o'zbek tilida (lotin alifbosida) batafsil yozib bering.";

    let parts: any[] = [];

    if (isPdf) {
      parts = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        },
        {
          text: promptText
        }
      ];
    } else if (isTxt) {
      // Decode base64 to string
      const rawText = Buffer.from(base64Data, "base64").toString("utf-8");
      parts = [
        {
          text: `Quyidagi matn tarkibini o'qib, o'quv chatbotining bilimlar bazasi uchun batafsil strukturalangan o'zbekcha matnga o'giring:\n\n${rawText}`
        }
      ];
    } else {
      // General fallback using inlineData or text conversion
      parts = [
        {
          inlineData: {
            mimeType: fileType || "application/octet-stream",
            data: base64Data
          }
        },
        {
          text: promptText
        }
      ];
    }

    const systemPrompt = `Siz darsliklar va hujjatlarni tahlil qiluvchi professional yordamchisiz. Maqsadingiz: yuklangan hujjat (PDF yoki matn) ichidagi barcha ma'lumotlarni o'qib, ularni chatbot oson tushunadigan va aniq javob qaytara oladigan shaklda strukturalash va to'liq o'zbek tilida (lotin alifbosida) yozib berish. Javob matnida umuman Markdown formatlash belgilaridan (masalan, qalin matn uchun ** belgilari, sarlavhalar uchun # belgilari va boshqalar) foydalanmang. Qalin bo'lishi kerak bo'lgan so'zlarni oddiy matn ko'rinishida yozing (masalan, "**Savol:**" emas, balki oddiy "Savol:" shaklida).`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
              parts: parts
            }
          ],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Gemini PDF Parse Error]:", response.status, errText);
      return NextResponse.json(
        { error: "Gemini API hujjatni o'qishda xatoga yo'l qo'ydi." },
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

    if (!resultText) {
      return NextResponse.json(
        { error: "Hujjatdan hech qanday matn ajratib olib bo'lmadi." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: resultText });
  } catch (err: unknown) {
    console.error("[Parse Document Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Hujjatni tahlil qilishda texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
