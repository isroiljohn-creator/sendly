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
  const [unreadCount, setUnreadCount] = useState(0);
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
      faq_title: "TEZKOR HAVOLALAR",
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
      faq_title: "БЫСТРЫЕ ССЫЛКИ",
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
      faq_title: "QUICK LINKS",
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

  const handleSend = async () => {
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

    try {
      // Keep only last 8 messages for context to stay within token limits
      const chatHistory = [...messages, newMsg].slice(-8);

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory })
      });

      if (res.ok) {
        const data = await res.json();
        const replyMsg: Message = {
          id: `s_${Date.now()}`,
          sender: "support",
          text: data.text || "Kechirasiz, javob olishda xatolik yuz berdi.",
          time: timeStr
        };
        setMessages((prev) => [...prev, replyMsg]);
      } else {
        throw new Error("Failed to contact support API");
      }
    } catch (err) {
      console.error("Support chat error:", err);
      const replyMsg: Message = {
        id: `s_${Date.now()}`,
        sender: "support",
        text: "Hozirda tizimda uzilish yuz berdi. Savollaringizga elektron pochta (6220v1@gmail.com) orqali yordam bera olamiz.",
        time: timeStr
      };
      setMessages((prev) => [...prev, replyMsg]);
    } finally {
      setIsTyping(false);
    }
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
        className="fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full bg-black text-[#C7F33C] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all select-none duration-150 border border-neutral-800"
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
          <div className="bg-black p-5 pb-7 relative flex flex-col text-white border-b border-neutral-900">
            {/* Top row: Avatars & Close */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Agent 1"
                  className="h-8 w-8 rounded-full border border-black object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Agent 2"
                  className="h-8 w-8 rounded-full border border-black object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Agent 3"
                  className="h-8 w-8 rounded-full border border-black object-cover"
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full p-1 transition-colors"
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
                className="w-full bg-[#C7F33C] text-black px-4 py-3 rounded-full flex items-center justify-between text-[13px] font-extrabold shadow-md hover:bg-[#b0d830] active:scale-[0.98] transition-all"
              >
                <span>{t.sendMessage}</span>
                <Send size={14} className="text-black" />
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white overflow-y-auto p-4 min-h-0">
            {activeTab === "home" ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="p-4 rounded-[16px] bg-[#F9F9F7] border border-[#E8E8E8]">
                  <h4 className="text-[12px] font-bold text-black uppercase tracking-wider mb-2">
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
                        className="text-[12px] text-left text-neutral-700 hover:text-black hover:font-semibold py-1 border-b border-dashed border-[#E8E8E8] transition-colors"
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
                              ? "bg-black text-white rounded-tr-[4px]"
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
                    className="h-9 w-9 rounded-full bg-black text-[#C7F33C] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
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
                activeTab === "home" ? "text-black" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <HomeIcon size={18} className={activeTab === "home" ? "text-black" : "text-neutral-400"} />
              <span>{t.home}</span>
            </button>

            {/* Chat Tab */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold relative transition-colors ${
                activeTab === "chat" ? "text-black" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <div className="relative">
                <MessageSquare size={18} className={activeTab === "chat" ? "text-black" : "text-neutral-400"} />
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
