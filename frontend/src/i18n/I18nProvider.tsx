"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";
import { db } from "@/lib/db";

export type Lang = "uz" | "ru" | "en";

const translations = { uz, ru, en };

type TranslationData = typeof uz;

// Helper types for dotted path resolution
type Join<K, P> = K extends string | number ?
  P extends string | number ?
    `${K}${"" extends P ? "" : "."}${P}`
    : never
  : never;

type Prev = [never, 0, 1, 2, 3, 4, ...never[]];

type Paths<T, D extends number = 5> = [D] extends [never] ? never : T extends object ?
  { [K in keyof T]-?: K extends string | number ?
      `${K}` | Join<K, Paths<T[K], Prev[D]>>
      : never
  }[keyof T] : "";

export type TKey = Paths<TranslationData>;

const DAYS: Record<Lang, string[]> = {
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  days: string[];
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz");

  useEffect(() => {
    const saved = localStorage.getItem("replai-lang") as Lang | null;
    if (saved && (saved === "uz" || saved === "ru" || saved === "en")) {
      setLangState(saved);
    }
    db.fetchFromServer();
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("replai-lang", l);
  };

  const t = (key: string): string => {
    const dict = translations[lang] || translations.uz;
    const parts = key.split(".");
    let current: unknown = dict;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        // Fallback to uz
        let fallback: unknown = translations.uz;
        for (const fbPart of parts) {
          if (fallback && typeof fallback === "object" && fbPart in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbPart];
          } else {
            return key;
          }
        }
        return typeof fallback === "string" ? fallback : key;
      }
    }
    return typeof current === "string" ? current : key;
  };

  const days = DAYS[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, t, days }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
