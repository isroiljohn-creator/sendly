"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Check,
  LogOut,
  User,
  Bot,
  CreditCard,
  Users,
  Languages,
  HelpCircle,
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";
import type { Channel, User as DBUser } from "@/lib/db";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

const LANG_NAMES: Record<Lang, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

const LANG_FLAGS: Record<Lang, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();

  // Dropdown states
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangSubOpen, setIsLangSubOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const loadData = () => {
      const list = db.getChannels();
      setChannels(list);
      const active = db.getActiveChannel();
      setActiveChannelId(active ? active.id : "");
      setActiveChannel(active);
      setCurrentUser(db.getCurrentUser());
    };
    loadData();
    window.addEventListener("focus", loadData);
    window.addEventListener("replai-db-update", loadData);
    return () => {
      window.removeEventListener("focus", loadData);
      window.removeEventListener("replai-db-update", loadData);
    };
  }, []);

  const handleChannelChange = (val: string) => {
    db.setActiveChannel(val);
  };

  const channelOptions = channels.map((c) => ({
    value: c.id,
    label: `${c.type === "telegram" ? "Telegram: @" : "Instagram: @"}${c.username.replace(/^@+/, "")}`,
    icon: (
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${c.type === "telegram" ? "bg-[#229ED9]" : "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"}`} />
    ),
  }));

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
        setIsLangSubOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLangSelect = (selectedLang: Lang) => {
    setLang(selectedLang);
    setIsLangOpen(false);
  };

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
      setLang(code as Lang);
    } else {
      alert(t("nav.lang_soon"));
    }
    setIsLangSubOpen(false);
  };

  const handleSignOut = () => {
    db.signOut();
    window.location.href = "/login";
  };

  const isLessonsPage = pathname.startsWith("/lessons");

  const customTrigger = activeChannel ? (
    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] bg-white border border-[#E8E8E8] w-fit shrink-0 hover:border-black transition-all select-none shadow-sm hover:shadow-md duration-150 cursor-pointer">
      <div className={`grid h-6 w-6 place-items-center rounded-full shrink-0 ${activeChannel.type === "instagram" ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]" : "bg-[#229ED9]"}`}>
        {activeChannel.type === "instagram" ? <Instagram size={11} className="text-white" /> : <Bot size={11} className="text-white" />}
      </div>
      <span className="text-[12px] font-bold text-black">{activeChannel.username}</span>
      <span className="text-[11px] text-[#707070] font-medium">ulangan</span>
      <span className="text-[10px] text-[#A0A0A0] font-bold ml-1">O&apos;zgartirish ▾</span>
    </div>
  ) : null;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Account Selector */}
      {!isLessonsPage && (
        <div className="flex items-center gap-2">
          {channels.length > 0 ? (
            <CustomDropdown
              value={activeChannelId}
              onChange={handleChannelChange}
              options={channelOptions}
              placeholder="Akkaunt tanlang..."
              className="w-56"
              footerLabel="Akkaunt qo'shish"
              onFooterClick={() => window.dispatchEvent(new Event("replai-open-connect-modal"))}
              trigger={customTrigger}
            />
          ) : (
            <button
              onClick={() => window.dispatchEvent(new Event("replai-open-connect-modal"))}
              className="text-[12px] font-bold text-red-500 hover:underline bg-transparent border-none cursor-pointer"
            >
              Ulanmagan (Akkaunt qo&apos;shish)
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Language selector dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[12px] font-medium text-black border border-[#D8D8D8]/60 transition-all duration-150 active:scale-95 hover:bg-white/95"
          >
            <span className="uppercase font-semibold">{lang}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isLangOpen ? "rotate-180" : ""}`} />
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-[160px] rounded-[20px] bg-white p-2 border border-[#D8D8D8] shadow-lg z-[90] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col gap-1 text-[12px]">
                {(["uz", "ru", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLangSelect(l)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black"
                  >
                    <div className="flex items-center gap-2">
                      <span>{LANG_FLAGS[l]}</span>
                      <span>{LANG_NAMES[l]}</span>
                    </div>
                    {lang === l && <Check size={14} className="text-black" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact list shortcut avatars */}
        <Link href="/contacts" className="flex items-center hover:opacity-90 transition-opacity">
          {["#FCA5A5", "#FCD34D", "#93C5FD"].map((c, i) => (
            <div
              key={i}
              className="h-[34px] w-[34px] rounded-full ring-2 ring-[#E8E8E8]"
              style={{ background: c, marginLeft: i === 0 ? 0 : -10 }}
            />
          ))}
          <div
            className="grid h-[34px] w-[34px] place-items-center rounded-full bg-black text-[11px] font-medium text-white ring-2 ring-[#E8E8E8] shrink-0"
            style={{ marginLeft: -10 }}
          >
            +5
          </div>
        </Link>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative grid h-[38px] w-[38px] place-items-center rounded-full bg-white text-black border border-[#D8D8D8]/60 transition-all duration-150 active:scale-95 hover:bg-white/95"
          >
            <Bell size={16} strokeWidth={1.75} />
            {/* Only show green dot when there are real notifications */}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-[280px] rounded-[24px] bg-white p-4 border border-[#D8D8D8] shadow-xl z-[90] animate-in fade-in slide-in-from-top-2 duration-150">
              <h4 className="text-[13px] font-semibold text-black mb-3">
                {t("nav.notifications")}
              </h4>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bell size={28} strokeWidth={1.5} className="text-[#D8D8D8] mb-2" />
                <p className="text-[12px] text-[#707070]">{t("nav.no_notifications")}</p>
              </div>
            </div>
          )}
        </div>

        {/* User profile avatar and dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-[38px] w-[38px] rounded-full ring-2 ring-white cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center bg-[#7CA6FF] text-white font-bold text-[16px] shadow-sm select-none"
          >
            {currentUser?.fullName?.charAt(0).toUpperCase() || "I"}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-[260px] rounded-[20px] bg-white py-3 border border-[#D8D8D8] shadow-xl z-[90] text-black animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pb-2.5 pt-1 border-b border-[#F0F0F0] mb-1.5">
                <div className="w-10 h-10 rounded-full bg-[#7CA6FF] flex items-center justify-center font-bold text-[16px] text-white shrink-0">
                  {currentUser?.fullName?.charAt(0).toUpperCase() || "I"}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-bold text-black truncate">
                    {currentUser?.fullName || "Isroiljon Abdullayev"}
                  </p>
                  <p className="text-[10px] text-[#707070] truncate">
                    {currentUser?.email || "isroiljohnabdullayev@gmail.com"}
                  </p>
                </div>
              </div>

              {/* Menu items */}
              <div className="flex flex-col gap-0.5 px-2 text-[13px]">
                <Link
                  href="/account?tab=general"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold"
                >
                  <User size={16} className="text-[#595959]" />
                  <span>{t("nav.my_account")}</span>
                </Link>

                <Link
                  href="/account?tab=billing"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold"
                >
                  <CreditCard size={16} className="text-[#595959]" />
                  <span>{t("nav.billing_plans")}</span>
                </Link>

                <Link
                  href="/partner"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold"
                >
                  <Users size={16} className="text-[#595959]" />
                  <span>{t("nav.partner_dashboard")}</span>
                </Link>

                <button
                  onClick={() => setIsLangSubOpen((p) => !p)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold ${
                    isLangSubOpen ? "bg-[#F9F9F7]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Languages size={16} className="text-[#595959]" />
                    <span>{t("nav.language")}</span>
                  </div>
                  <ChevronRight size={14} className={`text-[#A0A0A0] transition-transform ${isLangSubOpen ? "rotate-90" : ""}`} />
                </button>

                <Link
                  href="/help"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-semibold"
                >
                  <HelpCircle size={16} className="text-[#595959]" />
                  <span>{t("nav.help")}</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] hover:bg-red-50 text-left transition-colors text-red-600 font-bold border-t border-[#F0F0F0] mt-1 pt-2.5"
                >
                  <LogOut size={16} />
                  <span>{t("nav.logout")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Language Sub-Menu Dropdown */}
          {isProfileOpen && isLangSubOpen && (
            <div className="absolute right-[270px] top-[140px] z-50 bg-white rounded-[20px] shadow-xl border border-[#D8D8D8] w-[200px] py-2 text-black animate-in fade-in slide-in-from-right-2 duration-150">
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
                      {isActiveLang && <Check size={14} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}