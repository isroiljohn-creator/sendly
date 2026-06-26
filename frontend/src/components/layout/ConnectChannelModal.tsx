"use client";

import { useState, useEffect } from "react";
import { X, Bot, CheckCircle } from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { Button, AlertModal } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";

export function ConnectChannelModal() {
  const { t } = useI18n();
  const [modal, setModal] = useState<"choose" | "instagram" | "telegram" | "instagram-choice" | "instagram-form" | null>(null);
  const [saving, setSaving] = useState(false);
  const [oAuthWaiting, setOAuthWaiting] = useState(false);

  // Custom Meta inputs
  const [customMetaPageId, setCustomMetaPageId] = useState("");
  const [customMetaUsername, setCustomMetaUsername] = useState("");
  const [customMetaAppId, setCustomMetaAppId] = useState("");
  const [customMetaAppSecret, setCustomMetaAppSecret] = useState("");
  const [customMetaAccessToken, setCustomMetaAccessToken] = useState("");
  const [customMetaLoading, setCustomMetaLoading] = useState(false);

  // Telegram inputs
  const [tgToken, setTgToken] = useState("");
  const [tgName, setTgName] = useState("");
  const [tgUsername, setTgUsername] = useState("");

  // Alert modal state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // Open modal triggers from global events
  useEffect(() => {
    const handleOpen = () => {
      setModal("choose");
    };
    const handleError = (e: Event) => {
      const errorMsg = (e as CustomEvent).detail || t("common.error");
      showAlert(t("common.error"), errorMsg);
      // Automatically fetch from server to revert local updates
      db.fetchFromServer();
    };

    window.addEventListener("replai-open-connect-modal", handleOpen);
    window.addEventListener("replai-db-error", handleError);

    return () => {
      window.removeEventListener("replai-open-connect-modal", handleOpen);
      window.removeEventListener("replai-db-error", handleError);
    };
  }, [t]);

  // Handle Meta/Instagram OAuth events
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

        db.addChannel({
          type: "instagram",
          name: name || username,
          username: username,
          isConnected: true,
          followersCount: followers || "0",
        });

        setModal(null);
        setOAuthWaiting(false);
        showAlert(t("common.success"), t("pages.settings_page.ig_link_success"));
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, [t]);

  useEffect(() => {
    if (modal !== "instagram") {
      setOAuthWaiting(false);
    }
  }, [modal]);

  const handleInstagramLogin = async () => {
    const currentUser = db.getCurrentUser();
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
          // Revert the channel addition locally if server rejected it
          db.removeChannel(newCh.id);
          showAlert(t("common.error"), saveRes.error || "Saqlashda xatolik yuz berdi");
          setSaving(false);
          return;
        }

        setTgToken("");
        setTgName("");
        setTgUsername("");
        setModal(null);
        setSaving(false);
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

  const handleConnectCustomMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMetaPageId || !customMetaUsername || !customMetaAppId || !customMetaAppSecret || !customMetaAccessToken) {
      showAlert(t("common.error"), "Barcha maydonlarni to'ldiring");
      return;
    }
    setCustomMetaLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
      const response = await fetch(`${backendUrl}/oauth/instagram/custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramPageId: customMetaPageId.trim(),
          username: customMetaUsername.trim().replace(/^@+/, ""),
          customMetaAppId: customMetaAppId.trim(),
          customMetaAppSecret: customMetaAppSecret.trim(),
          customMetaAccessToken: customMetaAccessToken.trim(),
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Ulanishda xatolik yuz berdi");
      }

      db.addChannel({
        type: "instagram",
        name: customMetaUsername.trim().replace(/^@+/, ""),
        username: customMetaUsername.trim().replace(/^@+/, ""),
        isConnected: true,
        isCustomMeta: true,
        customMetaAppId: customMetaAppId.trim(),
        followersCount: "0",
      });

      await db.saveToServer();

      setModal(null);
      showAlert(t("common.success"), "Instagram B2B muvaffaqiyatli ulandi");

      setCustomMetaPageId("");
      setCustomMetaUsername("");
      setCustomMetaAppId("");
      setCustomMetaAppSecret("");
      setCustomMetaAccessToken("");
    } catch (err: any) {
      showAlert(t("common.error"), err.message || "Xatolik yuz berdi");
    } finally {
      setCustomMetaLoading(false);
    }
  };

  if (!modal) return (
    <AlertModal
      isOpen={alertOpen}
      onClose={() => setAlertOpen(false)}
      title={alertTitle}
      message={alertMessage}
      buttonText="OK"
    />
  );

  return (
    <>
      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />

      {/* ── CHOOSE CHANNEL MODAL ── */}
      {modal === "choose" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 backdrop-blur-[5px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[360px] shadow-2xl overflow-hidden p-6 border border-[#E8E8E8]/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)] scale-100 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-5">
              <h3 className="text-[15px] font-bold text-black">{t("pages.settings_page.choose_channel_type")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors">
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
                className="flex items-center gap-3 w-full p-3.5 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left bg-white hover:shadow-sm"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#229ED9] text-white shrink-0">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 backdrop-blur-[5px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[360px] shadow-2xl overflow-hidden p-6 border border-[#E8E8E8]/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)] scale-100 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-5">
              <h3 className="text-[15px] font-bold text-black">Instagram ulash usuli</h3>
              <button onClick={() => setModal("choose")} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors">
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
                onClick={() => setModal("instagram-form")}
                className="flex items-center gap-3 w-full p-4 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left bg-white hover:shadow-sm"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#16A34A] text-white shrink-0">
                  <Instagram size={16} />
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

      {/* ── INSTAGRAM B2B FORM MODAL ── */}
      {modal === "instagram-form" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 backdrop-blur-[5px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[420px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-250 border border-[#E8E8E8]/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#16A34A] shrink-0">
                <Instagram size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-bold text-black truncate">Shaxsiy Meta API (B2B) ulanishi</h2>
                <p className="text-[11px] text-[#707070] truncate">O'z Meta App ma'lumotlaringizni kiriting</p>
              </div>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConnectCustomMeta} className="px-6 py-5 flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Instagram Akkaunt ID (Business Account ID)</label>
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
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Instagram Username (Foydalanuvchi nomi)</label>
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
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Meta App ID (Ilova ID)</label>
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
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Meta App Secret (Ilova maxfiy kaliti)</label>
                <input
                  type="password"
                  value={customMetaAppSecret}
                  onChange={(e) => setCustomMetaAppSecret(e.target.value)}
                  placeholder="Meta App Secret kalitingiz"
                  required
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-wide">Long-Lived Page Access Token</label>
                <textarea
                  value={customMetaAccessToken}
                  onChange={(e) => setCustomMetaAccessToken(e.target.value)}
                  placeholder="Meta Graph API'dan olingan Page Access Token"
                  required
                  rows={3}
                  className="w-full rounded-[10px] border border-[#D8D8D8] px-3.5 py-2 text-[12px] focus:outline-none focus:border-black font-semibold text-black resize-none bg-white"
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  disabled={customMetaLoading}
                  className="w-full py-3 rounded-full bg-[#16A34A] hover:bg-[#15803d] text-white text-[12px] font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {customMetaLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Ulanmoqda...</span>
                    </>
                  ) : (
                    <span>Ulash</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setModal("instagram-choice")}
                  className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-black text-[12px] font-bold transition-all"
                >
                  Orqaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INSTAGRAM MODAL ── */}
      {modal === "instagram" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 backdrop-blur-[5px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[420px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-250 border border-[#E8E8E8]/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] shrink-0">
                <Instagram size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-bold text-black truncate">{t("pages.settings_page.link_ig_title")}</h2>
                <p className="text-[11px] text-[#707070] truncate">{t("pages.settings_page.link_ig_subtitle")}</p>
              </div>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
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
                  <button
                    onClick={handleInstagramLogin}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-gradient-to-r from-[#f09433] via-[#bc1888] to-[#e6683c] hover:opacity-95 text-white text-[13px] font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                  >
                    <Instagram size={18} className="shrink-0" />
                    <span>{t("pages.settings_page.connect_via_ig")}</span>
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F9F9F7] border border-[#E8E8E8] flex items-start gap-2.5 text-left w-full">
                <CheckCircle size={14} className="text-[#16A34A] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#505050] leading-relaxed">
                  {t("pages.settings_page.ig_personal_warning")}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setModal(null)} variant="secondary" className="w-full py-3 text-[12px] border border-[#E8E8E8]">
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── TELEGRAM MODAL ── */}
      {modal === "telegram" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 backdrop-blur-[5px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-[440px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-250 border border-[#E8E8E8]/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#229ED9] shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-bold text-black truncate">{t("pages.settings_page.link_tg_title")}</h2>
                <p className="text-[11px] text-[#707070] truncate">{t("pages.settings_page.link_tg_subtitle")}</p>
              </div>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors">
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
                    <p className="text-[11px] text-[#505050] leading-relaxed">{step}</p>
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
    </>
  );
}
