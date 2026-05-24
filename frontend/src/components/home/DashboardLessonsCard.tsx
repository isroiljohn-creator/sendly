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
    <Card className="flex min-h-[340px] flex-col justify-between bg-white border border-[#D8D8D8]/60 p-6">
      <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black text-[#C7F33C] grid place-items-center shrink-0">
            <GraduationCap size={15} />
          </div>
          <div>
            <h3 className="text-[13px] font-black text-black leading-none">O&apos;quv darslari</h3>
            <p className="text-[10px] text-[#707070] mt-1">Chatbot sozlash bo&apos;yicha darsliklar</p>
          </div>
        </div>
        <Link
          href="/lessons"
          className="text-[10px] font-bold text-black hover:underline shrink-0"
        >
          Barchasi ➔
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5 my-3">
        {lessons.map((l) => (
          <Link
            key={l.id}
            href={`/lessons`}
            className="flex items-center gap-3 p-2.5 rounded-[16px] hover:bg-[#F9F9F7] active:scale-[0.99] border border-transparent hover:border-[#E8E8E8] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-black grid place-items-center shrink-0">
              <Play size={13} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[12px] font-bold text-black truncate leading-tight">
                {l.title}
              </h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] font-extrabold text-[#9BC92E] bg-[#C7F33C]/10 px-2 py-0.5 rounded-[6px]">
                  {l.level}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-[#707070]">
                  <Clock size={10} />
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
          className="w-full py-2.5 rounded-full text-[11px] font-bold text-black bg-[#F5F5F7] border border-[#E8E8E8] hover:bg-[#E8E8E8] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] text-center block"
        >
          <BookOpen size={12} />
          <span>Darslarni boshlash</span>
        </Link>
      </div>
    </Card>
  );
}
