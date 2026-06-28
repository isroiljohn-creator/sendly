import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Ruxsat etilmagan: JWT token topilmadi." }, { status: 401 });
    }

    const payload = verifyJwt(token, jwtSecret);
    if (!payload || !payload.user_id) {
      return NextResponse.json({ error: "Ruxsat etilmagan: Yaroqsiz token." }, { status: 403 });
    }

    const { userInstructions, agentType, agentName } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tizim sozlamalarida Gemini API kaliti kiritilmagan." },
        { status: 400 }
      );
    }

    if (!userInstructions || userInstructions.trim() === "") {
      return NextResponse.json(
        { error: "Ko'rsatmalar matni bo'sh bo'lishi mumkin emas." },
        { status: 400 }
      );
    }

    const systemPrompt = `Siz professional Prompt muhandisi (Prompt Engineer) va Sun'iy Intellekt arxitektorisiz.
Sizning vazifangiz: foydalanuvchining oddiy tildagi istaklari (masalan: "mijozlar bilan do'stona gaplashsin, hazillashsin, emojilar ishlatib darslarimizni tavsiya qilsin") asosida AI agent uchun mukammal, batafsil va professional tizimli prompt (System Prompt/System Instructions) yaratib berish.

Siz yaratadigan tizimli prompt quyidagi qoidalarga to'liq va qat'iy rioya qilishi shart:
1. Agentning roli va nomi: "${agentName || "AI Assistant"}" nomli yordamchi. Agent turi: ${agentType || "umumiy yordamchi"}.
2. Ohang va xulq-atvor (Tone of voice): Foydalanuvchi so'ragan ko'rsatmalar asosida (masalan, hazilomuz, muloyim, rasmiy, mijoz bilan yaqin do'stdek va h.k.).
3. Qat'iy qoidalar va cheklovlar:
   - Faqat berilgan bilimlar bazasi (RAG Context) bo'yicha javob berish. Baza bo'lmagan ma'lumotlarni o'zidan to'qib chiqarmaslik.
   - Bilimlar bazasida ma'lumot topilmasa yoki foydalanuvchi taqiqlangan mavzularda savol bersa, muloyimlik bilan operatorga yo'naltirish (shouldEscalate = true).
   - Javoblarni qisqa, tushunarli, londa va aniq yozish. Ortiqcha gaplar va takrorlanishlardan qochish.
   - Savollarga samimiy javob berish bilan birga, har doim asosiy maqsadga (xizmat yoki darslarni o'rgatish/tavsiya etishga) yo'naltirish.
4. Prompt butunlay O'zbek tilida bo'lishi va aniq strukturalangan bo'lishi lozim (ro'yxatlar va aniq qoidalar bilan).

Javobda faqat va faqat promptning o'zini qaytaring. Hech qanday "Mana siz so'ragan prompt" kabi kirish yoki tushuntirish so'zlarini, markdown bloklarini (\`\`\` kabi) aralashtirmang. Faqat sof matn bo'lsin.`;

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
              parts: [{ text: `Quyidagi foydalanuvchi istaklari asosida tizimli prompt yarating:\n\n${userInstructions}` }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Gemini Prompt Gen Error]:", response.status, errText);
      return NextResponse.json(
        { error: "Gemini API prompt yaratishda xatoga yo'l qo'ydi." },
        { status: 500 }
      );
    }

    const data = await response.json();
    let resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up any potential markdown wrap code blocks
    resultText = resultText
      .replace(/^```[a-zA-Z]*\n/g, "")
      .replace(/\n```$/g, "")
      .trim();

    return NextResponse.json({ prompt: resultText });
  } catch (err: unknown) {
    console.error("[AI Prompt Gen Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Prompt yaratishda texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
