"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, StatusPill, ConfirmModal, AlertModal } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { 
  Save, 
  Database, 
  Trash2, 
  Plus, 
  Bot, 
  X, 
  CheckCircle, 
  ChevronDown, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  Check, 
  Lock,
  CreditCard,
  User as UserIcon,
  Users,
  HelpCircle,
  Info,
  Loader2,
  Key,
  Coins
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { db } from "@/lib/db";
import type { User, Channel } from "@/lib/db";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

type ModalType = "instagram" | "telegram" | "choose" | "instagram-choice" | null;

const LOCAL_TRANSLATIONS = {
  uz: {
    ig_direct_api: "Instagram",
    webhook_api: "Webhooks va API",
    api_keys: "API kalitlari",
    new_key_title: "Yangi kalit yaratildi",
    new_key_desc: "Yangi API kalit muvaffaqiyatli yaratildi va saqlandi.",
    copied_title: "Nusxalandi",
    copied_desc: "API kalit buferga muvaffaqiyatli nusxalandi.",
    regenerate_btn: "Yangi API kalit yaratish",
  },
  ru: {
    ig_direct_api: "Instagram",
    webhook_api: "Webhooks и API",
    api_keys: "API ключи",
    new_key_title: "Новый ключ создан",
    new_key_desc: "Новый API ключ успешно создан и сохранен.",
    copied_title: "Скопировано",
    copied_desc: "API ключ успешно скопирован в буфер обмена.",
    regenerate_btn: "Создать новый API ключ",
  },
  en: {
    ig_direct_api: "Instagram",
    webhook_api: "Webhooks & API",
    api_keys: "API Keys",
    new_key_title: "New key created",
    new_key_desc: "New API key successfully created and saved.",
    copied_title: "Copied",
    copied_desc: "API key successfully copied to clipboard.",
    regenerate_btn: "Generate new API key",
  }
};

export default function SettingsPage() {
  const { lang, t } = useI18n();
  const tr = (key: keyof typeof LOCAL_TRANSLATIONS.uz): string => {
    return LOCAL_TRANSLATIONS[lang]?.[key] || LOCAL_TRANSLATIONS.uz[key];
  };

  const [activeSection, setActiveSection] = useState<string>("profile");

  // User details & account states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [channelsCount, setChannelsCount] = useState(0);
  const [activeAutomationsCount, setActiveAutomationsCount] = useState(0);

  // Password Change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Link card (billing) states
  const [cardNumInput, setCardNumInput] = useState("");
  const [cardExpiryInput, setCardExpiryInput] = useState("");
  const [cardCvcInput, setCardCvcInput] = useState("");
  const [cardError, setCardError] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [cardStep, setCardStep] = useState<"card" | "otp">("card");
  const [otpCode, setOtpCode] = useState("");
  const [otpTimer, setOtpTimer] = useState(120);

  const cleanCardNum = cardNumInput.replace(/\s/g, "");
  const isUzCardOrHumo = cleanCardNum.startsWith("8600") || 
                         cleanCardNum.startsWith("5614") || 
                         cleanCardNum.startsWith("9860") ||
                         cleanCardNum.startsWith("6262");

  // AI Credits States
  const [aiCreditsData, setAiCreditsData] = useState<{ balance: number; used: number; history: any[]; usedVouchers?: string[] }>({ balance: 0, used: 0, history: [] });
  const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false);
  const [processingPurchase, setProcessingPurchase] = useState(false);

  // Bonus voucher input
  const [voucherCode, setVoucherCode] = useState("");

  // Email verification states
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [isEmailOtpVerifying, setIsEmailOtpVerifying] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [emailVerifyCodeState, setEmailVerifyCodeState] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");
  const [emailVerifyCountdown, setEmailVerifyCountdown] = useState(120);

  // Forgot Password modal flow states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtpCode, setForgotOtpCode] = useState("");
  const [forgotSentOtpCode, setForgotSentOtpCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotOtpTimer, setForgotOtpTimer] = useState(120);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "new_password">("email");

  // Settings integrations states
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [mcpTab, setMcpTab] = useState<"local" | "cloud" | "sse">("local");
  const [copiedMcpConfig, setCopiedMcpConfig] = useState(false);
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
    return `${base}/webhooks/instagram`;
  });
  const [isIgConnected] = useState(true);

  // CRM/Sheets states
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [sheetsEnabled, setSheetsEnabled] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [bitrixEnabled, setBitrixEnabled] = useState(false);
  const [bitrixUrl, setBitrixUrl] = useState("");
  const [amoEnabled, setAmoEnabled] = useState(false);
  const [amoUrl, setAmoUrl] = useState("");

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<"crm" | "apikeys" | "mcp">("crm");
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);

  // Custom Meta App States for B2B
  const [showCustomMeta, setShowCustomMeta] = useState(false);
  const [customMetaPageId, setCustomMetaPageId] = useState("");
  const [customMetaUsername, setCustomMetaUsername] = useState("");
  const [customMetaAppId, setCustomMetaAppId] = useState("");
  const [customMetaAppSecret, setCustomMetaAppSecret] = useState("");
  const [customMetaAccessToken, setCustomMetaAccessToken] = useState("");
  const [customMetaLoading, setCustomMetaLoading] = useState(false);

  // Instagram OAuth states
  const [oAuthWaiting, setOAuthWaiting] = useState(false);

  // Modals & alerts
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isChannelDeleteModalOpen, setIsChannelDeleteModalOpen] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Telegram Link Bot Form
  const [tgToken, setTgToken] = useState("");
  const [tgName, setTgName] = useState("");
  const [tgUsername, setTgUsername] = useState("");

  // Team Collaboration state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  // Timers
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cardStep === "otp" && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cardStep, otpTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isEmailVerificationPending && emailVerifyCountdown > 0) {
      interval = setInterval(() => {
        setEmailVerifyCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEmailVerificationPending, emailVerifyCountdown]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isForgotModalOpen && forgotStep === "otp" && forgotOtpTimer > 0) {
      interval = setInterval(() => {
        setForgotOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isForgotModalOpen, forgotStep, forgotOtpTimer]);

  // Load user session and params on mount
  useEffect(() => {
    const user = db.syncCurrentUserSession() || db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setName(user.fullName);
      setEmail(user.email);
      setTeamMembers([
        { id: user.id || "owner", name: user.fullName, email: user.email, role: "Egasi" }
      ]);
      // Load credits from server
      db.getAiCreditsFromServer(user.id || "guest").then((data) => {
        if (data) setAiCreditsData(data);
      });
    }

    refreshChannels();

    // Check or generate API Key
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("replai_api_key");
      if (stored) {
        setApiKey(stored);
      } else {
        const newKey = `sk_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        localStorage.setItem("replai_api_key", newKey);
        setApiKey(newKey);
        db.saveToServer();
      }
    }

    // Set active tab based on query params
    const searchParams = new URLSearchParams(window.location.search);
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      setActiveSection(sectionParam);
    } else {
      const savedSection = localStorage.getItem("settings_active_section");
      if (savedSection) {
        setActiveSection(savedSection);
      } else {
        setActiveSection("profile");
      }
    }

    const connectParam = searchParams.get("connect");
    if (connectParam) {
      setModal("choose");
    }

    const handleDbUpdate = () => {
      const u = db.getCurrentUser();
      if (u) {
        setCurrentUser(u);
        setChannelsCount(db.getChannels().length);
        setActiveAutomationsCount(db.getAllAutomations().filter(a => a.active).length);
        db.getAiCreditsFromServer(u.id || "guest").then((data) => {
          if (data) setAiCreditsData(data);
        });
      }
      refreshChannels();
    };

    window.addEventListener("replai-db-update", handleDbUpdate);
    return () => {
      window.removeEventListener("replai-db-update", handleDbUpdate);
    };
  }, []);

  // Update localStorage when section changes
  useEffect(() => {
    if (typeof window !== "undefined" && activeSection) {
      localStorage.setItem("settings_active_section", activeSection);
    }
  }, [activeSection]);

  const refreshChannels = () => {
    const list = db.getChannels();
    setChannels(list);
    setChannelsCount(list.length);
    setActiveAutomationsCount(db.getAllAutomations().filter(a => a.active).length);
    
    if (list.length > 0 && !selectedBotId) {
      setSelectedBotId(list[0].id);
    }
  };

  // Load integration settings when selected bot changes
  useEffect(() => {
    const botId = selectedBotId || undefined;
    const botSettings = db.getBotSettings(botId);
    setSheetsEnabled(botSettings.sheetsEnabled || false);
    setSheetsUrl(botSettings.sheetsWebhookUrl || "");
    setBitrixEnabled(botSettings.bitrixEnabled || false);
    setBitrixUrl(botSettings.bitrixWebhookUrl || "");
    setAmoEnabled(botSettings.amoEnabled || false);
    setAmoUrl(botSettings.amoWebhookUrl || "");
  }, [selectedBotId]);

  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" = "success", callback: (() => void) | null = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertCallback(() => callback);
    setIsAlertOpen(true);
  };

  const handleAlertClose = () => {
    setIsAlertOpen(false);
    if (alertCallback) {
      alertCallback();
      setAlertCallback(null);
    }
  };

  // Profile management functions
  const validatePasswordStrength = (pass: string): string => {
    if (pass.length < 8) return "Parol kamida 8 ta belgidan iborat bo'lishi kerak.";
    if (!/[A-Z]/.test(pass)) return "Parolda kamida bitta bosh harf (A-Z) bo'lishi kerak.";
    if (!/[a-z]/.test(pass)) return "Parolda kamida bitta kichik harf (a-z) bo'lishi kerak.";
    if (!/[0-9]/.test(pass)) return "Parolda kamida bitta raqam (0-9) bo'lishi kerak.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Parolda kamida bitta maxsus belgi (!@#$%^&*...) bo'lishi kerak.";
    return "";
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert(t("common.error"), "Ism maydoni bo'sh bo'lishi mumkin emas.", "error");
      return;
    }

    if (currentUser) {
      const users = db.getUsers();
      const idx = users.findIndex(u => u.email === currentUser.email);

      if (idx > -1) {
        users[idx].fullName = name.trim();
        localStorage.setItem("replai_users", JSON.stringify(users));
      }
      
      const updatedUser = { ...currentUser, fullName: name.trim() };
      localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      
      await db.saveToServer();
      showAlert(t("common.success"), t("pages.account.general.success_message") || "Profil sozlamalari muvaffaqiyatli saqlandi!");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentUser) return;

    // Verify current password
    const hashedOld = db.hashPassword(oldPassword);
    if (currentUser.password && hashedOld !== currentUser.password) {
      setPasswordError("Hozirgi parol noto'g'ri kiritildi.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Yangi parollar mos kelmadi.");
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError("Yangi parol eski parol bilan bir xil bo'lmasligi kerak.");
      return;
    }

    const strengthErr = validatePasswordStrength(newPassword);
    if (strengthErr) {
      setPasswordError(strengthErr);
      return;
    }

    setPasswordLoading(true);
    try {
      // Update in local DB
      const users = db.getUsers();
      const idx = users.findIndex(u => u.email === currentUser.email);
      const hashedNew = db.hashPassword(newPassword);
      if (idx > -1) {
        users[idx].password = hashedNew;
        localStorage.setItem("replai_users", JSON.stringify(users));
      }

      const updatedUser = { ...currentUser, password: hashedNew };
      localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      setPasswordSuccess("Parol muvaffaqiyatli yangilandi!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await db.saveToServer();
    } catch (err) {
      setPasswordError("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Card linking & billing functions
  const handleGetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");
    
    const rawNumber = cardNumInput.replace(/\s/g, "");
    if (rawNumber.length < 16) {
      setCardError(t("pages.account.billing.card_input_error") || "Karta raqami noto'g'ri.");
      return;
    }
    if (cardExpiryInput.length < 5) {
      setCardError(t("pages.account.billing.expiry_input_error") || "Muddati noto'g'ri.");
      return;
    }

    setCardStep("otp");
    setOtpTimer(120);
    showAlert(t("pages.account.billing.sms_sent") || "SMS yuborildi", t("pages.account.billing.sms_sent_msg") || "Tasdiqlash kodi telefoningizga SMS orqali yuborildi.");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");

    if (otpCode.length < 4) {
      setCardError(t("pages.account.billing.otp_input_error") || "Kodni kiriting.");
      return;
    }

    const res = db.linkCard(cardNumInput, cardExpiryInput, otpCode);
    if (res.success) {
      setCurrentUser(db.getCurrentUser());
      setCardNumInput("");
      setCardExpiryInput("");
      setCardCvcInput("");
      setOtpCode("");
      setCardStep("card");
      setIsLinking(false);
      showAlert(t("common.success") || "Muvaffaqiyatli", t("pages.account.billing.link_success") || "Karta muvaffaqiyatli ulandi!");
    } else {
      setCardError(res.error || t("pages.account.billing.otp_error") || "Kod noto'g'ri.");
    }
  };

  const handleUnlinkCard = () => {
    db.unlinkCard();
    if (currentUser) {
      const updated = { ...currentUser, plan: "free" as const, isCardLinked: false, cardNumber: undefined };
      setCurrentUser(updated);
      localStorage.setItem("replai_current_user", JSON.stringify(updated));
    }
    showAlert(t("common.cancel") || "Bekor qilindi", t("pages.account.billing.card_unlink_success") || "Karta muvaffaqiyatli o'chirildi.");
  };

  const handleSelectPlan = (plan: "free" | "pro" | "premium" | "business" | "vip") => {
    if (plan !== "free" && !currentUser?.isCardLinked) {
      setIsPricingOpen(false);
      showAlert(
        t("pages.account.billing.card_required_title") || "Karta ulanmagan", 
        t("pages.account.billing.card_required_msg") || "Tarifni sotib olish uchun avval to'lov kartasini ulashingiz kerak.",
        "warning",
        () => {
          setActiveSection("billing");
          setIsLinking(true);
        }
      );
      return;
    }
    db.updatePlan(plan);
    const updated = db.getCurrentUser();
    setCurrentUser(updated);
    setIsPricingOpen(false);
    showAlert(t("pages.account.billing.plan_updated") || "Tarif yangilandi", (t("pages.account.billing.plan_updated_msg") || "Sizning tarifingiz {plan} ga yangilandi.").replace("{plan}", plan.toUpperCase()));
  };

  // Buy Credits & Voucher Functions
  const handleBuyCredits = async (amount: number, price: number, name: string) => {
    setProcessingPurchase(true);
    setIsBuyCreditsModalOpen(false);

    try {
      const res = await fetch(`/api/credits?userId=${currentUser?.id || "guest"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_credits", amount, price, packageName: name })
      });
      const data = await res.json();
      setProcessingPurchase(false);

      if (res.ok) {
        setAiCreditsData(data);
        localStorage.setItem("replai_ai_credits_data", JSON.stringify(data));
        window.dispatchEvent(new Event("replai-db-update"));
        showAlert("Muvaffaqiyatli", `${amount.toLocaleString()} AI krediti balansingizga muvaffaqiyatli qo'shildi.`);
      } else {
        showAlert(t("common.error"), data.error || "Xarid amalga oshmadi.", "error");
      }
    } catch (err) {
      setProcessingPurchase(false);
      showAlert(t("common.error"), "Tarmoq ulanishida xatolik yuz berdi.", "error");
    }
  };

  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim();
    if (!code) return;

    try {
      const res = await fetch(`/api/credits?userId=${currentUser?.id || "guest"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem_voucher", code })
      });
      const data = await res.json();
      if (res.ok) {
        setAiCreditsData(data);
        localStorage.setItem("replai_ai_credits_data", JSON.stringify(data));
        window.dispatchEvent(new Event("replai-db-update"));
        showAlert(t("pages.account.bonuses.success_title") || "Muvaffaqiyatli", `"${code.toUpperCase()}" promokodi muvaffaqiyatli faollashtirildi! Hisobingizga ${data.history[0]?.amount?.toLocaleString("uz-UZ")} kredit qo'shildi.`);
        setVoucherCode("");
      } else {
        showAlert(t("common.error"), data.error || "Promokodni faollashtirishda xatolik yuz berdi.", "error");
      }
    } catch (err) {
      showAlert(t("common.error"), "Tarmoq ulanishida xatolik yuz berdi.", "error");
    }
  };

  // Forgot password verification code handlers
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail.trim()) {
      setForgotError("Iltimos, elektron pochtangizni kiriting.");
      return;
    }

    const users = db.getUsers();
    const userExists = users.some(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
    if (!userExists) {
      setForgotError("Ushbu elektron pochta manzili tizimda ro'yxatdan o'tmagan.");
      return;
    }

    setForgotLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotSentOtpCode(code);
        setForgotStep("otp");
        setForgotOtpTimer(120);
        setForgotSuccess("Tasdiqlash kodi elektron pochtangizga yuborildi.");
      } else {
        setForgotError(data.error || "Kodni yuborishda xatolik yuz berdi.");
      }
    } catch (err) {
      setForgotError("Tarmoq xatoligi yuz berdi.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (forgotOtpTimer <= 0) {
      setForgotError("Kodni kiritish vaqti tugadi. Qaytadan kod yuboring.");
      return;
    }

    if (forgotOtpCode !== forgotSentOtpCode) {
      setForgotError("Tasdiqlash kodi noto'g'ri.");
      return;
    }

    setForgotStep("new_password");
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Parollar mos kelmadi.");
      return;
    }

    const strengthError = validatePasswordStrength(forgotNewPassword);
    if (strengthError) {
      setForgotError(strengthError);
      return;
    }

    setForgotLoading(true);
    try {
      const users = db.getUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
      const hashed = db.hashPassword(forgotNewPassword);
      if (idx > -1) {
        users[idx].password = hashed;
        localStorage.setItem("replai_users", JSON.stringify(users));

        if (currentUser && currentUser.email.toLowerCase() === forgotEmail.trim().toLowerCase()) {
          const updatedUser = { ...currentUser, password: hashed };
          localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
      }

      await db.saveToServer();
      showAlert("Muvaffaqiyatli", "Parolingiz muvaffaqiyatli yangilandi!", "success");
      setIsForgotModalOpen(false);
      
      setForgotEmail("");
      setForgotOtpCode("");
      setForgotSentOtpCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotStep("email");
    } catch (err) {
      setForgotError("Parolni yangilashda xatolik yuz berdi.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Integration settings handlers
  const handleSaveIntegration = async (type: "sheets" | "bitrix" | "amo") => {
    const botId = selectedBotId || undefined;
    const loadedSettings = db.getBotSettings(botId);
    
    if (type === "sheets") {
      loadedSettings.sheetsEnabled = sheetsEnabled;
      loadedSettings.sheetsWebhookUrl = sheetsUrl.trim();
    } else if (type === "bitrix") {
      loadedSettings.bitrixEnabled = bitrixEnabled;
      loadedSettings.bitrixWebhookUrl = bitrixUrl.trim();
    } else if (type === "amo") {
      loadedSettings.amoEnabled = amoEnabled;
      loadedSettings.amoWebhookUrl = amoUrl.trim();
    }

    db.saveBotSettings(loadedSettings, botId);
    await db.saveToServer();
    showAlert(t("common.success"), "Integratsiya sozlamalari muvaffaqiyatli saqlandi.");
  };

  const handleRegenerateApiKey = () => {
    const newKey = `sk_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    localStorage.setItem("replai_api_key", newKey);
    setApiKey(newKey);
    db.saveToServer();
    showAlert(tr("new_key_title"), tr("new_key_desc"));
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleConfirmClear = () => {
    db.clearAllData();
    setIsClearModalOpen(false);
    showAlert(t("common.success"), t("pages.settings_page.delete_success"), "success", () => {
      window.location.href = "/login";
    });
  };

  const handleConfirmDeleteChannel = () => {
    if (!channelToDelete) return;
    db.removeChannel(channelToDelete.id);
    refreshChannels();
    setIsChannelDeleteModalOpen(false);
    setChannelToDelete(null);
    setDeleteConfirmInput("");
    setActiveSection("profile");
    showAlert(t("common.success"), t("pages.settings_page.delete_success"));
  };

  const handleExportDatabase = () => {
    try {
      const data = db.exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `sendly_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showAlert(t("common.success"), t("pages.settings_page.export_success"));
    } catch {
      showAlert(t("common.error"), t("common.error"), "error");
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsedData = JSON.parse(fileContent);
        const success = db.importData(parsedData);
        if (success) {
          showAlert(t("common.success"), t("pages.settings_page.import_success"), "success", () => {
            window.location.reload();
          });
        } else {
          showAlert(t("common.error"), "Noto'g'ri zaxira fayli shakli.", "error");
        }
      } catch {
        showAlert(t("common.error"), "Faylni o'qishda xatolik yuz berdi.", "error");
      }
    };
    fileReader.readAsText(file);
  };

  // Channels addition handlers
  const handleInstagramLogin = async () => {
    if (!currentUser?.id) {
      showAlert(t("common.error"), t("pages.settings_page.invalid_session"), "error");
      return;
    }

    setOAuthWaiting(true);
    const width = 580;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    try {
      const tokenRes = await fetch(`/api/auth/token?userId=${currentUser.id}`);
      if (!tokenRes.ok) throw new Error("Token olishda xatolik yuz berdi");
      const { token: jwtToken } = await tokenRes.json();

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
      window.open(
        `${backendUrl}/oauth/instagram/start?token=${jwtToken}`,
        "instagram_oauth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );
    } catch (err: unknown) {
      setOAuthWaiting(false);
      showAlert(t("common.error"), t("pages.settings_page.ig_link_error") + ": " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleConnectCustomMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMetaPageId || !customMetaUsername || !customMetaAppId || !customMetaAppSecret || !customMetaAccessToken) {
      showAlert(t("common.error"), "Barcha majburiy maydonlarni to'ldiring.", "warning");
      return;
    }

    setCustomMetaLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
    const jwtToken = typeof window !== "undefined" ? localStorage.getItem("replai_token") : "";

    try {
      const response = await fetch(`${backendUrl}/oauth/instagram/custom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          instagramPageId: customMetaPageId.trim(),
          username: customMetaUsername.trim().replace(/^@+/, ""),
          customMetaAppId: customMetaAppId.trim(),
          customMetaAppSecret: customMetaAppSecret.trim(),
          customMetaAccessToken: customMetaAccessToken.trim(),
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Ulanishda xatolik yuz berdi");
      }

      const newCh = db.addChannel({
        type: "instagram",
        name: customMetaUsername.trim().replace(/^@+/, ""),
        username: customMetaUsername.trim().replace(/^@+/, ""),
        isConnected: true,
        followersCount: "0",
        isCustomMeta: true,
        customMetaAppId: customMetaAppId.trim(),
      });

      await db.saveToServer();

      setModal(null);
      setShowCustomMeta(false);
      setCustomMetaPageId("");
      setCustomMetaUsername("");
      setCustomMetaAppId("");
      setCustomMetaAppSecret("");
      setCustomMetaAccessToken("");

      refreshChannels();
      setActiveSection(newCh.id);
      showAlert(t("common.success"), "B2B Custom Meta akkaunti muvaffaqiyatli ulandi!");
    } catch (err: any) {
      console.error("[Connect Custom Meta] Error:", err);
      showAlert(t("common.error"), err.message || "Xatolik yuz berdi", "error");
    } finally {
      setCustomMetaLoading(false);
    }
  };

  const handleLinkTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgToken.trim()) {
      showAlert(t("common.error"), "Iltimos, bot tokenini kiriting.", "warning");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken.trim()}/getMe`);
      if (res.ok) {
        const data = await res.json();
        const botName = data.result.first_name;
        const botUsername = data.result.username;

        const newCh = db.addChannel({
          type: "telegram",
          name: botName,
          username: botUsername,
          isConnected: true,
          telegramToken: tgToken.trim(),
        });

        const saveRes = await db.saveToServer();
        if (saveRes && !saveRes.success) {
          db.removeChannel(newCh.id);
          refreshChannels();
          showAlert(t("common.error"), saveRes.error || "Saqlashda xatolik yuz berdi", "error");
          setSaving(false);
          return;
        }

        setTgToken("");
        setTgName("");
        setTgUsername("");
        setModal(null);
        setSaving(false);
        refreshChannels();
        setActiveSection(newCh.id);
        showAlert(t("common.success"), t("pages.settings_page.tg_link_success") || "Telegram bot muvaffaqiyatli ulandi!");
      } else {
        showAlert(t("common.error"), "Noto'g'ri Telegram Token. Iltimos, tekshirib qaytadan urinib ko'ring.", "error");
        setSaving(false);
      }
    } catch (err) {
      console.error("Failed to fetch bot info from Telegram:", err);
      showAlert(t("common.error"), "Telegram serveriga ulanishda xatolik yuz berdi. Tarmoqni tekshiring.", "error");
      setSaving(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailStr = inviteEmail.trim();
    if (!emailStr) return;

    setInviting(true);
    setTimeout(() => {
      setInviting(false);
      const newMember = {
        id: `member-${Date.now()}`,
        name: emailStr.split("@")[0],
        email: emailStr,
        role: "Operator"
      };
      setTeamMembers([...teamMembers, newMember]);
      setInviteEmail("");
      showAlert(t("common.success"), "Taklifnoma muvaffaqiyatli yuborildi!");
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AppLayout>
      <PageHeader 
        title={t("pages.settings.title") || "Sozlamalar"} 
        breadcrumbs={t("pages.settings.breadcrumb") || "Boshqaruv / Sozlamalar"} 
      />

      <div className="flex flex-col md:flex-row bg-white rounded-[24px] border border-[#D8D8D8] min-h-[calc(100vh-180px)] overflow-hidden shadow-sm mt-3">
        {/* Left Column: Settings Sidebar */}
        <div className="w-full md:w-[260px] shrink-0 border-b md:border-b-0 md:border-r border-[#E8E8E8] flex flex-col justify-between bg-white p-4 md:p-5">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="hidden md:block">
              <h2 className="text-[17px] font-bold text-black px-2">{t("pages.settings.title") || "Sozlamalar"}</h2>
            </div>

            <div className="flex md:flex-col gap-2 md:gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-2 md:pb-0 w-full">
              <button
                onClick={() => setActiveSection("profile")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "profile"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("nav.my_account") || "Mening akkauntim"}
              </button>

              <button
                onClick={() => setActiveSection("billing")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "billing"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.billing") || "To'lov va tariflar"}
              </button>

              <button
                onClick={() => setActiveSection("limits")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "limits"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.limits") || "Limitlar"}
              </button>

              <button
                onClick={() => setActiveSection("bonuses")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "bonuses"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.bonuses") || "Bonuslar"}
              </button>

              <button
                onClick={() => setActiveSection("integrations")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "integrations"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.settings.tab_integrations") || "Integratsiyalar"}
              </button>

              <button
                onClick={() => setActiveSection("team")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "team"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.settings_page.team") || "Jamoa"}
              </button>

              <button
                onClick={() => setActiveSection("system")}
                className={`flex items-center shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeSection === "system"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.settings_page.db_manage") || "Tizim sozlamalari"}
              </button>
            </div>

            {/* Connected Accounts Section */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2 mb-1 select-none">
                <span className="text-[10px] font-bold text-[#909090] uppercase tracking-wider">
                  {t("pages.settings_page.accounts") || "Ulangan Botlar"}
                </span>
                <button
                  onClick={() => setModal("choose")}
                  className="text-[#707070] hover:text-black hover:bg-[#F0F0F0] rounded-full p-0.5 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
                {channels.length === 0 ? (
                  <span className="text-[11px] text-[#a0a0a0] px-2 italic py-1">{t("pages.settings_page.no_channel") || "Ulanmagan"}</span>
                ) : (
                  channels.map((ch) => {
                    const isSelected = activeSection === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setActiveSection(ch.id)}
                        className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] transition-colors text-left ${
                          isSelected
                            ? "bg-[#C7F33C]/20 text-black font-bold"
                            : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                        }`}
                      >
                        <div
                          className={`grid h-5 w-5 place-items-center rounded-full shrink-0 ${
                            ch.type === "instagram"
                              ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
                              : "bg-[#229ED9]"
                          }`}
                        >
                          {ch.type === "instagram" ? (
                            <Instagram size={10} className="text-white" />
                          ) : (
                            <Bot size={10} className="text-white" />
                          )}
                        </div>
                        <span className="text-[12px] truncate">{ch.username}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#a0a0a0] text-center pt-4 border-t border-[#F0F0F0] select-none">
            v1.0.0 · Sendly
          </div>
        </div>

        {/* Right Column: Settings Content */}
        <div className="flex-1 p-8 md:p-10 bg-white overflow-y-auto">
          {/* 1. PROFILE TAB */}
          {activeSection === "profile" && (
            <div className="max-w-[600px] flex flex-col gap-8 animate-in fade-in duration-200">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.account.general.title") || "Umumiy sozlamalar"}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">{t("pages.account.general.desc") || "Profilingiz ma'lumotlarini o'zgartiring"}</p>
              </div>

              <form onSubmit={handleSaveGeneral} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">{t("pages.account.general.name") || "Ism va Familiya"}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black font-semibold"
                    placeholder={t("pages.account.general.name_placeholder") || "Ismingiz"}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">{t("pages.account.general.email") || "Elektron pochta"}</label>
                  <input
                    type="email"
                    value={email}
                    disabled={true}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-[#707070] bg-[#F5F5F5] cursor-not-allowed font-semibold"
                    placeholder="email@example.com"
                  />
                  <p className="text-[10px] text-[#909090]">Elektron pochta manzilini o'zgartirib bo'lmaydi.</p>
                </div>

                <Button type="submit" variant="accent" className="py-3 px-6 text-[12px] font-bold self-start rounded-xl">
                  {t("pages.settings.save_settings") || "Saqlash"}
                </Button>
              </form>

              <hr className="border-[#F0F0F0]" />

              {/* Change Password Block */}
              <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                <div>
                  <h4 className="text-[16px] font-bold text-black">{t("pages.account.general.password") || "Parolni o'zgartirish"}</h4>
                  <p className="text-[11px] text-[#707070] mt-1">Profilingiz xavfsizligini ta'minlash uchun parolni yangilang.</p>
                </div>

                {passwordError && (
                  <div className="p-3 text-[12px] bg-red-50 text-red-600 border border-red-150 rounded-xl font-bold">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 text-[12px] bg-emerald-50 text-emerald-600 border border-emerald-150 rounded-xl font-bold">
                    {passwordSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">Joriy parol</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black font-semibold"
                    placeholder="••••••"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">Yangi parol</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black font-semibold"
                      placeholder="••••••"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">Parolni tasdiqlash</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black font-semibold"
                      placeholder="••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 w-full">
                  <Button 
                    type="submit" 
                    disabled={passwordLoading} 
                    variant="primary" 
                    className="py-3 px-6 text-[12px] font-bold rounded-xl flex items-center gap-2"
                  >
                    {passwordLoading && <Loader2 size={13} className="animate-spin" />}
                    {t("pages.account.general.password") || "Parolni o'zgartirish"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(currentUser?.email || "");
                      setForgotStep("email");
                      setForgotError("");
                      setForgotSuccess("");
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[12px] font-bold text-black hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Parolni unutdim
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. BILLING TAB */}
          {activeSection === "billing" && (
            <div className="max-w-[650px] flex flex-col gap-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-[28px] font-bold text-black">{t("pages.account.tabs.billing") || "To'lov va tariflar"}</h3>
                  <p className="text-[13px] text-[#707070] mt-1.5">Hisob-kitob va obuna tariflarini boshqaring</p>
                </div>
                <Button 
                  onClick={() => setIsPricingOpen(true)} 
                  variant="accent" 
                  className="rounded-full px-5 py-2.5 text-[12px] font-bold shrink-0 self-start sm:self-auto"
                >
                  Tarifni almashtirish
                </Button>
              </div>

              {/* Current Subscription Status */}
              <Card className="border border-[#D8D8D8] p-6 bg-neutral-50/50">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#909090] uppercase tracking-wider">Joriy obuna</span>
                    <span className="text-[22px] font-black text-black uppercase">{currentUser?.plan || "FREE"}</span>
                    <span className="text-[11px] text-[#707070] mt-1">
                      {currentUser?.plan === "free" ? "Cheklangan bepul xizmat ko'rsatish rejasi." : "Barcha imkoniyatlar faollashtirilgan premium tarif."}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-black text-[#C7F33C] text-[10px] font-extrabold uppercase rounded-full select-none">
                    {currentUser?.plan === "free" ? "Free" : "VIP Pro"}
                  </div>
                </div>
              </Card>

              {/* Linked Card Details */}
              <div className="flex flex-col gap-4">
                <h4 className="text-[15px] font-bold text-black flex items-center gap-2">
                  <CreditCard size={18} />
                  <span>To'lov kartalari</span>
                </h4>

                {currentUser?.isCardLinked ? (
                  <Card className="border border-[#D8D8D8] p-5 flex items-center justify-between bg-white hover:border-black transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-12 rounded-[8px] bg-neutral-100 flex items-center justify-center text-neutral-600 font-extrabold text-[12px] uppercase select-none border">
                        {isUzCardOrHumo ? "CARD" : "VISA"}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-black">
                          {currentUser.cardNumber || "Karta ulangan"}
                        </p>
                        <p className="text-[10px] text-[#707070] mt-0.5">Avtomatik hisob-kitoblar faollashtirilgan.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsUnlinkModalOpen(true)}
                      className="text-red-500 hover:text-red-700 text-[12px] font-bold bg-transparent border-none cursor-pointer p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      O'chirish
                    </button>
                  </Card>
                ) : (
                  <Card className="border border-dashed border-[#D8D8D8] p-6 text-center flex flex-col items-center justify-center gap-4 bg-neutral-50/20">
                    <p className="text-[12px] text-[#707070] max-w-[360px]">
                      Hech qanday to'lov kartasi ulanmagan. Premium tariflarni sotib olish uchun karta kiriting.
                    </p>
                    <Button 
                      onClick={() => {
                        setIsLinking(true);
                        setCardStep("card");
                        setCardNumInput("");
                        setCardExpiryInput("");
                        setCardError("");
                      }} 
                      variant="primary" 
                      className="px-5 py-2.5 rounded-full text-[12px] font-bold"
                    >
                      + Karta ulash
                    </Button>
                  </Card>
                )}
              </div>

              {/* Card Linking Input Block */}
              {isLinking && (
                <Card className="border border-black p-6 animate-in slide-in-from-top-4 duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-4">
                    <h4 className="text-[15px] font-black text-black">To'lov kartasini bog'lash</h4>
                    <button 
                      onClick={() => setIsLinking(false)} 
                      className="text-[#707070] hover:text-black p-1 hover:bg-[#F5F5F5] rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {cardError && (
                    <div className="p-3 text-[12px] bg-red-50 text-red-600 border border-red-150 rounded-xl mb-4 font-bold">
                      {cardError}
                    </div>
                  )}

                  {cardStep === "card" ? (
                    <form onSubmit={handleGetOtp} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#707070] uppercase">Karta raqami</label>
                        <input
                          type="text"
                          value={cardNumInput}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            val = val.match(/.{1,4}/g)?.join(" ") || val;
                            setCardNumInput(val.slice(0, 19));
                          }}
                          placeholder="8600 0000 0000 0000"
                          className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black font-mono font-bold focus:outline-none focus:border-black"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-[#707070] uppercase">Muddati</label>
                          <input
                            type="text"
                            value={cardExpiryInput}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "");
                              if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2, 4);
                              setCardExpiryInput(val.slice(0, 5));
                            }}
                            placeholder="MM/YY"
                            className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black font-mono font-bold focus:outline-none focus:border-black text-center"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-[#707070] uppercase">CVC/CVV</label>
                          <input
                            type="password"
                            value={cardCvcInput}
                            onChange={(e) => setCardCvcInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
                            disabled={isUzCardOrHumo}
                            placeholder={isUzCardOrHumo ? "Sart emas" : "123"}
                            className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black font-mono font-bold focus:outline-none focus:border-black text-center disabled:bg-neutral-100 disabled:text-[#A0A0A0]"
                          />
                        </div>
                      </div>

                      <Button type="submit" variant="primary" className="py-3 mt-2 text-[12px] font-bold rounded-xl">
                        Tasdiqlash kodini olish
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                      <div className="p-3 text-[12px] bg-amber-50 text-amber-700 border border-amber-200 rounded-xl">
                        Karta raqami bog'langan telefon raqamga SMS kod yuborildi. Kodni kiriting:
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#707070] uppercase">SMS kod</label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[16px] text-black font-mono font-black text-center focus:outline-none focus:border-black tracking-widest"
                          required
                        />
                        <p className="text-[10px] text-[#909090] text-center mt-1.5">
                          Kodni qayta yuborish: {formatTimer(otpTimer)}
                        </p>
                      </div>

                      <div className="flex gap-2.5">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => setCardStep("card")} 
                          className="flex-1 py-3 text-[12px] font-bold rounded-xl"
                        >
                          Orqaga
                        </Button>
                        <Button 
                          type="submit" 
                          variant="accent" 
                          className="flex-1 py-3 text-[12px] font-bold rounded-xl"
                        >
                          Karta bog'lash
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* 3. LIMITS TAB */}
          {activeSection === "limits" && (
            <div className="max-w-[650px] flex flex-col gap-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-[28px] font-bold text-black">{t("pages.account.tabs.limits") || "Limitlar"}</h3>
                  <p className="text-[13px] text-[#707070] mt-1.5">Sizning joriy foydalanish va AI limitlaringiz</p>
                </div>
                <Button 
                  onClick={() => setIsBuyCreditsModalOpen(true)} 
                  variant="primary" 
                  disabled={processingPurchase}
                  className="rounded-full px-5 py-2.5 text-[12px] font-bold shrink-0 self-start sm:self-auto flex items-center gap-2"
                >
                  {processingPurchase && <Loader2 size={13} className="animate-spin" />}
                  AI Kredit sotib olish
                </Button>
              </div>

              {/* Limit Widget 1: AI Credits */}
              <Card className="border border-[#D8D8D8] p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-[10px] bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                      <Coins size={18} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-black">Sun'iy Intellekt (AI) limiti</h4>
                      <p className="text-[10px] text-[#909090] mt-0.5">Xabarlarga javob qaytarish krediti</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-black text-black">{aiCreditsData.balance.toLocaleString()}</span>
                    <span className="text-[11px] text-[#707070] font-bold ml-1">kredit</span>
                  </div>
                </div>

                <div className="w-full bg-[#E5E5E5] rounded-full h-2.5 overflow-hidden mt-1">
                  <div 
                    className="bg-[#C7F33C] h-full rounded-full transition-all duration-300"
                    style={{ width: `${aiCreditsData.balance + aiCreditsData.used > 0 ? Math.round((aiCreditsData.balance / (aiCreditsData.balance + aiCreditsData.used)) * 100) : 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-[#707070] font-bold uppercase tracking-wider">
                  <span>Jami sarflangan: {aiCreditsData.used.toLocaleString()}</span>
                  <span>Balans: {aiCreditsData.balance.toLocaleString()}</span>
                </div>
              </Card>

              {/* Limit Widget 2: Channels */}
              <Card className="border border-[#D8D8D8] p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-[10px] bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-black">Ulangan kanallar soni</h4>
                      <p className="text-[10px] text-[#909090] mt-0.5">Mavjud Telegram/Instagram bot ulanishlari</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-black text-black">{channelsCount}</span>
                    <span className="text-[11px] text-[#707070] font-bold ml-1">
                      / {currentUser?.plan === "vip" ? "10" : currentUser?.plan === "business" ? "5" : currentUser?.plan === "premium" ? "3" : "1"}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#E5E5E5] rounded-full h-2.5 overflow-hidden mt-1">
                  <div 
                    className="bg-black h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (channelsCount / (currentUser?.plan === "vip" ? 10 : currentUser?.plan === "business" ? 5 : currentUser?.plan === "premium" ? 3 : 1)) * 100)}%`
                    }}
                  />
                </div>
              </Card>

              {/* Limit Widget 3: Automations */}
              <Card className="border border-[#D8D8D8] p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-[10px] bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <ZapIcon size={18} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-black">Faol bot ssenariylari (Automations)</h4>
                      <p className="text-[10px] text-[#909090] mt-0.5">Aktiv holatdagi avtomatlashtirish ssenariylari</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-black text-black">{activeAutomationsCount}</span>
                    <span className="text-[11px] text-[#707070] font-bold ml-1">
                      / {currentUser?.plan === "vip" ? "50" : currentUser?.plan === "business" ? "25" : currentUser?.plan === "premium" ? "20" : "5"}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#E5E5E5] rounded-full h-2.5 overflow-hidden mt-1">
                  <div 
                    className="bg-purple-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (activeAutomationsCount / (currentUser?.plan === "vip" ? 50 : currentUser?.plan === "business" ? 25 : currentUser?.plan === "premium" ? 20 : 5)) * 100)}%`
                    }}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* 4. BONUSES TAB */}
          {activeSection === "bonuses" && (
            <div className="max-w-[650px] flex flex-col gap-8 animate-in fade-in duration-200">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.account.tabs.bonuses") || "Bonuslar va Promokodlar"}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">Maxsus kodlarni faollashtiring yoki bepul AI kreditlarni oling</p>
              </div>

              {/* Promo code redemption card */}
              <Card className="border border-[#D8D8D8] p-6">
                <form onSubmit={handleVoucherSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#707070] uppercase">Voucher yoki Promokod</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="SENDLY_GIFT_10K"
                        className="flex-1 rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] font-bold focus:outline-none focus:border-black placeholder:font-medium placeholder:text-neutral-400"
                        required
                      />
                      <Button type="submit" variant="accent" className="px-6 py-3 text-[12px] font-bold shrink-0">
                        Faollashtirish
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>

              {/* Credit History Table */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[16px] font-bold text-black">Hisob tarixi</h4>
                <Card className="overflow-hidden border border-[#D8D8D8] p-0 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                          <th className="py-3 px-5">Turi</th>
                          <th className="py-3 px-5">Miqdori</th>
                          <th className="py-3 px-5">Izoh</th>
                          <th className="py-3 px-5 text-right">Sana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiCreditsData.history.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-[12px] text-[#909090] italic">
                              Hozircha kredit harakatlari tarixi mavjud emas.
                            </td>
                          </tr>
                        ) : (
                          aiCreditsData.history.map((h, i) => (
                            <tr key={i} className="border-b border-[#F0F0F0] text-[12px] text-black">
                              <td className="py-3.5 px-5">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  h.amount > 0 ? "text-[#7CA607] bg-[#C7F33C]/20" : "text-red-600 bg-red-50"
                                }`}>
                                  {h.amount > 0 ? "Kirim" : "Chiqim"}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 font-bold">
                                {h.amount > 0 ? `+${h.amount.toLocaleString()}` : h.amount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-5 text-[#707070]">{h.description}</td>
                              <td className="py-3.5 px-5 text-[#909090] text-right">{h.date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 5. INTEGRATIONS TAB */}
          {activeSection === "integrations" && (
            <div className="max-w-[680px] w-full flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Integration Sub-tabs */}
              <div className="flex gap-2.5 pb-2.5 w-full mt-1 overflow-x-auto scrollbar-none select-none border-b border-[#E8E8E8]/50">
                <button
                  onClick={() => setActiveIntegrationTab("crm")}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer border-none ${
                    activeIntegrationTab === "crm"
                      ? "bg-black text-[#C7F33C] shadow-sm font-black"
                      : "bg-[#F5F5F5] hover:bg-neutral-200 text-[#707070] hover:text-black"
                  }`}
                >
                  CRM & Jadvallar
                </button>
                <button
                  onClick={() => setActiveIntegrationTab("apikeys")}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer border-none ${
                    activeIntegrationTab === "apikeys"
                      ? "bg-black text-[#C7F33C] shadow-sm font-black"
                      : "bg-[#F5F5F5] hover:bg-neutral-200 text-[#707070] hover:text-black"
                  }`}
                >
                  API Kalitlari
                </button>
                <button
                  onClick={() => setActiveIntegrationTab("mcp")}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer border-none ${
                    activeIntegrationTab === "mcp"
                      ? "bg-black text-[#C7F33C] shadow-sm font-black"
                      : "bg-[#F5F5F5] hover:bg-neutral-200 text-[#707070] hover:text-black"
                  }`}
                >
                  Model Context Protocol (MCP)
                </button>
              </div>

              {/* CRM integrations tab */}
              {activeIntegrationTab === "crm" && (
                <div className="flex flex-col gap-6 max-w-[650px] w-full">
                  {channels.length > 0 ? (
                    <Card className="border border-[#D8D8D8] bg-[#F9F9F7] p-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[12px] font-bold text-black uppercase tracking-wider">
                          {t("pages.settings_page.integrations_select_bot") || "Kanal/Botni tanlang"}
                        </label>
                        <CustomDropdown
                          value={selectedBotId}
                          onChange={(val) => setSelectedBotId(val)}
                          options={channels.map((ch) => ({
                            value: ch.id,
                            label: `${ch.type === "telegram" ? "Telegram" : "Instagram"}: ${ch.username}`
                          }))}
                        />
                      </div>
                    </Card>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[12px] text-center font-semibold">
                      Integratsiyalarni sozlash uchun avval hisobingizga bitta kanal/bot ulanishi kerak.
                    </div>
                  )}

                  {/* Google Sheets */}
                  <Card className="border border-[#D8D8D8]">
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-green-500/10 text-green-600 shrink-0">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-[16px] font-bold text-black">{t("pages.settings_page.sheets_title") || "Google Sheets Integratsiyasi"}</h3>
                            <p className="mt-1 text-[12px] text-[#707070]">
                              {t("pages.settings_page.sheets_desc") || "Lid ma'lumotlarini avtomatik Google jadvalingizga yuboring"}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={sheetsEnabled}
                            onChange={(e) => setSheetsEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>

                      {sheetsEnabled && (
                        <div className="flex flex-col gap-4 border-t border-[#F0F0F0] pt-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-medium text-[#707070] px-1">
                              Webhook URL manzili
                            </label>
                            <input
                              type="url"
                              value={sheetsUrl}
                              onChange={(e) => setSheetsUrl(e.target.value)}
                              placeholder="https://oapi.make.com/... yoki https://script.google.com/..."
                              className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold"
                            />
                          </div>

                          <Button
                            onClick={() => handleSaveIntegration("sheets")}
                            variant="accent"
                            className="flex items-center justify-center gap-1.5 py-2.5 px-5 text-[12px] font-bold self-start rounded-xl"
                          >
                            <Save size={14} />
                            <span>{t("common.save") || "Saqlash"}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Bitrix24 */}
                  <Card className="border border-[#D8D8D8]">
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-blue-500/10 text-blue-600 shrink-0">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-[16px] font-bold text-black">{t("pages.settings_page.bitrix_title") || "Bitrix24 Integratsiyasi"}</h3>
                            <p className="mt-1 text-[12px] text-[#707070]">
                              {t("pages.settings_page.bitrix_desc") || "Kontaktlarni Bitrix24 CRM tizimiga inbound webhook orqali yuboring"}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={bitrixEnabled}
                            onChange={(e) => setBitrixEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>

                      {bitrixEnabled && (
                        <div className="flex flex-col gap-4 border-t border-[#F0F0F0] pt-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-medium text-[#707070] px-1">
                              Webhook URL manzili
                            </label>
                            <input
                              type="url"
                              value={bitrixUrl}
                              onChange={(e) => setBitrixUrl(e.target.value)}
                              placeholder="https://b24-xxxxxx.bitrix24.ru/rest/1/xxxxxxxx/crm.lead.add.json"
                              className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold"
                            />
                          </div>

                          <Button
                            onClick={() => handleSaveIntegration("bitrix")}
                            variant="accent"
                            className="flex items-center justify-center gap-1.5 py-2.5 px-5 text-[12px] font-bold self-start rounded-xl"
                          >
                            <Save size={14} />
                            <span>{t("common.save") || "Saqlash"}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* AmoCRM */}
                  <Card className="border border-[#D8D8D8]">
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-amber-500/10 text-amber-600 shrink-0">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 2 7 12 12 22 7 12 2" />
                              <polyline points="2 17 12 22 22 17" />
                              <polyline points="2 12 12 17 22 12" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-[16px] font-bold text-black">{t("pages.settings_page.amo_title") || "AmoCRM Integratsiyasi"}</h3>
                            <p className="mt-1 text-[12px] text-[#707070]">
                              {t("pages.settings_page.amo_desc") || "Kontaktlarni AmoCRM tizimiga webhook orqali lid sifatida yo'naltiring"}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={amoEnabled}
                            onChange={(e) => setAmoEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>

                      {amoEnabled && (
                        <div className="flex flex-col gap-4 border-t border-[#F0F0F0] pt-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-medium text-[#707070] px-1">
                              Webhook URL manzili
                            </label>
                            <input
                              type="url"
                              value={amoUrl}
                              onChange={(e) => setAmoUrl(e.target.value)}
                              placeholder="https://yourdomain.amocrm.ru/api/v4/leads"
                              className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold"
                            />
                          </div>

                          <Button
                            onClick={() => handleSaveIntegration("amo")}
                            variant="accent"
                            className="flex items-center justify-center gap-1.5 py-2.5 px-5 text-[12px] font-bold self-start rounded-xl"
                          >
                            <Save size={14} />
                            <span>{t("common.save") || "Saqlash"}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* API keys integration tab */}
              {activeIntegrationTab === "apikeys" && (
                <div className="flex flex-col gap-6 max-w-[650px] w-full animate-in fade-in duration-150">
                  <Card className="border border-[#D8D8D8]">
                    <div className="flex flex-col gap-5">
                      <div>
                        <h3 className="text-[16px] font-bold text-black">{tr("api_keys")}</h3>
                        <p className="mt-1 text-[12px] text-[#707070]">
                          {t("pages.settings_page.api_keys_desc") || "Tashqi integratsiyalar uchun API kalitlarini boshqaring"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[#707070] uppercase">
                          {t("pages.settings_page.api_key_label") || "Mavjud API kaliti"}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type={showKey ? "text" : "password"}
                            value={apiKey}
                            readOnly
                            className="flex-1 rounded-[10px] bg-[#F5F5F5] border border-[#D8D8D8] px-4 py-3 text-[13px] font-mono text-black select-all outline-none"
                          />
                          <button
                            onClick={() => setShowKey(!showKey)}
                            className="grid h-[44px] w-[44px] place-items-center rounded-[10px] border border-[#D8D8D8] hover:bg-neutral-50 transition-colors text-[#707070]"
                          >
                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={handleCopyApiKey}
                            className="grid h-[44px] w-[44px] place-items-center rounded-[10px] border border-[#D8D8D8] hover:bg-neutral-50 transition-colors text-[#707070]"
                          >
                            {copiedKey ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <Button
                        onClick={handleRegenerateApiKey}
                        variant="primary"
                        className="py-3 px-5 text-[12px] font-bold self-start rounded-xl"
                      >
                        {tr("regenerate_btn")}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* MCP settings tab */}
              {activeIntegrationTab === "mcp" && (
                <div className="flex flex-col gap-6 max-w-[650px] w-full animate-in fade-in duration-150">
                  <Card className="border border-[#D8D8D8]">
                    <div className="flex flex-col gap-5">
                      <div>
                        <h3 className="text-[16px] font-bold text-black">Model Context Protocol (MCP) Server</h3>
                        <p className="mt-1 text-[12px] text-[#707070]">
                          Sendly platformasini Cursor, Windsurf, Gemini, yoki Claude desktop agentlariga ulash. Tizimdagi botlar, kontaktlar, ssenariylarni to'g'ridan-to'g'ri AI muharriringizdan boshqaring.
                        </p>
                      </div>

                      {/* Sub tab selectors for MCP */}
                      <div className="flex bg-[#EFF2FC] p-1 rounded-xl gap-1 w-full max-w-[280px]">
                        <button
                          onClick={() => setMcpTab("local")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all border-none cursor-pointer ${
                            mcpTab === "local" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black"
                          }`}
                        >
                          Cursor / Claude
                        </button>
                        <button
                          onClick={() => setMcpTab("cloud")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all border-none cursor-pointer ${
                            mcpTab === "cloud" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black"
                          }`}
                        >
                          SSE / Cloud
                        </button>
                      </div>

                      {mcpTab === "local" ? (
                        <div className="flex flex-col gap-4 border-t border-[#F0F0F0] pt-4 animate-in fade-in duration-150">
                          <p className="text-[12px] text-[#707070] leading-relaxed">
                            Cursor yoki Claude Desktop dasturining sozlamalar fayliga (settings json) quyidagi konfiguratsiyani qo'shing:
                          </p>
                          <div className="relative">
                            <pre className="p-4 rounded-[14px] bg-[#1E1E1E] text-[#D4D4D4] font-mono text-[10px] overflow-x-auto leading-relaxed select-all">
{`"mcpServers": {
  "sendly": {
    "command": "npx",
    "args": [
      "-y",
      "@isroiljohn-creator/sendly-mcp-server"
    ],
    "env": {
      "SENDLY_API_KEY": "${apiKey}"
    }
  }
}`}
                            </pre>
                            <button
                              onClick={() => {
                                const config = `"mcpServers": {\n  "sendly": {\n    "command": "npx",\n    "args": [\n      "-y",\n      "@isroiljohn-creator/sendly-mcp-server"\n    ],\n    "env": {\n      "SENDLY_API_KEY": "${apiKey}"\n    }\n  }\n}`;
                                navigator.clipboard.writeText(config);
                                setCopiedMcpConfig(true);
                                setTimeout(() => setCopiedMcpConfig(false), 2000);
                              }}
                              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white rounded-md p-1.5 transition-colors border-none cursor-pointer"
                            >
                              {copiedMcpConfig ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 border-t border-[#F0F0F0] pt-4 animate-in fade-in duration-150">
                          <p className="text-[12px] text-[#707070] leading-relaxed">
                            Bulutli AI tizimlar (SSE) orqali ulanish uchun quyidagi to'g'ridan-to'g'ri bog'lanish webhook URL manzilidan foydalaning:
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={`https://api.sendly.uz/mcp/sse?token=${apiKey}`}
                              readOnly
                              className="flex-1 rounded-[10px] bg-[#F5F5F5] border border-[#D8D8D8] px-4 py-3 text-[11px] font-mono text-black select-all outline-none"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`https://api.sendly.uz/mcp/sse?token=${apiKey}`);
                                setCopiedMcpUrl(true);
                                setTimeout(() => setCopiedMcpUrl(false), 2000);
                              }}
                              className="grid h-[44px] w-[44px] place-items-center rounded-[10px] border border-[#D8D8D8] hover:bg-neutral-50 transition-colors text-[#707070]"
                            >
                              {copiedMcpUrl ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* 6. TEAM TAB */}
          {activeSection === "team" && (
            <div className="max-w-[650px] flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.settings_page.team") || "Jamoa a'zolari"}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">Loyihangiz ustida hamkorlikda ishlash uchun yangi foydalanuvchilar taklif eting</p>
              </div>

              {/* Invite member form */}
              <Card className="border border-[#D8D8D8] p-5">
                <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-black uppercase tracking-wider">Hamkorni taklif qilish (Email)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="operator@sendly.uz"
                        className="flex-1 rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black font-semibold"
                        required
                      />
                      <Button type="submit" disabled={inviting} variant="accent" className="px-6 py-3 text-[12px] font-bold shrink-0 rounded-xl flex items-center gap-1">
                        {inviting && <Loader2 size={13} className="animate-spin" />}
                        Taklif etish
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>

              {/* Team Members List */}
              <Card className="overflow-hidden border border-[#D8D8D8] p-0 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                        <th className="py-3 px-5">Ism</th>
                        <th className="py-3 px-5">Email</th>
                        <th className="py-3 px-5 text-right">Rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((m) => (
                        <tr key={m.id} className="border-b border-[#F0F0F0] text-[12px] text-black font-semibold">
                          <td className="py-3.5 px-5 text-black font-extrabold">{m.name}</td>
                          <td className="py-3.5 px-5 text-[#707070]">{m.email}</td>
                          <td className="py-3.5 px-5 text-right select-none">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              m.role === "Egasi" ? "bg-black text-[#C7F33C] border border-[#C7F33C]/20" : "bg-neutral-100 text-neutral-600"
                            }`}>
                              {m.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 7. SYSTEM SETTINGS TAB */}
          {activeSection === "system" && (
            <div className="max-w-[600px] flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.settings_page.db_manage") || "Tizim sozlamalari"}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">Loyiha ma'lumotlar bazasi va zaxira nusxalarini boshqarish</p>
              </div>

              <Card className="border border-[#D8D8D8] bg-white p-6">
                <div className="flex flex-col gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-black" />
                      <h3 className="text-[15px] font-bold text-black">
                        {t("pages.settings_page.db_manage") || "Ma'lumotlar zaxirasi"}
                      </h3>
                    </div>
                    <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                      {t("pages.settings_page.db_manage_desc") || "Tizimdagi barcha bot sozlamalari, jadvallar va suhbatlar zaxirasini yuklab olishingiz yoki yuklashingiz mumkin."}
                    </p>
                  </div>

                  {/* Backup / Export Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleExportDatabase}
                      className="flex flex-col items-center justify-center gap-3 p-5 rounded-[20px] border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-black transition-all active:scale-[0.98] group text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                        <Download size={18} />
                      </div>
                      <div>
                        <span className="text-[13px] font-bold block">{t("pages.settings_page.db_export") || "Bazani yuklab olish"}</span>
                        <span className="text-[10px] text-[#707070] block mt-0.5">{t("pages.settings_page.db_export_desc") || "Hozirgi barcha zaxirani yuklash"}</span>
                      </div>
                    </button>

                    <label className="flex flex-col items-center justify-center gap-3 p-5 rounded-[20px] border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-black transition-all active:scale-[0.98] group cursor-pointer text-center relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportDatabase}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                        <Upload size={18} />
                      </div>
                      <div>
                        <span className="text-[13px] font-bold block">{t("pages.settings_page.db_import") || "Bazani yuklash"}</span>
                        <span className="text-[10px] text-[#707070] block mt-0.5">{t("pages.settings_page.db_import_desc") || "Zaxira JSON faylini yuklash"}</span>
                      </div>
                    </label>
                  </div>

                  <hr className="border-[#F0F0F0]" />

                  {/* Reset/Clear Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-black">{t("pages.settings_page.extra_actions") || "Qo'shimcha amallar"}</span>
                      <span className="text-[10px] text-[#707070]">{t("pages.settings_page.extra_actions_desc") || "Barcha ma'lumotlarni o'chirish"}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setIsClearModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-full border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 px-4 py-2 text-[11px] font-semibold transition-all active:scale-95 bg-white cursor-pointer"
                    >
                      <Trash2 size={13} />
                      {t("pages.settings_page.clear_all") || "Barcha ma'lumotlarni o'chirish"}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 8. INDIVIDUAL BOT / CHANNEL MANAGEMENT */}
          {(() => {
            const selectedCh = channels.find((c) => c.id === activeSection);
            if (!selectedCh) return null;
            const isInstagram = selectedCh.type === "instagram";
            return (
              <div className="max-w-[650px] flex flex-col gap-8 bg-white p-6 rounded-[20px] border border-[#E8E8E8] animate-in fade-in duration-200">
                <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4">
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-full shrink-0 text-white ${
                      isInstagram
                        ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
                        : "bg-[#229ED9]"
                    }`}
                  >
                    {isInstagram ? <Instagram size={18} /> : <Bot size={18} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[#707070]">{selectedCh.username}</span>
                    {selectedCh.isCustomMeta && (
                      <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                        B2B Meta App
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h1 className="text-[26px] font-bold text-black leading-tight">Bot sozlamalari</h1>
                  <p className="text-[12px] text-[#707070] mt-1">Botning loyihadagi ulanishi va unga bog'liq ruxsatnomalarni boshqarish</p>
                </div>

                {/* Section 1: Refresh connection */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[15px] font-bold text-black">
                    {isInstagram ? t("pages.settings_page.refresh_ig_perms") || "Ruxsatlarni yangilash" : t("pages.settings_page.refresh_tg_conn") || "Ulanishni yangilash"}
                  </h3>
                  <p className="text-[13px] text-[#707070] leading-relaxed">
                    {isInstagram 
                      ? (t("pages.settings_page.ig_perms_desc") || "Instagram Direct API ruxsatnoma tokenini yangilash")
                      : (t("pages.settings_page.tg_perms_desc") || "Telegram bot ulanish tokenini yangilash")}
                  </p>
                  <button
                    disabled={refreshingPermissions}
                    onClick={() => {
                      setRefreshingPermissions(true);
                      setTimeout(() => {
                        setRefreshingPermissions(false);
                        showAlert(
                          "Muvaffaqiyatli",
                          isInstagram 
                            ? (t("pages.settings_page.refresh_success_ig") || "Ruxsatlar muvaffaqiyatli yangilandi!")
                            : (t("pages.settings_page.refresh_success_tg") || "Telegram ulanishi yangilandi!")
                        );
                      }, 1500);
                    }}
                    className="bg-black hover:bg-black/90 text-white text-[12px] font-semibold px-5 py-3 rounded-[12px] self-start transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75 cursor-pointer"
                  >
                    {refreshingPermissions ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Yangilanmoqda...</span>
                      </>
                    ) : (
                      <span>{t("pages.settings_page.refresh_btn") || "Yangilash"}</span>
                    )}
                  </button>
                </div>

                <hr className="border-[#F0F0F0]" />

                {/* Section 2: Delete Bot */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[15px] font-bold text-black">{t("pages.settings_page.remove_account") || "Botni o'chirish"}</h3>
                  <p className="text-[13px] text-[#707070] leading-relaxed">
                    Ushbu botni Sendly loyihasidan butunlay ajratish va o'chirish.
                  </p>
                  <button
                    onClick={() => {
                      setChannelToDelete(selectedCh);
                      setIsChannelDeleteModalOpen(true);
                    }}
                    className="border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 text-[12px] font-semibold px-5 py-3 rounded-[12px] self-start transition-all active:scale-95 bg-white cursor-pointer"
                  >
                    {t("pages.settings_page.remove_account") || "Botni o'chirish"}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Confirmation & Action Modals */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={t("pages.settings_page.clear_data_confirm_title") || "Ma'lumotlarni o'chirish"}
        message={t("pages.settings_page.clear_data_confirm") || "Haqiqatan ham barcha ma'lumotlarni o'chirib yubormoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."}
        confirmText="Barchasini o'chirish"
        cancelText={t("common.cancel") || "Bekor qilish"}
      />

      <ConfirmModal
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        onConfirm={handleUnlinkCard}
        title="Kartani o'chirish"
        message="Haqiqatan ham ushbu to'lov kartasini akkauntingizdan o'chirib yubormoqchimisiz? Premium tarifingiz bekor qilinadi."
        confirmText="O'chirish"
        cancelText="Bekor qilish"
      />

      {/* Pricing Upgrade Modal */}
      {isPricingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-[1200px] shadow-2xl p-6 md:p-8 border border-[#D8D8D8] animate-in fade-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-6">
              <div>
                <h3 className="text-[20px] font-black text-black">Sendly Premium tariflari</h3>
                <p className="text-[12px] text-[#707070] mt-1">Loyihangiz ehtiyojlariga qarab tarifni tanlang</p>
              </div>
              <button 
                onClick={() => setIsPricingOpen(false)} 
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Billing Cycle Switch */}
            <div className="flex justify-center mb-8">
              <div className="bg-[#F0F0F0] p-1 rounded-full flex items-center gap-1 select-none">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-5 py-2 rounded-full text-[12px] font-bold transition-all border-none cursor-pointer ${
                    billingCycle === "monthly" ? "bg-black text-[#C7F33C] shadow-xs" : "text-[#707070] hover:text-black"
                  }`}
                >
                  Oylik to'lov
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-5 py-2 rounded-full text-[12px] font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
                    billingCycle === "yearly" ? "bg-black text-[#C7F33C] shadow-xs" : "text-[#707070] hover:text-black"
                  }`}
                >
                  Yillik to'lov
                  <span className="bg-[#C7F33C] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">-20%</span>
                </button>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Pro Plan */}
              <div className="border border-[#E8E8E8] rounded-[24px] p-6 bg-[#F9F9F7] flex flex-col justify-between h-full hover:shadow-lg transition-all group">
                <div>
                  <h4 className="text-[17px] font-extrabold text-black">PRO</h4>
                  <p className="text-[11px] text-[#707070] mt-1.5">Yangi boshlovchilar va kichik bizneslar uchun.</p>
                  <div className="mt-4 flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-[28px] font-black text-black">
                      {billingCycle === "monthly" ? "147 000" : "117 600"}
                    </span>
                    <span className="text-[11px] font-bold text-[#707070]">UZS / oy</span>
                  </div>
                  <ul className="mt-6 flex flex-col gap-3 text-[11.5px] text-[#505050] font-bold list-none p-0">
                    <li className="flex items-center gap-2">✓ 1 ta faol kanal / bot</li>
                    <li className="flex items-center gap-2">✓ 5 ta bot ssenariylari</li>
                    <li className="flex items-center gap-2">✓ 1 000 AI krediti / oy</li>
                    <li className="flex items-center gap-2">✓ CRM integratsiyalari</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan("pro")}
                  className={`w-full py-3 mt-8 rounded-full text-[12px] font-bold transition-all border-none cursor-pointer ${
                    currentUser?.plan === "pro" ? "bg-black/10 text-black cursor-default" : "bg-black text-[#C7F33C] hover:bg-black/90"
                  }`}
                >
                  {currentUser?.plan === "pro" ? "Faol tarif" : "Tanlash"}
                </button>
              </div>

              {/* Premium Plan */}
              <div className="border-2 border-black rounded-[24px] p-6 bg-black text-white flex flex-col justify-between h-full relative overflow-hidden shadow-xl hover:scale-[1.01] transition-all">
                <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[9px] font-extrabold uppercase px-3 py-1 rounded-bl-[12px]">
                  Tavsiya etiladi
                </div>
                <div>
                  <h4 className="text-[17px] font-extrabold text-[#C7F33C]">Premium</h4>
                  <p className="text-[11px] text-white/60 mt-1.5">Tez o'sayotgan bizneslar va faol sotuvchilar uchun.</p>
                  <div className="mt-4 flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-[28px] font-black text-white">
                      {billingCycle === "monthly" ? "497 000" : "397 600"}
                    </span>
                    <span className="text-[11px] font-bold text-white/60">UZS / oy</span>
                  </div>
                  <ul className="mt-6 flex flex-col gap-3 text-[11.5px] text-white/80 font-bold list-none p-0">
                    <li className="flex items-center gap-2">✓ 3 ta faol kanal / bot</li>
                    <li className="flex items-center gap-2">✓ 20 ta bot ssenariylari</li>
                    <li className="flex items-center gap-2">✓ 30 000 AI krediti / oy</li>
                    <li className="flex items-center gap-2">✓ Google Sheets va CRM</li>
                    <li className="flex items-center gap-2">✓ Maxsus Meta API qo'llab-quvvatlash</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan("premium")}
                  className={`w-full py-3 mt-8 rounded-full text-[12px] font-bold transition-all border-none cursor-pointer ${
                    currentUser?.plan === "premium" ? "bg-white/10 text-white cursor-default" : "bg-[#C7F33C] text-black hover:bg-[#b5df2b]"
                  }`}
                >
                  {currentUser?.plan === "premium" ? "Faol tarif" : "Tanlash"}
                </button>
              </div>

              {/* Business Plan */}
              <div className="border border-[#E8E8E8] rounded-[24px] p-6 bg-[#F9F9F7] flex flex-col justify-between h-full hover:shadow-lg transition-all group">
                <div>
                  <h4 className="text-[17px] font-extrabold text-black">Business</h4>
                  <p className="text-[11px] text-[#707070] mt-1.5">Kengayotgan bizneslar va bir nechta filiallar uchun.</p>
                  <div className="mt-4 flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-[28px] font-black text-black">
                      {billingCycle === "monthly" ? "1 197 000" : "957 600"}
                    </span>
                    <span className="text-[11px] font-bold text-[#707070]">UZS / oy</span>
                  </div>
                  <ul className="mt-6 flex flex-col gap-3 text-[11.5px] text-[#505050] font-bold list-none p-0">
                    <li className="flex items-center gap-2">✓ 5 ta faol kanal / bot</li>
                    <li className="flex items-center gap-2">✓ 25 ta bot ssenariylari</li>
                    <li className="flex items-center gap-2">✓ 75 000 AI krediti / oy</li>
                    <li className="flex items-center gap-2">✓ Google Sheets va CRM</li>
                    <li className="flex items-center gap-2">✓ Ustuvor qo'llab-quvvatlash</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan("business")}
                  className={`w-full py-3 mt-8 rounded-full text-[12px] font-bold transition-all border-none cursor-pointer ${
                    currentUser?.plan === "business" ? "bg-black/10 text-black cursor-default" : "bg-black text-[#C7F33C] hover:bg-black/90"
                  }`}
                >
                  {currentUser?.plan === "business" ? "Faol tarif" : "Tanlash"}
                </button>
              </div>

              {/* VIP Plan */}
              <div className="border border-[#E8E8E8] rounded-[24px] p-6 bg-[#F9F9F7] flex flex-col justify-between h-full hover:shadow-lg transition-all group">
                <div>
                  <h4 className="text-[17px] font-extrabold text-black">VIP</h4>
                  <p className="text-[11px] text-[#707070] mt-1.5">Yirik agentliklar va keng qamrovli korxonalar uchun.</p>
                  <div className="mt-4 flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-[28px] font-black text-black">
                      {billingCycle === "monthly" ? "2 497 000" : "1 997 600"}
                    </span>
                    <span className="text-[11px] font-bold text-[#707070]">UZS / oy</span>
                  </div>
                  <ul className="mt-6 flex flex-col gap-3 text-[11.5px] text-[#505050] font-bold list-none p-0">
                    <li className="flex items-center gap-2">✓ 10 ta faol kanal / bot</li>
                    <li className="flex items-center gap-2">✓ 50 ta bot ssenariylari</li>
                    <li className="flex items-center gap-2">✓ 150 000 AI krediti / oy</li>
                    <li className="flex items-center gap-2">✓ Cheksiz CRM integratsiyalari</li>
                    <li className="flex items-center gap-2">✓ 24/7 shaxsiy menejer</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan("vip")}
                  className={`w-full py-3 mt-8 rounded-full text-[12px] font-bold transition-all border-none cursor-pointer ${
                    currentUser?.plan === "vip" ? "bg-black/10 text-black cursor-default" : "bg-black text-[#C7F33C] hover:bg-black/90"
                  }`}
                >
                  {currentUser?.plan === "vip" ? "Faol tarif" : "Tanlash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Credits Modal */}
      {isBuyCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-[500px] shadow-2xl p-6 md:p-8 border border-[#D8D8D8] animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-6">
              <div>
                <h3 className="text-[18px] font-black text-black">AI limitlarini sotib olish</h3>
                <p className="text-[12px] text-[#707070] mt-1">AI botingiz ishlashi uchun qo'shimcha kredit paketini tanlang</p>
              </div>
              <button 
                onClick={() => setIsBuyCreditsModalOpen(false)} 
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Package 1 */}
              <div 
                className="border border-[#E8E8E8] hover:border-black rounded-[20px] p-5 flex items-center justify-between transition-all bg-[#F9F9F7] hover:shadow-md cursor-pointer group"
                onClick={() => handleBuyCredits(10000, 100000, "Starter paket")}
              >
                <div>
                  <h4 className="text-[15px] font-bold text-black group-hover:text-[#7CA607] transition-colors">Starter paket</h4>
                  <p className="text-[11px] text-[#707070] mt-1">Kichik botlar va test qilish uchun mo'ljallangan.</p>
                  <span className="text-[20px] font-black text-black mt-2 block">10 000 <span className="text-[11px] font-bold text-[#707070]">kredit</span></span>
                </div>
                <div className="text-right">
                  <span className="bg-black text-[#C7F33C] text-[12px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm group-hover:scale-105 transition-all">
                    100 000 UZS
                  </span>
                </div>
              </div>

              {/* Package 2 */}
              <div 
                className="border border-black bg-black text-white rounded-[20px] p-5 flex items-center justify-between transition-all hover:shadow-md cursor-pointer relative overflow-hidden group"
                onClick={() => handleBuyCredits(50000, 350000, "Standart paket")}
              >
                <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[8px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-[10px]">
                  30% chegirma
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-[#C7F33C]">Standart paket</h4>
                  <p className="text-[11px] text-white/60 mt-1">O'rtacha yuklamaga ega chatbotlar uchun optimal.</p>
                  <span className="text-[20px] font-black text-white mt-2 block">50 000 <span className="text-[11px] font-bold text-white/60">kredit</span></span>
                </div>
                <div className="text-right">
                  <span className="bg-[#C7F33C] text-black text-[12px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm group-hover:scale-105 transition-all">
                    350 000 UZS
                  </span>
                </div>
              </div>

              {/* Package 3 */}
              <div 
                className="border border-[#E8E8E8] hover:border-black rounded-[20px] p-5 flex items-center justify-between transition-all bg-[#F9F9F7] hover:shadow-md cursor-pointer group"
                onClick={() => handleBuyCredits(150000, 700000, "Biznes paket")}
              >
                <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[8px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-[10px]">
                  53% chegirma
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-black group-hover:text-[#7CA607] transition-colors">Biznes paket</h4>
                  <p className="text-[11px] text-[#707070] mt-1">Faol va katta hajmdagi suhbatlar uchun eng yaxshi narx.</p>
                  <span className="text-[20px] font-black text-black mt-2 block">150 000 <span className="text-[11px] font-bold text-[#707070]">kredit</span></span>
                </div>
                <div className="text-right">
                  <span className="bg-black text-[#C7F33C] text-[12px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm group-hover:scale-105 transition-all">
                    700 000 UZS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Channel confirmation dialog */}
      {isChannelDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
          <div className="w-full max-w-[380px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-[16px] font-extrabold text-black">Kanalni o'chirishni tasdiqlang</h4>
            <p className="text-[12px] text-[#707070] mt-2 leading-relaxed">
              Botni o'chirish uchun uning foydalanuvchi nomini (<span className="font-mono font-bold text-black select-all">@{channelToDelete?.username}</span>) quyida tasdiqlang:
            </p>

            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={channelToDelete?.username || ""}
              className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[12px] text-black font-semibold mt-4 focus:outline-none focus:border-red-500 font-mono"
            />

            <div className="flex gap-2.5 mt-5">
              <Button
                onClick={() => {
                  setIsChannelDeleteModalOpen(false);
                  setChannelToDelete(null);
                  setDeleteConfirmInput("");
                }}
                variant="secondary"
                className="flex-1 py-2.5 text-[12px] font-bold rounded-xl"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={handleConfirmDeleteChannel}
                disabled={deleteConfirmInput.trim().replace(/^@+/, "") !== channelToDelete?.username?.trim().replace(/^@+/, "")}
                variant="primary"
                className="flex-1 py-2.5 text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 border-none"
              >
                O'chirish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Linked Accounts Modals (Telegram / Instagram) */}
      {modal === "choose" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] mb-5">
              <h4 className="text-[16px] font-black text-black">Yangi hisob ulash</h4>
              <button 
                onClick={() => setModal(null)} 
                className="text-[#707070] hover:text-black p-1 hover:bg-[#F5F5F5] rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Telegram Connect option */}
              <button
                onClick={() => setModal("telegram")}
                className="flex items-center justify-between w-full p-4 rounded-2xl border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-left transition-all active:scale-[0.98] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#229ED9]/10 text-[#229ED9]">
                    <Bot size={20} />
                  </div>
                  <div>
                    <span className="text-[13px] font-bold block text-black">Telegram Bot</span>
                    <span className="text-[10px] text-[#707070] block mt-0.5">Bot tokeni orqali tezda ulash</span>
                  </div>
                </div>
                <ChevronDown size={14} className="text-[#A0A0A0] -rotate-90" />
              </button>

              {/* Instagram Connect option */}
              <button
                onClick={() => setModal("instagram-choice")}
                className="flex items-center justify-between w-full p-4 rounded-2xl border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-left transition-all active:scale-[0.98] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]/10 text-pink-600">
                    <Instagram size={20} />
                  </div>
                  <div>
                    <span className="text-[13px] font-bold block text-black">Instagram Direct</span>
                    <span className="text-[10px] text-[#707070] block mt-0.5">Mijozlar bilan Instagram API ulanishi</span>
                  </div>
                </div>
                <ChevronDown size={14} className="text-[#A0A0A0] -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Telegram Bot Form */}
      {modal === "telegram" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] mb-5">
              <h4 className="text-[16px] font-black text-black">Telegram botni ulash</h4>
              <button 
                onClick={() => setModal("choose")} 
                className="text-[#707070] hover:text-black p-1 hover:bg-[#F5F5F5] rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLinkTelegram} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#707070] uppercase">Bot token (HTTP API)</label>
                <input
                  type="text"
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black font-mono focus:outline-none focus:border-black font-semibold"
                  required
                />
                <p className="text-[10px] text-[#909090] leading-relaxed">
                  BotFather orqali olingan API kalitni kiriting.
                </p>
              </div>

              <div className="flex gap-2.5 mt-2">
                <Button
                  type="button"
                  onClick={() => setModal("choose")}
                  variant="secondary"
                  className="flex-1 py-3 text-[12px] font-bold rounded-xl"
                >
                  Orqaga
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  variant="accent"
                  className="flex-1 py-3 text-[12px] font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  Ulash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instagram Choice Modal */}
      {modal === "instagram-choice" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
          <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] mb-5">
              <h4 className="text-[16px] font-black text-black">Instagram ulash turini tanlang</h4>
              <button 
                onClick={() => setModal("choose")} 
                className="text-[#707070] hover:text-black p-1 hover:bg-[#F5F5F5] rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Cloud Auto OAuth (Standard Meta App) */}
              <button
                disabled={oAuthWaiting}
                onClick={handleInstagramLogin}
                className="flex items-center justify-between w-full p-4 rounded-2xl border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-left transition-all active:scale-[0.98] group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/10 text-blue-600">
                    {oAuthWaiting ? <Loader2 size={20} className="animate-spin" /> : <Instagram size={20} />}
                  </div>
                  <div>
                    <span className="text-[13px] font-bold block text-black">Standart ulanish (Avtomatik)</span>
                    <span className="text-[10px] text-[#707070] block mt-0.5">Meta orqali tezkor va xavfsiz avtorizatsiya</span>
                  </div>
                </div>
                <ChevronDown size={14} className="text-[#A0A0A0] -rotate-90" />
              </button>

              {/* Custom Facebook App Credentials (B2B Custom App) */}
              <button
                onClick={() => {
                  setModal(null);
                  setShowCustomMeta(true);
                }}
                className="flex items-center justify-between w-full p-4 rounded-2xl border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-left transition-all active:scale-[0.98] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-green-500/10 text-green-600">
                    <Lock size={18} />
                  </div>
                  <div>
                    <span className="text-[13px] font-bold block text-black">Shaxsiy Meta Ilova (Custom App)</span>
                    <span className="text-[10px] text-[#707070] block mt-0.5">Sizning shaxsiy Facebook App kalitlaringiz orqali</span>
                  </div>
                </div>
                <ChevronDown size={14} className="text-[#A0A0A0] -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Meta App Credentials Connection Modal */}
      {showCustomMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4 overflow-y-auto">
          <div className="w-full max-w-[480px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200 relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] mb-5">
              <h4 className="text-[16px] font-black text-black">Meta Developer App ulanishi</h4>
              <button 
                onClick={() => {
                  setShowCustomMeta(false);
                  setModal("instagram-choice");
                }} 
                className="text-[#707070] hover:text-black p-1 hover:bg-[#F5F5F5] rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConnectCustomMeta} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#707070] uppercase">Instagram Sahifa ID (Page ID)</label>
                <input
                  type="text"
                  value={customMetaPageId}
                  onChange={(e) => setCustomMetaPageId(e.target.value.replace(/\D/g, ""))}
                  placeholder="1092837498273"
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[13px] text-black font-semibold focus:outline-none focus:border-black"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#707070] uppercase">Instagram Foydalanuvchi nomi</label>
                <input
                  type="text"
                  value={customMetaUsername}
                  onChange={(e) => setCustomMetaUsername(e.target.value)}
                  placeholder="@koko_uz"
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[13px] text-black font-semibold focus:outline-none focus:border-black"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#707070] uppercase">App ID (Meta Application ID)</label>
                <input
                  type="text"
                  value={customMetaAppId}
                  onChange={(e) => setCustomMetaAppId(e.target.value.replace(/\D/g, ""))}
                  placeholder="3541119396039485"
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[13px] text-black font-semibold focus:outline-none focus:border-black"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#707070] uppercase">App Secret (Meta App Secret)</label>
                <input
                  type="password"
                  value={customMetaAppSecret}
                  onChange={(e) => setCustomMetaAppSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[13px] text-black font-semibold focus:outline-none focus:border-black"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#707070] uppercase">Facebook Page Access Token</label>
                <textarea
                  value={customMetaAccessToken}
                  onChange={(e) => setCustomMetaAccessToken(e.target.value)}
                  placeholder="EAAZB..."
                  rows={3}
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[12px] text-black font-mono focus:outline-none focus:border-black leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCustomMeta(false);
                    setModal("instagram-choice");
                  }}
                  variant="secondary"
                  className="flex-1 py-3 text-[12px] font-bold rounded-xl"
                >
                  Orqaga
                </Button>
                <Button
                  type="submit"
                  disabled={customMetaLoading}
                  variant="accent"
                  className="flex-1 py-3 text-[12px] font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  {customMetaLoading && <Loader2 size={13} className="animate-spin" />}
                  Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] rounded-[24px] bg-white p-7 border border-[#D8D8D8] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] mb-5">
              <h3 className="text-[16px] font-bold text-black">Parolni tiklash</h3>
              <button 
                onClick={() => setIsForgotModalOpen(false)} 
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-[10px] text-[12px] font-semibold mb-4">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-[10px] text-[12px] font-semibold mb-4">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === "email" && (
              <form onSubmit={handleForgotSendOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase">Elektron pochta</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <Button type="submit" disabled={forgotLoading} variant="primary" className="w-full py-3 text-[12px] font-bold rounded-[10px] flex items-center justify-center gap-2">
                  {forgotLoading && <Loader2 size={13} className="animate-spin" />}
                  Kod yuborish
                </Button>
              </form>
            )}

            {forgotStep === "otp" && (
              <form onSubmit={handleForgotVerifyOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase">Tasdiqlash kodi</label>
                  <input
                    type="text"
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(e.target.value)}
                    placeholder="6 xonali kod"
                    maxLength={6}
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black font-semibold text-center tracking-widest focus:outline-none focus:border-black bg-white"
                  />
                  <p className="text-[11px] text-[#707070] text-center">
                    {forgotOtpTimer > 0 ? `Kod ${forgotOtpTimer} soniyada yaroqsiz bo'ladi` : "Kod muddati tugadi"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep("email")}
                    className="flex-1 py-3 text-[12px] font-bold rounded-[10px] bg-[#F0F0F0] text-black hover:bg-[#E8E8E8] transition-colors"
                  >
                    Orqaga
                  </button>
                  <Button type="submit" className="flex-1 py-3 text-[12px] font-bold rounded-[10px] bg-black text-white hover:bg-black/90">
                    Tasdiqlash
                  </Button>
                </div>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    disabled={forgotOtpTimer > 0 || forgotLoading}
                    onClick={handleForgotSendOtp}
                    className="text-[11px] font-bold text-[#707070] hover:text-black hover:underline disabled:opacity-40"
                  >
                    Kodni qayta yuborish
                  </button>
                </div>
              </form>
            )}

            {forgotStep === "new_password" && (
              <form onSubmit={handleForgotResetPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase">Yangi parol</label>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Kamida 8 ta belgi"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase">Yangi parolni tasdiqlash</label>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Qayta kiriting"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black bg-white"
                  />
                </div>

                <Button type="submit" disabled={forgotLoading} variant="primary" className="w-full py-3 text-[12px] font-bold rounded-[10px] flex items-center justify-center gap-2">
                  {forgotLoading && <Loader2 size={13} className="animate-spin" />}
                  Parolni yangilash
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Alert Overlay */}
      <AlertModal
        isOpen={isAlertOpen}
        onClose={handleAlertClose}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
      />
    </AppLayout>
  );
}

// Simple internal icon to replace Lucide since it is missing
function ZapIcon({ size = 16, className = "" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      stroke="currentColor" 
      strokeWidth="2" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
