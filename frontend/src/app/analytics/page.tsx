"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, MetricCard, BarChart, AreaChart } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";

export default function AnalyticsPage() {
  const { t, days } = useI18n();

  const [stats, setStats] = useState({
    optInRate: "0.0%",
    avgCompletion: "0.0%",
    messagesSent: "0",
    messagesVolume: [0, 0, 0, 0, 0, 0, 0],
    leadConversions: [0, 0, 0, 0, 0, 0, 0],
    revenueVal: "0 UZS"
  });

  useEffect(() => {
    setStats(db.getRealAnalytics());

    const handleDbUpdate = () => {
      setStats(db.getRealAnalytics());
    };
    window.addEventListener("replai-db-update", handleDbUpdate);
    return () => window.removeEventListener("replai-db-update", handleDbUpdate);
  }, []);

  const lastVol = stats.messagesVolume[6] || 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px]">
        <PageHeader
          title={t("pages.analytics.title")}
          breadcrumbs={t("pages.analytics.breadcrumb")}
          filters={
            <button className="rounded-full bg-white px-4 py-2.5 text-[13px] font-medium text-black hover:bg-white/95 active:scale-95 transition-all">
              {t("common.date_range")}
            </button>
          }
        />

        {/* Analytics Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            label={t("pages.analytics.optin_rate")}
            value={stats.optInRate}
            caption={t("pages.analytics.optin_sub")}
            trend={parseFloat(stats.optInRate) > 0 ? "+3.4%" : "0.0%"}
            trendType="positive"
          />
          <MetricCard
            label={t("pages.analytics.avg_completion")}
            value={stats.avgCompletion}
            caption={t("pages.analytics.avg_completion_sub")}
            trend={parseFloat(stats.avgCompletion) > 0 ? "+1.2%" : "0.0%"}
            trendType="positive"
          />
          <MetricCard
            label={t("pages.analytics.messages_sent")}
            value={stats.messagesSent}
            caption={t("pages.analytics.messages_sent_sub")}
            trend={parseInt(stats.messagesSent.replace(/[^0-9]/g, "")) > 0 ? "+14%" : "0%"}
            trendType="positive"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Chart 1: Messages Volume */}
          <Card className="flex flex-col min-h-[300px]">
            <div>
              <h3 className="text-[15px] font-medium text-black">
                Yuborilgan xabarlar hajmi
              </h3>
              <p className="text-[12px] text-[#707070] mt-0.5">
                {"Kuni bo'yicha yuborilgan umumiy Direct xabarlar"}
              </p>
            </div>
            <div className="mt-8 flex-1 flex flex-col justify-end">
              <BarChart
                values={stats.messagesVolume}
                days={days}
                highlightIndex={6}
                highlightTag={String(lastVol.toLocaleString("uz-UZ"))}
                height={160}
              />
            </div>
          </Card>

          {/* Chart 2: Lead Conversions */}
          <Card className="flex flex-col min-h-[300px]">
            <div>
              <h3 className="text-[15px] font-medium text-black">
                {"Konversiyalar koeffitsiyenti"}
              </h3>
              <p className="text-[12px] text-[#707070] mt-0.5">
                {"Bot bilan suhbatdan mijozlikka o'tish foizi"}
              </p>
            </div>
            <div className="mt-8 flex-1 flex flex-col justify-end">
              <AreaChart
                points={stats.leadConversions}
                highlightIndex={6}
                highlightTag={`${stats.leadConversions[6]}%`}
                width={400}
                height={160}
              />
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
