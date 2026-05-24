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
  Plus
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
    const user = db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setName(user.fullName);
      setEmail(user.email);
      setPassword(user.password || "123456");
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
  }, []);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Save updated name/email/password
    const users = db.getUsers();
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx > -1) {
      users[idx].fullName = name;
      users[idx].email = email;
      users[idx].password = password;
      localStorage.setItem("replai_users", JSON.stringify(users));
    }
    
    const updatedUser = { ...currentUser, fullName: name, email, password };
    localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    showAlert(t("common.success"), t("pages.account.general.desc") + " " + t("common.success").toLowerCase());
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

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    showAlert(t("pages.account.bonuses.success_title"), t("pages.account.bonuses.success_msg").replace("{code}", voucherCode.toUpperCase()));
    setVoucherCode("");
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
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                    placeholder={t("pages.account.general.email_placeholder")}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#707070] uppercase tracking-wider">{t("pages.account.general.password")}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black bg-white"
                    placeholder={t("pages.account.general.password_placeholder")}
                  />
                  <p className="text-[10px] text-[#707070] mt-0.5">{t("pages.account.general.password_desc")}</p>
                </div>

                <div className="mt-2 flex justify-start">
                  <Button type="submit" variant="primary" className="gap-2 px-6 py-3 rounded-[10px] text-[13px]">
                    <Save size={14} />
                    <span>{t("common.save")}</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="flex flex-col gap-6 max-w-[640px]">
              {/* Premium Plan block */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-bold text-black">
                      {currentUser?.plan === "premium" ? t("pages.account.billing.premium_plan") : currentUser?.plan === "pro" ? t("pages.account.billing.pro_plan") : t("pages.account.billing.free_plan")}
                    </h3>
                  </div>
                  <p className="text-[12px] text-[#707070] mt-1.5">
                    {currentUser?.isCardLinked ? t("pages.account.billing.next_payment").replace("{date}", "9-oktabr, 2026") : t("pages.account.billing.upgrade_desc")}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-[20px] font-bold text-black leading-none">
                    {currentUser?.plan === "premium" ? "1 000 000 UZS" : currentUser?.plan === "pro" ? "150 000 UZS" : "0 UZS"}
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

              {/* Tarifni o'zgartirish va Karta bog'lash buttonlari */}
              <div className="flex flex-wrap items-center gap-4 py-2">
                <button
                  onClick={() => setIsPricingOpen(true)}
                  className="flex items-center gap-1.5 text-[#2563EB] hover:text-[#1d4ed8] hover:underline font-semibold text-[13px]"
                >
                  <CreditCard size={15} />
                  <span>{t("pages.account.billing.change_plan")}</span>
                </button>
                {!currentUser?.isCardLinked && !isLinking && (
                  <button
                    onClick={() => setIsLinking(true)}
                    className="flex items-center gap-1.5 text-[#2563EB] hover:text-[#1d4ed8] hover:underline font-semibold text-[13px] border-l border-[#E8E8E8] pl-4"
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

                      <div className="grid grid-cols-2 gap-4">
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
                        <Button type="submit" variant="accent" className="rounded-[10px] text-[12px] px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
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
                        <Button type="submit" variant="accent" className="rounded-[10px] text-[12px] px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                          {t("common.confirm")}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="text-[11px] text-[#707070] leading-relaxed bg-[#F9F9F7] p-3.5 rounded-[12px] border border-[#F0F0F0] mt-4 flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold shrink-0">ⓘ</span>
                    <span>
                      {"Kartani bog'lash mutlaqo bepul. 7 kunlik bepul sinov muddati yakunlanmaguncha kartangizdan pul yechilmaydi. Sinov muddati tugagandan so'nggina keyingi davr uchun to'lov olinadi."}
                    </span>
                  </div>
                </Card>
              )}
            </div>
          )}

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

                <div className="bg-[#F9F9F7] border border-[#F0F0F0] rounded-[14px] p-4.5 mt-2">
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
