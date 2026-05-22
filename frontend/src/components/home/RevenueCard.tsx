"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { Card, AreaChart } from "@/components/ui/primitives";

const DEFAULT_POINTS = [30, 45, 38, 55, 48, 70, 62, 80, 72, 88];

interface RevenueCardProps {
  value?: string;
  subText?: string;
  points?: number[];
  highlightTag?: string;
}

export function RevenueCard({ value = "29,48 mln", subText, points = DEFAULT_POINTS, highlightTag = "+9%" }: RevenueCardProps) {
  const { t } = useI18n();

  return (
    <Card className="flex min-h-[340px] flex-col bg-white">
      <span className="text-[13px] text-[#707070]">{t("pages.home.revenue")}</span>
      <div className="bf-tight mt-2 text-[42px] font-medium leading-none text-black">{value}</div>
      <div className="mt-1.5 text-[12px] text-[#707070]">{subText || t("pages.home.revenue_sub")}</div>

      <AreaChart
        points={points}
        highlightIndex={6}
        highlightTag={highlightTag}
      />
    </Card>
  );
}