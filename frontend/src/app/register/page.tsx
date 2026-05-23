"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/I18nProvider";
import { ChevronDown, AlertCircle, Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";
import { db } from "@/lib/db";

export default function RegisterPage() {
  const { t, lang, setLang } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // OTP Verification States
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [enteredOtp, setEnteredOtp] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [showNotification, setShowNotification] = useState(false);

  // Google Sign-Up Popup States
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  const cycleLang = () => {
    const order: Lang[] = ["uz", "ru", "en"];
    setLang(order[(order.indexOf(lang) + 1) % order.length]);
  };

  const LANG_FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVerifyingEmail && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isVerifyingEmail, countdown]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Verify email uniqueness first
    const checkRes = db.signUp(fullName, email, password);
    if (checkRes.success) {
      // Generate OTP and transition to verification screen
      const code = db.generateOtp(email);
      setOtpCode(code);
      setIsVerifyingEmail(true);
      setCountdown(120);
      setEnteredOtp(["", "", "", ""]);
      setShowNotification(true);
      // Auto-hide OTP notification after 15 seconds
      setTimeout(() => setShowNotification(false), 15000);
    } else {
      setError(checkRes.error || "Ro'yxatdan o'tishda xatolik yuz berdi.");
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const codeString = enteredOtp.join("");

    if (db.verifyOtp(email, codeString)) {
      // OTP verified successfully, complete the registration
      const res = db.completeSignUp(fullName, email, password);
      if (res.success) {
        window.location.href = "/";
      } else {
        setError(res.error || "Akkaunt yaratishda xatolik yuz berdi.");
      }
    } else {
      setError("Tasdiqlash kodi noto'g'ri. Qayta urinib ko'ring.");
    }
  };

  const handleResendOtp = () => {
    setError("");
    const code = db.generateOtp(email);
    setOtpCode(code);
    setCountdown(120);
    setEnteredOtp(["", "", "", ""]);
    setShowNotification(true);
  };

  const handleGoogleAccountSelect = (selectedEmail: string, selectedName: string) => {
    const res = db.googleSignIn(selectedEmail, selectedName);
    if (res.success) {
      setIsGooglePopupOpen(false);
      window.location.href = "/";
    } else {
      setError(res.error || "Google orqali ro'yxatdan o'tishda xatolik.");
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail || !customGoogleName) {
      setError("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }
    handleGoogleAccountSelect(customGoogleEmail, customGoogleName);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.charAt(val.length - 1);
    const newOtp = [...enteredOtp];
    newOtp[index] = val;
    setEnteredOtp(newOtp);

    // Automatically focus next input
    if (val && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !enteredOtp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#070708] p-6 selection:bg-[#C7F33C] selection:text-[#070708]">
      
      {/* Background glow highlights */}
      <div className="absolute top-[15%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-[#C7F33C]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

      {/* Floating OTP Notification */}
      {showNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-[380px] rounded-2xl bg-white border border-[#D8D8D8] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3 text-black">
            <div className="mt-0.5 rounded-full bg-[#C7F33C] p-1.5 text-black">
              <Sparkles size={16} className="fill-black/10" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[12px] font-bold block leading-none">{"Sendly.uz — Tasdiqlash Kodi"}</span>
              <p className="text-[11.5px] text-[#555] mt-1.5">
                {"Sinov rejimi uchun tasdiqlash kodi elektron pochtangizga yuborildi:"}
              </p>
              <div className="mt-3 flex items-center justify-between bg-[#F5F5F3] px-3.5 py-2 rounded-xl border border-[#E8E8E8]">
                <span className="text-[16px] font-mono font-bold tracking-widest text-[#1A2906]">{otpCode}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(otpCode);
                    setShowNotification(false);
                  }}
                  className="text-[11px] font-semibold text-[#1A2906] hover:underline"
                >
                  {"Nusxalash 📋"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Switcher */}
      <div className="absolute right-6 top-6 z-20">
        <button
          onClick={cycleLang}
          className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3.5 py-2 text-[12px] font-semibold text-white transition-all duration-150 active:scale-95 hover:bg-white/10 shadow-sm"
        >
          <span>{LANG_FLAGS[lang]}</span>
          <span className="uppercase">{lang}</span>
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Main Form Box */}
      <Card className="w-full max-w-[420px] bg-[#0C0C0E] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-8 z-10 rounded-[28px]">
        
        <div className="flex flex-col items-center text-center">
          <div className="grid h-[52px] w-[52px] place-items-center rounded-[18px] bg-[#C7F33C] text-black shadow-[0_0_20px_rgba(199,243,60,0.2)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-black">
              <path
                d="M13.5 2c.3 3.5-1.5 5.2-3 6.8C9 10.5 7.5 12 8 14.5 8.4 16.7 10 18 12 18c0-2 .8-3 2-4.2 1.4-1.4 3-3 2.6-6C16.2 5 14.8 3.3 13.5 2Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-[26px] font-extrabold text-white tracking-tight">
            {"Sendly"}<span className="text-[#C7F33C]">{".uz"}</span>
          </h2>
          <p className="mt-1 text-[13px] text-[#A0A0A5]">
            {isVerifyingEmail ? "Pochtani tasdiqlash" : t("forms.register")}
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-[12px] text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Fill Registration info */}
        {!isVerifyingEmail && (
          <>
            <form onSubmit={handleRegisterSubmit} className="mt-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#A0A0A5] px-1 text-left">
                  {"Ism va Familiya"}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707075]"><UserIcon size={16} /></span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#141416] border border-white/5 pl-11 pr-4 py-3 text-[13px] text-white outline-none placeholder:text-[#555] transition-all focus:border-[#C7F33C] focus:bg-[#1A1A1E]"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#A0A0A5] px-1 text-left">
                  {t("forms.email")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707075]"><Mail size={16} /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#141416] border border-white/5 pl-11 pr-4 py-3 text-[13px] text-white outline-none placeholder:text-[#555] transition-all focus:border-[#C7F33C] focus:bg-[#1A1A1E]"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#A0A0A5] px-1 text-left">
                  {t("forms.password")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707075]"><Lock size={16} /></span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#141416] border border-white/5 pl-11 pr-4 py-3 text-[13px] text-white outline-none placeholder:text-[#555] transition-all focus:border-[#C7F33C] focus:bg-[#1A1A1E]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-full bg-[#C7F33C] text-black font-bold py-3.5 text-[13.5px] transition-all active:scale-[0.98] hover:bg-[#b5e02f]"
              >
                {t("forms.register")}
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <hr className="w-full border-white/5" />
              <span className="absolute bg-[#0C0C0E] px-3.5 text-[11px] font-semibold text-[#555] uppercase tracking-wider">{"Yoki"}</span>
            </div>

            {/* Google OAuth Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsGooglePopupOpen(true);
              }}
              className="w-full rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 text-[13.5px] transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>{"Google orqali ro'yxatdan o'tish"}</span>
            </button>

            <div className="mt-7 text-center text-[12px] text-[#A0A0A5]">
              {t("forms.has_account")}{" "}
              <Link href="/login" className="font-semibold text-white hover:text-[#C7F33C] hover:underline">
                {t("forms.login")}
              </Link>
            </div>
          </>
        )}

        {/* STEP 2: Verify OTP code */}
        {isVerifyingEmail && (
          <form onSubmit={handleOtpVerify} className="mt-6 flex flex-col gap-6">
            <div className="text-center">
              <p className="text-[12px] text-[#A0A0A5] leading-relaxed">
                {"Tasdiqlash kodi yuborilgan manzil:"} <br />
                <span className="font-semibold text-white text-[13px]">{email}</span>
              </p>
            </div>

            {/* OTP Input Fields */}
            <div className="flex justify-center gap-3">
              {enteredOtp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="h-14 w-12 rounded-[14px] bg-[#141416] border border-white/5 text-center text-[20px] font-bold text-white outline-none focus:border-[#C7F33C] focus:bg-[#1A1A1E] transition-all"
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button type="submit" variant="accent" className="w-full py-3.5">
                {"Kodni tasdiqlash 🔐"}
              </Button>

              <div className="text-[12px] text-[#A0A0A5]">
                {countdown > 0 ? (
                  <span>{"Kodni qayta yuborish: "}<span className="text-[#C7F33C] font-mono">{formatTime(countdown)}</span></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-bold text-[#C7F33C] hover:underline transition-all"
                  >
                    {"Kodni qayta yuborish 🔄"}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsVerifyingEmail(false);
                  setError("");
                }}
                className="text-[12px] text-[#707075] hover:text-white transition-all font-medium"
              >
                {"Ma'lumotlarni o'zgartirish ⬅️"}
              </button>
            </div>
          </form>
        )}

      </Card>

      {/* Simulated Google OAuth Dialog / Popup */}
      {isGooglePopupOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-[6px] p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-7 text-black shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-[#E8E8E8] animate-in zoom-in-95 duration-200 relative overflow-hidden">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsGooglePopupOpen(false);
                setShowCustomGoogleInput(false);
              }}
              className="absolute right-5 top-5 text-[#707075] hover:text-black transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Google Icon Banner */}
            <div className="flex flex-col items-center text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <h3 className="mt-3 text-[17px] font-bold text-black">{"Google orqali ro'yxatdan o'tish"}</h3>
              <p className="text-[12px] text-[#707075] mt-1">{"Sendly.uz ilovasida davom etish uchun"}</p>
            </div>

            {/* Account List */}
            {!showCustomGoogleInput ? (
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => handleGoogleAccountSelect("isroiljon@gmail.com", "Isroiljon Tursunov")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#F5F5F3] transition-colors text-left border border-transparent hover:border-[#E8E8E8]"
                >
                  <div className="h-9 w-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[13px] font-mono shadow-sm">
                    {"IT"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-black">{"Isroiljon Tursunov"}</span>
                    <span className="text-[11.5px] text-[#707075]">{"isroiljon@gmail.com"}</span>
                  </div>
                </button>

                <button
                  onClick={() => handleGoogleAccountSelect("mently@gmail.com", "Mently AI Team")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#F5F5F3] transition-colors text-left border border-transparent hover:border-[#E8E8E8]"
                >
                  <div className="h-9 w-9 rounded-full bg-[#C7F33C] text-black flex items-center justify-center font-bold text-[13px] font-mono shadow-sm">
                    {"MA"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-black">{"Mently AI Team"}</span>
                    <span className="text-[11.5px] text-[#707075]">{"mently@gmail.com"}</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowCustomGoogleInput(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-[#F5F5F3] transition-colors text-left border border-transparent hover:border-[#E8E8E8] text-[12.5px] font-semibold text-[#4285F4]"
                >
                  <span className="w-9 text-center font-bold text-[18px]">{"＋"}</span>
                  <span>{"Boshqa hisobdan foydalanish"}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomGoogleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-[#707075] px-1 text-left">{"F.I.SH."}</label>
                  <input
                    type="text"
                    required
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Masalan: Sardorbek Alimov"
                    className="w-full rounded-xl bg-[#F0F0F0] px-3.5 py-2.5 text-[12.5px] text-black outline-none border border-[#E8E8E8] focus:border-[#4285F4] focus:bg-white transition-all placeholder:text-[#a0a0a0]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-[#707075] px-1 text-left">{"Elektron pochta (Gmail)"}</label>
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full rounded-xl bg-[#F0F0F0] px-3.5 py-2.5 text-[12.5px] text-black outline-none border border-[#E8E8E8] focus:border-[#4285F4] focus:bg-white transition-all placeholder:text-[#a0a0a0]"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(false)}
                    className="flex-1 rounded-full bg-[#F0F0F0] text-black text-[12px] font-semibold py-2.5 transition-all hover:bg-[#e8e8e8]"
                  >
                    {"Orqaga"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-[#4285F4] text-white text-[12px] font-semibold py-2.5 transition-all hover:bg-[#3574de]"
                  >
                    {"Ro'yxatdan o'tish"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 text-[11px] text-[#707075] text-left leading-relaxed">
              {"Sendly ro'yxatdan o'tishni osonlashtirish uchun sizning ismingiz, pochtangiz va profil rasmingizni oladi. Maxfiylik kelishuviga rioya etiladi."}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
