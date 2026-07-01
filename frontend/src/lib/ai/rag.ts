import { BotSettings, Lesson, Module } from "../db";

// Centralised model constant — override via GEMINI_MODEL env variable
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export type RAGResult = {
  text: string;
  confidence: number;
  sources: string[];
  flagged?: boolean;
  warningMessage?: string;
  intent?: string;
  sentiment?: string;
  painPoint?: string;
  isGeneralTalk?: boolean;
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

  const rawWords = question
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9'’‘`’]/g, "")) // Clean punctuation
    .filter((w) => w.length > 1 && !stopWords.has(w));

  // Synonym mapping for Uzbek/English and semantic variations
  const synonymMap: Record<string, string[]> = {
    "akkaunt": ["account", "profil", "profile", "kabinet", "pochta", "gmail", "google"],
    "account": ["akkaunt", "profil", "profile", "kabinet", "pochta", "gmail", "google"],
    "profil": ["akkaunt", "account", "profile"],
    "ochish": ["och", "yaratish", "yarat", "sozlash", "kirish", "ocholmadim", "ochomadim", "ocholmayapman", "registratsiya"],
    "ocholmadim": ["ochish", "yaratish", "ochishni", "ochishga", "ochmoqchi", "ocholmayapman", "yarat"],
    "ochomadim": ["ochish", "yaratish", "ochishni", "ochishga", "ochmoqchi", "ocholmayapman", "yarat"],
    "ocholmayapman": ["ochish", "yaratish", "ochishni", "ochishga", "ochmoqchi", "yarat"],
    "yaratish": ["ochish", "yarat", "och", "sozlash", "yozilish", "registratsiya"],
    "ulash": ["ulash", "bog'lash", "boglash", "integratsiya", "connect", "sozlash"],
    "bog'lash": ["ulash", "boglash", "integratsiya", "connect"],
    "boglanish": ["ulash", "bog'lash", "boglash", "operator", "kurator"],
    "operator": ["boglanish", "bog'lash", "inson", "kurator", "yordam"],
    "inson": ["boglanish", "operator", "kurator"],
    "kurator": ["boglanish", "operator", "inson"],
    "pul": ["to'lov", "tolov", "narx", "qiymat", "kredit", "credits", "balance", "balans", "tarif"],
    "to'lov": ["pul", "tolov", "narx", "qiymat", "kredit", "credits", "balance", "balans", "tarif", "to'lash"],
    "tolov": ["pul", "to'lov", "narx", "qiymat", "kredit", "credits", "balance", "balans", "tarif", "tolash"],
    "narx": ["pul", "to'lov", "tolov", "qiymat", "qancha", "nechpul", "bahosi", "narxi"],
    "qancha": ["narx", "qiymat", "nechpul", "bahosi"],
  };

  const scored = lessons.map((lesson) => {
    const titleLower = (lesson.title || "").toLowerCase();
    const contentLower = ((lesson.transcript || "") + " " + lesson.title).toLowerCase();
    let score = 0;

    if (rawWords.length === 0) {
      return { lesson, score: 0 };
    }

    for (const w of rawWords) {
      // 1. Exact matches (highest priority)
      if (contentLower.includes(w)) {
        score += titleLower.includes(w) ? 6 : 4;
      }

      // 2. Synonym matching
      const synonyms = synonymMap[w] || [];
      for (const syn of synonyms) {
        if (contentLower.includes(syn)) {
          score += titleLower.includes(syn) ? 4 : 2;
        }
      }

      // 3. Uzbek Root Stemming matches (for verbs and nouns with suffixes)
      // Ochish / ocholmadim / ocholmayapman -> root is "och"
      if (w.startsWith("och") && (contentLower.includes("ochish") || contentLower.includes("ochil") || contentLower.includes("ochishni"))) {
        score += 3;
      }
      // Akkaunt / account -> root is "akk" or "acc"
      if ((w.startsWith("akk") || w.startsWith("acc")) && (contentLower.includes("akkaunt") || contentLower.includes("account"))) {
        score += 3;
      }
      // Ulay olmadim / ulash -> root is "ula"
      if (w.startsWith("ula") && (contentLower.includes("ulash") || contentLower.includes("ulan") || contentLower.includes("ulashni"))) {
        score += 3;
      }
      // To'lov / tolay olmadim -> root is "tol" or "to'l"
      if ((w.startsWith("tol") || w.startsWith("to'l")) && (contentLower.includes("to'lov") || contentLower.includes("tolov") || contentLower.includes("to'lash") || contentLower.includes("tolash"))) {
        score += 3;
      }

      // 4. Prefix fallback for longer words
      if (w.length >= 4) {
        const prefix = w.substring(0, 4);
        if (contentLower.includes(prefix)) {
          score += 1.5;
        }
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

  // Dynamic Natural tone instructions to avoid robot-like template patterns
  characterInstructions += `\n- MULOQOT USLUBI VA TABIIYLIK: Suhbatdosh bilan juda tabiiy, samimiy va jonli muloqot qil. Robotga o'xshash qoliplardan mutlaqo qoch. Quyidagi jumlalarni yoki shunga o'xshash sun'iy iboralarni aslo ishlatma: "Darslik materiallariga ko'ra", "Kurs materiallariga ko'ra", "Hujjatga ko'ra", "Men shaxsiy tanlov qila olmayman". Javoblaringni xuddi haqiqiy kurator kabi samimiy va o'zbekona tilda ravon shakllantir.`;

  // Small talk / greeting allowance rule
  characterInstructions += `\n- SALOMLASHISH VA ODDISY SUHBAT (SMALL TALK): Foydalanuvchining "salom", "assalomu alaykum", "rahmat", "xayr", "ok", "yaxshimisiz" kabi salomlashish, minnatdorchilik bildirish yoki oddiy suhbatlariga tabiiy va do'stona javob bering (Masalan: "Assalomu alaykum! Savolingiz bo'lsa bering, yordam berishdan xursandman!"). Bunday umumiy gaplarga hech qachon "darslikda javob topilmadi" deb aytmang va inson-kuratorga yo'naltirmang.`;

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
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
                maxOutputTokens: 8192,
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
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
              maxOutputTokens: 8192,
            },
          }),
        }
      );
    }

    if (!response || !response.ok) {
      console.warn('[RAG] Flash failed, trying Gemini Pro fallback...');
      const PRO_MODEL = process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro';
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${PRO_MODEL}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: {
                temperature: Math.min(0.95, 0.5 + (settings.humor || 30) / 200),
                maxOutputTokens: 8192,
              },
            }),
          }
        );
      } catch (proErr) {
        console.error('[RAG] Gemini Pro fallback fetch error:', proErr);
      }
    }

    if (!response || !response.ok) {
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

async function checkSemanticModeration(
  question: string,
  restrictedTopics: string[],
  apiKey: string
): Promise<{ flagged: boolean; matchedTopic?: string; isGeneralTalk?: boolean }> {
  if (!apiKey) {
    return { flagged: false, isGeneralTalk: false };
  }
  
  const systemPrompt = `Siz chat xabarlarini tahlil qiluvchi moderation va til yordamchisiz.
Sizga foydalanuvchining xabari va taqiqlangan mavzular ro'yxati taqdim etiladi.
Taqiqlangan mavzular: ${restrictedTopics.join(", ")}.

Vazifalaringiz:
1. Xabarning taqiqlangan mavzulardan biriga (masalan, din, siyosat, raqobatchi kurslar va h.k.) semantik jihatdan (bilvosita bo'lsa ham) tegishli ekanligini aniqlang.
2. Xabarning darslik/kurs mazmuniga oid bo'lmagan oddiy suhbat (small talk, salom, xayr, rahmat, xayrli kun), botning o'ziga nisbatan hissiy feedback/fikr (masalan: "sen yomonsan", "tentak bot", "zo'r ekansan", "javobing chala", "yaxshi ishlamayapsan", "rahmat", "ok", "tushundim", "chala") yoki umumiy gap-so'z ekanligini aniqlang.

Qoidalar:
- Agar taqiqlangan mavzu bo'lsa: {"flagged": true, "topic": "Mavzu nomi", "isGeneralTalk": false}
- Agar dars mavzusiga doir bo'lmagan oddiy suhbat, bot haqidagi gap yoki hissiy fikr bo'lsa: {"flagged": false, "isGeneralTalk": true}
- Agar darslik/kurs mavzusiga oid haqiqiy savol bo'lsa (RAG orqali darslikdan javob izlash kerak bo'lsa): {"flagged": false, "isGeneralTalk": false}

Faqat toza JSON qaytaring, boshqa yozuv qo'shmang.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{ role: "user", parts: [{ text: question }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          flagged: parsed.flagged === true,
          matchedTopic: parsed.topic,
          isGeneralTalk: parsed.isGeneralTalk === true
        };
      }
    }
  } catch (e) {
    console.error("Semantic moderation failed:", e);
  }
  return { flagged: false, isGeneralTalk: false };
}

async function analyzeMessageForCustDev(
  text: string,
  agentType: string,
  apiKey: string
): Promise<{ intent: string; sentiment: "positive" | "neutral" | "negative"; painPoint: string }> {
  const isSales = agentType === "sales";
  
  const systemPrompt = `Siz chat xabarlarini tahlil qiluvchi CustDev (Customer Development) tahlilchisisiz.
Xabarni o'qib, quyidagi JSON formatida tahlil natijasini qaytaring:
{
  "intent": "billing" | "support" | "faq" | "affiliate" | "general",
  "sentiment": "positive" | "neutral" | "negative",
  "painPoint": "..."
}

Qoidalar:
1. "intent" tasnifi:
   - "billing": Narxlar, to'lovlar, chegirmalar, tariflar yoki kartani bog'lash haqida.
   - "support": Texnik yordam, xatoliklar, bot ulanishi, Instagram ulanishi, token olish yoki platformadagi muammolar haqida.
   - "faq": Mahsulot/kurs tarkibi, darslar mazmuni yoki darslik ma'lumotlari haqida savollar.
   - "affiliate": Hamkorlik, referal tizimi, ulush olish yoki komissiya shartlari.
   - "general": Yuqoridagilarga kirmaydigan umumiy gaplar, salomlashish, xayrlashish yoki hissiy fikrlar (maqtov/norozilik).
2. "sentiment" tasnifi:
   - "positive": Minnatdorchilik, maqtovlar, ijobiy fikrlar (masalan: "rahmat", "ajoyib", "zo'r bot").
   - "negative": Noroziliklar, shikoyatlar, xatoliklar haqida xabarlar, asabiylashish (masalan: "yomon", "ishlamayapti", "tentak", "chala").
   - "neutral": Oddiy savollar, faktik so'rovlar yoki betaraf gaplar.
3. "painPoint":
   - Mijozning xabaridan kelib chiqqan **haqiqiy qiyinchilik yoki savolni** o'zbek tilida (lotin yozuvida), qisqa (1 ta gapda) shakllantiring.
   - Masalan: Agar xabar "Codex nima" bo'lsa, painPoint: "Codex vositasi haqida ma'lumot olish istagi".
   - Barcha painPoint'larni chiroyli o'zbek tilida yozing.

Faqat toza JSON qaytaring.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: text }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const resText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resText) {
        const parsed = JSON.parse(resText);
        if (parsed.intent && parsed.sentiment && parsed.painPoint) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error("AI CustDev analysis failed inside RAG:", e);
  }
  
  // Fallback
  return {
    intent: "general",
    sentiment: "neutral",
    painPoint: isSales ? "Mahsulot haqida qo'shimcha umumiy ma'lumot olish istagi" : "Kurs yoki darslar haqida qo'shimcha umumiy ma'lumot olish istagi"
  };
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
  const apiKey = process.env.GEMINI_API_KEY || "";

  // 1. Semantic moderation & General talk check + CustDev analysis (parallel)
  let flagged = false;
  let isGeneralTalk = false;
  let matchedTopic = "";
  let intent = "general";
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let painPoint = settings.aiAgentType === "sales"
    ? "Mahsulot haqida qo'shimcha umumiy ma'lumot olish istagi"
    : "Kurs yoki darslar haqida qo'shimcha umumiy ma'lumot olish istagi";

  if (apiKey) {
    const [moderationResult, analysisResult] = await Promise.allSettled([
      checkSemanticModeration(question, settings.topics || [], apiKey),
      analyzeMessageForCustDev(question, settings.aiAgentType || "kurator", apiKey),
    ]);

    if (moderationResult.status === "fulfilled") {
      flagged = moderationResult.value.flagged;
      matchedTopic = moderationResult.value.matchedTopic || "";
      isGeneralTalk = moderationResult.value.isGeneralTalk === true;
    } else {
      console.error("Semantic check failed:", moderationResult.reason);
    }

    if (analysisResult.status === "fulfilled") {
      intent = analysisResult.value.intent;
      sentiment = analysisResult.value.sentiment;
      painPoint = analysisResult.value.painPoint;
    } else {
      console.error("CustDev analysis failed:", analysisResult.reason);
    }
  }

  // Handle restricted topics
  if (flagged && apiKey) {
    const topicLower = matchedTopic.toLowerCase();
    let warningMessage = "";
    if (topicLower.includes("din") || topicLower.includes("relig")) {
      warningMessage = "Suhbatimiz mavzusidan chetlashdik. Biz hozirda bu mavzuda (\"din\") ma'lumot bera olmaymiz. Iltimos darsliklar bo'yicha savol bering.";
    } else if (topicLower.includes("siyosat") || topicLower.includes("polit")) {
      warningMessage = "Suhbatimiz mavzusidan chetlashdik. Biz hozirda bu mavzuda (\"siyosat\") ma'lumot bera olmaymiz. Iltimos darsliklar bo'yicha savol bering.";
    } else {
      warningMessage = `Suhbatimiz mavzusidan chetlashdik. Biz hozirda bu mavzuda ("${matchedTopic}") ma'lumot bera olmaymiz. Iltimos darsliklar bo'yicha savol bering.`;
    }
    return {
      text: warningMessage,
      confidence: 0,
      sources: [],
      flagged: true,
      warningMessage,
      intent,
      sentiment,
      painPoint
    };
  }

  // Handle general talk / emotional chat / feedback (Bypasses RAG completely)
  if (isGeneralTalk && apiKey) {
    const generalPrompt = `Sen samimiy, do'stona va insoniy yordamchisan. Isming: ${settings.agentName || "Sendly"}. Foydalanuvchining ismi: ${studentName}.
Murojaat turi: Foydalanuvchi oddiy salomlashdi, minnatdorchilik bildirdi, xayrlashdi yoki bot/yordamchi haqida hissiy fikr (yaxshi/yomon ekanligi, chala javob bo'lganligi, norozilik kabi fikrlar) bildirdi.
Qoidalar:
- Foydalanuvchiga xuddi yaqin do'stingga javob berayotgandek tabiiy, samimiy va insoniy javob qaytar (ortiqcha rasmiy bo'lma).
- Agar foydalanuvchi norozi bo'lsa (masalan: "sen yomonsan", "chala javob", "ishlamayapti"), kamchiliklar uchun samimiy uzr so'ra va yordam berishga tayyorligingni bildir.
- Hech qachon "darslikda javob topilmadi" deb aytma va inson-kuratorga yo'naltirma.
- Emojilar ishlatma.
- Javob 1-2 gap bo'lsin.`;

    let formattedHistory = sanitizeHistoryForGemini(history);
    if (formattedHistory.length === 0) {
      formattedHistory = [{ role: "user", parts: [{ text: question }] }];
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: generalPrompt }] },
            contents: formattedHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return {
            text: reply.trim(),
            confidence: 95,
            sources: [],
            intent,
            sentiment,
            painPoint,
            isGeneralTalk: true
          };
        }
      }
    } catch (e) {
      console.error("General talk Gemini call failed:", e);
    }
    // Fallback for general talk
    return {
      text: `Tushunarli, ${studentName}. Savolingiz bo'lsa bering, darsliklar bo'yicha yordam berishdan xursandman!`,
      confidence: 95,
      sources: [],
      intent,
      sentiment,
      painPoint,
      isGeneralTalk: true
    };
  }

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
      sources: [],
      intent,
      sentiment,
      painPoint
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
      sources,
      intent,
      sentiment,
      painPoint
    };
  }

  // Real fallback check: If Gemini API Key is missing or the response is empty
  if (!apiKey) {
    return {
      text: "Tizim sozlamalarida xatolik: Gemini API Key sozlanmagan. Iltimos platforma administratoriga xabar bering.",
      confidence: 0,
      sources: [],
      intent,
      sentiment,
      painPoint
    };
  }

  return {
    text: "Kechirasiz, sun'iy intellekt xizmati vaqtincha band yoki javob berishda uzilish yuz berdi. Iltimos qaytadan urinib ko'ring.",
    confidence: 0,
    sources: [],
    intent,
    sentiment,
    painPoint
  };
}
