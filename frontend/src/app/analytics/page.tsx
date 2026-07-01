"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, MetricCard, BarChart, AreaChart } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";

type RangeKey = "today" | "7days" | "30days" | "all";

export default function AnalyticsPage() {
  const { t, days } = useI18n();

  const [selectedRangeKey, setSelectedRangeKey] = useState<RangeKey>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sendly_selected_range") as RangeKey;
      if (saved && ["today", "7days", "30days", "all"].includes(saved)) {
        return saved;
      }
    }
    return "7days";
  });

  const [stats, setStats] = useState(() => db.getRealAnalytics());

  useEffect(() => {
    const handleDbUpdate = () => {
      setStats(db.getRealAnalytics());
    };
    const handleRangeChange = (e: Event) => {
      const customEvent = e as CustomEvent<RangeKey>;
      if (customEvent.detail) {
        setSelectedRangeKey(customEvent.detail);
      }
    };

    window.addEventListener("replai-db-update", handleDbUpdate);
    window.addEventListener("sendly-range-changed", handleRangeChange as EventListener);

    return () => {
      window.removeEventListener("replai-db-update", handleDbUpdate);
      window.removeEventListener("sendly-range-changed", handleRangeChange as EventListener);
    };
  }, []);

  const lastVol = stats.messagesVolume[6] || 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px]">
        <PageHeader
          title={t("pages.analytics.title")}
          breadcrumbs={t("pages.analytics.breadcrumb")}
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
                {t("pages.analytics.sent_volume_title")}
              </h3>
              <p className="text-[12px] text-[#707070] mt-0.5">
                {t("pages.analytics.sent_volume_desc")}
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
                {t("pages.analytics.conversion_rate_title")}
              </h3>
              <p className="text-[12px] text-[#707070] mt-0.5">
                {t("pages.analytics.conversion_rate_desc")}
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
