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
  Sparkles,
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
  { to: "/ai-agent", Icon: Sparkles, labelKey: "nav.ai-agent" },
  { to: "/chats", Icon: MessageSquare, labelKey: "nav.chats" },
  { to: "/contacts", Icon: Users, labelKey: "nav.contacts" },
  { to: "/broadcast", Icon: Send, labelKey: "nav.broadcast" },
  { to: "/analytics", Icon: BarChart3, labelKey: "nav.analytics" },
  { to: "/lessons", Icon: GraduationCap, labelKey: "nav.lessons" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { to: "/settings", Icon: Settings, labelKey: "nav.settings" },
];

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
          ? "bg-black text-[#C7F33C]"
          : "bg-transparent text-[#595959] hover:bg-white hover:text-black",
      ].join(" ")}
    >
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      setChannels(db.getChannels());
      setActiveChannel(db.getActiveChannel());
      setCurrentUser(db.getCurrentUser());
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
    <aside className="sticky top-6 z-40 flex w-[60px] shrink-0 flex-col items-center h-[calc(100vh-48px)] pt-1">
      {/* Logo */}
      <Link href="/">
        <div className="grid h-[42px] w-[42px] place-items-center rounded-[14px] bg-black hover:bg-black/80 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M13.5 2c.3 3.5-1.5 5.2-3 6.8C9 10.5 7.5 12 8 14.5 8.4 16.7 10 18 12 18c0-2 .8-3 2-4.2 1.4-1.4 3-3 2.6-6C16.2 5 14.8 3.3 13.5 2Z"
              fill="#C7F33C"
            />
            <path
              d="M9.5 14c-.6 1-1 2-1 3 0 2.5 1.6 4 3.5 4s3.5-1.5 3.5-4c0-1-.4-2-1-3-.3 1.5-1.2 2.3-2.5 2.3S9.8 15.5 9.5 14Z"
              fill="#9BC92E"
            />
          </svg>
        </div>
      </Link>

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
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-black hover:bg-[#F9F9F7] transition-colors"
              >
                <div className="grid h-5 w-5 place-items-center rounded-full bg-[#F0F0F0]">
                  <Plus size={10} />
                </div>
                {t("nav.manage_channels")}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mt-3 h-[1px] w-[32px] bg-[#D8D8D8]" />

      <nav className="mt-3 flex flex-1 flex-col items-center gap-2">
        {TOP_ITEMS.map((item) => (
          <NavButton key={item.to} item={item} active={isActive(item.to)} />
        ))}
      </nav>

      <div className="mb-1 flex flex-col items-center gap-2">
        {BOTTOM_ITEMS.map((item) => (
          <NavButton key={item.to} item={item} active={isActive(item.to)} />
        ))}

        {/* User profile avatar trigger and popups */}
        <div className="relative mt-1" ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen((p) => !p)}
            className="relative h-[38px] w-[38px] rounded-full bg-[#82b4ff] flex items-center justify-center text-[15px] font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
            title={currentUser?.fullName || t("nav.user_placeholder")}
          >
            {currentUser?.fullName?.charAt(0).toUpperCase() || "?"}
          </button>

          {/* Main Dropdown Menu */}
          {profileMenuOpen && (
            <div className="absolute left-[52px] bottom-0 z-50 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E8E8E8] w-[260px] py-3 text-black animate-in fade-in slide-in-from-left-2 duration-150">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pb-2.5 pt-1 border-b border-[#F0F0F0] mb-1.5">
                <div className="w-10 h-10 rounded-full bg-[#82b4ff] flex items-center justify-center font-bold text-[16px] text-white shrink-0">
                  {currentUser?.fullName?.charAt(0).toUpperCase() || "I"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-black truncate">
                    {currentUser?.fullName || t("nav.user_placeholder")}
                  </p>
                  <p className="text-[10px] text-[#707070] truncate">
                    {currentUser?.email || ""}
                  </p>
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

                <button
                  onClick={() => setLangMenuOpen((p) => !p)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold text-[13px] ${
                    langMenuOpen ? "bg-[#F9F9F7]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Languages size={16} className="text-[#595959]" />
                    <span>{t("nav.language")}</span>
                  </div>
                  <ChevronRight size={14} className={`text-[#A0A0A0] transition-transform ${langMenuOpen ? "rotate-90" : ""}`} />
                </button>

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

          {/* Language Sub-Menu Dropdown */}
          {profileMenuOpen && langMenuOpen && (
            <div className="absolute left-[320px] bottom-[50px] z-50 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E8E8E8] w-[200px] py-2 text-black animate-in fade-in slide-in-from-left-2 duration-150">
              <div className="flex flex-col gap-0.5 px-2 text-[12px]">
                {LANGUAGES.map((l) => {
                  const isActiveLang = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => handleLanguageSelect(l.code)}
                      className="flex items-center justify-between w-full px-3.5 py-2 rounded-[10px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-medium"
                    >
                      <span>{l.name}</span>
                      {isActiveLang && <Check size={16} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}