export type ModerationResult = {
  flagged: boolean;
  reason?: "spam" | "ad" | "offensive" | "off_topic";
  warningMessage?: string;
};

const OFFENSIVE_WORDS = [
  "xarom", "yaramas", "tupoy", "idiot", "suka", "blat", "bla", "ahmoq",
  "kalla", "iflos", "padla", "gandon", "tvar", "jinni"
];

function detectLanguage(text: string): "uz" | "ru" | "en" {
  const clean = text.toLowerCase();
  // 1. Russian Cyrillic characters check
  if (/[а-яё]/i.test(clean)) {
    return "ru";
  }
  // 2. English check (scoring)
  const enWords = ["the", "and", "you", "is", "are", "what", "how", "this", "that", "course", "price", "discount", "hello", "hi", "about", "please"];
  const uzWords = ["mi", "va", "uchun", "bor", "yo'q", "qancha", "narxi", "salom", "rahmat", "bormi", "bilan", "emas", "kerak", "o'quvchi", "dars"];
  
  let enScore = 0;
  let uzScore = 0;

  const words = clean.split(/\s+/);
  for (const w of words) {
    if (enWords.includes(w)) enScore++;
    if (uzWords.includes(w)) uzScore++;
  }

  // Uzbek specific Latin elements
  if (clean.includes("o'") || clean.includes("g'") || clean.includes("sh") || clean.includes("ch")) {
    uzScore += 0.5;
  }

  return enScore > uzScore ? "en" : "uz";
}

function matchTopicPrefix(text: string, topic: string): boolean {
  const escapedTopic = topic.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[^a-z0-9'’‘\`’а-яё])${escapedTopic}`, 'i');
  return pattern.test(text);
}

/**
 * Xabarlarni moderation filtridan o'tkazish.
 * Spam, reklama havolalari, haqoratlar va taqiqlangan (off-topic) mavzularni tekshiradi.
 */
export function moderateMessage(text: string, restrictedTopics: string[] = []): ModerationResult {
  const clean = text.toLowerCase().trim();
  const lang = detectLanguage(clean);

  // 1. Spam check (excessive character repetitions)
  if (clean.length > 50 && /(.)\1{5,}/.test(clean)) {
    const warningMessage =
      lang === "en"
        ? "Please do not repeat characters excessively in your messages."
        : lang === "ru"
        ? "Пожалуйста, не повторяйте многократно буквы в сообщениях."
        : "Iltimos, xabarlarda ketma-ket harflarni ko'p takrorlamang.";
    return {
      flagged: true,
      reason: "spam",
      warningMessage,
    };
  }

  // 2. Ad check (detect external links excluding local domains)
  if (
    /\b(https?:\/\/|www\.)\S+\b/.test(clean) &&
    !clean.includes("railway.app") &&
    !clean.includes("sendly.uz") &&
    !clean.includes("curator.uz")
  ) {
    const warningMessage =
      lang === "en"
        ? "Sharing external links or advertisements is prohibited in the system."
        : lang === "ru"
        ? "Распространение внешних ссылок или рекламы в системе запрещено."
        : "Tizimda tashqi havolalar yoki reklama tarqatish taqiqlanadi.";
    return {
      flagged: true,
      reason: "ad",
      warningMessage,
    };
  }

  // 3. Offensive words check
  for (const word of OFFENSIVE_WORDS) {
    if (clean.includes(word)) {
      const warningMessage =
        lang === "en"
          ? "Please maintain mutual respect and do not use offensive or rude words."
          : lang === "ru"
          ? "Пожалуйста, соблюдайте взаимное уважение и не используйте оскорбительные или грубые слова."
          : "Iltimos, o'zaro hurmatni saqlang va haqoratli yoki qo'pol so'zlar ishlatmang.";
      return {
        flagged: true,
        reason: "offensive",
        warningMessage,
      };
    }
  }

  // 4. Dynamic Restricted topics check
  const defaultOffTopics = ["kripto", "bitcoin", "siyosat", "urush", "kino telegram", "futbol", "crypto", "politics", "war", "крипта", "политика", "война"];
  const allOffTopics = Array.from(new Set([...defaultOffTopics, ...restrictedTopics.map(t => t.toLowerCase())]));

  for (const topic of allOffTopics) {
    if (topic && matchTopicPrefix(clean, topic)) {
      const warningMessage =
        lang === "en"
          ? `We have strayed from our topic. We cannot provide information on this topic ("${topic}") at the moment. Please ask a question related to the course materials.`
          : lang === "ru"
          ? `Мы отклонились от темы нашего разговора. Мы не можем предоставить информацию по этой теме ("${topic}") в данный момент. Пожалуйста, задайте вопрос по учебным материалам.`
          : `Suhbatimiz mavzusidan chetlashdik. Biz hozirda bu mavzuda ("${topic}") ma'lumot bera olmaymiz. Iltimos darsliklar bo'yicha savol bering.`;
      return {
        flagged: true,
        reason: "off_topic",
        warningMessage,
      };
    }
  }

  return { flagged: false };
}
