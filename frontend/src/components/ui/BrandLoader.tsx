"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { Zap } from "lucide-react";

interface BrandLoaderProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function BrandLoader({ text, fullScreen = false, className = "" }: BrandLoaderProps) {
  const { t } = useI18n();
  const loadingText = text || t("common.loading");

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center gap-5 ${className}`}>
      <div className="relative flex items-center justify-center h-24 w-24">
        {/* Outer glowing pulsing aura */}
        <div className="absolute h-20 w-20 rounded-[24px] bg-[#C7F33C]/20 blur-md animate-pulse" />
        
        {/* Outer spinning dash/gradient ring */}
        <div className="absolute h-20 w-20 rounded-full border-2 border-dashed border-[#C7F33C]/40 border-t-[#C7F33C] animate-spin [animation-duration:1.5s]" />
        
        {/* Pulsing ring */}
        <div className="absolute h-16 w-16 rounded-full border border-[#C7F33C]/25 animate-ping [animation-duration:2s]" />

        {/* Sendly Logo Container */}
        <div className="relative z-10 grid h-12 w-12 place-items-center rounded-[16px] bg-[#C7F33C] text-black shadow-[0_0_20px_rgba(199,243,60,0.4)]">
          <Zap size={22} className="fill-black text-black animate-pulse" />
        </div>
      </div>
      
      <p className="text-[12px] font-bold text-[#707070] tracking-wider uppercase animate-pulse">
        {loadingText}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#E8E8E8] text-black overflow-hidden select-none">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}
