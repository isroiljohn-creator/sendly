"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProPlanCard } from "@/components/home/ProPlanCard";
import { ActivityCard } from "@/components/home/ActivityCard";
import { DashboardLessonsCard } from "@/components/home/DashboardLessonsCard";
import { AutomationsCard } from "@/components/home/AutomationsCard";
import { Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import type { Channel, Contact, Automation, User } from "@/lib/db";
import { LandingPageView } from "@/components/landing/LandingPageView";
import { BrandLoader } from "@/components/ui/BrandLoader";

type RangeKey = "today" | "7days" | "30days" | "all" | "custom";

type RangeData = {
  label: string;
  dateText: string;
  activityVal: string;
  activitySub: string;
  activityPoints: number[];
  revenueVal: string;
  revenueSub: string;
  revenuePoints: number[];
  revenueTag: string;
  proVal: string;
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function getDynamicDateText(rangeKey: RangeKey): string {
  const now = new Date();
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
}

const RANGE_PRESETS: Record<RangeKey, RangeData> = {
  today: {
    label: "Bugun",
    dateText: "",
    activityVal: "1,842",
    activitySub: "Bugungi faol suhbatlar soni",
    activityPoints: [20, 32, 25, 60, 48, 80, 50],
    revenueVal: "3,10 mln",
    revenueSub: "Bugungi jami savdo hajmi",
    revenuePoints: [10, 15, 12, 18, 22, 28, 26, 32, 30, 35],
    revenueTag: "+12%",
    proVal: "450",
  },
  "7days": {
    label: "Oxirgi 7 kun",
    dateText: "",
    activityVal: "12,486",
    activitySub: "Oxirgi 7 kundagi faol suhbatlar",
    activityPoints: [40, 55, 32, 70, 48, 90, 38],
    revenueVal: "29,48 mln",
    revenueSub: "Oxirgi 7 kundagi jami savdo hajmi",
    revenuePoints: [30, 45, 38, 55, 48, 70, 62, 80, 72, 88],
    revenueTag: "+9%",
    proVal: "12,233",
  },
  "30days": {
    label: "Oxirgi 30 kun",
    dateText: "",
    activityVal: "54,921",
    activitySub: "Oxirgi 30 kundagi faol suhbatlar",
    activityPoints: [60, 75, 58, 88, 72, 110, 85],
    revenueVal: "134,20 mln",
    revenueSub: "Oxirgi 30 kundagi jami savdo hajmi",
    revenuePoints: [50, 65, 60, 82, 78, 95, 90, 112, 105, 124],
    revenueTag: "+15%",
    proVal: "52,480",
  },
  all: {
    label: "Barcha davr",
    dateText: "Barcha davr",
    activityVal: "245,821",
    activitySub: "Barcha davrdagi faol suhbatlar",
    activityPoints: [90, 120, 110, 140, 125, 170, 150],
    revenueVal: "624,90 mln",
    revenueSub: "Barcha davrdagi jami savdo hajmi",
    revenuePoints: [80, 105, 95, 130, 120, 145, 138, 168, 160, 185],
    revenueTag: "+24%",
    proVal: "235,900",
  },
  custom: {
    label: "Taqvim",
    dateText: "Boshqa...",
    activityVal: "12,486",
    activitySub: "Tanlangan davrdagi faol suhbatlar",
    activityPoints: [40, 55, 32, 70, 48, 90, 38],
    revenueVal: "29,48 mln",
    revenueSub: "Tanlangan davrdagi jami savdo hajmi",
    revenuePoints: [30, 45, 38, 55, 48, 70, 62, 80, 72, 88],
    revenueTag: "+9%",
    proVal: "12,233",
  },
};

export default function Home() {
  const { t } = useI18n();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Dashboard States
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
  
  const [isCreateBotOpen, setIsCreateBotOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotTrigger, setNewBotTrigger] = useState<"keyword" | "story">("keyword");

  useEffect(() => {
    const handleRangeChange = (e: Event) => {
      const customEvent = e as CustomEvent<RangeKey>;
      if (customEvent.detail) {
        setSelectedRangeKey(customEvent.detail);
      }
    };
    const handleCreateBot = () => {
      setNewBotName("");
      setIsCreateBotOpen(true);
    };

    window.addEventListener("sendly-range-changed", handleRangeChange as EventListener);
    window.addEventListener("replai-open-create-bot-modal", handleCreateBot);

    return () => {
      window.removeEventListener("sendly-range-changed", handleRangeChange as EventListener);
      window.removeEventListener("replai-open-create-bot-modal", handleCreateBot);
    };
  }, []);

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [realStats, setRealStats] = useState({
    optInRate: "0.0%",
    avgCompletion: "0.0%",
    messagesSent: "0",
    messagesVolume: [0, 0, 0, 0, 0, 0, 0],
    leadConversions: [0, 0, 0, 0, 0, 0, 0],
    revenueVal: "0 UZS"
  });

  const dateRef = useRef<HTMLDivElement>(null);

  // Click outside listener for date picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    setIsAuthLoaded(true);

    if (user) {
      const ch = db.getActiveChannel();
      setActiveChannel(ch);
      setChannels(db.getChannels());
      setContacts(db.getContacts());
      if (ch) {
        setAutomations(db.getChannelAutomations(ch.id));
      } else {
        setAutomations([]);
      }
      setRealStats(db.getRealAnalytics());
      setIsLoaded(true);
    }

    const handleDbUpdate = () => {
      const u = db.getCurrentUser();
      if (u) {
        setCurrentUser(u);
        setChannels(db.getChannels());
        setContacts(db.getContacts());
        const activeCh = db.getActiveChannel();
        setActiveChannel(activeCh);
        if (activeCh) {
          setAutomations(db.getChannelAutomations(activeCh.id));
        } else {
          setAutomations([]);
        }
        setRealStats(db.getRealAnalytics());
      }
    };
    window.addEventListener("replai-db-update", handleDbUpdate);
    return () => window.removeEventListener("replai-db-update", handleDbUpdate);
  }, []);

  const getDynamicStats = (rangeKey: RangeKey): RangeData => {
    const preset = RANGE_PRESETS[rangeKey as keyof typeof RANGE_PRESETS] || RANGE_PRESETS["7days"];
    const localizedLabel = rangeKey === "custom" ? "Sanani tanlash" : t(`pages.home.ranges.${rangeKey}` as string);
    const dynamicDateText = rangeKey === "custom"
      ? (typeof window !== "undefined" ? localStorage.getItem("sendly_custom_range_text") || "Boshqa..." : "Boshqa...")
      : getDynamicDateText(rangeKey);
    const localizedActivitySub = rangeKey === "custom" ? "Tanlangan davrdagi faol suhbatlar" : t(`pages.home.ranges.${rangeKey}_sub` as string);
    const localizedRevenueSub = rangeKey === "custom" ? "Tanlangan davrdagi jami savdo" : t(`pages.home.ranges.${rangeKey}_rev` as string);
    
    if (!isLoaded) {
      return {
        ...preset,
        label: localizedLabel,
        dateText: dynamicDateText,
        activitySub: localizedActivitySub,
        revenueSub: localizedRevenueSub,
        activityVal: "0",
        activityPoints: [0, 0, 0, 0, 0, 0, 0],
        revenueVal: "0 UZS",
        revenuePoints: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        revenueTag: "+0%",
        proVal: "0",
      };
    }

    if (channels.length === 0 || !activeChannel) {
      return {
        label: localizedLabel,
        dateText: dynamicDateText,
        activityVal: "0",
        activitySub: localizedActivitySub,
        activityPoints: [0, 0, 0, 0, 0, 0, 0],
        revenueVal: "0 UZS",
        revenueSub: localizedRevenueSub,
        revenuePoints: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        revenueTag: "+0%",
        proVal: "0",
      };
    }

    const totalRuns = automations.reduce((sum, a) => {
      const val = parseInt((a.runs || "0").toString().replace(/[^0-9]/g, "")) || 0;
      return sum + val;
    }, 0);

    const sentCount = parseInt((realStats.messagesSent || "0").toString().replace(/[^0-9]/g, "")) || 0;
    const totalUzs = parseInt((realStats.revenueVal || "0").toString().replace(/[^0-9]/g, "")) || 0;

    let activityVal = "0";
    let activityPoints = [0, 0, 0, 0, 0, 0, 0];
    let proVal = String(totalRuns);
    let revenueVal = "0 UZS";
    let revenuePoints = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let revenueTag = "+0%";

    if (rangeKey === "today") {
      const todaySent = Math.round(sentCount * 0.15);
      activityVal = todaySent.toLocaleString("uz-UZ");
      activityPoints = realStats.messagesVolume.map(v => Math.round(v * 0.15));
      
      const todayUzs = Math.round(totalUzs * 0.12);
      revenueVal = todayUzs > 0 ? `${todayUzs.toLocaleString("uz-UZ")} UZS` : "0 UZS";
      revenuePoints = [10, 15, 12, 18, 22, 28, 26, 32, 30, 35].map(v => Math.round(v * (todayUzs || 100000) * 0.005));
      revenueTag = todayUzs > 0 ? "+12%" : "+0%";
      proVal = String(Math.round(totalRuns * 0.1) || totalRuns);
    } else if (rangeKey === "7days") {
      const weekSent = sentCount;
      activityVal = weekSent.toLocaleString("uz-UZ");
      activityPoints = realStats.messagesVolume;
      
      const weekUzs = totalUzs;
      revenueVal = weekUzs > 0 ? `${weekUzs.toLocaleString("uz-UZ")} UZS` : "0 UZS";
      revenuePoints = [30, 45, 38, 55, 48, 70, 62, 80, 72, 88].map(v => Math.round(v * (weekUzs || 100000) * 0.005));
      revenueTag = weekUzs > 0 ? "+9%" : "+0%";
      proVal = String(totalRuns);
    } else if (rangeKey === "30days") {
      const monthSent = sentCount * 4;
      activityVal = monthSent.toLocaleString("uz-UZ");
      activityPoints = realStats.messagesVolume.map(v => v * 4);
      
      const monthUzs = totalUzs * 4;
      revenueVal = monthUzs > 0 ? `${monthUzs.toLocaleString("uz-UZ")} UZS` : "0 UZS";
      revenuePoints = [50, 65, 60, 82, 78, 95, 90, 112, 105, 124].map(v => Math.round(v * (monthUzs || 100000) * 0.005));
      revenueTag = monthUzs > 0 ? "+15%" : "+0%";
      proVal = String(totalRuns * 4);
    } else { // all
      const allSent = sentCount * 12;
      activityVal = allSent.toLocaleString("uz-UZ");
      activityPoints = realStats.messagesVolume.map(v => v * 12);
      
      const allUzs = totalUzs * 12;
      revenueVal = allUzs > 0 ? `${allUzs.toLocaleString("uz-UZ")} UZS` : "0 UZS";
      revenuePoints = [80, 105, 95, 130, 120, 145, 138, 168, 160, 185].map(v => Math.round(v * (allUzs || 100000) * 0.005));
      revenueTag = allUzs > 0 ? "+24%" : "+0%";
      proVal = String(totalRuns * 12);
    }

    return {
      label: localizedLabel,
      dateText: dynamicDateText,
      activityVal,
      activitySub: localizedActivitySub,
      activityPoints,
      revenueVal,
      revenueSub: localizedRevenueSub,
      revenuePoints,
      revenueTag,
      proVal,
    };
  };

  if (!isAuthLoaded) {
    return <BrandLoader fullScreen theme="dark" />;
  }

  // Render Landing Page for guest users
  if (!currentUser) {
    return <LandingPageView />;
  }

  // Render Dashboard for authenticated users
  const activeRange = getDynamicStats(selectedRangeKey);

  return (
    <AppLayout>
      <div className="flex flex-col gap-[20px]">
        <PageHeader
          title={t("pages.home.title")}
          breadcrumbs={t("pages.home.breadcrumb")}
        />

        {/* Row 1 — 3 columns */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProPlanCard hasChannels={channels.length > 0} value={activeRange.proVal} />
          <ActivityCard
            value={activeRange.activityVal}
            subText={activeRange.activitySub}
            values={activeRange.activityPoints}
          />
          <DashboardLessonsCard />
        </section>

        {/* Row 2 */}
        <section className="grid grid-cols-1 gap-4">
          <AutomationsCard />
        </section>
      </div>

      {/* Custom Create Bot Dialog */}
      {isCreateBotOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-[5px] p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-7 border border-[#E8E8E8]/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)] animate-in zoom-in-95 duration-200">
            <h3 className="text-[17px] font-semibold text-black leading-none">
              {t("pages.home.create_bot.title")}
            </h3>
            <p className="text-[12px] text-[#707075] mt-2 leading-relaxed">
              {t("pages.home.create_bot.desc")}
            </p>
            
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#707075] px-1">
                  {t("pages.home.create_bot.bot_name")}
                </label>
                <input
                  type="text"
                  required
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder={t("pages.home.create_bot.bot_name_placeholder")}
                  className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black border border-[#E8E8E8] outline-none placeholder:text-[#a0a0a0] focus:bg-[#E8E8E8]/70 focus:border-[#C7F33C] transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#707075] px-1">
                  {t("pages.home.create_bot.trigger_type")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBotTrigger("keyword")}
                    className={[
                      "flex-1 py-2.5 rounded-[12px] text-[12px] font-medium border transition-all active:scale-[0.98]",
                      newBotTrigger === "keyword"
                        ? "bg-black text-[#C7F33C] border-black shadow-sm"
                        : "bg-transparent text-black border-[#D8D8D8] hover:bg-[#F9F9F7]"
                    ].join(" ")}
                  >
                    {t("pages.home.create_bot.keyword_direct")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBotTrigger("story")}
                    className={[
                      "flex-1 py-2.5 rounded-[12px] text-[12px] font-medium border transition-all active:scale-[0.98]",
                      newBotTrigger === "story"
                        ? "bg-black text-[#C7F33C] border-black shadow-sm"
                        : "bg-transparent text-black border-[#D8D8D8] hover:bg-[#F9F9F7]"
                    ].join(" ")}
                  >
                    {t("pages.home.create_bot.story_mentions")}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-7 flex items-center justify-end gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => setIsCreateBotOpen(false)}
                className="rounded-full bg-[#F0F0F0] px-4 py-2.5 font-medium text-black hover:bg-[#E8E8E8] active:scale-95 transition-all"
              >
                {t("common.cancel")}
              </button>
              <Link
                href={`/automations/builder?name=${encodeURIComponent(newBotName || "Yangi Instagram Bot")}&trigger=${newBotTrigger}`}
                onClick={() => setIsCreateBotOpen(false)}
              >
                <button
                  type="button"
                  className="rounded-full bg-[#C7F33C] text-[#1A2906] px-5 py-2.5 font-semibold hover:bg-[#9BC92E] active:scale-95 transition-all"
                >
                  {t("pages.home.create_bot.open_builder")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
