"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/I18nProvider";
import { ChevronDown, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const cycleLang = () => {
    const order: Lang[] = ["uz", "ru", "en"];
    setLang(order[(order.indexOf(lang) + 1) % order.length]);
  };

  const LANG_FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = db.signIn(email, password);
    if (res.success) {
      window.location.href = "/";
    } else {
      setError(res.error || "Xatolik yuz berdi.");
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#E8E8E8] p-6">
      {/* Language Switcher */}
      <div className="absolute right-6 top-6">
        <button
          onClick={cycleLang}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-medium text-black transition-all duration-150 active:scale-95 shadow-sm"
        >
          <span>{LANG_FLAGS[lang]}</span>
          <span className="uppercase">{lang}</span>
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-[400px] shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-[48px] w-[48px] place-items-center rounded-[16px] bg-black">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M13.5 2c.3 3.5-1.5 5.2-3 6.8C9 10.5 7.5 12 8 14.5 8.4 16.7 10 18 12 18c0-2 .8-3 2-4.2 1.4-1.4 3-3 2.6-6C16.2 5 14.8 3.3 13.5 2Z"
                fill="#C7F33C"
              />
              <path
                d="M9.5 14c-.6 1-1 2-1 3 0 2.5 1.6 4 3.5 4s3.5-1.5 3.5-4c0-1-.4-2-1-3-.3 1.5-1.2 2.3-2.5 2.3S9.8 15.5 9.5 14Z"
                fill="#9BC92E"
              />
            </svg>
          </div>
          <h2 className="bf-tight mt-4 text-[24px] font-medium text-black">
            Sendly
          </h2>
          <p className="mt-1 text-[13px] text-[#707070]">
            {t("forms.login")}
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-[12px] text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[#707070] px-1">
              {t("forms.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
              placeholder="example@mail.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[#707070] px-1">
              {t("forms.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" variant="primary" className="mt-2 w-full py-3.5">
            {t("forms.login")}
          </Button>
        </form>

        <div className="mt-6 text-center text-[12px] text-[#707070]">
          {t("forms.no_account")}{" "}
          <Link href="/register" className="font-medium text-black hover:underline">
            {t("forms.register")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
