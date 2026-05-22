"use client";

import { useState, useEffect } from "react";
import { Zap, MessageCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import type { Automation } from "@/lib/db";

export function AutomationsCard() {
  const [automations, setAutomations] = useState<Automation[]>([]);

  useEffect(() => {
    const activeCh = db.getActiveChannel();
    if (activeCh) {
      setAutomations(db.getChannelAutomations(activeCh.id).slice(0, 4));
    } else {
      setAutomations([]);
    }
  }, []);

  return (
    <Card className="flex min-h-[340px] flex-col bg-white">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-black">
          {"Faol avtomatlashtirishlar"}
        </span>
      </div>

      {automations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-[#707070] gap-2 p-6">
          <Sparkles size={24} className="stroke-1 opacity-50 text-[#C7F33C]" />
          <div className="text-[13px] font-medium text-black">{"Faol botlar yo'q"}</div>
          <p className="text-[11px] max-w-[200px]">
            {"Tizimda hozircha hech qanday bot yaratilmagan."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col">
          {automations.map((a, i) => {
            const isKeyword = a.triggerType === "keyword";
            const Icon = isKeyword ? Zap : MessageCircle;
            const bg = isKeyword ? "#C7F33C" : "#F0F0F0";
            const fg = isKeyword ? "#1A2906" : "#000000";

            return (
              <li
                key={a.id}
                className={[
                  "flex items-center gap-3 py-3",
                  i !== automations.length - 1 ? "border-b border-[#F0F0F0]" : "",
                ].join(" ")}
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-[14px] shrink-0"
                  style={{ background: bg, color: fg }}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-black">{a.name}</div>
                  <div className="text-[11px] text-[#707070]">
                    {isKeyword ? "Kalit so'z" : "Story mention"}: {a.triggerDetails}
                  </div>
                </div>
                <div className="bf-tight text-[18px] font-medium text-black">
                  {a.runs}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}