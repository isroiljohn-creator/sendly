"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContactsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chats?tab=contacts");
  }, [router]);
  return null;
}
