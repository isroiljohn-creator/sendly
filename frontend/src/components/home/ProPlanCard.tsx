"use client";

import Link from "next/link";
import { Zap, Plus, Settings } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";

export function ProPlanCard({ hasChannels = false }: { hasChannels?: boolean; value?: string }) {
  const { t } = useI18n();

  if (!hasChannels) {
    return (
      <Card className="flex min-h-[250px] flex-col justify-between bg-black text-white border border-[#222222] p-5">
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold text-[#C7F33C] uppercase tracking-wider">
            {t("pages.home.try_badge")}
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#C7F33C]">
            <Plus size={13} />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center my-1.5">
          <h3 className="text-[18px] font-bold text-white leading-tight">
            {t("pages.home.connect_card_title")}
          </h3>
          <p className="text-[11px] text-[#A0A0A0] mt-1 leading-relaxed">
            {t("pages.home.connect_card_desc")}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-auto shrink-0">
          <button
            onClick={() => window.dispatchEvent(new Event("replai-open-connect-modal"))}
            className="w-full py-2.5 rounded-full text-[12px] font-bold text-black bg-[#C7F33C] hover:bg-[#9BC92E] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-center"
          >
            <Plus size={14} />
            <span>{t("pages.home.connect_card_btn")}</span>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[250px] flex-col justify-between bg-black text-white border border-[#222222] p-5">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[12px] font-semibold text-[#C7F33C] uppercase tracking-wider">
          {t("pages.home.chatbot_service_badge")}
        </span>
        <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#C7F33C]">
          <Zap size={13} fill="#C7F33C" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center my-1.5">
        <h3 className="text-[18px] font-bold text-white leading-tight">
          {t("pages.home.setup_chatbot_title")}
        </h3>
        <p className="text-[11px] text-[#A0A0A0] mt-1 leading-relaxed">
          {t("pages.home.setup_chatbot_desc")}
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-auto shrink-0">
        <Link
          href="/automations"
          className="w-full py-2.5 rounded-full text-[12px] font-bold text-black bg-[#C7F33C] hover:bg-[#9BC92E] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-center block"
        >
          <Settings size={14} />
          <span>{t("pages.home.setup_automations_btn")}</span>
        </Link>
      </div>
    </Card>
  );
}