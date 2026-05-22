"use client";

import { useState } from "react";
import { Check, Shield } from "lucide-react";

type MetaPage = {
  id: string;
  name: string;
  username: string;
  followers: string;
  avatarBg: string;
};

const MOCK_PAGES: MetaPage[] = [
  { id: "p1", name: "Sendly Shop", username: "sendly_shop", followers: "12,233", avatarBg: "from-[#f09433] via-[#e6683c] to-[#bc1888]" },
  { id: "p2", name: "My Brand Agency", username: "mybrand_official", followers: "4,820", avatarBg: "from-[#8a3ab9] via-[#bc1888] to-[#e95950]" },
  { id: "p3", name: "Fashion Loft Uzbekistan", username: "fashion_loft_uz", followers: "1,240", avatarBg: "from-[#405de6] via-[#5851db] to-[#833ab4]" },
];

export default function FacebookOAuthPage() {
  const [selectedPageId, setSelectedPageId] = useState<string>("p1");
  const [submitting, setSubmitting] = useState(false);

  const handleConnect = () => {
    const selected = MOCK_PAGES.find(p => p.id === selectedPageId);
    if (!selected) return;

    setSubmitting(true);
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "INSTAGRAM_CONNECTED",
            username: `@${selected.username}`,
            name: selected.name,
            followers: selected.followers
          },
          window.location.origin
        );
      }
      window.close();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans text-black">
      {/* Facebook OAuth Header */}
      <header className="bg-[#1877F2] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="font-semibold text-[16px] tracking-tight">Meta App Authorization</span>
        </div>
        <div className="text-[12px] opacity-80 flex items-center gap-1">
          <Shield size={13} />
          <span>Xavfsiz ulanish</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-[#E4E6EB] overflow-hidden">
          {/* Top Info Banner */}
          <div className="p-6 border-b border-[#E4E6EB] text-center">
            <div className="w-12 h-12 bg-[#F0F2F5] rounded-full flex items-center justify-center mx-auto text-[#1877F2] mb-3">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-bold text-[#1c1e21] leading-tight">
              Sendly ilovasiga ulanish
            </h2>
            <p className="text-[13px] text-[#606770] mt-2 max-w-[360px] mx-auto leading-normal">
              Sendly sizning Instagram Professional hisoblaringiz va ularga ulangan Facebook sahifalaringizni ko&apos;rishga ruxsat so&apos;ramoqda.
            </p>
          </div>

          {/* Account Selection */}
          <div className="p-6">
            <h3 className="text-[12px] font-bold text-[#65676B] uppercase tracking-wider mb-3">
              Ulash uchun Instagram Business / Creator hisobini tanlang:
            </h3>

            <div className="flex flex-col gap-2">
              {MOCK_PAGES.map((page) => {
                const isSelected = selectedPageId === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-[#1877F2] bg-[#E7F3FF]/30 ring-1 ring-[#1877F2]"
                        : "border-[#E4E6EB] hover:bg-[#F2F3F5]"
                    }`}
                  >
                    {/* Channel Avatar bubble style */}
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${page.avatarBg} p-[2px] shrink-0`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-[#1877F2] text-[15px]">
                        {page.name.charAt(0)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#1c1e21] text-[14px] leading-tight flex items-center gap-1.5">
                        {page.name}
                      </div>
                      <div className="text-[11px] text-[#606770] mt-0.5">
                        @{page.username} • {page.followers} obunachi
                      </div>
                    </div>

                    {/* Radio indicator */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-[#1877F2] bg-[#1877F2] text-white" : "border-[#CCD0D5]"
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scope info footer */}
            <div className="mt-5 text-[11px] text-[#65676B] leading-relaxed border-t border-[#E4E6EB] pt-4">
              Sendly sizning profilingizda post yoki story yozmaydi, faqat kelgan Direct xabarlariga avtomatik javob qaytarish uchun Meta API orqali integratsiya qilinadi.
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 py-4 bg-[#F0F2F5] border-t border-[#E4E6EB] flex justify-end gap-3">
            <button
              onClick={() => window.close()}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-[#4B4F56] hover:bg-[#E4E6EB] transition-colors disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleConnect}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-[13px] font-bold transition-all disabled:opacity-70 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Ulanmoqda...</span>
                </>
              ) : (
                <span>Ulanishni tasdiqlash</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
