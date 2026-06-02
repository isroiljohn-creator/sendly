"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Home, 
  Zap, 
  Brain, 
  MessageSquare, 
  Menu, 
  X, 
  Users, 
  Send, 
  BarChart3, 
  Settings, 
  User, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  Plus, 
  Bot,
  Check
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ConnectChannelModal } from "./ConnectChannelModal";
import { SupportWidget } from "./SupportWidget";
import { db } from "@/lib/db";
import type { Channel, User as DBUser } from "@/lib/db";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useI18n } from "@/i18n/I18nProvider";

const MOBILE_TABS = [
  { to: "/", Icon: Home },
  { to: "/automations", Icon: Zap },
  { to: "/ai-agent", Icon: Brain },
  { to: "/chats", Icon: MessageSquare },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [impersonatorEmail, setImpersonatorEmail] = useState("");

  // Mobile menu side-drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync state for active channel and channels
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      window.location.href = "/login";
    } else {
      setAuthorized(true);

      if (typeof window !== "undefined") {
        const imp = localStorage.getItem("replai_admin_impersonator");
        if (imp) setImpersonatorEmail(imp);
      }

      // 🔥 Fire-and-forget visit tracking
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("replai_token") : null;
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      } catch { /* ignore */ }

      // Fetch global announcement banner
      const token = typeof window !== "undefined" ? localStorage.getItem("replai_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch("/api/admin", { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.systemAnnouncement) setAnnouncement(data.systemAnnouncement);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const load = () => {
      setChannels(db.getChannels());
      setActiveChannel(db.getActiveChannel());
      setCurrentUser(db.getCurrentUser());
    };
    const handleToggle = () => setIsMobileMenuOpen(prev => !prev);
    const handleClose = () => setIsMobileMenuOpen(false);

    load();
    window.addEventListener("focus", load);
    window.addEventListener("replai-db-update", load);
    window.addEventListener("replai-toggle-mobile-menu", handleToggle);
    window.addEventListener("replai-close-mobile-menu", handleClose);

    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("replai-db-update", load);
      window.removeEventListener("replai-toggle-mobile-menu", handleToggle);
      window.removeEventListener("replai-close-mobile-menu", handleClose);
    };
  }, []);

  if (!authorized) {
    return <BrandLoader fullScreen />;
  }

  return (
    <div className="h-[100dvh] md:h-screen w-full bg-[#E8E8E8] p-3 md:px-6 md:py-4 flex flex-col gap-3 md:gap-4 overflow-hidden relative">
      {impersonatorEmail && (
        <div className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-[16px] flex justify-between items-center animate-in slide-in-from-top duration-300 shadow-sm relative overflow-hidden shrink-0 z-50">
          <div className="flex items-center gap-2.5 text-[11px] md:text-[12px] font-bold">
            <span className="text-[#C7F33C]">👤</span>
            <span className="truncate max-w-[200px] sm:max-w-none">Siz hozirda &lt;{db.getCurrentUser()?.email}&gt; nomidan tizimdadasiz.</span>
          </div>
          <button 
            onClick={() => {
              const res = db.stopImpersonating();
              if (res.success) {
                window.location.href = "/admin";
              }
            }}
            className="bg-[#C7F33C] text-black font-extrabold text-[10px] md:text-[11px] px-3.5 py-1.5 rounded-full hover:bg-[#b0d82d] transition-colors shrink-0"
          >
            Admin hisobiga qaytish
          </button>
        </div>
      )}

      {announcement && !dismissed && (
        <div className="w-full bg-[#C7F33C] text-[#1A2906] px-4 md:px-6 py-3 rounded-[16px] border border-[#1A2906]/10 flex justify-between items-center animate-in slide-in-from-top duration-300 shadow-sm relative overflow-hidden shrink-0 z-50">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#9BC92E]" />
          <div className="flex items-center gap-2.5 text-[11.5px] md:text-[12.5px] font-black text-black">
            <span className="text-[13px] md:text-[14px]">📢</span>
            <span>{announcement}</span>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="text-black/60 hover:text-black font-black text-[14px] leading-none p-1.5 hover:bg-black/5 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex w-full flex-1 gap-3 md:gap-4 overflow-hidden min-h-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4 h-full relative">
          <TopBar />
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-16 md:pb-0">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Floating Bottom Navigation Dock */}
      <div className="fixed bottom-4 left-4 right-4 h-16 bg-white/95 backdrop-blur-md border border-[#E8E8E8] shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-[22px] z-50 flex items-center justify-around px-2 md:hidden">
        {MOBILE_TABS.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          const Icon = tab.Icon;
          return (
            <Link
              key={tab.to}
              href={tab.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-150 active:scale-90 ${
                active ? "bg-black text-[#C7F33C]" : "text-[#707070] hover:text-black"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
            </Link>
          );
        })}
        {/* Menu Toggle Tab */}
        <button
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-150 active:scale-90 ${
            isMobileMenuOpen ? "bg-black text-[#C7F33C]" : "text-[#707070] hover:text-black"
          }`}
        >
          <Menu size={20} strokeWidth={isMobileMenuOpen ? 2.25 : 1.75} />
        </button>
      </div>

      {/* Mobile Side-Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[98] md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Left Slide-in side Drawer */}
      <div 
        className={`fixed top-0 bottom-0 left-0 w-[290px] bg-white border-r border-[#E8E8E8] shadow-[10px_0_35px_rgba(0,0,0,0.08)] z-[99] md:hidden flex flex-col transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between p-4 border-b border-[#F0F0F0] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] overflow-hidden shrink-0">
              <img src="/logo.png" alt="Sendly" className="h-full w-full object-cover" />
            </div>
            <span className="font-extrabold text-[14px] text-black tracking-tight">Sendly</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X size={16} className="text-neutral-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-12">
          {/* Active Channel Info & Switcher */}
          <div>
            <p className="text-[9px] font-extrabold text-[#a0a0a0] uppercase tracking-wider mb-2">
              {t("nav.channels_header")}
            </p>
            
            {activeChannel ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${
                    activeChannel.type === "instagram" ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]" : "bg-[#229ED9]"
                  }`}>
                    {activeChannel.type === "instagram" ? <Instagram size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-bold text-black truncate">{activeChannel.name}</p>
                    <p className="text-[9.5px] text-[#707070] truncate">{activeChannel.username}</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-black bg-[#C7F33C]/25 text-[#7CA607] px-2 py-0.5 rounded-full">
                  {t("pages.settings_page.channel_connected") || "ulangan"}
                </span>
              </div>
            ) : (
              <div className="p-3 text-center border border-dashed border-[#D8D8D8] rounded-2xl bg-red-50/30">
                <p className="text-[11px] text-red-600 font-semibold mb-2">{t("pages.settings_page.no_channel") || "Ulanmagan"}</p>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new Event("replai-open-connect-modal"));
                  }}
                  className="inline-flex items-center gap-1 bg-black text-[#C7F33C] px-3.5 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-all"
                >
                  <Plus size={11} />
                  <span>{t("common.connect") || "Ulash"}</span>
                </button>
              </div>
            )}

            {/* Other Connected Channels Switcher */}
            {channels.length > 1 && (
              <div className="mt-2 flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                {channels.filter(ch => ch.id !== activeChannel?.id).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      db.setActiveChannel(ch.id);
                      window.location.reload();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`grid h-6 w-6 place-items-center rounded-full shrink-0 ${
                        ch.type === "instagram" ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]" : "bg-[#229ED9]"
                      }`}>
                        {ch.type === "instagram" ? <Instagram size={10} className="text-white" /> : <Bot size={10} className="text-white" />}
                      </div>
                      <span className="text-[11px] font-bold text-neutral-700 truncate">{ch.username}</span>
                    </div>
                    <span className="text-[9px] text-neutral-400 font-semibold">O&apos;tish ▾</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Navigation Sections (All 8 pages) */}
          <div className="mt-6">
            <p className="text-[9px] font-extrabold text-[#a0a0a0] uppercase tracking-wider mb-2">
              {t("pages.automations_page.navigation") || "Navigatsiya"}
            </p>
            <div className="flex flex-col gap-1">
              {[
                { to: "/", Icon: Home, label: t("nav.home") },
                { to: "/automations", Icon: Zap, label: t("nav.automations") },
                { to: "/ai-agent", Icon: Brain, label: t("nav.ai-agent") },
                { to: "/chats", Icon: MessageSquare, label: t("nav.chats") },
                { to: "/contacts", Icon: Users, label: t("nav.contacts") },
                { to: "/broadcast", Icon: Send, label: t("nav.broadcast") },
                { to: "/analytics", Icon: BarChart3, label: t("nav.analytics") },
                { to: "/settings", Icon: Settings, label: t("nav.settings") }
              ].map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
                      active 
                        ? "bg-[#C7F33C]/15 border-[#C7F33C] text-black font-extrabold" 
                        : "bg-neutral-50 border-neutral-100/50 hover:bg-neutral-100 text-neutral-800 font-semibold"
                    }`}
                  >
                    <item.Icon size={15} className={active ? "text-black" : "text-neutral-500"} />
                    <span className="text-[12px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Account Section */}
          <div className="mt-6">
            <p className="text-[9px] font-extrabold text-[#a0a0a0] uppercase tracking-wider mb-2">
              {t("nav.my_account") || "Profil sozlamalari"}
            </p>
            <div className="flex flex-col gap-1">
              {[
                { to: "/account?tab=general", Icon: User, label: t("nav.my_account") },
                { to: "/account?tab=billing", Icon: CreditCard, label: t("nav.billing_plans") },
                { to: "/partner", Icon: Users, label: t("nav.partner_dashboard") },
                { to: "/help", Icon: HelpCircle, label: t("nav.help") }
              ].map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left text-neutral-850 font-bold"
                >
                  <item.Icon size={15} className="text-neutral-550" />
                  <span className="text-[12px]">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="mt-6">
            <p className="text-[9px] font-extrabold text-[#a0a0a0] uppercase tracking-wider mb-2">
              Tizim tili
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { code: "uz", flag: "🇺🇿", label: "O'zbekcha" },
                { code: "ru", flag: "🇷🇺", label: "Русский" },
                { code: "en", flag: "🇬🇧", label: "English" }
              ].map((item) => {
                const isAct = lang === item.code;
                return (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLang(item.code as any);
                    }}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border text-[12px] font-bold transition-colors ${
                      isAct 
                        ? "bg-black text-[#C7F33C] border-black" 
                        : "bg-neutral-50 border-neutral-100 text-neutral-800 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{item.flag}</span>
                      <span>{item.label}</span>
                    </div>
                    {isAct && <Check size={14} className="text-[#C7F33C]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout button */}
          <div className="mt-8 border-t border-[#F0F0F0] pt-4 shrink-0">
            <button
              onClick={() => {
                db.signOut();
                window.location.href = "/login";
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100/75 text-red-600 text-[12px] font-black transition-colors"
            >
              <LogOut size={15} />
              <span>{t("nav.logout") || "Chiqish"}</span>
            </button>
          </div>
        </div>
      </div>

      <ConnectChannelModal />
      <SupportWidget />
    </div>
  );
}