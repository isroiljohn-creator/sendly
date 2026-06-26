"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, StatusPill, ConfirmModal, AlertModal } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Save, Database, Trash2, Plus, Bot, X, CheckCircle, ChevronDown, Download, Upload, Eye, EyeOff, Copy, RefreshCw, Check } from "lucide-react";
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
  const [activeSection, setActiveSection] = useState<string>("general");

  // Preserve activeSection state on reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSection = localStorage.getItem("settings_active_section");
      if (savedSection) {
        setActiveSection(savedSection);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("settings_active_section", activeSection);
    }
  }, [activeSection]);

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [mcpTab, setMcpTab] = useState<"local" | "cloud" | "sse">("local");
  const [copiedMcpConfig, setCopiedMcpConfig] = useState(false);
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://api.sendly.uz/webhooks/instagram");
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

  // Listen to Meta OAuth messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
      const allowedOrigins = [window.location.origin];
      try {
        allowedOrigins.push(new URL(backendUrl).origin);
      } catch {
        console.error("Invalid NEXT_PUBLIC_BACKEND_URL:", backendUrl);
      }

      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data?.type === "INSTAGRAM_CONNECTED") {
        const { username, name, followers } = event.data;

        // Limit checks removed. Channel pricing dynamically increases by 150,000 UZS/month for each additional account beyond the plan.

        const newCh = db.addChannel({
          type: "instagram",
          name: name || username,
          username: username,
          isConnected: true,
          followersCount: followers || "0",
        });

        setModal(null);
        setOAuthWaiting(false);
        refreshChannels();
        setActiveSection(newCh.id);
        showAlert(t("common.success"), t("pages.settings_page.ig_link_success"));
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, []);

  useEffect(() => {
    if (modal !== "instagram") {
      setOAuthWaiting(false);
    }
  }, [modal]);



  const handleInstagramLogin = async () => {
    if (!currentUser?.id) {
      showAlert(t("common.error"), t("pages.settings_page.invalid_session"));
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
      showAlert(t("common.error"), t("pages.settings_page.ig_link_error") + ": " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConnectCustomMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMetaPageId || !customMetaUsername || !customMetaAppId || !customMetaAppSecret || !customMetaAccessToken) {
      showAlert(t("common.error"), "Barcha majburiy maydonlarni to'ldiring.");
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

      // Add channel locally on frontend database
      const newCh = db.addChannel({
        type: "instagram",
        name: customMetaUsername.trim().replace(/^@+/, ""),
        username: customMetaUsername.trim().replace(/^@+/, ""),
        isConnected: true,
        followersCount: "0",
        isCustomMeta: true,
        customMetaAppId: customMetaAppId.trim(),
      });

      // Sync settings database to server
      await db.saveToServer();

      setModal(null);
      setShowCustomMeta(false);
      // Reset form states
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
      showAlert(t("common.error"), err.message || "Xatolik yuz berdi");
    } finally {
      setCustomMetaLoading(false);
    }
  };


  // Telegram connection form
  const [tgToken, setTgToken] = useState("");
  const [tgName, setTgName] = useState("");
  const [tgUsername, setTgUsername] = useState("");



  // Modal states
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isChannelDeleteModalOpen, setIsChannelDeleteModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Team members state — initialized from real current user in useEffect
  const [teamMembers, setTeamMembers] = useState<{id: string; name: string; email: string; role: string}[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Administrator");

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;

    setInviting(true);
    try {
      const newMember = {
        id: `m_${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole
      };
      
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          inviterName: currentUser?.fullName || "Workspace Egasi"
        })
      });

      if (!res.ok) {
        throw new Error("Pochta jo'natish xatoligi");
      }

      setTeamMembers([...teamMembers, newMember]);
      setInviteEmail("");
      showAlert(t("common.success"), t("pages.settings_page.team_title") + " (" + inviteEmail + ")");
    } catch (err: any) {
      console.error("Invite member failed:", err);
      showAlert(t("common.error"), err.message || "Xatolik yuz berdi");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, role: newRole } : m));
    showAlert(t("common.success"), t("common.success"));
  };
  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  const refreshChannels = () => {
    const chs = db.getChannels();
    setChannels(chs);
    if (chs.length > 0 && !selectedBotId) {
      setSelectedBotId(chs[0].id);
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
    const saveRes = await db.saveToServer();
    
    if (saveRes && saveRes.success) {
      showAlert(t("common.success"), t("pages.settings_page.integration_saved") || "Integratsiya sozlamalari muvaffaqiyatli saqlandi");
    } else {
      showAlert(t("common.error"), saveRes.error || "Xatolik yuz berdi");
    }
  };

  useEffect(() => {
    const user = db.syncCurrentUserSession() || db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setName(user.fullName);
      setEmail(user.email);
      // Initialize team with real current user as Owner
      setTeamMembers([
        { id: user.id || "owner", name: user.fullName, email: user.email, role: "Egasi" }
      ]);
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

    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      if (tabParam === "subscription" || tabParam === "billing") {
        window.location.href = "/account?tab=billing";
      } else {
        setActiveSection(tabParam === "profile" ? "general" : tabParam);
      }
    }

    const connectParam = searchParams.get("connect");
    if (connectParam) {
      setModal("choose");
    }

    window.addEventListener("replai-db-update", refreshChannels);
    return () => {
      window.removeEventListener("replai-db-update", refreshChannels);
    };
  }, []);

  const handleRegenerateKey = () => {
    const newKey = `sk_test_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    localStorage.setItem("replai_api_key", newKey);
    setApiKey(newKey);
    db.saveToServer();
    showAlert(tr("new_key_title"), tr("new_key_desc"));
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showAlert(tr("copied_title"), tr("copied_desc"));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Save updated name/email
    const users = db.getUsers();
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx > -1) {
      users[idx].fullName = name;
      users[idx].email = email;
      localStorage.setItem("replai_users", JSON.stringify(users));
    }
    
    const updatedUser = { ...currentUser, fullName: name, email };
    localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    showAlert(t("common.success"), t("toast.success"));
  };



  const handleConfirmClear = () => {
    db.clearAllData();
    window.location.reload();
  };



  // Instagram connection is now handled securely via Facebook login flow

  const handleAddTelegram = async () => {
    const cleanToken = tgToken.trim();
    if (!cleanToken) return;

    // 1. Check plan limits beforehand
    const user = db.getCurrentUser();
    const plan = user?.plan || "free";
    const maxChannels = plan === "vip" ? 10 : 1;
    const currentChannels = db.getChannels();
    if (currentChannels.length >= maxChannels) {
      showAlert(t("common.error"), `Sizning tarifingizda kanallar soni cheklangan (Maksimal: ${maxChannels}). Iltimos, tarifingizni yangilang.`);
      return;
    }

    // Validate token format
    const tokenRegex = /^[0-9]+:[a-zA-Z0-9_-]+$/;
    if (!tokenRegex.test(cleanToken)) {
      showAlert(t("common.error"), "Noto'g'ri Telegram Token. Iltimos, haqiqiy token kiriting.");
      return;
    }

    setSaving(true);
    try {
      const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      if (!getMeRes.ok) {
        const errorText = await getMeRes.text();
        console.error("Telegram API returned error:", getMeRes.status, errorText);
        showAlert(t("common.error"), "Kiritilgan token bo'yicha bot topilmadi. Iltimos, haqiqiy token kiriting.");
        setSaving(false);
        return;
      }
      
      const getMeData = await getMeRes.json();
      if (getMeData.ok && getMeData.result) {
        const botUsername = getMeData.result.username;
        const botName = getMeData.result.first_name;

        const newCh = db.addChannel({
          type: "telegram",
          name: botName || botUsername,
          username: botUsername.startsWith("@") ? botUsername : `@${botUsername}`,
          telegramToken: cleanToken,
          isConnected: true,
          followersCount: "0",
        });

        // Await server-side sync to verify it was saved successfully
        const saveRes = await db.saveToServer();
        if (saveRes && !saveRes.success) {
          // Revert locally
          db.removeChannel(newCh.id);
          refreshChannels();
          showAlert(t("common.error"), saveRes.error || "Saqlashda xatolik yuz berdi");
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
        showAlert(t("common.success"), t("pages.settings_page.tg_link_success"));
      } else {
        showAlert(t("common.error"), "Noto'g'ri Telegram Token. Iltimos, tekshirib qaytadan urinib ko'ring.");
        setSaving(false);
      }
    } catch (err) {
      console.error("Failed to fetch bot info from Telegram:", err);
      showAlert(t("common.error"), "Telegram serveriga ulanishda xatolik yuz berdi. Tarmoqni tekshiring.");
      setSaving(false);
    }
  };

  const handleConfirmDeleteChannel = () => {
    if (!channelToDelete) return;
    db.removeChannel(channelToDelete.id);
    refreshChannels();
    setIsChannelDeleteModalOpen(false);
    setChannelToDelete(null);
    setDeleteConfirmInput("");
    setActiveSection("general");
    showAlert(t("common.success"), t("pages.settings_page.delete_success"));
  };

  const handleExportDatabase = () => {
    try {
      const data = db.exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `sendly_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showAlert(t("common.success"), t("pages.settings_page.export_success"));
    } catch {
      showAlert(t("common.error"), t("common.error"));
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
          showAlert(t("common.success"), t("pages.settings_page.import_success"));
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showAlert(t("common.error"), t("pages.settings_page.import_error"));
        }
      } catch {
        showAlert(t("common.error"), t("common.error"));
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("pages.settings.title")}
          breadcrumbs={t("pages.settings.breadcrumb")}
        />

        <div className="flex bg-white rounded-[24px] border border-[#D8D8D8] min-h-[calc(100vh-180px)] overflow-hidden shadow-sm">
          {/* Left Column: Settings Sub-sidebar */}
          <div className="w-[260px] shrink-0 border-r border-[#E8E8E8] flex flex-col justify-between bg-white p-5">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-[17px] font-bold text-black px-2">{t("pages.settings.title")}</h2>
              </div>

              {/* Workspace Section */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#909090] uppercase tracking-wider px-2 mb-1">
                  {t("pages.settings_page.workspace_section")}
                </span>
                <button
                  onClick={() => {
                    window.location.href = "/account";
                  }}
                  className="flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-[#707070] hover:bg-[#F9F9F7] hover:text-black text-left"
                >
                  {t("nav.my_account")}
                </button>
                <button
                  onClick={() => setActiveSection("general")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "general"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.general")}
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/contacts";
                  }}
                  className="flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-[#707070] hover:bg-[#F9F9F7] hover:text-black text-left"
                >
                  {t("pages.settings_page.contacts")}
                </button>
                <button
                  onClick={() => setActiveSection("integrations")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "integrations"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings.tab_integrations")}
                </button>
                <button
                  onClick={() => setActiveSection("team")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "team"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.team")}
                </button>
                <button
                  onClick={() => setActiveSection("apikeys")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "apikeys"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.apikeys")}
                </button>
                <button
                  onClick={() => setActiveSection("mcp")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "mcp"
                    ? "bg-[#C7F33C]/20 text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.tab_mcp")}
                </button>
              </div>

              {/* Accounts Section */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-bold text-[#909090] uppercase tracking-wider">
                    {t("pages.settings_page.accounts")}
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
                    <span className="text-[11px] text-[#a0a0a0] px-2 italic py-1">{t("pages.settings_page.no_channel")}</span>
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

            <div className="text-[10px] text-[#a0a0a0] text-center pt-4 border-t border-[#F0F0F0]">
              v1.0.0 · Sendly
            </div>
          </div>

          {/* Right Column: Settings Content */}
          <div className="flex-1 p-8 md:p-10 bg-white overflow-y-auto">
            {/* General Tab */}
            {activeSection === "general" && (
              <div className="flex flex-col gap-6 max-w-[600px]">
                {/* Database Backup & Management Option */}
                <Card className="border border-[#D8D8D8] bg-white">
                  <div className="flex flex-col gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-black" />
                        <h3 className="text-[15px] font-medium text-black">
                          {t("pages.settings_page.db_manage")}
                        </h3>
                      </div>
                      <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                        {t("pages.settings_page.db_manage_desc")}
                      </p>
                    </div>

                    {/* Import & Export Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Export Button */}
                      <button
                        type="button"
                        onClick={handleExportDatabase}
                        className="flex flex-col items-center justify-center gap-3 p-5 rounded-[20px] border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-black transition-all active:scale-[0.98] group text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                          <Download size={18} />
                        </div>
                        <div>
                          <span className="text-[13px] font-bold block">{t("pages.settings_page.db_export")}</span>
                          <span className="text-[10px] text-[#707070] block mt-0.5">{t("pages.settings_page.db_export_desc")}</span>
                        </div>
                      </button>

                      {/* Import Button */}
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
                          <span className="text-[13px] font-bold block">{t("pages.settings_page.db_import")}</span>
                          <span className="text-[10px] text-[#707070] block mt-0.5">{t("pages.settings_page.db_import_desc")}</span>
                        </div>
                      </label>
                    </div>

                    <hr className="border-[#F0F0F0]" />

                    {/* Reset Actions (Secondary) */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-black">{t("pages.settings_page.extra_actions")}</span>
                        <span className="text-[10px] text-[#707070]">{t("pages.settings_page.extra_actions_desc")}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsClearModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-full border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 px-4 py-2 text-[11px] font-semibold transition-all active:scale-95"
                        >
                          <Trash2 size={13} />
                          {t("pages.settings_page.clear_all")}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            {/* Team Members Tab */}
            {activeSection === "team" && (
              <div className="max-w-[640px] flex flex-col gap-6">
                <div>
                  <h3 className="text-[28px] font-bold text-black">{t("pages.settings_page.team")}</h3>
                </div>

                {/* Invite form row */}
                <form onSubmit={handleInviteMember} className="flex gap-3 items-center mt-2 pb-6 border-b border-[#F0F0F0]">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                    placeholder={t("pages.settings_page.invite_email_placeholder")}
                  />
                  <div className="w-[150px]">
                    <CustomDropdown
                      value={inviteRole}
                      onChange={(val) => setInviteRole(val)}
                      options={[
                        { value: "Administrator", label: t("pages.settings_page.team_role_admin") },
                        { value: "Kuzatuvchi", label: t("pages.settings_page.team_role_observer") }
                      ]}
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-[44px] bg-black hover:bg-black/90 text-white font-semibold text-[13px] px-6 rounded-[10px] transition-colors"
                  >
                    {t("pages.settings_page.invite_btn")}
                  </button>
                </form>

                {/* Team members list */}
                <div className="mt-4 flex flex-col">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="py-4 flex justify-between items-center border-b border-[#F0F0F0]">
                      <div>
                        <p className="text-[14px] font-bold text-black">{member.name}</p>
                        <p className="text-[12px] text-[#707070] mt-0.5">{member.email}</p>
                      </div>
                      <div>
                        {member.role === "Egasi" ? (
                          <span className="text-[12px] font-bold text-[#5A7C1E] bg-[#C7F33C]/20 px-3 py-1.5 rounded-full select-none">
                            {t("pages.settings_page.team_role_owner")}
                          </span>
                        ) : (
                          <div className="w-[150px]">
                            <CustomDropdown
                              value={member.role}
                              onChange={(val) => handleRoleChange(member.id, val)}
                              options={[
                                { value: "Administrator", label: t("pages.settings_page.team_role_admin") },
                                { value: "Kuzatuvchi", label: t("pages.settings_page.team_role_observer") }
                              ]}
                              className="border-none bg-transparent hover:bg-black/5"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeSection === "integrations" && (
              <div className="flex flex-col gap-6 max-w-[650px]">
                {/* Bot selection dropdown if multiple channels exist */}
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
                  <div className="p-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[12px] text-center">
                    Integratsiyalarni sozlash uchun avval hisobingizga bitta kanal/bot ulanishi kerak.
                  </div>
                )}

                {/* Google Sheets Card */}
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
                          <h3 className="text-[16px] font-medium text-black">{t("pages.settings_page.sheets_title") || "Google Sheets Integratsiyasi"}</h3>
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
                            {t("pages.settings_page.webhook_url_label") || "Webhook URL manzili"}
                          </label>
                          <input
                            type="url"
                            value={sheetsUrl}
                            onChange={(e) => setSheetsUrl(e.target.value)}
                            placeholder="https://oapi.make.com/... yoki https://script.google.com/..."
                            className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                          />
                        </div>

                        <Button
                          onClick={() => handleSaveIntegration("sheets")}
                          variant="accent"
                          className="flex items-center justify-center gap-1.5 py-3 self-start text-[12px]"
                        >
                          <Save size={14} />
                          <span>{t("common.save") || "Saqlash"}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Bitrix24 Card */}
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
                          <h3 className="text-[16px] font-medium text-black">{t("pages.settings_page.bitrix_title") || "Bitrix24 Integratsiyasi"}</h3>
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
                            {t("pages.settings_page.webhook_url_label") || "Webhook URL manzili"}
                          </label>
                          <input
                            type="url"
                            value={bitrixUrl}
                            onChange={(e) => setBitrixUrl(e.target.value)}
                            placeholder="https://b24-xxxxxx.bitrix24.ru/rest/1/xxxxxxxx/crm.lead.add.json"
                            className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                          />
                        </div>

                        <Button
                          onClick={() => handleSaveIntegration("bitrix")}
                          variant="accent"
                          className="flex items-center justify-center gap-1.5 py-3 self-start text-[12px]"
                        >
                          <Save size={14} />
                          <span>{t("common.save") || "Saqlash"}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                {/* AmoCRM Card */}
                <Card className="border border-[#D8D8D8]">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-indigo-500/10 text-indigo-600 shrink-0">
                          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-[16px] font-medium text-black">{t("pages.settings_page.amo_title") || "AmoCRM Integratsiyasi"}</h3>
                          <p className="mt-1 text-[12px] text-[#707070]">
                            {t("pages.settings_page.amo_desc") || "Kontaktlarni AmoCRM tizimiga webhook orqali yo'naltiring"}
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
                            {t("pages.settings_page.webhook_url_label") || "Webhook URL manzili"}
                          </label>
                          <input
                            type="url"
                            value={amoUrl}
                            onChange={(e) => setAmoUrl(e.target.value)}
                            placeholder="https://xxxxxx.amocrm.ru/api/v4/leads"
                            className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                          />
                        </div>

                        <Button
                          onClick={() => handleSaveIntegration("amo")}
                          variant="accent"
                          className="flex items-center justify-center gap-1.5 py-3 self-start text-[12px]"
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

            {/* API Keys Tab */}
            {activeSection === "apikeys" && (
              <div className="max-w-[640px] flex flex-col gap-6 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-[28px] font-bold text-black">{tr("api_keys")}</h3>
                  <p className="text-[13px] text-[#707070] mt-1.5">{t("pages.settings_page.api_keys_desc")}</p>
                </div>

                <div className="p-5 rounded-[14px] bg-[#F9F9F7] border border-[#F0F0F0] mt-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-black uppercase tracking-wider">{t("pages.settings_page.api_key_label")}</span>
                    <span className="bg-[#C7F33C]/20 text-[#5A7C1E] text-[10px] font-bold px-2 py-0.5 rounded-full">{t("common.active")}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? "text" : "password"}
                        readOnly
                        value={apiKey}
                        className="w-full rounded-[10px] border border-[#D8D8D8] pl-4 pr-10 py-2.5 text-[13px] text-black bg-white focus:outline-none font-mono focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-black transition-colors"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      onClick={handleCopyKey}
                      className="h-[38px] bg-black hover:bg-black/80 text-white font-semibold text-[12px] px-4 rounded-[10px] transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                    >
                      {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                      <span>{t("common.copy")}</span>
                    </button>
                  </div>
                  
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={handleRegenerateKey}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={12} />
                      <span>{tr("regenerate_btn")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MCP Tab */}
            {activeSection === "mcp" && (
              <div className="max-w-[680px] flex flex-col gap-6 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-[28px] font-bold text-black">{t("pages.settings_page.mcp_title")}</h3>
                  <p className="text-[13px] text-[#707070] mt-1.5 leading-relaxed">{t("pages.settings_page.mcp_desc")}</p>
                </div>

                {/* API Key warning/info box */}
                <div className="p-4 rounded-[14px] bg-[#C7F33C]/10 border border-[#C7F33C]/20 flex items-center justify-between gap-3 text-[12px] text-black">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-black shrink-0" />
                    <span>
                      <strong>{t("pages.settings_page.mcp_api_key_info")}</strong>{" "}
                      <code className="bg-white/60 px-2 py-0.5 rounded font-mono text-[11px]">
                        {apiKey ? `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}` : "Generate a key first"}
                      </code>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      showAlert(t("common.success"), t("pages.settings_page.copied_title") || "Nusxalandi");
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{t("common.copy")}</span>
                  </button>
                </div>

                {/* Navigation inside MCP: Tabs switcher */}
                <div className="flex border-b border-[#E8E8E8] gap-6 text-[13px] font-semibold text-[#707070]">
                  <button
                    type="button"
                    onClick={() => setMcpTab("local")}
                    className={`pb-3 relative transition-colors ${
                      mcpTab === "local" ? "text-black border-b-2 border-black" : "hover:text-black"
                    }`}
                  >
                    {t("pages.settings_page.mcp_local_tab")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab("cloud")}
                    className={`pb-3 relative transition-colors ${
                      mcpTab === "cloud" ? "text-black border-b-2 border-black" : "hover:text-black"
                    }`}
                  >
                    {t("pages.settings_page.mcp_cloud_tab")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab("sse")}
                    className={`pb-3 relative transition-colors ${
                      mcpTab === "sse" ? "text-black border-b-2 border-black" : "hover:text-black"
                    }`}
                  >
                    {t("pages.settings_page.mcp_sse_tab")}
                  </button>
                </div>

                {/* Tab content */}
                <div className="mt-2">
                  {mcpTab === "local" && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                      <p className="text-[13px] text-[#707070] leading-relaxed">
                        {t("pages.settings_page.mcp_local_desc")}
                      </p>
                      
                      <div className="flex flex-col gap-3.5 bg-[#F9F9F7] border border-[#E8E8E8] p-5 rounded-[16px] text-[12px] text-[#505050]">
                        <p>{t("pages.settings_page.mcp_local_step_1")}</p>
                        <p>{t("pages.settings_page.mcp_local_step_2")}</p>
                        <p>{t("pages.settings_page.mcp_local_step_3")}</p>

                        <div className="relative mt-2 rounded-[12px] bg-black text-white p-4 font-mono text-[11px] overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => {
                              const configText = JSON.stringify({
                                "mcpServers": {
                                  "sendly-workspace": {
                                    "command": "node",
                                    "args": [
                                      "/absolute/path/to/sendly-mcp.js"
                                    ],
                                    "env": {
                                      "SENDLY_API_URL": typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
                                      "SENDLY_API_KEY": apiKey,
                                      "SENDLY_USER_ID": apiKey
                                    }
                                  }
                                }
                              }, null, 2);
                              navigator.clipboard.writeText(configText);
                              showAlert(t("common.success"), t("pages.settings_page.copied_title") || "Nusxalandi");
                            }}
                            className="absolute top-3 right-3 text-white/60 hover:text-white p-1 hover:bg-white/10 rounded transition-all"
                            title="Copy config"
                          >
                            <Copy size={14} />
                          </button>
                          <pre>{JSON.stringify({
                            "mcpServers": {
                              "sendly-workspace": {
                                "command": "node",
                                "args": [
                                  "/absolute/path/to/sendly-mcp.js"
                                ],
                                "env": {
                                  "SENDLY_API_URL": typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
                                  "SENDLY_API_KEY": apiKey,
                                  "SENDLY_USER_ID": apiKey
                                }
                              }
                            }
                          }, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {mcpTab === "cloud" && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                      <p className="text-[13px] text-[#707070] leading-relaxed">
                        {t("pages.settings_page.mcp_cloud_desc")}
                      </p>

                      <div className="flex flex-col gap-3.5 bg-[#F9F9F7] border border-[#E8E8E8] p-5 rounded-[16px] text-[12px] text-[#505050]">
                        <p>{t("pages.settings_page.mcp_cloud_step_1")}</p>
                        <p>{t("pages.settings_page.mcp_cloud_step_2")}</p>
                        
                        <div className="flex items-center gap-2 pl-4">
                          <input
                            type="text"
                            readOnly
                            value={typeof window !== "undefined" ? `${window.location.origin}/api/mcp/openapi.json` : "/api/mcp/openapi.json"}
                            className="flex-1 bg-white border border-[#D8D8D8] rounded-[8px] px-3 py-1.5 text-[11px] font-mono text-black focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const specUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp/openapi.json` : "/api/mcp/openapi.json";
                              navigator.clipboard.writeText(specUrl);
                              showAlert(t("common.success"), t("pages.settings_page.copied_title") || "Nusxalandi");
                            }}
                            className="bg-black hover:bg-black/90 text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-[8px] transition-all flex items-center gap-1 active:scale-95 shrink-0"
                          >
                            <Copy size={12} />
                            <span>{t("common.copy")}</span>
                          </button>
                        </div>

                        <p>{t("pages.settings_page.mcp_cloud_step_3")}</p>
                      </div>
                    </div>
                  )}

                  {mcpTab === "sse" && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                      <p className="text-[13px] text-[#707070] leading-relaxed">
                        {t("pages.settings_page.mcp_sse_desc")}
                      </p>

                      <div className="flex flex-col gap-3.5 bg-[#F9F9F7] border border-[#E8E8E8] p-5 rounded-[16px] text-[12px] text-[#505050]">
                        <p className="font-bold text-black">{t("pages.settings_page.mcp_sse_url_label")}</p>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={typeof window !== "undefined" ? `${window.location.origin}/api/mcp/sse?apiKey=${apiKey}` : `/api/mcp/sse?apiKey=${apiKey}`}
                            className="flex-1 bg-white border border-[#D8D8D8] rounded-[8px] px-3 py-1.5 text-[11px] font-mono text-black focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const sseUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp/sse?apiKey=${apiKey}` : `/api/mcp/sse?apiKey=${apiKey}`;
                              navigator.clipboard.writeText(sseUrl);
                              showAlert(t("common.success"), t("pages.settings_page.copied_title") || "Nusxalandi");
                            }}
                            className="bg-black hover:bg-black/90 text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-[8px] transition-all flex items-center gap-1 active:scale-95 shrink-0"
                          >
                            <Copy size={12} />
                            <span>{t("common.copy")}</span>
                          </button>
                        </div>

                        <div className="p-3 rounded-lg bg-black/5 text-[#707070] text-[11px] leading-relaxed italic text-center">
                          {t("pages.settings_page.mcp_sse_desc_note")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Channel Management Settings (matching 2nd screenshot layout) */}
            {(() => {
              const selectedCh = channels.find((c) => c.id === activeSection);
              if (!selectedCh) return null;
              const isInstagram = selectedCh.type === "instagram";
              return (
                <div className="max-w-[650px] flex flex-col gap-8 bg-white p-6 rounded-[20px] border border-[#E8E8E8]">
                  {/* Account Heading details */}
                  <div className="flex items-center gap-3">
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
                    <h1 className="text-[26px] font-bold text-black leading-tight">{t("pages.settings_page.acct_settings_title")}</h1>
                  </div>

                  {/* Section 1: Refresh Permissions */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[15px] font-bold text-black">
                      {isInstagram ? t("pages.settings_page.refresh_ig_perms") : t("pages.settings_page.refresh_tg_conn")}
                    </h3>
                    <p className="text-[13px] text-[#707070] leading-relaxed">
                      {isInstagram ? t("pages.settings_page.ig_perms_desc") : t("pages.settings_page.tg_perms_desc")}
                    </p>
                    <button
                      disabled={refreshingPermissions}
                      onClick={() => {
                        setRefreshingPermissions(true);
                        setTimeout(() => {
                          setRefreshingPermissions(false);
                          showAlert(
                            "Muvaffaqiyatli",
                            isInstagram ? t("pages.settings_page.refresh_success_ig") : t("pages.settings_page.refresh_success_tg")
                          );
                        }, 1500);
                      }}
                      className="bg-black hover:bg-black/90 text-white text-[12px] font-semibold px-5 py-3 rounded-[12px] self-start transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75"
                    >
                      {refreshingPermissions ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{t("pages.settings_page.refreshing")}</span>
                        </>
                      ) : (
                        <span>{t("pages.settings_page.refresh_btn")}</span>
                      )}
                    </button>
                  </div>

                  <hr className="border-[#F0F0F0]" />

                  {/* Section 2: Remove Account */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[15px] font-bold text-black">{t("pages.settings_page.remove_account")}</h3>
                    <p className="text-[13px] text-[#707070] leading-relaxed">
                      {t("pages.settings_page.remove_account_desc")}
                    </p>
                    <button
                      onClick={() => {
                        setChannelToDelete(selectedCh);
                        setIsChannelDeleteModalOpen(true);
                      }}
                      className="border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 text-[12px] font-semibold px-5 py-3 rounded-[12px] self-start transition-all active:scale-95"
                    >
                      {t("pages.settings_page.remove_account")}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={t("pages.settings_page.clear_data_confirm_title")}
        message={t("pages.settings_page.clear_data_confirm_desc")}
        confirmText={t("pages.settings_page.clear_data_confirm_btn")}
        cancelText={t("common.cancel")}
      />



      {/* Delete Channel confirmation */}
      {isChannelDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
          <div className="w-full max-w-[380px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-semibold text-black leading-tight">
              {t("pages.settings_page.delete_channel_confirm_title")}
            </h3>
            <p className="mt-2.5 text-[12px] text-[#707070] leading-relaxed">
              {t("pages.settings_page.delete_channel_confirm_desc")}
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#707070] uppercase">{t("pages.settings_page.delete_confirm_label")}</label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={t("pages.settings_page.delete_confirm_placeholder")}
                className="w-full rounded-[10px] border border-[#D8D8D8] px-3 py-2 text-[12px] text-black outline-none focus:border-black"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setIsChannelDeleteModalOpen(false);
                  setDeleteConfirmInput("");
                  setChannelToDelete(null);
                }}
                className="rounded-full bg-[#F0F0F0] px-4 py-2 font-medium text-black hover:bg-[#E8E8E8] active:scale-95 transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput !== t("pages.settings_page.delete_confirm_placeholder")}
                onClick={handleConfirmDeleteChannel}
                className="rounded-full bg-[#DC2626] px-4 py-2 font-medium text-white hover:bg-[#B91C1C] disabled:opacity-40 disabled:hover:bg-[#DC2626] active:scale-95 transition-all"
              >
                {t("pages.settings_page.delete_confirm_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        buttonText={"OK"}
      />

      {/* ── CHOOSE CHANNEL MODAL ── */}
      {modal === "choose" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[360px] shadow-2xl overflow-hidden p-6 border border-[#D8D8D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-5">
              <h3 className="text-[15px] font-bold text-black">{t("pages.settings_page.choose_channel_type")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setModal("instagram-choice")}
                type="button"
                className="flex items-center gap-3 w-full p-3.5 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left bg-white hover:shadow-sm"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shrink-0">
                  <Instagram size={16} />
                </div>
                <div>
                  <p className="font-semibold text-black">{t("pages.settings_page.ig_direct_api")}</p>
                  <p className="text-[11px] text-[#707070]">{t("pages.settings_page.ig_direct_subtitle")}</p>
                </div>
              </button>
              <button
                onClick={() => setModal("telegram")}
                className="flex items-center gap-3 w-full p-3.5 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#229ED9] text-white">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="font-semibold text-black">{t("pages.settings_page.tg_bot_title")}</p>
                  <p className="text-[11px] text-[#707070]">{t("pages.settings_page.tg_bot_subtitle")}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INSTAGRAM CHOICE MODAL ── */}
      {modal === "instagram-choice" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[360px] shadow-2xl overflow-hidden p-6 border border-[#D8D8D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-5">
              <h3 className="text-[15px] font-bold text-black">Instagram ulash usuli</h3>
              <button onClick={() => setModal("choose")} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                disabled
                type="button"
                className="flex items-center gap-3 w-full p-4 rounded-[16px] border border-[#E8E8E8] text-[13px] font-medium transition-all text-left bg-white grayscale opacity-60 cursor-not-allowed select-none"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shrink-0">
                  <Instagram size={16} />
                </div>
                <div className="flex-1 flex justify-between items-center min-w-0">
                  <div>
                    <p className="font-bold text-black">O'zim ulayman</p>
                    <p className="text-[10px] text-[#707070]">Tizim orqali to'g'ridan-to'g'ri ulash</p>
                  </div>
                  <span className="text-[9px] font-extrabold text-white bg-red-500 px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wide">
                    Yopiq
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCustomMeta(true);
                  setModal("instagram");
                }}
                className="flex items-center gap-3 w-full p-4 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left bg-white hover:shadow-sm"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-black text-[#C7F33C] shrink-0">
                  <Instagram size={16} className="text-[#C7F33C]" />
                </div>
                <div>
                  <p className="font-bold text-black">Ulab bering (B2B)</p>
                  <p className="text-[10px] text-[#707070]">Shaxsiy Meta App va token orqali ulash</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INSTAGRAM MODAL ── */}
      {modal === "instagram" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[420px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className={`grid h-10 w-10 place-items-center rounded-[12px] ${showCustomMeta ? "bg-black" : "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"} shrink-0`}>
                <Instagram size={18} className={showCustomMeta ? "text-[#C7F33C]" : "text-white"} />
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-[15px] font-bold text-black">
                  {showCustomMeta ? "Shaxsiy Meta API (B2B) ulanishi" : t("pages.settings_page.link_ig_title")}
                </h2>
                <p className="text-[11px] text-[#707070]">
                  {showCustomMeta ? "O'z Meta App ma'lumotlaringizni kiriting" : t("pages.settings_page.link_ig_subtitle")}
                </p>
              </div>
              <button 
                onClick={() => {
                  setModal(null);
                  setShowCustomMeta(false);
                }} 
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]"
              >
                <X size={16} />
              </button>
            </div>

            {showCustomMeta ? (
              <form onSubmit={handleConnectCustomMeta} className="px-6 py-5 flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Instagram biznes akkaunt ID (ID)</label>
                  <input
                    type="text"
                    value={customMetaPageId}
                    onChange={(e) => setCustomMetaPageId(e.target.value)}
                    placeholder="Masalan: 17841401234567890"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Instagram foydalanuvchi nomi</label>
                  <input
                    type="text"
                    value={customMetaUsername}
                    onChange={(e) => setCustomMetaUsername(e.target.value)}
                    placeholder="Masalan: @my_business_page"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Meta ilova ID (ID)</label>
                  <input
                    type="text"
                    value={customMetaAppId}
                    onChange={(e) => setCustomMetaAppId(e.target.value)}
                    placeholder="Masalan: 485912345678901"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Meta ilova maxfiy kaliti (Secret)</label>
                  <input
                    type="password"
                    value={customMetaAppSecret}
                    onChange={(e) => setCustomMetaAppSecret(e.target.value)}
                    placeholder="Meta ilovangiz maxfiy kaliti"
                    required
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Doimiy sahifa kirish tokeni</label>
                  <textarea
                    value={customMetaAccessToken}
                    onChange={(e) => setCustomMetaAccessToken(e.target.value)}
                    placeholder="Meta Graph API'dan olingan doimiy sahifa kirish tokeni"
                    required
                    rows={3}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black resize-none bg-white"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={customMetaLoading}
                    className="w-full py-3 rounded-full bg-[#C7F33C] hover:bg-[#b0d82f] text-black text-[12px] font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {customMetaLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Ulanmoqda...</span>
                      </>
                    ) : (
                      <span>Ulash</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomMeta(false);
                      setModal("instagram-choice");
                    }}
                    className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-black text-[12px] font-bold transition-all"
                  >
                    Orqaga
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
                {/* Connected Icons Illustration */}
                <div className="flex items-center justify-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#bc1888] to-[#e6683c] flex items-center justify-center shadow-lg text-white">
                    <Instagram size={28} />
                  </div>
                  <div className="text-[#a0a0a0] font-bold text-[20px]">⇄</div>
                  <div className="w-14 h-14 rounded-2xl bg-[#0095f6]/10 flex items-center justify-center shadow-sm border border-[#0095f6]/20 text-[#0095f6]">
                    <span className="font-bold text-[22px]">S</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-black leading-snug">
                    {t("pages.settings_page.link_ig_title")}
                  </h3>
                  <p className="text-[12px] text-[#707070] mt-2 max-w-[320px] mx-auto leading-relaxed">
                    {t("pages.settings_page.ig_connect_desc")}
                  </p>
                </div>

                {oAuthWaiting ? (
                  <div className="w-full p-4 rounded-2xl bg-[#EFF2FC] border border-[#EFF2FC] flex flex-col items-center gap-3 animate-pulse">
                    <span className="w-6 h-6 border-3 border-[#0095f6]/30 border-t-[#0095f6] rounded-full animate-spin" />
                    <p className="text-[12px] font-medium text-[#0095f6]">
                      {t("pages.settings_page.waiting_for_account")}
                    </p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-3">
                    {/* Primary Instagram Button */}
                    <button
                      onClick={handleInstagramLogin}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-gradient-to-r from-[#f09433] via-[#bc1888] to-[#e6683c] hover:opacity-95 text-white text-[13px] font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                    >
                      <Instagram size={18} className="shrink-0" />
                      <span>{t("pages.settings_page.connect_via_ig")}</span>
                    </button>

                    <button
                      onClick={() => setShowCustomMeta(true)}
                      className="text-[11px] text-[#0095f6] hover:underline font-bold mt-1"
                    >
                      B2B: Shaxsiy Meta API (App ID/Secret) orqali ulash
                    </button>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#F9F9F7] border border-[#E8E8E8] flex items-start gap-2.5 text-left w-full">
                  <CheckCircle size={14} className="text-[#16A34A] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[#505050] leading-relaxed">
                    {t("pages.settings_page.ig_personal_warning")}
                  </p>
                </div>

                <div className="w-full flex gap-3 mt-2">
                  <Button onClick={() => setModal(null)} variant="secondary" className="w-full py-3 text-[12px] border border-[#E8E8E8]">
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TELEGRAM MODAL ── */}
      {modal === "telegram" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[440px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#229ED9]">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] font-bold text-black">{t("pages.settings_page.link_tg_title")}</h2>
                <p className="text-[11px] text-[#707070]">{t("pages.settings_page.link_tg_subtitle")}</p>
              </div>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.settings_page.bot_token_label")}</label>
                <input
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-mono"
                />
              </div>

              {/* Steps */}
              <div className="p-3 rounded-[12px] bg-[#F9F9F7] border border-[#E8E8E8] flex flex-col gap-2">
                <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.settings_page.how_to_get_title")}</p>
                {[
                  t("pages.settings_page.tg_step_1"),
                  t("pages.settings_page.tg_step_2"),
                  t("pages.settings_page.tg_step_3"),
                  t("pages.settings_page.tg_step_4"),
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-black text-white text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-[#505050]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1 py-3 text-[12px] border border-[#E8E8E8]">
                {t("common.cancel")}
              </Button>
              <button
                onClick={handleAddTelegram}
                disabled={!tgToken.trim() || saving}
                className="flex-1 py-3 rounded-full bg-[#229ED9] text-white text-[12px] font-semibold disabled:opacity-40 hover:bg-[#1a8ec4] transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Bot size={13} /> {t("common.connect")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
