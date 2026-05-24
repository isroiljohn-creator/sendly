"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, LimeBadge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Play, Clock, X, BookOpen } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  duration: string;
  level: string;
  thumbnail: string;
  description: string;
  videoUrl: string;
};

export default function LessonsPage() {
  const { t } = useI18n();
  const [activeVideo, setActiveVideo] = useState<Lesson | null>(null);

  const INITIAL_LESSONS: Lesson[] = [
    {
      id: "1",
      title: t("pages.lessons_page.lesson_1_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "6"),
      level: t("pages.lessons_page.level_beginner"),
      thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop",
      description: t("pages.lessons_page.lesson_1_desc"),
      videoUrl: "https://www.youtube.com/embed/8_F8E2sYI_Y",
    },
    {
      id: "2",
      title: t("pages.lessons_page.lesson_2_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "14"),
      level: t("pages.lessons_page.level_intermediate"),
      thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&auto=format&fit=crop",
      description: t("pages.lessons_page.lesson_2_desc"),
      videoUrl: "https://www.youtube.com/embed/t8_wJgR32-o",
    },
    {
      id: "3",
      title: t("pages.lessons_page.lesson_3_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "10"),
      level: t("pages.lessons_page.level_intermediate"),
      thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&auto=format&fit=crop",
      description: t("pages.lessons_page.lesson_3_desc"),
      videoUrl: "https://www.youtube.com/embed/_r4U2yB4Xic",
    },
    {
      id: "4",
      title: t("pages.lessons_page.lesson_4_title"),
      duration: t("pages.lessons_page.duration_mins").replace("{count}", "8"),
      level: t("pages.lessons_page.level_advanced"),
      thumbnail: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=300&auto=format&fit=crop",
      description: t("pages.lessons_page.lesson_4_desc"),
      videoUrl: "https://www.youtube.com/embed/oK75kU39Q_8",
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px] relative">
        <PageHeader
          title={t("pages.lessons.title")}
          breadcrumbs={t("pages.lessons.breadcrumb")}
        />

        {/* Video Player Modal */}
        {activeVideo && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99] flex items-center justify-center p-4">
            <div className="w-full max-w-[800px] flex flex-col gap-4 relative">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute -top-12 right-0 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Video aspect ratio container using iframe for real playback */}
              <div className="w-full aspect-video rounded-[28px] bg-black border border-white/10 overflow-hidden shadow-2xl relative">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={activeVideo.videoUrl}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* Lessons List Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INITIAL_LESSONS.map((l) => (
            <Card key={l.id} className="flex flex-col h-full hover:shadow-md transition-all duration-200 p-0 overflow-hidden border border-[#D8D8D8]">
              {/* Thumbnail header */}
              <div className="relative aspect-video w-full bg-black/10 overflow-hidden group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.thumbnail}
                  alt={l.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={() => setActiveVideo(l)}
                  className="absolute inset-0 m-auto grid h-12 w-12 place-items-center rounded-full bg-black/70 text-[#C7F33C] backdrop-blur-sm shadow hover:scale-110 active:scale-95 transition-all opacity-90 group-hover:opacity-100"
                >
                  <Play size={18} fill="#C7F33C" className="ml-0.5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <LimeBadge className="text-[9px]">{l.level}</LimeBadge>
                    <div className="flex items-center gap-1 text-[11px] text-[#707070]">
                      <Clock size={11} />
                      <span>{l.duration}</span>
                    </div>
                  </div>
                  <h3 className="text-[15px] font-medium text-black mt-3.5 leading-snug">
                    {l.title}
                  </h3>
                  <p className="text-[12px] text-[#707070] mt-2 leading-relaxed line-clamp-3">
                    {l.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#F0F0F0] shrink-0">
                  <Button
                    onClick={() => setActiveVideo(l)}
                    variant="secondary"
                    className="w-full py-2.5 text-[12px] border border-[#E8E8E8] flex items-center justify-center gap-1.5"
                  >
                    <BookOpen size={13} />
                    <span>{t("pages.lessons_page.start_lesson")}</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
