"use client";

import Link from "next/link";
import { Zap, Plus, Settings } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export function ProPlanCard({ hasChannels = false }: { hasChannels?: boolean; value?: string }) {
  if (!hasChannels) {
    return (
      <Card className="flex min-h-[340px] flex-col justify-between bg-black text-white border border-[#222222] p-6">
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold text-[#C7F33C] uppercase tracking-wider">
            Sinab ko&apos;rish
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#C7F33C]">
            <Plus size={13} />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center my-4">
          <h3 className="text-[20px] font-bold text-white leading-tight">
            Akkauntni bog&apos;lang
          </h3>
          <p className="text-[12px] text-[#A0A0A0] mt-2 leading-relaxed">
            Sendly xizmatining barcha imkoniyatlaridan foydalanish uchun Instagram yoki Telegram akkauntingizni ulang.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-auto shrink-0">
          <Link
            href="/settings?connect=choose"
            className="w-full py-3.5 rounded-full text-[12px] font-bold text-black bg-[#C7F33C] hover:bg-[#9BC92E] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-center block"
          >
            <Plus size={14} />
            <span>Akkauntni ulash</span>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[340px] flex-col justify-between bg-black text-white border border-[#222222] p-6">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[12px] font-semibold text-[#C7F33C] uppercase tracking-wider">
          Chatbot xizmati
        </span>
        <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#C7F33C]">
          <Zap size={13} fill="#C7F33C" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center my-4">
        <h3 className="text-[20px] font-bold text-white leading-tight">
          Chatbotni sozlash
        </h3>
        <p className="text-[12px] text-[#A0A0A0] mt-2 leading-relaxed">
          Mijozlaringiz bilan avtomatlashtirilgan shaxsiy xabarlar oqimini va izohlarga javoblarni sozlang.
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-auto shrink-0">
        <Link
          href="/automations"
          className="w-full py-3.5 rounded-full text-[12px] font-bold text-black bg-[#C7F33C] hover:bg-[#9BC92E] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-center block"
        >
          <Settings size={14} />
          <span>Stsenariylarni sozlash</span>
        </Link>
      </div>
    </Card>
  );
}