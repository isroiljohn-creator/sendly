import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Channel, Automation, BotSettings, Lesson, Module } from "./db";
import { moderateMessage } from "./ai/moderation";
import { queryRAG } from "./ai/rag";
import * as pgdb from "./pgdb";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb(): any {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to read/parse db.json", e);
    }
  }
  return {};
}

function safeParse(val: any, fallback: any = null) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

export function getDefaultSystemPrompt(agentType?: string): string {
  const type = agentType || "kurator";
  switch (type) {
    case "sales":
      return `# ROL VA IDENTIFIKATSIYA\nSen marketing kursi yordamchisisan (Sales Closer AI). Maqsading: mijozlarga mahsulotlar, narxlar, katalog, manzil va ish vaqti haqida to'liq ma'lumot berish va ularni sotib olishga yo'naltirish, buyurtmalarni tezda rasmiylashtirish.\n\n# ASOSIY VAZIFA\nMijozlarning savollariga faqat va faqat quyida taqdim etilgan mahsulot katalogi va do'kon ma'lumotlari (MAHSULOT VA DO'KON MATERIALLARI) asosida javob berish.\n\n# MAHSULOT VA DO'KON MATERIALLARI:\n{{context}}\n\n# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR\n1. Katalogda bo'lmagan yoki noaniq mahsulotlar/narxlar haqida gapirma. Agarda savol katalogda yo'q bo'lsa, mijozning telefon raqamini so'rab:\n   "Afsuski, ushbu mahsulot yoki xizmat haqida hozircha ma'lumot yo'q. Sizga aniq yordam berishimiz uchun telefon raqamingizni qoldirsangiz, mutaxassisimiz tezda bog'lanadi." deb javob ber.\n2. Har bir muloqotda sotuvga va buyurtmaga yo'naltiruvchi savollar ber.\n3. Taqiqlangan mavzulardan qoch (siyosat, shaxsiy savollar va boshqalar).\n\n# JAVOB FORMATI VA STILI\n- Xushmuomala va sotuvga chorlovchi ohang.\n- Javoblarni londa, qisqa va qulay formatda taqdim et (ko'pi bilan 3 ta gap).`;
    case "booker":
      return `# ROL VA IDENTIFIKATSIYA\nSen shaxsiy brend egasining aqlli maslahatchisi va band qilish yordamchisisan (Appointment Booker AI). Maqsading: mutaxassisning nomidan gaplashib, uning ohangi va bilimlariga mos ravishda foydali maslahat berish hamda konsultatsiya/suhbat uchun vaqt belgilash.\\n\\n# ASOSIY VAZIFA\nSuhbatdoshlarga faqat mutaxassisning bilimlari, qoidalari va ish tartibi (MUTAXASSIS BILIMLARI) doirasida maslahat berish.\\n\\n# MUTAXASSIS BILIMLARI:\\n{{context}}\\n\\n# QAT\\'IY YO\\'RIQNOMALAR VA CHEKLOVLAR\\n1. Konsultatsiyani bron qilishdan avval to\\'lov qilinishi shart bo\\'lsa, mijozga to\\'lov shartlari va havolani taqdim et.\\n2. Mutaxassisning o\\'rniga noaniq ma\\'lumotlarni gapirma, faqat uning bilimlari bazasida yozilgan yo\\'nalishlarni ber.\\n3. Har doim mutaxassisning shaxsiy gaplashish tonida (do\\'stona, professional, xarakterli) bo\\'l.\\n\\n# JAVOB FORMATI VA STILI\\n- Tabiiy suhbatdosh kabi ohang.\\n- Mijozning ehtiyojini tushunish va to\\'g\\'ri vaqtga bron qilishni taklif qilish.`;
    case "recruiter":
      return `# ROL VA IDENTIFIKATSIYA\nSen kompaniyaning HR yordamchisisan (HR Recruiter AI). Maqsading: nomzodlarga bo'sh ish o'rinlari haqida ma'lumot berish, nomzodlar bilan dastlabki suhbat/skrining o'tkazish, kerakli ma'lumotlarni yig'ish va ularni saralash.\n\n# ASOSIY VAZIFA\nNomzodlarga faqat vakansiya va talablar (VAKANSIYALAR VA TALABLAR) doirasida javob berish.\n\n# VAKANSIYALAR VA TALABLAR:\n{{context}}\n\n# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR\n1. Nomzoddan ketma-ket quyidagi ma'lumotlarni to'pla: Ismi, bog'lanish telefoni, tajribasi va ish haqi bo'yicha kutilmasi.\n2. Balla ma'lumotlarni olmaguncha nomzodning arizasini yakunlama.\n3. Vakansiya talablariga mos kelmaydigan nomzodlarni muloyimlik bilan inson operatorga yo'naltir yoki rad javobini ber.\n\n# JAVOB FORMATI VA STILI\n- Professional, samimiy va suhbat tarzida yondashish.\n- Har bir xabarda faqat bitta savol berib, suhbatni oqilona davom ettirish.`;
    case "clinic":
      return `# ROL VA IDENTIFIKATSIYA\nSen tibbiy markaz/klinikaning onlayn qabul yordamchisisan (Medical Assistant AI). Maqsading: bemorlarga shifokorlar, bo'limlar va qabul vaqtlari haqida ma'lumot berish, onlayn navbat yozish va eslatmalar yuborish.\n\n# ASOSIY VAZIFA\nBemorlarga faqat klinika ma'lumotlari (KLINIKA MA'LUMOTLARI) doirasida javob berish.\n\n# CLINIC INFORMATION:\n{{context}}\n\n# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR\n1. Hech qachon tashxis qo'yma yoki dori-darmon tavsiya etma. Faqat shifokorga yozilish va umumiy ma'lumot ber.\n2. Bemorning shikoyatiga qarab tegishli bo'lim yoki shifokorni tavsiya et.\n3. Bo'sh vaqtlarni ko'rsatib, bron qilishni taklif et.\n\n# JAVOB FORMATI VA STILI\n- Muloyim, g'amxo'r va professional ohang.\n- Javoblarni qisqa va aniq ber.`;
    case "realtor":
      return `# ROL VA IDENTIFIKATSIYA\nSen ko'chmas mulk agentligining onlayn yordamchisisan (Realtor AI). Maqsading: mijozlarga uy-joylar haqida ma'lumot berish, narx va joylashuv ko'rsatish, ko'rish uchun vaqt belgilash.\n\n# ASOSIY VAZIFA\nMijozlarga faqat ko'chmas mulk bazasi (MULK BAZASI) doirasida javob berish.\n\n# PROPERTY DATABASE:\n{{context}}\n\n# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR\n1. Bazada yo'q uy-joylar haqida gapirma.\n2. Mijozning budjetini, joylashuvini va talablarini so'rab, mos variantlarni tavsiya et.\n3. Ko'rish uchun vaqt belgilashni taklif qilib, rieltor bilan bog'lanishni tashkil et.\n\n# JAVOB FORMATI VA STILI\n- Ishonchli, do'stona va ma'lumotli ohang.\n- Har bir uy-joy uchun narx, maydon, xonalar soni va joylashuvni ko'rsat.`;
    case "helpdesk":
      return `# ROL VA IDENTIFIKATSIYA\nSen kompaniyaning texnik yordam yordamchisisan (Help Desk AI). Maqsading: foydalanuvchilarga texnik muammolarni hal qilishda yordam berish, FAQ dan javob topish, murakkab holatlarni inson operatoriga yo'naltirish.\n\n# ASOSIY VAZIFA\nFoydalanuvchilarga faqat bilimlar bazasi (BILIMLAR BAZASI) doirasida javob berish.\n\n# KNOWLEDGE BASE:\n{{context}}\n\n# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR\n1. Muammoni avval tasniflash: texnik xatolik, hisob muammosi, to'lov muammosi yoki boshqa.\n2. Bazada javob bo'lsa — aniq va bosqichma-bosqich yechim ber.\n3. Bazada javob topilmasa — tiket raqami berib, operatorga yo'naltir.\n\n# JAVOB FORMATI VA STILI\n- Sabr-toqatli, tushunarli va texnik jihatdan aniq.\n- Muammoni hal qilish uchun bosqichma-bosqich ko'rsatmalar ber.`;
    case "kurator":
    default:
      return `# ROL VA IDENTIFIKATSIYA\nSen marketing kursi o'quvchilariga yordam beruvchi, ismi "{{agentName}}" bo'lgan Sendly shaxsiy AI kuratorisan. Xaraktering: samimiy, do'stona, qisqa va aniq gapiradigan, ortiqcha rasmiyatchilikdan xoli.\n\n# ASOSIY VAZIFA\nO'quvchilarning savollariga faqat va faqat quyida taqdim etilgan darslik/kurs materiallari (KURS MATERIALLARI) asosida tushunarli, qisqa va tabiiy javob berish.\n\n# KURS MATERIALLARI:\n{{context}}\n\n# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR\n1. Salomlashish va oddiy suhbat: "Salom", "Assalomu alaykum", "Rahmat", "Xayr", "Yaxshimisiz" kabi salomlashish, minnatdorchilik yoki oddiy gaplarga tabiiy, samimiy va do'stona javob ber. Xabarlarga "darslikda javob topilmadi" dema va operatorga yo'naltirma.\n2. Cheklangan Ma'lumot: Faqat berilgan KURS MATERIALLARI ichidagi ma'lumotlardan foydalan.\n3. Noma'lum Savollar: Agar javob bo'lmasa, "Bu mavzu bo'yicha men hali ma'lumotga ega emasman, lekin kuratorimiz sizga yordam bera oladi" deb javob ber.\n4. Taqiqlangan Mavzular: Siyosat, din, raqobatchi kurslar yoki marketingga aloqasi bo'lmagan mavzular haqida gapirma. Agar bunday savol berilsa, muloyimlik bilan rad et:\n   "Men faqat ushbu marketing kursi bo'yicha savollarga javob bera olaman. Keling, darsimizga qaytamiz!"\n5. Til qoidasi: O'quvchi qaysi tilda yozgan bo'lsa, o'sha tilda tabiiy javob ber.\n\n# JAVOB FORMATI VA STILI\n- Tabiiylik va Qisqalik: Javoblaring juda qisqa, aniq va londa bo'lsin (ko'pi bilan 2-3 ta gap). Ortiqcha uzun gaplar, kirish so'zlar yoki sun'iy gaplardan qoch. Oddiy suhbatdoshdek tabiiy gapir.\n- Soddalik: Murakkab marketing atamalarini sodda, kundalik tilda tushuntir.\n- Manba ko'rsatmaslik: JAVOBINGGA HECH QANDAY MANBA YOKI SHUNGA O'XSHASH MA'LUMOTLARNI QO'SHMA (Masalan: "Manba: 1-Modul..." kabi yozuvlar umuman bo'lmasligi shart).\n- Emojilar: Mutlaqo emojilarsiz, faqat matn va belgilar yordamida javob yoz.`;
  }
}

export function sanitizeMessage(text: string): { sanitized: string; isInjection: boolean } {
  const injectionKeywords = [
    "ignore previous",
    "tizim ko'rsatmalarini unut",
    "system:",
    "you are now"
  ];
  const lowerText = text.toLowerCase();
  const isInjection = injectionKeywords.some(kw => lowerText.includes(kw));
  let sanitized = text;
  if (isInjection) {
    for (const kw of injectionKeywords) {
      const regex = new RegExp(kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '');
    }
  }
  return { sanitized: sanitized.trim(), isInjection };
}

export function injectStyleInstructions(prompt: string, settings: BotSettings): string {
  let instructions = "\n\n# JAVOB USLUBI BO'YICHA QAT'IY KO'RSATMALAR (DINAMIK SOZLAMALAR):\n";
  const toneVal = settings.tone !== undefined ? settings.tone : 60;
  if (toneVal > 70) {
    instructions += "- Ohang: rasmiy (Javoblarni rasmiy, madaniy va olijanob tilda, Sizlab yozing).\n";
  } else if (toneVal < 30) {
    instructions += "- Ohang: hazilomuz (Javoblarni norasmiy, hazilomuz, ochiq va do'stona, hazil-mutoyiba aralashtirib yozing).\n";
  } else {
    instructions += "- Ohang: muloyim (Javoblarni juda muloyim, xushmuomala, samimiy va do'stona tarzda yozing).\n";
  }

  const humorVal = settings.humor !== undefined ? settings.humor : 30;
  if (humorVal > 70) {
    instructions += "- Hazil darajasi: yuqori (Javoblaga ko'proq samimiy hazil-mutoyiba va qiziqarli hazillarni qo'shib yozing).\n";
  } else if (humorVal < 30) {
    instructions += "- Hazil darajasi: jiddiy (Javoblarni mutlaqo jiddiy, professional va faqat dars ma'lumotlariga asoslangan holda yozing).\n";
  } else {
    instructions += "- Hazil darajasi: me'yorda (Samimiy va iliq munosabat, me'yorida hazil-mutoyiba aralashtirilgan bo'lsin).\n";
  }

  const lengthVal = settings.length !== undefined ? settings.length : 40;
  if (lengthVal > 70) {
    instructions += "- Javob uzunligi: batafsil (Mavzuni to'liq, keng va batafsil tushuntirib bering).\n";
  } else if (lengthVal < 30) {
    instructions += "- Javob uzunligi: qisqa (Maksimal darajada qisqa, aniq va londa - ko'pi bilan 1-2 gapda javob bering).\n";
  } else {
    instructions += "- Javob uzunligi: o'rtacha (Javoblar o'rtacha uzunlikda, ortiqcha cho'zilmasdan me'yorida yozilsin).\n";
  }
  return prompt + instructions;
}

export function injectForbiddenTopics(prompt: string, settings: BotSettings): string {
  const topics = settings.topics || (settings as any).forbiddenTopics || [];
  if (Array.isArray(topics) && topics.length > 0) {
    let instructions = "\n\n# TAQIQLANGAN MAVZULAR VA CHEKLOVLAR (QAT'IY QOIDA):\n";
    instructions += `Quyidagi mavzularda gaplashish mutlaqo taqiqlanadi: ${topics.join(", ")}.\n`;
    instructions += "Agar foydalanuvchi ushbu mavzularda savol bersa yoki gap ochsa, quyidagi javobni bering va muloyimlik bilan dars/kurs mavzusiga qaytishni so'rang:\n";
    instructions += `   "Kechirasiz, ushbu mavzuda ma'lumot bera olmayman. Keling, darsimizga qaytamiz!"\n`;
    return prompt + instructions;
  }
  return prompt;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
  tags: string[];
  liveTakeover?: boolean;
}

interface TelegramBotState {
  active: boolean;
  token: string;
  offset: number;
  instanceId?: string;
}

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function getDbDataFromRailway(): Promise<any> {
  // 1. Fetch global users
  const globalUsers = await pgdb.getValue("global_users") || [];

  // 2. Fetch all user settings
  const allSettings = await pgdb.getAllLike("global_settings_%") || [];

  const userData: Record<string, any> = {};
  allSettings.forEach((row) => {
    const userId = row.key.replace("global_settings_", "");
    userData[userId] = row.value || {};
  });

  return {
    users: globalUsers,
    userData
  };
}

export const getDbDataFromSupabase = getDbDataFromRailway;

function splitTelegramMessage(text: string, maxLength = 4000): string[] {
  if (!text) return [""];
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }
    
    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

async function getUserPlan(userId: string): Promise<string> {
  if (pgdb.isConfigured()) {
    try {
      const globalUsers = await pgdb.getValue("global_users");
      if (Array.isArray(globalUsers)) {
        const u = globalUsers.find((x: any) => x.id === userId);
        if (u) return u.plan || "free";
      }
    } catch (e) {
      console.error("Failed to get user plan from PostgreSQL:", e);
    }
  } else {
    try {
      const dbData = readDb();
      const u = dbData.users?.find((x: any) => x.id === userId);
      if (u) return u.plan || "free";
    } catch (e) {
      console.error("Failed to get user plan from JSON:", e);
    }
  }
  return "free";
}

class MessageQueue {
  private lastSendTime = 0;
  private queue: Promise<void> = Promise.resolve();

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        const now = Date.now();
        const elapsed = now - this.lastSendTime;
        if (elapsed < 35) {
          await new Promise(r => setTimeout(r, 35 - elapsed));
        }
        try {
          const res = await task();
          this.lastSendTime = Date.now();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

const tokenQueues = new Map<string, MessageQueue>();

function getTokenQueue(token: string): MessageQueue {
  let q = tokenQueues.get(token);
  if (!q) {
    q = new MessageQueue();
    tokenQueues.set(token, q);
  }
  return q;
}

async function getTelegramAvatarBase64(token: string, chatId: number | string, isGroup: boolean): Promise<string | null> {
  try {
    if (isGroup) {
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`, { cache: "no-store" });
      if (!chatRes.ok) return null;
      const chatData = await chatRes.json();
      if (!chatData.ok || !chatData.result || !chatData.result.photo) return null;
      
      const fileId = chatData.result.photo.small_file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`, { cache: "no-store" });
      if (!fileRes.ok) return null;
      const fileData = await fileRes.json();
      if (!fileData.ok || !fileData.result || !fileData.result.file_path) return null;
      
      const filePath = fileData.result.file_path;
      const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, { cache: "no-store" });
      if (!imgRes.ok) return null;
      
      const buffer = await imgRes.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
    } else {
      const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${chatId}&limit=1`, { cache: "no-store" });
      if (!photosRes.ok) return null;
      const photosData = await photosRes.json();
      if (!photosData.ok || !photosData.result || photosData.result.total_count === 0) return null;
      
      const photos = photosData.result.photos;
      if (!photos || photos.length === 0 || photos[0].length === 0) return null;
      
      const fileId = photos[0][0].file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`, { cache: "no-store" });
      if (!fileRes.ok) return null;
      const fileData = await fileRes.json();
      if (!fileData.ok || !fileData.result || !fileData.result.file_path) return null;
      
      const filePath = fileData.result.file_path;
      const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, { cache: "no-store" });
      if (!imgRes.ok) return null;
      
      const buffer = await imgRes.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
    }
  } catch (e) {
    console.error("Failed to fetch Telegram avatar:", e);
    return null;
  }
}

async function getChannelIdByToken(token: string): Promise<string | null> {
  let dbData: any = {};
  if (pgdb.isConfigured()) {
    dbData = await getDbDataFromRailway();
  } else {
    if (fs.existsSync(DB_FILE)) {
      try {
        dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } catch (e) {}
    }
  }
  
  const rawChannels = dbData["replai_channels"];
  const legacyChannels: Channel[] = safeParse(rawChannels, []);
  const foundLegacy = legacyChannels.find(c => c.telegramToken === token);
  if (foundLegacy) return foundLegacy.id;

  if (dbData.userData) {
    for (const [userId, userVal] of Object.entries(dbData.userData)) {
      if (userVal && typeof userVal === "object") {
        const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
        const userChannels: Channel[] = safeParse(rawUserChannels, []);
        const found = userChannels.find(c => c.telegramToken === token);
        if (found) return found.id;
      }
    }
  }
  
  const systemBotToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (systemBotToken && systemBotToken.trim() === token.trim()) {
    return "system_bot";
  }

  return null;
}

async function handleBlockedUser(token: string, chatId: number | string) {
  const channelId = await getChannelIdByToken(token);
  if (!channelId) return;
  const userId = await getUserIdForChannel(channelId);
  if (userId === "guest") return;
  await updateUserDbFile(userId, async (userVal) => {
    const contactsKey = "replai_contacts";
    const rawContacts = userVal[contactsKey];
    let contactsList: any[] = safeParse(rawContacts, []);
    if (!Array.isArray(contactsList)) contactsList = [];
    
    const contact = contactsList.find(c => String(c.id) === String(chatId));
    if (contact) {
      contact.blocked = true;
      userVal[contactsKey] = JSON.stringify(contactsList);
    }
  });
}

async function isUserBlocked(token: string, chatId: number | string): Promise<boolean> {
  const channelId = await getChannelIdByToken(token);
  if (!channelId) return false;
  const userId = await getUserIdForChannel(channelId);
  if (userId === "guest") return false;
  
  let dbData: any = {};
  if (pgdb.isConfigured()) {
    dbData = await getDbDataFromRailway();
  } else {
    if (fs.existsSync(DB_FILE)) {
      try {
        dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } catch (e) {}
    }
  }

  let userVal: any = null;
  if (dbData.userData) {
    userVal = dbData.userData[userId];
  }
  if (!userVal) return false;

  const contactsKey = "replai_contacts";
  const rawContacts = userVal[contactsKey];
  const contactsList: any[] = safeParse(rawContacts, []);
  if (!Array.isArray(contactsList)) return false;
  const contact = contactsList.find(c => String(c.id) === String(chatId));
  return !!(contact && contact.blocked);
}

async function getBotUsername(channelId: string, token: string): Promise<string> {
  const globalRef = global as unknown as {
    botUsernames?: Record<string, string>;
  };
  if (!globalRef.botUsernames) {
    globalRef.botUsernames = {};
  }
  if (globalRef.botUsernames[channelId]) {
    return globalRef.botUsernames[channelId];
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result && data.result.username) {
        globalRef.botUsernames[channelId] = data.result.username;
        return data.result.username;
      }
    }
  } catch (e) {
    console.error(`Error fetching bot username for channel ${channelId}:`, e);
  }
  return "";
}

async function addTelegramChannelToList(channelId: string, username: string, name: string) {
  const userId = await getUserIdForChannel(channelId);
  if (userId === "guest") return;
  await updateUserDbFile(userId, async (userVal) => {
    const rawUserChannels = userVal["replai_channels"];
    const userChannels: Channel[] = safeParse(rawUserChannels, []);
    const foundChIdx = userChannels.findIndex(c => c.id === channelId);
    if (foundChIdx > -1) {
      const ch = userChannels[foundChIdx];
      const newChannels = [...(ch.telegramChannels || [])];
      if (!newChannels.some(c => c.username === username)) {
        newChannels.push({ username, name });
        ch.telegramChannels = newChannels;
        userVal["replai_channels"] = JSON.stringify(userChannels);
      }
    }
  });
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string, parseMode?: string, replyMarkup?: any) {
  const isBlocked = await isUserBlocked(token, chatId);
  if (isBlocked) {
    console.log(`[sendTelegramMessage] Skipping message to blocked user ${chatId}`);
    return;
  }

  const chunks = splitTelegramMessage(text);
  const q = getTokenQueue(token);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text: chunk,
    };
    if (parseMode) payload.parse_mode = parseMode;
    if (replyMarkup && i === chunks.length - 1) {
      payload.reply_markup = replyMarkup;
    }

    try {
      await q.add(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store"
        });

        if (res.status === 403) {
          console.warn(`[sendTelegramMessage] Received 403 Forbidden. Contact ${chatId} blocked the bot.`);
          await handleBlockedUser(token, chatId);
          return;
        }

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Failed to send Telegram message chunk ${i+1}/${chunks.length} to ${chatId}: ${res.status} - ${errText}`);
        }
      });
    } catch (err) {
      console.error(`Error in sendTelegramMessage queue for ${chatId}:`, err);
    }
  }
}

class TaskQueue {
  private queue: Promise<void> = Promise.resolve();

  async add(task: () => Promise<void> | void): Promise<void> {
    this.queue = this.queue.then(async () => {
      try {
        await task();
      } catch (err) {
        console.error("Queue task execution error:", err);
      }
    });
    return this.queue;
  }
}

const chatQueues: Map<string, TaskQueue> = new Map();

export function getChatQueue(chatId: string): TaskQueue {
  let q = chatQueues.get(chatId);
  if (!q) {
    q = new TaskQueue();
    chatQueues.set(chatId, q);
  }
  return q;
}

export async function getUserIdForChannel(channelId: string): Promise<string> {
  if (pgdb.isConfigured()) {
    const userId = await pgdb.getUserIdByChannelId(channelId);
    if (userId) return userId;
  }
  
  if (fs.existsSync(DB_FILE)) {
    try {
      const dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      if (dbData.userData) {
        for (const [userId, userVal] of Object.entries(dbData.userData)) {
          if (userVal && typeof userVal === "object") {
            const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
            const userChannels: Channel[] = safeParse(rawUserChannels, []);
            if (userChannels.some(c => c.id === channelId)) {
              return userId;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to read db.json for channelId search:", e);
    }
  }
  return "guest";
}

async function updateUserDbFile(
  userId: string,
  updater: (userVal: Record<string, any>, dbData: Record<string, any>) => Promise<void> | void
) {
  if (pgdb.isConfigured()) {
    try {
      const userVal = await pgdb.getUserSettings(userId) || {};
      const globalUsers = await pgdb.getValue("global_users") || [];
      const dbDataPlaceholder = { userData: { [userId]: userVal }, users: globalUsers };
      await updater(userVal, dbDataPlaceholder);
      await pgdb.setValue("global_settings_" + userId, userVal);
      return;
    } catch (dbErr) {
      console.error(`Railway updateUserDbFile failed for user ${userId}, falling back to local`, dbErr);
    }
  }

  // Fallback to local db.json file
  let dbData: Record<string, any> = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to read/parse db.json in fallback updater", e);
    }
  }
  if (!dbData.userData) dbData.userData = {};
  if (!dbData.userData[userId]) dbData.userData[userId] = {};
  
  await updater(dbData.userData[userId], dbData);
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write db.json in fallback updater", e);
  }
}

export async function handleTelegramUpdate(channelId: string, token: string, update: any) {
  if (!update || typeof update !== "object") {
    console.error(`[Bot Runner] Received invalid or null update object for channel ${channelId}`);
    return;
  }
  if (!token) {
    console.error(`[Bot Runner] Missing token for channel ${channelId}`);
    return;
  }
  console.log(`[Bot Runner] Handling update for channel ${channelId} (token: ...${token.slice(-6)}):`, JSON.stringify(update));
  try {
    // Handle inline button callback query to copy verification code
    if (update.callback_query) {
      const cb = update.callback_query;
      if (cb.data === "copy_code") {
        const msgText = cb.message?.text || "";
        const codeMatch = msgText.match(/\b(\d{5})\b/);
        const code = codeMatch ? codeMatch[1] : "";
        
        const answerUrl = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
        await fetch(answerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: cb.id,
            text: code ? "Nusxalash uchun alohida xabar yuborildi. Ustiga bosing!" : "Matndagi kod ustiga bosing!",
            show_alert: false
          }),
          cache: "no-store"
        });

        if (code && cb.message?.chat?.id) {
          await sendTelegramMessage(token, cb.message.chat.id, `<code>${code}</code>`, "HTML");
        }
      }
      return;
    }

    // Handle bot added/updated in a channel/group
    if (update.my_chat_member) {
      const chat = update.my_chat_member.chat;
      const newMember = update.my_chat_member.new_chat_member;
      if (chat && (chat.type === "channel" || chat.type === "group" || chat.type === "supergroup") && newMember && newMember.status === "administrator") {
        const username = chat.username || String(chat.id);
        const name = chat.title || chat.username || `Kanal ${chat.id}`;
        await addTelegramChannelToList(channelId, username, name);
      }
    }

    // Handle a message post inside a channel
    if (update.channel_post && update.channel_post.chat) {
      const chat = update.channel_post.chat;
      if (chat.type === "channel") {
        const username = chat.username || String(chat.id);
        const name = chat.title || chat.username || `Kanal ${chat.id}`;
        await addTelegramChannelToList(channelId, username, name);
      }
    }

    const message = update.message;
    if (!message || !message.chat) {
      return;
    }

    // Handle group_chat_created or supergroup_chat_created or new_chat_members
    if (message.group_chat_created || message.supergroup_chat_created) {
      const username = message.chat.username || String(message.chat.id);
      const name = message.chat.title || message.chat.username || `Guruh ${message.chat.id}`;
      await addTelegramChannelToList(channelId, username, name);
    }

    if (message.new_chat_members && Array.isArray(message.new_chat_members)) {
      const username = message.chat.username || String(message.chat.id);
      const name = message.chat.title || message.chat.username || `Guruh ${message.chat.id}`;
      await addTelegramChannelToList(channelId, username, name);
    }

    // Media messages check (#18)
    if (!message.text) {
      if (message.photo || message.video || message.voice || message.sticker || message.document || message.audio || message.animation || message.video_note) {
        const chatId = message.chat.id;
        const userLang = (message.from?.language_code || "").startsWith("ru")
          ? "ru"
          : (message.from?.language_code || "").startsWith("en")
          ? "en"
          : "uz";
        const mediaMsg =
          userLang === "en"
            ? "Sorry, I can only understand text messages at the moment."
            : userLang === "ru"
            ? "Извините, на данный момент я могу понимать только текстовые сообщения."
            : "Kechirasiz, hozirda faqat matnli xabarlarni tushuna olaman.";
        await sendTelegramMessage(token, chatId, mediaMsg);
      }
      return;
    }

    const chatId = message.chat.id;
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";
    const usernameRaw = message.chat.username;
    const username = usernameRaw ? usernameRaw.replace(/^@+/, "") : undefined;
    const firstName = message.chat.first_name;
    const lastName = message.chat.last_name;
    const title = message.chat.title;
    const text = message.text;
    const isSystemBot = channelId === "system_bot";
    const userLang = isSystemBot
      ? ((message.from?.language_code || "").startsWith("ru") ? "ru" : (message.from?.language_code || "").startsWith("en") ? "en" : "uz")
      : "uz";
    
    // Check if we should reply in groups
    const botUsername = await getBotUsername(channelId, token);
    const isMentioned = botUsername && text.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
    const isReplyToBot = message.reply_to_message && message.reply_to_message.from?.is_bot;
    const isCommand = text.startsWith("/");
    const shouldReply = !isGroup || isMentioned || isReplyToBot || isCommand;

    const chatName = isGroup 
      ? (title || `Guruh ${chatId}`) 
      : `${firstName || ""} ${lastName || ""}`.trim() || username || `Telegram User ${chatId}`;

    // Handle start command to get verification code for admin linking (ONLY for system bot)
    if (channelId === "system_bot" && (text.trim() === "/start" || text.trim().startsWith("/start "))) {
      let targetChannelId = "";
      const parts = text.trim().split(" ");
      if (parts.length > 1) {
        const param = parts[1].trim();
        if (param !== "verify") {
          targetChannelId = param;
        }
      }

      if (!targetChannelId || targetChannelId === "system_bot") {
        const infoMsg =
          userLang === "en"
            ? `Hello! Welcome to the Sendly bot.\n\nIf you want to link a human-curator profile using this bot, please click the <b>"Get Code"</b> button in the link human-curator section on the Sendly platform, or start the bot via the special link provided on the platform.`
            : userLang === "ru"
            ? `Здравствуйте! Добро пожаловать в бот Sendly.\n\nЕсли вы хотите подключить профиль человека-куратора через этот бот, пожалуйста, нажмите кнопку <b>"Получить код"</b> в разделе подключения человека-куратора на платформе Sendly или запустите бот по специальной ссылке, предоставленной на платформе.`
            : `Assalomu alaykum! Sendly botiga xush kelibsiz.\n\nUshbu bot orqali inson-kurator profilini ulamoqchi bo'lsangiz, iltimos Sendly platformasidagi inson-kuratorni ulash bo'limidagi <b>"Kodni olish"</b> tugmasini bosing yoki botni platformada taqdim etilgan maxsus havola orqali boshlang.`;
        await sendTelegramMessage(token, chatId, infoMsg, "HTML");
        return;
      }

      // 5-digit verification code like Telegram
      const verifyCode = Math.floor(10000 + Math.random() * 90000).toString();
      const userId = await getUserIdForChannel(targetChannelId);
      let matched = false;
      if (userId !== "guest") {
        matched = true;
        await updateUserDbFile(userId, async (userVal) => {
          const verifyData = {
            code: verifyCode,
            chatId: String(chatId),
            username: username || firstName || "Admin",
            timestamp: Date.now()
          };
          userVal[`replai_tg_verify_code_${targetChannelId}`] = JSON.stringify(verifyData);
        });
      }

      if (!matched) {
        const errorMsg =
          userLang === "en"
            ? `Sorry, this link has expired or is incorrect. To get the confirmation code, please click the <b>"Get Code"</b> button in the link human-curator section on the platform.`
            : userLang === "ru"
            ? `Извините, эта ссылка устарела или неверна. Чтобы получить код подтверждения, пожалуйста, нажмите кнопку <b>"Получить код"</b> в разделе подключения человека-куратора на платформе.`
            : `Kechirasiz, ushbu havola eskirgan yoki xato. Tasdiqlash kodini olish uchun iltimos platformadagi inson-kuratorni ulash bo'limidagi <b>"Kodni olish"</b> tugmasini bosing.`;
        await sendTelegramMessage(token, chatId, errorMsg, "HTML");
        return;
      }
      
      const messageText =
        userLang === "en"
          ? `Hello! Welcome to the Sendly bot.\n\nYour confirmation code is: <code>${verifyCode}</code>\n\nType this code into the connect admin modal on the Sendly platform (code is active for 1 minute).`
          : userLang === "ru"
          ? `Здравствуйте! Добро пожаловать в бот Sendly.\n\nВаш код подтверждения: <code>${verifyCode}</code>\n\nВведите этот код в окно подключения администратора на платформе Sendly (код активен в течение 1 минуты).`
          : `Assalomu alaykum! Sendly botiga xush kelibsiz.\n\nSizning tasdiqlash kodingiz: <code>${verifyCode}</code>\n\nUshbu kodni Sendly platformasidagi adminni ulash oynasiga kiriting (kod 1 daqiqa davomida faol bo'ladi).`;
      
      const copyBtnText = userLang === "en" ? "📋 Copy Code" : userLang === "ru" ? "📋 Копировать код" : "📋 Kodni nusxalash";
      const replyMarkup = {
        inline_keyboard: [[
          { text: copyBtnText, callback_data: "copy_code" }
        ]]
      };
      
      await sendTelegramMessage(token, chatId, messageText, "HTML", replyMarkup);
      return;
    }

    // Handle curator command /admin to link admin account (legacy fallback, only for non-system bots)
    if (channelId !== "system_bot" && (text.trim() === "/admin" || text.trim().startsWith("/admin "))) {
      let userEmail = "";
      const userId = await getUserIdForChannel(channelId);
      if (userId !== "guest") {
        const globalUsers = pgdb.isConfigured() ? await pgdb.getValue("global_users") : null;
        if (globalUsers && Array.isArray(globalUsers)) {
          const userObj = globalUsers.find((u: any) => u.id === userId);
          if (userObj) {
            userEmail = userObj.email;
          }
        }
        await updateUserDbFile(userId, async (userVal) => {
          const rawSettings = userVal[`replai_bot_settings_${channelId}`];
          const settings: BotSettings = safeParse(rawSettings, {
            tone: 60,
            length: 40,
            humor: 30,
            systemPrompt: "",
            topics: [],
            autoOutreach: true,
            outreachStart: "09:00",
            outreachEnd: "21:00",
            escalationRules: []
          });
          
          settings.adminTelegramChatId = String(chatId);
          settings.adminTelegramUsername = username || firstName || "Admin";
          userVal[`replai_bot_settings_${channelId}`] = JSON.stringify(settings);
        });
      }
      
      const accountInfo =
        userLang === "en"
          ? userEmail ? ` Account: ${userEmail}.` : ""
          : userLang === "ru"
          ? userEmail ? ` Аккаунт: ${userEmail}.` : ""
          : userEmail ? ` Akkaunt: ${userEmail}.` : "";

      const curatorSuccessMsg =
        userLang === "en"
          ? `Congratulations! You have been assigned as the curator (admin) for this bot.${accountInfo} If customers request a human support transfer, you will be notified.`
          : userLang === "ru"
          ? `Поздравляем! Вы были назначены куратором (админом) для этого бота.${accountInfo} Если клиенты попросят перенаправить диалог оператору, вам будет отправлено уведомление.`
          : `Tabriklaymiz! Siz ushbu bot uchun kurator (admin) qilib tayinlandingiz.${accountInfo} Mijozlar suhbatni operatorga yo'naltirishni so'rashsa, sizga xabar yuboriladi.`;

      await sendTelegramMessage(token, chatId, curatorSuccessMsg);
      return;
    }
    
    const userId = await getUserIdForChannel(channelId);
    await updateUserDbFile(userId, async (userVal, dbData) => {
      let context: Record<string, string> = userVal as unknown as Record<string, string>;

      // 1. Get chats key
      const chatsKey = `replai_chats_${channelId}`;
      const rawChats = context[chatsKey];
      const chatsList: ChatThread[] = safeParse(rawChats, []);
      
      // 2. Find or create chat
      let chat = chatsList.find((c: ChatThread) => c.id === String(chatId));
      if (!chat) {
        let avatarUrl = isGroup
          ? `https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=100&auto=format&fit=crop`
          : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop`;
        
        try {
          const fetchedAvatar = await getTelegramAvatarBase64(token, chatId, isGroup);
          if (fetchedAvatar) {
            avatarUrl = fetchedAvatar;
          }
        } catch (e) {
          console.error("Failed fetching telegram user avatar:", e);
        }

        chat = {
          id: String(chatId),
          name: chatName,
          username: username || (isGroup ? `group_${chatId}` : `tg_${chatId}`),
          avatar: avatarUrl,
          lastMessage: "",
          time: "",
          unread: true,
          messages: [],
          tags: isGroup ? ["Telegram", "Group"] : ["Telegram"],
          liveTakeover: false,
        };
        chatsList.push(chat);
      } else if (!chat.avatar || chat.avatar.startsWith("https://images.unsplash.com")) {
        try {
          const fetchedAvatar = await getTelegramAvatarBase64(token, chatId, isGroup);
          if (fetchedAvatar) {
            chat.avatar = fetchedAvatar;
          }
        } catch (e) {
          console.error("Failed updating telegram user avatar:", e);
        }
      }

      // Reset liveTakeover if user restarts the bot with /start or boshlash
      if (text.trim().toLowerCase() === "/start" || text.trim().toLowerCase().startsWith("/start ") || text.trim().toLowerCase() === "boshlash") {
        chat.liveTakeover = false;
      }
      
      // 3. Add incoming message
      const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
      const incomingMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: "user",
        text: text,
        timestamp: timestamp,
      };
      chat.messages.push(incomingMsg);
      chat.lastMessage = text;
      chat.time = "Hozir";
      chat.unread = true;
      
      // 4. Bot auto-reply if not liveTakeover and we should reply
      if (shouldReply) {
        if (!chat.liveTakeover) {
          // Load Settings
          const rawSettings = context[`replai_bot_settings_${channelId}`];
          const settings: BotSettings = safeParse(rawSettings, {
            tone: 60,
            length: 40,
            humor: 30,
            systemPrompt: "",
            topics: [],
            autoOutreach: true,
            outreachStart: "09:00",
            outreachEnd: "21:00",
            escalationRules: []
          });

          // 1. Moderate message
          const moderation = moderateMessage(text, settings.topics || []);
          let botReplyText = "";

          if (moderation.flagged) {
            botReplyText = moderation.warningMessage || "Iltimos, yozish qoidalariga rioya qiling.";
          } else {
            // 2. Check keyword automations
            const rawAutos = context[`replai_automations_${channelId}`];
            const automations: Automation[] = safeParse(rawAutos, []);
            let matchedAutomation: Automation | null = null;
            let matchedKeyword = "";
            
            // Find active automations
            const activeAutos = automations.filter((a: Automation) => a.active);
            for (const auto of activeAutos) {
              if (auto.triggerType === "keyword") {
                const keywords = auto.triggerDetails
                  .split(",")
                  .map((k: string) => k.trim().toLowerCase())
                  .filter(Boolean);
                const foundKeyword = keywords.find((kw: string) =>
                  text.toLowerCase().includes(kw)
                );
                if (foundKeyword) {
                  matchedAutomation = auto;
                  matchedKeyword = foundKeyword;
                  break;
                }
              }
            }
            
            if (matchedAutomation) {
               const runsVal = parseInt(matchedAutomation.runs || "0") + 1;
               matchedAutomation.runs = String(runsVal);
               
               const hash = matchedAutomation.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
               const rate = 65 + (hash % 25);
               const completedVal = Math.round(runsVal * (rate / 100));
               matchedAutomation.completion = runsVal > 0 ? `${Math.round((completedVal / runsVal) * 100)}%` : "0%";
               
               context[`replai_automations_${channelId}`] = JSON.stringify(automations);
              
               const nameLower = matchedAutomation.name.toLowerCase();
               if (matchedAutomation.replyText) {
                 botReplyText = matchedAutomation.replyText;
               } else if (nameLower.includes("lead magnet") || matchedKeyword === "kitob" || matchedKeyword === "bonus") {
                 botReplyText =
                   userLang === "en"
                     ? "Free guide link: https://sendly.uz/book. Thank you for your subscription!"
                     : userLang === "ru"
                     ? "Ссылка на бесплатное руководство: https://sendly.uz/book. Спасибо за вашу подписку!"
                     : "Bepul qo'llanma havolasi: https://sendly.uz/book. Obunangiz uchun rahmat!";
               } else if (matchedKeyword === "/start" || matchedKeyword === "boshlash") {
                 botReplyText =
                   userLang === "en"
                     ? "Hello! Welcome to the Sendly chatbot service. Our system is successfully connected."
                     : userLang === "ru"
                     ? "Здравствуйте! Добро пожаловать в сервис чат-ботов Sendly. Наша система успешно подключена."
                     : "Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan.";
               } else if (matchedKeyword === "narxi" || matchedKeyword === "tarif" || matchedKeyword === "kurs") {
                 botReplyText =
                   userLang === "en"
                      ? "Our pricing: \n• Pro: 150,000 UZS/month — 1 account, 1,000 credits\n• Premium: 300,000 UZS/month — 1 account, 30,000 credits\n• VIP: 1,200,000 UZS/month — 10 accounts, 150,000 credits\n\nOur operator will reply shortly with more details."
                      : userLang === "ru"
                      ? "Наши тарифы: \n• Pro: 150,000 сум/мес — 1 аккаунт, 1,000 кредитов\n• Premium: 300,000 сум/мес — 1 аккаунт, 30,000 кредитов\n• VIP: 1,200,000 сум/мес — 10 аккаунтов, 150,000 кредитов\n\nНаш оператор скоро свяжется с вами."
                      : "Bizning tariflarimiz: \n• Pro: 150,000 so'm/oy — 1ta akkaunt, 1,000 token\n• Premium: 300,000 so'm/oy — 1ta akkaunt, 30,000 token\n• VIP: 1,200,000 so'm/oy — 10ta akkaunt, 150,000 token\n\nBatafsil ma'lumot olish uchun operatorimiz tez orada javob yozadi.";
               } else {
                 botReplyText = matchedKeyword;
               }
            } else if (text.trim().toLowerCase() === "/start" || text.trim().toLowerCase().startsWith("/start ") || text.trim().toLowerCase() === "boshlash") {
              botReplyText =
                userLang === "en"
                  ? "Hello! Welcome to the Sendly chatbot service. Our system is successfully connected."
                  : userLang === "ru"
                  ? "Здравствуйте! Добро пожаловать в сервис чат-ботов Sendly. Наша система успешно подключена."
                  : "Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan.";
            } else if (settings.aiCuratorEnabled && settings.telegramBotId === channelId) {
               const rawLessons = context[`replai_lessons_${channelId}`];
               const lessons: Lesson[] = safeParse(rawLessons, []);
               const rawModules = context[`replai_modules_${channelId}`];
               const modules: Module[] = safeParse(rawModules, []);

              let credits = { balance: 100, used: 0, history: [] as any[] };
              if (context["replai_ai_credits_data"]) {
                credits = safeParse(context["replai_ai_credits_data"], { balance: 100, used: 0, history: [] });
              }

              if ((credits.balance || 0) < 5) {
                const errMsg =
                  userLang === "en"
                    ? "You do not have enough AI credits on your account. Please top up your AI credits balance in your replai.uz panel."
                    : userLang === "ru"
                    ? "На вашем балансе недостаточно AI кредитов. Пожалуйста, пополните баланс AI кредитов в личном кабинете replai.uz."
                    : "Hisobingizda AI kreditlar yetarli emas. Iltimos, replai.uz hisobingiz orqali AI kreditlarni to'ldiring.";

                if (settings.adminTelegramChatId) {
                  let channelUsername = "";
                  if (dbData.userData && typeof dbData.userData === "object") {
                    for (const userVal of Object.values(dbData.userData)) {
                      if (userVal && typeof userVal === "object") {
                        const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                        const userChannels: Channel[] = safeParse(rawUserChannels, []);
                        const ch = userChannels.find(c => c.id === channelId);
                        if (ch) {
                          channelUsername = ch.username;
                          break;
                        }
                      }
                    }
                  }
                  if (!channelUsername) {
                    const rawChannels = dbData["replai_channels"];
                    const legacyChannels: Channel[] = safeParse(rawChannels, []);
                    const ch = legacyChannels.find(c => c.id === channelId);
                    if (ch) {
                      channelUsername = ch.username;
                    }
                  }

                  const sysToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                  const notifyToken = sysToken || token;
                  const channelInfoStr = channelUsername ? ` (@${channelUsername.replace(/^@+/, "")})` : "";
                  
                  const adminNotification = `⚠️ [Sendly AI Balans]${channelInfoStr}:\n\n${errMsg}`;
                  sendTelegramMessage(notifyToken, settings.adminTelegramChatId, adminNotification)
                    .catch(err => console.error("Failed to notify admin on Telegram about low credits:", err));
                }

                botReplyText = "";
              } else {
                const studentName = chat.name || "Talaba";
                const chatHistory = chat.messages
                  .filter(m => m.text)
                  .map(m => ({
                    role: m.sender === "user" ? ("user" as const) : ("model" as const),
                    parts: [{ text: m.text }]
                  }));

                try {
                  const ragResult = await queryRAG(
                    text,
                    studentName,
                    lessons,
                    modules,
                    settings,
                    chatHistory
                  );

                  // Check escalation rules
                  let shouldEscalate = false;
                  
                  const explicitHumanRequest = ["operator", "inson", "admin", "aloqa", "bog'lanish", "boglanish", "odam"].some(kw => 
                    text.toLowerCase().includes(kw)
                  );
                  if (explicitHumanRequest) {
                    shouldEscalate = true;
                  }

                  if (!shouldEscalate && ragResult.intent !== "general") {
                    for (const rule of settings.escalationRules || []) {
                      if (!rule.enabled) continue;

                      if (rule.text.includes("60% dan past") && ragResult.confidence < 60) {
                        shouldEscalate = true;
                        break;
                      }

                      if (rule.text.includes("shikoyat") && ragResult.sentiment === "negative") {
                        shouldEscalate = true;
                        break;
                      }

                      if (rule.text.includes("To'lov") && (ragResult.intent === "billing" || ragResult.intent === "affiliate")) {
                        shouldEscalate = true;
                        break;
                      }

                      if (rule.text.includes("3 marta ketma-ket") && (
                        text.toLowerCase().includes("tushunmadim") || 
                        text.toLowerCase().includes("operator") || 
                        text.toLowerCase().includes("inson") || 
                        text.toLowerCase().includes("odam")
                      )) {
                        shouldEscalate = true;
                        break;
                      }
                    }
                  }

                  if (shouldEscalate) {
                    chat.liveTakeover = true;
                    botReplyText =
                      userLang === "en"
                        ? "Sorry, to provide an accurate answer to this question, I have transferred this conversation to a human curator. You will receive a response shortly."
                        : userLang === "ru"
                        ? "Извините, для точного ответа на этот вопрос я перенаправил этот чат человеку-куратору. Вам скоро ответят."
                        : "Kechirasiz, ushbu savolga to'g'ri va aniq javob berish uchun suhbatni inson-kuratorga yo'naltirdim. Tez orada sizga javob yozishadi.";
                    
                    if (settings.adminTelegramChatId) {
                      let channelUsername = "";
                      if (dbData.userData && typeof dbData.userData === "object") {
                        for (const userVal of Object.values(dbData.userData)) {
                          if (userVal && typeof userVal === "object") {
                            const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                            const userChannels: Channel[] = safeParse(rawUserChannels, []);
                            const ch = userChannels.find(c => c.id === channelId);
                            if (ch) {
                              channelUsername = ch.username;
                              break;
                            }
                          }
                        }
                      }
                      if (!channelUsername) {
                        const rawChannels = dbData["replai_channels"];
                        const legacyChannels: Channel[] = safeParse(rawChannels, []);
                        const ch = legacyChannels.find(c => c.id === channelId);
                        if (ch) {
                          channelUsername = ch.username;
                        }
                      }

                      const sysToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                      const notifyToken = sysToken || token;
                      const channelInfoStr = channelUsername ? ` (@${channelUsername.replace(/^@+/, "")})` : "";
                      
                      const noUsernameStr = userLang === "en" ? "no_username" : userLang === "ru" ? "нет_юзернейма" : "username_yoq";
                      const newNotificationText =
                        userLang === "en"
                          ? `New ticket (Operator requested)${channelInfoStr}:\n\nUser: ${chat.name} (@${chat.username || noUsernameStr})\nQuestion: ${text}\n\nPlease visit the Sendly inbox to reply to this user.`
                          : userLang === "ru"
                          ? `Новое обращение (Ожидание оператора)${channelInfoStr}:\n\nПользователь: ${chat.name} (@${chat.username || noUsernameStr})\nВопрос: ${text}\n\nПожалуйста, перейдите в раздел Входящие в Sendly, чтобы ответить пользователю.`
                          : `Yangi murojaat (Operator kutilmoqda)${channelInfoStr}:\n\nFoydalanuvchi: ${chat.name} (@${chat.username || noUsernameStr})\nSavol: ${text}\n\nUshbu foydalanuvchiga javob berish uchun Sendly inbox bo'limiga kiring.`;

                      sendTelegramMessage(
                        notifyToken,
                        settings.adminTelegramChatId,
                        newNotificationText
                      ).catch(err => console.error("Failed to notify admin on Telegram:", err));
                    }
                  } else {
                    botReplyText = ragResult.text;
                  }

                  // Determine if we should charge credits (Free for general talk, moderation warnings, and curator escalations)
                  const isFreeOfCharge = shouldEscalate || moderation.flagged || ragResult.isGeneralTalk === true || !botReplyText;
                  const cost = isFreeOfCharge ? 0 : Math.min(100, 5 + Math.ceil(botReplyText.length / 10));

                  if (cost > 0) {
                    credits.balance = Math.max(0, credits.balance - cost);
                    credits.used = (credits.used || 0) + cost;
                    
                    const usageDesc =
                      userLang === "en"
                        ? `AI Curator response (${botReplyText.length} chars)`
                        : userLang === "ru"
                        ? `Ответ AI куратора (${botReplyText.length} симв.)`
                        : `AI Curator javobi (${botReplyText.length} belgi)`;

                    credits.history.unshift({
                      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                      type: "usage",
                      amount: cost,
                      description: usageDesc,
                      date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })
                    });
                    context["replai_ai_credits_data"] = JSON.stringify(credits);
                  }

                  // 3.5. CustDev analysis for curator messages
                  try {
                    const detectedIntent = ragResult.intent || classifyIntentForCustDev(text);
                    const sentiment = ragResult.sentiment || detectSentiment(text);
                    const painPoint = ragResult.painPoint || extractPainPoint(text, detectedIntent, userLang, settings.aiAgentType);
                    
                    const now = new Date();
                    const dateStr = now.getFullYear() + "-" + 
                      String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                      String(now.getDate()).padStart(2, '0') + " " + 
                      String(now.getHours()).padStart(2, '0') + ":" + 
                      String(now.getMinutes()).padStart(2, '0') + ":" + 
                      String(now.getSeconds()).padStart(2, '0');

                    const newAnalyzedMsg = {
                      id: `cur-msg-${Date.now()}`,
                      username: username || `tg_${chatId}`,
                      message: text,
                      response: botReplyText,
                      intent: detectedIntent,
                      sentiment: sentiment,
                      confidence: ragResult.confidence || 75,
                      date: dateStr,
                      painPoint: painPoint
                    };

                    let analyzedList = [];
                    if (context["replai_curator_analyzed_messages"]) {
                      try {
                        analyzedList = JSON.parse(context["replai_curator_analyzed_messages"]);
                        if (!Array.isArray(analyzedList)) {
                          analyzedList = [];
                        }
                      } catch (e) {
                        analyzedList = [];
                      }
                    }
                    analyzedList.unshift(newAnalyzedMsg);
                    context["replai_curator_analyzed_messages"] = JSON.stringify(analyzedList);
                  } catch (analysisErr) {
                    console.error("CustDev analysis failed in bot runner:", analysisErr);
                  }

                } catch (ragError) {
                  console.error("RAG logic error in bot runner:", ragError);
                  botReplyText = "Murojaatingiz uchun rahmat! Tizimda kichik uzilish yuz berdi. Tez orada operatorimiz sizga bog'lanadi.";
                }
              }
            }
          }
          
          if (botReplyText) {
            const userPlan = await getUserPlan(userId);
            if (userPlan === "free") {
              botReplyText = botReplyText + "\n\nPowered by sendly.uz";
            }
            await sendTelegramMessage(token, chatId, botReplyText);
            
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: "bot",
              text: botReplyText,
              timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            };
            chat.messages.push(botMsg);
            chat.lastMessage = botReplyText;
          }
        } else {
          // Chat is in liveTakeover mode. Warn the user once so they know how to resume AI.
          const lastTwo = chat.messages.slice(-2);
          const wasJustEscalated = lastTwo.length === 2 && lastTwo[0].sender === "user" && lastTwo[1].sender === "bot" && (lastTwo[1].text.includes("inson-kurator") || lastTwo[1].text.includes("человеку-куратору") || lastTwo[1].text.includes("human curator"));
          
          if (!wasJustEscalated && text.trim().toLowerCase() !== "/start" && text.trim().toLowerCase() !== "boshlash") {
            const reminderMsg =
              userLang === "en"
                ? "This conversation is currently transferred to an operator. To resume talking to the AI assistant, please write /start."
                : userLang === "ru"
                ? "Этот чат переведен на оператора. Чтобы возобновить общение с ИИ-помощником, напишите /start."
                : "Suhbat operatorga yo'naltirilgan. AI yordamchi bilan gaplashishni davom ettirish uchun /start deb yozing.";
            
            await sendTelegramMessage(token, chatId, reminderMsg);
            
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: "bot",
              text: reminderMsg,
              timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            };
            chat.messages.push(botMsg);
            chat.lastMessage = reminderMsg;
          }
        }
      }
      
      // 5. Update CRM Contacts list with parsed lead information (phone, email, company name)
      const contactsKey = "replai_contacts";
      const rawContacts = context[contactsKey];
      let contactsList: any[] = safeParse(rawContacts, []);
      if (!Array.isArray(contactsList)) {
        contactsList = [];
      }

      // Check if contact already exists strictly by chat_id (c.id) to prevent duplicate contacts
      let contactObj = contactsList.find((c: any) => String(c.id) === String(chatId));

      // Attempt to extract phone number from text
      let extractedPhone = "";
      const phoneMatch = text.match(/(?:\+?998|8)\s?\(?\d{2}\)?\s?\d{3}\s?\d{2}\s?\d{2}/) || text.match(/\+?\d{9,15}/);
      if (phoneMatch) {
        extractedPhone = phoneMatch[0].replace(/\s+/g, "");
      }

      // Attempt to extract email
      let extractedEmail = "";
      const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (emailMatch) {
        extractedEmail = emailMatch[0];
      }

      // Attempt to extract company/business name
      let extractedCompany = "";
      const companyPatterns = [
        /(?:kompaniyam|firmam|biznesim|tashkilotim|do'konim|dokonim)\s+(?:nomi\s+)?(?:yo'q\s+emas\s+)?(["']?[A-Za-z0-9\sа-яА-ЯёЁўЎқҚғҒҳҲ\-]{2,30}["']?)/i,
        /kompaniya:\s*(["']?[A-Za-z0-9\sа-яА-ЯёЁўЎқҚғҒҳҲ\-]{2,30}["']?)/i,
        /(?:kompaniya|firma|mchj|ooo)\s+(["']?[A-Za-z0-9\sа-яА-ЯёЁўЎқҚғҒҳҲ\-]{2,30}["']?)/i
      ];
      for (const pattern of companyPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          extractedCompany = match[1].replace(/["']/g, "").trim();
          break;
        }
      }

      const cleanName = chatName;

      if (!contactObj) {
        contactObj = {
          id: String(chatId),
          name: cleanName,
          username: username || (isGroup ? `group_${chatId}` : `tg_${chatId}`),
          status: true,
          messagesCount: 1,
          tags: isGroup ? ["Telegram", "Group"] : ["Telegram"],
          lastActive: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
          phone: extractedPhone,
          email: extractedEmail,
          companyName: extractedCompany,
          lastMessage: text
        };
        contactsList.unshift(contactObj);
      } else {
        contactObj.name = cleanName;
        if (username) contactObj.username = username;
        contactObj.messagesCount = (contactObj.messagesCount || 0) + 1;
        contactObj.lastActive = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
        contactObj.lastMessage = text;
        if (extractedPhone) contactObj.phone = extractedPhone;
        if (extractedEmail) contactObj.email = extractedEmail;
        if (extractedCompany) contactObj.companyName = extractedCompany;
        
        // Add interest tags based on suhbat keywords
        if (text.toLowerCase().includes("narxi") || text.toLowerCase().includes("to'lov")) {
          if (!contactObj.tags.includes("Tarifga qiziqqan")) {
            contactObj.tags.push("Tarifga qiziqqan");
          }
        }
        if (text.toLowerCase().includes("muammo") || text.toLowerCase().includes("ishlamayapti")) {
          if (!contactObj.tags.includes("Texnik yordam")) {
            contactObj.tags.push("Texnik yordam");
          }
        }
      }

      context[contactsKey] = JSON.stringify(contactsList);
      context[chatsKey] = JSON.stringify(chatsList);
    });
  } catch (err) {
    console.error(`Error handling Telegram update for ${channelId}:`, err);
  }
}

const lastOutreachChecks: Record<string, number> = {};

async function checkAndRunAutoOutreach(channelId: string, token: string) {
  try {
    const userId = await getUserIdForChannel(channelId);
    if (userId === "guest") return;
    await updateUserDbFile(userId, async (userVal, dbData) => {
      let context: Record<string, string> = userVal as unknown as Record<string, string>;

      // Check if bot settings enable autoOutreach
      const rawSettings = context[`replai_bot_settings_${channelId}`];
      if (!rawSettings) return;
      const settings: BotSettings = safeParse(rawSettings, null);
      if (!settings || !settings.autoOutreach) return;

      // Check active hours
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeVal = currentHour * 60 + currentMinute;

      const [startHour, startMin] = (settings.outreachStart || "09:00").split(":").map(Number);
      const [endHour, endMin] = (settings.outreachEnd || "21:00").split(":").map(Number);
      const startTimeVal = startHour * 60 + startMin;
      const endTimeVal = endHour * 60 + endMin;

      if (currentTimeVal < startTimeVal || currentTimeVal > endTimeVal) {
        return; // Outside outreach hours
      }

      // Load chats
      const chatsKey = `replai_chats_${channelId}`;
      const rawChats = context[chatsKey];
      if (!rawChats) return;
      const chatsList: ChatThread[] = safeParse(rawChats, []);

      let credits = { balance: 100, used: 0, history: [] as any[] };
      if (context["replai_ai_credits_data"]) {
        credits = safeParse(context["replai_ai_credits_data"], { balance: 100, used: 0, history: [] });
      }

      const lessons: Lesson[] = safeParse(context[`replai_lessons_${channelId}`], []);
      const modules: Module[] = safeParse(context[`replai_modules_${channelId}`], []);

      let hasUpdates = false;

      for (const chat of chatsList) {
        if (chat.liveTakeover) continue; // Skip if operator is talking

        const lastMsg = chat.messages[chat.messages.length - 1];
        if (!lastMsg) continue;

        // Skip if the last message was already an auto outreach follow-up
        if (lastMsg.sender === "bot" && lastMsg.text.includes("[Follow-up]")) continue;

        // Determine inactivity duration.
        // We look for chats that have been inactive for more than 24 hours.
        let timestampMs = 0;
        if (lastMsg.id.startsWith("msg-")) {
          const parts = lastMsg.id.split("-");
          timestampMs = parseInt(parts[1]);
        }
        if (!timestampMs || isNaN(timestampMs)) continue;

        const elapsedHours = (Date.now() - timestampMs) / (1000 * 60 * 60);
        if (elapsedHours < 24) continue; 

        // Verify credit balance
        if ((credits.balance || 0) < 5) continue;

        // Build follow-up query to Gemini RAG
        const chatHistory = chat.messages
          .filter(m => m.text)
          .map(m => ({
            role: m.sender === "user" ? ("user" as const) : ("model" as const),
            parts: [{ text: m.text }]
          }));

        // We ask Gemini to write a follow up
        try {
          const followUpPrompt = "Mijoz suhbatni to'xtatdi. Dars materiallariga asoslanib, uning savoli yoki qiziqishi qolgan-qolmaganini so'rab muloyim va juda qisqa eslatma yozing (1-2 gap).";
          
          const ragResult = await queryRAG(
            followUpPrompt,
            chat.name || "Talaba",
            lessons,
            modules,
            settings,
            chatHistory
          );

          if (ragResult && ragResult.text) {
            let outreachText = ragResult.text;
            const userPlan = await getUserPlan(userId);
            if (userPlan === "free") {
              outreachText = outreachText + "\n\nPowered by sendly.uz";
            }
            
            // Send the message on Telegram
            await sendTelegramMessage(token, chat.id, outreachText);

            // Record message in history
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: "bot",
              text: `${outreachText} \n\n[Follow-up]`,
              timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            };
            chat.messages.push(botMsg);
            chat.lastMessage = outreachText;
            chat.unread = true;
            chat.time = "Hozir";

            // Deduct credits (skip if it contains system / operator text)
            const isFree = outreachText.includes("inson-kurator") || outreachText.includes("operator");
            const cost = isFree ? 0 : Math.min(100, 5 + Math.ceil(outreachText.length / 10));
            
            if (cost > 0) {
              credits.balance = Math.max(0, credits.balance - cost);
              credits.used = (credits.used || 0) + cost;
              credits.history.unshift({
                id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: "usage",
                amount: cost,
                description: `AI Curator avtomatik eslatma (Follow-up)`,
                date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })
              });
            }

            hasUpdates = true;
          }
        } catch (err) {
          console.error(`Failed to generate outreach for chat ${chat.id}:`, err);
        }
      }

      if (hasUpdates) {
        context[chatsKey] = JSON.stringify(chatsList);
        context["replai_ai_credits_data"] = JSON.stringify(credits);
      }
    });
  } catch (err) {
    console.error("Error in checkAndRunAutoOutreach:", err);
  }
}

async function runBotPollLoop(channelId: string, botState: TelegramBotState) {
  console.log(`Starting poll loop for bot channel ${channelId}`);
  
  try {
    const deleteWebhookUrl = `https://api.telegram.org/bot${botState.token}/deleteWebhook`;
    await fetch(deleteWebhookUrl, { cache: "no-store" });
    console.log(`Deleted webhook successfully for bot channel ${channelId}`);
  } catch (err) {
    console.error(`Error deleting webhook for bot channel ${channelId}:`, err);
  }

  const globalBots = (global as unknown as { telegramBots?: Record<string, TelegramBotState> }).telegramBots || {};

  while (botState.active) {
    // Check if this is still the active instance registered in globalBots
    if (globalBots[channelId] && globalBots[channelId].instanceId !== botState.instanceId) {
      console.log(`Stopping poll loop for channel ${channelId} because a newer instance is running.`);
      botState.active = false;
      break;
    }
    try {
      const url = `https://api.telegram.org/bot${botState.token}/getUpdates?offset=${botState.offset}&timeout=10`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error(`Telegram API HTTP error for bot ${channelId}: ${res.status}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      const data = await res.json();
      if (!data.ok) {
        console.error(`Telegram API error response for bot ${channelId}:`, data);
        if (data.error_code === 401 || data.description?.includes("unauthorized")) {
          console.error(`Stopping invalid token bot loop for ${channelId}`);
          botState.active = false;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        continue;
      }
      
      const updates = data.result || [];
      for (const update of updates) {
        botState.offset = Math.max(botState.offset, update.update_id + 1);
        await handleTelegramUpdate(channelId, botState.token, update);
      }

      // Periodically check and run auto outreach (every 5 minutes)
      const now = Date.now();
      const lastCheck = lastOutreachChecks[channelId] || 0;
      if (now - lastCheck > 5 * 60 * 1000) {
        lastOutreachChecks[channelId] = now;
        checkAndRunAutoOutreach(channelId, botState.token).catch((err) =>
          console.error("Auto outreach check failed:", err)
        );
      }
    } catch (err) {
      console.error(`Error in bot poll loop for ${channelId}:`, err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log(`Exited poll loop for bot channel ${channelId}`);
}

export async function startTelegramBots() {
  try {
    let dbData: any = {};
    if (pgdb.isConfigured()) {
      dbData = await getDbDataFromRailway();
    } else {
      if (!fs.existsSync(DB_FILE)) {
        return { success: true, message: "No db.json yet." };
      }
      dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
    
    const activeTelegramChannels: Channel[] = [];
    
    const rawChannels = dbData["replai_channels"];
    const legacyChannels: Channel[] = safeParse(rawChannels, []);
    legacyChannels.forEach((c: Channel) => {
      if (c.type === "telegram" && c.isConnected && c.telegramToken) {
        activeTelegramChannels.push(c);
      }
    });

    if (dbData.userData && typeof dbData.userData === "object") {
      Object.values(dbData.userData).forEach((userVal: unknown) => {
        if (userVal && typeof userVal === "object") {
          const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
          const userChannels: Channel[] = safeParse(rawUserChannels, []);
          userChannels.forEach((c: Channel) => {
            if (c.type === "telegram" && c.isConnected && c.telegramToken) {
              if (!activeTelegramChannels.some(ac => ac.id === c.id)) {
                activeTelegramChannels.push(c);
              }
            }
          });
        }
      });
    }

    // Push system bot if token is configured
    const systemBotToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (systemBotToken && systemBotToken !== "mock_telegram_token") {
      activeTelegramChannels.push({
        id: "system_bot",
        type: "telegram",
        name: "Sendly System Bot",
        username: "sendly_robot",
        isActive: true,
        isConnected: true,
        telegramToken: systemBotToken,
        createdAt: new Date().toISOString()
      });
    }
    
    const globalRef = global as unknown as {
      telegramBots?: Record<string, TelegramBotState>;
      registeredWebhooks?: Record<string, string>;
    };
    const globalBots = globalRef.telegramBots || {};
    globalRef.telegramBots = globalBots;
    if (!globalRef.registeredWebhooks) {
      globalRef.registeredWebhooks = {};
    }
    
    const activeIds = new Set<string>();
    const activeTokens = new Set<string>();
    const useWebhooks = !!process.env.RAILWAY_PUBLIC_DOMAIN;
    const host = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "";
    
    for (const channel of activeTelegramChannels) {
      if (channel.telegramToken) {
        activeIds.add(channel.id);
        activeTokens.add(channel.telegramToken.trim());
      }
    }

    // Clean up webhooks for tokens that are no longer active
    for (const token in globalRef.registeredWebhooks) {
      if (!activeTokens.has(token)) {
        console.log(`[Webhooks] Channel removed or disconnected. Deleting Telegram webhook for token ...${token.slice(-6)}`);
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { cache: "no-store" });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[Webhooks] Failed to delete Telegram webhook: ${res.status} - ${errText}`);
          } else {
            console.log(`[Webhooks] Telegram webhook deleted successfully.`);
            delete globalRef.registeredWebhooks[token];
          }
        } catch (e) {
          console.error(`[Webhooks] Error deleting Telegram webhook:`, e);
        }
      }
    }

    for (const channel of activeTelegramChannels) {
      const channelId = channel.id;
      if (!channel.telegramToken) continue;
      const token = channel.telegramToken.trim();
      
      if (useWebhooks) {
        // Production: Register Webhooks with Telegram Bot API
        const webhookUrl = `${host}/api/telegram/webhook?channelId=${channelId}`;
        
        if (globalRef.registeredWebhooks[token] === webhookUrl) {
          console.log(`[Webhooks] Telegram webhook already registered for bot ${channelId} (${channel.username || "System"}), skipping duplicate registration.`);
          continue;
        }

        const secretToken = crypto.createHash("sha256").update(token).digest("hex").substring(0, 32);
        console.log(`[Webhooks] Registering Telegram webhook for bot ${channelId} (${channel.username}) -> ${webhookUrl}`);
        
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}&drop_pending_updates=true`, { cache: "no-store" });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[Webhooks] Failed to set Telegram webhook for bot ${channelId}: ${res.status} - ${errText}`);
          } else {
            console.log(`[Webhooks] Telegram webhook registered successfully for bot ${channelId}`);
            globalRef.registeredWebhooks[token] = webhookUrl;
          }
        } catch (e) {
          console.error(`[Webhooks] Error setting Telegram webhook for bot ${channelId}:`, e);
        }
        
        // Stop polling loop if it was active
        const existing = globalBots[channelId];
        if (existing) {
          existing.active = false;
          if (existing.token) {
            try {
              await fetch(`https://api.telegram.org/bot${existing.token}/deleteWebhook`, { cache: "no-store" });
            } catch (err) {
              console.error(`Error deleting webhook:`, err);
            }
          }
          delete globalBots[channelId];
        }
      } else {
        // Local: Fallback to getUpdates polling loop
        // Check atomic polling by token to avoid duplicates
        let existing = Object.values(globalBots).find(b => b.token === token);
        if (existing) {
          if (existing.active) {
            console.log(`[Duplicate Polling] Bot for token ...${token.slice(-6)} is already running, skipping start.`);
            globalBots[channelId] = existing;
            continue;
          } else {
            existing.active = false;
          }
        }

        const existingByChannel = globalBots[channelId];
        if (existingByChannel) {
          if (existingByChannel.token !== token) {
            console.log(`Stopping bot for channel ${channelId} due to token change`);
            existingByChannel.active = false;
            if (existingByChannel.token) {
              try {
                await fetch(`https://api.telegram.org/bot${existingByChannel.token}/deleteWebhook`, { cache: "no-store" });
              } catch (err) {
                console.error(`Error deleting webhook during token change:`, err);
              }
            }
          }
          delete globalBots[channelId];
        }
        
        console.log(`Starting background bot runner (polling) for channel ${channelId} (${channel.username || "System Bot"})`);
        const botState: TelegramBotState = {
          active: true,
          token: token,
          offset: 0,
          instanceId: crypto.randomUUID(),
        };
        globalBots[channelId] = botState;
        
        runBotPollLoop(channelId, botState);
      }
    }
    
    // Stop any bots that are no longer in the active list
    for (const channelId in globalBots) {
      if (!activeIds.has(channelId)) {
        console.log(`Stopping bot for channel ${channelId} (removed or disconnected)`);
        const existing = globalBots[channelId];
        if (existing) {
          existing.active = false;
          if (existing.token) {
            try {
              console.log(`[Polling Cleanup] Deleting webhook for disconnected/removed channel ${channelId}`);
              await fetch(`https://api.telegram.org/bot${existing.token}/deleteWebhook`, { cache: "no-store" });
            } catch (err) {
              console.error(`Error deleting webhook for ${channelId} during cleanup:`, err);
            }
          }
        }
        delete globalBots[channelId];
      }
    }
    
    return {
      success: true,
      activeBots: Object.keys(globalBots),
      webhookMode: useWebhooks
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error starting bots:", error);
    return { success: false, error: errMsg };
  }
}

function classifyIntentForCustDev(text: string): string {
  const msg = text.toLowerCase();
  if (
    msg.includes("pul") ||
    msg.includes("narx") ||
    msg.includes("to'lov") ||
    msg.includes("dollar") ||
    msg.includes("click") ||
    msg.includes("payme") ||
    msg.includes("karta") ||
    msg.includes("obuna") ||
    msg.includes("tarif") ||
    msg.includes("price") ||
    msg.includes("billing") ||
    msg.includes("pay") ||
    msg.includes("payment") ||
    msg.includes("cost") ||
    msg.includes("money") ||
    msg.includes("card") ||
    msg.includes("subscription") ||
    msg.includes("tariff") ||
    msg.includes("цена") ||
    msg.includes("оплата") ||
    msg.includes("платить") ||
    msg.includes("деньги") ||
    msg.includes("карта") ||
    msg.includes("подписка") ||
    msg.includes("тариф") ||
    msg.includes("платеж") ||
    msg.includes("стоимость")
  ) {
    return "billing";
  }
  if (
    msg.includes("bot") ||
    msg.includes("telegram") ||
    msg.includes("kanal") ||
    msg.includes("token") ||
    msg.includes("ulash") ||
    msg.includes("xatolik") ||
    msg.includes("muammo") ||
    msg.includes("ishlamayapti") ||
    msg.includes("channel") ||
    msg.includes("connect") ||
    msg.includes("error") ||
    msg.includes("issue") ||
    msg.includes("bug") ||
    msg.includes("problem") ||
    msg.includes("broken") ||
    msg.includes("not working") ||
    msg.includes("телеграм") ||
    msg.includes("канал") ||
    msg.includes("токен") ||
    msg.includes("подключить") ||
    msg.includes("ошибка") ||
    msg.includes("проблема") ||
    msg.includes("баг") ||
    msg.includes("не работает") ||
    msg.includes("сбой")
  ) {
    return "support";
  }
  if (
    msg.includes("dars") ||
    msg.includes("modul") ||
    msg.includes("kirish") ||
    msg.includes("o'qish") ||
    msg.includes("kurs") ||
    msg.includes("dastur") ||
    msg.includes("lesson") ||
    msg.includes("module") ||
    msg.includes("access") ||
    msg.includes("study") ||
    msg.includes("course") ||
    msg.includes("program") ||
    msg.includes("learn") ||
    msg.includes("classes") ||
    msg.includes("login") ||
    msg.includes("урок") ||
    msg.includes("модуль") ||
    msg.includes("доступ") ||
    msg.includes("учеба") ||
    msg.includes("курс") ||
    msg.includes("программа") ||
    msg.includes("учиться") ||
    msg.includes("войти")
  ) {
    return "faq";
  }
  if (
    msg.includes("hamkor") ||
    msg.includes("referal") ||
    msg.includes("pul ishlash") ||
    msg.includes("komissiya") ||
    msg.includes("partner") ||
    msg.includes("affiliate") ||
    msg.includes("referral") ||
    msg.includes("earn") ||
    msg.includes("commission") ||
    msg.includes("invite") ||
    msg.includes("партнер") ||
    msg.includes("реферал") ||
    msg.includes("заработать") ||
    msg.includes("заработок") ||
    msg.includes("комиссия") ||
    msg.includes("пригласить")
  ) {
    return "affiliate";
  }
  return "general";
}

function detectSentiment(text: string): "positive" | "neutral" | "negative" {
  const msg = text.toLowerCase();
  if (
    msg.includes("yaxshi") ||
    msg.includes("zo'r") ||
    msg.includes("rahmat") ||
    msg.includes("ajoyib") ||
    msg.includes("muvaffaqiyat") ||
    msg.includes("😊") ||
    msg.includes("👍") ||
    msg.includes("good") ||
    msg.includes("great") ||
    msg.includes("thanks") ||
    msg.includes("thank you") ||
    msg.includes("awesome") ||
    msg.includes("cool") ||
    msg.includes("success") ||
    msg.includes("perfect") ||
    msg.includes("nice") ||
    msg.includes("хорошо") ||
    msg.includes("отлично") ||
    msg.includes("спасибо") ||
    msg.includes("супер") ||
    msg.includes("круто") ||
    msg.includes("успех") ||
    msg.includes("прекрасно") ||
    msg.includes("классно")
  ) {
    return "positive";
  }
  if (
    msg.includes("xatolik") ||
    msg.includes("ishlamadi") ||
    msg.includes("muammo") ||
    msg.includes("afsus") ||
    msg.includes("yomon") ||
    msg.includes("tushunmadim") ||
    msg.includes("qiyin") ||
    msg.includes("😡") ||
    msg.includes("👎") ||
    msg.includes("error") ||
    msg.includes("broken") ||
    msg.includes("problem") ||
    msg.includes("unfortunately") ||
    msg.includes("bad") ||
    msg.includes("didn't understand") ||
    msg.includes("hard") ||
    msg.includes("difficult") ||
    msg.includes("failure") ||
    msg.includes("ошибка") ||
    msg.includes("сломалось") ||
    msg.includes("проблема") ||
    msg.includes("к сожалению") ||
    msg.includes("плохо") ||
    msg.includes("не понял") ||
    msg.includes("сложно") ||
    msg.includes("трудно") ||
    msg.includes("фигня")
  ) {
    return "negative";
  }
  return "neutral";
}

function extractPainPoint(text: string, intent: string, lang: string, agentType?: string): string {
  const isSales = agentType === "sales";

  const uzPainPoints: Record<string, string> = {
    billing: isSales ? "Mahsulot narxi, to'lov shartlari yoki chegirmalarni bilish istagi" : "Kurs to'lovi, chegirma yoki narxlar bo'yicha ma'lumot olish istagi",
    support: isSales ? "Mahsulot/xizmat bo'yicha yordam yoki qo'llab-quvvatlash ehtiyoji" : "Botga ulanish, token olish yoki platformadagi texnik to'siqlar",
    faq: isSales ? "Mahsulot/xizmat tarkibi yoki kafolati bo'yicha batafsil ma'lumot izlash" : "Darslik materiallari yoki darslar mazmuni bo'yicha ma'lumot qidirish",
    affiliate: isSales ? "Hamkorlik shartlari yoki ulush olish masalasini aniqlashtirish" : "Hamkorlik komissiyalari va referal tizim shartlarini aniqlashtirish",
    default: isSales ? "Mahsulot haqida qo'shimcha umumiy ma'lumot olish istagi" : "Kurs yoki darslar haqida qo'shimcha umumiy ma'lumot olish istagi"
  };

  const ruPainPoints: Record<string, string> = {
    billing: isSales ? "Желание узнать цену товара, условия оплаты или скидки" : "Желание узнать о стоимости курса, скидках или тарифах",
    support: isSales ? "Необходимость в помощи или поддержке по продукту/услуге" : "Проблемы с подключением бота, получением токена или технические преграды",
    faq: isSales ? "Поиск подробной информации о составе товара или гарантии" : "Поиск информации по учебным материалам или содержанию уроков",
    affiliate: isSales ? "Уточнение условий партнерства или получения доли" : "Уточнение партнерских комиссионных и условий реферальной системы",
    default: isSales ? "Желание получить дополнительную общую информацию о продукте" : "Желание получить дополнительную общую информацию о курсе"
  };

  const enPainPoints: Record<string, string> = {
    billing: isSales ? "Desire to know the product price, payment terms, or discounts" : "Desire to get information about course fees, discounts, or pricing",
    support: isSales ? "Need for assistance or support regarding the product/service" : "Issues with connecting the bot, getting a token, or technical barriers",
    faq: isSales ? "Searching for detailed information about product content or warranty" : "Searching for information in course materials or lesson content",
    affiliate: isSales ? "Clarifying partnership terms or commission share issues" : "Clarifying affiliate commissions and referral system terms",
    default: isSales ? "Desire to get additional general information about the product" : "Desire to get additional general information about the course"
  };

  const map = lang === "ru" ? ruPainPoints : lang === "en" ? enPainPoints : uzPainPoints;
  return map[intent] || map["default"];
}
