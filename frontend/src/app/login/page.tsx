"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/I18nProvider";
import { ChevronDown, AlertCircle, Mail, Lock, Sparkles } from "lucide-react";
import { db } from "@/lib/db";

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // OTP Verification States
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [enteredOtp, setEnteredOtp] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [showNotification, setShowNotification] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Google Login States
  const [hasGoogleClientId, setHasGoogleClientId] = useState(true);

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

  // Initialize Google Sign-In SDK
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "264359774796-evi6c5vtntv2c895go2uqbb8k4oieosl.apps.googleusercontent.com";
    if (!clientId) {
      setHasGoogleClientId(false);
      return;
    }
    setHasGoogleClientId(true);

    const initGoogle = () => {
      if (typeof window !== "undefined") {
        const win = window as unknown as {
          google?: {
            accounts: {
              id: {
                initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
                renderButton: (parent: HTMLElement | null, options: { theme?: string; size?: string; width?: number; shape?: string; text?: string; locale?: string }) => void;
              };
            };
          };
        };

        if (win.google) {
          win.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
          });
          win.google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "outline", size: "large", width: 356, shape: "pill", text: "signin_with", locale: lang }
          );
        }
      }
    };

    const checkInterval = setInterval(() => {
      if (typeof window !== "undefined") {
        const win = window as unknown as { google?: object };
        if (win.google) {
          initGoogle();
          clearInterval(checkInterval);
        }
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [lang]);

  const handleGoogleCredentialResponse = (response: { credential: string }) => {
    setError("");
    try {
      const token = response.credential;
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      
      const res = db.googleSignIn(payload.email, payload.name);
      if (res.success) {
        window.location.href = "/";
      } else {
        setError(res.error || t("pages.login_page.error_google_auth"));
      }
    } catch (err) {
      console.error("Failed to decode Google ID Token:", err);
      setError(t("pages.login_page.error_google_token"));
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsFallbackMode(false);
    
    // Check password correctness
    const checkRes = db.signIn(email, password);
    if (checkRes.success) {
      const code = db.generateOtp(email);
      setOtpCode(code);
      
      // Request real SMTP sending
      try {
        const mailRes = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: code }),
        });
        
        const mailData = await mailRes.json();
        
        if (mailRes.ok && mailData.success) {
          setIsVerifyingEmail(true);
          setCountdown(120);
          setEnteredOtp(["", "", "", ""]);
          setShowNotification(false);
        } else {
          // If SMTP variables are missing, fallback to simulator with warning
          if (mailRes.status === 501) {
            setIsFallbackMode(true);
            setIsVerifyingEmail(true);
            setCountdown(120);
            setEnteredOtp(["", "", "", ""]);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 15000);
          } else {
            setError(mailData.error || t("pages.login_page.error_send_otp"));
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(t("pages.login_page.error_connection") + errMsg);
      }
    } else {
      setError(checkRes.error || t("pages.login_page.error_invalid_credentials"));
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const codeString = enteredOtp.join("");
    
    if (db.verifyOtp(email, codeString)) {
      const res = db.completeSignIn(email);
      if (res.success) {
        window.location.href = "/";
      } else {
        setError(res.error || t("error"));
      }
    } else {
      setError(t("pages.login_page.error_invalid_otp"));
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setIsFallbackMode(false);
    const code = db.generateOtp(email);
    setOtpCode(code);

    try {
      const mailRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      
      const mailData = await mailRes.json();
      
      if (mailRes.ok && mailData.success) {
        setCountdown(120);
        setEnteredOtp(["", "", "", ""]);
        setShowNotification(false);
      } else {
        if (mailRes.status === 501) {
          setIsFallbackMode(true);
          setCountdown(120);
          setEnteredOtp(["", "", "", ""]);
          setShowNotification(true);
        } else {
          setError(mailData.error || t("pages.login_page.error_send_otp"));
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(t("pages.login_page.error_connection") + errMsg);
    }
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#F5F5F7] p-6 selection:bg-[#C7F33C] selection:text-[#070708]">
      
      {/* Background glow highlights */}
      <div className="absolute top-[15%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-[#C7F33C]/6 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-purple-300/4 blur-[120px] pointer-events-none" />

      {/* Floating OTP Simulation Warning Notification (only in Fallback Mode) */}
      {showNotification && isFallbackMode && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-[380px] rounded-2xl bg-white border border-[#D8D8D8] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3 text-black">
            <div className="mt-0.5 rounded-full bg-[#C7F33C] p-1.5 text-black">
              <Sparkles size={16} className="fill-black/10" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[12px] font-bold block leading-none text-yellow-600">{t("pages.login_page.smtp_warning_title")}</span>
              <p className="text-[11px] text-[#555] mt-1.5 leading-relaxed">
                {t("pages.login_page.smtp_warning_desc")}
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
                  {t("pages.login_page.copy_code")}
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
          className="flex items-center gap-1.5 rounded-full bg-white border border-[#D8D8D8]/80 px-3.5 py-2 text-[12px] font-semibold text-black transition-all duration-150 active:scale-95 hover:bg-gray-50 shadow-sm"
        >
          <span>{LANG_FLAGS[lang]}</span>
          <span className="uppercase">{lang}</span>
          <ChevronDown size={14} strokeWidth={2} className="text-black" />
        </button>
      </div>

      {/* Main Form Box */}
      <Card className="w-full max-w-[420px] bg-white border border-[#D8D8D8]/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 z-10 rounded-[28px]">
        
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
          <h2 className="mt-4 text-[26px] font-extrabold text-black tracking-tight">
            {"Sendly"}
          </h2>
          <p className="mt-1 text-[13px] text-[#515154]">
            {isVerifyingEmail ? t("pages.login_page.otp_title") : t("forms.login")}
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-[12px] text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter email & password */}
        {!isVerifyingEmail && (
          <>
            <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#515154] px-1 text-left">
                  {t("forms.email")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707075]"><Mail size={16} /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-white border border-[#D8D8D8]/80 pl-11 pr-4 py-3 text-[13px] text-black outline-none placeholder:text-[#A0A0A5] transition-all focus:border-black focus:bg-white"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#515154] px-1 text-left">
                  {t("forms.password")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707075]"><Lock size={16} /></span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-white border border-[#D8D8D8]/80 pl-11 pr-4 py-3 text-[13px] text-black outline-none placeholder:text-[#A0A0A5] transition-all focus:border-black focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-full bg-[#C7F33C] text-black font-bold py-3.5 text-[13.5px] transition-all active:scale-[0.98] hover:bg-[#b5e02f]"
              >
                {t("forms.login")}
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <hr className="w-full border-black/5" />
              <span className="absolute bg-white px-3.5 text-[11px] font-semibold text-[#707075] uppercase tracking-wider">{t("pages.login_page.signin_or")}</span>
            </div>

            {/* Google Sign-In SDK button rendering container */}
            <div className="flex flex-col items-center gap-2">
              {!hasGoogleClientId ? (
                <div className="text-[10.5px] text-yellow-500/90 bg-yellow-500/5 border border-yellow-500/10 px-4 py-3.5 rounded-2xl text-left leading-relaxed">
                  {t("pages.login_page.google_warning")}
                </div>
              ) : (
                <div className="flex justify-center w-full min-h-[46px] py-1">
                  <div id="google-signin-btn" className="w-full flex justify-center" />
                </div>
              )}
            </div>

            <div className="mt-7 text-center text-[12px] text-[#515154]">
              {t("forms.no_account")}{" "}
              <Link href="/register" className="font-semibold text-black hover:text-[#7CA607] hover:underline">
                {t("forms.register")}
              </Link>
            </div>
          </>
        )}

        {/* STEP 2: Verify OTP code */}
        {isVerifyingEmail && (
          <form onSubmit={handleOtpVerify} className="mt-6 flex flex-col gap-6">
            <div className="text-center">
              <p className="text-[12px] text-[#515154] leading-relaxed">
                {t("pages.login_page.otp_sent_to")} <br />
                <span className="font-semibold text-black text-[13px]">{email}</span>
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
                  className="h-14 w-12 rounded-[14px] bg-white border border-[#D8D8D8]/80 text-center text-[20px] font-bold text-black outline-none focus:border-black focus:bg-white transition-all"
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button type="submit" variant="accent" className="w-full py-3.5">
                {t("pages.login_page.otp_verify_btn")}
              </Button>

              <div className="text-[12px] text-[#515154]">
                {countdown > 0 ? (
                  <span>{t("pages.login_page.otp_resend_label")}<span className="text-[#7CA607] font-mono">{formatTime(countdown)}</span></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-bold text-[#7CA607] hover:underline transition-all"
                  >
                    {t("pages.login_page.otp_resend_btn")}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsVerifyingEmail(false);
                  setError("");
                }}
                className="text-[12px] text-[#707075] hover:text-black transition-all font-medium"
              >
                {t("pages.login_page.otp_change_email")}
              </button>
            </div>
          </form>
        )}

      </Card>

    </div>
  );
}
