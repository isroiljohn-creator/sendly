"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { db } from "@/lib/db";

export function AppLayout({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      window.location.href = "/login";
    } else {
      setAuthorized(true);
    }
  }, []);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#E8E8E8] text-black">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#E8E8E8] px-6 py-4">
      <div className="flex w-full gap-4">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TopBar />
          {children}
        </div>
      </div>
    </div>
  );
}