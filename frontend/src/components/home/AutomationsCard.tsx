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
    <Card className="flex min-h-[250px] flex-col bg-white p-5 justify-between">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[13px] font-bold text-black uppercase tracking-wider">
          {"Faol avtomatlashtirishlar"}
        </span>
      </div>

      {automations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-[#707070] gap-1 p-4">
          <Sparkles size={20} className="stroke-1 opacity-50 text-[#C7F33C]" />
          <div className="text-[12px] font-bold text-black">{"Faol botlar yo'q"}</div>
          <p className="text-[10px] max-w-[200px] leading-tight">
            {"Tizimda hozircha hech qanday bot yaratilmagan."}
          </p>
        </div>
      ) : (
        <ul className="mt-2.5 flex flex-1 flex-col justify-start divide-y divide-[#F0F0F0] shrink-0">
          {automations.map((a, i) => {
            const isKeyword = a.triggerType === "keyword";
            const Icon = isKeyword ? Zap : MessageCircle;
            const bg = isKeyword ? "#C7F33C" : "#F0F0F0";
            const fg = isKeyword ? "#1A2906" : "#000000";

            return (
              <li
                key={a.id}
                className="flex items-center gap-2.5 py-1.5"
              >
                <div
                  className="grid h-8 w-8 place-items-center rounded-[10px] shrink-0"
                  style={{ background: bg, color: fg }}
                >
                  <Icon size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-black truncate">{a.name}</div>
                  <div className="text-[10px] text-[#707070] truncate">
                    {isKeyword ? "Kalit so'z" : "Story mention"}: {a.triggerDetails}
                  </div>
                </div>
                <div className="bf-tight text-[14px] font-bold text-black">
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