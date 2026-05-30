"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, AlertModal, ConfirmModal } from "@/components/ui/primitives";
import { 
  CreditCard, 
  Save, 
  Trash2,
  X,
  Plus,
  Info,
  Loader2
} from "lucide-react";
import { db, type User } from "@/lib/db";
import { useI18n } from "@/i18n/I18nProvider";

export default function AccountPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "limits" | "bonuses">("general");

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Card form
  const [cardNumInput, setCardNumInput] = useState("");
  const [cardExpiryInput, setCardExpiryInput] = useState("");
  const [cardCvcInput, setCardCvcInput] = useState("");
  const [cardError, setCardError] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  // CVC is hidden for local cards (Uzcard / Humo) since they don't have CVC/CVV.
  const cleanCardNum = cardNumInput.replace(/\s/g, "");
  const isUzCardOrHumo = cleanCardNum.startsWith("8600") || 
                         cleanCardNum.startsWith("5614") || 
                         cleanCardNum.startsWith("9860") ||
                         cleanCardNum.startsWith("6262");

  // OTP flow for Humo/UzCard
  const [cardStep, setCardStep] = useState<"card" | "otp">("card");
  const [otpCode, setOtpCode] = useState("");
  const [otpTimer, setOtpTimer] = useState(120);

  // Bonus voucher input
  const [voucherCode, setVoucherCode] = useState("");

  // Dynamic limits counts
  const [channelsCount, setChannelsCount] = useState(0);
  const [activeAutomationsCount, setActiveAutomationsCount] = useState(0);

  // Modals
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // AI Credits States
  const [aiCreditsData, setAiCreditsData] = useState<{ balance: number; used: number; history: any[]; usedVouchers?: string[] }>({ balance: 0, used: 0, history: [] });
  const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false);
  const [processingPurchase, setProcessingPurchase] = useState(false);

  const [alertType, setAlertType] = useState<"success" | "error">("success");

  // Email verification OTP states
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
    const user = db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setName(user.fullName);
      setEmail(user.email);
      setPassword(user.password || "123456");
      
      // Load credits from server
      db.getAiCreditsFromServer(user.id || "guest").then((data) => {
        if (data) setAiCreditsData(data);
      });
    } else {
      // Mock user for visual presentation if no session is active
      const mockUser = {
        fullName: "Isroiljon Abdullayev",
        email: "isroiljohnabdullayev@gmail.com",
        isCardLinked: true,
        cardNumber: "Visa, *1402",
        plan: "premium" as const
      };
      setCurrentUser(mockUser);
      setName(mockUser.fullName);
      setEmail(mockUser.email);
      setPassword("123456");
    }

    // Read tab from query string
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam === "billing") {
      setActiveTab("billing");
      const realUser = db.getCurrentUser() || user;
      if (realUser && !realUser.isCardLinked) {
        setIsLinking(true);
      }
    } else if (tabParam === "limits") {
      setActiveTab("limits");
    } else if (tabParam === "bonuses") {
      setActiveTab("bonuses");
    } else {
      setActiveTab("general");
    }

    // Load dynamic counts
    setChannelsCount(db.getChannels().length);
    setActiveAutomationsCount(db.getAllAutomations().filter(a => a.active).length);

    // Setup reactive DB listener
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
    };
    window.addEventListener("replai-db-update", handleDbUpdate);
    return () => window.removeEventListener("replai-db-update", handleDbUpdate);
  }, []);

  const showAlert = (title: string, message: string, type: "success" | "error" = "success") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setIsAlertOpen(true);
  };

  const handleBuyCredits = async (amount: number, priceUzs: number, packageName: string) => {
    if (!currentUser?.isCardLinked) {
      showAlert(t("common.error"), "AI kredit sotib olish uchun avval to'lov kartangizni bog'lang.", "error");
      setIsBuyCreditsModalOpen(false);
      setIsLinking(true);
      return;
    }
    setProcessingPurchase(true);
    
    // Simulate payment transaction then apply credits
    const timer = setTimeout(async () => {
      const updated = await db.buyAiCreditsServer(
        currentUser.id || "guest",
        amount,
        `${packageName} paketi (${priceUzs.toLocaleString("uz-UZ")} UZS) xarid qilindi`
      );
      setProcessingPurchase(false);
      if (updated) {
        setAiCreditsData(updated);
        setIsBuyCreditsModalOpen(false);
        showAlert(t("common.success"), `Muvaffaqiyatli xarid qilindi! Hisobingizga ${amount} kredit qo'shildi.`, "success");
      } else {
        showAlert(t("common.error"), "Xarid amalga oshmadi. Iltimos qaytadan urunib ko'ring.", "error");
      }
    }, 1500);
  };

  const handleCancelEmailChange = () => {
    setIsEmailVerificationPending(false);
    setEmailOtpInput("");
    setEmailOtpError("");
    if (currentUser) {
      setEmail(currentUser.email);
    }
  };

  const handleResendEmailOtp = async () => {
    if (!email) return;
    setEmailOtpError("");
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const mailRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: generatedCode }),
      });
      
      const mailData = await mailRes.json();
      
      if (mailRes.ok && mailData.success) {
        setEmailVerifyCodeState(generatedCode);
        setEmailVerifyCountdown(120);
        setEmailOtpInput("");
        showAlert(t("common.success"), "Yangi tasdiqlash kodi elektron pochtangizga yuborildi.", "success");
      } else {
        setEmailOtpError(mailData.error || "Email yuborishda xatolik yuz berdi.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setEmailOtpError("Tarmoq ulanishida xatolik yuz berdi: " + errMsg);
    }
  };

  const handleConfirmEmailOtpInline = async () => {
    if (emailOtpInput !== emailVerifyCodeState) {
      setEmailOtpError("Tasdiqlash kodi noto'g'ri. Iltimos qaytadan urinib ko'ring.");
      return;
    }

    setIsEmailOtpVerifying(true);
    try {
      // Success! Update DB and states
      const users = db.getUsers();
      const idx = users.findIndex(u => u.email === currentUser?.email);
      if (idx > -1) {
        users[idx].fullName = pendingName;
        users[idx].email = pendingEmail;
        users[idx].password = pendingPassword;
        localStorage.setItem("replai_users", JSON.stringify(users));
      }

      const updatedUser = { ...currentUser, fullName: pendingName, email: pendingEmail, password: pendingPassword };
      localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser as User);
      setIsEmailVerificationPending(false);

      // Persist changes to server
      await db.saveToServer();

      showAlert(t("common.success"), t("pages.account.general.success_message") || "Profil ma'lumotlari muvaffaqiyatli saqlandi!", "success");
    } catch (err) {
      setEmailOtpError("Ma'lumotlarni saqlashda xatolik yuz berdi.");
    } finally {
      setIsEmailOtpVerifying(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Check if email changed
    if (email !== currentUser.email) {
      const emailLower = email.trim().toLowerCase();
      if (!emailLower.endsWith("@gmail.com") && !emailLower.endsWith("@icloud.com")) {
        showAlert(
          t("common.error"),
          t("pages.login_page.error_invalid_email_domain") || "Faqat @gmail.com yoki @icloud.com elektron pochta manzillari qabul qilinadi.",
          "error"
        );
        return;
      }

      setIsSendingEmailOtp(true);
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      try {
        const mailRes = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), otp: generatedCode }),
        });
        
        const mailData = await mailRes.json();
        
        if (mailRes.ok && mailData.success) {
          setEmailVerifyCodeState(generatedCode);
          setPendingEmail(email);
          setPendingName(name);
          setPendingPassword(password);
          setEmailOtpInput("");
          setEmailOtpError("");
          setIsEmailVerificationPending(true);
          setEmailVerifyCountdown(120);
          showAlert(t("common.success"), "Tasdiqlash kodi yangi elektron pochtangizga yuborildi.", "success");
        } else {
          showAlert(t("common.error"), mailData.error || "Email yuborishda xatolik yuz berdi.", "error");
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        showAlert(t("common.error"), "Tarmoq ulanishida xatolik yuz berdi: " + errMsg, "error");
      } finally {
        setIsSendingEmailOtp(false);
      }
      return;
    }

    // Save updated name/password (no email change)
    const users = db.getUsers();
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx > -1) {
      users[idx].fullName = name;
      users[idx].password = password;
      localStorage.setItem("replai_users", JSON.stringify(users));
    }
    
    const updatedUser = { ...currentUser, fullName: name, password };
    localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    
    // Persist changes to server
    await db.saveToServer();
    
    showAlert(t("common.success"), t("pages.account.general.success_message") || "Profil ma'lumotlari muvaffaqiyatli saqlandi!", "success");
  };

  const handleGetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");
    
    const rawNumber = cardNumInput.replace(/\s/g, "");
    if (rawNumber.length < 16) {
      setCardError(t("pages.account.billing.card_input_error"));
      return;
    }
    if (cardExpiryInput.length < 5) {
      setCardError(t("pages.account.billing.expiry_input_error"));
      return;
    }

    setCardStep("otp");
    setOtpTimer(120);
    showAlert(t("pages.account.billing.sms_sent"), t("pages.account.billing.sms_sent_msg"));
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");

    if (otpCode.length < 4) {
      setCardError(t("pages.account.billing.otp_input_error"));
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
      showAlert(t("common.success"), t("pages.account.billing.link_success"));
    } else {
      setCardError(res.error || t("pages.account.billing.otp_error"));
    }
  };

  const handleUnlinkCard = () => {
    db.unlinkCard();
    
    // Update local state or mock state
    if (currentUser) {
      const updated = { ...currentUser, plan: "free" as const, isCardLinked: false, cardNumber: undefined };
      setCurrentUser(updated);
      localStorage.setItem("replai_current_user", JSON.stringify(updated));
    }
    showAlert(t("common.cancel"), t("pages.account.billing.card_unlink_success"));
  };

  const handleSelectPlan = (plan: "free" | "pro" | "premium") => {
    if (plan !== "free" && !currentUser?.isCardLinked) {
      setIsPricingOpen(false);
      setIsLinking(true);
      showAlert(t("pages.account.billing.card_required_title"), t("pages.account.billing.card_required_msg"));
      return;
    }
    db.updatePlan(plan);
    const updated = db.getCurrentUser();
    setCurrentUser(updated);
    setIsPricingOpen(false);
    showAlert(t("pages.account.billing.plan_updated"), t("pages.account.billing.plan_updated_msg").replace("{plan}", plan.toUpperCase()));
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
        showAlert(t("pages.account.bonuses.success_title"), `"${code.toUpperCase()}" promokodi muvaffaqiyatli faollashtirildi! Hisobingizga ${data.history[0]?.amount?.toLocaleString("uz-UZ")} kredit qo'shildi.`);
        setVoucherCode("");
      } else {
        showAlert(t("common.error"), data.error || "Promokodni faollashtirishda xatolik yuz berdi.", "error");
      }
    } catch (err) {
      showAlert(t("common.error"), "Tarmoq ulanishida xatolik yuz berdi.", "error");
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AppLayout>
      <PageHeader 
        title={t("pages.account.title")} 
        breadcrumbs={t("pages.account.breadcrumb")} 
      />

      <div className="flex bg-white rounded-[24px] border border-[#D8D8D8] min-h-[calc(100vh-180px)] overflow-hidden shadow-sm mt-3">
        {/* Left Column: Sub-sidebar */}
        <div className="w-[260px] shrink-0 border-r border-[#E8E8E8] flex flex-col justify-between bg-white p-5">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-[17px] font-bold text-black px-2">{t("pages.account.title")}</h2>
            </div>

            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab("general")}
                className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeTab === "general"
                    ? "bg-[#EFF2FC] text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.general")}
              </button>

              <button
                onClick={() => setActiveTab("billing")}
                className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeTab === "billing"
                    ? "bg-[#EFF2FC] text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.billing")}
              </button>

              <button
                onClick={() => setActiveTab("limits")}
                className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeTab === "limits"
                    ? "bg-[#EFF2FC] text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.limits")}
              </button>

              <button
                onClick={() => setActiveTab("bonuses")}
                className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                  activeTab === "bonuses"
                    ? "bg-[#EFF2FC] text-black font-bold"
                    : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                }`}
              >
                {t("pages.account.tabs.bonuses")}
              </button>
            </div>
          </div>
          <div className="text-[10px] text-[#a0a0a0] text-center pt-4 border-t border-[#F0F0F0]">
            v1.0.0 · Sendly
          </div>
        </div>

        {/* Right Column: Tab Content */}
        <div className="flex-1 p-8 md:p-10 bg-white overflow-y-auto">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="max-w-[600px] flex flex-col gap-6">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.account.general.title")}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">{t("pages.account.general.desc")}</p>
              </div>

              <form onSubmit={handleSaveGeneral} className="flex flex-col gap-5 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">{t("pages.account.general.name")}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                    placeholder={t("pages.account.general.name_placeholder")}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">{t("pages.account.general.email")}</label>
                  
                  {isEmailVerificationPending ? (
                    <div className="flex flex-col gap-3 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-[#707070] uppercase block mb-1">Yangi elektron pochta</span>
                          <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-[#707070] bg-[#F5F5F5]"
                          />
                        </div>
                        <div className="sm:w-[180px]">
                          <span className="text-[10px] font-bold text-[#707070] uppercase block mb-1">Tasdiqlash kodi</span>
                          <input
                            type="text"
                            value={emailOtpInput}
                            onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, "").substring(0, 6))}
                            className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black text-center font-bold tracking-[2px]"
                            placeholder="000000"
                            required
                          />
                        </div>
                      </div>

                      {emailOtpError && (
                        <p className="text-[11px] text-red-600 font-semibold">{emailOtpError}</p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 mt-1 pt-2 border-t border-[#F0F0F0] text-[11px]">
                        <div className="text-[#707070]">
                          {emailVerifyCountdown > 0 ? (
                            <span>Kodni qayta yuborish: <span className="font-mono text-black font-bold">{formatTimer(emailVerifyCountdown)}</span></span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendEmailOtp}
                              className="font-bold text-[#7CA607] hover:underline"
                            >
                              Kodni qayta yuborish
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCancelEmailChange}
                            className="text-[#707070] hover:text-black font-semibold"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmEmailOtpInline}
                            disabled={emailOtpInput.length < 6 || isEmailOtpVerifying}
                            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-[10px] font-bold text-[12px] transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                          >
                            {isEmailOtpVerifying && <Loader2 size={12} className="animate-spin" />}
                            <span>Tasdiqlash</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={email}
                        disabled={isSendingEmailOtp}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black ${isSendingEmailOtp ? "bg-[#F5F5F5] text-[#707070]" : ""}`}
                        placeholder={t("pages.account.general.email_placeholder")}
                        required
                      />
                      {isSendingEmailOtp && (
                        <div className="absolute right-3">
                          <Loader2 size={16} className="animate-spin text-gray-500" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">{t("pages.account.general.password")}</label>
                  <input
                    type="password"
                    value={password}
                    disabled={isEmailVerificationPending}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black bg-white disabled:bg-[#F5F5F5] disabled:text-[#707070]"
                    placeholder={t("pages.account.general.password_placeholder")}
                  />
                  <p className="text-[10px] text-[#707070] mt-0.5">{t("pages.account.general.password_desc")}</p>
                </div>

                <div className="mt-2 flex justify-start">
                  <Button type="submit" variant="primary" disabled={isSendingEmailOtp || isEmailVerificationPending} className="gap-2 px-6 py-3 rounded-[10px] text-[13px]">
                    {isSendingEmailOtp ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{isSendingEmailOtp ? "Yuborilmoqda..." : t("common.save")}</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (() => {
            const connectedCount = channelsCount;
            const userPlan = currentUser?.plan || "free";
            const basePrice = userPlan === "premium" ? 1000000 : userPlan === "pro" ? 150000 : 0;
            const includedChannels = userPlan === "premium" ? 10 : 1;
            const extraChannels = Math.max(0, connectedCount - includedChannels);
            const extraCost = extraChannels * 150000;
            const totalMonthlyPrice = basePrice + extraCost;

            return (
              <div className="flex flex-col gap-6 max-w-[640px]">
                {/* Premium Plan block */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-[20px] font-bold text-black">
                        {userPlan === "premium" ? t("pages.account.billing.premium_plan") : userPlan === "pro" ? t("pages.account.billing.pro_plan") : t("pages.account.billing.free_plan")}
                      </h3>
                    </div>
                    <p className="text-[12px] text-[#707070] mt-1.5">
                      {currentUser?.isCardLinked ? t("pages.account.billing.next_payment").replace("{date}", "9-oktabr, 2026") : t("pages.account.billing.upgrade_desc")}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className="text-[20px] font-bold text-black leading-none">
                      {totalMonthlyPrice.toLocaleString("uz-UZ")} UZS
                    </div>
                    {currentUser?.isCardLinked && (
                      <button 
                        onClick={() => setIsUnlinkModalOpen(true)}
                        className="text-[11px] text-[#707070] hover:text-black underline mt-2 block"
                      >
                        {t("pages.account.billing.cancel_sub")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Monthly cost breakdown */}
                <div className="p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl text-[12px] flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[#707070]">Asosiy tarif narxi ({includedChannels} ta ulanish bilan):</span>
                    <span className="font-bold text-black">{basePrice.toLocaleString("uz-UZ")} UZS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#707070]">Joriy ulangan kanallar soni:</span>
                    <span className="font-bold text-black">{connectedCount} ta</span>
                  </div>
                  {extraChannels > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#707070]">Qo'shimcha kanallar ({extraChannels} ta x 150 000 UZS):</span>
                      <span className="font-bold text-red-600">+{extraCost.toLocaleString("uz-UZ")} UZS</span>
                    </div>
                  )}
                  <div className="border-t border-[#E8E8E8] pt-2 mt-1 flex justify-between items-center text-[13px] font-extrabold">
                    <span className="text-black">Jami oylik to'lov:</span>
                    <span className="text-[#7CA607] font-black">{totalMonthlyPrice.toLocaleString("uz-UZ")} UZS / oy</span>
                  </div>
                </div>

                {/* Tarifni o'zgartirish va Karta bog'lash buttonlari */}
                <div className="flex flex-wrap items-center gap-4 py-2">
                  <button
                    onClick={() => setIsPricingOpen(true)}
                    className="flex items-center gap-1.5 text-black hover:text-black/80 hover:underline font-semibold text-[13px]"
                  >
                    <CreditCard size={15} />
                    <span>{t("pages.account.billing.change_plan")}</span>
                  </button>
                  {!currentUser?.isCardLinked && !isLinking && (
                    <button
                      onClick={() => setIsLinking(true)}
                      className="flex items-center gap-1.5 text-black hover:text-black/80 hover:underline font-semibold text-[13px] border-l border-[#E8E8E8] pl-4"
                    >
                      <Plus size={15} />
                      <span>{"Karta bog'lash"}</span>
                    </button>
                  )}
                </div>

              {/* Linked Card block */}
              {currentUser?.isCardLinked && (
                <div className="border-t border-b border-[#F0F0F0] py-4 flex items-center justify-between my-2">
                  <div className="flex items-center gap-3.5">
                    <div className="h-8 w-12 bg-black rounded-[6px] flex items-center justify-center text-white font-bold text-[10px] tracking-wider shrink-0 shadow-sm">
                      VISA
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-black">
                        {currentUser?.cardNumber || "Visa, *1402"}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsUnlinkModalOpen(true)}
                    className="h-8 w-8 rounded-full bg-[#F5F5F5] hover:bg-red-50 text-[#707070] hover:text-red-500 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Card Linking Form */}
              {isLinking && (
                <Card className="border border-[#D8D8D8] p-5 mt-4 rounded-[16px] animate-in fade-in slide-in-from-top-4 duration-200">
                  <h3 className="text-[15px] font-semibold text-black mb-4">{t("pages.account.billing.link_card_title")}</h3>
                  {cardError && (
                    <div className="bg-red-50 text-red-600 rounded-[10px] p-3 text-[11px] font-medium mb-4">
                      {cardError}
                    </div>
                  )}

                  {cardStep === "card" ? (
                    <form onSubmit={handleGetOtp} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[#707070] uppercase">{t("pages.account.billing.card_number")}</label>
                        <input
                          type="text"
                          value={cardNumInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                            setCardNumInput(formatted.substring(0, 19));
                          }}
                          className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                          placeholder="8600 0000 0000 0000"
                          required
                        />
                      </div>

                      <div className={isUzCardOrHumo ? "flex flex-col gap-1.5" : "grid grid-cols-2 gap-4"}>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#707070] uppercase">Muddati</label>
                          <input
                            type="text"
                            value={cardExpiryInput}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              const formatted = value.length > 2 ? `${value.substring(0, 2)}/${value.substring(2, 4)}` : value;
                              setCardExpiryInput(formatted.substring(0, 5));
                            }}
                            className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                            placeholder="MM/YY"
                            required
                          />
                        </div>
                        {!isUzCardOrHumo && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#707070] uppercase">CVC / Tasdiq</label>
                            <input
                              type="password"
                              value={cardCvcInput}
                              onChange={(e) => setCardCvcInput(e.target.value.replace(/\D/g, "").substring(0, 4))}
                              className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                              placeholder="***"
                              required
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 mt-2">
                        <Button 
                          type="button" 
                          variant="secondary"
                          onClick={() => setIsLinking(false)}
                          className="rounded-[10px] text-[12px] px-4 py-2"
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit" className="rounded-[10px] text-[12px] px-4 py-2 bg-black hover:bg-black/90 text-white">
                          {t("common.connect")}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[12px] text-[#707070]">
                          {t("pages.account.billing.otp_waiting").replace("{timer}", formatTimer(otpTimer))}
                        </p>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
                          className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black text-center font-bold tracking-[6px]"
                          placeholder="000000"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="secondary"
                          onClick={() => {
                            setCardStep("card");
                            setOtpCode("");
                          }}
                          className="rounded-[10px] text-[12px] px-4 py-2"
                        >
                          {t("common.back")}
                        </Button>
                        <Button type="submit" className="rounded-[10px] text-[12px] px-4 py-2 bg-black hover:bg-black/90 text-white">
                          {t("common.confirm")}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="text-[11px] text-[#707070] leading-relaxed bg-[#F9F9F7] p-3.5 rounded-[12px] border border-[#F0F0F0] mt-4 flex items-start gap-2">
                    <span className="text-black font-bold shrink-0">ⓘ</span>
                    <span>
                      {"Kartani bog'lash mutlaqo bepul. 7 kunlik bepul sinov muddati yakunlanmaguncha kartangizdan pul yechilmaydi. Sinov muddati tugagandan so'nggina keyingi davr uchun to'lov olinadi."}
                    </span>
                  </div>
                </Card>
              )}

              {/* AI Credits Section */}
              <div className="border-t border-[#F0F0F0] pt-6 flex flex-col gap-5 mt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[17px] font-bold text-black flex items-center gap-2">
                      AI Kreditlar va Xarajatlar
                    </h3>
                    <p className="text-[12px] text-[#707070] mt-1">
                      AI agentlarini (FAQ yordamchi va saralash botlari) ishlatish uchun zarur bo'lgan kredit balansi.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-black text-black leading-none">
                      {(aiCreditsData.balance || 0).toLocaleString("uz-UZ")}
                    </div>
                    <span className="text-[10px] text-[#707070] block mt-1 uppercase font-bold tracking-wider">kreditlar</span>
                  </div>
                </div>

                {/* Info message */}
                <div className="p-3.5 bg-amber-50/50 border border-amber-200/50 text-amber-800 rounded-2xl text-[11px] leading-relaxed flex items-start gap-2">
                  <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Eslatma:</strong> PRO tarifida bepul AI kreditlar berilmaydi. AI funksiyalardan (FAQ yordamchi yoki kvalifikatsiya) foydalanish uchun hisobingizni kreditlar bilan to'ldirishingiz lozim.
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setIsBuyCreditsModalOpen(true)}
                    className="px-5 py-2.5 bg-black text-[#C7F33C] text-[12px] font-bold rounded-full hover:bg-black/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-md"
                  >
                    <Plus size={14} />
                    <span>AI Kredit sotib olish</span>
                  </button>
                </div>

                {/* Transaction history */}
                <div className="flex flex-col gap-2.5 mt-2">
                  <h4 className="text-[11px] font-extrabold text-black uppercase tracking-wider">Xarajatlar tarixi</h4>
                  <div className="max-h-[220px] overflow-y-auto border border-[#E8E8E8] rounded-2xl bg-white shadow-sm">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-[#F9F9F7] border-b border-[#E8E8E8] text-[#707070] font-bold">
                          <th className="p-3">Amal</th>
                          <th className="p-3 text-right">Miqdor</th>
                          <th className="p-3">Tavsif</th>
                          <th className="p-3 text-right">Sana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiCreditsData.history && aiCreditsData.history.length > 0 ? (
                          aiCreditsData.history.map((tx: any) => (
                            <tr key={tx.id} className="border-b border-[#F0F0F0] hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-semibold">
                                {tx.type === "purchase" ? (
                                  <span className="text-[#7CA607] bg-[#C7F33C]/20 px-2 py-0.5 rounded-full text-[9px] font-bold">KIRIM</span>
                                ) : (
                                  <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[9px] font-bold">CHIQIM</span>
                                )}
                              </td>
                              <td className={`p-3 text-right font-extrabold text-[12px] ${tx.type === "purchase" ? "text-[#7CA607]" : "text-red-500"}`}>
                                {tx.type === "purchase" ? `+${tx.amount}` : `-${tx.amount}`}
                              </td>
                              <td className="p-3 text-[#505050] font-medium">{tx.description}</td>
                              <td className="p-3 text-right text-[#A0A0A0]">{tx.date}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-[#A0A0A0] italic">
                              Hozircha xarajatlar tarixi mavjud emas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )})()}

          {/* Limits Tab */}
          {activeTab === "limits" && (
            <div className="max-w-[640px] flex flex-col gap-6">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.account.limits.title")}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">{t("pages.account.limits.desc")}</p>
              </div>

              <div className="flex flex-col gap-6 mt-2">
                <div>
                  <div className="flex justify-between items-center text-[12px] text-black font-semibold mb-2">
                    <span>{t("pages.account.limits.active_automations")}</span>
                    <span>{`${activeAutomationsCount} / ${currentUser?.plan === "premium" ? 50 : 5}`}</span>
                  </div>
                  <div className="w-full bg-[#E5E5E5] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C7F33C] h-full rounded-full" style={{ width: `${Math.min(100, (activeAutomationsCount / (currentUser?.plan === "premium" ? 50 : 5)) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[12px] text-black font-semibold mb-2">
                    <span>{t("pages.account.limits.connected_channels")}</span>
                    <span>{`${channelsCount} / ${currentUser?.plan === "premium" ? 10 : 1}`}</span>
                  </div>
                  <div className="w-full bg-[#E5E5E5] rounded-full h-2 overflow-hidden">
                    <div className="bg-black h-full rounded-full" style={{ width: `${Math.min(100, (channelsCount / (currentUser?.plan === "premium" ? 10 : 1)) * 100)}%` }} />
                  </div>
                </div>

                <div className="bg-[#F9F9F7] border border-[#F0F0F0] rounded-[14px] p-5 mt-2">
                  <h4 className="text-[12px] font-bold text-black uppercase tracking-wider">Premium imkoniyatlar</h4>
                  <p className="text-[11px] text-[#707070] mt-1.5 leading-relaxed">
                    {"Premium tarifga o'tsangiz limitlar 10 barobarga oshiriladi. Shuningdek limitsiz Telegram broadcastlar va professional funksiyalardan to'liq foydalana olasiz."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bonuses Tab */}
          {activeTab === "bonuses" && (
            <div className="max-w-[640px] flex flex-col gap-6">
              <div>
                <h3 className="text-[28px] font-bold text-black">{t("pages.account.bonuses.title")}</h3>
                <p className="text-[13px] text-[#707070] mt-1.5">{t("pages.account.bonuses.desc")}</p>
              </div>
              
              <form onSubmit={handleVoucherSubmit} className="flex gap-3 items-center justify-start mt-2 pb-6 border-b border-[#F0F0F0]">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black uppercase font-semibold w-[320px]"
                  placeholder={t("pages.account.bonuses.placeholder")}
                />
                <button type="submit" className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[13px] px-6 rounded-[10px] transition-colors">
                  {t("pages.account.bonuses.activate")}
                </button>
              </form>

              <div className="mt-6">
                <h4 className="text-[12px] font-bold text-[#707070] uppercase tracking-wider mb-3">{t("pages.account.bonuses.my_bonuses")}</h4>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-4 bg-[#C7F33C]/10 border border-[#C7F33C]/30 rounded-[14px]">
                    <div>
                      <p className="text-[13px] font-bold text-[#1A2906]">{t("pages.account.bonuses.reg_bonus")}</p>
                      <p className="text-[10px] text-[#5A7C1E] mt-0.5">{t("pages.account.bonuses.reg_bonus_desc")}</p>
                    </div>
                    <span className="bg-[#C7F33C] text-[#1A2906] text-[10px] font-bold px-2 py-0.5 rounded-full">{t("common.active")}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white border border-[#F0F0F0] rounded-[14px]">
                    <div>
                      <p className="text-[13px] font-bold text-black">{t("pages.account.bonuses.trial_bonus")}</p>
                      <p className="text-[10px] text-[#707070] mt-0.5">{t("pages.account.bonuses.trial_bonus_desc")}</p>
                    </div>
                    <span className="bg-[#F0F0F0] text-[#707070] text-[10px] font-bold px-2 py-0.5 rounded-full">{t("pages.settings_page.no_channel") == "Kanal ulanmagan" ? "KUTILMOQDA" : "WAITING"}</span>
                  </div>

                  {aiCreditsData.usedVouchers?.map((v: string) => (
                    <div key={v} className="flex items-center justify-between p-4 bg-[#EFF2FC] border border-[#D8D8D8] rounded-[14px] animate-in fade-in duration-200">
                      <div>
                        <p className="text-[13px] font-bold text-black">{v} promokodi bonusi</p>
                        <p className="text-[10px] text-[#707070] mt-0.5">Muvaffaqiyatli faollashtirilgan</p>
                      </div>
                      <span className="bg-[#EFF2FC] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">FAOLLASHTIRILGAN</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
      />



      <ConfirmModal
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        onConfirm={handleUnlinkCard}
        title={t("pages.account.cancel_confirm.title")}
        message={t("pages.account.cancel_confirm.message")}
        confirmText={t("pages.account.cancel_confirm.confirm")}
        cancelText={t("pages.account.cancel_confirm.cancel")}
      />

      {/* ── AI CREDITS PURCHASE MODAL ── */}
      {isBuyCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-[500px] shadow-2xl overflow-hidden p-6 md:p-8 border border-[#D8D8D8] animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-6">
              <div>
                <h3 className="text-[18px] font-black text-black">AI Kredit Sotib Olish</h3>
                <p className="text-[12px] text-[#707070] mt-1">Sizga mos bo&apos;lgan kredit paketini tanlang</p>
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
                onClick={() => handleBuyCredits(1000, 10000, "Ekonom")}
              >
                <div>
                  <h4 className="text-[15px] font-bold text-black group-hover:text-[#7CA607] transition-colors">Ekonom paket</h4>
                  <p className="text-[11px] text-[#707070] mt-1">~1 000 ta AI yordamchi javobi uchun</p>
                  <span className="text-[20px] font-black text-black mt-2 block">1 000 <span className="text-[11px] font-bold text-[#707070]">kredit</span></span>
                </div>
                <div className="text-right">
                  <span className="bg-black text-[#C7F33C] text-[12px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm group-hover:scale-105 transition-all">
                    10 000 UZS
                  </span>
                </div>
              </div>

              {/* Package 2 */}
              <div 
                className="border border-black bg-black text-white rounded-[20px] p-5 flex items-center justify-between transition-all hover:shadow-md cursor-pointer relative overflow-hidden group"
                onClick={() => handleBuyCredits(5000, 45000, "Standart")}
              >
                <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[8px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-[10px]">
                  10% CHEGIRMA
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-[#C7F33C]">Standart paket</h4>
                  <p className="text-[11px] text-white/60 mt-1">~5 000 ta AI yordamchi javobi uchun</p>
                  <span className="text-[20px] font-black text-white mt-2 block">5 000 <span className="text-[11px] font-bold text-white/60">kredit</span></span>
                </div>
                <div className="text-right">
                  <span className="bg-[#C7F33C] text-black text-[12px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm group-hover:scale-105 transition-all">
                    45 000 UZS
                  </span>
                </div>
              </div>

              {/* Package 3 */}
              <div 
                className="border border-[#E8E8E8] hover:border-black rounded-[20px] p-5 flex items-center justify-between transition-all bg-[#F9F9F7] hover:shadow-md cursor-pointer group"
                onClick={() => handleBuyCredits(10000, 80000, "Biznes")}
              >
                <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[8px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-[10px]">
                  20% CHEGIRMA
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-black group-hover:text-[#7CA607] transition-colors">Biznes paket</h4>
                  <p className="text-[11px] text-[#707070] mt-1">~10 000 ta AI yordamchi javobi uchun</p>
                  <span className="text-[20px] font-black text-black mt-2 block">10 000 <span className="text-[11px] font-bold text-[#707070]">kredit</span></span>
                </div>
                <div className="text-right">
                  <span className="bg-black text-[#C7F33C] text-[12px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm group-hover:scale-105 transition-all">
                    80 000 UZS
                  </span>
                </div>
              </div>
            </div>

            {processingPurchase && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-[32px]">
                <Loader2 className="animate-spin text-black" size={24} />
                <p className="text-[12px] font-bold text-black">To&apos;lov amalga oshirilmoqda...</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── PRICING MODAL ── */}
      {isPricingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-[720px] shadow-2xl overflow-hidden p-8 border border-[#D8D8D8] my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-6">
              <div>
                <h3 className="text-[18px] font-black text-black">{t("pages.account.pricing.title")}</h3>
                <p className="text-[12px] text-[#707070] mt-1">{t("pages.account.pricing.desc")}</p>
              </div>
              <button 
                onClick={() => setIsPricingOpen(false)} 
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Monthly / Yearly Toggle */}
            {(() => {
              return (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="bg-[#EFF2FC] p-1 rounded-full flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-5 py-2 rounded-full text-[12px] font-bold transition-all ${
                          billingCycle === "monthly"
                            ? "bg-black text-white shadow-sm"
                            : "text-[#707070] hover:text-black"
                        }`}
                      >
                        {t("pages.account.pricing.monthly")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle("yearly")}
                        className={`px-5 py-2 rounded-full text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                          billingCycle === "yearly"
                            ? "bg-black text-white shadow-sm"
                            : "text-[#707070] hover:text-black"
                        }`}
                      >
                        <span>{t("pages.account.pricing.yearly")}</span>
                        <span className="bg-[#C7F33C] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">-20%</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pro Card */}
                    <div className={`rounded-[24px] border p-6 flex flex-col justify-between transition-all ${
                      currentUser?.plan === "pro"
                        ? "border-black bg-white ring-2 ring-black/5"
                        : "border-[#E8E8E8] bg-white hover:border-[#CCCCCC]"
                    }`}>
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-[16px] font-bold text-black uppercase tracking-wider">SENDLY PRO</h4>
                            <p className="text-[11px] text-[#707070] mt-1">{t("pages.account.pricing.pro_desc")}</p>
                          </div>
                          {currentUser?.plan === "pro" && (
                            <span className="bg-[#EFF2FC] text-black text-[9px] font-bold px-2 py-0.5 rounded-full">
                              FAOL
                            </span>
                          )}
                        </div>
                        
                        <div className="my-6">
                          <span className="text-[26px] font-black text-black leading-none">
                            {billingCycle === "monthly" ? "150 000" : "1 440 000"}
                          </span>
                          <span className="text-[12px] text-[#707070] ml-1">UZS / {billingCycle === "monthly" ? "oy" : "yil"}</span>
                        </div>

                        <hr className="border-[#F0F0F0] my-4" />

                        <ul className="flex flex-col gap-3">
                          {[
                            "1 ta ulangan kanal (Instagram / Telegram)",
                            "5 ta faol avtomatlashtirish oqimi",
                            "Barcha asosiy bloklar va triggerlar",
                            "Statistika va tahlillar paneli",
                          ].map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-[12px] text-[#505050]">
                              <span className="text-[#10B981] font-bold mt-0.5">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8">
                        <button
                          type="button"
                          disabled={currentUser?.plan === "pro"}
                          onClick={() => handleSelectPlan("pro")}
                          className={`w-full py-3 rounded-full text-[12px] font-bold transition-all active:scale-[0.98] ${
                            currentUser?.plan === "pro"
                              ? "bg-[#EFF2FC] text-[#707070] cursor-default"
                              : "bg-[#EFF2FC] text-black hover:bg-[#e4e8f5]"
                          }`}
                        >
                          {currentUser?.plan === "pro" ? t("pages.account.pricing.current_plan") : t("pages.account.pricing.switch_pro")}
                        </button>
                      </div>
                    </div>

                    {/* Premium Card */}
                    <div className={`rounded-[24px] border p-6 flex flex-col justify-between bg-[#0F0F0F] text-white transition-all relative overflow-hidden ${
                      currentUser?.plan === "premium"
                        ? "border-[#C7F33C] ring-2 ring-[#C7F33C]/20"
                        : "border-white/10 hover:border-white/20"
                    }`}>
                      <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[9px] font-extrabold uppercase px-3.5 py-1 rounded-bl-[14px]">
                        {t("pages.account.pricing.recommended")}
                      </div>

                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-[16px] font-bold text-[#C7F33C] uppercase tracking-wider">SENDLY PREMIUM</h4>
                            <p className="text-[11px] text-white/60 mt-1">{t("pages.account.pricing.premium_desc")}</p>
                          </div>
                          {currentUser?.plan === "premium" && (
                            <span className="bg-white/10 text-[#C7F33C] text-[9px] font-bold px-2 py-0.5 rounded-full">
                              FAOL
                            </span>
                          )}
                        </div>
                        
                        <div className="my-6">
                          <span className="text-[26px] font-black text-[#C7F33C] leading-none">
                            {billingCycle === "monthly" ? "1 000 000" : "9 600 000"}
                          </span>
                          <span className="text-[12px] text-white/60 ml-1">UZS / {billingCycle === "monthly" ? "oy" : "yil"}</span>
                        </div>

                        <hr className="border-white/10 my-4" />

                        <ul className="flex flex-col gap-3">
                          {[
                            "10 ta ulangan kanal (Instagram + Telegram)",
                            "50 ta faol avtomatlashtirish oqimi",
                            "Limitsiz Telegram broadcast xabarlari",
                            "Yuqori tezlikdagi serverlar",
                            "24/7 VIP shaxsiy menejer yordami",
                          ].map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-[12px] text-white/90">
                              <span className="text-[#C7F33C] font-bold mt-0.5">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8">
                        <button
                          type="button"
                          disabled={currentUser?.plan === "premium"}
                          onClick={() => handleSelectPlan("premium")}
                          className={`w-full py-3 rounded-full text-[12px] font-bold transition-all active:scale-[0.98] ${
                            currentUser?.plan === "premium"
                              ? "bg-white/10 text-white/40 cursor-default"
                              : "bg-[#C7F33C] text-black hover:bg-[#b0d82f]"
                          }`}
                        >
                          {currentUser?.plan === "premium" ? t("pages.account.pricing.current_plan") : t("pages.account.pricing.switch_premium")}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
