import { BotSettings, Lesson, Module } from "../db";

export type RAGResult = {
  text: string;
  confidence: number;
  sources: string[];
};

/**
 * Retrieves relevant lesson context from the knowledge base using keyword matching.
 * Scores each lesson based on keyword overlap.
 */
export function retrieveContext(
  question: string,
  lessons: Lesson[],
  modules: Module[]
): { context: string; sources: string[]; lessonCount: number } {
  if (!lessons || lessons.length === 0) {
    return { context: "", sources: [], lessonCount: 0 };
  }

  // Common stop words in Uzbek to ignore during matching
  const stopWords = new Set([
    "va", "bu", "bir", "ham", "uchun", "bilan", "dan", "ga", "da", "ni",
    "nima", "qanday", "qaysi", "qachon", "necha", "men", "sen", "u",
    "biz", "siz", "ular", "shu", "o'sha", "bo'lib", "bo'lgan", "esa"
  ]);

  const words = question
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9'’‘`’]/g, "")) // Clean punctuation
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const scored = lessons.map((lesson) => {
    const content = ((lesson.transcript || "") + " " + lesson.title).toLowerCase();
    let score = 0;
    
    if (words.length === 0) {
      return { lesson, score: 0 };
    }

    for (const w of words) {
      if (content.includes(w)) {
        score += 2;
      } else if (w.length >= 4 && content.includes(w.substring(0, 4))) {
        score += 1;
      }
    }
    return { lesson, score };
  });

  // Filter lessons that had at least some keyword overlap
  const topLessons = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // If no lessons matched, return empty context
  if (topLessons.length === 0) {
    return { context: "", sources: [], lessonCount: lessons.length };
  }

  const sources: string[] = [];
  const contextParts = topLessons.map(({ lesson }) => {
    const mod = modules.find((m) => m.id === lesson.moduleId);
    const source = `${mod?.title || "Modul"} — ${lesson.title}`;
    sources.push(source);
    return `[${source}]:\n${lesson.transcript || ""}`;
  });

  return {
    context: contextParts.join("\n\n"),
    sources,
    lessonCount: lessons.length,
  };
}

/**
 * Clean and merge model and user turns to satisfy Gemini API structural constraints.
 */
function sanitizeHistoryForGemini(
  history: { role: "user" | "model"; parts: { text: string }[] }[]
): { role: "user" | "model"; parts: { text: string }[] }[] {
  if (history.length === 0) return [];

  const sanitized: { role: "user" | "model"; parts: { text: string }[] }[] = [];

  for (const msg of history) {
    const role = msg.role;
    if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
      sanitized[sanitized.length - 1].parts[0].text += "\n" + msg.parts[0].text;
    } else {
      sanitized.push({
        role,
        parts: [{ text: msg.parts[0].text }],
      });
    }
  }

  while (sanitized.length > 0 && sanitized[0].role !== "user") {
    sanitized.shift();
  }

  while (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== "user") {
    sanitized.pop();
  }

  return sanitized;
}

/**
 * Calls Google Gemini API to generate a response grounded in the retrieved context.
 */
async function callGemini(
  contents: { role: "user" | "model"; parts: { text: string }[] }[],
  context: string,
  studentName: string,
  settings: BotSettings
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  let promptTemplate = settings.systemPrompt;
  if (!promptTemplate) {
    promptTemplate = `# ROL VA IDENTIFIKATSIYA
Sen marketing kursi o'quvchilariga yordam beruvchi, ismi "{{agentName}}" bo'lgan Sendly shaxsiy AI kuratorisan.

# ASOSIY VAZIFA
O'quvchilarning savollariga faqat dars materiallari (KURS MATERIALLARI) asosida javob berish.

# KURS MATERIALLARI:
{{context}}`;
  }

  // Adjust parameters dynamically based on slider values in settings (tone, length, humor)
  let characterInstructions = "";
  if (settings.tone !== undefined) {
    characterInstructions += `\n- Ohang: ${settings.tone > 70 ? "Juda rasmiy, madaniy gaplash." : settings.tone < 30 ? "Norasmiy, do'stona, senlab gaplash." : "Samimiy, do'stona, muloyim va me'yorida."}`;
  }
  if (settings.length !== undefined) {
    characterInstructions += `\n- Javob uzunligi: ${settings.length > 70 ? "Mavzuni batafsil, tushunarli yorit." : settings.length < 30 ? "Maksimal qisqa va aniq (1-2 gapda)." : "O'rtacha uzunlikda, me'yorda bo'lsin."}`;
  }
  if (settings.humor !== undefined) {
    characterInstructions += `\n- Hazil darajasi: ${settings.humor > 70 ? "Hazil-mutoyiba va qiziqarli hazillardan ko'p foydalan (hech qanday emoji ishlatma)." : settings.humor < 30 ? "Jiddiy va ilmiy yondash." : "Me'yorda, iliq munosabat."}`;
  }

  let systemPrompt = promptTemplate;
  const agentName = settings.agentName || "Sendly";
  systemPrompt = systemPrompt.replace(/\{\{agentName\}\}/g, agentName);

  if (systemPrompt.includes("{{context}}")) {
    systemPrompt = systemPrompt.replace("{{context}}", context);
  } else {
    systemPrompt = systemPrompt + "\n\nKURS MATERIALLARI:\n" + context;
  }

  let conversationGreetingRule = "";
  if (contents && contents.length > 1) {
    conversationGreetingRule = "\n- MUHIM: Foydalanuvchi bilan allaqachon salomlashgansiz. Javobingizni salomlashuv so'zlarisiz (masalan, \"Salom\", \"Salom, Isroiljon\" deb yozmasdan) to'g'ridan-to'g'ri darslik ma'lumotlari asosida boshlang.";
  }

  systemPrompt = `O'quvchining ismi: ${studentName}\n` + characterInstructions + conversationGreetingRule + "\n\n" + systemPrompt;

  try {
    let response: Response | null = null;
    let delay = 1000;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: contents,
              generationConfig: {
                temperature: Math.min(0.95, 0.5 + (settings.humor || 30) / 200),
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (response.status === 429) {
          console.warn(`[Gemini] RAG API rate limited (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        break;
      } catch (err) {
        console.error(`[Gemini] RAG fetch error during attempt ${i + 1}:`, err);
        if (i === maxRetries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    if (!response || response.status === 429) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: contents,
            generationConfig: {
              temperature: Math.min(0.95, 0.5 + (settings.humor || 30) / 200),
              maxOutputTokens: 1024,
            },
          }),
        }
      );
    }

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return null;
  }
}

/**
 * Grounded query generation using retrieveContext and Gemini API with a mock fallback.
 */
export async function queryRAG(
  question: string,
  studentName: string,
  lessons: Lesson[],
  modules: Module[],
  settings: BotSettings,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = []
): Promise<RAGResult> {
  // Accumulate text from last 2 user messages to enrich context retrieval keywords
  let enrichedQuestion = question;
  if (history && history.length > 0) {
    const lastUserMsgs = history
      .filter(h => h.role === "user")
      .slice(-2)
      .map(h => h.parts.map(p => p.text).join(" "))
      .join(" ");
    if (lastUserMsgs) {
      enrichedQuestion = lastUserMsgs + " " + question;
    }
  }

  const { context, sources, lessonCount } = retrieveContext(enrichedQuestion, lessons, modules);

  if (lessonCount === 0) {
    return {
      text: "Bilimlar bazasi hali bo'sh. Iltimos, boshqaruv panelidan dars materiallarini kiriting.",
      confidence: 20,
      sources: []
    };
  }

  let formattedHistory = sanitizeHistoryForGemini(history);
  if (formattedHistory.length === 0) {
    formattedHistory = [{ role: "user", parts: [{ text: question }] }];
  }

  const aiAnswer = await callGemini(formattedHistory, context, studentName, settings);
  if (aiAnswer) {
    return {
      text: aiAnswer.trim(),
      confidence: 95,
      sources
    };
  }

  // Real fallback check: If Gemini API Key is missing or the response is empty
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      text: "Tizim sozlamalarida xatolik: Gemini API Key sozlanmagan. Iltimos platforma administratoriga xabar bering.",
      confidence: 0,
      sources: []
    };
  }

  return {
    text: "Kechirasiz, sun'iy intellekt xizmati vaqtincha band yoki javob berishda uzilish yuz berdi. Iltimos qaytadan urinib ko'ring.",
    confidence: 0,
    sources: []
  };
}
