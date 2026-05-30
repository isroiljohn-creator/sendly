"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ConnectChannelModal } from "./ConnectChannelModal";
import { SupportWidget } from "./SupportWidget";
import { db } from "@/lib/db";

export function AppLayout({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [impersonatorEmail, setImpersonatorEmail] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      window.location.href = "/login";
    } else {
      setAuthorized(true);
      
      if (typeof window !== "undefined") {
        const imp = localStorage.getItem("replai_admin_impersonator");
        if (imp) {
          setImpersonatorEmail(imp);
        }
      }
      
      // Fetch global announcement banner
      fetch("/api/admin")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.systemAnnouncement) {
            setAnnouncement(data.systemAnnouncement);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, []);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#E8E8E8] text-black font-bold">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#E8E8E8] px-6 py-4 flex flex-col gap-4 overflow-hidden">
      {impersonatorEmail && (
        <div className="w-full bg-blue-600 text-white px-6 py-3 rounded-[16px] flex justify-between items-center animate-in slide-in-from-top duration-300 shadow-sm relative overflow-hidden shrink-0">
          <div className="flex items-center gap-2.5 text-[12px] font-bold">
            <span>👤</span>
            <span>Siz hozirda &lt;{db.getCurrentUser()?.email}&gt; nomidan tizimdadasiz.</span>
          </div>
          <button 
            onClick={() => {
              const res = db.stopImpersonating();
              if (res.success) {
                window.location.href = "/admin";
              }
            }}
            className="bg-white text-blue-600 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
          >
            Admin hisobiga qaytish
          </button>
        </div>
      )}

      {announcement && !dismissed && (
        <div className="w-full bg-[#C7F33C] text-[#1A2906] px-6 py-3.5 rounded-[16px] border border-[#1A2906]/10 flex justify-between items-center animate-in slide-in-from-top duration-300 shadow-sm relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#9BC92E]" />
          <div className="flex items-center gap-2.5 text-[12.5px] font-black text-black">
            <span className="text-[14px]">📢</span>
            <span>{announcement}</span>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="text-black/60 hover:text-black font-black text-[14px] leading-none p-1.5 hover:bg-black/5 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex w-full flex-1 gap-4 overflow-hidden min-h-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4 h-full">
          <TopBar />
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {children}
          </div>
        </div>
      </div>
      <ConnectChannelModal />
      <SupportWidget />
    </div>
  );
}