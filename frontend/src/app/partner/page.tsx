"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, AlertModal } from "@/components/ui/primitives";
import { 
  Home, 
  Users, 
  Copy, 
  Check, 
  HelpCircle, 
  ArrowUpRight, 
  DollarSign, 
  Wallet
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";

type ReferredUser = {
  id: string;
  name: string;
  username: string;
  date: string;
  plan: "VIP" | "Premium" | "Trial" | "Bepul";
  commission: string;
  status: "Faol" | "Kutilmoqda";
};

export default function PartnerPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"home" | "referrals">("home");
  const [copied, setCopied] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [referrals, setReferrals] = useState<ReferredUser[]>([]);

  useEffect(() => {
    // 1. Sync session state & load current user
    const user = db.syncCurrentUserSession() || db.getCurrentUser();
    setCurrentUser(user);

    // 2. Compute referrals dynamically from the list of users
    const allUsers = db.getUsers();
    const myReferrals = allUsers.filter((u: any) => u.referredBy === user?.id);

    const mapped = myReferrals.map((u: any) => {
      let planLabel: "VIP" | "Premium" | "Trial" | "Bepul" = "Bepul";
      let commissionVal = "0 UZS";
      let statusVal: "Faol" | "Kutilmoqda" = "Kutilmoqda";

      if (u.plan === "vip") {
        planLabel = "VIP";
        commissionVal = "180 000 UZS";
        statusVal = "Faol";
      } else if (u.plan === "premium") {
        planLabel = "Premium";
        commissionVal = "45 000 UZS";
        statusVal = "Faol";
      } else if (u.plan === "pro") {
        planLabel = "Trial";
        commissionVal = "22 500 UZS";
        statusVal = "Faol";
      }

      return {
        id: u.id || u.email,
        name: u.fullName || u.email.split("@")[0],
        username: u.email,
        date: u.trialExpiresAt || new Date().toLocaleDateString("uz-UZ"),
        plan: planLabel,
        commission: commissionVal,
        status: statusVal
      };
    });
    setReferrals(mapped);
  }, []);

  const referralsCount = referrals.length;
  const totalEarnedFloat = referrals.reduce((acc, r) => {
    const val = parseFloat(r.commission.replace(/[^0-9]/g, ""));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  const totalEarned = `${totalEarnedFloat.toLocaleString("uz-UZ")} UZS`;
  const balance = totalEarned;

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?r=${currentUser?.id || "guest"}`
    : `https://sendly.uz/register?r=guest`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <PageHeader 
        title={t("pages.partner.title")} 
        breadcrumbs={t("pages.partner.breadcrumb")} 
      />

      <div className="flex flex-col lg:flex-row gap-6 mt-2">
        {/* Left Sub-sidebar Column */}
        <div className="w-full lg:w-[240px] shrink-0">
          <Card className="p-3 lg:p-4 flex lg:flex-col gap-2 lg:gap-1 border border-[#D8D8D8] overflow-x-auto lg:overflow-x-visible [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-medium transition-all ${
                activeTab === "home"
                  ? "bg-black text-[#C7F33C]"
                  : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Home size={16} />
              <span>{t("pages.partner.home_tab")}</span>
            </button>

            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-3 shrink-0 whitespace-nowrap px-4 py-3 rounded-[16px] text-left text-[13px] font-medium transition-all ${
                activeTab === "referrals"
                  ? "bg-black text-[#C7F33C]"
                  : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Users size={16} />
              <span>{t("pages.partner.referrals_tab")}</span>
            </button>
          </Card>
        </div>

        {/* Right Content Column */}
        <div className="flex-1">
          {activeTab === "home" && (
            <div className="flex flex-col gap-6">
              {/* Stats Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Joriy balans */}
                <Card className="flex flex-col justify-between min-h-[120px] p-6 relative">
                  <div className="flex items-start justify-between">
                    <span className="text-[13px] text-[#707070] font-medium">{t("pages.partner.balance")}</span>
                    <div className="h-8 w-8 rounded-full bg-[#F0F0F0] flex items-center justify-center text-black">
                      <Wallet size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-semibold text-black leading-none">{balance}</div>
                    <div className="mt-1.5 text-[10px] text-[#707070] font-semibold flex items-center gap-1">
                      <span>{t("pages.partner.payout_available")}</span>
                    </div>
                  </div>
                </Card>

                {/* Jami daromad */}
                <Card className="flex flex-col justify-between min-h-[120px] p-6 relative">
                  <div className="flex items-start justify-between">
                    <span className="text-[13px] text-[#707070] font-medium">{t("pages.partner.total_earned")}</span>
                    <div className="h-8 w-8 rounded-full bg-[#F0F0F0] flex items-center justify-center text-black">
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-semibold text-black leading-none">{totalEarned}</div>
                    <div className="mt-1.5 text-[10px] text-[#707070]">{t("pages.partner.total_earned_desc")}</div>
                  </div>
                </Card>

                {/* Taklif etilgan mijozlar */}
                <Card className="flex flex-col justify-between min-h-[120px] p-6 relative cursor-pointer group" onClick={() => setActiveTab("referrals")}>
                  <div className="flex items-start justify-between">
                    <span className="text-[13px] text-[#707070] font-medium">{t("pages.partner.referrals_count")}</span>
                    <div className="h-8 w-8 rounded-full bg-[#F0F0F0] group-hover:bg-[#C7F33C] flex items-center justify-center text-black transition-colors">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-semibold text-black leading-none">{referralsCount}</div>
                    <div className="mt-1.5 text-[10px] text-[#707070]">{t("pages.partner.referrals_count_desc")}</div>
                  </div>
                </Card>
              </div>

              {/* Status and commission rate info card */}
              <Card className="p-6 md:p-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#3B82F6] text-white flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shadow-sm">
                      <Check size={11} strokeWidth={3} />
                      <span>{t("pages.partner.status_pro")}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-black">{t("pages.partner.status_label")}</span>
                      <span className="text-[13px] font-bold text-[#10B981]">{t("pages.partner.status_active")}</span>
                      <button onClick={() => setIsAlertOpen(true)} className="text-[#A0A0A0] hover:text-black">
                        <HelpCircle size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#707070]">
                    {t("pages.partner.monthly_payout_info")}
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-bold text-black leading-none">{t("pages.partner.commission_rate")}</span>
                    <span className="text-[13px] font-semibold text-black">{t("pages.partner.commission_duration")}</span>
                  </div>
                  <p className="text-[12px] text-[#707070] mt-2 leading-relaxed max-w-[580px]">
                    {t("pages.partner.commission_desc")}
                  </p>
                </div>
              </Card>

              {/* Referral Link copy block */}
              <Card className="p-6">
                <h4 className="text-[11px] font-bold text-[#707070] uppercase tracking-wider mb-2.5">{t("pages.partner.your_ref_link")}</h4>
                
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 bg-[#F5F5F5] rounded-[18px] border border-[#E5E5E5] px-4 py-3 text-[12px] text-black font-medium select-all truncate">
                    {referralLink}
                  </div>
                  <Button 
                    variant={copied ? "accent" : "primary"} 
                    onClick={handleCopyLink}
                    className="shrink-0 h-[44px] px-5 gap-2 rounded-[18px] transition-all"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span className="hidden sm:inline">{t("pages.partner.copied_btn")}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span className="hidden sm:inline">{t("pages.partner.copy_btn")}</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-[#707070] mt-3.5 leading-relaxed">
                  {t("pages.partner.ref_link_desc")}
                </p>
              </Card>
            </div>
          )}

          {activeTab === "referrals" && (
            <Card className="overflow-hidden p-0">
              <div className="p-6 border-b border-[#F0F0F0]">
                <h3 className="text-[16px] font-semibold text-black">{t("pages.partner.history_title")}</h3>
                <p className="text-[11px] text-[#707070] mt-1">{t("pages.partner.history_desc")}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="py-3 px-6">{t("pages.partner.table_client")}</th>
                      <th className="py-3 px-6">{t("pages.partner.table_date")}</th>
                      <th className="py-3 px-6">{t("pages.partner.table_plan")}</th>
                      <th className="py-3 px-6">{t("pages.partner.table_commission")}</th>
                      <th className="py-3 px-6 text-right">{t("pages.partner.table_status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users size={32} strokeWidth={1.5} className="text-[#D8D8D8]" />
                            <p className="text-[13px] text-[#707070]">{t("pages.partner.no_referrals")}</p>
                            <p className="text-[11px] text-[#A0A0A0]">{t("pages.partner.no_referrals_sub")}</p>
                          </div>
                        </td>
                      </tr>
                    ) : referrals.map((ref) => (
                      <tr key={ref.id} className="border-b border-[#F0F0F0] hover:bg-[#FDFDFD] text-[12px] text-black transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-semibold">{ref.name}</div>
                          <div className="text-[10px] text-[#707070] mt-0.5">{ref.username}</div>
                        </td>
                        <td className="py-3.5 px-6 text-[#707070]">{ref.date}</td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ref.plan === "VIP" ? "bg-black text-[#C7F33C] border border-[#C7F33C]" :
                            ref.plan === "Premium" ? "bg-[#C7F33C]/20 text-[#1A2906]" :
                            ref.plan === "Trial" ? "bg-blue-50 text-blue-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {ref.plan}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-semibold">{ref.commission}</td>
                        <td className="py-3.5 px-6 text-right">
                          <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                            ref.status === "Faol" ? "bg-[#10B981]" : "bg-yellow-400"
                          }`} />
                          <span className="text-[11px] font-medium">
                            {ref.status === "Faol" ? t("pages.partner.status_active") : t("pages.partner.status_pending")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={t("pages.partner.modal_title")}
        message={t("pages.partner.modal_message")}
      />
    </AppLayout>
  );
}
