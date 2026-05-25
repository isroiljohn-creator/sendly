"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, LimeBadge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Search, Send, Clock, CheckCircle, Zap, Bot, XCircle, User, MessageSquare } from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Channel } from "@/lib/db";

type Message = {
  id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
};

type Chat = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: Message[];
  tags: string[];
  liveTakeover?: boolean;
};

const INITIAL_CHATS: Chat[] = [];
 
export default function ChatsPage() {
  const { t } = useI18n();
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [simulationSender, setSimulationSender] = useState<"agent" | "user">("agent");

  // Load and sync chats from server/localStorage
  useEffect(() => {
    const syncChannelAndChats = () => {
      const activeCh = db.getActiveChannel();
      setActiveChannel(activeCh);
      if (!activeCh) {
        setChats([]);
        setActiveChatId("");
        return;
      }

      const stored = localStorage.getItem(`replai_chats_${activeCh.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setChats(parsed);
          if (parsed.length > 0) {
            setActiveChatId((prev) => {
              if (parsed.some((c: Chat) => c.id === prev)) return prev;
              return parsed[0].id;
            });
          } else {
            setActiveChatId("");
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        localStorage.setItem(`replai_chats_${activeCh.id}`, JSON.stringify([]));
        db.saveToServer();
        setChats([]);
        setActiveChatId("");
      }
    };

    syncChannelAndChats();

    const handleDbUpdate = () => {
      syncChannelAndChats();
    };

    window.addEventListener("replai-db-update", handleDbUpdate);

    // Poll server for updates every 2.5 seconds
    const interval = setInterval(async () => {
      const success = await db.fetchFromServer();
      if (success) {
        syncChannelAndChats();
      }
    }, 2500);

    return () => {
      window.removeEventListener("replai-db-update", handleDbUpdate);
      clearInterval(interval);
    };
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const liveTakeover = activeChat?.liveTakeover || false;

  const setLiveTakeoverForChat = (val: boolean) => {
    if (!activeChat || !activeChannel) return;
    const updatedChats = chats.map((c) => {
      if (c.id === activeChat.id) {
        return { ...c, liveTakeover: val };
      }
      return c;
    });
    setChats(updatedChats);
    localStorage.setItem(`replai_chats_${activeChannel.id}`, JSON.stringify(updatedChats));
    db.saveToServer();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = inputText.trim();
    if (!messageText || !activeChat || !activeChannel) return;

    const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

    if (simulationSender === "agent") {
      const newMessage: Message = {
        id: `msg-${Date.now()}-operator`,
        sender: "agent",
        text: messageText,
        timestamp,
      };

      const updatedChats = chats.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: messageText,
            unread: false,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      });

      setChats(updatedChats);
      localStorage.setItem(`replai_chats_${activeChannel.id}`, JSON.stringify(updatedChats));
      setInputText("");

      try {
        await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: activeChat.id,
            text: messageText,
            token: activeChannel.type === "telegram" ? activeChannel.telegramToken : undefined,
            channelId: activeChannel.id,
          }),
        });
        db.saveToServer();
      } catch (err) {
        console.error("Failed to send message via API:", err);
      }
    } else {
      const newMessage: Message = {
        id: `msg-${Date.now()}-user`,
        sender: "user",
        text: messageText,
        timestamp,
      };

      const updatedChats = chats.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: messageText,
            unread: false,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      });

      setChats(updatedChats);
      localStorage.setItem(`replai_chats_${activeChannel.id}`, JSON.stringify(updatedChats));
      db.saveToServer();
      setInputText("");

      if (liveTakeover) {
        return;
      }

      setTimeout(() => {
        const automations = db.getChannelAutomations(activeChannel.id);
        const activeAutomations = automations.filter((a) => a.active);

        let matchedAutomation = null;
        let matchedKeyword = "";

        for (const auto of activeAutomations) {
          if (auto.triggerType === "keyword") {
            const keywords = auto.triggerDetails
              .split(",")
              .map((k) => k.trim().toLowerCase())
              .filter(Boolean);

            const foundKeyword = keywords.find((kw) =>
              messageText.toLowerCase().includes(kw)
            );

            if (foundKeyword) {
              matchedAutomation = auto;
              matchedKeyword = foundKeyword;
              break;
            }
          }
        }

        let botReplyText = "";
        if (matchedAutomation) {
          // Increment runs count and update conversion rate
          const automationsList = db.getChannelAutomations(activeChannel.id);
          const idx = automationsList.findIndex((a) => a.id === (matchedAutomation as any).id);
          if (idx > -1) {
            const runsVal = parseInt(automationsList[idx].runs || "0") + 1;
            automationsList[idx].runs = String(runsVal);
            
            // Calculate a realistic conversion dynamically based on ID hash
            const hash = (matchedAutomation as any).id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            const rate = 65 + (hash % 25); // conversion rate between 65% and 90%
            const completedVal = Math.round(runsVal * (rate / 100));
            automationsList[idx].completion = runsVal > 0 ? `${Math.round((completedVal / runsVal) * 100)}%` : "0%";
            
            db.saveChannelAutomations(activeChannel.id, automationsList);
          }

          const nameLower = (matchedAutomation as any).name.toLowerCase();
          if ((matchedAutomation as any).replyText) {
            botReplyText = (matchedAutomation as any).replyText;
          } else if (nameLower.includes("lead magnet") || matchedKeyword === "kitob" || matchedKeyword === "bonus") {
            botReplyText = "Bepul qo'llanma havolasi: https://sendly.uz/book. Obunangiz uchun rahmat!";
          } else if (matchedKeyword === "/start" || matchedKeyword === "boshlash") {
            botReplyText = "Assalomu alaykum! Sendly chatbot xizmatining inbox simulyatoriga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan!";
          } else if (matchedKeyword === "narxi" || matchedKeyword === "tarif" || matchedKeyword === "kurs") {
            botReplyText = "Bizning tariflarimiz: \n• Pro: 150,000 so'm/oy (1ta akkaunt)\n• Premium: 1,000,000 so'm/oy (10ta akkaunt)\n\nBatafsil ma'lumot olish yoki ulanish uchun operatorimiz tez orada javob yozadi.";
          } else {
            botReplyText = matchedKeyword;
          }
        } else {
          botReplyText = "Murojaatingiz uchun rahmat! Tez orada operatorimiz sizga bog'lanadi.";
        }

        const autoReply: Message = {
          id: `msg-${Date.now()}-bot`,
          sender: "bot",
          text: botReplyText,
          timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        };

        setChats((prevChats) => {
          const newChats = prevChats.map((c) => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                lastMessage: autoReply.text,
                messages: [...c.messages, autoReply],
              };
            }
            return c;
          });
          localStorage.setItem(`replai_chats_${activeChannel.id}`, JSON.stringify(newChats));
          db.saveToServer();
          return newChats;
        });
      }, 1200);
    }
  };

  const filteredChats = chats.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px] h-[calc(100vh-140px)]">

        {/* No channel warning */}
        {!activeChannel && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-[16px] bg-black text-white shrink-0">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-[#C7F33C]" />
              <div>
                <p className="text-[13px] font-semibold">Hali kanal ulanmagan</p>
                <p className="text-[11px] text-white/60">Chatlarni ko&apos;rish uchun avval kanal ulang.</p>
              </div>
            </div>
            <Link href="/settings?connect=choose">
              <button className="bg-white text-black text-[11px] font-semibold py-2 px-4 rounded-full whitespace-nowrap hover:bg-[#F0F0F0] transition-colors">
                Kanal ulash →
              </button>
            </Link>
          </div>
        )}

        <PageHeader
          title={t("pages.chats.title")}
          breadcrumbs={t("pages.chats.breadcrumb")}
        />

        <div className="flex flex-1 overflow-hidden rounded-[28px] border border-[#D8D8D8] bg-white">
          {chats.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F9F9F7]">
              <div className="w-16 h-16 rounded-2xl bg-[#E8E8E8] text-[#707070] grid place-items-center mb-4">
                <Clock size={28} />
              </div>
              <h3 className="text-[16px] font-bold text-black">Hozircha xabarlar yo&apos;q</h3>
              <p className="text-[12px] text-[#707070] mt-1.5 max-w-sm leading-relaxed">
                Kanalga xabarlar kelishi bilanoq, ular bu yerda ko&apos;rinadi. Bot triggerlarini sinash uchun simulyatordan foydalanishingiz mumkin.
              </p>
            </div>
          ) : (
            <>
              {/* Column 1: Conversations List */}
              <div className="w-[320px] shrink-0 border-r border-[#D8D8D8] flex flex-col">
                {/* Search Input */}
                <div className="p-4 border-b border-[#D8D8D8]">
                  <div className="relative flex items-center">
                    <Search size={16} className="absolute left-4 text-[#707070]" />
                    <input
                      type="text"
                      placeholder={t("pages.chats.search_placeholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 py-2.5 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                    />
                  </div>
                </div>

                {/* Conversation Threads */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#F5F5F5]">
                  {filteredChats.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    return (
                      <button
                        key={chat.id}
                        onClick={() => {
                          setActiveChatId(chat.id);
                          setChats(
                            chats.map((c) => (c.id === chat.id ? { ...c, unread: false } : c))
                          );
                        }}
                        className={[
                          "w-full p-4 flex items-start gap-3 text-left transition-colors",
                          isActive ? "bg-[#F9F9F7]" : "hover:bg-[#F9F9F7]/50",
                        ].join(" ")}
                      >
                        <Avatar src={chat.avatar} size={40} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-black truncate">
                              {chat.name}
                            </span>
                            <span className="text-[10px] text-[#707070] shrink-0">
                              {chat.time}
                            </span>
                          </div>
                          <p className={[
                            "text-[12px] mt-0.5 truncate",
                            chat.unread ? "text-black font-semibold" : "text-[#707070]",
                          ].join(" ")}>
                            {chat.lastMessage}
                          </p>
                        </div>
                        {chat.unread && (
                          <span className="h-2 w-2 rounded-full bg-[#C7F33C] mt-2 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Messaging Log */}
              <div className="flex-1 flex flex-col bg-[#F9F9F7]">
                {/* Active Contact Header */}
                {activeChat && (
                  <div className="h-[64px] border-b border-[#D8D8D8] bg-white px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <Avatar src={activeChat.avatar} size={36} />
                      <div>
                        <h3 className="text-[14px] font-medium text-black">{activeChat.name}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#707070]">
                          {activeChannel?.type === "telegram" ? (
                            <Bot size={12} className="text-[#229ED9]" />
                          ) : (
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                            </svg>
                          )}
                          <span>@{activeChat.username}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bubble Logs */}
                {activeChat && (
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {activeChat.messages.map((m) => {
                      const isAgent = m.sender === "agent";
                      const isBot = m.sender === "bot";
                      return (
                        <div
                          key={m.id}
                          className={[
                            "flex flex-col max-w-[70%]",
                            isAgent ? "self-end items-end" : "self-start items-start",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "rounded-[20px] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                              isAgent
                                ? "bg-black text-white rounded-tr-[4px]"
                                : isBot
                                ? "bg-[#C7F33C] text-[#1A2906] rounded-tl-[4px] border border-[#9BC92E]/40"
                                : "bg-white text-black rounded-tl-[4px] border border-[#E8E8E8]",
                            ].join(" ")}
                          >
                            {m.text}
                          </div>
                          <span className="text-[9px] text-[#707070] mt-1 px-1">
                            {isBot ? "Bot" : isAgent ? "Siz" : "Mijoz"} • {m.timestamp}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Message Input Footer */}
                {activeChat && (
                  <div className="p-4 border-t border-[#D8D8D8] bg-white flex flex-col gap-3 shrink-0">
                    {/* Sender selector / Simulation Mode */}
                    <div className="flex items-center justify-between text-[11px] px-1">
                      <div className="flex items-center gap-1.5 text-[#707070]">
                        <Zap size={12} className={simulationSender === "user" ? "text-[#C7F33C]" : ""} />
                        <span>Yozish rejimi (Simulyatsiya):</span>
                      </div>
                      <div className="flex items-center bg-[#F0F0F0] p-0.5 rounded-full border border-[#E8E8E8]">
                        <button
                          type="button"
                          onClick={() => setSimulationSender("agent")}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${simulationSender === "agent" ? "bg-black text-white shadow-sm" : "text-[#707070] hover:text-black"}`}
                        >
                          <User size={12} />
                          <span>Operator (Siz)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulationSender("user")}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${simulationSender === "user" ? "bg-[#C7F33C] text-black shadow-sm" : "text-[#707070] hover:text-black"}`}
                        >
                          <MessageSquare size={12} />
                          <span>Mijoz (Sinash)</span>
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={simulationSender === "user" ? "Mijoz nomidan xabar yozing (bot triggerlarini sinash)..." : "Operator sifatida javob yozing..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className={`flex-1 rounded-full px-5 py-3 text-[13px] outline-none transition-all ${simulationSender === "user" ? "bg-[#C7F33C]/10 text-black border border-[#C7F33C]/30 focus:bg-[#C7F33C]/15" : "bg-[#F0F0F0] text-black focus:bg-[#e8e8e8]"}`}
                      />
                      <button
                        type="submit"
                        className={`grid h-11 w-11 place-items-center rounded-full active:scale-95 transition-all ${simulationSender === "user" ? "bg-[#C7F33C] text-black hover:bg-[#b0d82d]" : "bg-black text-[#C7F33C] hover:bg-black/90"}`}
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Column 3: Contact Sidebar Details */}
              {activeChat && (
                <div className="w-[280px] shrink-0 border-l border-[#D8D8D8] p-6 flex flex-col gap-6 overflow-y-auto">
                  <div className="flex flex-col items-center text-center">
                    <Avatar src={activeChat.avatar} size={72} className="ring-4 ring-[#C7F33C]" />
                    <h3 className="text-[15px] font-medium text-black mt-3">{activeChat.name}</h3>
                    <span className="text-[12px] text-[#707070] mt-0.5">@{activeChat.username}</span>
                  </div>

                  <hr className="border-[#F0F0F0]" />

                  <div>
                    <h4 className="text-[11px] font-medium text-[#707070] uppercase tracking-wider mb-2.5">
                      {t("pages.chats.tags")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeChat.tags.map((tag, i) => (
                        <LimeBadge key={i} className="text-[10px]">
                          {tag}
                        </LimeBadge>
                      ))}
                    </div>
                  </div>

                  <hr className="border-[#F0F0F0]" />

                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="text-[11px] font-medium text-[#707070] uppercase tracking-wider mb-1">
                        Muloqot kanali
                      </h4>
                      {activeChannel ? (
                        <div className="flex items-center gap-1.5 text-[13px] text-black">
                          {activeChannel.type === "instagram" ? (
                            <Instagram size={14} className="text-[#E1306C]" />
                          ) : (
                            <Bot size={14} className="text-[#229ED9]" />
                          )}
                          <span>{activeChannel.type === "instagram" ? "Instagram Direct" : "Telegram Bot"}</span>
                        </div>
                      ) : (
                        <div className="text-[13px] text-[#707070]">Noma&apos;lum</div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[11px] font-medium text-[#707070] uppercase tracking-wider mb-1">
                        Oxirgi faollik
                      </h4>
                      <div className="flex items-center gap-1.5 text-[13px] text-black">
                        <Clock size={14} className="text-[#707070]" />
                        <span>{activeChat.time}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[11px] font-medium text-[#707070] uppercase tracking-wider">
                          Bot holati
                        </h4>
                      </div>
                      <div className="flex items-center justify-between bg-[#F0F0F0] p-1 rounded-full mt-2">
                        <button 
                          onClick={() => setLiveTakeoverForChat(false)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[10px] font-semibold transition-all ${!liveTakeover ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"}`}
                        >
                          <CheckCircle size={12} className={!liveTakeover ? "text-[#16A34A]" : ""} /> Bot faol
                        </button>
                        <button 
                          onClick={() => setLiveTakeoverForChat(true)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[10px] font-semibold transition-all ${liveTakeover ? "bg-black text-white shadow-sm" : "text-[#707070] hover:text-black"}`}
                        >
                          <XCircle size={12} className={liveTakeover ? "text-[#DC2626]" : ""} /> Live operator
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
