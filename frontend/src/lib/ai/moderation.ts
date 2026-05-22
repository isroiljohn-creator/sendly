export type ModerationResult = {
  flagged: boolean;
  reason?: "spam" | "ad" | "offensive" | "off_topic";
  warningMessage?: string;
};

const OFFENSIVE_WORDS = [
  "xarom", "yaramas", "tupoy", "idiot", "suka", "blat", "bla", "ahmoq",
  "kalla", "iflos", "padla", "gandon", "tvar", "jinni"
];

/**
 * Xabarlarni moderation filtridan o'tkazish.
 * Spam, reklama havolalari, haqoratlar va taqiqlangan (off-topic) mavzularni tekshiradi.
 */
export function moderateMessage(text: string, restrictedTopics: string[] = []): ModerationResult {
  const clean = text.toLowerCase().trim();

  // 1. Spam check (excessive character repetitions)
  if (clean.length > 50 && /(.)\1{5,}/.test(clean)) {
    return {
      flagged: true,
      reason: "spam",
      warningMessage: "Iltimos, xabarlarda ketma-ket harflarni ko'p takrorlamang. ⚠️",
    };
  }

  // 2. Ad check (detect external links excluding local domains)
  if (
    /\b(https?:\/\/|www\.)\S+\b/.test(clean) &&
    !clean.includes("railway.app") &&
    !clean.includes("sendly.uz") &&
    !clean.includes("curator.uz")
  ) {
    return {
      flagged: true,
      reason: "ad",
      warningMessage: "Tizimda tashqi havolalar yoki reklama tarqatish taqiqlanadi. 🚫",
    };
  }

  // 3. Offensive words check
  for (const word of OFFENSIVE_WORDS) {
    if (clean.includes(word)) {
      return {
        flagged: true,
        reason: "offensive",
        warningMessage: "Iltimos, o'zaro hurmatni saqlang va haqoratli yoki qo'pol so'zlar ishlatmang. 🤝",
      };
    }
  }

  // 4. Dynamic Restricted topics check
  const defaultOffTopics = ["kripto", "bitcoin", "siyosat", "urush", "kino telegram", "futbol"];
  const allOffTopics = Array.from(new Set([...defaultOffTopics, ...restrictedTopics.map(t => t.toLowerCase())]));

  for (const topic of allOffTopics) {
    if (topic && clean.includes(topic)) {
      return {
        flagged: true,
        reason: "off_topic",
        warningMessage: `Suhbatimiz mavzusidan chetlashdik. Biz hozirda bu mavzuda ("${topic}") ma'lumot bera olmaymiz. Iltimos darsliklar bo'yicha savol bering. 📚`,
      };
    }
  }

  return { flagged: false };
}
