"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, AlertModal, ConfirmModal, BarChart, AreaChart, MetricCard } from "@/components/ui/primitives";
import { 
  Users, 
  Ticket, 
  UserCheck, 
  Sliders, 
  Terminal, 
  Megaphone,
  Plus, 
  Trash2, 
  ShieldAlert, 
  Search, 
  Brain, 
  RefreshCw, 
  Eye, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Loader2,
  Download
} from "lucide-react";
import { db } from "@/lib/db";
import { useI18n } from "@/i18n/I18nProvider";
import { BrandLoader } from "@/components/ui/BrandLoader";

const LOCAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  uz: {
    overview: "Umumiy tahlil",
    users: "Foydalanuvchilar",
    promos: "Promokodlar",
    referrals: "Referallar oqimi",
    bots: "Mijozlar menyusi",
    logs: "Tizim loglari",
    totalUsers: "Jami foydalanuvchilar",
    totalUsersDesc: "Ro'yxatdan o'tgan jami hisoblar",
    premiumProSubscriptions: "VIP / Premium / Pro obunalar",
    premiumProSubscriptionsDesc: "Faol to'lov qiluvchi foydalanuvchilar",
    connectedChatbots: "Ulangan chatbotlar",
    connectedChatbotsDesc: "Faol Telegram va Instagram ulanishlari",
    financialStats: "Tizim moliyaviy aylanmasi",
    totalCredits: "Barcha foydalanuvchilar AI kreditlari",
    affiliateCommissions: "Hamkorlik to'langan komissiyalar",
    totalRevenueMonthly: "Hisoblangan jami aylanma (SaaS)",
    announcementPanel: "Global e'lon va ogohlantirish paneli",
    announcementPlaceholder: "Texnik ishlar, aksiya yoki yangiliklar haqida bildirishnoma matni...",
    saveAnnouncement: "E'lonni saqlash",
    activeAnnouncement: "Faol bildirishnoma",
    delete: "O'chirish",
    close: "Yopish",
    success: "Muvaffaqiyatli",
    error: "Xato",
    timeRange7d: "7 kun",
    timeRange30d: "30 kun",
    timeRangeAll: "Barchasi",
    dailyVisitors: "Kunlik tashrif buyuruvchilar",
    dailyActiveUsers: "Kunlik faol foydalanuvchilar",
    dailyRevenue: "Kunlik daromad",
    conversionRates: "Konversiya ko'rsatkichlari",
    trafficToRegister: "Tashrifdan ro'yxatga",
    registerToPaid: "Ro'yxatdan to'lovga",
    topChatbots: "Eng faol chatbotlar",
    topConsumers: "Kredit sarfi ko'p foydalanuvchilar",
    messagesCount: "Xabarlar soni",
    creditsUsed: "Kredit sarfi",
    creditsBalance: "Kredit balansi",
    owner: "Egasi",
    currentStep: "Hozirgi qadam",
    user: "Foydalanuvchi",
    plan: "Tarif",
    cardStatus: "Karta holati",
    actions: "Amallar",
    manage: "Boshqarish",
    impersonate: "Impersonate",
    searchPlaceholder: "Ism yoki email bo'yicha qidirish...",
    totalMembers: "Jami",
    createPromo: "Yangi promokod yaratish",
    promoCode: "Kupon kodi",
    creditAmount: "Kredit miqdori",
    maxUses: "Maksimal faollashtirishlar",
    specialEmail: "Maxsus email (ixtiyoriy)",
    addPromo: "Promokod qo'shish",
    promoList: "Mavjud promokodlar ro'yxati",
    code: "Kod",
    value: "Kredit qiymati",
    used: "Ishlatildi",
    restriction: "Cheklov (Email)",
    createdAt: "Yaratilgan sana",
    referralsTitle: "Taklif etilgan referallar to'liq oqimi",
    referralsDesc: "Tizimdagi barcha foydalanuvchilar hamkorlik havolasi va to'lovlar tarixi",
    partner: "Taklif etgan",
    referredMember: "Ro'yxatdan o'tgan a'zo",
    commissionRate: "Hisoblangan komissiya (30%)",
    date: "Sana",
    noReferrals: "Hozircha referallar tarmog'ida ma'lumotlar mavjud emas.",
    stateTrackerTitle: "Chatbot foydalanuvchilari qadamlari",
    stateTrackerDesc: "Mijozlarning chat-menyuning qaysi bo'limida to'xtab qolganligini aniqlash va kuzatish paneli.",
    customer: "Mijoz",
    botOwner: "Chatbot egasi",
    stuckStep: "To'xtab qolgan menyu qadami",
    noBotContacts: "Hozircha faol chatbot mijozlari ro'yxati yuklanmadi.",
    logsTitle: "SYSTEM AUDIT LOGS Terminal",
    update: "Yangilash",
    manageUser: "Foydalanuvchini boshqarish",
    changePlan: "Tarif rejasini o'zgartirish",
    addRemoveCredits: "AI kreditlarini qo'shish / yechib olish",
    save: "Saqlash",
    enter: "Kiritish",
    agents: "AI Agentlar",
    agentName: "AI Agent nomi",
    kbSize: "Bilimlar bazasi",
    viewDetails: "Ko'rish",
    noAgents: "Tizimda ulangan AI agentlar topilmadi.",
    searchAgentsPlaceholder: "Biznes yoki agent bo'yicha qidirish...",
    totalAgents: "Jami agentlar",
    agentDetails: "AI Agent Sozlamalari Tafsiloti",
    agentPrompt: "Tizim ko'rsatmasi (System Prompt)",
    tonality: "Ohang / Xarakter",
    lengthLimit: "Javob uzunligi",
    humorLevel: "Hazil darajasi",
    workingHours: "Ish vaqti",
    escalationRulesLabel: "Yo'naltirish qoidalari",
    adminLoading: "Admin panel ma'lumotlari yuklanmoqda..."
  },
  ru: {
    overview: "Общая аналитика",
    users: "Пользователи",
    promos: "Промокоды",
    referrals: "Реферальный поток",
    bots: "Меню клиентов (Stuck)",
    logs: "Системные логи",
    totalUsers: "Всего пользователей",
    totalUsersDesc: "Всего зарегистрированных аккаунтов",
    premiumProSubscriptions: "Подписки VIP / Premium / Pro",
    premiumProSubscriptionsDesc: "Активные платящие пользователи",
    connectedChatbots: "Подключенные чат-боты",
    connectedChatbotsDesc: "Активные Telegram и Instagram подключения",
    financialStats: "Финансовый оборот системы",
    totalCredits: "ИИ кредиты всех пользователей",
    affiliateCommissions: "Выплаченные комиссии партнерам",
    totalRevenueMonthly: "Расчетный оборот (SaaS)",
    announcementPanel: "Панель глобальных объявлений",
    announcementPlaceholder: "Текст уведомления о техработах, акциях или новостях...",
    saveAnnouncement: "Сохранить объявление",
    activeAnnouncement: "Активное объявление",
    delete: "Удалить",
    close: "Закрыть",
    success: "Успешно",
    error: "Ошибка",
    timeRange7d: "7 дней",
    timeRange30d: "30 дней",
    timeRangeAll: "Все время",
    dailyVisitors: "Ежедневные посетители",
    dailyActiveUsers: "Активные пользователи за день (DAU)",
    dailyRevenue: "Ежедневный доход (UZS)",
    conversionRates: "Показатели конверсии",
    trafficToRegister: "Из визитов в регистрации",
    registerToPaid: "Из регистраций в оплаты",
    topChatbots: "Самые активные чат-боты",
    topConsumers: "Наибольший расход кредитов",
    messagesCount: "Кол-во сообщений",
    creditsUsed: "Использовано кредитов",
    creditsBalance: "Баланс кредитов",
    owner: "Владелец",
    currentStep: "Текущий шаг",
    user: "Пользователь",
    plan: "Тариф",
    cardStatus: "Статус карты",
    actions: "Действия",
    manage: "Управлять",
    impersonate: "Войти как",
    searchPlaceholder: "Поиск по имени или email...",
    totalMembers: "Всего",
    createPromo: "Создать новый промокод",
    promoCode: "Код купона",
    creditAmount: "Количество кредитов",
    maxUses: "Максимум активаций",
    specialEmail: "Специальный email (опционально)",
    addPromo: "Добавить промокод",
    promoList: "Список активных промокодов",
    code: "Код",
    value: "Значение кредитов",
    used: "Использовано",
    restriction: "Ограничение (Email)",
    createdAt: "Дата создания",
    referralsTitle: "Полный поток приглашенных рефералов",
    referralsDesc: "Партнерские ссылки и история оплат всех пользователей системы",
    partner: "Пригласивший (Партнер)",
    referredMember: "Зарегистрированный участник",
    commissionRate: "Начисленная комиссия (30%)",
    date: "Дата",
    noReferrals: "Данные в реферальной сети пока отсутствуют.",
    stateTrackerTitle: "Шаги пользователей чат-ботов (State Tracker)",
    stateTrackerDesc: "Панель отслеживания и выявления разделов чат-меню, на которых остановились клиенты.",
    customer: "Клиент (Контакт)",
    botOwner: "Владелец бота (пользователь Sendly)",
    stuckStep: "Шаг остановки (Stuck step)",
    noBotContacts: "Список активных клиентов чат-бота пока не загружен.",
    logsTitle: "Терминал системного аудита (LOGS)",
    update: "Обновить",
    manageUser: "Управление пользователем",
    changePlan: "Изменить тарифный план",
    addRemoveCredits: "Начислить / списать ИИ кредиты",
    save: "Сохранить",
    enter: "Ввести",
    agents: "Бизнесы & ИИ Агенты",
    agentName: "Имя ИИ Агента",
    kbSize: "База знаний",
    viewDetails: "Просмотр",
    noAgents: "ИИ-агенты в системе не найдены.",
    searchAgentsPlaceholder: "Поиск по бизнесу или агенту...",
    totalAgents: "Всего агентов",
    agentDetails: "Детали настроек ИИ-агента",
    agentPrompt: "Системная инструкция (System Prompt)",
    tonality: "Тональность / Характер",
    lengthLimit: "Длина ответа",
    humorLevel: "Уровень юмора",
    workingHours: "Рабочее время",
    escalationRulesLabel: "Правила эскалации",
    adminLoading: "Данные панели администратора загружаются..."
  },
  en: {
    overview: "General Analytics",
    users: "Users",
    promos: "Promo Codes",
    referrals: "Referral Stream",
    bots: "Customer Menu (Stuck)",
    logs: "System Logs",
    totalUsers: "Total Users",
    totalUsersDesc: "Total registered accounts",
    premiumProSubscriptions: "VIP / Premium / Pro Subscriptions",
    premiumProSubscriptionsDesc: "Active paying users",
    connectedChatbots: "Connected Chatbots",
    connectedChatbotsDesc: "Active Telegram & Instagram connections",
    financialStats: "System Financial Turnovers",
    totalCredits: "All Users AI Credits",
    affiliateCommissions: "Affiliate Paid Commissions",
    totalRevenueMonthly: "Estimated Monthly SaaS Volume",
    announcementPanel: "Global Announcement Panel",
    announcementPlaceholder: "Notification text for maintenance, promos, or news...",
    saveAnnouncement: "Save Announcement",
    activeAnnouncement: "Active Notification",
    delete: "Delete",
    close: "Close",
    success: "Success",
    error: "Error",
    timeRange7d: "7 days",
    timeRange30d: "30 days",
    timeRangeAll: "All time",
    dailyVisitors: "Daily Visitors",
    dailyActiveUsers: "Daily Active Users (DAU)",
    dailyRevenue: "Daily Revenue (UZS)",
    conversionRates: "Conversion Rates",
    trafficToRegister: "Traffic to Register",
    registerToPaid: "Register to Paid",
    topChatbots: "Most Active Chatbots",
    topConsumers: "Top Credit Consumers",
    messagesCount: "Messages count",
    creditsUsed: "Credits used",
    creditsBalance: "Credits balance",
    owner: "Owner",
    currentStep: "Current Step",
    user: "User",
    plan: "Plan",
    cardStatus: "Card Status",
    actions: "Actions",
    manage: "Manage",
    impersonate: "Impersonate",
    searchPlaceholder: "Search by name or email...",
    totalMembers: "Total",
    createPromo: "Create New Promo Code",
    promoCode: "Coupon Code",
    creditAmount: "Credit Amount",
    maxUses: "Max Activations",
    specialEmail: "Special Email (optional)",
    addPromo: "Add Promo Code",
    promoList: "Available Promo Codes List",
    code: "Code",
    value: "Credit Value",
    used: "Used",
    restriction: "Restriction (Email)",
    createdAt: "Created Date",
    referralsTitle: "Complete Stream of Invited Referrals",
    referralsDesc: "Partnership link and payments history of all system users",
    partner: "Invited By (Partner)",
    referredMember: "Registered Member",
    commissionRate: "Estimated Commission (30%)",
    date: "Date",
    noReferrals: "No referral data is available yet.",
    stateTrackerTitle: "Chatbot User Steps (State Tracker)",
    stateTrackerDesc: "Dashboard for monitoring and identifying which menu section customers got stuck on.",
    customer: "Customer (Contact)",
    botOwner: "Bot Owner (Sendly User)",
    stuckStep: "Stuck step",
    noBotContacts: "Active chatbot customer list has not been loaded yet.",
    logsTitle: "SYSTEM AUDIT LOGS Terminal",
    update: "Update",
    manageUser: "Manage User",
    changePlan: "Change Subscription Plan",
    addRemoveCredits: "Add / Remove AI Credits",
    save: "Save",
    enter: "Enter",
    agents: "Businesses & AI Agents",
    agentName: "AI Agent Name",
    kbSize: "Knowledge Base",
    viewDetails: "View Details",
    noAgents: "No connected AI agents found in the system.",
    searchAgentsPlaceholder: "Search by business or agent...",
    totalAgents: "Total agents",
    agentDetails: "AI Agent Settings Details",
    agentPrompt: "System Prompt",
    tonality: "Tone / Character",
    lengthLimit: "Response Length",
    humorLevel: "Humor Level",
    workingHours: "Working Hours",
    escalationRulesLabel: "Escalation Rules",
    adminLoading: "Admin panel data is loading..."
  }
};

export default function AdminPage() {
  const { t, lang } = useI18n();
  const tr = (key: string) => {
    const currentLang = lang === "uz" || lang === "ru" || lang === "en" ? lang : "uz";
    return LOCAL_TRANSLATIONS[currentLang]?.[key] || LOCAL_TRANSLATIONS.uz[key] || key;
  };

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "agents" | "promos" | "referrals" | "bots" | "logs">("overview");

  // Preserve activeTab state on reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("admin_active_tab");
      if (savedTab && ["overview", "users", "agents", "promos", "referrals", "bots", "logs"].includes(savedTab)) {
        setActiveTab(savedTab as any);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_active_tab", activeTab);
    }
  }, [activeTab]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin Data states
  const [stats, setStats] = useState<any>({ totalUsers: 0, activePremiumCount: 0, activeProCount: 0, totalChannels: 0, totalCredits: 0, totalCommissions: "0 UZS" });
  const [users, setUsers] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [botContacts, setBotContacts] = useState<any[]>([]);
  const [systemAnnouncement, setSystemAnnouncement] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("30days");
  const [analytics, setAnalytics] = useState<any>(null);

  // Selection / Editing states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [manualCreditInput, setManualCreditInput] = useState("");
  const [manualPlanInput, setManualPlanInput] = useState("free");

  // Promo code creator states
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoAmount, setNewPromoAmount] = useState("");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState("100");
  const [newPromoRestrictedEmail, setNewPromoRestrictedEmail] = useState("");

  // Announcement creator state
  const [newAnnouncement, setNewAnnouncement] = useState("");

  // Quick Add Credits state
  const [quickEmail, setQuickEmail] = useState("");
  const [quickCredits, setQuickCredits] = useState("");
  const [loadingQuickCredits, setLoadingQuickCredits] = useState(false);

  // User search query state
  const [userQuery, setUserQuery] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // Modals
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [openPlanMenuUserId, setOpenPlanMenuUserId] = useState<string | null>(null);

  const showConfirm = (title: string, msg: string, callback: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(msg);
    setConfirmCallback(() => callback);
    setConfirmOpen(true);
  };

  const showAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        stats,
        users,
        promos,
        referrals,
        botContacts,
        systemAnnouncement,
        auditLogs,
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `sendly_db_backup_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showAlert("Muvaffaqiyatli", "Zaxira nusxasi (JSON) muvaffaqiyatli yuklab olindi!");
    } catch {
      showAlert("Xatolik", "Zaxira nusxasini yaratib bo'lmadi.");
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin", { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats || { totalUsers: 0, activePremiumCount: 0, activeProCount: 0, totalChannels: 0, totalCredits: 0, totalCommissions: "0 UZS" });
        setUsers(data.users || []);
        setPromos(data.promoCodes || []);
        setReferrals(data.referrals || []);
        setBotContacts(data.botContacts || []);
        setSystemAnnouncement(data.systemAnnouncement || "");
        setNewAnnouncement(data.systemAnnouncement || "");
        setAuditLogs(data.auditLogs || []);
        setAnalytics(data.analytics || null);
      }
    } catch (e) {
      console.error("Failed to load admin panel data", e);
    }
    setLoading(false);
  };

  const getFilteredData = (dataArray: any[]) => {
    if (!dataArray) return [];
    if (timeRange === "7days") {
      return dataArray.slice(-7);
    }
    return dataArray;
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    if (user && (user.email === "admin@sendly.uz" || user.email === "isroiljohnabdullayev@gmail.com" || user.email === "aisroil005@gmail.com" || (user as any).role === "admin")) {
      setIsAdmin(true);
      loadAdminData();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader text={tr("adminLoading")} />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-[500px] mx-auto mt-12 bg-white rounded-[24px] border border-red-200 p-8 shadow-sm text-center">
          <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-[18px] font-black text-black">Kirish taqiqlangan</h2>
          <p className="text-[13px] text-[#707070] mt-2 leading-relaxed">
            Sizda ushbu sahifaga kirish huquqi yo&apos;q. Faqat tizim administratorlari admin paneliga kira oladilar.
          </p>
        </div>
      </AppLayout>
    );
  }

  // ── USER MANUAL ACTIONS ──
  const handleUpdatePlan = async (userId: string, plan: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update_user_plan", userId, plan })
      });
      if (res.ok) {
        showAlert("Muvaffaqiyatli", "Foydalanuvchi tarifi muvaffaqiyatli o'zgartirildi!");
        loadAdminData();
        setSelectedUser(null);
      }
    } catch {
      showAlert("Xato", "Tarifni o'zgartirib bo'lmadi.");
    }
  };

  const handleUpdateCredits = async (userId: string, amount: number) => {
    if (isNaN(amount) || amount === 0) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update_user_credits", userId, amount })
      });
      if (res.ok) {
        showAlert("Muvaffaqiyatli", "Foydalanuvchi AI kredit balansi yangilandi!");
        loadAdminData();
        setManualCreditInput("");
        setSelectedUser(null);
      }
    } catch {
      showAlert("Xato", "Kreditni yangilab bo'lmadi.");
    }
  };

  const handleQuickAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = quickEmail.trim().toLowerCase();
    const amount = Number(quickCredits);
    if (!email || isNaN(amount) || amount === 0) return;

    setLoadingQuickCredits(true);
    try {
      const targetUser = (users || []).find((u: any) => u.email?.toLowerCase() === email);
      if (!targetUser) {
        showAlert("Xato", "Ushbu elektron pochta manzili bilan ro'yxatdan o'tgan foydalanuvchi topilmadi.");
        setLoadingQuickCredits(false);
        return;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update_user_credits", userId: targetUser.id, amount })
      });

      if (res.ok) {
        showAlert("Muvaffaqiyatli", `${email} balansiga ${amount.toLocaleString("uz-UZ")} kredit muvaffaqiyatli qo'shildi!`);
        setQuickEmail("");
        setQuickCredits("");
        loadAdminData();
      } else {
        const errData = await res.json();
        showAlert("Xato", errData.error || "Kreditni yangilab bo'lmadi.");
      }
    } catch {
      showAlert("Xato", "Kreditni yangilashda tarmoq xatoligi yuz berdi.");
    } finally {
      setLoadingQuickCredits(false);
    }
  };

  const handleImpersonate = async (email: string) => {
    // Write audit log first
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          action: "add_audit_log", 
          user: "admin@sendly.uz", 
          logAction: `Foydalanuvchi sifatida tizimga kirdi (Impersonate): ${email}` 
        })
      });
    } catch {}

    const res = db.impersonateUser(email);
    if (res.success) {
      window.location.href = "/";
    } else {
      showAlert("Xato", res.error || "Tizimga kirishda xatolik.");
    }
  };

  // ── PROMO CODE ACTIONS ──
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode || !newPromoAmount) return;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_promo",
          code: newPromoCode,
          amount: Number(newPromoAmount),
          maxUses: Number(newPromoMaxUses),
          restrictedToEmail: newPromoRestrictedEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromos(data.promoCodes);
        setNewPromoCode("");
        setNewPromoAmount("");
        setNewPromoMaxUses("100");
        setNewPromoRestrictedEmail("");
        showAlert("Muvaffaqiyatli", "Yangi promokod muvaffaqiyatli yaratildi!");
        loadAdminData();
      } else {
        showAlert("Xatolik", data.error || "Promokod yaratib bo'lmadi.");
      }
    } catch {
      showAlert("Xato", "Tarmoq xatoligi yuz berdi.");
    }
  };

  const handleDeletePromo = async (code: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "delete_promo", code })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromos(data.promoCodes);
        showAlert("Muvaffaqiyatli", "Promokod o'chirib yuborildi.");
        loadAdminData();
      }
    } catch {
      showAlert("Xato", "Promokodni o'chirib bo'lmadi.");
    }
  };

  // ── SYSTEM ANNOUNCEMENT ACTION ──
  const handleSetAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("replai_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "set_system_announcement", announcement: newAnnouncement })
      });
      if (res.ok) {
        showAlert("Muvaffaqiyatli", "Tizim bildirishnomasi yangilandi!");
        loadAdminData();
      }
    } catch {
      showAlert("Xato", "Bildirishnomani yangilab bo'lmadi.");
    }
  };

  // User search
  const filteredUsers = (users || []).filter(u => 
    u && (
      (u.fullName || "").toLowerCase().includes(userQuery.toLowerCase()) || 
      (u.email || "").toLowerCase().includes(userQuery.toLowerCase())
    )
  );

  return (
    <AppLayout>
      <PageHeader 
        title="Admin Panel" 
        breadcrumbs="Admin / Dashboard" 
      />

      <div className="flex flex-col lg:flex-row gap-6 mt-2">
        {/* Left selector */}
        <div className="w-full lg:w-[240px] shrink-0">
          <Card className="p-3 lg:p-4 flex lg:flex-col gap-2 lg:gap-1 border border-[#D8D8D8] overflow-x-auto lg:overflow-x-visible [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "overview" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <TrendingUp size={16} />
              <span>{tr("overview")}</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "users" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Users size={16} />
              <span>{tr("users")}</span>
            </button>

            <button
              onClick={() => setActiveTab("agents")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "agents" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Cpu size={16} />
              <span>{tr("agents")}</span>
            </button>

            <button
              onClick={() => setActiveTab("promos")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "promos" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Ticket size={16} />
              <span>{tr("promos")}</span>
            </button>

            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "referrals" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <UserCheck size={16} />
              <span>{tr("referrals")}</span>
            </button>

            <button
              onClick={() => setActiveTab("bots")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "bots" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Cpu size={16} />
              <span>{tr("bots")}</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "logs" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Terminal size={16} />
              <span>{tr("logs")}</span>
            </button>
          </Card>
        </div>

        {/* Right sub-dashboard */}
        <div className="flex-1 min-w-0">
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (() => {
            const visitorPoints = analytics ? getFilteredData(analytics.dailyVisitors).map((v: any) => v.count) : [];
            const visitorDates = analytics ? getFilteredData(analytics.dailyVisitors).map((v: any) => v.date) : [];
            const dauPoints = analytics ? getFilteredData(analytics.dailyActiveUsers).map((v: any) => v.count) : [];
            const revenuePoints = analytics ? getFilteredData(analytics.dailyRevenue).map((r: any) => r.amount) : [];
            const revenueDates = analytics ? getFilteredData(analytics.dailyRevenue).map((r: any) => r.date) : [];

            return (
              <div className="flex flex-col gap-6">
                {/* Header with TimeRange Selector */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-5 rounded-[24px] border border-[#D8D8D8] shadow-xs">
                  <div>
                    <h2 className="text-[17px] font-black text-black">{tr("overview")}</h2>
                    <p className="text-[11px] text-[#707070] mt-0.5">Tizim platformasi analitik ko&apos;rsatkichlari va tahlillari</p>
                  </div>
                  
                  <div className="flex bg-[#F0F0F0] p-1 rounded-full border border-[#D8D8D8]">
                    <button
                      onClick={() => setTimeRange("7days")}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        timeRange === "7days" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black"
                      }`}
                    >
                      {tr("timeRange7d")}
                    </button>
                    <button
                      onClick={() => setTimeRange("30days")}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        timeRange === "30days" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black"
                      }`}
                    >
                      {tr("timeRange30d")}
                    </button>
                    <button
                      onClick={() => setTimeRange("all")}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        timeRange === "all" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black"
                      }`}
                    >
                      {tr("timeRangeAll")}
                    </button>
                  </div>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Jami foydalanuvchilar */}
                  <Card className="flex min-h-[140px] flex-col justify-between p-6 border border-[#D8D8D8] bg-white hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] text-[#707070] font-bold leading-tight uppercase">{tr("totalUsers")}</span>
                      {stats?.userGrowthPct && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                          stats.userGrowthPct.startsWith("-") ? "bg-red-100 text-red-700" : "bg-[#C7F33C] text-[#1A2906]"
                        }`}>
                          {stats.userGrowthPct}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="text-[28px] md:text-[32px] font-black text-black leading-none">
                        {stats?.totalUsers ?? 0} ta
                      </div>
                      <div className="mt-1.5 text-[10px] text-[#707070]">{tr("totalUsersDesc")}</div>
                    </div>
                  </Card>

                  {/* Card 2: Premium / Pro obunalar */}
                  <Card className="flex min-h-[140px] flex-col justify-between p-6 border border-[#D8D8D8] bg-white hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] text-[#707070] font-bold leading-tight uppercase">{tr("premiumProSubscriptions")}</span>
                      {stats?.premiumGrowthPct && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                          stats.premiumGrowthPct.startsWith("-") ? "bg-red-100 text-red-700" : "bg-[#C7F33C] text-[#1A2906]"
                        }`}>
                          {stats.premiumGrowthPct}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="text-[28px] md:text-[32px] font-black text-black leading-none">
                        {stats?.activeVipCount ?? 0} / {stats?.activePremiumCount ?? 0} / {stats?.activeProCount ?? 0}
                      </div>
                      <div className="mt-1.5 text-[10px] text-[#707070]">{tr("premiumProSubscriptionsDesc")}</div>
                    </div>
                  </Card>

                  {/* Card 3: Konversiya ko'rsatkichlari */}
                  <Card className="flex min-h-[140px] flex-col justify-between p-6 border border-[#D8D8D8] bg-white hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] text-[#707070] font-bold leading-tight uppercase">{tr("conversionRates")}</span>
                      <span className="bg-gray-100 text-[#707070] rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap">
                        Live
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-[20px] md:text-[22px] font-black text-black leading-none whitespace-nowrap">
                        {stats?.conversionsRate?.visitorToRegister ?? "—"} / {stats?.conversionsRate?.registerToPaid ?? "—"}
                      </div>
                      <div className="mt-1.5 text-[10px] text-[#707070]">Traffic → Reg / Reg → Paid</div>
                    </div>
                  </Card>

                  {/* Card 4: Ulangan chatbotlar */}
                  <Card className="flex min-h-[140px] flex-col justify-between p-6 border border-[#D8D8D8] bg-white hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] text-[#707070] font-bold leading-tight uppercase">{tr("connectedChatbots")}</span>
                      {stats?.channelGrowthPct && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                          stats.channelGrowthPct.startsWith("-") ? "bg-red-100 text-red-700" : "bg-[#C7F33C] text-[#1A2906]"
                        }`}>
                          {stats.channelGrowthPct}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="text-[28px] md:text-[32px] font-black text-black leading-none">
                        {stats?.totalChannels ?? 0} ta
                      </div>
                      <div className="mt-1.5 text-[10px] text-[#707070]">{tr("connectedChatbotsDesc")}</div>
                    </div>
                  </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Traffic AreaChart */}
                  <Card className="p-6 border border-[#D8D8D8] flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[15px] font-bold text-black">{tr("dailyVisitors")} & {tr("dailyActiveUsers")}</h3>
                        <span className="text-[11px] text-[#707070] font-semibold">
                          {timeRange === "7days" ? tr("timeRange7d") : timeRange === "30days" ? tr("timeRange30d") : tr("timeRangeAll")}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#707070] mb-6">
                        Kunlik saytga kirishlar va faol bot foydalanuvchilari nisbati
                      </p>
                    </div>
                    
                    {analytics && visitorPoints.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <div className="text-[10px] text-[#707070] font-bold mb-1">{tr("dailyVisitors")}</div>
                          <AreaChart
                            points={visitorPoints}
                            highlightIndex={visitorPoints.length - 1}
                            highlightTag={`${visitorPoints[visitorPoints.length - 1]}`}
                            height={80}
                            width={400}
                          />
                        </div>
                        
                        <div className="relative border-t border-[#F0F0F0] pt-4">
                          <div className="text-[10px] text-[#707070] font-bold mb-1">{tr("dailyActiveUsers")}</div>
                          <AreaChart
                            points={dauPoints}
                            highlightIndex={dauPoints.length - 1}
                            highlightTag={`${dauPoints[dauPoints.length - 1]}`}
                            height={80}
                            width={400}
                          />
                        </div>
                        
                        <div className="flex justify-between text-[9px] text-[#707070] px-1 font-mono">
                          {visitorDates.map((date: string, idx: number, arr: any[]) => {
                            const showLabel = arr.length > 10 ? idx % 5 === 0 : true;
                            return <span key={idx} style={{ visibility: showLabel ? "visible" : "hidden" }}>{date}</span>;
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-[#707070] italic">
                        Ma&apos;lumot yuklanmadi...
                      </div>
                    )}
                  </Card>

                  {/* Revenue BarChart */}
                  <Card className="p-6 border border-[#D8D8D8] flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[15px] font-bold text-black">{tr("dailyRevenue")}</h3>
                        <span className="text-[11px] text-[#7CA607] font-extrabold font-mono">
                          +{(revenuePoints.reduce((a: number, b: number) => a + b, 0)).toLocaleString("uz-UZ")} UZS
                        </span>
                      </div>
                      <p className="text-[11px] text-[#707070] mb-6">
                        Obunalar va qo&apos;shimcha kredit savdosidan kunlik tushum (UZS)
                      </p>
                    </div>

                    {analytics && revenuePoints.length > 0 ? (
                      <div className="flex-1 flex flex-col justify-end">
                        <BarChart
                          values={revenuePoints}
                          days={revenueDates.map((date: string, idx: number, arr: any[]) => {
                            return arr.length > 10 ? (idx % 5 === 0 ? date : "") : date;
                          })}
                          highlightIndex={revenuePoints.length - 1}
                          highlightTag={`${revenuePoints[revenuePoints.length - 1].toLocaleString("uz-UZ")} UZS`}
                          height={170}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-[#707070] italic">
                        Ma&apos;lumot yuklanmadi...
                      </div>
                    )}
                  </Card>
                </div>

                {/* Leaderboards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Chatbots */}
                  <Card className="p-6 border border-[#D8D8D8]">
                    <h3 className="text-[15px] font-bold text-black mb-4 flex items-center gap-2">
                    <Brain size={16} className="text-[#C7F33C]" fill="black" />
                      <span>{tr("topChatbots")}</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {analytics?.topChannels?.map((ch: any, idx: number) => (
                        <div key={ch.id || idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F9F9F7] border border-[#F0F0F0] hover:scale-[1.01] transition-all">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black text-[#C7F33C] text-[11px] font-black shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[12.5px] text-black flex items-center gap-1.5 truncate">
                                {ch.name}
                                <span className="text-[8.5px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-black">TG</span>
                              </div>
                              <div className="text-[10.5px] text-[#707070] truncate">@{ch.username} • {tr("owner")}: {ch.ownerEmail || "Noma'lum"}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[12.5px] font-black text-black">{ch.messagesCount?.toLocaleString("uz-UZ")}</div>
                            <div className="text-[9.5px] text-[#7CA607] font-bold uppercase tracking-wider">{ch.currentStep || "Faol"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Top Credit Consumers */}
                  <Card className="p-6 border border-[#D8D8D8]">
                    <h3 className="text-[15px] font-bold text-black mb-4 flex items-center gap-2">
                      <Users size={16} className="text-[#C7F33C]" fill="black" />
                      <span>{tr("topConsumers")}</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {analytics?.topConsumers?.map((u: any, idx: number) => (
                        <div key={u.id || idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F9F9F7] border border-[#F0F0F0] hover:scale-[1.01] transition-all">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black text-[#C7F33C] text-[11px] font-black shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[12.5px] text-black flex items-center gap-1.5 truncate">
                                {u.fullName || "Foydalanuvchi"}
                                <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                                  u.plan === "vip" ? "bg-black text-[#C7F33C] border border-[#C7F33C]" :
                                  u.plan === "premium" ? "bg-black text-white" :
                                  u.plan === "pro" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {u.plan}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-[#707070] truncate">{u.email}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[12.5px] font-black text-red-600">-{u.creditsUsed?.toLocaleString("uz-UZ")}</div>
                            <div className="text-[9.5px] text-[#707070] font-medium">{tr("creditsBalance")}: {u.creditsBalance?.toLocaleString("uz-UZ")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Legacy Stats & Announcement Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6 border border-[#D8D8D8]">
                    <h3 className="text-[15px] font-bold text-black mb-4">{tr("financialStats")}</h3>
                    <div className="flex justify-between items-center py-2 border-b border-[#F0F0F0] text-[12px]">
                      <span className="text-[#707070]">{tr("totalCredits")}:</span>
                      <span className="font-bold text-black">{(stats?.totalCredits ?? 0).toLocaleString("uz-UZ")} kredit</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#F0F0F0] text-[12px]">
                      <span className="text-[#707070]">{tr("affiliateCommissions")}:</span>
                      <span className="font-bold text-[#7CA607]">{stats?.totalCommissions ?? "0 UZS"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[12.5px] font-extrabold mt-2">
                      <span className="text-black">{tr("totalRevenueMonthly")}:</span>
                      <span className="text-black">
                        {(((stats?.activeVipCount ?? 0) * 600000) + ((stats?.activePremiumCount ?? 0) * 150000) + ((stats?.activeProCount ?? 0) * 75000)).toLocaleString("uz-UZ")} UZS / oy
                      </span>
                    </div>
                  </Card>

                  <Card className="p-6 border border-[#D8D8D8]">
                    <h3 className="text-[15px] font-bold text-black mb-4">{tr("announcementPanel")}</h3>
                    <form onSubmit={handleSetAnnouncement} className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        placeholder={tr("announcementPlaceholder")}
                        className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[12px] text-black focus:outline-none focus:border-black"
                      />
                      <Button type="submit" variant="primary" className="py-2.5 rounded-[10px] text-[11px] self-end gap-1.5">
                        <Megaphone size={13} />
                        <span>{tr("saveAnnouncement")}</span>
                      </Button>
                    </form>
                    {systemAnnouncement && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-[11px] rounded-lg text-amber-800 flex justify-between items-center">
                        <span><strong>{tr("activeAnnouncement")}:</strong> &quot;{systemAnnouncement}&quot;</span>
                        <button onClick={() => {
                          setNewAnnouncement("");
                          fetch("/api/admin", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "set_system_announcement", announcement: "" })
                          }).then(() => loadAdminData());
                        }} className="text-red-500 font-bold hover:underline">{tr("delete")}</button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })()}

          {/* ── USERS TAB ── */}
          {activeTab === "users" && (
            <>
              {/* ── QUICK ADD CREDITS FORM ── */}
              <Card className="border border-[#D8D8D8] p-5 mb-5 rounded-[24px] bg-white">
                <h3 className="text-[13px] font-extrabold text-black mb-3 uppercase tracking-wider">Tezkor Kredit Qo&apos;shish</h3>
                <form onSubmit={handleQuickAddCredits} className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">Foydalanuvchi pochtasi (Email)</label>
                    <input
                      type="email"
                      required
                      placeholder="Masalan: isroiljohnabdullayev@gmail.com"
                      value={quickEmail}
                      onChange={(e) => setQuickEmail(e.target.value)}
                      className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12.5px] text-black outline-none focus:border-black font-semibold"
                    />
                  </div>
                  <div className="w-[180px] flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">Kredit soni</label>
                    <input
                      type="number"
                      required
                      placeholder="Masalan: 50000"
                      value={quickCredits}
                      onChange={(e) => setQuickCredits(e.target.value)}
                      className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12.5px] text-black outline-none focus:border-black font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingQuickCredits}
                    className="px-6 rounded-full text-[12px] font-extrabold active:scale-95 transition-all bg-black hover:bg-black/90 text-[#C7F33C] border border-[#C7F33C]/20 shrink-0 h-[38px] flex items-center justify-center disabled:opacity-50 font-sans"
                  >
                    {loadingQuickCredits ? "Qo'shilmoqda..." : "Kredit Qo'shish"}
                  </button>
                </form>
              </Card>

              <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
              <div className="p-5 border-b border-[#F0F0F0] flex flex-wrap gap-4 items-center justify-between bg-white">
                <div className="relative flex items-center w-full max-w-[320px]">
                  <Search size={16} className="absolute left-4 text-[#707070]" />
                  <input
                    type="text"
                    placeholder={tr("searchPlaceholder")}
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 py-2 text-[12.5px] text-black outline-none placeholder:text-[#a0a0a0] focus:bg-[#e8e8e8]"
                  />
                </div>
                <div className="text-[12px] text-[#707070] font-semibold">
                  {tr("totalMembers")}: {(filteredUsers || []).length} ta
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="px-6 py-3">{tr("user")}</th>
                      <th className="px-6 py-3">{tr("plan")}</th>
                      <th className="px-6 py-3">{tr("cardStatus")}</th>
                      <th className="px-6 py-3 text-right">{tr("connectedChatbots")}</th>
                      <th className="px-6 py-3 text-right">{tr("creditsBalance")}</th>
                      <th className="px-6 py-3 text-right">{tr("actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {(filteredUsers || []).filter(Boolean).map((u) => (
                      <tr key={u.id} className="hover:bg-[#F9F9F7]/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-black">{u.fullName || "Foydalanuvchi"}</div>
                          <div className="text-[10px] text-[#707070]">{u.email || ""}</div>
                        </td>
                        <td className="px-6 py-3.5 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenPlanMenuUserId(openPlanMenuUserId === u.id ? null : u.id);
                            }}
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border focus:outline-none cursor-pointer transition-all flex items-center gap-1 ${
                              (u.plan || "free") === "vip" ? "bg-black text-[#C7F33C] border-[#C7F33C]" :
                              (u.plan || "free") === "premium" ? "bg-black text-white border-black" :
                              (u.plan || "free") === "pro" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              "bg-gray-100 text-gray-500 border-gray-200"
                            }`}
                          >
                            <span>{u.plan || "free"}</span>
                            <span className="text-[7px] opacity-70">▼</span>
                          </button>

                          {openPlanMenuUserId === u.id && (
                            <>
                              {/* Backdrop to close menu on click outside */}
                              <div 
                                className="fixed inset-0 z-45" 
                                onClick={() => setOpenPlanMenuUserId(null)}
                              />
                              
                              {/* Custom Dropdown Content */}
                              <div className="absolute left-6 mt-1 w-28 rounded-2xl bg-white border border-[#E8E8E8] shadow-[0_10px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col text-left">
                                {["free", "pro", "premium", "vip"].map((pOption) => (
                                  <button
                                    key={pOption}
                                    type="button"
                                    onClick={() => {
                                      setOpenPlanMenuUserId(null);
                                      if ((u.plan || "free") !== pOption) {
                                        showConfirm(
                                          lang === "uz" ? "Tarifni o'zgartirish" : lang === "ru" ? "Изменение тарифа" : "Change Tariff",
                                          lang === "uz" 
                                            ? `Foydalanuvchi (${u.fullName || u.email}) tarifini ${pOption.toUpperCase()} ga o'zgartirmoqchimisiz?`
                                            : lang === "ru"
                                            ? `Вы действительно хотите изменить тариф пользователя (${u.fullName || u.email}) на ${pOption.toUpperCase()}?`
                                            : `Are you sure you want to change the tariff of (${u.fullName || u.email}) to ${pOption.toUpperCase()}?`,
                                          () => handleUpdatePlan(u.id, pOption)
                                        );
                                      }
                                    }}
                                    className={`px-4 py-2 text-[11px] font-bold uppercase transition-colors flex items-center justify-between ${
                                      (u.plan || "free") === pOption
                                        ? "text-[#7CA607] bg-[#C7F33C]/10"
                                        : "text-[#515154] hover:bg-[#F9F9F7] hover:text-black"
                                    }`}
                                  >
                                    <span>{pOption}</span>
                                    {(u.plan || "free") === pOption && <span className="text-[10px]">✓</span>}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {u.isCardLinked ? (
                            <span className="text-[#7CA607] font-semibold">Ulandi ({String(u.cardNumber || "").split(" ").pop() || "karta"})</span>
                          ) : (
                            <span className="text-[#A0A0A0]">Bog&apos;lanmagan</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium">{u.channelsCount || 0} ta</td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-black">{(u.creditsBalance || 0).toLocaleString("uz-UZ")}</td>
                        <td className="px-6 py-3.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setManualPlanInput(u.plan || "free");
                              setManualCreditInput("");
                            }}
                            className="bg-[#EFF2FC] text-black hover:bg-[#e1e6f7] font-bold text-[11px] px-2.5 py-1 rounded-lg"
                          >
                            {tr("manage")}
                          </button>
                          <button
                            onClick={() => handleImpersonate(u.email)}
                            className="bg-black text-[#C7F33C] hover:bg-black/90 font-bold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1"
                            title="Foydalanuvchi sifatida tizimga kirish"
                          >
                            <Eye size={12} />
                            <span>Impersonate</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            </>
          )}

          {/* ── AGENTS TAB ── */}
          {activeTab === "agents" && (() => {
            const allAgents: any[] = [];
            (users || []).forEach((u: any) => {
              if (u.channelsList && Array.isArray(u.channelsList)) {
                u.channelsList.forEach((ch: any) => {
                  allAgents.push({
                    ownerName: u.fullName || "Foydalanuvchi",
                    ownerEmail: u.email || "",
                    userId: u.id,
                    channelId: ch.id,
                    type: ch.type,
                    name: ch.name,
                    username: ch.username,
                    isActive: ch.isActive,
                    isConnected: ch.isConnected,
                    followersCount: ch.followersCount || "0",
                    createdAt: ch.createdAt,
                    botSettings: ch.botSettings || null,
                    automationsCount: ch.automationsCount || 0,
                    lessonsCount: u.lessonsCount || 0,
                    modulesCount: u.modulesCount || 0
                  });
                });
              }
            });

            const filteredAgents = allAgents.filter(ag => 
              (ag.name || "").toLowerCase().includes(agentQuery.toLowerCase()) ||
              (ag.username || "").toLowerCase().includes(agentQuery.toLowerCase()) ||
              (ag.ownerName || "").toLowerCase().includes(agentQuery.toLowerCase()) ||
              (ag.ownerEmail || "").toLowerCase().includes(agentQuery.toLowerCase())
            );

            return (
              <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
                <div className="p-5 border-b border-[#F0F0F0] flex flex-wrap gap-4 items-center justify-between bg-white">
                  <div className="relative flex items-center w-full max-w-[320px]">
                    <Search size={16} className="absolute left-4 text-[#707070]" />
                    <input
                      type="text"
                      placeholder={tr("searchAgentsPlaceholder")}
                      value={agentQuery}
                      onChange={(e) => setAgentQuery(e.target.value)}
                      className="w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 py-2 text-[12.5px] text-black outline-none placeholder:text-[#a0a0a0] focus:bg-[#e8e8e8]"
                    />
                  </div>
                  <div className="text-[12px] text-[#707070] font-semibold">
                    {tr("totalAgents")}: {filteredAgents.length} ta
                  </div>
                </div>

                <div className="overflow-x-auto bg-white">
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                        <th className="px-6 py-3">{tr("agentName")}</th>
                        <th className="px-6 py-3">{tr("botOwner")}</th>
                        <th className="px-6 py-3">{tr("agentType")}</th>
                        <th className="px-6 py-3">{tr("kbSize")}</th>
                        <th className="px-6 py-3 text-right">Ulanish</th>
                        <th className="px-6 py-3 text-right">{tr("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {filteredAgents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-[#A0A0A0] italic">
                            {tr("noAgents")}
                          </td>
                        </tr>
                      ) : filteredAgents.map((ag, idx) => (
                        <tr key={ag.channelId || idx} className="hover:bg-[#F9F9F7]/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-bold text-black flex items-center gap-1.5">
                              {ag.name || "AI Agent"}
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                                ag.type === "telegram" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                              }`}>
                                {ag.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#707070]">@{ag.username || ""}</div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="font-medium text-black">{ag.ownerName}</div>
                            <div className="text-[10px] text-[#707070]">{ag.ownerEmail}</div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-block bg-neutral-100 text-neutral-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                              {ag.botSettings?.aiAgentType || "kurator"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-black">{ag.modulesCount} mod / {ag.lessonsCount} dars</div>
                            <div className="text-[9px] text-[#707070]">{ag.automationsCount} ta avtomatizatsiya</div>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {ag.isConnected ? (
                              <span className="text-[#7CA607] font-bold">Faol</span>
                            ) : (
                              <span className="text-[#A0A0A0]">Nofaol</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedAgent(ag)}
                              className="bg-[#EFF2FC] text-black hover:bg-[#e1e6f7] font-bold text-[11px] px-3 py-1.5 rounded-lg"
                            >
                              {tr("viewDetails")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })()}

          {/* ── PROMO CODES TAB ── */}
          {activeTab === "promos" && (
            <div className="flex flex-col gap-6">
              {/* Creator Form */}
              <Card className="p-6 border border-[#D8D8D8]">
                <h3 className="text-[15px] font-bold text-black mb-4">{tr("createPromo")}</h3>
                <form onSubmit={handleCreatePromo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("promoCode")}</label>
                    <input
                      type="text"
                      required
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value)}
                      placeholder="Masalan: AUTUMN50"
                      className="rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black uppercase font-bold focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("creditAmount")}</label>
                    <input
                      type="number"
                      required
                      value={newPromoAmount}
                      onChange={(e) => setNewPromoAmount(e.target.value)}
                      placeholder="10000"
                      className="rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("maxUses")}</label>
                    <input
                      type="number"
                      value={newPromoMaxUses}
                      onChange={(e) => setNewPromoMaxUses(e.target.value)}
                      placeholder="100"
                      className="rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("specialEmail")}</label>
                    <input
                      type="email"
                      value={newPromoRestrictedEmail}
                      onChange={(e) => setNewPromoRestrictedEmail(e.target.value)}
                      placeholder="user@mail.com"
                      className="rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="md:col-span-4 flex justify-end">
                    <Button type="submit" variant="accent" className="rounded-[10px] text-[12px] px-6 py-2.5 gap-1.5 font-bold">
                      <Plus size={14} />
                      <span>{tr("addPromo")}</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Promos Table */}
              <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
                <div className="p-5 border-b border-[#F0F0F0] bg-white">
                  <h3 className="text-[15px] font-bold text-black">{tr("promoList")}</h3>
                </div>
                <div className="overflow-x-auto bg-white">
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                        <th className="px-6 py-3">{tr("code")}</th>
                        <th className="px-6 py-3">{tr("value")}</th>
                        <th className="px-6 py-3">{tr("used")}</th>
                        <th className="px-6 py-3">{tr("restriction")}</th>
                        <th className="px-6 py-3">{tr("createdAt")}</th>
                        <th className="px-6 py-3 text-right">{tr("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {(promos || []).filter(Boolean).map((p) => (
                        <tr key={p.code} className="hover:bg-[#F9F9F7]/50 transition-colors">
                          <td className="px-6 py-3.5 font-black text-black tracking-wider">{p.code}</td>
                          <td className="px-6 py-3.5 font-extrabold text-[#7CA607]">{(p.amount || 0).toLocaleString("uz-UZ")}</td>
                          <td className="px-6 py-3.5">
                            <span className="font-semibold">{p.usedCount || 0}</span> / <span className="text-[#707070]">{p.maxUses || 0}</span>
                            <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-[#7CA607] h-full" style={{ width: `${Math.min(100, Math.max(0, (((Number(p.usedCount) || 0) / (Number(p.maxUses) || 1)) * 100)))}%` }} />
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-[#505050]">
                            {p.restrictedToEmail ? (
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">{p.restrictedToEmail}</span>
                            ) : (
                              <span className="text-gray-400 italic">Cheklovsiz</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-[#707070]">{p.createdAt}</td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleDeletePromo(p.code)}
                              className="text-red-500 hover:text-red-700 font-bold"
                              title="Promokodni o'chirish"
                            >
                              <Trash2 size={15} className="ml-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── REFERRALS TAB ── */}
          {activeTab === "referrals" && (
            <Card className="overflow-hidden p-0 border border-[#D8D8D8]">
              <div className="p-6 border-b border-[#F0F0F0] bg-white">
                <h3 className="text-[16px] font-semibold text-black">{tr("referralsTitle")}</h3>
                <p className="text-[11px] text-[#707070] mt-1">{tr("referralsDesc")}</p>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="py-3 px-6">{tr("partner")}</th>
                      <th className="py-3 px-6">{tr("referredMember")}</th>
                      <th className="py-3 px-6">{tr("plan")}</th>
                      <th className="py-3 px-6">{tr("commissionRate")}</th>
                      <th className="py-3 px-6 text-right">{tr("date")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {(referrals || []).filter(Boolean).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#A0A0A0] italic">
                          {tr("noReferrals")}
                        </td>
                      </tr>
                    ) : (referrals || []).filter(Boolean).map((ref) => (
                      <tr key={ref.id} className="hover:bg-[#FDFDFD] text-[12px] text-black transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold">{ref.referrerName}</div>
                          <div className="text-[10px] text-[#707070]">{ref.referrerEmail}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-semibold">{ref.referredName}</div>
                          <div className="text-[10px] text-[#707070]">{ref.referredEmail}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            ref.plan === "vip" ? "bg-black text-[#C7F33C] border border-[#C7F33C]" :
                            ref.plan === "premium" ? "bg-black text-white" :
                            ref.plan === "pro" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {ref.plan}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-[#7CA607]">{ref.commission}</td>
                        <td className="py-3.5 px-6 text-right text-[#707070]">{ref.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── BOTS TAB ── */}
          {activeTab === "bots" && (
            <Card className="overflow-hidden p-0 border border-[#D8D8D8]">
              <div className="p-6 border-b border-[#F0F0F0] bg-white">
                <h3 className="text-[16px] font-semibold text-black">{tr("stateTrackerTitle")}</h3>
                <p className="text-[11px] text-[#707070] mt-1">{tr("stateTrackerDesc")}</p>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="py-3 px-6">{tr("customer")}</th>
                      <th className="py-3 px-6">Yig&apos;ilgan ma&apos;lumotlar</th>
                      <th className="py-3 px-6">{tr("botOwner")}</th>
                      <th className="py-3 px-6 text-right">{tr("messagesCount")}</th>
                      <th className="py-3 px-6 text-center">Oxirgi faollik</th>
                      <th className="py-3 px-6 text-right">{tr("stuckStep")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {(botContacts || []).filter(Boolean).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-[#A0A0A0] italic">
                          {tr("noBotContacts")}
                        </td>
                      </tr>
                    ) : (botContacts || []).filter(Boolean).map((c) => (
                      <tr key={c.id} className="hover:bg-[#FDFDFD] text-[12px] text-black transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[10px] text-[#707070]">@{c.username}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          {c.companyName && (
                            <div className="font-bold text-[#7CA607]">Kompaniya: {c.companyName}</div>
                          )}
                          {c.phone && (
                            <div className="text-[10.5px] text-black font-semibold">Tel: {c.phone}</div>
                          )}
                          {c.email && (
                            <div className="text-[10px] text-[#707070]">Email: {c.email}</div>
                          )}
                          {!c.companyName && !c.phone && !c.email && (
                            <span className="text-gray-400 italic">Mavjud emas</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-[#505050] font-medium">{c.ownerEmail}</td>
                        <td className="py-3.5 px-6 text-right font-semibold">{c.messagesCount} ta</td>
                        <td className="py-3.5 px-6 text-center text-[#707070]">{c.lastActive}</td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-block bg-amber-50 text-amber-700 font-extrabold text-[10px] px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
                            {c.currentStep}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── LOGS TAB ── */}
          {activeTab === "logs" && (
            <Card className="p-6 bg-[#0F0F0F] text-white border border-[#222] rounded-[24px] shadow-sm font-mono text-[12px]">
              <div className="flex justify-between items-center pb-4 border-b border-[#222] mb-4">
                <span className="text-[#C7F33C] font-bold">{tr("logsTitle")}</span>
                <div className="flex items-center gap-4">
                  <button onClick={handleDownloadBackup} className="bg-[#C7F33C] text-black hover:bg-[#b5dc30] px-3 py-1.5 rounded-[8px] flex items-center gap-1.5 font-bold text-[10px] transition-all">
                    <Download size={11} />
                    <span>Zaxira yuklab olish (JSON)</span>
                  </button>
                  <button onClick={loadAdminData} className="text-white/60 hover:text-white flex items-center gap-1 font-bold text-[10px]">
                    <RefreshCw size={10} />
                    <span>{tr("update")}</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-2">
                {(auditLogs || []).filter(Boolean).map((log) => (
                  <div key={log.id} className="flex items-start gap-4 hover:bg-white/5 p-1 rounded transition-colors">
                    <span className="text-[#707070] shrink-0 select-none">{log.date}</span>
                    <span className="text-blue-400 shrink-0 font-bold">&lt;{log.user}&gt;</span>
                    <span className="text-white/90">{log.action}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── SELECT USER OVERRIDE DIALOG ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[28px] w-full max-w-[520px] p-7 border border-[#D8D8D8] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[17px] font-black text-black leading-none mb-2">{tr("manageUser")}</h3>
            <p className="text-[12px] text-[#707070] mb-5">{selectedUser.fullName} ({selectedUser.email})</p>

            <div className="flex flex-col gap-5">
              {/* Option 1: Plan update */}
              <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#F0F0F0] flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("changePlan")}</label>
                <div className="flex gap-2">
                  <select
                    value={manualPlanInput}
                    onChange={(e) => setManualPlanInput(e.target.value)}
                    className="flex-1 rounded-[10px] border border-[#D8D8D8] px-3 py-2 text-[12px] bg-white focus:outline-none focus:border-black font-semibold text-black"
                  >
                    <option value="free">FREE Plan</option>
                    <option value="pro">PRO Plan</option>
                    <option value="premium">PREMIUM Plan</option>
                    <option value="vip">VIP Plan</option>
                  </select>
                  <button
                    onClick={() => handleUpdatePlan(selectedUser.id, manualPlanInput)}
                    className="bg-black hover:bg-black/90 text-white font-bold text-[11px] px-4 rounded-[10px] transition-all"
                  >
                    {tr("save")}
                  </button>
                </div>
              </div>

              {/* Option 2: Credits override */}
              <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#F0F0F0] flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("addRemoveCredits")}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={manualCreditInput}
                    onChange={(e) => setManualCreditInput(e.target.value)}
                    placeholder="Masalan: +5000 yoki -2000"
                    className="flex-1 rounded-[10px] border border-[#D8D8D8] px-3 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black"
                  />
                  <button
                    onClick={() => handleUpdateCredits(selectedUser.id, Number(manualCreditInput))}
                    className="bg-black hover:bg-black/90 text-white font-bold text-[11px] px-4 rounded-[10px] transition-all"
                  >
                    {tr("enter")}
                  </button>
                </div>
              </div>

              {/* Option 3: Credit Transactions History */}
              <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#F0F0F0] flex flex-col gap-2.5">
                <label className="text-[10px] font-bold text-[#707070] uppercase">Kirim-chiqim tarixi (Tokenlar logi)</label>
                <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {!selectedUser.creditsData?.history || selectedUser.creditsData.history.length === 0 ? (
                    <div className="text-center py-4 text-[#A0A0A0] text-[11px]">Kirim-chiqim tarixi mavjud emas</div>
                  ) : (
                    selectedUser.creditsData.history.map((tx: any, idx: number) => (
                      <div key={tx.id || idx} className="flex justify-between items-start border-b border-[#EAEAEA] pb-2 last:border-b-0 text-[11px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-black">{tx.description || "Izohsiz"}</span>
                          <span className="text-[9px] text-[#A0A0A0]">{tx.date}</span>
                        </div>
                        <span className={`font-black whitespace-nowrap ml-2 ${tx.type === "purchase" ? "text-green-600" : "text-red-500"}`}>
                          {tx.type === "purchase" ? "+" : "-"}{Number(tx.amount || 0).toLocaleString("uz-UZ")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-7">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-gray-100 hover:bg-gray-200 text-black font-bold text-[12px] px-5 py-2.5 rounded-full transition-all"
              >
                {tr("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SELECT AGENT DETAILS DIALOG ── */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] w-full max-w-[540px] p-7 border border-[#D8D8D8] shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <h3 className="text-[18px] font-black text-black leading-none mb-2">{tr("agentDetails")}</h3>
            <p className="text-[12px] text-[#707070] mb-5">{selectedAgent.name} (Biznes: {selectedAgent.ownerName})</p>

            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#F9F9F7] rounded-xl border border-[#F0F0F0]">
                  <span className="text-[9px] font-bold text-[#707070] uppercase">Mulk egasi</span>
                  <p className="text-[12px] font-bold text-black mt-0.5">{selectedAgent.ownerEmail}</p>
                </div>
                <div className="p-3 bg-[#F9F9F7] rounded-xl border border-[#F0F0F0]">
                  <span className="text-[9px] font-bold text-[#707070] uppercase">Agent Turi</span>
                  <p className="text-[12px] font-bold text-black mt-0.5 uppercase">{selectedAgent.botSettings?.aiAgentType || "kurator"}</p>
                </div>
              </div>

              {/* Tonality / Humor / Length */}
              {selectedAgent.botSettings && (
                <div className="p-4 bg-[#F9F9F7] rounded-xl border border-[#F0F0F0] flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold text-[#707070] uppercase">Hissiyotlar & Sozlamalar</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[13px] font-bold text-black">{selectedAgent.botSettings.tone || 60}%</div>
                      <div className="text-[9px] text-[#707070]">{tr("tonality")}</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-black">{selectedAgent.botSettings.length || 40}%</div>
                      <div className="text-[9px] text-[#707070]">{tr("lengthLimit")}</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-black">{selectedAgent.botSettings.humor || 30}%</div>
                      <div className="text-[9px] text-[#707070]">{tr("humorLevel")}</div>
                    </div>
                  </div>
                  <div className="border-t border-[#E8E8E8] pt-2 mt-1 flex justify-between text-[11px]">
                    <span className="text-[#707070]">{tr("workingHours")}:</span>
                    <span className="font-bold text-black">
                      {selectedAgent.botSettings.autoOutreach 
                        ? `${selectedAgent.botSettings.outreachStart} - ${selectedAgent.botSettings.outreachEnd}`
                        : "24/7 faol"}
                    </span>
                  </div>
                </div>
              )}

              {/* Escalation Rules */}
              {selectedAgent.botSettings?.escalationRules && selectedAgent.botSettings.escalationRules.length > 0 && (
                <div className="p-4 bg-[#F9F9F7] rounded-xl border border-[#F0F0F0] flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-[#707070] uppercase">{tr("escalationRulesLabel")}</span>
                  <div className="flex flex-col gap-1.5">
                    {selectedAgent.botSettings.escalationRules.map((rule: any) => (
                      <div key={rule.id} className="flex items-center gap-2 text-[11px]">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${rule.enabled ? "bg-[#16A34A]" : "bg-[#707070]"}`} />
                        <span className={rule.enabled ? "text-black" : "text-[#707070] line-through"}>{rule.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Prompt */}
              {selectedAgent.botSettings?.systemPrompt && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#707070] uppercase">{tr("agentPrompt")}</label>
                  <pre className="w-full bg-[#1e1e1e] text-[#d4d4d4] rounded-xl p-4 text-[10px] overflow-x-auto whitespace-pre-wrap max-h-[220px] font-mono leading-relaxed">
                    {selectedAgent.botSettings.systemPrompt}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedAgent(null)}
                className="bg-black text-[#C7F33C] hover:bg-black/90 font-bold text-[12px] px-6 py-2.5 rounded-full transition-all"
              >
                {tr("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (confirmCallback) confirmCallback();
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="OK"
        cancelText={lang === "uz" ? "Bekor qilish" : lang === "ru" ? "Отменить" : "Cancel"}
      />
    </AppLayout>
  );
}
