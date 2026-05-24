"use client";

import { useState, useRef } from "react";
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
  Sparkles,
} from "lucide-react";

interface SimMessage {
  sender: "user" | "bot";
  text: string;
}

function RobotHero() {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    const rX = -(y / (r.height / 2)) * 14;
    const rY = (x / (r.width / 2)) * 14;
    setStyle({ transform: `rotateX(${rX}deg) rotateY(${rY}deg) scale(1.03)` });
  };

  const onLeave = () => setStyle({});

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ perspective: "900px" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <style>{`
        @keyframes sendly-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(0.8deg); }
          66% { transform: translateY(-9px) rotate(-0.5deg); }
        }
        @keyframes sendly-shadow-pulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
          50% { transform: translateX(-50%) scale(0.78); opacity: 0.18; }
        }
        @keyframes sendly-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes sendly-badge-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Outer glow ring */}
      <div
        className="absolute w-[420px] h-[420px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(199,243,60,0.18) 0%, rgba(199,243,60,0.04) 60%, transparent 75%)",
          animation: "sendly-glow-pulse 4s ease-in-out infinite",
        }}
      />

      {/* Second glow */}
      <div
        className="absolute w-[280px] h-[280px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(199,243,60,0.22) 0%, transparent 70%)",
          animation: "sendly-glow-pulse 4s ease-in-out infinite 1s",
        }}
      />

      {/* Floating badge - DM count */}
      <div
        className="absolute top-[60px] -left-[20px] sm:-left-[40px] flex items-center gap-2 rounded-2xl border border-[#C7F33C]/20 bg-[#0C0C0E]/90 backdrop-blur-md px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-20"
        style={{ animation: "sendly-badge-float 3.5s ease-in-out infinite" }}
      >
        <div className="w-7 h-7 rounded-full bg-[#C7F33C] flex items-center justify-center text-black text-[11px] font-extrabold">{"DM"}</div>
        <div>
          <p className="text-[11px] font-bold text-white leading-none">{"Auto-javob"}</p>
          <p className="text-[9px] text-[#A0A0A5] mt-0.5">{"1.2k xabar / kun"}</p>
        </div>
      </div>

      {/* Floating badge - conversion */}
      <div
        className="absolute bottom-[80px] -right-[10px] sm:-right-[30px] flex items-center gap-2 rounded-2xl border border-[#C7F33C]/20 bg-[#0C0C0E]/90 backdrop-blur-md px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-20"
        style={{ animation: "sendly-badge-float 4s ease-in-out infinite 0.8s" }}
      >
        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-[11px] font-extrabold">{"3x"}</div>
        <div>
          <p className="text-[11px] font-bold text-white leading-none">{"Konversiya"}</p>
          <p className="text-[9px] text-[#A0A0A5] mt-0.5">{"sotuvlar o'sdi"}</p>
        </div>
      </div>

      {/* Robot image */}
      <div
        ref={ref}
        className="relative transition-all duration-300 ease-out"
        style={{ transformStyle: "preserve-3d", ...style }}
      >
        <Image
          src="/robot.png"
          alt="Sendly AI Robot"
          width={420}
          height={420}
          className="w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] object-contain relative z-10"
          style={{ animation: "sendly-float 7s ease-in-out infinite" }}
          priority
        />
      </div>

      {/* Ground shadow */}
      <div
        className="absolute bottom-[-10px] left-1/2 w-[200px] h-[18px] rounded-full bg-[#C7F33C]/15 blur-[14px]"
        style={{ animation: "sendly-shadow-pulse 7s ease-in-out infinite" }}
      />
    </div>
  );
}

export function LandingPageView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    { sender: "bot", text: "Assalomu alaykum! 👋 Sendly botiman. Instagram Direct va izohlaringizni avtomatlashtirib beraman. Nima bilmoqchisiz?" },
  ]);
  const [simButtons, setSimButtons] = useState<string[]>(["Narxi qancha? 💰", "Qanday ishlaydi? ⚡", "Bepul sinash 🚀"]);

  const handleSimClick = (btnText: string) => {
    const updated: SimMessage[] = [...simMessages, { sender: "user", text: btnText }];
    setSimMessages(updated);
    setSimButtons([]);
    setTimeout(() => {
      let reply = "";
      let next: string[] = [];
      if (btnText.includes("Narxi")) {
        reply = "💎 Sendly tariflari:\n• PRO: 150,000 so'm/oy — 1 akkaunt\n• PREMIUM: 1,000,000 so'm/oy — 10 akkaunt\n\n7 kun bepul sinab ko'ring! Karta bog'lash shart emas.";
        next = ["Bepul boshlash 🚀", "Boshqa savol ❓"];
      } else if (btnText.includes("ishlaydi")) {
        reply = "⚡ Juda oson:\n1️⃣ Ro'yxatdan o'ting\n2️⃣ Instagram Professional akkauntingizni ulang\n3️⃣ Bot oqimlarini yarating\n\nBot 24/7 avtomatik javob beradi!";
        next = ["Boshlash 🎯", "Boshqa savol ❓"];
      } else if (btnText.includes("Boshqa")) {
        reply = "Sizga qanday yordam bera olaman?";
        next = ["Narxi qancha? 💰", "Qanday ishlaydi? ⚡", "Bepul sinash 🚀"];
      } else {
        reply = "Ajoyib! Hoziroq ro'yxatdan o'ting va 7 kunlik Pro versiyani tekin ishlating. 🎉";
        next = ["Ro'yxatdan o'tish →", "Boshqa savol ❓"];
      }
      setSimMessages([...updated, { sender: "bot", text: reply }]);
      setSimButtons(next);
    }, 700);
  };

  const features = [
    {
      icon: MessageSquare,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      title: "Direct Avtomatlashtirish",
      desc: "Mijozlar DM yozganda bot soniyalar ichida javob beradi — xabarlami, havolami, tugmami.",
    },
    {
      icon: Share2,
      color: "text-[#C7F33C]",
      bg: "bg-[#C7F33C]/10",
      title: "Izoh → DM Oqimi",
      desc: "Post ostida izoh qoldirgan foydalanuvchiga avtomatik shaxsiy xabar yuboring.",
    },
    {
      icon: Sparkles,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      title: "AI Agent (GPT)",
      desc: "OpenAI yordamida arizalarni tahlil qilib, Sotuvlar yoki Support guruhlariga ajratadi.",
    },
    {
      icon: Award,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      title: "Referral va Ballar",
      desc: "Foydalanuvchilarni taklif qilganligi uchun mukofotlang. Ballarni chegirma va sovg'alarga almashtirish.",
    },
    {
      icon: MessageCircle,
      color: "text-green-400",
      bg: "bg-green-400/10",
      title: "Telegram Bot Runner",
      desc: "Instagram bilan birga Telegram botlarini ham bitta panelda boshqaring.",
    },
    {
      icon: Shield,
      color: "text-pink-400",
      bg: "bg-pink-400/10",
      title: "Live Chat Takeover",
      desc: "Murakkab holatlarda bot operatorga uzatadi — insoniy muloqot zarur bo'lganda.",
    },
    {
      icon: BarChart3,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      title: "Analitika va Hisobotlar",
      desc: "Qancha xabar yuborildi, qancha mijoz jalb qilindi — real vaqtda statistika.",
    },
    {
      icon: Users,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
      title: "Kontaktlar Bazasi",
      desc: "Barcha suhbatlashgan foydalanuvchilar ma'lumotlari teglar va status bilan saqlanadi.",
    },
    {
      icon: Bot,
      color: "text-rose-400",
      bg: "bg-rose-400/10",
      title: "Visual Flow Builder",
      desc: "Drag-and-drop orqali murakkab bot oqimlarini kodlamasdan vizual yarating.",
    },
  ];

  const faqs = [
    {
      q: "Sendly nima va kimlar uchun?",
      a: "Sendly — Instagram Professional akkauntlari uchun avtomatlashtirilgan chatbot va marketing platformasi. Onlayn biznes yurituvchi, savdoni kengaytirmoqchi bo'lgan har qanday kishi uchun.",
    },
    {
      q: "Akkauntim bloklanib ketmaydimi?",
      a: "Yo'q. Sendly faqat rasmiy Meta Graph API orqali ishlaydi. Hech qanday norasmiy tizim yoki parol talab qilinmaydi — akkauntingiz to'liq xavfsiz.",
    },
    {
      q: "7 kunlik sinov muddati haqiqiymi?",
      a: "Ha, mutlaqo haqiqiy. Ro'yxatdan o'tganingizdan so'ng 7 kun davomida barcha Pro funksiyalardan bepul foydalanasiz. Kredit karta talab qilinmaydi.",
    },
    {
      q: "Bir nechta Instagram akkauntni ulasa bo'ladimi?",
      a: "Ha. PRO tarifida 1 ta, PREMIUM tarifida esa 10 tagacha Instagram Professional akkauntni ulashingiz mumkin.",
    },
    {
      q: "To'lovni qanday amalga oshiraman?",
      a: "UzCard, Humo, Visa yoki MasterCard orqali to'lov qilishingiz mumkin. To'lov tizimi xavfsiz shifrlash bilan himoyalangan.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070708] text-[#E8E8E8] font-sans overflow-x-hidden selection:bg-[#C7F33C] selection:text-[#070708]">

      {/* Ambient background glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#C7F33C]/6 blur-[130px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-purple-700/8 blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[0%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-[#C7F33C]/4 blur-[120px] pointer-events-none z-0" />

      {/* ─── NAVBAR ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#070708]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8 py-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#C7F33C] shadow-[0_0_20px_rgba(199,243,60,0.35)]">
              <Zap size={18} className="fill-black text-black" />
            </div>
            <span className="text-[19px] font-extrabold tracking-tight text-white">
              {"Sendly"}<span className="text-[#C7F33C]">{".uz"}</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-[#A0A0A5]">
            <a href="#features" className="hover:text-white transition-colors">{"Xususiyatlar"}</a>
            <a href="#simulator" className="hover:text-white transition-colors">{"Demo"}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{"Tariflar"}</a>
            <a href="#faq" className="hover:text-white transition-colors">{"Savol-Javob"}</a>
          </nav>

          {/* Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <button className="text-[13px] font-semibold text-[#A0A0A5] hover:text-white px-4 py-2 transition-colors">
                {"Kirish"}
              </button>
            </Link>
            <Link href="/register">
              <button className="flex items-center gap-2 rounded-full bg-[#C7F33C] text-black px-5 py-2.5 text-[13px] font-extrabold transition-all hover:scale-105 active:scale-95 shadow-[0_6px_20px_rgba(199,243,60,0.3)]">
                {"Bepul boshlash"}
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/80 hover:text-white p-1 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0C0C0E] border-b border-white/5 px-5 py-5 flex flex-col gap-3 animate-in slide-in-from-top duration-200">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#A0A0A5] py-2 border-b border-white/5">{"Xususiyatlar"}</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#A0A0A5] py-2 border-b border-white/5">{"Demo Bot"}</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#A0A0A5] py-2 border-b border-white/5">{"Tariflar"}</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#A0A0A5] py-2 border-b border-white/5">{"Savol-Javob"}</a>
            <div className="flex gap-2 mt-2">
              <Link href="/login" className="flex-1">
                <button className="w-full rounded-full border border-white/10 bg-white/5 py-3 text-[13px] font-bold text-white">{"Kirish"}</button>
              </Link>
              <Link href="/register" className="flex-1">
                <button className="w-full rounded-full bg-[#C7F33C] text-black py-3 text-[13px] font-extrabold">{"Bepul boshlash"}</button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 pt-16 sm:pt-20 pb-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-0">

        {/* Left — text */}
        <div className="flex-1 text-center lg:text-left max-w-xl mx-auto lg:mx-0">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7F33C]/20 bg-[#C7F33C]/5 px-4 py-2 text-[11.5px] font-bold text-[#C7F33C] mb-6">
            <Sparkles size={12} />
            <span>{"INSTAGRAM CHATBOT & AI AVTOMATLASHTIRISH"}</span>
          </div>

          {/* Title */}
          <h1 className="text-[36px] sm:text-[52px] md:text-[60px] font-[900] text-white tracking-tight leading-[1.07]">
            {"Instagram DM va"}
            <br />
            <span className="bg-gradient-to-r from-[#C7F33C] via-[#DEFF7A] to-purple-400 bg-clip-text text-transparent">
              {"Izohlarni Savdoga"}
            </span>
            <br />
            {"Aylantiring"}
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-[15px] sm:text-[17px] text-[#A0A0A5] leading-relaxed max-w-[500px] mx-auto lg:mx-0">
            {"Mijozlarga 24/7 tezkor javob bering, izohlarga DM orqali avtomatik javob qaytaring va AI yordamida arizalarni saralang."}
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
            <Link href="/register">
              <button className="group flex items-center gap-2.5 rounded-full bg-[#C7F33C] text-black px-8 py-4 text-[15px] font-extrabold shadow-[0_12px_35px_rgba(199,243,60,0.3)] transition-all hover:scale-105 active:scale-95">
                <span>{"Tekin Boshlash"}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[#C7F33C]">
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </Link>
            <a href="#simulator">
              <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-4 text-[15px] font-bold text-white transition-all active:scale-95">
                <span>{"Demo Ko'rish"}</span>
              </button>
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center gap-5 justify-center lg:justify-start text-[11.5px] text-[#707075] font-semibold">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#C7F33C]" />{"7 kun bepul"}</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#C7F33C]" />{"Karta shart emas"}</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#C7F33C]" />{"Meta API orqali"}</span>
          </div>
        </div>

        {/* Right — Robot */}
        <div className="flex-1 flex justify-center lg:justify-end relative">
          <RobotHero />
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div className="border-y border-white/5 bg-[#0C0C0E]/60 py-10 z-10 relative">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-[40px] sm:text-[50px] font-[900] text-[#C7F33C] leading-none tracking-tight">{"1M+"}</p>
            <p className="text-[12px] text-[#A0A0A5] font-semibold uppercase tracking-wider mt-1">{"Yuborilgan avtomatik xabarlar"}</p>
          </div>
          <div>
            <p className="text-[40px] sm:text-[50px] font-[900] text-white leading-none tracking-tight">{"99.9%"}</p>
            <p className="text-[12px] text-[#A0A0A5] font-semibold uppercase tracking-wider mt-1">{"Tizim barqarorligi"}</p>
          </div>
          <div>
            <p className="text-[40px] sm:text-[50px] font-[900] text-[#C7F33C] leading-none tracking-tight">{"3.5x"}</p>
            <p className="text-[12px] text-[#A0A0A5] font-semibold uppercase tracking-wider mt-1">{"Konversiya o'sishi"}</p>
          </div>
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[28px] sm:text-[42px] font-[900] text-white tracking-tight">
            {"Savdoni Oshirish Uchun"} <span className="text-[#C7F33C]">{"Barcha Qurollar"}</span>
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[#A0A0A5] mt-3 leading-relaxed">
            {"Har bir izohni arizaga, har bir DM ni sotuvga aylantiring."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-[22px] border border-white/5 bg-[#0C0C0E] p-6 transition-all hover:border-[#C7F33C]/20 hover:scale-[1.015] hover:bg-[#0E0E10] group"
            >
              <div className={`h-11 w-11 rounded-[14px] ${f.bg} ${f.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                <f.icon size={20} />
              </div>
              <h3 className="text-[16px] font-extrabold text-white">{f.title}</h3>
              <p className="text-[12.5px] text-[#A0A0A5] mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DEMO SIMULATOR ─── */}
      <section id="simulator" className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8 py-12 sm:py-20">
        <div className="rounded-[28px] border border-white/5 bg-[#0C0C0E] p-6 sm:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-8 items-center">

            <div>
              <span className="inline-block text-[10.5px] font-extrabold text-[#C7F33C] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#C7F33C]/10 border border-[#C7F33C]/20 mb-4">{"INTERAKTIV DEMO"}</span>
              <h3 className="text-[22px] sm:text-[28px] font-[900] text-white leading-tight">{"Bot Qanday Ishlashini Ko'ring"}</h3>
              <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
                {"Tugmalardan birini bosing va botning real javob tezligini tekshiring."}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {simButtons.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => handleSimClick(b)}
                    className="rounded-[12px] border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-[12px] font-semibold text-white transition-all active:scale-[0.97]"
                  >
                    {b}
                  </button>
                ))}
                {simButtons.length === 0 && (
                  <button
                    onClick={() => {
                      setSimMessages([{ sender: "bot", text: "Assalomu alaykum! 👋 Sendly botiman. Instagram Direct va izohlaringizni avtomatlashtirib beraman. Nima bilmoqchisiz?" }]);
                      setSimButtons(["Narxi qancha? 💰", "Qanday ishlaydi? ⚡", "Bepul sinash 🚀"]);
                    }}
                    className="rounded-[12px] border border-[#C7F33C]/20 bg-[#C7F33C]/5 text-[#C7F33C] px-5 py-2.5 text-[12px] font-extrabold transition-all active:scale-[0.97]"
                  >
                    {"Qayta boshlash 🔄"}
                  </button>
                )}
              </div>
            </div>

            {/* Chat mockup */}
            <div className="rounded-[20px] border border-white/5 bg-[#050506] p-4 flex flex-col h-[320px]">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-[#C7F33C] flex items-center justify-center text-black text-[10px] font-extrabold font-mono">{"S"}</div>
                <div>
                  <p className="text-[12.5px] font-bold text-white leading-none">{"Sendly Bot"}</p>
                  <p className="text-[10px] text-green-400 mt-0.5">{"● Onlayn"}</p>
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
                        : "bg-white/5 text-white/90 self-start rounded-tl-sm border border-white/5",
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
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[28px] sm:text-[42px] font-[900] text-white tracking-tight">{"Oddiy va Shaffof Tariflar"}</h2>
          <p className="text-[14px] sm:text-[15px] text-[#A0A0A5] mt-3 leading-relaxed">
            {"7 kun bepul. Kredit karta talab qilinmaydi."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* PRO */}
          <div className="relative rounded-[28px] border border-[#C7F33C]/25 bg-[#0C0C0E] p-8 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(199,243,60,0.06)]">
            <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-[16px] tracking-wider">{"MASHHUR"}</div>
            <h3 className="text-[20px] font-extrabold text-white">{"PRO"}</h3>
            <p className="text-[12px] text-[#707075] mt-1">{"Kichik va o'rta bizneslar uchun"}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[46px] font-[900] text-white tracking-tight leading-none">{"150,000"}</span>
              <span className="text-[#A0A0A5] text-[13px] font-semibold">{"so'm / oy"}</span>
            </div>
            <div className="h-px bg-white/5 my-6" />
            <ul className="flex flex-col gap-3 text-[13px] text-[#E8E8E8] flex-1">
              {["1 ta Instagram Professional akkaunt", "Cheksiz avtomatlashtirish oqimlari", "DM va Izoh avtomatik javoblari", "Referral tizimi va Ballar", "1 ta Telegram Bot ulash", "Analitika paneli"].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div className="h-4.5 w-4.5 rounded-full bg-[#C7F33C]/15 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-[#C7F33C]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="mt-8">
              <button className="w-full rounded-full bg-[#C7F33C] text-black py-4 text-[14px] font-extrabold hover:bg-[#B0D82D] active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(199,243,60,0.2)]">
                {"Bepul Sinab Ko'rish"}
              </button>
            </Link>
          </div>

          {/* PREMIUM */}
          <div className="rounded-[28px] border border-white/8 bg-[#0A0A0C] p-8 flex flex-col">
            <h3 className="text-[20px] font-extrabold text-white">{"PREMIUM"}</h3>
            <p className="text-[12px] text-[#707075] mt-1">{"Agentliklar va katta bizneslar uchun"}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[46px] font-[900] text-white tracking-tight leading-none">{"1,000,000"}</span>
              <span className="text-[#A0A0A5] text-[13px] font-semibold">{"so'm / oy"}</span>
            </div>
            <div className="h-px bg-white/5 my-6" />
            <ul className="flex flex-col gap-3 text-[13px] text-[#E8E8E8] flex-1">
              {["10 ta Instagram Professional akkaunt", "PRO dagi barcha imkoniyatlar", "OpenAI & AI Agent Saralash", "VIP qo'llab-quvvatlash (24/7)", "10 tagacha Telegram Bot ulash", "Shaxsiy menejer"].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div className="h-4.5 w-4.5 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-purple-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="mt-8">
              <button className="w-full rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white py-4 text-[14px] font-extrabold active:scale-[0.98] transition-all">
                {"Bog'lanish va Ulash"}
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[40px] font-[900] text-white tracking-tight">{"Ko'p Beriladigan Savollar"}</h2>
          <p className="text-[13.5px] text-[#A0A0A5] mt-3">{"Eng ko'p so'raladigan savollarga javoblar."}</p>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-[18px] border border-white/5 bg-[#0C0C0E] overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full px-5 py-4.5 flex items-center justify-between text-left font-bold text-[14px] sm:text-[15px] text-white hover:text-[#C7F33C] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown size={15} className={`text-[#A0A0A5] transition-transform duration-200 shrink-0 ml-3 ${activeFaq === i ? "rotate-180 text-[#C7F33C]" : ""}`} />
              </button>
              {activeFaq === i && (
                <div className="px-5 pb-5 text-[13px] text-[#A0A0A5] leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-150">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="relative z-10 border-t border-white/5 bg-[#050506] py-16 sm:py-20 text-center">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-[26px] sm:text-[40px] font-[900] text-white tracking-tight">{"Instagram savdongizni bugunoq kuchaytiring"}</h2>
          <p className="text-[13.5px] text-[#A0A0A5] mt-4 max-w-xl mx-auto leading-relaxed">
            {"Avtomatik javob, AI saralash, real vaqt analitikasi — barchasi bitta platformada."}
          </p>
          <Link href="/register">
            <button className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-[#C7F33C] text-black px-9 py-4 text-[15px] font-extrabold shadow-[0_12px_35px_rgba(199,243,60,0.25)] hover:scale-105 active:scale-95 transition-all">
              <span>{"Bepul Boshlash"}</span>
              <ArrowRight size={16} />
            </button>
          </Link>

          <div className="mt-14 h-px bg-white/5" />

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#555]">
            <div className="flex items-center gap-2">
              <div className="grid h-5 w-5 place-items-center rounded-[6px] bg-[#C7F33C]">
                <Zap size={11} className="fill-black text-black" />
              </div>
              <span className="font-extrabold text-white/80">{"Sendly.uz"}</span>
              <span>{"© 2026. Barcha huquqlar himoyalangan."}</span>
            </div>
            <div className="flex gap-5 font-semibold text-[#707075]">
              <Link href="/privacy" className="hover:text-white transition-colors">{"Maxfiylik"}</Link>
              <a href="#" className="hover:text-white transition-colors">{"Shartlar"}</a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
