import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import Script from "next/script";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { ErrorTrackerInitializer } from "@/lib/errorTracker";
import { CookieConsent } from "@/components/layout/CookieConsent";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});

const translations = {
  uz: {
    title: "Sendly — Instagram chatbot va avtomatlashtirish",
    description: "O'zbekiston bozori uchun Instagram chatbot va savdoni avtomatlashtirish platformasi.",
  },
  en: {
    title: "Sendly — Instagram chatbot and automation",
    description: "Instagram chatbot and sales automation platform for the Uzbekistan market.",
  },
  ru: {
    title: "Sendly — Instagram чат-бот и автоматизация",
    description: "Платформа для Instagram чат-ботов и автоматизации продаж на рынке Узбекистана.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = cookies();
  const lang = (cookieStore.get("replai-lang")?.value || "uz") as "uz" | "ru" | "en";
  const t = translations[lang] || translations.uz;
  return {
    title: t.title,
    description: t.description,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const lang = cookieStore.get("replai-lang")?.value || "uz";

  return (
    <html lang={lang}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Script id="error-tracking" strategy="afterInteractive">{`
  window.addEventListener('error', function(e) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ type: 'js_error', message: e.message, filename: e.filename, lineno: e.lineno })
    }).catch(function() {});
  });
  window.addEventListener('unhandledrejection', function(e) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ type: 'promise_rejection', message: e.reason?.message || String(e.reason) })
    }).catch(function() {});
  });
`}</Script>
        <ErrorTrackerInitializer />
        <I18nProvider>
          {children}
          <CookieConsent />
          <Toaster />
        </I18nProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      </body>
    </html>
  );
}
