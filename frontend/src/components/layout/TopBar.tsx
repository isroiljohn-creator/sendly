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
    <div className="flex h-[42px] items-center justify-between gap-4 w-full">
      {/* Mobile Brand Logo */}
      <div className="flex md:hidden items-center gap-2">
        <div className="w-7 h-7 rounded-[8px] overflow-hidden shrink-0">
          <img src="/logo.png" alt="Sendly" className="h-full w-full object-cover" />
        </div>
        <span className="font-black text-[14px] text-black tracking-tight">Sendly</span>
      </div>

      {/* Account Selector */}
      {!isLessonsPage && (
        <div className="hidden md:flex items-center gap-2">
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
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] bg-red-50 border border-red-200/50 text-red-700 w-fit shrink-0 hover:bg-red-100/50 hover:border-red-300 transition-all select-none shadow-sm hover:shadow-md duration-150 cursor-pointer"
            >
              <div className="grid h-5 w-5 place-items-center rounded-full bg-red-100 text-red-600 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </div>
              <span className="text-[12px] font-bold">{t("pages.settings_page.no_channel") || "Ulanmagan"}</span>
              <span className="text-[10px] text-red-500 font-bold ml-1">{t("common.connect") || "Ulash"} ▾</span>
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
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[12px] font-medium text-black border border-[#E8E8E8]/60 transition-all duration-150 active:scale-95 hover:bg-[#F4F4F5] hover:border-[#D8D8D8]/60"
          >
            <span className="uppercase font-semibold">{lang}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isLangOpen ? "rotate-180" : ""}`} />
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-[160px] rounded-[20px] bg-white p-2 border border-[#E8E8E8]/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] z-[90] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col gap-1 text-[12px]">
                {(["uz", "ru", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLangSelect(l)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-[12px] hover:bg-[#F4F4F5] text-left transition-colors text-black"
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


        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative grid h-[38px] w-[38px] place-items-center rounded-full bg-white text-black border border-[#E8E8E8]/60 transition-all duration-150 active:scale-95 hover:bg-[#F4F4F5] hover:border-[#D8D8D8]/60"
          >
            <Bell size={16} strokeWidth={1.75} />
            {/* Only show green dot when there are real notifications */}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-[280px] rounded-[24px] bg-white p-4 border border-[#E8E8E8]/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] z-[90] animate-in fade-in slide-in-from-top-2 duration-150">
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
      </div>
    </div>
  );
}