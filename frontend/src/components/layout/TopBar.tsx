"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
  Menu,
  Zap,
  Coins,
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  Home
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";
import type { Channel, User as DBUser } from "@/lib/db";

type RangeKey = "today" | "7days" | "30days" | "all" | "custom";

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
  const [credits, setCredits] = useState<{ balance: number; used: number } | null>(null);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Date picker state for home page
  const [selectedRangeKey, setSelectedRangeKey] = useState<RangeKey>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sendly_selected_range") as RangeKey;
      if (saved && ["today", "7days", "30days", "all"].includes(saved)) {
        return saved;
      }
    }
    return "7days";
  });
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  const [automationsSearch, setAutomationsSearch] = useState("");
  const [automationsSort, setAutomationsSort] = useState("recent");

  // Custom calendar picker states
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handleDayClick = (dayNum: number) => {
    const clickedDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(clickedDate);
      setCustomEnd(null);
    } else if (customStart && !customEnd) {
      if (clickedDate < customStart) {
        setCustomStart(clickedDate);
      } else {
        setCustomEnd(clickedDate);
      }
    }
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const startText = `${customStart.getDate()} ${MONTHS_SHORT[customStart.getMonth()]}`;
      const endText = `${customEnd.getDate()} ${MONTHS_SHORT[customEnd.getMonth()]}`;
      const formatted = `${startText} — ${endText}`;
      
      localStorage.setItem("sendly_selected_range", "custom");
      localStorage.setItem("sendly_custom_range_start", customStart.toISOString());
      localStorage.setItem("sendly_custom_range_end", customEnd.toISOString());
      localStorage.setItem("sendly_custom_range_text", formatted);
      
      setSelectedRangeKey("custom");
      window.dispatchEvent(new CustomEvent("sendly-range-changed", { detail: "custom" }));
      setIsDateOpen(false);
      setShowCalendarView(false);
    }
  };

  // Click outside listener for date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
        setShowCalendarView(false);
      }
    };
    const handleRangeChangeSync = (e: Event) => {
      const customEvent = e as CustomEvent<RangeKey>;
      if (customEvent.detail) {
        setSelectedRangeKey(customEvent.detail);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("sendly-range-changed", handleRangeChangeSync as EventListener);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("sendly-range-changed", handleRangeChangeSync as EventListener);
    };
  }, []);

  const getDynamicDateText = (rangeKey: RangeKey): string => {
    const now = new Date();
    const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatShortDate = (date: Date) => `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
    
    if (rangeKey === "custom") {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("sendly_custom_range_text");
        if (saved) return saved;
      }
      return "Sanani tanlash...";
    }
    if (rangeKey === "today") {
      return `${formatShortDate(now)}, ${now.getFullYear()}`;
    }
    if (rangeKey === "7days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return `${formatShortDate(start)} — ${formatShortDate(now)}`;
    }
    if (rangeKey === "30days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return `${formatShortDate(start)} — ${formatShortDate(now)}`;
    }
    return "Barcha davr";
  };

  const handleRangeChange = (key: RangeKey) => {
    setSelectedRangeKey(key);
    localStorage.setItem("sendly_selected_range", key);
    window.dispatchEvent(new CustomEvent("sendly-range-changed", { detail: key }));
    setIsDateOpen(false);
  };

  const handleCreateBotClick = () => {
    window.dispatchEvent(new Event("replai-open-create-bot-modal"));
  };

  useEffect(() => {
    const loadData = () => {
      const list = db.getChannels();
      setChannels(list);
      const active = db.getActiveChannel();
      setActiveChannelId(active ? active.id : "");
      setActiveChannel(active);
      const user = db.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        if (typeof window !== "undefined") {
          const local = localStorage.getItem("replai_ai_credits_data");
          if (local) {
            try {
              setCredits(JSON.parse(local));
            } catch {}
          }
        }
        db.getAiCreditsFromServer(user.id || "").then((data) => {
          if (data) setCredits(data);
        });
      }
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
      toast.info(t("nav.lang_soon"));
    }
    setIsLangSubOpen(false);
  };

  const handleSignOut = () => {
    db.signOut();
    window.location.href = "/login";
  };

  const isLessonsPage = pathname.startsWith("/lessons");

  const activeCredits = credits || { balance: 0, used: 0 };
  const total = activeCredits.balance + activeCredits.used;
  const percent = total > 0 ? Math.round((activeCredits.balance / total) * 100) : 100;

      {/* Account Selector is completely removed from top bar */}
      <div className="hidden md:flex items-center gap-2" />

  const getPageTitle = (): string => {
    if (pathname === "/") return t("pages.home.title");
    if (pathname.startsWith("/partner")) return t("partner.title") || "Hamkor kabineti";
    if (pathname.startsWith("/ai-agent")) return t("nav.ai-agent") || "Sun'iy intellekt";
    if (pathname.startsWith("/automations")) return t("nav.automations") || "Avtomatlashtirish";
    if (pathname.startsWith("/chats")) return t("nav.chats") || "Chatlar";
    if (pathname.startsWith("/contacts")) return t("nav.contacts") || "Mijozlar";
    if (pathname.startsWith("/broadcast")) return t("nav.broadcast") || "Ommaviy xabarnoma";
    if (pathname.startsWith("/analytics")) return t("nav.analytics") || "Analitika";
    if (pathname.startsWith("/lessons")) return t("nav.lessons") || "Mini-kurs";
    if (pathname.startsWith("/settings")) return t("nav.settings") || "Sozlamalar";
    if (pathname.startsWith("/help")) return t("nav.help") || "Yordam";
    if (pathname.startsWith("/admin")) return t("nav.admin") || "Administrator paneli";
    return "";
  };

  return (
    <div className="flex h-[42px] items-center justify-between gap-4 w-full">
      {/* Mobile Header Menu Button & Brand */}
      <div className="flex md:hidden items-center gap-1">
        <button 
          onClick={() => window.dispatchEvent(new Event("replai-toggle-mobile-menu"))}
          className="p-1.5 -ml-1 text-black hover:bg-neutral-100 rounded-full active:scale-95 transition-all shrink-0"
          title={t("nav.menu")}
        >
          <Menu size={20} />
        </button>
        <div className="w-7 h-7 rounded-[8px] overflow-hidden shrink-0 ml-1">
          <img src="/logo.png" alt="Sendly" className="h-full w-full object-cover" />
        </div>
        <span className="font-black text-[14px] text-black tracking-tight">Sendly</span>
      </div>

      {/* Page Title on the left of TopBar (Desktop) */}
      <div className="hidden md:block">
        <h1 className="text-[28px] font-black text-black tracking-tight leading-none">
          {getPageTitle()}
        </h1>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">

        {/* Date picker (Homepage & Analytics) */}
        {(pathname === "/" || pathname.startsWith("/analytics")) && (
          <div className="hidden sm:block relative mr-1" ref={dateRef}>
            <button
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-bold text-black border border-[#E8E8E8] hover:bg-[#F9F9F7] hover:border-[#D8D8D8] transition-all shadow-xs h-[38px] select-none cursor-pointer"
            >
              <span>{getDynamicDateText(selectedRangeKey)}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${isDateOpen ? "rotate-180" : ""}`} />
            </button>

            {isDateOpen && (
              <div className={["absolute right-0 mt-2 rounded-[20px] bg-white p-3.5 border border-[#E8E8E8] shadow-[0_8px_30px_rgba(0,0,0,0.08)] z-[90] animate-in fade-in slide-in-from-top-2 duration-150 text-left select-none text-black", showCalendarView ? "w-[280px]" : "w-[160px]"].join(" ")}>
                {!showCalendarView ? (
                  <div className="flex flex-col gap-1 text-[12px] font-medium">
                    {(["today", "7days", "30days", "all"] as RangeKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          handleRangeChange(key);
                        }}
                        className={[
                          "w-full px-3 py-1.5 rounded-[12px] text-left transition-colors font-semibold cursor-pointer",
                          selectedRangeKey === key ? "bg-[#C7F33C]/20 text-[#1A2906]" : "hover:bg-[#F9F9F7]"
                        ].join(" ")}
                      >
                        {key === "today" ? "Bugun" : key === "7days" ? "Oxirgi 7 kun" : key === "30days" ? "Oxirgi 30 kun" : "Barcha davr"}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowCalendarView(true)}
                      className="w-full px-3 py-1.5 rounded-[12px] text-left hover:bg-[#F9F9F7] text-black font-semibold border-t border-[#F0F0F0]/70 mt-1.5 pt-2 flex items-center justify-between cursor-pointer border-0"
                    >
                      <span>Sanani tanlash...</span>
                      <Calendar size={13} className="text-[#707070]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Calendar Month Header */}
                    <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-2">
                      <button
                        onClick={() => {
                          const prev = new Date(calendarMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setCalendarMonth(prev);
                        }}
                        className="p-1 hover:bg-[#F5F5F5] rounded-full cursor-pointer font-bold text-[13px] text-[#707070] hover:text-black"
                      >
                        &larr;
                      </button>
                      <span className="text-[12px] font-bold text-black uppercase tracking-wider">
                        {calendarMonth.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })}
                      </span>
                      <button
                        onClick={() => {
                          const next = new Date(calendarMonth);
                          next.setMonth(next.getMonth() + 1);
                          setCalendarMonth(next);
                        }}
                        className="p-1 hover:bg-[#F5F5F5] rounded-full cursor-pointer font-bold text-[13px] text-[#707070] hover:text-black"
                      >
                        &rarr;
                      </button>
                    </div>

                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-[#A0A0A0] text-center">
                      {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: getFirstDayOfMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()) }).map((_, i) => (
                        <div key={`blank-${i}`} />
                      ))}
                      {Array.from({ length: getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()) }).map((_, i) => {
                        const dayNum = i + 1;
                        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
                        
                        const isStart = customStart && date.toDateString() === customStart.toDateString();
                        const isEnd = customEnd && date.toDateString() === customEnd.toDateString();
                        const isInRange = customStart && customEnd && date > customStart && date < customEnd;

                        return (
                          <button
                            key={`day-${dayNum}`}
                            onClick={() => handleDayClick(dayNum)}
                            className={[
                              "h-6 text-[10px] font-bold rounded-md flex items-center justify-center transition-all cursor-pointer",
                              isStart || isEnd
                                ? "bg-[#C7F33C] text-black font-extrabold shadow-sm scale-105"
                                : isInRange
                                ? "bg-[#C7F33C]/20 text-[#1A2906]"
                                : "text-black hover:bg-[#F5F5F5]"
                            ].join(" ")}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between border-t border-[#F0F0F0] pt-2 mt-1">
                      <button
                        onClick={() => {
                          setShowCalendarView(false);
                          setCustomStart(null);
                          setCustomEnd(null);
                        }}
                        className="text-[10px] font-bold text-[#707070] hover:text-black px-2 py-1 rounded cursor-pointer"
                      >
                        Orqaga
                      </button>
                      <button
                        onClick={handleApplyCustomRange}
                        disabled={!customStart || !customEnd}
                        className={[
                          "text-[10px] font-bold px-3 py-1 rounded-full cursor-pointer transition-all",
                          customStart && customEnd
                            ? "bg-[#C7F33C] text-black font-black hover:bg-[#b0df2c]"
                            : "bg-[#F5F5F5] text-[#A0A0A0] cursor-not-allowed"
                        ].join(" ")}
                      >
                        Tasdiqlash
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Bot Button (Homepage) */}
        {pathname === "/" && (
          <button
            onClick={handleCreateBotClick}
            className="hidden sm:flex items-center px-4 py-2 rounded-full bg-[#C7F33C] text-black text-[12px] font-bold shadow-xs select-none hover:bg-[#b0df2c] active:scale-95 transition-all cursor-pointer h-[38px] mr-1"
          >
            <span>{t("common.create_bot") || "+ Bot yaratish"}</span>
          </button>
        )}

        {/* New Broadcast Button (Broadcast page) */}
        {pathname.startsWith("/broadcast") && (
          <button
            onClick={() => window.dispatchEvent(new Event("sendly-open-new-broadcast-modal"))}
            className="hidden sm:flex items-center px-4 py-2 rounded-full bg-[#C7F33C] text-black text-[12px] font-bold shadow-xs select-none hover:bg-[#b0df2c] active:scale-95 transition-all cursor-pointer h-[38px] mr-1"
          >
            <span>+ {t("pages.broadcast.create_new") || "Yangi xabar"}</span>
          </button>
        )}

        {/* Automations Search & Sort Controls (Automations page) */}
        {pathname.startsWith("/automations") && !pathname.includes("/builder") && (
          <div className="hidden sm:flex items-center gap-2 mr-1">
            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder={t("pages.automations_page.search_placeholder") || "Qidiruv..."}
                value={automationsSearch}
                onChange={(e) => {
                  setAutomationsSearch(e.target.value);
                  window.dispatchEvent(new CustomEvent("sendly-automations-search", { detail: e.target.value }));
                }}
                className="w-[130px] lg:w-[170px] pl-8 pr-3 py-1.5 text-[11px] bg-white border border-[#E8E8E8] rounded-full focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-semibold h-[38px] text-black"
              />
              <Search size={11} className="absolute left-3 top-3 text-[#A0A0A0]" />
              {automationsSearch && (
                <button 
                  onClick={() => {
                    setAutomationsSearch("");
                    window.dispatchEvent(new CustomEvent("sendly-automations-search", { detail: "" }));
                  }} 
                  className="absolute right-3 top-0.5 text-[#707070] hover:text-black font-bold text-[12px] h-[34px] flex items-center"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-white border border-[#E8E8E8] rounded-full px-2 py-0.5 min-w-[100px] h-[38px] select-none text-black">
              <SlidersHorizontal size={11} className="text-[#707070] shrink-0 ml-1.5" />
              <CustomDropdown
                value={automationsSort}
                onChange={(val) => {
                  setAutomationsSort(val);
                  window.dispatchEvent(new CustomEvent("sendly-automations-sort", { detail: val }));
                }}
                options={[
                  { value: "recent", label: t("pages.automations_page.sort_recent") || "Yangi" },
                  { value: "oldest", label: t("pages.automations_page.sort_oldest") || "Eski" },
                  { value: "runs", label: t("pages.automations_page.sort_runs") || "Ishlar" },
                ]}
                className="border-0 bg-transparent p-0 text-[11px] font-bold text-[#505050] focus:border-0 focus:shadow-none hover:bg-transparent rounded-none h-auto w-auto flex-1 select-none pr-1 cursor-pointer"
                dropdownClassName="min-w-[110px] right-0 left-auto mt-2"
              />
            </div>
          </div>
        )}

        {/* Desktop AI Limits TopBar Pill with Tooltip */}
        {currentUser && (
          <div className="group relative hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#E8E8E8]/60 text-black text-[12px] font-bold shadow-xs select-none hover:bg-[#F9F9F7] hover:border-[#D8D8D8] transition-all cursor-pointer h-[38px]">
            <Coins size={13} className="text-[#8CB807] fill-[#8CB807]/10" />
            <span>AI balans: {credits ? activeCredits.balance.toLocaleString() : "..."}</span>
            
            {/* Tooltip on hover */}
            <div className="absolute right-0 top-11 pointer-events-none opacity-0 translate-y-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out z-50 bg-white p-3.5 rounded-[20px] border border-[#E8E8E8] shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col gap-1.5 w-[280px] text-left">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-black font-extrabold text-[12px] shrink-0">
                  <Coins size={13} className="text-black fill-black/10" />
                  <span>{t("pages.account.limits.ai_credits_title") || "AI limiti"}</span>
                </div>
                <span className="text-[12px] text-[#707070] font-bold shrink-0">{credits ? activeCredits.balance.toLocaleString() : "..."} {t("pages.account.billing.unit_credits") || "kredit"}</span>
              </div>
              <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="border-t border-[#F0F0F0] mt-1 pt-1.5 flex flex-col gap-1 text-[10px] text-[#707070]">
                <div className="flex justify-between gap-2.5 font-bold">
                  <span>{t("pages.account.limits.balance_label") || "Balans:"}</span>
                  <span className="text-black">{credits ? activeCredits.balance.toLocaleString() : "..."} {t("pages.account.billing.unit_credits") || "kredit"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Language selector dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[12px] font-medium text-black border border-[#E8E8E8]/60 transition-all duration-150 active:scale-95 hover:bg-[#F4F4F5] hover:border-[#D8D8D8]/60 h-[38px]"
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