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
  replyText?: string;
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
  fbAgentEnabled?: boolean;
  adminTelegramChatId?: string;
  adminTelegramUsername?: string;
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

// Initial Data (empty)
const INITIAL_CHANNELS: Channel[] = [];
const INITIAL_CONTACTS: Contact[] = [];
const INITIAL_BROADCASTS: Broadcast[] = [];

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
Sen Facebook target reklamasidan kelgan ariza (mijoz) so'rovlarini tahlil qiluvchi aqlli saralash agentisan.

# VAZIFA
Kelgan ariza ma'lumotlarini (ism, telefon, foydalanuvchi yozgan savollar yoki javoblar) tahlil qilib, quyidagi qoidalar asosida guruhlash:
1. Agar mijoz narx, chegirma, to'lov yoki sotib olish haqida so'ragan bo'lsa, uni "Sotuvlar" (sales) guruhiga yo'naltir va "Yuqori qiziqish" yoki "Narxga qiziqqan" tegini qo'sh.
2. Agar mijoz texnik yordam, kursga kirish yoki boshqa texnik savollar bergan bo'lsa, uni "Qo'llab-quvvatlash" (support) guruhiga yo'naltir va "Qo'llab-quvvatlash" tegini qo'sh.
3. Mijozning savolidan kelib chiqib, 2-3 so'zdan iborat AI izoh (saralash xulosasi) yoz.`,
  fbWelcomeMessage: "Salom {{name}}! So'rovingiz qabul qilindi. Tez orada mutaxassisimiz sizga bog'lanadi. 😊",
  fbAgentEnabled: false,
  adminTelegramChatId: "",
  adminTelegramUsername: "",
};

const INITIAL_MODULES: Module[] = [];
const INITIAL_LESSONS: Lesson[] = [];

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
const DB_VERSION = "v8"; // Bump to clear potentially corrupted states
if (isClient && localStorage.getItem("replai_db_version") !== DB_VERSION) {
  localStorage.removeItem("replai_automations");
  localStorage.removeItem("replai_contacts");
  localStorage.removeItem("replai_broadcasts");
  localStorage.removeItem("replai_channels");
  localStorage.removeItem("replai_active_channel");
  localStorage.removeItem("replai_modules");
  localStorage.removeItem("replai_lessons");
  localStorage.removeItem("replai_bot_settings");
  localStorage.removeItem("replai_groups");
  
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("replai_automations_") || key.startsWith("replai_chats_")) {
      localStorage.removeItem(key);
    }
  });
  
  localStorage.setItem("replai_db_version", DB_VERSION);
}

export const db = {
  // Internal helper: remove leftover mock/demo channels from localStorage
  _cleanMockChannels(): void {
    if (!isClient) return;
    const MOCK_NAMES = ["my brand shop", "support bot", "mock shop page"];
    const stored = localStorage.getItem("replai_channels");
    if (!stored) return;
    const channels = safeParse<Channel[]>(stored, []);
    const cleaned = channels.filter((ch) => {
      if (ch.id?.startsWith("ch_demo")) return false;
      if (ch.id?.startsWith("mock_")) return false;
      if (MOCK_NAMES.includes(ch.name?.toLowerCase())) return false;
      return true;
    });
    if (cleaned.length !== channels.length) {
      localStorage.setItem("replai_channels", JSON.stringify(cleaned));
      // Also clear active channel if it was a mock one
      const active = localStorage.getItem("replai_active_channel");
      if (active) {
        const activeCh = safeParse<Channel | null>(active, null);
        if (activeCh && (activeCh.id?.startsWith("ch_demo") || activeCh.id?.startsWith("mock_") || MOCK_NAMES.includes(activeCh.name?.toLowerCase()))) {
          localStorage.removeItem("replai_active_channel");
        }
      }
    }
  },

  _clearLocalBusinessData(): void {
    if (!isClient) return;
    localStorage.removeItem("replai_automations");
    localStorage.removeItem("replai_contacts");
    localStorage.removeItem("replai_broadcasts");
    localStorage.removeItem("replai_channels");
    localStorage.removeItem("replai_active_channel");
    localStorage.removeItem("replai_modules");
    localStorage.removeItem("replai_lessons");
    localStorage.removeItem("replai_bot_settings");
    localStorage.removeItem("replai_groups");
    
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("replai_automations_") || key.startsWith("replai_chats_")) {
        localStorage.removeItem(key);
      }
    });
  },

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
        parsed.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "22222222-2222-4222-8222-222222222222";
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
    // Satisfy lint rules for unused parameters
    if (fullName && password) {
      // noop
    }
    return { success: true };
  },

  completeSignUp(fullName: string, email: string, password: string): { success: boolean; error?: string } {
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
      isCardLinked: false,
      plan: "free"
    };
    this._clearLocalBusinessData();
    users.push(newUser);
    localStorage.setItem("replai_users", JSON.stringify(users));
    localStorage.setItem("replai_current_user", JSON.stringify(newUser));
    // Clean up any leftover mock/demo channels for new users
    this._cleanMockChannels();
    notifyUpdate();
    return { success: true };
  },

  signIn(email: string, password: string): { success: boolean; error?: string } {
    if (!isClient) return { success: false };

    const users = this.getUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      return { success: false, error: "Email yoki parol noto'g'ri." };
    }
    return { success: true };
  },

  completeSignIn(email: string): { success: boolean; error?: string } {
    if (!isClient) return { success: false };

    const users = this.getUsers();
    const user = users.find((u) => u.email === email);
    if (!user) {
      return { success: false, error: "Foydalanuvchi topilmadi." };
    }
    if (!user.id) {
      user.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "44444444-4444-4444-8444-444444444444";
      const idx = users.findIndex((u) => u.email === email);
      if (idx > -1) {
        users[idx] = user;
        localStorage.setItem("replai_users", JSON.stringify(users));
      }
    }
    this._clearLocalBusinessData();
    localStorage.setItem("replai_current_user", JSON.stringify(user));

    // Clean up any leftover mock/demo channels
    this._cleanMockChannels();

    notifyUpdate();
    return { success: true };
  },

  googleSignIn(email: string, fullName: string): { success: boolean; error?: string } {
    if (!isClient) return { success: false };
    const users = this.getUsers();
    let user = users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "55555555-5555-5555-8555-555555555555",
        email,
        fullName,
        isCardLinked: false,
        plan: "free"
      };
      users.push(user);
      localStorage.setItem("replai_users", JSON.stringify(users));
    }
    this._clearLocalBusinessData();
    localStorage.setItem("replai_current_user", JSON.stringify(user));
    notifyUpdate();
    return { success: true };
  },

  generateOtp(email: string): string {
    if (!isClient) return "1234";
    const code = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem(`replai_otp_${email}`, code);
    return code;
  },

  verifyOtp(email: string, code: string): boolean {
    if (!isClient) return false;
    const stored = localStorage.getItem(`replai_otp_${email}`);
    if (stored === code) {
      localStorage.removeItem(`replai_otp_${email}`);
      return true;
    }
    return false;
  },

  signOut(): void {
    if (!isClient) return;
    this._clearLocalBusinessData();
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

  updatePlan(planName: "free" | "pro" | "premium"): { success: boolean; error?: string } {
    if (!isClient) return { success: false, error: "Client not available" };
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, error: "User not found" };

    // Paid plans require a real linked card
    if (planName !== "free" && !currentUser.isCardLinked) {
      return { success: false, error: "card_required" };
    }

    currentUser.plan = planName;
    if (planName === "free") {
      currentUser.isCardLinked = false;
      delete currentUser.cardNumber;
      delete currentUser.trialExpiresAt;
    }

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
      localStorage.setItem("replai_contacts", JSON.stringify(INITIAL_CONTACTS));
      return INITIAL_CONTACTS;
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
      localStorage.setItem("replai_broadcasts", JSON.stringify(INITIAL_BROADCASTS));
      return INITIAL_BROADCASTS;
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

  // 6. Channels Database
  getChannels(): Channel[] {
    if (!isClient) return [];
    const stored = localStorage.getItem("replai_channels");
    if (!stored) {
      localStorage.setItem("replai_channels", JSON.stringify(INITIAL_CHANNELS));
      return INITIAL_CHANNELS;
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
      localStorage.setItem("replai_modules", JSON.stringify(INITIAL_MODULES));
      return INITIAL_MODULES;
    }
    return safeParse<Module[]>(stored, INITIAL_MODULES);
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
      localStorage.setItem("replai_lessons", JSON.stringify(INITIAL_LESSONS));
      return INITIAL_LESSONS;
    }
    return safeParse<Lesson[]>(stored, INITIAL_LESSONS);
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
    const currentUser = this.getCurrentUser();
    const userId = currentUser?.id || "guest";
    try {
      const res = await fetch(`/api/db?userId=${userId}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([key, val]) => {
          if (key.startsWith("replai_") && key !== "replai_current_user") {
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
    const currentUser = this.getCurrentUser();
    const userId = currentUser?.id || "guest";
    try {
      const data = this.exportData();
      const res = await fetch(`/api/db?userId=${userId}`, {
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
