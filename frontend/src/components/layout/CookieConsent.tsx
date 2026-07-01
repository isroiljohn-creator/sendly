"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Shield, Settings, Check, X } from "lucide-react";

export function CookieConsent() {
  const { t } = useI18n();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Preference states
  const [analytical, setAnalytical] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    // Check if user already consented
    const consent = localStorage.getItem("sendly-cookie-consent");
    if (!consent) {
      // Show banner after a tiny delay for beautiful entry animation
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(consent);
        setAnalytical(parsed.analytical !== false);
        setMarketing(parsed.marketing !== false);
      } catch (e) {
        localStorage.removeItem("sendly-cookie-consent");
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsent = (preferences: { necessary: boolean; analytical: boolean; marketing: boolean }) => {
    localStorage.setItem("sendly-cookie-consent", JSON.stringify(preferences));
    // Also save in cookie for SSR readability
    const maxAge = 365 * 24 * 60 * 60; // 1 year
    document.cookie = `sendly-cookie-consent=${JSON.stringify(preferences)}; path=/; max-age=${maxAge}; SameSite=Lax;`;
    
    // Dispatch update event so any listeners (like analytics trackers) know immediately
    window.dispatchEvent(new Event("sendly-consent-updated"));
    
    setShowBanner(false);
    setShowModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, analytical: true, marketing: true });
  };

  const handleRejectAll = () => {
    saveConsent({ necessary: true, analytical: false, marketing: false });
  };

  const handleSaveSettings = () => {
    saveConsent({ necessary: true, analytical, marketing });
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Slide-in Cookie Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 max-w-md w-auto md:w-[420px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800/60 shadow-2xl rounded-[28px] p-6 animate-in slide-in-from-bottom-8 fade-in-50 duration-500 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7F33C]/20 dark:bg-[#C7F33C]/10 flex items-center justify-center text-[#7CA607] dark:text-[#C7F33C] shrink-0">
              <Shield size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h4 className="text-[14px] font-extrabold text-black dark:text-white">
                  {t("cookie_consent.banner_title") || "Biz cookie-fayllardan foydalanamiz"}
                </h4>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7F33C] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C7F33C]"></span>
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-[#707070] dark:text-neutral-400 font-medium">
                {t("cookie_consent.banner_text") || "Saytimiz ishlashini yaxshilash va tahliliy ma'lumotlarni yig'ish maqsadida kukilardan foydalanamiz."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <button
              onClick={handleAcceptAll}
              className="flex-1 min-w-[120px] bg-black dark:bg-white text-[#C7F33C] dark:text-black hover:opacity-90 font-extrabold text-[11px] px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-center whitespace-nowrap"
            >
              {t("cookie_consent.accept_all") || "Barchasiga ruxsat berish"}
            </button>
            <button
              onClick={handleRejectAll}
              className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white font-extrabold text-[11px] px-3.5 py-2.5 rounded-xl transition-all active:scale-95 text-center"
            >
              {t("cookie_consent.reject_all") || "Rad etish"}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="p-2.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[#707070] dark:text-neutral-400 rounded-xl transition-all active:scale-95 shrink-0 flex items-center justify-center"
              title={t("cookie_consent.settings") || "Sozlash"}
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Privacy Settings Preference Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-[32px] p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-[#7CA607] dark:text-[#C7F33C]" />
                <h3 className="text-[16px] font-extrabold text-black dark:text-white">
                  {t("cookie_consent.modal_title") || "Maxfiylik sozlamalari"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-[#707070] hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12px] leading-relaxed text-[#707070] dark:text-neutral-400 font-medium -mt-2">
              {t("cookie_consent.modal_desc") || "Saytimizda qaysi turdagi cookie-fayllardan foydalanishga ruxsat berishingizni tanlang."}
            </p>

            {/* Cookie Categories */}
            <div className="flex flex-col gap-4">
              {/* Category: Necessary */}
              <div className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100/50 dark:border-neutral-800/30 gap-4">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-[12.5px] font-extrabold text-black dark:text-white">
                    {t("cookie_consent.necessary_title") || "Zaruriy kuki-fayllar"}
                  </span>
                  <span className="text-[11px] text-[#707070] dark:text-neutral-400 leading-normal font-medium">
                    {t("cookie_consent.necessary_desc") || "Tizim ishlashi uchun zarur va ularni o'chirib bo'lmaydi."}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-[#7CA607] dark:text-[#C7F33C] bg-[#C7F33C]/20 dark:bg-[#C7F33C]/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                  {t("cookie_consent.always_active") || "Doim faol"}
                </span>
              </div>

              {/* Category: Analytical */}
              <div className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100/50 dark:border-neutral-800/30 gap-4">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-[12.5px] font-extrabold text-black dark:text-white">
                    {t("cookie_consent.analytical_title") || "Tahliliy kuki-fayllar"}
                  </span>
                  <span className="text-[11px] text-[#707070] dark:text-neutral-400 leading-normal font-medium">
                    {t("cookie_consent.analytical_desc") || "Tizim samaradorligi va xatoliklarni tahlil qilish uchun ishlatiladi."}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={analytical}
                    onChange={(e) => setAnalytical(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white"></div>
                </label>
              </div>

              {/* Category: Marketing */}
              <div className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100/50 dark:border-neutral-800/30 gap-4">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-[12.5px] font-extrabold text-black dark:text-white">
                    {t("cookie_consent.marketing_title") || "Marketing kuki-fayllari"}
                  </span>
                  <span className="text-[11px] text-[#707070] dark:text-neutral-400 leading-normal font-medium">
                    {t("cookie_consent.marketing_desc") || "Tashqi integratsiyalar va reklama tizimlari uchun ishlatiladi."}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-[11.5px] font-bold text-[#595959] dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all active:scale-95"
              >
                {t("common.cancel") || "Bekor qilish"}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 text-[11.5px] font-extrabold bg-black dark:bg-white text-[#C7F33C] dark:text-black hover:opacity-90 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <Check size={14} />
                <span>{t("cookie_consent.save_settings") || "Sozlamalarni saqlash"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
