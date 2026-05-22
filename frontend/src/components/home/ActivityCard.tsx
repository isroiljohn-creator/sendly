"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { Card, BarChart } from "@/components/ui/primitives";

const DEFAULT_VALUES = [40, 55, 32, 70, 48, 90, 38];

interface ActivityCardProps {
  value?: string | number;
  subText?: string;
  values?: number[];
}

export function ActivityCard({ value = "12,486", subText, values = DEFAULT_VALUES }: ActivityCardProps) {
  const { t, days } = useI18n();

  return (
    <Card className="flex min-h-[340px] flex-col bg-white">
      <span className="text-[13px] text-[#707070]">{t("pages.home.activity")}</span>
      <div className="bf-tight mt-2 text-[42px] font-medium leading-none text-black">{value}</div>
      <div className="mt-1.5 text-[12px] text-[#707070]">{subText || t("pages.home.activity_sub")}</div>

      <BarChart
        values={values}
        days={days}
        highlightIndex={5}
        highlightTag={String(value)}
      />
    </Card>
  );
}