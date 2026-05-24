"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import type { User } from "@/lib/db";

export function ProPlanCard({ value: _value = "12,233" }: { value?: string }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
  }, []);

  const isPro = currentUser?.isCardLinked;

  if (!isPro) {
    return (
      <Card className="flex min-h-[340px] flex-col justify-between bg-black text-white border border-[#222222]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#C7F33C] uppercase tracking-wider">
            SENDLY PRO
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#C7F33C]">
            <Sparkles size={13} />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center my-4">
          <h3 className="text-[18px] font-semibold text-white leading-tight">
            {"7 kunlik PRO sinov muddati"}
          </h3>
          <p className="text-[11px] text-[#A0A0A0] mt-2 leading-relaxed">
            {"Barcha avtomatlashtirish oqimlari va ommaviy xabarlarni cheksiz yoqish uchun karta ma'lumotlarini bog'lang."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/account?tab=billing"
            className="w-full py-3 rounded-full text-[12px] font-bold text-[#1A2906] bg-[#C7F33C] hover:bg-[#9BC92E] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] text-center block"
          >
            <Sparkles size={13} />
            {"Sinov muddatini boshlash"}
          </Link>
          <span className="text-[9px] text-[#707070] text-center block">
            {"7 kunlik bepul sinov muddati davomida pul yechilmaydi."}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[340px] flex-col bg-white">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#707070]">
          {currentUser?.plan === "premium" ? "PREMIUM Tarif Faol" : "PRO Tarif Faol"}
        </span>
        <div className="rounded-full bg-[#C7F33C]/20 text-[#1A2906] px-2.5 py-0.5 text-[10px] font-semibold">
          {currentUser?.plan === "premium" ? "Premium" : "Trial"}
        </div>
      </div>

      <div className="relative my-4 flex-1 overflow-hidden rounded-[20px]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 38% 42%, #C7F33C 0%, #9BC92E 30%, #5A7C1E 70%, #1A2906 100%)",
          }}
        />
        {/* Floating bubbles */}
        <div
          className="absolute h-12 w-12 rounded-full animate-pulse"
          style={{ top: "15%", left: "65%", background: "radial-gradient(circle at 30% 30%, #E6FFA0, #9BC92E)", opacity: 0.8 }}
        />
        <div
          className="absolute h-7 w-7 rounded-full"
          style={{ top: "45%", left: "15%", background: "radial-gradient(circle at 30% 30%, #E6FFA0, #9BC92E)", opacity: 0.6 }}
        />
        <div
          className="absolute h-5 w-5 rounded-full"
          style={{ top: "60%", left: "80%", background: "radial-gradient(circle at 30% 30%, #E6FFA0, #9BC92E)", opacity: 0.7 }}
        />

        {/* Floating Glass Card Overlay */}
        <div className="bf-glass absolute bottom-3 left-3 right-3 rounded-[18px] p-3 flex gap-2 items-center justify-between shadow-sm">
          <div className="flex-1 bg-[#C7F33C] rounded-[12px] p-2 text-center">
            <div className="text-[14px] font-medium text-[#1A2906] leading-none">30-45</div>
            <div className="text-[9px] text-[#1A2906]/70 mt-0.5 leading-none">mijoz/kun</div>
          </div>
          <div className="flex-1 bg-black rounded-[12px] p-2 text-center">
            <div className="text-[14px] font-medium text-white leading-none">12-21</div>
            <div className="text-[9px] text-white/70 mt-0.5 leading-none">sotuv/kun</div>
          </div>
        </div>
      </div>

      <div>
        <div className="bf-tight text-[18px] font-semibold leading-none text-black">
          {"Muddati: " + currentUser?.trialExpiresAt}
        </div>
        <div className="mt-1.5 text-[11px] text-[#707070]">
          {"Karta: " + currentUser?.cardNumber} | {_value} runs
        </div>
      </div>
    </Card>
  );
}