"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProPlanCard } from "@/components/home/ProPlanCard";
import { ActivityCard } from "@/components/home/ActivityCard";
import { RevenueCard } from "@/components/home/RevenueCard";
import { AutomationsCard } from "@/components/home/AutomationsCard";
import { InstagramConnectCard } from "@/components/home/InstagramConnectCard";
import { Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import type { Channel, Contact, Automation, User } from "@/lib/db";
import { LandingPageView } from "@/components/landing/LandingPageView";

type RangeKey = "today" | "7days" | "30days" | "all";

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

const RANGE_PRESETS: Record<RangeKey, RangeData> = {
  today: {
    label: "Bugun",
    dateText: "21 May, 2026",
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
    dateText: "15 May — 21 May",
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
    dateText: "1 May — 21 May",
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
};

export default function Home() {
  const { t } = useI18n();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Dashboard States
  const [selectedRangeKey, setSelectedRangeKey] = useState<RangeKey>("7days");
  const [isDateOpen, setIsDateOpen] = useState(false);
  
  const [isCreateBotOpen, setIsCreateBotOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotTrigger, setNewBotTrigger] = useState<"keyword" | "story">("keyword");

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
      setIsLoaded(true);
    }
  }, []);

  const getDynamicStats = (rangeKey: RangeKey): RangeData => {
    const preset = RANGE_PRESETS[rangeKey];
    const localizedLabel = t(`pages.home.ranges.${rangeKey}` as string);
    const localizedDateText = t(`pages.home.ranges.${rangeKey}_date` as string);
    const localizedActivitySub = t(`pages.home.ranges.${rangeKey}_sub` as string);
    const localizedRevenueSub = t(`pages.home.ranges.${rangeKey}_rev` as string);
    
    if (!isLoaded) {
      return {
        ...preset,
        label: localizedLabel,
        dateText: localizedDateText,
        activitySub: localizedActivitySub,
        revenueSub: localizedRevenueSub,
        activityVal: "0",
        activityPoints: [0, 0, 0, 0, 0, 0, 0],
        revenueVal: "0.00 mln",
        revenuePoints: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        revenueTag: "+0%",
        proVal: "0",
      };
    }

    if (channels.length === 0 || !activeChannel) {
      return {
        label: localizedLabel,
        dateText: localizedDateText,
        activityVal: "0",
        activitySub: localizedActivitySub,
        activityPoints: [0, 0, 0, 0, 0, 0, 0],
        revenueVal: "0.00 mln",
        revenueSub: localizedRevenueSub,
        revenuePoints: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        revenueTag: "+0%",
        proVal: "0",
      };
    }


    const totalRuns = automations.reduce((sum, a) => {
      const val = parseInt(a.runs.replace(/[^0-9]/g, "")) || 0;
      return sum + val;
    }, 0);

    const totalMessages = contacts.reduce((sum, c) => sum + c.messagesCount, 0);

    let activityVal = "0";
    let activityPoints = [0, 0, 0, 0, 0, 0, 0];
    let proVal = String(totalRuns);
    const revenueVal = "0.00 mln";
    const revenuePoints = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const revenueTag = "+0%";

    if (contacts.length > 0) {
      if (rangeKey === "today") {
        activityVal = String(Math.round(totalMessages * 0.15) || contacts.length);
        activityPoints = [
          Math.round(totalMessages * 0.02),
          Math.round(totalMessages * 0.03),
          Math.round(totalMessages * 0.02),
          Math.round(totalMessages * 0.05),
          Math.round(totalMessages * 0.04),
          Math.round(totalMessages * 0.06),
          Math.round(totalMessages * 0.04)
        ];
        proVal = String(Math.round(totalRuns * 0.1) || totalRuns);
      } else if (rangeKey === "7days") {
        activityVal = String(totalMessages || contacts.length);
        activityPoints = [
          Math.round(totalMessages * 0.1),
          Math.round(totalMessages * 0.15),
          Math.round(totalMessages * 0.08),
          Math.round(totalMessages * 0.2),
          Math.round(totalMessages * 0.12),
          Math.round(totalMessages * 0.25),
          Math.round(totalMessages * 0.1)
        ];
        proVal = String(totalRuns);
      } else if (rangeKey === "30days") {
        activityVal = String(totalMessages * 4 || contacts.length * 4);
        activityPoints = [
          Math.round(totalMessages * 0.4),
          Math.round(totalMessages * 0.5),
          Math.round(totalMessages * 0.4),
          Math.round(totalMessages * 0.6),
          Math.round(totalMessages * 0.5),
          Math.round(totalMessages * 0.8),
          Math.round(totalMessages * 0.6)
        ];
        proVal = String(totalRuns * 4);
      } else {
        activityVal = String(totalMessages * 15 || contacts.length * 15);
        activityPoints = [
          Math.round(totalMessages * 1.5),
          Math.round(totalMessages * 2.0),
          Math.round(totalMessages * 1.8),
          Math.round(totalMessages * 2.5),
          Math.round(totalMessages * 2.2),
          Math.round(totalMessages * 3.0),
          Math.round(totalMessages * 2.6)
        ];
        proVal = String(totalRuns * 12);
      }
    }

    return {
      label: localizedLabel,
      dateText: localizedDateText,
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
    return (
      <div className="flex h-screen items-center justify-center bg-[#070708] text-white">
        {t("common.loading")}
      </div>
    );
  }

  // Render Landing Page for guest users
  if (!currentUser) {
    return <LandingPageView />;
  }

  // Render Dashboard for authenticated users
  const activeRange = getDynamicStats(selectedRangeKey);

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px]">
        <PageHeader
          title={t("pages.home.title")}
          breadcrumbs={t("pages.home.breadcrumb")}
          filters={
            <div className="relative" ref={dateRef}>
              <button
                onClick={() => setIsDateOpen(!isDateOpen)}
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-medium text-black border border-[#D8D8D8]/60 transition-all hover:bg-white/95 active:scale-95 shadow-sm"
              >
                <span>{activeRange.dateText}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDateOpen ? "rotate-180" : ""}`} />
              </button>

              {isDateOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-[180px] rounded-[20px] bg-white p-2 border border-[#D8D8D8] shadow-lg z-[90] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex flex-col gap-1 text-[12px]">
                    {(Object.keys(RANGE_PRESETS) as RangeKey[]).map((key) => {
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedRangeKey(key);
                            setIsDateOpen(false);
                          }}
                          className={[
                            "w-full px-3 py-2 rounded-[12px] text-left transition-colors text-black font-medium",
                            selectedRangeKey === key ? "bg-[#C7F33C]/20 text-[#1A2906]" : "hover:bg-[#F9F9F7]",
                          ].join(" ")}
                        >
                          {t(`pages.home.ranges.${key}` as string)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          }
          actions={
            <Button variant="accent" onClick={() => {
              setNewBotName("");
              setIsCreateBotOpen(true);
            }}>
              {t("common.create_bot")}
            </Button>
          }
        />

        {/* Row 1 — 3 columns */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProPlanCard value={activeRange.proVal} />
          <ActivityCard
            value={activeRange.activityVal}
            subText={activeRange.activitySub}
            values={activeRange.activityPoints}
          />
          <RevenueCard
            value={activeRange.revenueVal}
            subText={activeRange.revenueSub}
            points={activeRange.revenuePoints}
            highlightTag={activeRange.revenueTag}
          />
        </section>

        {/* Row 2 — 2 columns */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
          <AutomationsCard />
          <InstagramConnectCard />
        </section>
      </div>

      {/* Custom Create Bot Dialog */}
      {isCreateBotOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-7 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
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
