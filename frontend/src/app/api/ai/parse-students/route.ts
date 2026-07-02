import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { executeGeminiCall } from "@/lib/ai/modelRouter";

export async function POST(request: Request) {
  try {
    const { fileName, fileType, base64Data } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tizim sozlamalarida Gemini API kaliti kiritilmagan." },
        { status: 400 }
      );
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Hujjat ma'lumotlari yuborilmagan." },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    let userId = "system-students-parser";
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

    const isTxtOrCsv = fileType?.startsWith("text/") || 
                       fileName.toLowerCase().endsWith(".txt") || 
                       fileName.toLowerCase().endsWith(".csv");

    let parts: any[] = [];

    const promptText = `Ushbu fayl tarkibidan o'quvchilar ro'yxatini ajratib oling.
Har bir o'quvchi uchun quyidagi ma'lumotlarni aniqlang:
1. Ism-familiyasi (name)
2. Telefon raqami yoki foydalanuvchi nomi (username). Agar telefon raqami yoki username umuman berilmagan bo'lsa, ismdan kelib chiqib unikal taxallus yarating (masalan: sardor_salimov).
3. Guruhi, kursi yoki har qanday tegishli ma'lumotlari (tags). Bularni teglar massivi ko'rinishida yozing.

Javobni FAQAT quyidagi ko'rinishdagi toza JSON formatida qaytaring, boshqa hech qanday yozuv qo'shmang (hech qanday markdown \`\`\`json qobiqisiz, faqat toza JSON bo'lsin):
[
  {
    "name": "Sardor Salimov",
    "username": "+998901234567",
    "tags": ["3-guruh", "O'quvchi"]
  }
]`;

    if (isTxtOrCsv) {
      const rawText = Buffer.from(base64Data, "base64").toString("utf-8");
      parts = [
        {
          text: `${promptText}\n\nMATN/CSV TARKIBI:\n\n${rawText}`
        }
      ];
    } else {
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

    const systemPrompt = `Siz o'quvchilar ro'yxatini tahlil qiluvchi va ularni JSON ko'rinishida strukturalovchi yordamchisiz. Siz faqat toza JSON formatida javob berishingiz kerak. Hech qanday qo'shimcha matn, tushuntirish yoki markdown belgilari kiritmang.`;

    const result = await executeGeminiCall({
      operationType: "lead_qualification",
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      systemInstruction: systemPrompt,
      apiKey,
      userId
    });

    if (result.status === "error" || !result.text) {
      console.error("[Gemini Students Parse Error]:", result.error);
      return NextResponse.json(
        { error: "Gemini API faylni o'qishda xatoga yo'l qo'ydi: " + (result.error || "") },
        { status: 500 }
      );
    }

    let resultText = result.text;
    
    // Parse result text to check validity
    let students = [];
    try {
      students = JSON.parse(resultText.trim());
    } catch (e) {
      // Try to clean markdown wrap if Gemini ignored instructions
      const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
      students = JSON.parse(cleanJson);
    }

    if (!Array.isArray(students)) {
      students = [];
    }

    return NextResponse.json({ students });
  } catch (err: unknown) {
    console.error("[Parse Students Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Faylni tahlil qilishda texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
