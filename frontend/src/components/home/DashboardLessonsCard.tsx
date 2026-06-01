"use client";

import Link from "next/link";
import { GraduationCap, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";

export function DashboardLessonsCard() {
  const { t } = useI18n();

  const lessons = [
    {
      id: "1",
      title: t("pages.lessons_page.lesson_1_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "6"),
      level: t("pages.lessons_page.level_beginner"),
      bg: "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white border border-zinc-800/85",
      tagBg: "bg-white/10 text-white/80",
      iconColor: "text-[#C7F33C]"
    },
    {
      id: "2",
      title: t("pages.lessons_page.lesson_2_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "14"),
      level: t("pages.lessons_page.level_intermediate"),
      bg: "bg-gradient-to-br from-[#C7F33C] to-[#9BC92E] text-[#1A2906]",
      tagBg: "bg-[#1A2906]/10 text-[#1A2906]/85",
      iconColor: "text-[#1A2906]"
    },
    {
      id: "3",
      title: t("pages.lessons_page.lesson_3_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "10"),
      level: t("pages.lessons_page.level_intermediate"),
      bg: "bg-gradient-to-br from-[#1A2906] via-[#101C02] to-[#0D1503] text-[#C7F33C] border border-[#C7F33C]/10",
      tagBg: "bg-[#C7F33C]/10 text-[#C7F33C]/80",
      iconColor: "text-[#C7F33C]"
    }
  ];

  return (
    <Card className="flex min-h-[250px] flex-col justify-between bg-white p-5">
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

      <div className="relative h-[125px] w-full mt-3.5 select-none overflow-hidden">
        {lessons.map((l, i) => {
          let leftClass = "left-0";
          if (i === 1) leftClass = "left-[50px] sm:left-[60px]";
          if (i === 2) leftClass = "left-[100px] sm:left-[120px]";
          
          let zIndexClass = "z-10";
          if (i === 1) zIndexClass = "z-20";
          if (i === 2) zIndexClass = "z-30";

          return (
            <Link
              key={l.id}
              href="/lessons"
              className={`absolute top-1 ${leftClass} ${zIndexClass} hover:z-50 flex w-[145px] sm:w-[155px] h-[110px] flex-col justify-between rounded-[18px] p-3 shadow-md hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer ${l.bg}`}
            >
              <div className="flex items-center justify-between">
                <GraduationCap size={13} className={l.iconColor} />
                <span className={`text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full ${l.tagBg}`}>
                  {l.level}
                </span>
              </div>
              <div className="mt-1 flex-1">
                <h4 className="text-[9.5px] font-extrabold leading-[1.25] line-clamp-2">
                  {l.title}
                </h4>
              </div>
              <div className="flex items-center justify-between text-[7.5px] opacity-75 font-semibold">
                <span>{l.id}-Dars</span>
                <span>{l.duration}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="pt-2 border-t border-[#F0F0F0] shrink-0 mt-2">
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
