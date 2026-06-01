"use client";

import Link from "next/link";
import { GraduationCap, Play, Clock, BookOpen } from "lucide-react";
import { Card, LimeBadge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";

export function DashboardLessonsCard() {
  const { t } = useI18n();

  const lessons = [
    {
      id: "1",
      title: t("pages.lessons_page.lesson_1_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "6"),
      level: t("pages.lessons_page.level_beginner"),
    },
    {
      id: "2",
      title: t("pages.lessons_page.lesson_2_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "14"),
      level: t("pages.lessons_page.level_intermediate"),
    },
    {
      id: "3",
      title: t("pages.lessons_page.lesson_3_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "10"),
      level: t("pages.lessons_page.level_intermediate"),
    },
  ];

  return (
    <Card className="flex min-h-[250px] flex-col justify-between bg-white border border-[#D8D8D8]/60 p-5">
      <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black text-[#C7F33C] grid place-items-center shrink-0">
            <GraduationCap size={15} />
          </div>
          <div>
            <h3 className="text-[13px] font-black text-black leading-none">{t("pages.home.lessons_title")}</h3>
            <p className="text-[9px] text-[#707070] mt-0.5">{t("pages.home.lessons_desc")}</p>
          </div>
        </div>
        <Link
          href="/lessons"
          className="text-[10px] font-bold text-black hover:underline shrink-0"
        >
          {t("pages.home.all_link")}
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-1.5 my-2">
        {lessons.map((l) => (
          <Link
            key={l.id}
            href={`/lessons`}
            className="flex items-center gap-2.5 p-1.5 rounded-[12px] hover:bg-[#F9F9F7] active:scale-[0.99] border border-transparent hover:border-[#E8E8E8] transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-[#F5F5F7] text-black grid place-items-center shrink-0">
              <Play size={10} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[11px] font-bold text-black truncate leading-tight">
                {l.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] font-extrabold text-[#9BC92E] bg-[#C7F33C]/10 px-1.5 py-0.5 rounded-[4px]">
                  {l.level}
                </span>
                <span className="flex items-center gap-1 text-[8px] text-[#707070]">
                  <Clock size={8} />
                  {l.duration}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-2 border-t border-[#F0F0F0] shrink-0">
        <Link
          href="/lessons"
          className="w-full py-2 rounded-full text-[11px] font-bold text-black bg-[#F5F5F7] border border-[#E8E8E8] hover:bg-[#E8E8E8] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] text-center block"
        >
          <BookOpen size={12} />
          <span>{t("pages.home.start_lessons_btn")}</span>
        </Link>
      </div>
    </Card>
  );
}
