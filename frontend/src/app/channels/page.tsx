"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChannelsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#E8E8E8] text-black">
      Yuklanmoqda...
    </div>
  );
}
