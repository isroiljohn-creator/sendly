"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Home as HomeIcon, X, Send, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type Message = {
  id: string;
  sender: "user" | "support";
  text: string;
  time: string;
};

export function SupportWidget() {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "chat">("home");
  const [unreadCount, setUnreadCount] = useState(2);
  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "support",
      text: lang === "uz" 
        ? "Salom! Men Sendly qo'llab-quvvatlash xizmati yordamchisiman. Sizga qanday yordam bera olaman?" 
        : lang === "ru" 
        ? "Привет! Я помощник службы поддержки Sendly. Чем я могу вам помочь?" 
        : "Hello! I am the Sendly support assistant. How can I help you today?",
      time: "10:30"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Localization dict
  const dict = {
    uz: {
      greeting: "Salom 👋\nSizga qanday yordam bera olamiz?",
      sendMessage: "Xabar yuborish",
      home: "Bosh sahifa",
      chat: "Chat",
      placeholder: "Xabaringizni yozing...",
      typing: "Operator yozmoqda...",
      faq_title: "Tezkor havolalar",
      faq_1: "Kanalni qanday ulash kerak?",
      faq_2: "Tariflar va to'lovlar haqida",
      faq_3: "Chatbot ishlamayapti, nima qilish kerak?",
    },
    ru: {
      greeting: "Привет 👋\nЧем мы можем помочь?",
      sendMessage: "Отправить сообщение",
      home: "Главная",
      chat: "Чат",
      placeholder: "Напишите сообщение...",
      typing: "Оператор пишет...",
      faq_title: "Быстрые ссылки",
      faq_1: "Как подключить канал?",
      faq_2: "О тарифах и оплате",
      faq_3: "Что делать, если бот не работает?",
    },
    en: {
      greeting: "Hello 👋\nHow can we help you?",
      sendMessage: "Send a message",
      home: "Home",
      chat: "Chat",
      placeholder: "Type a message...",
      typing: "Support is typing...",
      faq_title: "Quick links",
      faq_1: "How to connect a channel?",
      faq_2: "About billing & plans",
      faq_3: "What to do if bot is not working?",
    }
  };

  const t = dict[lang === "uz" || lang === "ru" || lang === "en" ? lang : "uz"];

  // Clear unread count when opening chat tab
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      setUnreadCount(0);
    }
  }, [isOpen, activeTab]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputVal.trim()) return;

    const userMsgText = inputVal;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: userMsgText,
      time: timeStr
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputVal("");
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      let replyText = "";
      const textLower = userMsgText.toLowerCase();

      if (lang === "uz") {
        if (textLower.includes("salom") || textLower.includes("assalom")) {
          replyText = "Assalomu alaykum! Sizga yordam berishdan mamnunman. Muammoingiz haqida batafsilroq yozsangiz, darhol hal qilamiz. 😊";
        } else if (textLower.includes("kanal") || textLower.includes("instagram") || textLower.includes("telegram") || textLower.includes("ulash")) {
          replyText = "Kanal ulash uchun tepadagi akkaunt tanlash bo'limidan 'Akkaunt qo'shish' havolasiga bosing. Telegram yoki Instagram profilingizni ulashingiz mumkin. ⚙️";
        } else if (textLower.includes("tarif") || textLower.includes("to'lov") || textLower.includes("pul") || textLower.includes("narx")) {
          replyText = "Tizimda PRO va Premium tariflari mavjud. Ularni 'Mening akkauntim' -> 'To'lov va tariflar' bo'limida tahlil qilishingiz va yangilashingiz mumkin. 💳";
        } else {
          replyText = "Tushunarli. Xabaringiz qabul qilindi. Tez orada operatorlarimiz siz bilan bog'lanishadi! Rahmat. 🙏";
        }
      } else if (lang === "ru") {
        if (textLower.includes("привет") || textLower.includes("здравст")) {
          replyText = "Здравствуйте! Рад помочь вам. Пожалуйста, опишите вашу проблему подробнее, и мы ее решим. 😊";
        } else if (textLower.includes("канал") || textLower.includes("инстаграм") || textLower.includes("телеграм") || textLower.includes("подключ")) {
          replyText = "Чтобы подключить канал, нажмите на 'Добавить аккаунт' в выпадающем меню выбора аккаунтов наверху. Поддерживаются Telegram и Instagram. ⚙️";
        } else if (textLower.includes("тариф") || textLower.includes("оплат") || textLower.includes("цена") || textLower.includes("деньг")) {
          replyText = "У нас есть тарифы PRO и Premium. Вы можете ознакомиться с ними и настроить их в меню 'Мой аккаунт' -> 'Оплата и тарифы'. 💳";
        } else {
          replyText = "Понятно. Ваше сообщение отправлено в поддержку. Наш оператор ответит вам в ближайшее время! Спасибо. 🙏";
        }
      } else {
        if (textLower.includes("hello") || textLower.includes("hi")) {
          replyText = "Hello! Glad to help. Please describe your issue in more detail and we will solve it shortly. 😊";
        } else if (textLower.includes("channel") || textLower.includes("connect") || textLower.includes("instagram") || textLower.includes("telegram")) {
          replyText = "To connect a channel, click 'Add Account' in the account selection dropdown at the top bar. You can link Telegram and Instagram. ⚙️";
        } else if (textLower.includes("plan") || textLower.includes("price") || textLower.includes("billing") || textLower.includes("pay")) {
          replyText = "We offer PRO and Premium plans. You can view them and subscribe under 'My Account' -> 'Billing & Plans'. 💳";
        } else {
          replyText = "Got it. Your message has been forwarded. A support representative will get back to you shortly! Thank you. 🙏";
        }
      }

      const replyMsg: Message = {
        id: `s_${Date.now()}`,
        sender: "support",
        text: replyText,
        time: timeStr
      };

      setMessages((prev) => [...prev, replyMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full bg-[#1a5cff] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all select-none duration-150"
      >
        {isOpen ? (
          <ChevronDown size={24} className="animate-in fade-in zoom-in-50 duration-200" />
        ) : (
          <div className="relative">
            <MessageSquare size={22} className="animate-in fade-in zoom-in-50 duration-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Support Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[100] w-[360px] h-[550px] bg-white rounded-[24px] shadow-2xl border border-[#E8E8E8] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-[#1a5cff] p-5 pb-7 relative flex flex-col text-white">
            {/* Top row: Avatars & Close */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Agent 1"
                  className="h-8 w-8 rounded-full border border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Agent 2"
                  className="h-8 w-8 rounded-full border border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Agent 3"
                  className="h-8 w-8 rounded-full border border-white object-cover"
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Greeting */}
            <h3 className="text-[20px] font-bold leading-snug whitespace-pre-line mb-4">
              {t.greeting}
            </h3>

            {/* Send Message Button inside Header (if on Home tab) */}
            {activeTab === "home" && (
              <button
                onClick={() => setActiveTab("chat")}
                className="w-full bg-white text-black px-4 py-3 rounded-full flex items-center justify-between text-[13px] font-bold shadow-md hover:bg-neutral-50 active:scale-[0.98] transition-all"
              >
                <span>{t.sendMessage}</span>
                <Send size={14} className="text-[#1a5cff]" />
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white overflow-y-auto p-4 min-h-0">
            {activeTab === "home" ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="p-4 rounded-[16px] bg-[#f5f8ff] border border-[#e1ebff]">
                  <h4 className="text-[12px] font-bold text-[#1a5cff] uppercase tracking-wider mb-2">
                    {t.faq_title}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {[t.faq_1, t.faq_2, t.faq_3].map((faq, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setActiveTab("chat");
                          setInputVal(faq);
                        }}
                        className="text-[12px] text-left text-neutral-800 hover:text-[#1a5cff] py-1 border-b border-dashed border-neutral-200 transition-colors"
                      >
                        {faq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Chat Window
              <div className="flex flex-col gap-3 h-full justify-between">
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
                  {messages.map((m) => {
                    const isUser = m.sender === "user";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[80%] ${
                          isUser ? "self-end items-end" : "self-start items-start"
                        }`}
                      >
                        <div
                          className={`px-4 py-2.5 rounded-[18px] text-[12px] leading-relaxed shadow-sm ${
                            isUser
                              ? "bg-[#1a5cff] text-white rounded-tr-[4px]"
                              : "bg-[#F3F4F6] text-black rounded-tl-[4px]"
                          }`}
                        >
                          {m.text}
                        </div>
                        <span className="text-[9px] text-neutral-400 mt-1 px-1">
                          {m.time}
                        </span>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="self-start flex flex-col gap-1 max-w-[80%]">
                      <div className="bg-[#F3F4F6] text-neutral-500 text-[11px] px-4 py-2.5 rounded-[18px] rounded-tl-[4px] flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-[9px] text-neutral-400 px-1">{t.typing}</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex gap-2 items-center border-t border-neutral-100 pt-3">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t.placeholder}
                    className="flex-1 bg-[#F3F4F6] text-[12px] px-4 py-2.5 rounded-full border-none outline-none text-black placeholder:text-neutral-400"
                  />
                  <button
                    onClick={handleSend}
                    className="h-9 w-9 rounded-full bg-[#1a5cff] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Tabs */}
          <div className="h-[64px] border-t border-neutral-100 flex items-center justify-around px-4 select-none shrink-0 bg-white">
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
                activeTab === "home" ? "text-[#1a5cff]" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <HomeIcon size={18} />
              <span>{t.home}</span>
            </button>

            {/* Chat Tab */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold relative transition-colors ${
                activeTab === "chat" ? "text-[#1a5cff]" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <div className="relative">
                <MessageSquare size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span>{t.chat}</span>
            </button>
          </div>

        </div>
      )}
    </>
  );
}
