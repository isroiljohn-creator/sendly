"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, MetricCard, BarChart, AreaChart } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";

export default function AnalyticsPage() {
  const { t, days } = useI18n();

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
            value="92.4%"
            caption={t("pages.analytics.optin_sub")}
            trend="+3.4%"
            trendType="positive"
          />
          <MetricCard
            label={t("pages.analytics.avg_completion")}
            value="89.1%"
            caption={t("pages.analytics.avg_completion_sub")}
            trend="+1.2%"
            trendType="positive"
          />
          <MetricCard
            label={t("pages.analytics.messages_sent")}
            value="45,821"
            caption={t("pages.analytics.messages_sent_sub")}
            trend="+14%"
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
                values={[3400, 4200, 3900, 5200, 6100, 7800, 7200]}
                days={days}
                highlightIndex={5}
                highlightTag="7,800"
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
                points={[74, 78, 76, 82, 85, 89, 92]}
                highlightIndex={6}
                highlightTag="92%"
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
