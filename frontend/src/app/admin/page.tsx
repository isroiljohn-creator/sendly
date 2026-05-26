"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, AlertModal } from "@/components/ui/primitives";
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
  Sparkles, 
  RefreshCw, 
  Eye, 
  ArrowRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import { db } from "@/lib/db";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "promos" | "referrals" | "bots" | "logs">("overview");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin Data states
  const [stats, setStats] = useState<any>({ totalUsers: 0, activePremiumCount: 0, activeProCount: 0, totalChannels: 0, totalCredits: 0, totalCommissions: "$0.00" });
  const [users, setUsers] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [botContacts, setBotContacts] = useState<any[]>([]);
  const [systemAnnouncement, setSystemAnnouncement] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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

  // Modals
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
        setUsers(data.users);
        setPromos(data.promoCodes);
        setReferrals(data.referrals);
        setBotContacts(data.botContacts);
        setSystemAnnouncement(data.systemAnnouncement);
        setNewAnnouncement(data.systemAnnouncement);
        setAuditLogs(data.auditLogs);
      }
    } catch (e) {
      console.error("Failed to load admin panel data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    if (user && (user.email === "admin@sendly.uz" || user.email === "isroiljohnabdullayev@gmail.com" || (user as any).role === "admin")) {
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
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <div className="animate-spin text-[30px]">⚙️</div>
          <p className="text-[13px] font-bold text-black/80">Admin panel ma&apos;lumotlari yuklanmoqda...</p>
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
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const handleImpersonate = async (email: string) => {
    // Write audit log first
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const [userQuery, setUserQuery] = useState("");
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(userQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(userQuery.toLowerCase())
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
          <Card className="p-4 flex flex-col gap-1 border border-[#D8D8D8]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "overview" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <TrendingUp size={16} />
              <span>Umumiy tahlil</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "users" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Users size={16} />
              <span>Foydalanuvchilar</span>
            </button>

            <button
              onClick={() => setActiveTab("promos")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "promos" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Ticket size={16} />
              <span>Promokodlar</span>
            </button>

            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "referrals" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <UserCheck size={16} />
              <span>Referallar oqimi</span>
            </button>

            <button
              onClick={() => setActiveTab("bots")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "bots" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Cpu size={16} />
              <span>Mijozlar menyusi (Stuck)</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-[16px] text-left text-[13px] font-bold transition-all ${
                activeTab === "logs" ? "bg-black text-[#C7F33C]" : "text-[#595959] hover:bg-[#F0F0F0]/50 hover:text-black"
              }`}
            >
              <Terminal size={16} />
              <span>Tizim loglari</span>
            </button>
          </Card>
        </div>

        {/* Right sub-dashboard */}
        <div className="flex-1 min-w-0">
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 flex flex-col justify-between min-h-[120px] relative border border-[#D8D8D8]">
                  <h4 className="text-[12px] font-bold text-[#707070] uppercase">Jami foydalanuvchilar</h4>
                  <div className="text-[28px] font-black text-black mt-3">{stats.totalUsers} ta</div>
                  <p className="text-[10px] text-[#707070] mt-1">Ro&apos;yxatdan o&apos;tgan jami hisoblar</p>
                </Card>
                
                <Card className="p-6 flex flex-col justify-between min-h-[120px] relative border border-[#D8D8D8]">
                  <h4 className="text-[12px] font-bold text-[#707070] uppercase">Premium / Pro obunalar</h4>
                  <div className="text-[28px] font-black text-black mt-3">
                    {stats.activePremiumCount} / {stats.activeProCount}
                  </div>
                  <p className="text-[10px] text-[#707070] mt-1">Faol to&apos;lov qiluvchi foydalanuvchilar</p>
                </Card>

                <Card className="p-6 flex flex-col justify-between min-h-[120px] relative border border-[#D8D8D8]">
                  <h4 className="text-[12px] font-bold text-[#707070] uppercase">Ulangan chatbotlar</h4>
                  <div className="text-[28px] font-black text-black mt-3">{stats.totalChannels} ta</div>
                  <p className="text-[10px] text-[#707070] mt-1">Faol Telegram va Instagram ulanishlari</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 border border-[#D8D8D8]">
                  <h3 className="text-[15px] font-bold text-black mb-4">Tizim moliyaviy aylanmasi</h3>
                  <div className="flex justify-between items-center py-2 border-b border-[#F0F0F0] text-[12px]">
                    <span className="text-[#707070]">Barcha foydalanuvchilar AI kreditlari:</span>
                    <span className="font-bold text-black">{stats.totalCredits?.toLocaleString("uz-UZ")} kredit</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#F0F0F0] text-[12px]">
                    <span className="text-[#707070]">Hamkorlik to&apos;langan komissiyalar:</span>
                    <span className="font-bold text-[#7CA607]">{stats.totalCommissions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-[12.5px] font-extrabold mt-2">
                    <span className="text-black">Hisoblangan jami aylanma (SaaS):</span>
                    <span className="text-black">
                      {((stats.activePremiumCount * 1000000) + (stats.activeProCount * 150000))?.toLocaleString("uz-UZ")} UZS / oy
                    </span>
                  </div>
                </Card>

                <Card className="p-6 border border-[#D8D8D8]">
                  <h3 className="text-[15px] font-bold text-black mb-4">Global e&apos;lon va ogohlantirish paneli</h3>
                  <form onSubmit={handleSetAnnouncement} className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Texnik ishlar, aksiya yoki yangiliklar haqida bildirishnoma matni..."
                      className="w-full rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[12px] text-black focus:outline-none focus:border-black"
                    />
                    <Button type="submit" variant="primary" className="py-2.5 rounded-[10px] text-[11px] self-end gap-1.5">
                      <Megaphone size={13} />
                      <span>E&apos;lonni saqlash</span>
                    </Button>
                  </form>
                  {systemAnnouncement && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-[11px] rounded-lg text-amber-800 flex justify-between items-center">
                      <span><strong>Faol bildirishnoma:</strong> &quot;{systemAnnouncement}&quot;</span>
                      <button onClick={() => {
                        setNewAnnouncement("");
                        fetch("/api/admin", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "set_system_announcement", announcement: "" })
                        }).then(() => loadAdminData());
                      }} className="text-red-500 font-bold hover:underline">O&apos;chirish</button>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {activeTab === "users" && (
            <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
              <div className="p-5 border-b border-[#F0F0F0] flex flex-wrap gap-4 items-center justify-between bg-white">
                <div className="relative flex items-center w-full max-w-[320px]">
                  <Search size={16} className="absolute left-4 text-[#707070]" />
                  <input
                    type="text"
                    placeholder="Ism yoki email bo'yicha qidirish..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 py-2 text-[12.5px] text-black outline-none placeholder:text-[#a0a0a0] focus:bg-[#e8e8e8]"
                  />
                </div>
                <div className="text-[12px] text-[#707070] font-semibold">
                  Jami: {filteredUsers.length} ta a&apos;zo
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="px-6 py-3">Foydalanuvchi</th>
                      <th className="px-6 py-3">Tarif</th>
                      <th className="px-6 py-3">Karta holati</th>
                      <th className="px-6 py-3 text-right">Kanallar</th>
                      <th className="px-6 py-3 text-right">AI Kredit balansi</th>
                      <th className="px-6 py-3 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#F9F9F7]/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-black">{u.fullName}</div>
                          <div className="text-[10px] text-[#707070]">{u.email}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            u.plan === "premium" ? "bg-black text-[#C7F33C]" :
                            u.plan === "pro" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {u.plan || "free"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {u.isCardLinked ? (
                            <span className="text-[#7CA607] font-semibold">Ulandi ({u.cardNumber?.split(" ").pop()})</span>
                          ) : (
                            <span className="text-[#A0A0A0]">Bog&apos;lanmagan</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium">{u.channelsCount} ta</td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-black">{u.creditsBalance?.toLocaleString("uz-UZ")}</td>
                        <td className="px-6 py-3.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setManualPlanInput(u.plan || "free");
                              setManualCreditInput("");
                            }}
                            className="bg-[#EFF2FC] text-black hover:bg-[#e1e6f7] font-bold text-[11px] px-2.5 py-1 rounded-lg"
                          >
                            Boshqarish
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
          )}

          {/* ── PROMO CODES TAB ── */}
          {activeTab === "promos" && (
            <div className="flex flex-col gap-6">
              {/* Creator Form */}
              <Card className="p-6 border border-[#D8D8D8]">
                <h3 className="text-[15px] font-bold text-black mb-4">Yangi promokod yaratish</h3>
                <form onSubmit={handleCreatePromo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">Kupon kodi</label>
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
                    <label className="text-[10px] font-bold text-[#707070] uppercase">Kredit miqdori</label>
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
                    <label className="text-[10px] font-bold text-[#707070] uppercase">Maksimal faollashtirishlar</label>
                    <input
                      type="number"
                      value={newPromoMaxUses}
                      onChange={(e) => setNewPromoMaxUses(e.target.value)}
                      placeholder="100"
                      className="rounded-[10px] border border-[#D8D8D8] px-3.5 py-2.5 text-[12px] text-black focus:outline-none focus:border-black font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#707070] uppercase">Maxsus email (ixtiyoriy)</label>
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
                      <span>Promokod qo&apos;shish</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Promos Table */}
              <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
                <div className="p-5 border-b border-[#F0F0F0] bg-white">
                  <h3 className="text-[15px] font-bold text-black">Mavjud promokodlar ro&apos;yxati</h3>
                </div>
                <div className="overflow-x-auto bg-white">
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                        <th className="px-6 py-3">Kod</th>
                        <th className="px-6 py-3">Kredit qiymati</th>
                        <th className="px-6 py-3">Ishlatildi</th>
                        <th className="px-6 py-3">Cheklov (Email)</th>
                        <th className="px-6 py-3">Yaratilgan sana</th>
                        <th className="px-6 py-3 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {promos.map((p) => (
                        <tr key={p.code} className="hover:bg-[#F9F9F7]/50 transition-colors">
                          <td className="px-6 py-3.5 font-black text-black tracking-wider">{p.code}</td>
                          <td className="px-6 py-3.5 font-extrabold text-[#7CA607]">{p.amount?.toLocaleString("uz-UZ")}</td>
                          <td className="px-6 py-3.5">
                            <span className="font-semibold">{p.usedCount}</span> / <span className="text-[#707070]">{p.maxUses}</span>
                            <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-[#7CA607] h-full" style={{ width: `${Math.min(100, (p.usedCount / (p.maxUses || 1)) * 100)}%` }} />
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
                <h3 className="text-[16px] font-semibold text-black">Taklif etilgan referallar to&apos;liq oqimi</h3>
                <p className="text-[11px] text-[#707070] mt-1">Tizimdagi barcha foydalanuvchilar hamkorlik havolasi va to&apos;lovlar tarixi</p>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="py-3 px-6">Taklif etgan (Partner)</th>
                      <th className="py-3 px-6">Ro&apos;yxatdan o&apos;tgan a&apos;zo</th>
                      <th className="py-3 px-6">Tarif rejasi</th>
                      <th className="py-3 px-6">Hisoblangan komissiya (30%)</th>
                      <th className="py-3 px-6 text-right">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#A0A0A0] italic">
                          Hozircha referallar tarmog&apos;ida ma&apos;lumotlar mavjud emas.
                        </td>
                      </tr>
                    ) : referrals.map((ref) => (
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
                            ref.plan === "premium" ? "bg-black text-[#C7F33C]" :
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
                <h3 className="text-[16px] font-semibold text-black">Chatbot foydalanuvchilari qadamlari (State Tracker)</h3>
                <p className="text-[11px] text-[#707070] mt-1">
                  Mijozlarning chat-menyuning qaysi bo&apos;limida to&apos;xtab qolganligini aniqlash va kuzatish paneli.
                </p>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[10px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="py-3 px-6">Mijoz (Contact)</th>
                      <th className="py-3 px-6">Chatbot egasi (Sendly foydalanuvchisi)</th>
                      <th className="py-3 px-6 text-right">Xabarlar soni</th>
                      <th className="py-3 px-6">Oxirgi faollik</th>
                      <th className="py-3 px-6 text-right">To&apos;xtab qolgan menyu qadami (Stuck step)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {botContacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#A0A0A0] italic">
                          Hozircha faol chatbot mijozlari ro&apos;yxati yuklanmadi.
                        </td>
                      </tr>
                    ) : botContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-[#FDFDFD] text-[12px] text-black transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[10px] text-[#707070]">@{c.username}</div>
                        </td>
                        <td className="py-3.5 px-6 text-[#505050] font-medium">{c.ownerEmail}</td>
                        <td className="py-3.5 px-6 text-right font-semibold">{c.messagesCount} ta</td>
                        <td className="py-3.5 px-6 text-[#707070]">{c.lastActive}</td>
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
                <span className="text-[#C7F33C] font-bold">SYSTEM AUDIT LOGS Terminal</span>
                <button onClick={loadAdminData} className="text-white/60 hover:text-white flex items-center gap-1 font-bold text-[10px]">
                  <RefreshCw size={10} />
                  <span>Yangilash</span>
                </button>
              </div>
              <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-2">
                {auditLogs.map((log) => (
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
          <div className="bg-white rounded-[28px] w-full max-w-[460px] p-7 border border-[#D8D8D8] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[17px] font-black text-black leading-none mb-2">Foydalanuvchini boshqarish</h3>
            <p className="text-[12px] text-[#707070] mb-5">{selectedUser.fullName} ({selectedUser.email})</p>

            <div className="flex flex-col gap-5">
              {/* Option 1: Plan update */}
              <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#F0F0F0] flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#707070] uppercase">Tarif rejasini o&apos;zgartirish</label>
                <div className="flex gap-2">
                  <select
                    value={manualPlanInput}
                    onChange={(e) => setManualPlanInput(e.target.value)}
                    className="flex-1 rounded-[10px] border border-[#D8D8D8] px-3 py-2 text-[12px] bg-white focus:outline-none focus:border-black font-semibold text-black"
                  >
                    <option value="free">FREE Plan</option>
                    <option value="pro">PRO Plan</option>
                    <option value="premium">PREMIUM Plan</option>
                  </select>
                  <button
                    onClick={() => handleUpdatePlan(selectedUser.id, manualPlanInput)}
                    className="bg-black hover:bg-black/90 text-white font-bold text-[11px] px-4 rounded-[10px] transition-all"
                  >
                    Saqlash
                  </button>
                </div>
              </div>

              {/* Option 2: Credits override */}
              <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#F0F0F0] flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#707070] uppercase">AI kreditlarini qo&apos;shish / yechish</label>
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
                    Kiritish
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-7">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-gray-100 hover:bg-gray-200 text-black font-bold text-[12px] px-5 py-2.5 rounded-full transition-all"
              >
                Yopish
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
    </AppLayout>
  );
}
