"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Check, LogOut, User } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";
import type { Channel } from "@/lib/db";
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

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");

  useEffect(() => {
    const loadChannels = () => {
      const list = db.getChannels();
      setChannels(list);
      const active = db.getActiveChannel();
      setActiveChannelId(active ? active.id : "");
    };
    loadChannels();
    window.addEventListener("replai-db-update", loadChannels);
    return () => window.removeEventListener("replai-db-update", loadChannels);
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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLangSelect = (selectedLang: Lang) => {
    setLang(selectedLang);
    setIsLangOpen(false);
  };

  const handleSignOut = () => {
    db.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Account Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
          Akkaunt:
        </span>
        {channels.length > 0 ? (
          <CustomDropdown
            value={activeChannelId}
            onChange={handleChannelChange}
            options={channelOptions}
            placeholder="Akkaunt tanlang..."
            className="w-56 bg-white border border-[#D8D8D8]/60 text-[12px] h-9"
          />
        ) : (
          <Link
            href="/settings"
            className="text-[12px] font-bold text-red-500 hover:underline"
          >
            Ulanmagan (Akkaunt qo&apos;shish)
          </Link>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Language selector dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[12px] font-medium text-black border border-[#D8D8D8]/60 transition-all duration-150 active:scale-95 hover:bg-white/95"
          >
            <span>{LANG_FLAGS[lang]}</span>
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
            className="h-[38px] w-[38px] rounded-full ring-2 ring-white cursor-pointer hover:scale-105 active:scale-95 transition-all block overflow-hidden"
            style={{
              background: "radial-gradient(circle at 35% 35%, #C7F33C 0%, #9BC92E 70%, #5A7C1E 100%)",
            }}
          />

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-[180px] rounded-[24px] bg-white p-2 border border-[#D8D8D8] shadow-xl z-[90] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col gap-1 text-[12px]">
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-[14px] hover:bg-[#F9F9F7] text-left transition-colors text-black font-medium"
                >
                  <User size={14} className="text-[#707070]" />
                  <span>{t("nav.settings")}</span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-[14px] hover:bg-red-50 text-left transition-colors text-red-600 font-medium border-t border-[#F0F0F0] mt-1 pt-3.5"
                >
                  <LogOut size={14} />
                  <span>{t("nav.sign_out")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}