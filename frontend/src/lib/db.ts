"use client";

// Types
export type User = {
  id?: string;
  email: string;
  fullName: string;
  password?: string;
  isCardLinked?: boolean;
  cardNumber?: string;
  trialExpiresAt?: string;
  plan?: "free" | "pro" | "premium";
};

export type Automation = {
  id: string;
  name: string;
  triggerType: "keyword" | "story";
  triggerDetails: string;
  runs: string;
  completion: string;
  active: boolean;
  groupId?: string;
  channelId?: string;
};

export type Group = {
  id: string;
  name: string;
};

export type Contact = {
  id: string;
  name: string;
  username: string;
  status: boolean;
  messagesCount: number;
  tags: string[];
  lastActive: string;
};

export type Broadcast = {
  id: string;
  name: string;
  segment: string;
  sentCount: string;
  date: string;
  status: "Completed" | "Pending";
};

export type Channel = {
  id: string;
  type: "instagram" | "telegram";
  name: string;
  username: string;
  avatar?: string;
  isActive: boolean;
  isConnected: boolean;
  telegramToken?: string;
  followersCount?: string;
  createdAt: string;
};

export type BotSettings = {
  id?: string;
  tone: number;
  length: number;
  humor: number;
  systemPrompt: string;
  topics: string[];
  autoOutreach: boolean;
  outreachStart: string;
  outreachEnd: string;
  escalationRules: Array<{ id: string; text: string; enabled: boolean }>;
  aiCuratorEnabled?: boolean;
  fbFormId?: string;
  targetGroupId?: string;
  fbAgentPrompt?: string;
  fbWelcomeMessage?: string;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  transcript: string;
  pdfMaterials?: string[];
};

export type Module = {
  id: string;
  title: string;
  order: number;
};

// Initial Demo Data
const DEMO_CHANNELS: Channel[] = [
  {
    id: "ch_demo_ig",
    type: "instagram",
    name: "My Brand Shop",
    username: "@mybrand_shop",
    isConnected: true,
    followersCount: "4,820",
    createdAt: "20 May, 2026",
    isActive: true
  },
  {
    id: "ch_demo_tg",
    type: "telegram",
    name: "Support Bot",
    username: "@mybrand_support_bot",
    isConnected: true,
    followersCount: "1,240",
    createdAt: "20 May, 2026",
    isActive: false
  }
];

const DEMO_CONTACTS: Contact[] = [
  { id: "1", name: "Aziz Rahimov", username: "@aziz_rahim", status: true, messagesCount: 24, tags: ["Lead", "Qiziqqan"], lastActive: "Bugun, 14:20" },
  { id: "2", name: "Madina Umarova", username: "@madina_u", status: true, messagesCount: 118, tags: ["Mijoz", "Vip"], lastActive: "Bugun, 11:05" },
  { id: "3", name: "Sardor Salimov", username: "@sardor_s", status: false, messagesCount: 8, tags: ["Lead"], lastActive: "Kecha, 22:40" },
  { id: "4", name: "Dilorom Alieva", username: "@dili_alieva", status: true, messagesCount: 42, tags: ["Mijoz"], lastActive: "19 May, 15:30" },
  { id: "5", name: "Farruh Karimov", username: "@farruh_k", status: false, messagesCount: 15, tags: ["Qiziqqan"], lastActive: "18 May, 09:15" },
];

const DEMO_BROADCASTS: Broadcast[] = [
  { id: "1", name: "Yangi fasl chegirmalari", segment: "Barcha faol mijozlar", sentCount: "2,418", date: "Bugun, 12:00", status: "Completed" },
  { id: "2", name: "Vip mijozlar uchun bonus", segment: "VIP foydalanuvchilar", sentCount: "480", date: "Bugun, 09:15", status: "Completed" },
  { id: "3", name: "Qiziqqanlarga eslatma", segment: "Qiziqqan (Leads)", sentCount: "928", date: "Ertaga, 10:00", status: "Pending" },
  { id: "4", name: "Tizimli yangiliklar", segment: "Barcha obunachilar", sentCount: "3,892", date: "15 May, 14:00", status: "Completed" },
];

const DEFAULT_BOT_SETTINGS: BotSettings = {
  tone: 60,
  length: 40,
  humor: 30,
  systemPrompt: `# ROL VA IDENTIFIKATSIYA
Sen marketing kursi o'quvchilariga yordam beruvchi "Mently" nomli shaxsiy AI kuratorsan. Xaraktering: samimiy, do'stona, qisqa va aniq gapiradigan, ortiqcha rasmiyatchilikdan xoli.

# ASOSIY VAZIFA
O'quvchilarning savollariga faqat va faqat quyida taqdim etilgan darslik/kurs materiallari (KURS MATERIALLARI) asosida tushunarli, qisqa va tabiiy javob berish.

# KURS MATERIALLARI:
{{context}}

# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR
1. Cheklangan Ma'lumot: Faqat berilgan KURS MATERIALLARI ichidagi ma'lumotlardan foydalan. Kurs materialida yo'q bo'lgan ma'lumotlarni o'zingdan to'qib chiqarma!
2. Noma'lum Savollar: Agar savolning javobi darslik materiallarida mavjud bo'lmasa, muloyimlik bilan mana shu javobni ber:
   "Afsuski, ushbu savolga darslik materiallarida javob topilmadi. Sizga to'g'ri yo'nalish berish va yordam berish uchun ushbu savolni inson-kuratorga yo'naltirdim. Tez orada javob berishadi. 😊"
3. Taqiqlangan Mavzular: Siyosat, din, raqobatchi kurslar yoki marketingga aloqasi bo'lmagan mavzular haqida gapirma. Agar bunday savol berilsa, muloyimlik bilan rad et:
   "Men faqat ushbu marketing kursi bo'yicha savollarga javob bera olaman. Keling, darsimizga qaytamiz! 📚"
4. Til qoidasi: O'quvchi qaysi tilda va yozuvda yozgan bo'lsa (Lotin yoki Kirill o'zbek yozuvi, Rus tili yoki Ingliz tili), o'sha yozuv va tilda tabiiy javob ber.

# JAVOB FORMATI VA STILI
- Tabiiylik va Qisqalik: Javoblaring juda qisqa, aniq va londa bo'lsin (ko'pi bilan 2-3 ta gap). Ortiqcha uzun gaplar, kirish so'zlar yoki sun'iy gaplardan qoch. Oddiy suhbatdoshdek tabiiy gapir.
- Soddalik: Murakkab marketing atamalarini sodda, kundalik tilda tushuntir.
- Manba ko'rsatmaslik: JAVOBINGGA HECH QANDAY MANBA YOKI SHUNGA O'XSHASH MA'LUMOTLARNI QO'SHMA (Masalan: "Manba: 1-Modul..." kabi yozuvlar umuman bo'lmasligi shart).
- Emojilar: Faqat o'rinli va me'yorida, minimal foydalan (ko'pi bilan 1-2 ta emoji).`,
  topics: ["Siyosat", "Din", "Raqobatchilar"],
  autoOutreach: true,
  outreachStart: "09:00",
  outreachEnd: "21:00",
  escalationRules: [
    { id: "esc-1", text: "Ishonch darajasi 60% dan past bo'lganda", enabled: true },
    { id: "esc-2", text: "O'quvchi shikoyat qilganda", enabled: true },
    { id: "esc-3", text: "To'lov yoki sertifikat haqida savol bo'lganda", enabled: true },
    { id: "esc-4", text: "3 marta ketma-ket javob qoniqarsiz bo'lganda", enabled: true },
  ],
  aiCuratorEnabled: false,
  fbFormId: "form-1",
  targetGroupId: "sales",
  fbAgentPrompt: `# ROL VA IDENTIFIKATSIYA
Sen Facebook target reklamasidan kelgan lid (mijoz) so'rovlarini tahlil qiluvchi aqlli saralash agentisan.

# VAZIFA
Kelgan lid ma'lumotlarini (ism, telefon, foydalanuvchi yozgan savollar yoki javoblar) tahlil qilib, quyidagi qoidalar asosida guruhlash:
1. Agar mijoz narx, chegirma, to'lov yoki sotib olish haqida so'ragan bo'lsa, uni "Sotuvlar" (sales) guruhiga yo'naltir va "High Intent" yoki "Narxga Qiziqqan" tagini qo'sh.
2. Agar mijoz texnik yordam, kursga kirish yoki boshqa texnik savollar bergan bo'lsa, uni "Qo'llab-quvvatlash" (support) guruhiga yo'naltir va "Support" tagini qo'sh.
3. Mijozning savolidan kelib chiqib, 2-3 so'zdan iborat AI izoh (qualification summary) yoz.`,
  fbWelcomeMessage: "Salom {{name}}! So'rovingiz qabul qilindi. Tez orada mutaxassisimiz sizga bog'lanadi. 😊",
};

const DEMO_MODULES: Module[] = [
  { id: "mod-1", title: "1-Modul. Asoslar va Kirish", order: 1 },
  { id: "mod-2", title: "2-Modul. Target marketing", order: 2 },
  { id: "mod-3", title: "3-Modul. Kontent va SMM", order: 3 },
  { id: "mod-4", title: "4-Modul. Reklama va Tahlil", order: 4 },
];

const DEMO_LESSONS: Lesson[] = [
  {
    id: "les-1",
    moduleId: "mod-1",
    title: "1-Dars. Marketing nima?",
    transcript: "Marketing — bu mahsulot yoki xizmatni maqsadli mijozlarga yetkazish jarayoni. Marketingning asosiy maqsadi mijozlarning muammolarini aniqlash va ularga yechim taklif qilishdir. Marketing 4P tushunchasiga asoslanadi: Mahsulot (Product), Narx (Price), Joy (Place) va Targ'ibot (Promotion). Yaxshi marketing strategiyasi uchun avvalo bozorni o'rganish, raqobatchilarni tahlil qilish va maqsadli auditoriyani aniqlash kerak. Marketing sotuvdan farq qiladi — marketing uzoq muddatli munosabat qurishga qaratilgan, sotuv esa bir martalik tranzaksiya. Hozirgi kunda digital marketing, ijtimoiy tarmoqlar marketing va kontent marketing kabi yangi yo'nalishlar rivojlanmoqda. Har qanday biznes uchun marketing rejasi tuzish muhim — bu reja maqsadlar, vositalar va byudjetni o'z ichiga olishi kerak.",
    pdfMaterials: ["qollanma-marketing-asoslari.pdf"]
  },
  {
    id: "les-2",
    moduleId: "mod-1",
    title: "2-Dars. Biznes maqsadlar va KPI",
    transcript: "KPI (Key Performance Indicators) — bu biznes maqsadlarini o'lchash uchun ishlatiladigan asosiy ko'rsatkichlar. Marketing uchun eng muhim KPIlar: konversiya darajasi (conversion rate), mijoz jalb qilish narxi (CAC — Customer Acquisition Cost), mijozning umr bo'yi qiymati (LTV — Lifetime Value), brend tanilishi va savdo hajmi. Maqsad qo'yishda SMART tizimidan foydalaning: Specific (aniq), Measurable (o'lchanadigan), Achievable (erishish mumkin), Relevant (tegishli), Time-bound (muddatli). Masalan, 'oyiga 100 ta yangi mijoz jalb qilish' — bu SMART maqsad. KPIlarni har hafta kuzatib boring va natijalar asosida strategiyangizni moslang.",
    pdfMaterials: ["kpi-jadval.pdf"]
  },
  {
    id: "les-3",
    moduleId: "mod-2",
    title: "1-Dars. Mijozlar segmentatsiyasi",
    transcript: "Mijozlar segmentatsiyasi — bu yirik bozorni o'xshash xususiyatlarga ega kichik guruhlarga ajratish jarayoni. Segmentatsiya 4 turga bo'linadi: 1) Demografik: yosh, jins, daromad, ta'lim; 2) Geografik: shahar, hudud, mamlakat; 3) Psixografik: qiziqishlar, hayot tarzi, qadriyatlar; 4) Xulq-atvor: sotib olish odatlari, brendga sadoqat. Maqsadli segment tanlashda 3 omilni hisobga oling: segmentning kattaligi, ularga yetib borish imkoniyati va ularning daromad keltirish salohiyati. Persona yaratish — bu maqsadli mijozingizning batafsil portretini chizish. Masalan: '28 yoshli, Toshkentda yashovchi, onlayn biznes ochmoqchi bo'lgan ayol' — bu aniq persona.",
    pdfMaterials: ["segmentatsiya-jadvali.pdf"]
  },
  {
    id: "les-4",
    moduleId: "mod-2",
    title: "2-Dars. Target reklama asoslari",
    transcript: "Target reklama — bu aniq maqsadli auditoriyaga yo'naltirilgan reklama. Facebook va Instagram'da target reklamani Meta Ads Manager orqali boshqarasiz. Asosiy targeting turlar: demografik (yosh, jins, joylashuv), qiziqishlar bo'yicha (interest targeting), xulq-atvor bo'yicha (behavior targeting), lookalike audience (o'xshash auditoriya) va retargeting (qayta nishonlash). Reklama byudjetini CPC (click uchun narx) va CPM (1000 ta ko'rsatuv uchun narx) ko'rsatkichlari orqali boshqaring. A/B test qiling — bir vaqtda bir nechta reklama varianti ishlab, eng samaralisini aniqlang. Retargeting orqali saytingizga kirgan lekin sotib olmagan foydalanuvchilarni qayta nishonlang.",
    pdfMaterials: ["target-reklama-qollanma.pdf"]
  },
  {
    id: "les-5",
    moduleId: "mod-3",
    title: "1-Dars. SMM strategiya tuzish",
    transcript: "SMM (Social Media Marketing) — ijtimoiy tarmoqlarda marketing. SMM strategiyasi quyidagilarni o'z ichiga oladi: platforma tanlash (Instagram, Telegram, YouTube, TikTok), kontent kalendar tuzish, auditoriya bilan muloqot va analitika. Instagram'da biznes akkauntini to'g'ri sozlash: profil rasmi, bio, kontakt ma'lumotlar va havolalar. Kontent turlari: ta'lim beruvchi postlar (80%), reklama postlar (20%) — bu 80/20 qoidasi. Stories, Reels va IGTV dan samarali foydalaning. Hashtag strategiyasi: katta (#marketing), o'rta (#uzbekmarketing) va kichik (#toshkentmarketing) hashtaglar aralashmasidan foydalaning. Eng faol vaqt — odatda kechki 7-9 soatlar.",
    pdfMaterials: ["smm-shablon.xlsx"]
  },
  {
    id: "les-6",
    moduleId: "mod-3",
    title: "2-Dars. Kontent yaratish siri",
    transcript: "Kontent marketing — bu foydali ma'lumot berish orqali mijozlarni jalb qilish. Yaxshi kontent 3 shartga javob beradi: auditoriya uchun foydali, brendga mos va SEO uchun optimallashtirilgan. Kontent turlari: blog maqolalar, video darslar, infografika, podcast, case study va testimoniallar. Kontent ideya topish uchun: mijozlar savollari, raqobatchilar tahlili va trend mavzular. Viral kontent yaratish uchun: his-tuyg'ularni qo'zg'atish, amaliy foydali bo'lish yoki e'tiborni tortuvchi zamonaviy mavzularni tanlash. Kontent kalendarida haftalik rejani tuzib oling: dushanba — ta'lim, chorshanba — case study, juma — motivatsiya. Har bir kontent uchun CTA (Call To Action) qo'shing.",
    pdfMaterials: ["kontent-plan-shablon.pdf"]
  },
  {
    id: "les-7",
    moduleId: "mod-4",
    title: "1-Dars. Reklama byudjetini boshqarish",
    transcript: "Reklama byudjetini to'g'ri taqsimlash biznesingiz muvaffaqiyatiga to'g'ridan-to'g'ri ta'sir qiladi. ROAS (Return on Ad Spend) — reklama sarfidan daromad ko'rsatkichi, kamida 3x bo'lishi kerak. Byudjet taqsimlash: 50% test reklamalar, 30% muvaffaqiyatli reklamalarni kengaytirish, 20% yangi eksperimentlar. Facebook Ads uchun minimal kunlik byudjet $5-10 dan boshlang. Google Ads uchun keyword bidding strategiyasini tanlang: manual CPC, target CPA yoki ROAS maqsadli. Reklama samaradorligini o'lchash uchun UTM parametrlar va Google Analytics dan foydalaning. Har hafta reklama hisobotini ko'rib chiqing va past samarali reklamalarni o'chiring.",
    pdfMaterials: ["byudjet-hisobot.xlsx"]
  },
  {
    id: "les-8",
    moduleId: "mod-4",
    title: "2-Dars. Analitika va o'sish",
    transcript: "Marketing analitikasi — bu ma'lumotlar asosida qaror qabul qilish. Google Analytics, Meta Business Suite va Telegram Analytics kabi vositalar orqali o'z natijalaringizni kuzating. Muhim ko'rsatkichlar: trafik manbalari, bounce rate (sahifani tark etish darajasi), o'rtacha sessiya davomiyligi va konversiya yo'llari. Funnel (voronka) tahlili: Awareness (xabardorlik) → Interest (qiziqish) → Decision (qaror) → Action (harakat). Har bir bosqichda qancha odam tushibdi — shu asosda zaif joylarni toping. Growth hacking — bu tezkor o'sish uchun ijodiy eksperimentlar. Referral marketing (tavsiya marketing) eng arzon va samarali usullardan biri. A/B test orqali landing page, email sarlavha va CTA larni doimiy yaxshilab boring.",
    pdfMaterials: ["analitika-dashboard.pdf"]
  }
];

// Helper wrapper for SSR check
const isClient = typeof window !== "undefined";

const notifyUpdate = () => {
  if (isClient) {
    window.dispatchEvent(new Event("replai-db-update"));
    // Auto-save database state to the server asynchronously
    setTimeout(() => {
      if (typeof db !== "undefined" && db.saveToServer) {
        db.saveToServer();
      }
    }, 50);
  }
};

// Safe JSON parser helper to prevent runtime crashes from null/corrupted storage values
function safeParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback)) {
      if (!Array.isArray(parsed)) {
        return fallback;
      }
      return parsed.filter((item: unknown) => item !== null && item !== undefined) as unknown as T;
    }
    if (fallback !== null && typeof fallback === "object") {
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        return fallback;
      }
    }
    return parsed as T;
  } catch (e) {
    console.error("Failed to parse JSON", jsonString, e);
    return fallback;
  }
}

// DB version — bump this to force-clear old localStorage data
const DB_VERSION = "v7"; // Bump to clear potentially corrupted states
if (isClient && localStorage.getItem("replai_db_version") !== DB_VERSION) {
  localStorage.removeItem("replai_automations");
  localStorage.removeItem("replai_contacts");
  localStorage.removeItem("replai_broadcasts");
  localStorage.removeItem("replai_channels");
  localStorage.removeItem("replai_active_channel");
  localStorage.removeItem("replai_modules");
  localStorage.removeItem("replai_lessons");
  localStorage.removeItem("replai_bot_settings");
  localStorage.setItem("replai_db_version", DB_VERSION);
}

export const db = {
  // 1. Auth Database
  getUsers(): User[] {
    if (!isClient) return [];
    const parsed = safeParse(localStorage.getItem("replai_users"), []);
    return Array.isArray(parsed) ? parsed.filter((u: unknown): u is User => !!u && typeof u === "object" && typeof (u as Record<string, unknown>).email === "string") : [];
  },

  getCurrentUser(): User | null {
    if (!isClient) return null;
    const parsed = safeParse<User | null>(localStorage.getItem("replai_current_user"), null);
    if (parsed && typeof parsed === "object" && typeof parsed.email === "string") {
      if (!parsed.id) {
        parsed.id = parsed.email === "admin@sendly.uz"
          ? "11111111-1111-4111-8111-111111111111"
          : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "22222222-2222-4222-8222-222222222222");
        localStorage.setItem("replai_current_user", JSON.stringify(parsed));
      }
      return parsed;
    }
    return null;
  },

  signUp(fullName: string, email: string, password: string): { success: boolean; error?: string } {
    if (!isClient) return { success: false };
    const users = this.getUsers();
    if (users.some((u) => u.email === email)) {
      return { success: false, error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan." };
    }
    const newUser: User = { 
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "33333333-3333-4333-8333-333333333333",
      email, 
      fullName, 
      password,
      isCardLinked: false 
    };
    users.push(newUser);
    localStorage.setItem("replai_users", JSON.stringify(users));
    localStorage.setItem("replai_current_user", JSON.stringify(newUser));
    notifyUpdate();
    return { success: true };
  },

  signIn(email: string, password: string): { success: boolean; error?: string } {
    if (!isClient) return { success: false };
    
    // Auto-create admin account for easy testing
    if (email === "admin@sendly.uz" && password === "123456") {
      const users = this.getUsers();
      let user = users.find((u) => u.email === email);
      if (!user) {
        user = { 
          id: "11111111-1111-4111-8111-111111111111",
          email, 
          fullName: "Admin Foydalanuvchi", 
          password,
          isCardLinked: true,
          cardNumber: "Visa, *1402",
          plan: "premium"
        };
        users.push(user);
        localStorage.setItem("replai_users", JSON.stringify(users));
      } else {
        if (!user.id) {
          user.id = "11111111-1111-4111-8111-111111111111";
        }
        if (!user.plan) {
          user.plan = "premium";
          user.isCardLinked = true;
          user.cardNumber = "Visa, *1402";
          const idx = users.findIndex((u) => u.email === email);
          if (idx > -1) {
            users[idx] = user;
            localStorage.setItem("replai_users", JSON.stringify(users));
          }
        }
      }
      localStorage.setItem("replai_current_user", JSON.stringify(user));
      notifyUpdate();
      return { success: true };
    }

    const users = this.getUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      return { success: false, error: "Email yoki parol noto'g'ri." };
    }
    if (!user.id) {
      user.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "44444444-4444-4444-8444-444444444444";
      const idx = users.findIndex((u) => u.email === email);
      if (idx > -1) {
        users[idx] = user;
        localStorage.setItem("replai_users", JSON.stringify(users));
      }
    }
    localStorage.setItem("replai_current_user", JSON.stringify(user));
    notifyUpdate();
    return { success: true };
  },

  signOut(): void {
    if (!isClient) return;
    localStorage.removeItem("replai_current_user");
    notifyUpdate();
  },

  // Credit Card Linking & PRO trial activation
  linkCard(cardNumber: string, expiry: string, cvc: string): { success: boolean; error?: string } {
    if (!isClient) return { success: false };
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, error: "Tizimga kirilmagan." };

    const rawNumber = cardNumber.replace(/\s/g, "");
    const isUzCard = rawNumber.startsWith("8600") || rawNumber.startsWith("5614");
    const isHumo = rawNumber.startsWith("9860");
    const isUzCardOrHumo = isUzCard || isHumo;

    if (cardNumber.replace(/\s/g, "").length < 16) {
      return { success: false, error: "Karta raqami noto'g'ri yoki to'liq emas." };
    }

    if (isUzCardOrHumo) {
      if (expiry.length < 5 || cvc.length < 4) {
        return { success: false, error: "Karta muddati yoki SMS tasdiqlash kodi noto'g'ri kiritilgan." };
      }
    } else {
      if (expiry.length < 5 || cvc.length < 3) {
        return { success: false, error: "Karta muddati yoki CVC/CVV kodi noto'g'ri kiritilgan." };
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    currentUser.isCardLinked = true;
    currentUser.plan = "pro";
    const typeLabel = isUzCard ? "UzCard" : isHumo ? "Humo" : "Karta";
    currentUser.cardNumber = `${typeLabel} **** ${rawNumber.substring(rawNumber.length - 4)}`;
    currentUser.trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Update in users array
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email === currentUser.email);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...currentUser };
      localStorage.setItem("replai_users", JSON.stringify(users));
    }

    localStorage.setItem("replai_current_user", JSON.stringify(currentUser));
    notifyUpdate();
    return { success: true };
  },

  unlinkCard(): void {
    if (!isClient) return;
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    currentUser.isCardLinked = false;
    currentUser.plan = "free";
    delete currentUser.cardNumber;
    delete currentUser.trialExpiresAt;

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email === currentUser.email);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...currentUser };
      localStorage.setItem("replai_users", JSON.stringify(users));
    }

    localStorage.setItem("replai_current_user", JSON.stringify(currentUser));
    notifyUpdate();
  },

  updatePlan(planName: "free" | "pro" | "premium"): void {
    if (!isClient) return;
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    currentUser.plan = planName;
    if (planName === "free") {
      currentUser.isCardLinked = false;
      delete currentUser.cardNumber;
      delete currentUser.trialExpiresAt;
    } else {
      currentUser.isCardLinked = true;
      if (!currentUser.cardNumber) {
        currentUser.cardNumber = "Visa, *1402";
      }
      if (!currentUser.trialExpiresAt) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        currentUser.trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email === currentUser.email);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...currentUser };
      localStorage.setItem("replai_users", JSON.stringify(users));
    }

    localStorage.setItem("replai_current_user", JSON.stringify(currentUser));
    notifyUpdate();
  },

  // 2. Automations Database
  getAutomations(): Automation[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_automations");
    if (!stored) {
      localStorage.setItem("replai_automations", JSON.stringify([]));
      return [];
    }
    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((a: unknown): a is Automation => !!a && typeof a === "object" && typeof (a as Record<string, unknown>).id === "string") : [];
  },

  saveAutomations(list: Automation[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_automations", JSON.stringify(list));
    notifyUpdate();
  },

  // 3. Contacts Database
  getContacts(): Contact[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_contacts");
    if (!stored) {
      localStorage.setItem("replai_contacts", JSON.stringify(DEMO_CONTACTS));
      return DEMO_CONTACTS;
    }
    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((c: unknown): c is Contact => !!c && typeof c === "object" && typeof (c as Record<string, unknown>).id === "string") : [];
  },

  saveContacts(list: Contact[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_contacts", JSON.stringify(list));
    notifyUpdate();
  },

  // 4. Broadcasts Database
  getBroadcasts(): Broadcast[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_broadcasts");
    if (!stored) {
      localStorage.setItem("replai_broadcasts", JSON.stringify(DEMO_BROADCASTS));
      return DEMO_BROADCASTS;
    }
    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((b: unknown): b is Broadcast => !!b && typeof b === "object" && typeof (b as Record<string, unknown>).id === "string") : [];
  },

  saveBroadcasts(list: Broadcast[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_broadcasts", JSON.stringify(list));
    notifyUpdate();
  },

  // 5. Global Reset / Clear all demo data
  clearAllData(): void {
    if (!isClient) return;
    localStorage.setItem("replai_automations", JSON.stringify([]));
    localStorage.setItem("replai_contacts", JSON.stringify([]));
    localStorage.setItem("replai_broadcasts", JSON.stringify([]));
    localStorage.setItem("replai_channels", JSON.stringify([]));
    localStorage.setItem("replai_groups", JSON.stringify([]));
    localStorage.removeItem("replai_active_channel");
    localStorage.setItem("replai_modules", JSON.stringify([]));
    localStorage.setItem("replai_lessons", JSON.stringify([]));
    localStorage.removeItem("replai_bot_settings");
    
    // Also remove all per-channel automations
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("replai_automations_")) {
        localStorage.removeItem(key);
      }
    });
    notifyUpdate();
  },

  // Reset to Demo Data
  resetToDemo(): void {
    if (!isClient) return;
    localStorage.setItem("replai_channels", JSON.stringify(DEMO_CHANNELS));
    localStorage.setItem("replai_active_channel", "ch_demo_ig");
    localStorage.setItem("replai_contacts", JSON.stringify(DEMO_CONTACTS));
    localStorage.setItem("replai_broadcasts", JSON.stringify(DEMO_BROADCASTS));
    localStorage.setItem("replai_modules", JSON.stringify(DEMO_MODULES));
    localStorage.setItem("replai_lessons", JSON.stringify(DEMO_LESSONS));
    localStorage.setItem("replai_bot_settings", JSON.stringify(DEFAULT_BOT_SETTINGS));
    
    const demoIGAutomations: Automation[] = [
      { id: "1", name: "Lead Magnet (Bepul qo'llanma)", triggerType: "keyword", triggerDetails: "kitob, kurs, bonus", runs: "148", completion: "92%", active: true },
      { id: "2", name: "Stories-da belgilaganda kupon", triggerType: "story", triggerDetails: "Story mentions", runs: "42", completion: "88%", active: true },
    ];
    const demoTGAutomations: Automation[] = [
      { id: "1", name: "Kutib olish va Tezkor FAQ", triggerType: "keyword", triggerDetails: "/start, boshlash", runs: "320", completion: "95%", active: true },
    ];
    localStorage.setItem("replai_automations_ch_demo_ig", JSON.stringify(demoIGAutomations));
    localStorage.setItem("replai_automations_ch_demo_tg", JSON.stringify(demoTGAutomations));
    notifyUpdate();
  },

  // 6. Channels Database
  getChannels(): Channel[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_channels");
    if (!stored) {
      localStorage.setItem("replai_channels", JSON.stringify(DEMO_CHANNELS));
      return DEMO_CHANNELS;
    }
    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((c: unknown): c is Channel => !!c && typeof c === "object" && typeof (c as Record<string, unknown>).id === "string") : [];
  },

  saveChannels(list: Channel[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_channels", JSON.stringify(list));
    notifyUpdate();
  },

  addChannel(channel: Omit<Channel, "id" | "createdAt" | "isActive">): Channel {
    const channels = this.getChannels();
    const newChannel: Channel = {
      ...channel,
      id: `ch_${Date.now()}`,
      createdAt: new Date().toLocaleDateString("uz-UZ"),
      isActive: channels.length === 0, // first channel becomes active
    };
    channels.push(newChannel);
    this.saveChannels(channels);
    if (newChannel.isActive) {
      localStorage.setItem("replai_active_channel", newChannel.id);
    }
    notifyUpdate();
    return newChannel;
  },

  removeChannel(id: string): void {
    if (!isClient) return;
    const channels = this.getChannels().filter((c) => c.id !== id);
    
    // if removed was active, activate first remaining or remove active key if empty
    const activeId = localStorage.getItem("replai_active_channel");
    if (activeId === id) {
      if (channels.length > 0) {
        channels[0].isActive = true;
        localStorage.setItem("replai_active_channel", channels[0].id);
      } else {
        localStorage.removeItem("replai_active_channel");
      }
    }
    this.saveChannels(channels);
    // remove per-channel automations
    localStorage.removeItem(`replai_automations_${id}`);
    notifyUpdate();
  },

  getActiveChannel(): Channel | null {
    if (!isClient) return null;
    const channels = this.getChannels();
    if (channels.length === 0) return null;
    const activeId = localStorage.getItem("replai_active_channel");
    return channels.find((c) => c && c.id === activeId) ?? channels[0] ?? null;
  },

  setActiveChannel(id: string): void {
    if (!isClient) return;
    localStorage.setItem("replai_active_channel", id);
    notifyUpdate();
  },

  // Per-channel automations
  getChannelAutomations(channelId: string): Automation[] {
    if (!isClient) return [];
    const stored = localStorage.getItem(`replai_automations_${channelId}`);
    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((a: unknown): a is Automation => !!a && typeof a === "object" && typeof (a as Record<string, unknown>).id === "string").map((a: Automation) => ({ ...a, channelId })) : [];
  },

  saveChannelAutomations(channelId: string, list: Automation[]): void {
    if (!isClient) return;
    localStorage.setItem(`replai_automations_${channelId}`, JSON.stringify(list));
    notifyUpdate();
  },

  // Groups Database
  getGroups(): Group[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_groups");
    if (!stored) {
      const defaultGroups = [
        { id: "sales", name: "Sotuvlar" },
        { id: "support", name: "Qo'llab-quvvatlash" },
      ];
      localStorage.setItem("replai_groups", JSON.stringify(defaultGroups));
      return defaultGroups;
    }
    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((g: unknown): g is Group => !!g && typeof g === "object" && typeof (g as Record<string, unknown>).id === "string") : [];
  },

  saveGroups(list: Group[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_groups", JSON.stringify(list));
    notifyUpdate();
  },

  addGroup(name: string): Group {
    const groups = this.getGroups();
    const newGroup = {
      id: `gr_${Date.now()}`,
      name,
    };
    groups.push(newGroup);
    this.saveGroups(groups);
    return newGroup;
  },

  deleteGroup(id: string): void {
    const groups = this.getGroups().filter(g => g.id !== id);
    this.saveGroups(groups);
  },

  // 7. Bot Settings Database
  getBotSettings(): BotSettings {
    if (!isClient) return DEFAULT_BOT_SETTINGS;
    const stored = localStorage.getItem("replai_bot_settings");
    if (!stored) {
      localStorage.setItem("replai_bot_settings", JSON.stringify(DEFAULT_BOT_SETTINGS));
      return DEFAULT_BOT_SETTINGS;
    }
    return safeParse<BotSettings>(stored, DEFAULT_BOT_SETTINGS);
  },

  saveBotSettings(settings: BotSettings): void {
    if (!isClient) return;
    localStorage.setItem("replai_bot_settings", JSON.stringify(settings));
    notifyUpdate();
  },

  // 8. Modules Database
  getModules(): Module[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_modules");
    if (!stored) {
      localStorage.setItem("replai_modules", JSON.stringify(DEMO_MODULES));
      return DEMO_MODULES;
    }
    return safeParse<Module[]>(stored, DEMO_MODULES);
  },

  saveModules(list: Module[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_modules", JSON.stringify(list));
    notifyUpdate();
  },

  addModule(title: string): Module {
    const modules = this.getModules();
    const newModule: Module = {
      id: `mod-${Date.now()}`,
      title,
      order: modules.length + 1
    };
    modules.push(newModule);
    this.saveModules(modules);
    return newModule;
  },

  deleteModule(id: string): void {
    const modules = this.getModules().filter(m => m.id !== id);
    this.saveModules(modules);
    // Also delete associated lessons
    const lessons = this.getLessons().filter(l => l.moduleId !== id);
    this.saveLessons(lessons);
    notifyUpdate();
  },

  // 9. Lessons Database
  getLessons(): Lesson[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_lessons");
    if (!stored) {
      localStorage.setItem("replai_lessons", JSON.stringify(DEMO_LESSONS));
      return DEMO_LESSONS;
    }
    return safeParse<Lesson[]>(stored, DEMO_LESSONS);
  },

  saveLessons(list: Lesson[]): void {
    if (!isClient) return;
    localStorage.setItem("replai_lessons", JSON.stringify(list));
    notifyUpdate();
  },

  addLesson(moduleId: string, title: string, transcript: string): Lesson {
    const lessons = this.getLessons();
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      moduleId,
      title,
      transcript,
      pdfMaterials: []
    };
    lessons.push(newLesson);
    this.saveLessons(lessons);
    return newLesson;
  },

  deleteLesson(id: string): void {
    const lessons = this.getLessons().filter(l => l.id !== id);
    this.saveLessons(lessons);
  },

  getAllAutomations(): (Automation & { channel?: Channel })[] {
    if (!isClient) return [];
    const channels = this.getChannels();
    const all: (Automation & { channel?: Channel })[] = [];
    channels.forEach(ch => {
      const autos = this.getChannelAutomations(ch.id);
      autos.forEach(a => {
        all.push({
          ...a,
          channelId: ch.id,
          channel: ch
        });
      });
    });
    return all;
  },

  exportData(): Record<string, string> {
    if (!isClient) return {};
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("replai_")) {
        data[key] = localStorage.getItem(key) || "";
      }
    }
    return data;
  },

  importData(data: Record<string, string>): boolean {
    if (!isClient) return false;
    try {
      const keys = Object.keys(data);
      const hasReplaiKeys = keys.some(k => k.startsWith("replai_"));
      if (!hasReplaiKeys) return false;

      // Clear existing replai_ keys first
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("replai_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Set new keys
      Object.entries(data).forEach(([key, val]) => {
        if (key.startsWith("replai_")) {
          localStorage.setItem(key, val);
        }
      });

      notifyUpdate();
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  },

  async fetchFromServer(): Promise<boolean> {
    if (!isClient) return false;
    try {
      const res = await fetch("/api/db");
      if (!res.ok) return false;
      const data = await res.json();
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([key, val]) => {
          if (key.startsWith("replai_")) {
            localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
          }
        });
        window.dispatchEvent(new Event("replai-db-update"));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to fetch database from server", e);
      return false;
    }
  },

  async saveToServer(): Promise<boolean> {
    if (!isClient) return false;
    try {
      const data = this.exportData();
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return false;
      
      // Ping background telegram runner to refresh/start bots
      fetch("/api/telegram/start");
      return true;
    } catch (e) {
      console.error("Failed to save database to server", e);
      return false;
    }
  },
};
