"use client";

// Types
export type User = {
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
const DB_VERSION = "v6"; // Bump to clear potentially corrupted states
if (isClient && localStorage.getItem("replai_db_version") !== DB_VERSION) {
  localStorage.removeItem("replai_automations");
  localStorage.removeItem("replai_contacts");
  localStorage.removeItem("replai_broadcasts");
  localStorage.removeItem("replai_channels");
  localStorage.removeItem("replai_active_channel");
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
