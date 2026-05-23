"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "@/components/ui/primitives";
import Link from "next/link";

export function InstagramConnectCard() {
  const { t } = useI18n();
  const lines = t("pages.home.ig_title").split("\n");
  return (
    <Card variant="dark" className="flex min-h-[340px] flex-col text-white">
      <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#C7F33C] text-[#1A2906] shrink-0">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="1.75"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </div>

      <div className="mt-auto">
        <h3 className="text-[18px] font-medium leading-tight text-white">
          {lines.map((l, i) => (
            <span key={i} className="block">{l}</span>
          ))}
        </h3>
        <p className="mt-1.5 text-[12px] text-[#9CA3AF]">{t("pages.home.ig_sub")}</p>

        <Link
          href="/settings?connect=instagram"
          className="mt-5 w-full inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] text-[13px] bg-[#C7F33C] text-[#1A2906] hover:bg-[#9BC92E] px-5 py-3.5 rounded-full text-center block"
        >
          {t("common.connect_instagram")}
        </Link>
      </div>
    </Card>
  );
}