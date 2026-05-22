"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, LimeBadge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Play, PlayCircle, Clock, X, BookOpen } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  duration: string;
  level: "Boshlang'ich" | "O'rta" | "Kengaytirilgan";
  thumbnail: string;
  description: string;
};

const INITIAL_LESSONS: Lesson[] = [
  {
    id: "1",
    title: "Sendly platformasini Instagramga ulash",
    duration: "6 daqiqa",
    level: "Boshlang'ich",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop",
    description: "Ushbu darsda siz platformada ro'yxatdan o'tish va Instagram Professional hisobini ulashni to'liq o'rganasiz.",
  },
  {
    id: "2",
    title: "Direct orqali avtomatik savdo zanjiri qurish",
    duration: "14 daqiqa",
    level: "O'rta",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&auto=format&fit=crop",
    description: "Kalit so'zlar yordamida mijozlarga avtomatik ravishda mahsulot narxlarini aytish va ularni buyurtmaga yo'naltirish.",
  },
  {
    id: "3",
    title: "Story va Izohlar triggerlarini sozlash",
    duration: "10 daqiqa",
    level: "O'rta",
    thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&auto=format&fit=crop",
    description: "Mijozlar storyda belgilaganda yoki post ostida izoh yozganda bot orqali javob qaytarishni sozlash.",
  },
  {
    id: "4",
    title: "Broadcast orqali ommaviy reklama yuborish",
    duration: "8 daqiqa",
    level: "Kengaytirilgan",
    thumbnail: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=300&auto=format&fit=crop",
    description: "Ma'lumotlar bazasidagi barcha faol obunachilarga ommaviy ravishda aksiyalar va chegirma xabarlarini yuborish.",
  },
];

export default function LessonsPage() {
  const { t } = useI18n();
  const [activeVideo, setActiveVideo] = useState<Lesson | null>(null);

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px] relative">
        <PageHeader
          title={t("pages.lessons.title")}
          breadcrumbs={t("pages.lessons.breadcrumb")}
        />

        {/* Video Player Modal Mock */}
        {activeVideo && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99] flex items-center justify-center p-4">
            <div className="w-full max-w-[800px] flex flex-col gap-4 relative">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute -top-12 right-0 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Video aspect ratio container */}
              <div className="w-full aspect-video rounded-[28px] bg-black border border-white/10 overflow-hidden flex flex-col items-center justify-center text-center relative group">
                {/* Simulated playback visual */}
                <div className="absolute inset-0 bg-cover bg-center opacity-40 filter blur-sm" style={{ backgroundImage: `url(${activeVideo.thumbnail})` }} />
                <div className="relative z-10 flex flex-col items-center gap-4 text-white p-6 max-w-[500px]">
                  <PlayCircle size={64} className="text-[#C7F33C] animate-pulse" />
                  <h3 className="text-[20px] font-medium">{activeVideo.title}</h3>
                  <p className="text-[12px] text-[#A3A3A3]">{activeVideo.description}</p>
                  <span className="text-[11px] bg-[#C7F33C]/20 text-[#C7F33C] px-3 py-1 rounded-full font-medium">
                    {"Simulyatsiya yuklanmoqda... (Batafsil ma'lumot)"}
                  </span>
                </div>
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
                    <span>Darsni boshlash</span>
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
