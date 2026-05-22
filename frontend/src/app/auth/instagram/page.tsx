"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function InstagramOAuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"login" | "authorize">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Foydalanuvchi nomi yoki telefon raqamini kiriting");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (password.toLowerCase() === "xato" || password.toLowerCase() === "wrong") {
      setError("Kiritilgan parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
      return;
    }

    setError("");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep("authorize");
    }, 1000);
  };

  const handleAuthorize = () => {
    setSubmitting(true);
    setTimeout(() => {
      if (window.opener) {
        // Format the username: ensure it starts with @
        const formattedUsername = username.startsWith("@") ? username : `@${username}`;
        // Create mock displayName: capitalize parts of username
        const cleanUser = username.replace("@", "");
        const displayName = cleanUser
          .split(/[._-]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        window.opener.postMessage(
          {
            type: "INSTAGRAM_CONNECTED",
            username: formattedUsername,
            name: displayName || "Instagram Creator",
            followers: "15,840", // realistic default mock followers count
          },
          window.location.origin
        );
      }
      window.close();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black justify-between">
      {/* Top Security Banner */}
      <header className="bg-white border-b border-[#E6E6E6] px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px] tracking-tight bg-gradient-to-r from-[#f09433] via-[#bc1888] to-[#e6683c] bg-clip-text text-transparent">
            Instagram API Connection
          </span>
        </div>
        <div className="text-[11px] text-[#707070] flex items-center gap-1 bg-[#F5F5F5] px-2.5 py-1 rounded-full">
          <Shield size={12} className="text-[#0095f6]" />
          <span className="font-medium text-black">Xavfsiz Meta ulanishi</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {step === "login" ? (
          <div className="w-full max-w-[350px] bg-white rounded-md border border-[#DBDBDB] p-8 flex flex-col gap-6 shadow-sm">
            {/* Instagram Text Logo */}
            <div className="flex justify-center my-2">
              <h1 className="font-serif text-[32px] italic font-semibold tracking-wide select-none">
                Instagram
              </h1>
            </div>

            <p className="text-[12px] text-[#8E8E8E] text-center leading-normal">
              Sendly ilovasiga Instagram Direct xabarlarini boshqarish uchun ruxsat berish maqsadida profilingizga kiring.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
              <strong>💡 Xavfsizlik eslatmasi:</strong> Real tizimda bu oyna rasmiy <code>instagram.com</code> saytida ochiladi. {"Biz sizning parolingizni hech qachon ko'rmaymiz."}
              <br />
              <span className="mt-1 block text-amber-700">
                {"(Test rejimida noto'g'ri parolni sinash uchun parol maydoniga "}<code>xato</code>{" yoki "}<code>wrong</code>{" deb yozing.)"}
              </span>
            </div>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg text-red-600 text-[11px] flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Foydalanuvchi nomi, telefon yoki email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#DBDBDB] rounded text-[12px] focus:outline-none focus:border-[#a8a8a8] text-black transition-colors"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Parol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#DBDBDB] rounded text-[12px] focus:outline-none focus:border-[#a8a8a8] text-black pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-black"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2 bg-[#0095f6] hover:bg-[#1877f2] disabled:bg-[#0095f6]/50 text-white rounded text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Kirilmoqda...</span>
                  </>
                ) : (
                  <span>Tizimga kirish</span>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 text-[11px] text-[#8E8E8E]">
              <span className="h-[1px] bg-[#DBDBDB] flex-1"></span>
              <span>yoki</span>
              <span className="h-[1px] bg-[#DBDBDB] flex-1"></span>
            </div>

            <div className="text-center">
              <p className="text-[11px] text-[#385185] font-semibold hover:underline cursor-pointer">
                Facebook orqali kirish
              </p>
            </div>
          </div>
        ) : (
          /* Authorization Screen */
          <div className="w-full max-w-[400px] bg-white rounded-2xl border border-[#DBDBDB] overflow-hidden shadow-md">
            <div className="p-6 border-b border-[#EFEFEF] text-center">
              <div className="w-14 h-14 bg-gradient-to-tr from-[#f09433] via-[#bc1888] to-[#e6683c] rounded-full flex items-center justify-center mx-auto text-white shadow-md mb-3">
                <span className="font-bold text-[18px]">S</span>
              </div>
              <h2 className="text-[16px] font-bold text-[#262626] leading-tight">
                Sendly ilovasiga ruxsat berish
              </h2>
              <p className="text-[12px] text-[#8E8E8E] mt-2 leading-relaxed">
                Foydalanuvchi: <span className="font-semibold text-black">{username}</span>
              </p>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <h3 className="text-[12px] font-bold text-[#262626] tracking-wide">
                SENDLY QUYIDAGI MA&apos;LUMOTLARNI SO&apos;RAMOQDA:
              </h3>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAF5FF] flex items-center justify-center shrink-0 text-[#0095f6] font-bold text-[11px]">
                    1
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-black leading-none">Profil ma&apos;lumotlari</h4>
                    <p className="text-[11px] text-[#8E8E8E] mt-1 leading-normal">
                      Foydalanuvchi nomi, profil turi va hisobingizdagi umumiy statistikalar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAF5FF] flex items-center justify-center shrink-0 text-[#0095f6] font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-black leading-none">Direct xabarlarni boshqarish</h4>
                    <p className="text-[11px] text-[#8E8E8E] mt-1 leading-normal">
                      Kelgan xabarlarni o&apos;qish, yangi xabarlar yuborish va avtomatik javoblar zanjirini ishga tushirish.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-[#8E8E8E] leading-relaxed border-t border-[#EFEFEF] pt-4 mt-2">
                Ruxsat berish orqali siz Sendly Xizmat ko&apos;rsatish shartlari va Maxfiylik siyosatiga rozilik bildirasiz.
              </p>
            </div>

            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#EFEFEF] flex justify-end gap-3">
              <button
                onClick={() => setStep("login")}
                disabled={submitting}
                className="px-4 py-2 rounded text-[12px] font-semibold text-[#262626] hover:bg-[#EFEFEF] transition-colors disabled:opacity-50"
              >
                Orqaga
              </button>
              <button
                onClick={handleAuthorize}
                disabled={submitting}
                className="px-5 py-2 rounded bg-[#0095f6] hover:bg-[#1877f2] text-white text-[12px] font-semibold transition-all disabled:opacity-75 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ulanmoqda...</span>
                  </>
                ) : (
                  <span>Ruxsat berish</span>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-[#8E8E8E] text-[11px] border-t border-[#EFEFEF] bg-white">
        © 2026 Sendly • Meta Business Partner
      </footer>
    </div>
  );
}
