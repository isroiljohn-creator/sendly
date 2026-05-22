"use client";

import { useState } from "react";
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

type ReferredUser = {
  id: string;
  name: string;
  username: string;
  date: string;
  plan: "Premium" | "Trial" | "Bepul";
  commission: string;
  status: "Faol" | "Kutilmoqda";
};

const REFERRALS: ReferredUser[] = [
  { id: "1", name: "Nodir Dev", username: "@nodir_dev", date: "20 May, 2026", plan: "Premium", commission: "$75.00", status: "Faol" },
  { id: "2", name: "Marketing Hub", username: "@marketing_hub", date: "19 May, 2026", plan: "Premium", commission: "$75.00", status: "Faol" },
  { id: "3", name: "Sardor Salimov", username: "@sardor_salim", date: "18 May, 2026", plan: "Trial", commission: "$0.00", status: "Faol" },
  { id: "4", name: "Dilshod Media", username: "@dilshod_media", date: "15 May, 2026", plan: "Premium", commission: "$75.00", status: "Faol" },
  { id: "5", name: "Lola Beauty", username: "@lola_beauty", date: "14 May, 2026", plan: "Bepul", commission: "$0.00", status: "Kutilmoqda" },
  { id: "6", name: "Farruh Karimov", username: "@farruh_k", status: "Faol", plan: "Premium", commission: "$75.00", date: "12 May, 2026" },
  { id: "7", name: "Jasur Rahimov", username: "@jasur_r", status: "Faol", plan: "Trial", commission: "$0.00", date: "10 May, 2026" },
];

export default function PartnerPage() {
  const [activeTab, setActiveTab] = useState<"home" | "referrals">("home");
  const [copied, setCopied] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  const referralLink = "https://sendly.uz/uz/?r=9a2dd22c-beae-4381-be95-259b4e8c187f";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Hamkor kabineti" 
        breadcrumbs="Boshqaruv / Hamkor kabineti" 
      />

      <div className="flex flex-col lg:flex-row gap-6 mt-2">
        {/* Left Sub-sidebar Column */}
        <div className="w-full lg:w-[240px] shrink-0">
          <Card className="p-4 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-medium transition-all ${
                activeTab === "home"
                  ? "bg-black text-[#C7F33C]"
                  : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Home size={16} />
              <span>Bosh sahifa</span>
            </button>

            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-medium transition-all ${
                activeTab === "referrals"
                  ? "bg-black text-[#C7F33C]"
                  : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Users size={16} />
              <span>Taklif etilgan mijozlar</span>
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
                    <span className="text-[13px] text-[#707070] font-medium">Joriy balans</span>
                    <div className="h-8 w-8 rounded-full bg-[#F0F0F0] flex items-center justify-center text-black">
                      <Wallet size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-semibold text-black leading-none">$61.84</div>
                    <div className="mt-1.5 text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
                      <span>Yechib olish mumkin</span>
                    </div>
                  </div>
                </Card>

                {/* Jami daromad */}
                <Card className="flex flex-col justify-between min-h-[120px] p-6 relative">
                  <div className="flex items-start justify-between">
                    <span className="text-[13px] text-[#707070] font-medium">Jami daromad</span>
                    <div className="h-8 w-8 rounded-full bg-[#F0F0F0] flex items-center justify-center text-black">
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-semibold text-black leading-none">$361.84</div>
                    <div className="mt-1.5 text-[10px] text-[#707070]">Barcha davr davomida</div>
                  </div>
                </Card>

                {/* Taklif etilgan mijozlar */}
                <Card className="flex flex-col justify-between min-h-[120px] p-6 relative cursor-pointer group" onClick={() => setActiveTab("referrals")}>
                  <div className="flex items-start justify-between">
                    <span className="text-[13px] text-[#707070] font-medium">Taklif etilgan mijozlar</span>
                    <div className="h-8 w-8 rounded-full bg-[#F0F0F0] group-hover:bg-[#C7F33C] flex items-center justify-center text-black transition-colors">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-semibold text-black leading-none">319</div>
                    <div className="mt-1.5 text-[10px] text-[#707070]">{"Muvaffaqiyatli ro'yxatdan o'tganlar"}</div>
                  </div>
                </Card>
              </div>

              {/* Status and commission rate info card */}
              <Card className="p-6 md:p-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#3B82F6] text-white flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shadow-sm">
                      <Check size={11} strokeWidth={3} />
                      <span>Pro</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-black">Hamkor statusi:</span>
                      <span className="text-[13px] font-bold text-[#10B981]">Faol</span>
                      <button onClick={() => setIsAlertOpen(true)} className="text-[#A0A0A0] hover:text-black">
                        <HelpCircle size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#707070]">
                    Hisob-kitob har oyning 5-sanasida amalga oshiriladi.
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-bold text-black leading-none">30%</span>
                    <span className="text-[13px] font-semibold text-black">36 oy davomida</span>
                  </div>
                  <p className="text-[12px] text-[#707070] mt-2 leading-relaxed max-w-[580px]">
                    {"Referal havola orqali ro'yxatdan o'tgan va premium obunaga to'lov qilgan foydalanuvchilarning har bir to'lovidan 30% hamkorlik komissiyasi taqdim etiladi."}
                  </p>
                </div>
              </Card>

              {/* Referral Link copy block */}
              <Card className="p-6">
                <h4 className="text-[11px] font-bold text-[#707070] uppercase tracking-wider mb-2.5">Sizning referal havolangiz</h4>
                
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
                        <span className="hidden sm:inline">Nusxalandi</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span className="hidden sm:inline">Nusxa olish</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-[#707070] mt-3.5 leading-relaxed">
                  {"Foydalanuvchi ushbu havola orqali ro'yxatdan o'tgandan so'ng 7 kunlik Pro sinov rejasida bepul foydalanish va qo'shimcha 7 kun bonus olish imkoniyatiga ega bo'ladi."}
                </p>
              </Card>
            </div>
          )}

          {activeTab === "referrals" && (
            <Card className="overflow-hidden p-0">
              <div className="p-6 border-b border-[#F0F0F0]">
                <h3 className="text-[16px] font-semibold text-black">Taklif etilgan mijozlar</h3>
                <p className="text-[11px] text-[#707070] mt-1">{"Havolangiz orqali ro'yxatdan o'tgan foydalanuvchilarning to'liq tarixi"}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="py-3 px-6">Mijoz ismi</th>
                      <th className="py-3 px-6">Sana</th>
                      <th className="py-3 px-6">Tarif</th>
                      <th className="py-3 px-6">Komissiya</th>
                      <th className="py-3 px-6 text-right">Holati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFERRALS.map((ref) => (
                      <tr key={ref.id} className="border-b border-[#F0F0F0] hover:bg-[#FDFDFD] text-[12px] text-black transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-semibold">{ref.name}</div>
                          <div className="text-[10px] text-[#707070] mt-0.5">{ref.username}</div>
                        </td>
                        <td className="py-3.5 px-6 text-[#707070]">{ref.date}</td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                          <span className="text-[11px] font-medium">{ref.status}</span>
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
        title="Hamkorlik Tizimi"
        message="Sizning Pro hamkorlik darajangiz faol. Doimiy taklif qiluvchi hamkorlarimiz uchun maxsus 30% komissiya stavkasi 3 yil (36 oy) davomida amal qiladi. Komissiyalar har oyning boshida avtomatik ravishda tasdiqlanadi va joriy balansingizga qo'shiladi."
      />
    </AppLayout>
  );
}
