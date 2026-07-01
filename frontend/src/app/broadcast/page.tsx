"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BroadcastRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chats?tab=broadcast");
  }, [router]);
  return null;
}
