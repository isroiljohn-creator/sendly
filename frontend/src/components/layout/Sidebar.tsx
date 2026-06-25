"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Home,
  Zap,
  MessageSquare,
  Users,
  Send,
  BarChart3,
  GraduationCap,
  Settings,
  Bot,
  Plus,
  ChevronDown,
  User,
  CreditCard,
  Languages,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  Brain,
  Shield,
  Coins
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { db } from "@/lib/db";
import type { Channel, User as DBUser } from "@/lib/db";
import { useI18n } from "@/i18n/I18nProvider";


type NavItem = {
  to: string;
  Icon: ComponentType<LucideProps>;
  labelKey: string;
  badge?: { kind: "lime" | "dark"; label: string };
};

const TOP_ITEMS: NavItem[] = [
  { to: "/", Icon: Home, labelKey: "nav.home" },
  { to: "/automations", Icon: Zap, labelKey: "nav.automations" },
  { to: "/ai-agent", Icon: Brain, labelKey: "nav.ai-agent" },
  { to: "/chats", Icon: MessageSquare, labelKey: "nav.chats" },
  { to: "/contacts", Icon: Users, labelKey: "nav.contacts" },
  { to: "/broadcast", Icon: Send, labelKey: "nav.broadcast" },
  { to: "/analytics", Icon: BarChart3, labelKey: "nav.analytics" },
  { to: "/settings", Icon: Settings, labelKey: "nav.settings" },
];

const BOTTOM_ITEMS: NavItem[] = [];

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon, labelKey } = item;
  const { t } = useI18n();
  const label = t(labelKey);

  return (
    <Link
      href={item.to}
      className={[
        "group relative grid h-11 w-11 place-items-center rounded-full transition-all duration-150 active:scale-95",
        active
          ? "bg-black text-[#C7F33C] shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
          : "bg-transparent text-[#595959] hover:bg-[#F4F4F5] hover:text-black",
      ].join(" ")}
    >
      {active && (
        <div className="absolute left-[-10px] w-[3px] h-5 rounded-r bg-[#C7F33C]" />
      )}
      <Icon size={18} strokeWidth={1.75} />
      
      {/* Hover Tooltip */}
      <div className="absolute left-[54px] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out z-50 whitespace-nowrap bg-black text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xl border border-neutral-800/60 flex items-center gap-1.5">
        <span>{label}</span>
      </div>
    </Link>
  );
}

function ChannelAvatar({ channel, size = 32 }: { channel: Channel; size?: number }) {
  const isIg = channel.type === "instagram";
  return (
    <div
      style={{ width: size, height: size }}
      className={`grid place-items-center rounded-full shrink-0 ${
        isIg
          ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
          : "bg-[#229ED9]"
      }`}
    >
      {isIg ? (
        <Instagram size={size * 0.5} className="text-white" />
      ) : (
        <Bot size={size * 0.5} className="text-white" />
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const { t, lang, setLang } = useI18n();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Profile dropdown states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [credits, setCredits] = useState<{ balance: number; used: number }>({ balance: 100, used: 0 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      setChannels(db.getChannels());
      setActiveChannel(db.getActiveChannel());
      const user = db.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        db.getAiCreditsFromServer(user.id).then((data) => {
          if (data) setCredits(data);
        });
      }
      if (user && (user.email === "admin@sendly.uz" || user.email === "isroiljohnabdullayev@gmail.com" || (user as any).role === "admin")) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    load();
    // re-sync when tab regains focus or local database updates
    window.addEventListener("focus", load);
    window.addEventListener("replai-db-update", load);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("replai-db-update", load);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const LANGUAGES = [
    { code: "ru", name: "Русский" },
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "pt", name: "Português" },
    { code: "uz", name: "O'zbek" },
    { code: "tr", name: "Türkçe" }
  ];

  const handleLanguageSelect = (code: string) => {
    if (code === "uz" || code === "ru" || code === "en") {
      setLang(code);
    } else {
      alert(t("nav.lang_soon"));
    }
    setLangMenuOpen(false);
  };

  const handleSignOut = () => {
    db.signOut();
    window.location.href = "/login";
  };

  const switchChannel = (id: string) => {
    db.setActiveChannel(id);
    setActiveChannel(db.getActiveChannel());
    setChannels(db.getChannels());
    setDropdownOpen(false);
    // Refresh current page data via a full reload to sync all client state
    window.location.reload();
  };

  return (
    <aside className="hidden md:flex sticky top-4 z-40 w-[64px] shrink-0 flex-col items-center h-full bg-white border border-[#E8E8E8]/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-[24px] py-4">
      {/* Logo Wrapper to align with TopBar */}
      <div className="h-[42px] flex items-center justify-center shrink-0">
        <Link href="/">
          <div className="h-[38px] w-[38px] rounded-[12px] shadow-sm duration-150 active:scale-95 overflow-hidden">
            <img src="/logo.png" alt="Sendly" className="h-full w-full object-cover" />
          </div>
        </Link>
      </div>

      {/* Channel Switcher */}
      <div className="mt-4 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((p) => !p)}
          title={activeChannel?.username ?? t("nav.select_channel")}
          className="relative flex flex-col items-center group"
        >
          {activeChannel ? (
            <>
              <ChannelAvatar channel={activeChannel} size={38} />
              <div className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white border border-[#E8E8E8]">
                <ChevronDown size={8} className="text-[#707070]" />
              </div>
              {/* active dot */}
              <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 border-[#E8E8E8]" />
            </>
          ) : (
            <div className="grid h-[38px] w-[38px] place-items-center rounded-full border-2 border-dashed border-[#D8D8D8] text-[#a0a0a0] hover:border-black hover:text-black transition-all group-hover:bg-white">
              <Plus size={16} />
            </div>
          )}
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute left-[52px] top-0 z-50 bg-white rounded-[16px] shadow-xl border border-[#E8E8E8] w-[220px] overflow-hidden py-2">
            <p className="text-[9px] font-bold text-[#a0a0a0] uppercase tracking-widest px-4 pb-2 pt-1">
              {t("nav.channels_header")}
            </p>

            {channels.length === 0 && (
              <p className="text-[11px] text-[#707070] px-4 py-2">{t("nav.no_channels")}</p>
            )}

            {channels.map((ch) => {
              const isAct = activeChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => switchChannel(ch.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F9F9F7] transition-colors ${isAct ? "bg-[#F0F0F0]" : ""}`}
                >
                  <ChannelAvatar channel={ch} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-black truncate">{ch.name}</p>
                    <p className="text-[10px] text-[#707070] truncate">{ch.username}</p>
                  </div>
                  {isAct && (
                    <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                  )}
                </button>
              );
            })}

            <div className="border-t border-[#F0F0F0] mt-1 pt-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  window.dispatchEvent(new Event("replai-open-connect-modal"));
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[11px] font-semibold text-black hover:bg-[#F9F9F7] transition-colors text-left"
              >
                <div className="grid h-5 w-5 place-items-center rounded-full bg-[#F0F0F0]">
                  <Plus size={10} />
                </div>
                {t("nav.manage_channels")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mt-3 h-[1px] w-[32px] bg-[#F0F0F0]" />

      <nav className="mt-3 flex flex-1 flex-col items-center gap-2">
        {TOP_ITEMS.map((item) => (
          <NavButton key={item.to} item={item} active={isActive(item.to)} />
        ))}
        {isAdmin && (
          <NavButton 
            item={{ to: "/admin", Icon: Shield, labelKey: "nav.admin" }} 
            active={isActive("/admin")} 
          />
        )}
      </nav>

      <div className="mb-1 flex flex-col items-center gap-2">
        {BOTTOM_ITEMS.map((item) => (
          <NavButton key={item.to} item={item} active={isActive(item.to)} />
        ))}

        {/* User profile avatar trigger and dropdown */}
        <div className="relative mt-1" ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen((p) => !p)}
            className="relative h-[38px] w-[38px] rounded-full bg-[#1A2906] text-[#C7F33C] border border-[#C7F33C]/20 flex items-center justify-center text-[14px] font-extrabold hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0 select-none"
            title={currentUser?.fullName || "Isroiljon Abdullayev"}
          >
            {currentUser?.fullName?.charAt(0).toUpperCase() || "I"}
          </button>

          {/* Main Dropdown Menu */}
          {profileMenuOpen && (
            <div className="absolute left-[52px] bottom-0 z-50 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E8E8E8] w-[260px] py-3 text-black animate-in fade-in slide-in-from-left-2 duration-150">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pb-2.5 pt-1 border-b border-[#F0F0F0] mb-1.5">
                <div className="w-10 h-10 rounded-full bg-[#1A2906] text-[#C7F33C] border border-[#C7F33C]/20 flex items-center justify-center font-extrabold text-[15px] shrink-0">
                  {currentUser?.fullName?.charAt(0).toUpperCase() || "I"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-black truncate">
                    {currentUser?.fullName || "Isroiljon Abdullayev"}
                  </p>
                  <p className="text-[10px] text-[#707070] truncate">
                    {currentUser?.email || "isroiljohnabdullayev@gmail.com"}
                  </p>
                </div>
              </div>

              {/* AI Limits widget directly inside the profile dropdown */}
              <div className="px-4 py-2 border-b border-[#F0F0F0] mb-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-black font-extrabold text-[11px]">
                    <Coins size={12} className="text-black fill-black/10" />
                    <span>AI limiti</span>
                  </div>
                  <span className="text-[11px] text-[#707070] font-bold">
                    {credits.balance} kredit
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
                    style={{ width: `${credits.balance + credits.used > 0 ? Math.round((credits.balance / (credits.balance + credits.used)) * 100) : 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-[#909090] font-bold mt-0.5">
                  <span>Balans: {credits.balance} kredit</span>
                  <span>(~{Math.round(credits.balance / 50)} daqiqa audio)</span>
                </div>
              </div>

              {/* Menu items */}
              <div className="flex flex-col gap-0.5 px-2">
                <Link
                  href="/account?tab=general"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold text-[13px]"
                >
                  <User size={16} className="text-[#595959]" />
                  <span>{t("nav.my_account")}</span>
                </Link>

                <Link
                  href="/account?tab=billing"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold text-[13px]"
                >
                  <CreditCard size={16} className="text-[#595959]" />
                  <span>{t("nav.billing_plans")}</span>
                </Link>

                <Link
                  href="/partner"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold text-[13px]"
                >
                  <Users size={16} className="text-[#595959]" />
                  <span>{t("nav.partner_dashboard")}</span>
                </Link>

                <Link
                  href="/help"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold text-[13px]"
                >
                  <HelpCircle size={16} className="text-[#595959]" />
                  <span>{t("nav.help")}</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] hover:bg-red-50 text-left transition-colors text-red-600 font-bold text-[13px] border-t border-[#F0F0F0] mt-1 pt-2.5"
                >
                  <LogOut size={16} />
                  <span>{t("nav.logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}