"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Zap,
  Bot,
  ArrowRight,
  Check,
  MessageSquare,
  Share2,
  Award,
  Shield,
  ChevronDown,
  MessageCircle,
  Menu,
  X,
  Users,
  BarChart3,
  Brain,
} from "lucide-react";

interface SimMessage {
  sender: "user" | "bot";
  text: string;
}

function RobotHero() {
  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      <style>{`
        @keyframes sendly-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(0.8deg); }
          66% { transform: translateY(-9px) rotate(-0.5deg); }
        }
        @keyframes sendly-shadow-pulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.3; }
          50% { transform: translateX(-50%) scale(0.78); opacity: 0.12; }
        }
        @keyframes sendly-glow-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.08); }
        }
        @keyframes sendly-badge-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Outer glow ring */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(155,201,46,0.2) 0%, rgba(155,201,46,0.05) 60%, transparent 75%)",
          animation: "sendly-glow-pulse 4s ease-in-out infinite",
        }}
      />

      {/* Floating badge - Auto-reply (placed higher and shifted to avoid overlap) */}
      <div
        className="absolute top-[-30px] sm:top-[-50px] left-[10px] sm:left-[20px] flex items-center gap-2 rounded-2xl border border-black/5 bg-white/90 backdrop-blur-md px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 pointer-events-auto"
        style={{ animation: "sendly-badge-float 3.5s ease-in-out infinite" }}
      >
        <div className="w-7 h-7 rounded-full bg-[#C7F33C] flex items-center justify-center text-black">
          <MessageSquare size={13} className="fill-black text-black" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-black leading-none">{"Auto-javob"}</p>
          <p className="text-[9px] text-[#707075] mt-0.5">{"1.2k xabar / kun"}</p>
        </div>
      </div>

      {/* Floating badge - conversion */}
      <div
        className="absolute bottom-[80px] -right-[10px] sm:-right-[30px] flex items-center gap-2 rounded-2xl border border-black/5 bg-white/90 backdrop-blur-md px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 pointer-events-auto"
        style={{ animation: "sendly-badge-float 4s ease-in-out infinite 0.8s" }}
      >
        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-[11px] font-extrabold">{"3x"}</div>
        <div>
          <p className="text-[11px] font-bold text-black leading-none">{"Konversiya"}</p>
          <p className="text-[9px] text-[#707075] mt-0.5">{"sotuvlar o'sdi"}</p>
        </div>
      </div>

      {/* Robot image - Large and transparent (tilt effects removed) */}
      <div className="relative">
        <Image
          src="/robot-v3.png"
          alt="Sendly AI Robot"
          width={700}
          height={864}
          className="w-[380px] sm:w-[480px] md:w-[540px] lg:w-[640px] h-auto object-contain relative z-10 lg:-mr-20 lg:-mt-10"
          style={{ animation: "sendly-float 7s ease-in-out infinite" }}
          priority
        />
      </div>

      {/* Ground shadow */}
      <div
        className="absolute bottom-[-10px] left-1/2 w-[220px] h-[18px] rounded-full bg-black/5 blur-[14px]"
        style={{ animation: "sendly-shadow-pulse 7s ease-in-out infinite" }}
      />
    </div>
  );
}

export function LandingPageView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    { sender: "bot", text: "Assalomu alaykum! Sendly botiman. Instagram shaxsiy xabarlari va izohlaringizni avtomatlashtirib beraman. Nima bilmoqchisiz?" },
  ]);
  const [simButtons, setSimButtons] = useState<string[]>(["Narxi qancha?", "Qanday ishlaydi?", "Bepul sinash"]);

  const handleSimClick = (btnText: string) => {
    const updated: SimMessage[] = [...simMessages, { sender: "user", text: btnText }];
    setSimMessages(updated);
    setSimButtons([]);
    setTimeout(() => {
      let reply = "";
      let next: string[] = [];
      if (btnText.includes("Narxi")) {
        reply = "Sendly tariflari:\n• PRO: 150,000 so'm/oy — 1 akkaunt\n• PREMIUM: 1,200,000 so'm/oy — 10 akkaunt\n\n7 kun bepul sinab ko'ring! Sinash uchun karta bog'lash shart.";
        next = ["Bepul boshlash", "Boshqa savol"];
      } else if (btnText.includes("ishlaydi")) {
        reply = "Juda oson:\n1. Ro'yxatdan o'ting\n2. Instagram professional akkauntingizni ulang\n3. Bot oqimlarini yarating\n\nBot 24/7 avtomatik javob beradi!";
        next = ["Boshlash", "Boshqa savol"];
      } else if (btnText.includes("Boshqa")) {
        reply = "Sizga qanday yordam bera olaman?";
        next = ["Narxi qancha?", "Qanday ishlaydi?", "Bepul sinash"];
      } else {
        reply = "Ajoyib! Hoziroq ro'yxatdan o'ting va 7 kunlik Pro versiyani bepul ishlating.";
        next = ["Ro'yxatdan o'tish →", "Boshqa savol"];
      }
      setSimMessages([...updated, { sender: "bot", text: reply }]);
      setSimButtons(next);
    }, 700);
  };

  const features = [
    {
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
      title: "Shaxsiy xabarlarni avtomatlashtirish",
      desc: "Mijozlar shaxsiy xabar yozganda bot soniyalar ichida javob beradi — matn, havola yoki tugmalar bilan.",
    },
    {
      icon: Share2,
      color: "text-[#7CA607]",
      bg: "bg-[#C7F33C]/20",
      title: "Izoh → shaxsiy xabar oqimi",
      desc: "Post ostida izoh qoldirgan foydalanuvchiga avtomatik shaxsiy xabar yuboring.",
    },
    {
      icon: Brain,
      color: "text-purple-600",
      bg: "bg-purple-50",
      title: "Sun'iy intellekt agenti",
      desc: "Sun'iy intellekt yordamida arizalarni tahlil qilib, sotuvlar yoki qo'llab-quvvatlash guruhlariga ajratadi.",
    },
    {
      icon: Award,
      color: "text-orange-600",
      bg: "bg-orange-50",
      title: "Tavsiyalar va ballar",
      desc: "Foydalanuvchilarni taklif qilganligi uchun mukofotlang. Ballarni chegirma va sovg'alarga almashtirish.",
    },
    {
      icon: MessageCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      title: "Telegram bot boshqaruvi",
      desc: "Instagram bilan birga Telegram botlarini ham bitta panelda boshqaring.",
    },
    {
      icon: Shield,
      color: "text-pink-600",
      bg: "bg-pink-50",
      title: "Operator aralashuvi",
      desc: "Murakkab holatlarda bot operatorga uzatadi — insoniy muloqot zarur bo'lganda.",
    },
    {
      icon: BarChart3,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      title: "Analitika va hisobotlar",
      desc: "Qancha xabar yuborildi, qancha mijoz jalb qilindi — real vaqtda statistika.",
    },
    {
      icon: Users,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      title: "Kontaktlar bazasi",
      desc: "Barcha suhbatlashgan foydalanuvchilar ma'lumotlari teglar va status bilan saqlanadi.",
    },
    {
      icon: Bot,
      color: "text-rose-600",
      bg: "bg-rose-50",
      title: "Vizual oqim quruvchisi",
      desc: "Oddiy tortib tushirish orqali murakkab bot oqimlarini kodlamasdan vizual yarating.",
    },
  ];

  const faqs = [
    {
      q: "Sendly nima va kimlar uchun?",
      a: "Sendly — Instagram professional akkauntlari uchun avtomatlashtirilgan chatbot va marketing platformasi. Onlayn biznes yurituvchi, savdoni kengaytirmoqchi bo'lgan har qanday kishi uchun.",
    },
    {
      q: "Akkauntim bloklanib ketmaydimi?",
      a: "Yo'q. Sendly faqat rasmiy Meta Graph API orqali ishlaydi. Hech qanday norasmiy tizim yoki parol talab qilinmaydi — akkauntingiz to'liq xavfsiz.",
    },
    {
      q: "7 kunlik sinov muddati haqiqiymi?",
      a: "Ha, mutlaqo haqiqiy. Ro'yxatdan o'tganingizdan so'ng 7 kun davomida barcha Pro funksiyalardan bepul foydalanasiz. Sinov muddatini boshlash uchun karta bog'lash talab etiladi.",
    },
    {
      q: "Bir nechta Instagram akkauntni ulasa bo'ladimi?",
      a: "Ha. PRO tarifida 1 ta, PREMIUM tarifida esa 10 tagacha Instagram professional akkauntini ulashingiz mumkin.",
    },
    {
      q: "To'lovni qanday amalga oshiraman?",
      a: "UzCard, Humo, Visa yoki MasterCard orqali to'lov qilishingiz mumkin. To'lov tizimi xavfsiz shifrlash bilan himoyalangan.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans overflow-x-hidden selection:bg-[#C7F33C] selection:text-black">

      {/* Ambient background glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#C7F33C]/8 blur-[130px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-purple-300/6 blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[0%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-[#C7F33C]/6 blur-[120px] pointer-events-none z-0" />

      {/* ─── NAVBAR ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#D8D8D8]/60 bg-[#F5F5F7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8 py-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#C7F33C] shadow-[0_4px_15px_rgba(199,243,60,0.3)]">
              <Zap size={18} className="fill-black text-black" />
            </div>
            <span className="text-[19px] font-extrabold tracking-tight text-black">
              {"Sendly"}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-[#515154]">
            <a href="#features" className="hover:text-black transition-colors">{"Xususiyatlar"}</a>
            <a href="#simulator" className="hover:text-black transition-colors">{"Sinab ko'rish"}</a>
            <a href="#pricing" className="hover:text-black transition-colors">{"Tariflar"}</a>
            <a href="#faq" className="hover:text-black transition-colors">{"Savol-javob"}</a>
          </nav>

          {/* Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <button className="text-[13px] font-semibold text-[#515154] hover:text-black px-4 py-2 transition-colors">
                {"Kirish"}
              </button>
            </Link>
            <Link href="/register">
              <button className="flex items-center gap-2 rounded-full bg-[#C7F33C] text-black px-5 py-2.5 text-[13px] font-extrabold transition-all hover:scale-105 active:scale-95 shadow-[0_6px_15px_rgba(199,243,60,0.25)]">
                {"Bepul boshlash"}
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-black/80 hover:text-black p-1 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-black/5 px-5 py-5 flex flex-col gap-3 animate-in slide-in-from-top duration-200">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#515154] py-2 border-b border-black/5">{"Xususiyatlar"}</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#515154] py-2 border-b border-black/5">{"Sinab ko'rish"}</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#515154] py-2 border-b border-black/5">{"Tariflar"}</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#515154] py-2 border-b border-black/5">{"Savol-javob"}</a>
            <div className="flex gap-2 mt-2">
              <Link href="/login" className="flex-1">
                <button className="w-full rounded-full border border-black/10 bg-black/5 py-3 text-[13px] font-bold text-black">{"Kirish"}</button>
              </Link>
              <Link href="/register" className="flex-1">
                <button className="w-full rounded-full bg-[#C7F33C] text-black py-3 text-[13px] font-extrabold">{"Bepul boshlash"}</button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 pt-12 sm:pt-14 pb-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-0">

        {/* Left — text */}
        <div className="flex-1 text-center lg:text-left max-w-2xl lg:max-w-3xl mx-auto lg:mx-0 z-20">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#C7F33C] px-4 py-2 text-[11.5px] font-bold text-black mb-6 shadow-sm">
            <span>{"Instagram chatbot va AI avtomatlashtirish"}</span>
          </div>

          {/* Title - Sentence Case and shaxsiy xabar */}
          <h1 className="text-[30px] sm:text-[42px] lg:text-[48px] xl:text-[54px] font-[900] text-black tracking-tight leading-[1.1]">
            <span className="block md:whitespace-nowrap">{"Instagram shaxsiy xabarlari"}</span>
            <span className="block md:whitespace-nowrap">
              {"va "}
              <span className="bg-gradient-to-r from-[#7CA607] via-purple-600 to-blue-600 bg-clip-text text-transparent">
                {"izohlarini savdoga"}
              </span>
            </span>
            <span className="block md:whitespace-nowrap">{"aylantiring"}</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-[15px] sm:text-[17px] text-[#515154] leading-relaxed max-w-[620px] mx-auto lg:mx-0">
            <span className="block md:whitespace-nowrap">{"Mijozlarga 24/7 tezkor javob bering, izohlarga"}</span>
            <span className="block md:whitespace-nowrap">{"shaxsiy xabar orqali avtomatik javob qaytaring"}</span>
            <span className="block md:whitespace-nowrap">{"va AI yordamida arizalarni saralang."}</span>
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
            <Link href="/register">
              <button className="group flex items-center gap-2.5 rounded-full bg-[#C7F33C] text-black px-8 py-4 text-[15px] font-extrabold shadow-[0_8px_25px_rgba(199,243,60,0.3)] transition-all hover:scale-105 active:scale-95">
                <span>{"Bepul boshlash"}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[#C7F33C]">
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </Link>
            <a href="#simulator">
              <button className="flex items-center gap-2 rounded-full border border-black/10 bg-white hover:bg-gray-50 px-8 py-4 text-[15px] font-bold text-black transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                <span>{"Sinab ko'rish"}</span>
              </button>
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center gap-5 justify-center lg:justify-start text-[11.5px] text-[#707075] font-semibold">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#7CA607]" />{"7 kun bepul"}</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#7CA607]" />{"Meta API orqali"}</span>
          </div>
        </div>

        {/* Right — Robot */}
        <div className="flex-1 flex justify-center lg:justify-end relative">
          <RobotHero />
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div className="border-y border-[#D8D8D8]/60 bg-white py-7 z-10 relative">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-[40px] sm:text-[50px] font-[900] text-[#7CA607] leading-none tracking-tight">{"1M+"}</p>
            <p className="text-[12px] text-[#515154] font-semibold uppercase tracking-wider mt-1">{"Yuborilgan avtomatik xabarlar"}</p>
          </div>
          <div>
            <p className="text-[40px] sm:text-[50px] font-[900] text-black leading-none tracking-tight">{"99.9%"}</p>
            <p className="text-[12px] text-[#515154] font-semibold uppercase tracking-wider mt-1">{"Tizim barqarorligi"}</p>
          </div>
          <div>
            <p className="text-[40px] sm:text-[50px] font-[900] text-[#7CA607] leading-none tracking-tight">{"3.5x"}</p>
            <p className="text-[12px] text-[#515154] font-semibold uppercase tracking-wider mt-1">{"Konversiya o'sishi"}</p>
          </div>
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[28px] sm:text-[42px] font-[900] text-black tracking-tight">
            {"Savdoni oshirish uchun"} <span className="text-[#7CA607]">{"barcha qurollar"}</span>
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[#515154] mt-3 leading-relaxed">
            {"Har bir izohni arizaga, har bir shaxsiy xabarni sotuvga aylantiring."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-[20px] border border-[#D8D8D8]/60 bg-white p-6 shadow-sm transition-all hover:border-[#C7F33C] hover:scale-[1.015] hover:shadow-md group"
            >
              <div className={`h-11 w-11 rounded-[14px] ${f.bg} ${f.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                <f.icon size={20} />
              </div>
              <h3 className="text-[16px] font-extrabold text-black">{f.title}</h3>
              <p className="text-[12.5px] text-[#515154] mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DEMO SIMULATOR ─── */}
      <section id="simulator" className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8 py-8 sm:py-12">
        <div className="rounded-[24px] border border-[#D8D8D8]/60 bg-white p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-8 items-center">

            <div>
              <span className="inline-block text-[10.5px] font-extrabold text-[#7CA607] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#C7F33C]/20 border border-[#7CA607]/20 mb-4">{"INTERAKTIV SINOV"}</span>
              <h3 className="text-[22px] sm:text-[28px] font-[900] text-black leading-tight">{"Bot qanday ishlashini ko'ring"}</h3>
              <p className="text-[13px] text-[#515154] mt-3 leading-relaxed">
                {"Tugmalardan birini bosing va botning real javob tezligini tekshiring."}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {simButtons.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => handleSimClick(b)}
                    className="rounded-[12px] border border-black/10 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 text-[12px] font-semibold text-black transition-all active:scale-[0.97]"
                  >
                    {b}
                  </button>
                ))}
                {simButtons.length === 0 && (
                  <button
                    onClick={() => {
                      setSimMessages([{ sender: "bot", text: "Assalomu alaykum! Sendly botiman. Instagram shaxsiy xabarlari va izohlaringizni avtomatlashtirib beraman. Nima bilmoqchisiz?" }]);
                      setSimButtons(["Narxi qancha?", "Qanday ishlaydi?", "Bepul sinash"]);
                    }}
                    className="rounded-[12px] border border-[#C7F33C]/30 bg-[#C7F33C]/10 text-[#7CA607] px-5 py-2.5 text-[12px] font-extrabold transition-all active:scale-[0.97]"
                  >
                    {"Qayta boshlash"}
                  </button>
                )}
              </div>
            </div>

            {/* Chat mockup */}
            <div className="rounded-[20px] border border-[#D8D8D8]/60 bg-[#E8E8E8] p-4 flex flex-col h-[320px]">
              <div className="flex items-center gap-2.5 border-b border-black/5 pb-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-[#C7F33C] flex items-center justify-center text-black text-[10px] font-extrabold font-mono">{"S"}</div>
                <div>
                  <p className="text-[12.5px] font-bold text-black leading-none">{"Sendly Bot"}</p>
                  <p className="text-[10px] text-green-600 mt-0.5">{"● Onlayn"}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 py-1">
                {simMessages.map((m, i) => (
                  <div
                    key={i}
                    className={[
                      "max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[12px] leading-relaxed",
                      m.sender === "user"
                        ? "bg-[#C7F33C] text-black self-end rounded-tr-sm font-bold"
                        : "bg-white text-black self-start rounded-tl-sm border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
                    ].join(" ")}
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[28px] sm:text-[42px] font-[900] text-black tracking-tight">{"Oddiy va shaffof tariflar"}</h2>
          <p className="text-[14px] sm:text-[15px] text-[#515154] mt-3 leading-relaxed">
            {"7 kun bepul. Sinash uchun karta bog'lash shart."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* PRO */}
          <div className="relative rounded-[24px] border border-[#C7F33C] bg-white p-8 flex flex-col overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-[16px] tracking-wider">{"MASHHUR"}</div>
            <h3 className="text-[20px] font-extrabold text-black">{"PRO"}</h3>
            <p className="text-[12px] text-[#707075] mt-1">{"Kichik va o'rta bizneslar uchun"}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[46px] font-[900] text-black tracking-tight leading-none">{"150,000"}</span>
              <span className="text-[#515154] text-[13px] font-semibold">{"so'm / oy"}</span>
            </div>
            <div className="h-px bg-black/5 my-6" />
            <ul className="flex flex-col gap-3 text-[13px] text-black flex-1">
              {["1 ta Instagram professional akkaunti", "Cheksiz avtomatlashtirish oqimlari", "Shaxsiy xabarlar va izohlar uchun avtomatik javoblar", "Referral tizimi va ballar", "1 ta Telegram bot ulash", "Analitika paneli"].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-[#7CA607]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="mt-8">
              <button className="w-full rounded-full bg-[#C7F33C] text-black py-4 text-[14px] font-extrabold hover:bg-[#B0D82D] active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(199,243,60,0.2)]">
                {"Bepul sinab ko'rish"}
              </button>
            </Link>
          </div>

          {/* PREMIUM */}
          <div className="rounded-[24px] border border-[#D8D8D8]/60 bg-white p-8 flex flex-col shadow-sm">
            <h3 className="text-[20px] font-extrabold text-black">{"PREMIUM"}</h3>
            <p className="text-[12px] text-[#707075] mt-1">{"Agentliklar va katta bizneslar uchun"}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[46px] font-[900] text-black tracking-tight leading-none">{"1,200,000"}</span>
              <span className="text-[#515154] text-[13px] font-semibold">{"so'm / oy"}</span>
            </div>
            <div className="h-px bg-black/5 my-6" />
            <ul className="flex flex-col gap-3 text-[13px] text-black flex-1">
              {["10 ta Instagram professional akkaunti", "PRO dagi barcha imkoniyatlar", "OpenAI va AI agent saralash", "VIP qo'llab-quvvatlash (24/7)", "10 tagacha Telegram bot ulash", "Shaxsiy menejer"].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-purple-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="mt-8">
              <button className="w-full rounded-full bg-black text-[#C7F33C] py-4 text-[14px] font-extrabold hover:bg-black/90 active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(0,0,0,0.1)]">
                {"Ulash va boshlash"}
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[40px] font-[900] text-black tracking-tight">{"Ko'p beriladigan savollar"}</h2>
          <p className="text-[13.5px] text-[#515154] mt-3">{"Eng ko'p so'raladigan savollarga javoblar."}</p>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-[20px] border border-[#D8D8D8]/60 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full px-7 py-6 flex items-center justify-between text-left font-extrabold text-[15px] sm:text-[16px] text-black hover:text-[#7CA607] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown size={15} className={`text-[#A0A0A5] transition-transform duration-200 shrink-0 ml-3 ${activeFaq === i ? "rotate-180 text-[#7CA607]" : ""}`} />
              </button>
              {activeFaq === i && (
                <div className="px-7 pb-6 text-[13.5px] text-[#515154] leading-relaxed border-t border-black/5 pt-5 animate-in fade-in duration-150">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="relative z-10 border-t border-[#D8D8D8] bg-[#DFDFDF] py-10 sm:py-12 text-center">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-[26px] sm:text-[40px] font-[900] text-black tracking-tight">{"Instagram savdongizni bugunoq kuchaytiring"}</h2>
          <p className="text-[13.5px] text-[#515154] mt-4 max-w-xl mx-auto leading-relaxed">
            {"Avtomatik javob, AI saralash, real vaqt analitikasi — barchasi bitta platformada."}
          </p>
          <Link href="/register">
            <button className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-[#C7F33C] text-black px-9 py-4 text-[15px] font-extrabold shadow-[0_10px_30px_rgba(199,243,60,0.25)] hover:scale-105 active:scale-95 transition-all">
              <span>{"Bepul boshlash"}</span>
              <ArrowRight size={16} />
            </button>
          </Link>

          <div className="mt-14 h-px bg-black/5" />

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#707075]">
            <div className="flex items-center gap-2">
              <div className="grid h-5 w-5 place-items-center rounded-[6px] bg-[#C7F33C]">
                <Zap size={11} className="fill-black text-black" />
              </div>
              <span className="font-extrabold text-black">{"Sendly"}</span>
              <span>{"© 2026. Barcha huquqlar himoyalangan."}</span>
            </div>
            <div className="flex gap-5 font-semibold text-[#707075]">
              <Link href="/privacy" className="hover:text-black transition-colors">{"Maxfiylik"}</Link>
              <Link href="/terms" className="hover:text-black transition-colors">{"Shartlar (Oferta)"}</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
