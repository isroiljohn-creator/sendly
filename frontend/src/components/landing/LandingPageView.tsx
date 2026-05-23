"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { 
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
  User as UserIcon
} from "lucide-react";

// Interactive Simulator Messages
interface SimMessage {
  sender: "user" | "bot";
  text: string;
}

// 3D Tilt Robot Container
function Robot3DContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const card = containerRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Max rotation is 12 degrees
    const rX = -(y / (rect.height / 2)) * 12;
    const rY = (x / (rect.width / 2)) * 12;
    
    setTransformStyle(`rotateX(${rX}deg) rotateY(${rY}deg) scale(1.02)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle("");
  };

  return (
    <div 
      className="relative flex items-center justify-center p-4 transition-transform duration-300 ease-out cursor-pointer z-10"
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(1deg);
          }
        }
        @keyframes shadow {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateX(-50%) scale(0.85);
            opacity: 0.15;
          }
        }
      `}</style>
      <div 
        ref={containerRef}
        className="relative flex items-center justify-center transition-all duration-300 ease-out select-none"
        style={{ transform: transformStyle, transformStyle: "preserve-3d" }}
      >
        {/* Glow behind the robot */}
        <div className="absolute h-[340px] w-[340px] rounded-full bg-[#C7F33C]/20 blur-[60px] -z-10 animate-pulse" />
        
        {/* 3D Robot Image */}
        <img 
          src="/robot.png" 
          alt="Sendly 3D Waving Robot" 
          className="w-[320px] sm:w-[400px] h-[320px] sm:h-[400px] object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.06)]"
          style={{ animation: "float 6s ease-in-out infinite" }}
        />

        {/* Dynamic lower shadow */}
        <div 
          className="absolute bottom-[-15px] left-1/2 w-[220px] h-[20px] rounded-full bg-black/10 blur-[10px] -z-10" 
          style={{ animation: "shadow 6s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-[#FAFAF9] text-[#0C0C0E] font-sans overflow-x-hidden selection:bg-[#C7F33C] selection:text-[#0C0C0E]">
      
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-[22px] font-[900] tracking-tighter text-black uppercase flex items-center gap-1.5">
                {"Sendly"}
                <span className="h-2 w-2 rounded-full bg-[#C7F33C]" />
              </span>
            </Link>
            
            {/* Language Selector Dropdown style */}
            <div className="flex items-center gap-1 text-[12px] font-semibold text-black/60 bg-[#F0F0F0] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#E8E8E8] transition-colors">
              <span>{"UZ"}</span>
              <ChevronDown size={12} />
            </div>
          </div>

          {/* Center Navigation Menu */}
          <nav className="hidden md:flex items-center gap-8 text-[13.5px] font-bold text-black/60">
            <a href="#features" className="hover:text-black transition-colors">{"Yechimlar"}</a>
            <a href="#pricing" className="hover:text-black transition-colors">{"Tariflar"}</a>
            <a href="#simulator" className="hover:text-black transition-colors">{"Mini-kurs"}</a>
            <a href="#features" className="hover:text-black transition-colors">{"Hamkorlar"}</a>
            <a href="#faq" className="hover:text-black transition-colors">{"Manbalar"}</a>
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors">
                <UserIcon size={18} className="text-black" />
              </button>
            </Link>
            <Link href="/register">
              <button className="rounded-full bg-black text-white hover:bg-black/95 text-[13.5px] font-bold px-5 py-2.5 transition-all hover:scale-105 active:scale-95 shadow-sm">
                {"Try it for free"}
              </button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-black hover:text-black/85 transition-colors p-1"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E8E8E8] bg-white px-6 py-5 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-bold text-black/60 py-1 border-b border-[#E8E8E8]"
            >
              {"Yechimlar"}
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-bold text-black/60 py-1 border-b border-[#E8E8E8]"
            >
              {"Tariflar"}
            </a>
            <a 
              href="#simulator" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-bold text-black/60 py-1 border-b border-[#E8E8E8]"
            >
              {"Mini-kurs"}
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[14.5px] font-bold text-black/60 py-1 border-b border-[#E8E8E8]"
            >
              {"Manbalar"}
            </a>
            <div className="flex gap-2 mt-2">
              <Link href="/login" className="flex-1">
                <button className="w-full rounded-full border border-[#E8E8E8] py-3 text-[13.5px] font-bold text-center text-black bg-[#F5F5F3]">
                  {"Kirish"}
                </button>
              </Link>
              <Link href="/register" className="flex-1">
                <button className="w-full rounded-full py-3 text-[13.5px] font-bold text-center text-white bg-black">
                  {"Try it for free"}
                </button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* NEW ALERT BANNER */}
      <div className="w-full bg-[#120024] py-3 text-center text-[12px] font-bold text-white tracking-wide">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-[#C7F33C] text-black px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">{"NEW"}</span>
          <span>{"Virale — AI Agent for viral content"}</span>
          <ArrowRight size={13} className="inline ml-0.5" />
        </span>
      </div>

      {/* HERO SECTION */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-28 text-center z-10 flex flex-col items-center">
        
        {/* Title */}
        <h1 className="mx-auto max-w-4xl text-[38px] sm:text-[62px] md:text-[80px] font-[900] tracking-tighter text-black leading-[1.05] sm:leading-[1] text-center">
          {"Unlock the power of"} <br />
          {"your content and chats"}
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-[580px] text-[15px] sm:text-[18px] text-black/50 leading-relaxed font-medium">
          {"AI Agents and chatbots to help you grow followers, engage and sell on Instagram & TikTok. Set up from your phone in minutes"}
        </p>

        {/* CTA Button */}
        <div className="mt-8">
          <Link href="/register">
            <button className="group inline-flex items-center gap-2.5 rounded-full bg-[#C7F33C] text-black px-8 py-4 text-[16px] font-extrabold transition-all hover:scale-105 active:scale-95 shadow-[0_10px_25px_rgba(199,243,60,0.35)]">
              <span>{"Try it for Free"}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[#C7F33C]">
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </Link>
        </div>

        {/* Mascot Center 3D visual */}
        <div className="mt-14 w-full max-w-[500px] flex justify-center">
          <Robot3DContainer />
        </div>

      </section>

      {/* SLANTED MAGENTA DIVIDER ACCENT */}
      <div className="relative w-full h-[60px] sm:h-[120px] bg-[#E1007A] -skew-y-3 origin-top-left -mt-8 z-0 overflow-hidden">
        <div className="w-full h-full bg-[#120024]/5" />
      </div>

      {/* DETAILED FEATURES SECTION */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 z-10 relative bg-[#FAFAF9]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-[900] sm:text-5xl text-black tracking-tight">
            {"Savdolarni Oshirish Uchun Barcha Qurollar"}
          </h2>
          <p className="text-[15px] md:text-[16px] text-black/50 mt-4 leading-relaxed font-medium">
            {"Biz sizga mijozlar oqimi bilan ishlashni engillashtirish va har bir yozilgan izohni arizaga aylantirish uchun mukammal tizimni taqdim etamiz."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-7 transition-all hover:border-[#C7F33C] hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
              <MessageSquare size={22} />
            </div>
            <h3 className="text-[18px] font-extrabold text-black">{"Direct Avtomatlashtirish"}</h3>
            <p className="text-[13px] text-black/50 mt-3 leading-relaxed">
              {"Mijozlar Direct'da savol berishganda, bot ularga oldindan tayyorlangan tugmalar, rasm va havolalar bilan soniyalar ichida javob beradi."}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-7 transition-all hover:border-[#C7F33C] hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
            <div className="h-12 w-12 rounded-2xl bg-[#C7F33C]/10 text-black flex items-center justify-center mb-6">
              <Share2 size={22} />
            </div>
            <h3 className="text-[18px] font-extrabold text-black">{"Izohlar Bilan Isoslash"}</h3>
            <p className="text-[13px] text-black/50 mt-3 leading-relaxed">
              {"Post ostida izoh qoldirgan har bir foydalanuvchiga shaxsiy xabarda avtomatik havola yuborish orqali virusli savdoni ta'minlang."}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-7 transition-all hover:border-[#C7F33C] hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6">
              <Award size={22} />
            </div>
            <h3 className="text-[18px] font-extrabold text-black">{"Geymifikatsiya va Ballar"}</h3>
            <p className="text-[13px] text-black/50 mt-3 leading-relaxed">
              {"Foydalanuvchilarni faolligi, do'stlarini taklif qilganligi uchun ballar bilan mukofotlang. Ular o'z ballarini sovg'a yoki chegirmalarga almashtira oladilar."}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-7 transition-all hover:border-[#C7F33C] hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6">
              <Bot size={22} />
            </div>
            <h3 className="text-[18px] font-extrabold text-black">{"AI Agent Saralash (RAG)"}</h3>
            <p className="text-[13px] text-black/50 mt-3 leading-relaxed">
              {"OpenAI va RAG tizimi yordamida mijoz arizalarini qualified qiladi, guruhlarga (Sotuvlar/Qo'llab-quvvatlash) ajratadi va teglar qo'shadi."}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-7 transition-all hover:border-[#C7F33C] hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center mb-6">
              <MessageCircle size={22} />
            </div>
            <h3 className="text-[18px] font-extrabold text-black">{"Telegram Bot Runner"}</h3>
            <p className="text-[13px] text-black/50 mt-3 leading-relaxed">
              {"Tizimga faqat Instagram emas, balki Telegram botlarini ham ulab, bitta boshqaruv paneli orqali avtomatlashtirish oqimini ishlating."}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-7 transition-all hover:border-[#C7F33C] hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-6">
              <Shield size={22} />
            </div>
            <h3 className="text-[18px] font-extrabold text-black">{"Live Chat Takeover"}</h3>
            <p className="text-[13px] text-black/50 mt-3 leading-relaxed">
              {"Mijoz murakkab texnik yoki sotuvga doir muammo bilan murojaat qilsa, bot muloqotni inson operatorga uzatadi va to'xtaydi."}
            </p>
          </div>

        </div>
      </section>

      {/* INTERACTIVE SIMULATOR SECTION */}
      <section id="simulator" className="mx-auto max-w-5xl px-6 py-12 md:py-20 z-10 relative">
        <div className="rounded-[32px] border border-[#E8E8E8] bg-white p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 items-center">
            
            <div className="text-left">
              <span className="text-[11px] font-extrabold text-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#C7F33C] inline-block mb-4">{"INTERAKTIV SIMULYATOR"}</span>
              <h3 className="text-2xl md:text-3xl font-[900] text-black leading-tight">{"Botimiz Qanday Javob Berishini Tekshiring"}</h3>
              <p className="text-[13.5px] text-black/50 mt-3 leading-relaxed font-medium">
                {"Tugmalardan birini bosing va o'ng tarafdagi virtual Instagram Direct chatida botning javob tezligi va formatini ko'ring."}
              </p>
              
              <div className="mt-8 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-black/40 uppercase px-1">{"Variantlardan birini bosing:"}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {simButtons.map((btnText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSimButtonClick(btnText)}
                      className="rounded-xl border border-[#E8E8E8] bg-[#FAFAF9] hover:bg-[#F0F0F0] px-4 py-2.5 text-[12.5px] font-bold text-black transition-all active:scale-[0.98] text-left"
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
                      className="rounded-xl border border-[#C7F33C]/40 bg-[#C7F33C]/10 text-black px-5 py-2.5 text-[12.5px] font-extrabold transition-all active:scale-[0.98]"
                    >
                      {"Chatni boshidan boshlash 🔄"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Virtual Direct Mockup */}
            <div className="rounded-[24px] border border-black/5 bg-[#050506] p-4 flex flex-col h-[350px] shadow-inner relative overflow-hidden">
              
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
                        ? "bg-[#C7F33C] text-black self-end rounded-tr-none font-bold" 
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
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 md:py-24 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-[900] sm:text-5xl text-black tracking-tight">{"Har Qanday Biznes Uchun Oddiy Tariflar"}</h2>
          <p className="text-[15px] md:text-[16px] text-black/50 mt-4 leading-relaxed font-medium">
            {"Hozir ulaning va barcha Pro imkoniyatlarini bepul 7 kunlik sinov muddati bilan his qiliying. Hech qanday kredit karta so'ralmaydi."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Plan Pro */}
          <div className="rounded-[32px] border border-[#E8E8E8] bg-white p-8 md:p-10 relative overflow-hidden flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
            <div>
              <div className="absolute top-0 right-0 bg-[#C7F33C] text-black text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-[16px] tracking-wider">{"POPULAR"}</div>
              <h3 className="text-xl font-extrabold text-black text-left">{"PRO Plan"}</h3>
              <p className="text-[12.5px] text-black/50 mt-2 leading-relaxed text-left">{"Kichik va o'rta bizneslar uchun ideal reja."}</p>
              
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl md:text-5xl font-[900] text-black tracking-tight">{"150,000"}</span>
                <span className="text-black/50 text-[13.5px] font-semibold">{"so'm / oy"}</span>
              </div>

              <hr className="border-[#E8E8E8] my-8" />

              <ul className="flex flex-col gap-4 text-[13.5px] text-black/85 text-left">
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"1 ta Instagram Professional akkaunt"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Cheksiz avtomatlashtirish oqimlari (flows)"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Izohlar va Direct xabarlariga avtomatik javoblar"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Referral tizimi va Ballar to'plash"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"1 ta Telegram Bot ulash (Sinov rejimda)"}</span>
                </li>
              </ul>
            </div>

            <Link href="/register" className="mt-10">
              <button className="w-full rounded-full bg-black text-white hover:bg-black/95 py-4 text-[14.5px] font-bold active:scale-[0.98] transition-all">
                {"Bepul sinab ko'rish"}
              </button>
            </Link>
          </div>

          {/* Plan Premium */}
          <div className="rounded-[32px] border border-[#E8E8E8] bg-white p-8 md:p-10 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
            <div>
              <h3 className="text-xl font-extrabold text-black text-left">{"PREMIUM Plan"}</h3>
              <p className="text-[12.5px] text-black/50 mt-2 leading-relaxed text-left">{"Katta agentliklar va kengaytirilgan marketing oqimlari uchun."}</p>
              
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl md:text-5xl font-[900] text-black tracking-tight">{"1,000,000"}</span>
                <span className="text-black/50 text-[13.5px] font-semibold">{"so'm / oy"}</span>
              </div>

              <hr className="border-[#E8E8E8] my-8" />

              <ul className="flex flex-col gap-4 text-[13.5px] text-black/85 text-left">
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"10 ta Instagram Professional akkaunt"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"Cheksiz avtomatlashtirish oqimlari (flows)"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"OpenAI & AI Agent Qualification"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"VIP qo'llab-quvvatlash (24/7 shaxsiy menejer)"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#C7F33C]/20 text-black flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  <span>{"10 tagacha Telegram Bot ulash imkoni"}</span>
                </li>
              </ul>
            </div>

            <Link href="/register" className="mt-10">
              <button className="w-full rounded-full border border-[#E8E8E8] bg-[#FAFAF9] hover:bg-[#F0F0F0] text-black py-4 text-[14.5px] font-bold active:scale-[0.98] transition-all">
                {"Bog'lanish va ulash"}
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-20 z-10 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-[900] sm:text-5xl text-black tracking-tight">{"Ko'p Beriladigan Savollar"}</h2>
          <p className="text-[14.5px] text-black/50 mt-3 font-medium">{"Sendly tizimi bo'yicha eng ko'p so'raladigan savollarga javoblar."}</p>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-2xl border border-[#E8E8E8] bg-white overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-[14.5px] md:text-[15.5px] text-black hover:text-[#C7F33C] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-black/30 transition-transform duration-200 ${activeFaq === idx ? "rotate-180 text-black" : ""}`} 
                />
              </button>
              
              {activeFaq === idx && (
                <div className="px-6 pb-5 text-[13px] md:text-[13.5px] text-black/50 leading-relaxed border-t border-[#E8E8E8] pt-4 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <section className="border-t border-[#E8E8E8] bg-white py-16 text-center z-10 relative">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-[900] sm:text-5xl text-black tracking-tight">{"Instagram marketingingizni bugunoq yangilang"}</h2>
          <p className="text-[14.5px] text-black/50 mt-4 max-w-2xl mx-auto leading-relaxed font-medium">
            {"Biznes arizalarni avtomatlashtiring, mijozlar kutib qolishining oldini oling va foyda hajmini oshiring."}
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/register">
              <button className="flex items-center gap-2 rounded-full bg-black text-white px-8 py-4 text-[15px] font-bold shadow-sm hover:scale-105 transition-all">
                <span>{"Tekin sinab ko'rish"}</span>
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>

          <hr className="border-[#E8E8E8] my-12" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12.5px] text-black/40 px-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-[900] tracking-tighter text-black uppercase flex items-center gap-1">
                {"Sendly"}
                <span className="h-1.5 w-1.5 rounded-full bg-[#C7F33C]" />
              </span>
              <span>{"© 2026. Barcha huquqlar himoyalangan."}</span>
            </div>
            <div className="flex gap-4 font-semibold text-black/60">
              <Link href="/privacy" className="hover:text-black transition-colors">{"Maxfiylik kelishuvi"}</Link>
              <a href="#" className="hover:text-black transition-colors">{"Foydalanish shartlari"}</a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
