"use client";

import { useState } from "react";
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
  Play,
  Sparkles
} from "lucide-react";

// Interactive Simulator Messages
interface SimMessage {
  sender: "user" | "bot";
  text: string;
}

export function LandingPageView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Chatbot Simulator State
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    { sender: "bot", text: "Salom! Men Sendly avtomatlashtirilgan botiman. Instagram sahifangizni savdo mashinasiga aylantirishga tayyormisiz? 🚀" }
  ]);
  const [simButtons, setSimButtons] = useState<string[]>([
    "Narxi qancha? 💰",
    "Aksiya bormi? 🎁",
    "Qanday ulanadi? 🔌"
  ]);

  const handleSimButtonClick = (btnText: string) => {
    // Add user message
    const updated = [...simMessages, { sender: "user" as const, text: btnText }];
    setSimMessages(updated);
    setSimButtons([]); // Temporarily disable buttons

    setTimeout(() => {
      let replyText = "";
      let nextButtons: string[] = [];

      if (btnText.includes("Narxi")) {
        replyText = "🤖 Sendly tariflari:\n• Pro: 150,000 so'm/oy (1ta akkaunt)\n• Premium: 1,000,000 so'm/oy (10ta akkaunt)\n\nHozir ro'yxatdan o'tib 7 kunlik Pro versiyani tekin sinab ko'rishingiz mumkin! ⚡️";
        nextButtons = ["Tekin sinash 🚀", "Boshqa savol ❓"];
      } else if (btnText.includes("Aksiya")) {
        replyText = "🎁 Ha! Hozir yangi foydalanuvchilar uchun 7 kunlik sinov muddati mutlaqo bepul. Hech qanday karta bog'lash shart emas!";
        nextButtons = ["Ro'yxatdan o'tish 🌟", "Boshqa savol ❓"];
      } else if (btnText.includes("Qanday ulanadi")) {
        replyText = "🔌 Juda oson:\n1. Saytimizda ro'yxatdan o'tasiz.\n2. Facebook profil orqali Instagram Professional hisobingizni ulaysiz.\n3. Tayyor! Bot avtomatik ishga tushadi.";
        nextButtons = ["Ulab ko'rish 🔗", "Boshqa savol ❓"];
      } else if (btnText.includes("Boshqa savol") || btnText.includes("Orqaga")) {
        replyText = "Sizga qanday yordam bera olaman? Tanlang:";
        nextButtons = ["Narxi qancha? 💰", "Aksiya bormi? 🎁", "Qanday ulanadi? 🔌"];
      } else {
        replyText = "Ajoyib tanlov! Tizimda to'liq sozlash va chatbot bloklarini vizual quruvchi orqali o'zingiz xohlagancha yasashingiz mumkin. Boshlaymizmi?";
        nextButtons = ["Ha, boshlaymiz! 🔥", "Orqaga 🔙"];
      }

      setSimMessages([...updated, { sender: "bot" as const, text: replyText }]);
      setSimButtons(nextButtons);
    }, 800);
  };

  const faqs = [
    {
      q: "Sendly o'zi nima va u qanday ishlaydi?",
      a: "Sendly — bu Instagram Professional akkauntlari uchun avtomatlashtirilgan chatbot va marketing platformasi. U mijozlaringiz sizga Direct'da yozganda yoki postlaringiz ostida izoh qoldirganda avtomatik ravishda soniyalar ichida javob berish, havolalar yuborish va savdoni oshirish imkonini beradi."
    },
    {
      q: "Instagram akkauntim bloklanib ketmaydimi?",
      a: "Yo'q. Sendly rasmiy Meta Graph API orqali ishlaydi. Biz hech qanday norasmiy skriptlar yoki parollarni talab qilmaymiz, shuning uchun akkauntingiz mutlaqo xavfsiz va bloklanish xavfidan xoli bo'ladi."
    },
    {
      q: "Arizalarni (Lead generation) AI yordamida saralash qanday ishlaydi?",
      a: "Mijozlar reklama formalaridan ariza yuborishganda, tizim OpenAI (GPT) yordamida ularning savollari va ehtiyojlarini tahlil qiladi hamda arizalarni avtomatik tarzda 'Sotuvlar' (sales) yoki 'Qo'llab-quvvatlash' (support) guruhlariga saralab beradi."
    },
    {
      q: "Bepul sinov muddati bormi?",
      a: "Ha! Barcha yangi ro'yxatdan o'tgan foydalanuvchilarga pro funksiyalardan foydalanish uchun 7 kunlik bepul sinov muddati taqdim etiladi."
    },
    {
      q: "To'lovlarni qanday amalga oshirsa bo'ladi?",
      a: "Sayt orqali UzCard, Humo, Visa yoki MasterCard kartalarini xavfsiz bog'lash orqali obunani faollashtirishingiz mumkin."
    }
  ];

  return (
    <div className="min-h-screen bg-[#070708] text-[#E8E8E8] font-sans overflow-x-hidden selection:bg-[#C7F33C] selection:text-[#070708]">
      
      {/* Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#C7F33C]/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-[#C7F33C]/5 blur-[120px] pointer-events-none z-0" />

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#070708]/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C7F33C] text-black shadow-[0_0_20px_rgba(199,243,60,0.4)]">
              <Zap size={18} className="fill-black" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">{"Sendly"}<span className="text-[#C7F33C]">{".uz"}</span></span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-[13.5px] font-medium text-[#A0A0A5]">
            <a href="#features" className="hover:text-white transition-colors">{"Xususiyatlar"}</a>
            <a href="#simulator" className="hover:text-white transition-colors">{"Demo Bot"}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{"Tariflar"}</a>
            <a href="#faq" className="hover:text-white transition-colors">{"FAQ"}</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <button className="text-[13.5px] font-semibold text-white/90 hover:text-white px-4 py-2 transition-colors">
                {"Kirish"}
              </button>
            </Link>
            <Link href="/register">
              <button className="rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-[13.5px] font-semibold text-white px-5 py-2.5 transition-all hover:scale-105 active:scale-95">
                {"Ro'yxatdan o'tish"}
              </button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/90 hover:text-white transition-colors p-1"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/5 bg-[#070708]/95 px-6 py-5 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-medium text-[#A0A0A5] py-1 border-b border-white/5"
            >
              {"Xususiyatlar"}
            </a>
            <a 
              href="#simulator" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-medium text-[#A0A0A5] py-1 border-b border-white/5"
            >
              {"Demo Bot"}
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-medium text-[#A0A0A5] py-1 border-b border-white/5"
            >
              {"Tariflar"}
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-medium text-[#A0A0A5] py-1 border-b border-white/5"
            >
              {"FAQ"}
            </a>
            <div className="flex gap-2 mt-2">
              <Link href="/login" className="flex-1">
                <button className="w-full rounded-full border border-white/10 py-3 text-[13.5px] font-semibold text-center text-white bg-white/5">
                  {"Kirish"}
                </button>
              </Link>
              <Link href="/register" className="flex-1">
                <button className="w-full rounded-full py-3 text-[13.5px] font-semibold text-center text-black bg-[#C7F33C]">
                  {"Ro'yxatdan o'tish"}
                </button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C7F33C]/20 bg-[#C7F33C]/5 px-4 py-2 text-[11.5px] font-semibold text-[#C7F33C] mb-6 animate-pulse">
          <Sparkles size={13} className="fill-[#C7F33C]/20" />
          <span>{"INSTAGRAM CHATBOT & AI AVTOMATLASHTIRISH TIZIMI"}</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.1] md:leading-[1.05]">
          {"Instagram DMs va Izohlarini"} <br />
          <span className="bg-gradient-to-r from-[#C7F33C] via-[#E2FF7D] to-purple-400 bg-clip-text text-transparent">
            {"Savdoga Aylantiring"}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-[16px] md:text-[18.5px] text-[#A0A0A5] leading-relaxed">
          {"Mijozlarga 24/7 tezkor javob bering, izohlarga shaxsiy xabarda avtomatik javob qaytaring va arizalarni AI orqali saralang. Chatplace.io ning mukammal muqobili."}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <button className="group flex items-center gap-2 rounded-full bg-[#C7F33C] text-black px-8 py-4 text-[15px] font-bold shadow-[0_10px_30px_rgba(199,243,60,0.3)] transition-all hover:bg-[#b0d82d] hover:scale-105 active:scale-95">
              <span>{"Tekin Boshlash (7 kunlik sinov)"}</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <a href="#simulator">
            <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-4 text-[15px] font-bold text-white transition-all active:scale-95">
              <Play size={14} className="fill-white" />
              <span>{"Demoni ko'rish"}</span>
            </button>
          </a>
        </div>

        {/* Visual Bot Flow builder mock-up representation */}
        <div className="mx-auto mt-16 max-w-5xl rounded-[28px] border border-white/5 bg-[#0C0C0E] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 px-2">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[11px] text-[#707075] font-mono">{"Sendly Visual Flow Builder v1.0"}</span>
            <div className="h-3 w-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_20px_1.2fr] gap-4 items-center text-left py-6 px-4">
            
            {/* Block 1: Trigger */}
            <div className="rounded-2xl border border-[#C7F33C]/20 bg-[#C7F33C]/5 p-5 shadow-[0_8px_20px_rgba(199,243,60,0.05)]">
              <div className="flex items-center gap-2 text-[#C7F33C] text-[11px] font-bold uppercase tracking-wider mb-2">
                <Bot size={14} />
                <span>{"1-QADAM: TRIGGER (Trigger)"}</span>
              </div>
              <h4 className="text-[15px] font-bold text-white">{"Mijoz yozganda yoki izoh qoldirganda"}</h4>
              <p className="text-[12px] text-[#A0A0A5] mt-1.5 leading-relaxed">
                {"Agar yozilgan xabarda yoki post ostidagi izohda "} <span className="text-[#C7F33C] font-mono">{"\"narx\""}</span>{", "} <span className="text-[#C7F33C] font-mono">{"\"aksiya\""}</span> {" yoki "} <span className="text-[#C7F33C] font-mono">{"\"katalog\""}</span> {" so'zlari ishtirok etsa."}
              </p>
            </div>

            {/* Connection Arrow */}
            <div className="hidden md:flex justify-center text-[#C7F33C]">
              <ArrowRight size={20} />
            </div>

            {/* Block 2: Actions */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 shadow-[0_8px_20px_rgba(168,85,247,0.05)]">
              <div className="flex items-center gap-2 text-purple-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Zap size={14} />
                <span>{"2-QADAM: AVTOMATIK JAVOB"}</span>
              </div>
              <h4 className="text-[15px] font-bold text-white">{"Shaxsiy xabarda yoki izoh ostida javob berish"}</h4>
              <div className="rounded-xl bg-black/40 border border-white/5 p-3 mt-3 text-[12.5px] text-white/90 leading-relaxed font-mono">
                {"\"Assalomu alaykum, "} <span className="text-purple-400">{"{{first_name}}"}</span>{"! Katalog va chegirmalar ushbu havolada: "} <span className="text-[#C7F33C]">{"sendly.uz/katalog"}</span> {" ⚡️\""}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* METRICS / TRUST SECTION */}
      <section className="border-y border-white/5 bg-[#0C0C0E]/50 py-12">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-4xl md:text-5xl font-extrabold text-[#C7F33C] tracking-tight">{"1M+"}</span>
            <span className="text-[13px] text-[#A0A0A5] font-semibold uppercase tracking-wider">{"Yuborilgan avtomatik xabarlar"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{"99.9%"}</span>
            <span className="text-[13px] text-[#A0A0A5] font-semibold uppercase tracking-wider">{"Tizim barqarorligi (Uptime)"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl md:text-5xl font-extrabold text-[#C7F33C] tracking-tight">{"3.5x"}</span>
            <span className="text-[13px] text-[#A0A0A5] font-semibold uppercase tracking-wider">{"Mijozlar konversiyasi o'sishi"}</span>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES SECTION */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20 md:py-28 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h2 className="text-3xl font-extrabold sm:text-5xl text-white tracking-tight">
            {"Savdolarni Oshirish Uchun Barcha Qurollar"}
          </h2>
          <p className="text-[15px] md:text-[17px] text-[#A0A0A5] mt-4 leading-relaxed">
            {"Biz sizga mijozlar oqimi bilan ishlashni engillashtirish va har bir yozilgan izohni arizaga aylantirish uchun mukammal tizimni taqdim etamiz."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="rounded-[24px] border border-white/5 bg-[#0C0C0E] p-7 transition-all hover:border-white/10 hover:scale-[1.02] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
              <MessageSquare size={22} />
            </div>
            <h3 className="text-[18px] font-bold text-white">{"Direct Avtomatlashtirish"}</h3>
            <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
              {"Mijozlar Direct'da savol berishganda, bot ularga oldindan tayyorlangan tugmalar, rasm va havolalar bilan soniyalar ichida javob beradi."}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-[24px] border border-white/5 bg-[#0C0C0E] p-7 transition-all hover:border-white/10 hover:scale-[1.02] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center mb-6">
              <Share2 size={22} />
            </div>
            <h3 className="text-[18px] font-bold text-white">{"Izohlar Bilan Isoslash"}</h3>
            <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
              {"Post ostida izoh qoldirgan har bir foydalanuvchiga shaxsiy xabarda avtomatik havola yuborish orqali virusli savdoni ta'minlang."}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-[24px] border border-white/5 bg-[#0C0C0E] p-7 transition-all hover:border-white/10 hover:scale-[1.02] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
              <Award size={22} />
            </div>
            <h3 className="text-[18px] font-bold text-white">{"Geymifikatsiya va Ballar"}</h3>
            <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
              {"Foydalanuvchilarni faolligi, do'stlarini taklif qilganligi uchun ballar bilan mukofotlang. Ular o'z ballarini sovg'a yoki chegirmalarga almashtira oladilar."}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-[24px] border border-white/5 bg-[#0C0C0E] p-7 transition-all hover:border-white/10 hover:scale-[1.02] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-6">
              <Bot size={22} />
            </div>
            <h3 className="text-[18px] font-bold text-white">{"AI Agent Saralash (RAG)"}</h3>
            <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
              {"OpenAI va RAG tizimi yordamida mijoz arizalarini qualified qiladi, guruhlarga (Sotuvlar/Qo'llab-quvvatlash) ajratadi va teglar qo'shadi."}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-[24px] border border-white/5 bg-[#0C0C0E] p-7 transition-all hover:border-white/10 hover:scale-[1.02] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6">
              <MessageCircle size={22} />
            </div>
            <h3 className="text-[18px] font-bold text-white">{"Telegram Bot Runner"}</h3>
            <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
              {"Tizimga faqat Instagram emas, balki Telegram botlarini ham ulab, bitta boshqaruv paneli orqali avtomatlashtirish oqimini ishlating."}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-[24px] border border-white/5 bg-[#0C0C0E] p-7 transition-all hover:border-white/10 hover:scale-[1.02] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-6">
              <Shield size={22} />
            </div>
            <h3 className="text-[18px] font-bold text-white">{"Live Chat Takeover"}</h3>
            <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
              {"Mijoz murakkab texnik yoki sotuvga doir muammo bilan murojaat qilsa, bot muloqotni inson operatorga uzatadi va to'xtaydi."}
            </p>
          </div>

        </div>
      </section>

      {/* INTERACTIVE SIMULATOR SECTION */}
      <section id="simulator" className="mx-auto max-w-4xl px-6 py-12 md:py-20 z-10 relative">
        <div className="rounded-[32px] border border-white/5 bg-[#0C0C0E] p-6 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-8 items-center">
            
            <div className="text-left">
              <span className="text-[11px] font-bold text-[#C7F33C] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#C7F33C]/10 border border-[#C7F33C]/20 inline-block mb-4">{"INTERAKTIV SIMULYATOR"}</span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{"Botimiz Qanday Javob Berishini Tekshiring"}</h3>
              <p className="text-[13px] text-[#A0A0A5] mt-3 leading-relaxed">
                {"Tugmalardan birini bosing va o'ng tarafdagi virtual Instagram Direct chatida botning javob tezligi va formatini ko'ring."}
              </p>
              
              <div className="mt-8 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#707075] uppercase px-1">{"Variantlardan birini bosing:"}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {simButtons.map((btnText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSimButtonClick(btnText)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-[12.5px] font-medium text-white transition-all active:scale-[0.98] text-left"
                    >
                      {btnText}
                    </button>
                  ))}
                  {simButtons.length === 0 && (
                    <button
                      onClick={() => {
                        setSimMessages([
                          { sender: "bot", text: "Salom! Men Sendly avtomatlashtirilgan botiman. Instagram sahifangizni savdo mashinasiga aylantirishga tayyormisiz? 🚀" }
                        ]);
                        setSimButtons(["Narxi qancha? 💰", "Aksiya bormi? 🎁", "Qanday ulanadi? 🔌"]);
                      }}
                      className="rounded-xl border border-[#C7F33C]/20 bg-[#C7F33C]/5 text-[#C7F33C] px-5 py-2.5 text-[12.5px] font-semibold transition-all active:scale-[0.98]"
                    >
                      {"Chatni boshidan boshlash 🔄"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Virtual Direct Mockup */}
            <div className="rounded-[24px] border border-white/5 bg-[#050506] p-4 flex flex-col h-[350px] shadow-inner relative overflow-hidden">
              
              {/* Simulator header */}
              <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-[#C7F33C] text-black flex items-center justify-center font-bold text-[10px] font-mono">
                  {"IG"}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[13px] font-bold text-white leading-none">{"Sendly Bot"}</span>
                  <span className="text-[10px] text-green-400 mt-0.5 leading-none">{"● Onlayn"}</span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 py-1">
                {simMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={[
                      "max-w-[85%] rounded-[18px] px-3.5 py-2.5 text-[12px] leading-relaxed text-left",
                      msg.sender === "user" 
                        ? "bg-[#C7F33C] text-black self-end rounded-tr-none font-medium" 
                        : "bg-white/5 text-white/90 self-start rounded-tl-none border border-white/5"
                    ].join(" ")}
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 md:py-28 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold sm:text-5xl text-white tracking-tight">{"Har Qanday Biznes Uchun Oddiy Tariflar"}</h2>
          <p className="text-[15px] md:text-[17px] text-[#A0A0A5] mt-4 leading-relaxed">
            {"Hozir ulaning va barcha Pro imkoniyatlarini bepul 7 kunlik sinov muddati bilan his qiliying. Hech qanday kredit karta so'ralmaydi."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Plan Pro */}
          <div className="rounded-[32px] border border-white/10 bg-[#0C0C0E] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div>
              <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-[16px] tracking-wider">{"POPULAR"}</div>
              <h3 className="text-xl font-bold text-white">{"PRO Plan"}</h3>
              <p className="text-[12.5px] text-[#A0A0A5] mt-2 leading-relaxed">{"Kichik va o'rta bizneslar uchun ideal reja."}</p>
              
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{"150,000"}</span>
                <span className="text-[#A0A0A5] text-[13.5px] font-semibold">{"so'm / oy"}</span>
              </div>

              <hr className="border-white/5 my-8" />

              <ul className="flex flex-col gap-4 text-[13.5px] text-white/95">
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"1 ta Instagram Professional akkaunt"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Cheksiz avtomatlashtirish oqimlari (flows)"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Izohlar va Direct xabarlariga avtomatik javoblar"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Referral tizimi va Ballar to'plash"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"1 ta Telegram Bot ulash (Sinov rejimda)"}</span>
                </li>
              </ul>
            </div>

            <Link href="/register" className="mt-10">
              <button className="w-full rounded-full bg-[#C7F33C] text-black py-4 text-[14.5px] font-bold shadow-[0_10px_20px_rgba(199,243,60,0.15)] hover:bg-[#b0d82d] active:scale-[0.98] transition-all">
                {"Bepul sinab ko'rish"}
              </button>
            </Link>
          </div>

          {/* Plan Premium */}
          <div className="rounded-[32px] border border-white/5 bg-[#0C0C0E]/60 p-8 md:p-10 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-xl font-bold text-white">{"PREMIUM Plan"}</h3>
              <p className="text-[12.5px] text-[#A0A0A5] mt-2 leading-relaxed">{"Katta agentliklar va kengaytirilgan marketing oqimlari uchun."}</p>
              
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{"1,000,000"}</span>
                <span className="text-[#A0A0A5] text-[13.5px] font-semibold">{"so'm / oy"}</span>
              </div>

              <hr className="border-white/5 my-8" />

              <ul className="flex flex-col gap-4 text-[13.5px] text-white/95">
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"10 ta Instagram Professional akkaunt"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Cheksiz avtomatlashtirish oqimlari (flows)"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"OpenAI & AI Agent Qualification"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"VIP qo'llab-quvvatlash (24/7 shaxsiy menejer)"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/10 text-[#C7F33C] flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"10 tagacha Telegram Bot ulash imkoni"}</span>
                </li>
              </ul>
            </div>

            <Link href="/register" className="mt-10">
              <button className="w-full rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 py-4 text-[14.5px] font-bold text-white active:scale-[0.98] transition-all">
                {"Bog'lanish va ulash"}
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-20 z-10 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold sm:text-5xl text-white tracking-tight">{"Ko'p Beriladigan Savollar"}</h2>
          <p className="text-[14.5px] text-[#A0A0A5] mt-3">{"Sendly tizimi bo'yicha eng ko'p so'raladigan savollarga javoblar."}</p>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-2xl border border-white/5 bg-[#0C0C0E] overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-[14.5px] md:text-[15.5px] text-white hover:text-[#C7F33C] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-[#A0A0A5] transition-transform duration-200 ${activeFaq === idx ? "rotate-180 text-[#C7F33C]" : ""}`} 
                />
              </button>
              
              {activeFaq === idx && (
                <div className="px-6 pb-5 text-[13px] md:text-[13.5px] text-[#A0A0A5] leading-relaxed border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <section className="border-t border-white/5 bg-[#08080A] py-16 text-center z-10 relative">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-extrabold sm:text-5xl text-white tracking-tight">{"Instagram marketingingizni bugunoq yangilang"}</h2>
          <p className="text-[14.5px] text-[#A0A0A5] mt-4 max-w-2xl mx-auto leading-relaxed">
            {"Biznes arizalarni avtomatlashtiring, mijozlar kutib qolishining oldini oling va foyda hajmini oshiring."}
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/register">
              <button className="flex items-center gap-2 rounded-full bg-[#C7F33C] text-black px-8 py-4 text-[15px] font-bold shadow-[0_10px_30px_rgba(199,243,60,0.2)] hover:scale-105 transition-all">
                <span>{"Tekin sinab ko'rish"}</span>
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>

          <hr className="border-white/5 my-12" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12.5px] text-[#707075] px-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-[#C7F33C] text-black flex items-center justify-center">
                <Zap size={10} className="fill-black" />
              </div>
              <span className="font-bold text-white">{"Sendly.uz"}</span>
              <span>{"© 2026. Barcha huquqlar himoyalangan."}</span>
            </div>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">{"Maxfiylik kelishuvi"}</Link>
              <a href="#" className="hover:text-white transition-colors">{"Foydalanish shartlari"}</a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
