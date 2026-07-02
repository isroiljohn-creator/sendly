import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { readUserCredits, writeUserCredits } from "../../credits/route";
import { executeGeminiCall } from "@/lib/ai/modelRouter";

function cleanHtml(html: string): string {
  let clean = html;
  
  // Remove comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  
  // Remove scripts and styles
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  
  // Remove header, footer, nav, aside
  clean = clean.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "");
  clean = clean.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "");
  clean = clean.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");
  clean = clean.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");
  
  // Replace tag closures/breaks with spaces or newlines
  clean = clean.replace(/<\/p>/gi, "\n\n");
  clean = clean.replace(/<\/h[1-6]>/gi, "\n\n");
  clean = clean.replace(/<br\s*\/?>/gi, "\n");
  clean = clean.replace(/<\/li>/gi, "\n");
  clean = clean.replace(/<\/div>/gi, " ");
  
  // Remove all other HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "-");
  
  // Clean whitespace
  const lines = clean.split("\n");
  const processedLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 0);
    
  return processedLines.join("\n");
}

function cleanYouTubeTranscript(rawText: string): string {
  const lines = rawText.split("\n");
  const cleanedLines = [];
  
  for (const line of lines) {
    if (line.trim().startsWith("#") || line.trim() === "") continue;
    if (line.includes("Source video:") || line.includes("Language:") || line.includes("Other available languages:") || line.includes("To request a specific language:")) {
      continue;
    }
    
    // Remove timestamps [0:01]
    let cleanedLine = line.replace(/\[\d+(?::\d+){1,2}\]/g, "");
    // Remove music notes
    cleanedLine = cleanedLine.replace(/[♪]/g, "");
    
    if (cleanedLine.trim() !== "") {
      cleanedLines.push(cleanedLine.trim());
    }
  }
  
  return cleanedLines.join(" ");
}

export async function POST(request: Request) {
  let userId: string = "";
  const creditCost = 50; // flat cost of 50 credits
  let didDeduct = false;
  let targetUrl = "";

  try {
    const { url } = await request.json();
    targetUrl = url || "";

    if (!targetUrl) {
      return NextResponse.json({ error: "Havola kiritilmagan." }, { status: 400 });
    }

    // ─── JWT & CREDIT CHECK ───
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;

    if (!token || !jwtSecret || !jwtPattern.test(token)) {
      return NextResponse.json(
        { error: "Ruxsat etilmagan: JWT token kiritilmagan yoki noto'g'ri." },
        { status: 401 }
      );
    }

    const payload = verifyJwt(token, jwtSecret);
    if (!payload || !payload.user_id) {
      return NextResponse.json(
        { error: "Ruxsat etilmagan: Foydalanuvchi ma'lumotlari haqiqiy emas." },
        { status: 403 }
      );
    }

    userId = payload.user_id;
    const isAdmin = payload.email === "admin@sendly.uz" || payload.email === "isroiljohnabdullayev@gmail.com" || payload.email === "aisroil005@gmail.com" || payload.role === "admin";

    // Read user credits
    const creditsData = await readUserCredits(userId);
    if (creditsData.balance < creditCost && !isAdmin) {
      return NextResponse.json(
        { error: `Balansingizda yetarli kreditlar muzoqara qilinmaydi. Havola tahlili uchun ${creditCost} ta kredit talab qilinadi. Joriy balans: ${creditsData.balance} kredit.` },
        { status: 400 }
      );
    }

    // Upfront deduction
    if (creditsData.balance >= creditCost || isAdmin) {
      creditsData.balance = Math.max(0, creditsData.balance - creditCost);
      creditsData.used = (creditsData.used || 0) + creditCost;
      const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
      creditsData.history.unshift({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "usage",
        amount: creditCost,
        description: `Havoladan o'rganish boshlandi: ${targetUrl}`,
        date: timestamp
      });
      await writeUserCredits(userId, creditsData);
      didDeduct = true;
    }

    // ─── PARSE CONTENT ───
    let title = "Havola materiali";
    let rawText = "";
    const isYouTube = /youtu\.be|youtube\.com/i.test(targetUrl);

    if (isYouTube) {
      // Extract video ID
      const ytMatch = targetUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      const videoId = ytMatch ? ytMatch[1] : null;

      if (!videoId) {
        throw new Error("YouTube havolasidan video ID-sini ajratib bo'lmadi.");
      }

      console.log(`[Parse Link] Fetching YouTube transcript for video ID: ${videoId}...`);
      const res = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
      if (!res.ok) {
        throw new Error(`YouTube transkripsiyasini yuklash imkoni bo'lmadi (Status: ${res.status}). Ushbu videoda transkripsiya o'chirilgan bo'lishi mumkin.`);
      }

      const responseText = await res.text();
      // Extract title from the first line
      const firstLine = responseText.split("\n")[0] || "";
      if (firstLine.startsWith("# Transcript:")) {
        title = firstLine.replace(/^#\s*Transcript:\s*/i, "").trim();
      } else {
        title = `YouTube Video - ${videoId}`;
      }

      rawText = cleanYouTubeTranscript(responseText);
    } else {
      // General webpage scraping
      console.log(`[Parse Link] Fetching webpage HTML: ${targetUrl}...`);
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) {
        throw new Error(`Veb-sahifani yuklab bo'lmadi (Status: ${res.status}).`);
      }

      const html = await res.text();
      
      // Parse title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : "Veb-sahifa";
      title = title.replace(/\s*-\s*Vikipediya/i, "").trim(); // Clean Wikipedia title

      rawText = cleanHtml(html);
    }

    if (!rawText.trim()) {
      throw new Error("Havola qilingan sahifadan hech qanday matn ajratib bo'lmadi.");
    }

    // ─── RUN THROUGH GEMINI FOR STRUCTURE ───
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      // Fallback: if Gemini key is missing, return raw text directly
      return NextResponse.json({ title, text: rawText.substring(0, 8000) });
    }

    const systemPrompt = `Siz darsliklar va veb-materiallarni tahlil qiluvchi professional yordamchisiz. Maqsadingiz: berilgan matn (veb-sahifa mazmuni yoki video transkripsiyasi) ichidagi barcha ma'lumotlarni o'qib, ularni chatbot oson tushunadigan va aniq javob qaytara oladigan shaklda strukturalash va to'liq o'zbek tilida (lotin alifbosida) yozib berish. Javob matnida umuman Markdown formatlash belgilaridan (masalan, qalin matn uchun ** belgilari, sarlavhalar uchun # belgilari va boshqalar) foydalanmang. Qalin bo'lishi kerak bo'lgan so'zlarni oddiy matn ko'rinishida yozing (masalan, "**Savol:**" emas, balki oddiy "Savol:" shaklida).`;

    const promptText = `Quyidagi matn tarkibini o'qib, o'quv chatbotining bilimlar bazasi uchun batafsil strukturalangan o'zbekcha matnga o'giring:\n\n${rawText.substring(0, 15000)}`;

    const result = await executeGeminiCall({
      operationType: "link_analysis",
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }]
        }
      ],
      systemInstruction: systemPrompt,
      apiKey: geminiKey,
      userId
    });

    if (result.status === "error" || !result.text) {
      console.error("[Parse Link Gemini Error]:", result.error);
      return NextResponse.json({ title, text: rawText.substring(0, 8000) });
    }

    let structuredText = result.text;

    // Clean markdown bold and header tags from Gemini output
    structuredText = structuredText
      .replace(/\*\*/g, "")
      .replace(/###?\s+/g, "")
      .replace(/-\s+\*\*/g, "- ")
      .trim();

    return NextResponse.json({ title, text: structuredText });

  } catch (err: unknown) {
    console.error("[Parse Link Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);

    // Refund credits on error
    if (didDeduct && userId) {
      try {
        const refundData = await readUserCredits(userId);
        refundData.balance = (refundData.balance || 0) + creditCost;
        refundData.used = Math.max(0, (refundData.used || 0) - creditCost);
        const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
        refundData.history.unshift({
          id: `refund-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: "purchase",
          amount: creditCost,
          description: `Havolani tahlil qilish xatosi sababli kreditlar qaytarildi: ${targetUrl}`,
          date: timestamp
        });
        await writeUserCredits(userId, refundData);
        console.log(`[Parse Link] Successfully refunded ${creditCost} credits to user ${userId}.`);
      } catch (refundErr) {
        console.error("[Refund Error]:", refundErr);
      }
    }

    return NextResponse.json(
      { error: "Havolani tahlil qilishda xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
