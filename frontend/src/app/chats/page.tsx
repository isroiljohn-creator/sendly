"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, LimeBadge, Card, Button, StatusPill } from "@/components/ui/primitives";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useI18n } from "@/i18n/I18nProvider";
import { Search, Send, Clock, CheckCircle, Zap, Bot, XCircle, User, MessageSquare, ChevronLeft, Users, Radio, X, Plus, Pencil, Trash2, Paperclip, SlidersHorizontal } from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Channel, Contact, Broadcast } from "@/lib/db";

type Message = {
  id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
  mediaUrl?: string;
  mediaName?: string;
  edited?: boolean;
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

type ChatFolder = {
  id: string;
  name: string;
  includedTypes: ("personal" | "groups" | "bots")[];
};

const DEFAULT_FOLDERS: ChatFolder[] = [
  { id: "all", name: "Barchasi", includedTypes: ["personal", "groups", "bots"] },
  { id: "personal", name: "Shaxsiy", includedTypes: ["personal"] },
  { id: "groups", name: "Guruhlar", includedTypes: ["groups"] },
  { id: "bots", name: "Botlar", includedTypes: ["bots"] },
];

export default function ChatsPage() {
  const { t } = useI18n();

  // Navigation tabs state: "contacts" | "chats" | "broadcast"
  const [activeTab, setActiveTab] = useState<"contacts" | "chats" | "broadcast">("contacts");

  // Shared active channel state
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Tab 1: Chats states
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [chatsSearchQuery, setChatsSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [showChatLogMobile, setShowChatLogMobile] = useState(false);

  // Message edit/delete/media states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Chat Folders state
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");

  // Folder Settings Modal states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [includePersonal, setIncludePersonal] = useState(false);
  const [includeGroups, setIncludeGroups] = useState(false);
  const [includeBots, setIncludeBots] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Tab 2: Contacts states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");

  // Tab 3: Broadcasts states
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastTag, setBroadcastTag] = useState("all");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const [addUrlButton, setAddUrlButton] = useState(false);
  const [urlButtonText, setUrlButtonText] = useState("");
  const [urlButtonUrl, setUrlButtonUrl] = useState("");
  const [addWorkflow, setAddWorkflow] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");

  // Load and save custom folders from localstorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sendly_custom_chat_folders");
      if (stored) {
        try {
          setFolders(JSON.parse(stored));
        } catch (e) {
          setFolders(DEFAULT_FOLDERS);
        }
      } else {
        setFolders(DEFAULT_FOLDERS);
        localStorage.setItem("sendly_custom_chat_folders", JSON.stringify(DEFAULT_FOLDERS));
      }
    }
  }, []);

  // Dynamic Telegram-style chat classification helpers
  const isGroup = (c: Chat) => {
    const nameLower = c.name.toLowerCase();
    const usernameLower = c.username.toLowerCase();
    const idStr = c.id.toString();
    return (
      idStr.startsWith("-") ||
      nameLower.includes("guruh") ||
      nameLower.includes("group") ||
      nameLower.includes("kanal") ||
      nameLower.includes("channel") ||
      usernameLower.includes("group") ||
      usernameLower.includes("guruh")
    );
  };

  const isBotChat = (c: Chat) => {
    const usernameLower = c.username.toLowerCase();
    return usernameLower.includes("bot") || c.tags.includes("Bot") || c.name.toLowerCase().includes("bot");
  };

  const isPersonal = (c: Chat) => {
    return !isGroup(c) && !isBotChat(c);
  };

  const getChatType = (c: Chat): "personal" | "groups" | "bots" => {
    if (isGroup(c)) return "groups";
    if (isBotChat(c)) return "bots";
    return "personal";
  };

  // Safe translation helper with clean Uzbek fallback checks
  const getTranslation = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  // Synchronize activeTab with URL search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "contacts" || tabParam === "broadcast" || tabParam === "chats") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tab: "chats" | "contacts" | "broadcast") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
  };

  // Sync all data from db
  const syncData = () => {
    const activeCh = db.getActiveChannel();
    setActiveChannel(activeCh);

    // Sync Contacts
    setContacts(db.getContacts());

    // Sync Broadcasts
    setBroadcasts(db.getBroadcasts());

    // Sync Chats
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
      setChats([]);
      setActiveChatId("");
    }
  };

  useEffect(() => {
    syncData();

    const handleDbUpdate = () => {
      syncData();
    };

    const handleOpenBroadcastModal = () => {
      setBroadcastTitle("");
      setBroadcastMessage("");
      setIsBroadcastModalOpen(true);
    };

    window.addEventListener("replai-db-update", handleDbUpdate);
    window.addEventListener("sendly-open-new-broadcast-modal", handleOpenBroadcastModal);

    // Poll server for live chats updates
    const interval = setInterval(async () => {
      const success = await db.fetchFromServer();
      if (success) {
        syncData();
      }
    }, 2500);

    return () => {
      window.removeEventListener("replai-db-update", handleDbUpdate);
      window.removeEventListener("sendly-open-new-broadcast-modal", handleOpenBroadcastModal);
      clearInterval(interval);
    };
  }, []);

  // Chats Handlers
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

  // Media attachment simulation
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !activeChannel) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const mediaUrl = reader.result as string;
      const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
      const newMessage: Message = {
        id: `msg-${Date.now()}-media`,
        sender: "agent",
        text: `Rasm yuborildi: ${file.name}`,
        mediaUrl,
        mediaName: file.name,
        timestamp,
      };

      const updatedChats = chats.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: `📷 Rasm yuborildi`,
            unread: false,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      });

      setChats(updatedChats);
      localStorage.setItem(`replai_chats_${activeChannel.id}`, JSON.stringify(updatedChats));
      db.saveToServer();
    };
    reader.readAsDataURL(file);
  };

  // Editing Message triggers
  const startEditMessage = (msgId: string, text: string) => {
    setEditingMessageId(msgId);
    setInputText(text);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setInputText("");
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeChat || !activeChannel) return;
    const updatedChats = chats.map((c) => {
      if (c.id === activeChat.id) {
        const filteredMsgs = c.messages.filter((m) => m.id !== msgId);
        return {
          ...c,
          lastMessage: filteredMsgs.length > 0 ? filteredMsgs[filteredMsgs.length - 1].text : "",
          messages: filteredMsgs,
        };
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

    if (editingMessageId) {
      // Edit mode
      const updatedChats = chats.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: messageText,
            messages: c.messages.map((m) =>
              m.id === editingMessageId ? { ...m, text: messageText, edited: true } : m
            ),
          };
        }
        return c;
      });
      setChats(updatedChats);
      localStorage.setItem(`replai_chats_${activeChannel.id}`, JSON.stringify(updatedChats));
      setEditingMessageId(null);
      setInputText("");
      db.saveToServer();
      return;
    }

    // Normal Send Mode
    const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
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
          channelId: activeChannel.id,
          chatId: activeChat.id,
          text: messageText,
        }),
      });
      db.saveToServer();
    } catch (err) {
      console.error(err);
    }
  };

  // Contacts Handlers
  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactsSearchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(contactsSearchQuery.toLowerCase())
  );
  const displayedContacts = activeChannel ? filteredContacts : [];

  // Broadcasts Handlers
  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    const contactsList = db.getContacts();
    let count = 0;
    if (broadcastTag === "all") {
      count = contactsList.length;
    } else if (broadcastTag === "vip") {
      count = contactsList.filter((c) => c.tags.includes("VIP")).length;
    } else {
      count = contactsList.filter((c) => c.tags.includes("Tarifga qiziqqan") || c.tags.includes("Leads") || c.tags.includes("Telegram")).length;
    }

    const newBroadcast: Broadcast = {
      id: `${broadcasts.length + 1}`,
      name: broadcastTitle,
      segment: broadcastTag === "all" ? t("pages.broadcast.recipient_all") : broadcastTag === "vip" ? t("pages.broadcast.recipient_vip") : t("pages.broadcast.recipient_leads"),
      sentCount: String(count.toLocaleString("uz-UZ")),
      date: t("pages.broadcast.just_now"),
      status: "Completed",
    };

    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    db.saveBroadcasts(updated);

    setIsBroadcastModalOpen(false);
    setBroadcastTitle("");
    setBroadcastMessage("");
  };

  // Folders Customizations CRUD Handlers
  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    const includedTypes: ("personal" | "groups" | "bots")[] = [];
    if (includePersonal) includedTypes.push("personal");
    if (includeGroups) includedTypes.push("groups");
    if (includeBots) includedTypes.push("bots");

    if (includedTypes.length === 0) {
      alert("Iltimos, kamida bitta chat turini tanlang.");
      return;
    }

    let updatedFolders = [...folders];
    if (editingFolderId) {
      updatedFolders = folders.map((f) => {
        if (f.id === editingFolderId) {
          return {
            ...f,
            name: folderName.trim(),
            includedTypes,
          };
        }
        return f;
      });
    } else {
      const newFolder: ChatFolder = {
        id: `folder-${Date.now()}`,
        name: folderName.trim(),
        includedTypes,
      };
      updatedFolders.push(newFolder);
    }

    setFolders(updatedFolders);
    localStorage.setItem("sendly_custom_chat_folders", JSON.stringify(updatedFolders));
    setIsCreatingFolder(false);
    setEditingFolderId(null);
    setFolderName("");
  };

  const startCreateFolder = () => {
    setEditingFolderId(null);
    setFolderName("");
    setIncludePersonal(true);
    setIncludeGroups(false);
    setIncludeBots(false);
    setIsCreatingFolder(true);
  };

  const startEditFolder = (f: ChatFolder) => {
    setEditingFolderId(f.id);
    setFolderName(f.name);
    setIncludePersonal(f.includedTypes.includes("personal"));
    setIncludeGroups(f.includedTypes.includes("groups"));
    setIncludeBots(f.includedTypes.includes("bots"));
    setIsCreatingFolder(true);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (folderId === "all") return;
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);
    localStorage.setItem("sendly_custom_chat_folders", JSON.stringify(updatedFolders));
    if (activeFolderId === folderId) {
      setActiveFolderId("all");
    }
  };

  // Find active folder config
  const activeFolderObj = folders.find((f) => f.id === activeFolderId) || folders[0];

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 relative w-full h-full">
        {/* Page Header */}
        <PageHeader
          title={
            activeTab === "chats"
              ? t("nav.chats")
              : activeTab === "contacts"
              ? t("nav.contacts")
              : t("nav.broadcast")
          }
          breadcrumbs={
            activeTab === "chats"
              ? t("pages.chats.breadcrumb")
              : activeTab === "contacts"
              ? t("pages.contacts.breadcrumb")
              : t("pages.broadcast.breadcrumb")
          }
        />

        {/* Tab switcher styled as pill buttons, Contacts is FIRST */}
        <div className="flex gap-2.5 pb-2.5 w-full mt-1 overflow-x-auto scrollbar-none select-none">
          {(["contacts", "chats", "broadcast"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={[
                  "px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer border-none",
                  isActive
                    ? "bg-black text-[#C7F33C] shadow-sm"
                    : "bg-[#F5F5F5] hover:bg-neutral-200 text-[#707070] hover:text-black"
                ].join(" ")}
              >
                {tab === "chats"
                  ? t("nav.chats")
                  : tab === "contacts"
                  ? t("nav.contacts")
                  : t("nav.broadcast")}
              </button>
            );
          })}
        </div>

        {/* No channel warning */}
        {activeTab !== "chats" && !activeChannel && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-[16px] bg-black text-white shrink-0">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-[#C7F33C]" />
              <div>
                <p className="text-[13px] font-semibold">{t("pages.contacts.no_channel_title")}</p>
                <p className="text-[11px] text-white/60">{t("pages.contacts.no_channel_desc")}</p>
              </div>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new Event("replai-open-connect-modal"))}
              className="bg-[#C7F33C] text-black text-[11px] font-bold py-2 px-4 rounded-full whitespace-nowrap hover:bg-[#b0df2c] transition-colors cursor-pointer border-0"
            >
              {t("pages.contacts.connect_channel_btn")}
            </button>
          </div>
        )}

        {/* ================================== TAB 1: CHATS ================================== */}
        {activeTab === "chats" && (
          <div className="flex-1 flex gap-0 bg-white border border-[#E8E8E8] rounded-[24px] overflow-hidden min-h-[520px] shadow-sm relative">
            {/* Column 1: Chat list sidebar */}
            <div className={["w-full md:w-[320px] flex flex-col border-r border-[#E8E8E8] shrink-0 bg-white", showChatLogMobile ? "hidden md:flex" : "flex"].join(" ")}>
              {/* Chat list search bar */}
              <div className="p-4 border-b border-[#E8E8E8] relative flex items-center shrink-0">
                <Search size={14} className="absolute left-7 text-[#707070]" />
                <input
                  type="text"
                  placeholder={t("pages.chats.search_placeholder") || "Qidiruv..."}
                  value={chatsSearchQuery}
                  onChange={(e) => setChatsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-[12px] bg-[#F5F5F5] rounded-full border border-transparent focus:outline-none focus:bg-[#E8E8E8] focus:border-neutral-300 transition-all font-semibold text-black"
                />
              </div>

              {/* Dynamic Custom Chat Folders Switcher with settings slider */}
              <div className="flex items-center border-b border-[#E8E8E8] shrink-0 bg-white">
                <div className="flex-1 flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none select-none text-[11px] font-bold">
                  {folders.map((folder) => {
                    const isActive = activeFolderId === folder.id;
                    const count = chats.filter((c) => {
                      if (folder.id === "all") return true;
                      const type = getChatType(c);
                      return folder.includedTypes.includes(type);
                    }).length;

                    return (
                      <button
                        key={folder.id}
                        onClick={() => setActiveFolderId(folder.id)}
                        className={[
                          "flex items-center gap-1 px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer border-none",
                          isActive 
                            ? "bg-black text-[#C7F33C] font-extrabold shadow-sm" 
                            : "bg-[#F5F5F5] hover:bg-neutral-200 text-[#707070] hover:text-black font-semibold"
                        ].join(" ")}
                      >
                        <span>{folder.name}</span>
                        <span className={["text-[9px] px-1 rounded-full", isActive ? "bg-[#C7F33C]/20 text-[#C7F33C]" : "bg-neutral-200 text-[#707070]"].join(" ")}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(true)}
                  className="p-2 mr-2 hover:bg-neutral-100 rounded-full text-[#707070] hover:text-black cursor-pointer border-0 flex items-center justify-center shrink-0"
                  title="Papkalar sozlamalari"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              {/* Chat list scroll area */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#F0F0F0]">
                {chats.filter((c) => {
                  if (chatsSearchQuery.trim() !== "") {
                    return c.name.toLowerCase().includes(chatsSearchQuery.toLowerCase());
                  }
                  if (activeFolderId === "all") return true;
                  const type = getChatType(c);
                  return activeFolderObj.includedTypes.includes(type);
                }).length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-[#707070]">
                    <p className="text-[12px] font-bold">{getTranslation("pages.chats.empty_chats_title", "Hozircha xabarlar yo'q")}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{getTranslation("pages.chats.empty_chats_desc", "Kanalga xabarlar kelishi bilanoq, ular bu yerda ko'rinadi. Bot triggerlarini sinash uchun simulyatordan foydalanishingiz mumkin.")}</p>
                  </div>
                ) : (
                  chats
                    .filter((c) => {
                      if (chatsSearchQuery.trim() !== "") {
                        return c.name.toLowerCase().includes(chatsSearchQuery.toLowerCase());
                      }
                      if (activeFolderId === "all") return true;
                      const type = getChatType(c);
                      return activeFolderObj.includedTypes.includes(type);
                    })
                    .map((c) => {
                      const isActive = c.id === activeChatId;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveChatId(c.id);
                            setShowChatLogMobile(true);
                          }}
                          className={["w-full flex items-center gap-3 p-3.5 cursor-pointer transition-all hover:bg-[#F9F9F7] text-left", isActive ? "bg-[#C7F33C]/10 border-l-[3px] border-[#C7F33C]" : ""].join(" ")}
                        >
                          <Avatar src={c.avatar} size={40} className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[12px] text-black truncate">{c.name}</span>
                              <span className="text-[9px] text-[#A0A0A0] font-bold shrink-0">{c.time}</span>
                            </div>
                            <p className={["text-[12px] mt-0.5 truncate", c.unread ? "text-black font-semibold" : "text-[#707070]"].join(" ")}>
                              {c.lastMessage}
                            </p>
                          </div>
                          {c.unread && (
                            <span className="h-2 w-2 rounded-full bg-[#C7F33C] mt-2 shrink-0" />
                          )}
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            {/* Column 2: Messaging Log */}
            <div className={["flex-1 flex flex-col bg-[#F9F9F7]", !showChatLogMobile ? "hidden md:flex" : "flex"].join(" ")}>
              {activeChat ? (
                <>
                  {/* Active Contact Header */}
                  <div className="h-[64px] border-b border-[#D8D8D8] bg-white px-4 md:px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => setShowChatLogMobile(false)}
                        className="md:hidden p-1.5 -ml-1 mr-1 text-black hover:bg-neutral-100 rounded-full shrink-0"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <Avatar src={activeChat.avatar} size={36} className="shrink-0" />
                      <div>
                        <h3 className="text-[14px] font-bold text-black">{activeChat.name}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#707070] font-semibold">
                          {activeChannel?.type === "telegram" ? (
                            <Bot size={12} className="text-[#229ED9]" />
                          ) : (
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-[#E1306C]">
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

                  {/* Messages Bubble Flow */}
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {activeChat.messages.map((msg) => {
                      const isAgent = msg.sender === "agent";
                      const isBot = msg.sender === "bot";
                      return (
                        <div key={msg.id} className={["flex flex-col max-w-[70%] group relative", isAgent ? "self-end items-end" : "self-start items-start"].join(" ")}>
                          {/* Edit/Delete floating toolbar */}
                          {isAgent && (
                            <div className="absolute left-[-60px] top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white border border-[#E8E8E8] shadow-md rounded-full p-1 transition-all z-10">
                              <button
                                type="button"
                                onClick={() => startEditMessage(msg.id, msg.text)}
                                className="p-1 hover:bg-neutral-100 rounded-full text-[#707070] hover:text-black cursor-pointer border-0 flex items-center justify-center"
                                title="Tahrirlash"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 hover:bg-red-50 rounded-full text-red-500 hover:text-red-700 cursor-pointer border-0 flex items-center justify-center"
                                title="O'chirish"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}

                          {/* Bubble Container */}
                          <div className={["rounded-[20px] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm font-semibold", isAgent ? "bg-black text-white rounded-tr-[4px]" : isBot ? "bg-[#C7F33C] text-[#1A2906] rounded-tl-[4px] border border-[#9BC92E]/40" : "bg-white text-black rounded-tl-[4px] border border-[#E8E8E8]"].join(" ")}>
                            {msg.mediaUrl && (
                              <div className="mb-2 max-w-[200px] overflow-hidden rounded-lg border border-neutral-200 bg-white">
                                <img src={msg.mediaUrl} alt={msg.mediaName || "Media"} className="w-full h-auto object-cover" />
                              </div>
                            )}
                            <div>{msg.text}</div>
                          </div>

                          {/* Metadata */}
                          <span className="text-[9px] text-[#707070] mt-1 px-1 font-bold">
                            {isBot ? t("pages.chats.sender_bot") : isAgent ? t("pages.chats.sender_agent") : t("pages.chats.sender_customer")}
                            {msg.edited && <span className="text-[#A0A0A0] font-normal italic"> (o'zgartirildi)</span>}
                            {` • ${msg.timestamp}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Message Input Form with media clip attachments */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-[#D8D8D8] bg-white flex gap-2 items-center shrink-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleMediaUpload}
                      accept="image/*"
                    />
                    <button
                      type="button"
                      disabled={!liveTakeover}
                      onClick={() => fileInputRef.current?.click()}
                      className="grid h-11 w-11 place-items-center rounded-full hover:bg-neutral-100 text-[#707070] transition-colors border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <Paperclip size={18} />
                    </button>

                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        disabled={!liveTakeover}
                        placeholder={liveTakeover 
                          ? getTranslation("pages.chats.placeholder_operator", "Xabar yozing...") 
                          : getTranslation("pages.chats.input_disabled", "Bot rejimi faol. Yozish uchun operator rejimini yoqing.")
                        }
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full rounded-full bg-[#F0F0F0] pl-5 pr-20 py-3 text-[12px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      {editingMessageId && (
                        <button
                          type="button"
                          onClick={cancelEditMessage}
                          className="absolute right-4 text-[10px] text-red-500 hover:text-red-700 font-bold border-0 bg-transparent cursor-pointer"
                        >
                          Bekor qilish
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!liveTakeover || !inputText.trim()}
                      className="grid h-11 w-11 place-items-center rounded-full bg-black text-[#C7F33C] transition-all hover:bg-neutral-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 border-0 cursor-pointer"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#707070]">
                  <MessageSquare size={36} className="text-[#A0A0A0] mb-3" />
                  <h3 className="text-[14px] font-bold text-black">{getTranslation("pages.chats.no_chat_selected", "Chatni tanlang")}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{getTranslation("pages.chats.select_chat_desc", "Muloqotni boshlash uchun chap paneldan biror chatni tanlang.")}</p>
                </div>
              )}
            </div>

            {/* Column 3: Contact Sidebar Details */}
            {activeChat && !showChatLogMobile && (
              <div className="hidden lg:flex w-[280px] shrink-0 border-l border-[#E8E8E8] p-6 flex-col gap-6 overflow-y-auto bg-white">
                <div className="flex flex-col items-center text-center">
                  <Avatar src={activeChat.avatar} size={72} className="ring-4 ring-[#C7F33C]" />
                  <h3 className="text-[15px] font-extrabold text-black mt-3">{activeChat.name}</h3>
                  <span className="text-[11px] text-[#707070] font-bold mt-0.5">@{activeChat.username}</span>
                </div>

                <hr className="border-[#F0F0F0]" />

                <div>
                  <h4 className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider mb-2.5">
                    {t("pages.chats.tags") || "Teglar"}
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
                    <h4 className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider mb-1">
                      {t("pages.chats.channel_label") || "Kanal"}
                    </h4>
                    {activeChannel ? (
                      <div className="flex items-center gap-1.5 text-[12px] text-black font-semibold">
                        {activeChannel.type === "instagram" ? (
                          <Instagram size={14} className="text-[#E1306C]" />
                        ) : (
                          <Bot size={14} className="text-[#229ED9]" />
                        )}
                        <span>{activeChannel.type === "instagram" ? t("pages.chats.channel_instagram") : t("pages.chats.channel_telegram")}</span>
                      </div>
                    ) : (
                      <div className="text-[12px] text-[#707070] font-semibold">{t("pages.chats.unknown")}</div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider mb-1">
                      {t("pages.chats.last_activity") || "Oxirgi faollik"}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[12px] text-black font-semibold">
                      <Clock size={14} className="text-[#707070]" />
                      <span>{activeChat.time}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                        {t("pages.chats.bot_status") || "Bot holati"}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between bg-[#F0F0F0] p-1 rounded-full mt-2">
                      <button 
                        onClick={() => setLiveTakeoverForChat(false)}
                        type="button"
                        className={["flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border-0", !liveTakeover ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black"].join(" ")}
                      >
                        <CheckCircle size={11} className={!liveTakeover ? "text-[#16A34A]" : ""} /> {t("pages.chats.bot_active") || "Bot faol"}
                      </button>
                      <button 
                        onClick={() => setLiveTakeoverForChat(true)}
                        type="button"
                        className={["flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border-0", liveTakeover ? "bg-black text-white shadow-xs" : "text-[#707070] hover:text-black"].join(" ")}
                      >
                        <XCircle size={11} className={liveTakeover ? "text-[#DC2626]" : ""} /> {t("pages.chats.live_operator") || "Operator"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Custom Chat Folders Management Modal */}
        {isFolderModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <Card className="w-full max-w-[500px] shadow-2xl relative p-6 bg-white rounded-[24px]">
              <button
                onClick={() => {
                  setIsFolderModalOpen(false);
                  setIsCreatingFolder(false);
                  setEditingFolderId(null);
                }}
                className="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors cursor-pointer border-0"
              >
                <X size={18} />
              </button>

              <h2 className="text-[18px] font-extrabold text-black pr-8">
                {isCreatingFolder ? (editingFolderId ? "Papkani tahrirlash" : "Yangi papka yaratish") : "Chat papkalari sozlamalari"}
              </h2>
              <p className="text-[11px] text-[#707070] mt-1 font-medium">
                {isCreatingFolder ? "Papkaning nomi va unga kiritiladigan suhbatlar filtrlarini belgilang." : "Suhbatlaringizni guruhlash uchun maxsus chat papkalarini tahrirlang yoki yangi yarating."}
              </p>

              {!isCreatingFolder ? (
                <div className="mt-5 flex flex-col gap-3">
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-[#F0F0F0]">
                    {folders.map((f) => {
                      const isDefault = f.id === "all";
                      return (
                        <div key={f.id} className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-[13px] text-black">{f.name}</span>
                            <p className="text-[10px] text-[#707070] mt-0.5">
                              Turlari: {f.includedTypes.map(t => t === "personal" ? "Shaxsiy" : t === "groups" ? "Guruhlar" : "Botlar").join(", ")}
                            </p>
                          </div>
                          {!isDefault && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startEditFolder(f)}
                                className="p-1.5 hover:bg-neutral-100 rounded-full text-[#707070] hover:text-black cursor-pointer border-0 flex items-center justify-center"
                                title="Tahrirlash"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(f.id)}
                                className="p-1.5 hover:bg-red-50 rounded-full text-red-500 hover:text-red-700 cursor-pointer border-0 flex items-center justify-center"
                                title="O'chirish"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={startCreateFolder}
                    className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0 mt-2"
                  >
                    <Plus size={14} />
                    <span>Yangi papka qo'shish</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveFolder} className="mt-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#707070] px-1">
                      Papka nomi
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Shoshilinch, Hamkorlar..."
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      className="w-full rounded-[12px] bg-[#F5F5F5] px-3.5 py-2.5 text-[12px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-2 bg-[#F9F9F7] p-3.5 border border-[#E8E8E8] rounded-xl">
                    <label className="text-[11px] font-extrabold text-black uppercase tracking-wider mb-1">
                      Kiritiladigan suhbat turlari
                    </label>
                    <div className="flex flex-col gap-2 mt-1">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-black cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includePersonal}
                          onChange={(e) => setIncludePersonal(e.target.checked)}
                          className="rounded text-black focus:ring-black h-4 w-4"
                        />
                        <span>Shaxsiy chatlar</span>
                      </label>
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-black cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeGroups}
                          onChange={(e) => setIncludeGroups(e.target.checked)}
                          className="rounded text-black focus:ring-black h-4 w-4"
                        />
                        <span>Guruhlar va Kanallar</span>
                      </label>
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-black cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeBots}
                          onChange={(e) => setIncludeBots(e.target.checked)}
                          className="rounded text-black focus:ring-black h-4 w-4"
                        />
                        <span>Botlar</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-4 py-2 text-[11px] font-bold"
                    >
                      Orqaga
                    </Button>
                    <Button
                      type="submit"
                      variant="accent"
                      className="px-4 py-2 text-[11px] font-bold"
                    >
                      Saqlash
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}

        {/* ================================== TAB 2: CONTACTS ================================== */}
        {activeTab === "contacts" && (
          <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
            <div className="p-5 border-b border-[#F0F0F0] flex flex-wrap gap-4 items-center justify-between bg-white">
              <div className="relative flex items-center w-full max-w-[340px]">
                <Search size={15} className="absolute left-4 text-[#707070]" />
                <input
                  type="text"
                  placeholder={t("pages.contacts.search_placeholder")}
                  value={contactsSearchQuery}
                  onChange={(e) => setContactsSearchQuery(e.target.value)}
                  className="w-full rounded-full bg-[#F5F5F5] pl-10 pr-4 py-2 text-[12px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#707070] bg-neutral-100 border border-[#E8E8E8] px-3 py-1 rounded-full font-bold">
                  {t("pages.contacts.total_contacts").replace("{count}", String(displayedContacts.length))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto w-full bg-white">
              {displayedContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-[#707070]">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F0F0F0] text-[#707070] mb-4">
                    <Users size={20} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-black">
                    {!activeChannel ? t("pages.contacts.no_channel_status") : t("pages.contacts.empty_contacts_title")}
                  </h3>
                  <p className="text-[12px] text-[#707070] mt-1 max-w-[280px]">
                    {!activeChannel
                      ? t("pages.contacts.no_channel_status_desc")
                      : t("pages.contacts.empty_contacts_desc")}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-[11px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                      <th className="px-6 py-3.5">{t("pages.contacts.table_name")}</th>
                      <th className="px-6 py-3.5">{t("pages.contacts.table_username")}</th>
                      <th className="px-6 py-3.5">{t("pages.chats.tags")}</th>
                      <th className="px-6 py-3.5">{t("pages.contacts.table_chats")}</th>
                      <th className="px-6 py-3.5">{t("common.status")}</th>
                      <th className="px-6 py-3.5 text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-[12px] font-semibold">
                    {displayedContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F9F9F7]/50 transition-colors">
                        <td className="px-6 py-3 flex items-center gap-3">
                          <Avatar size={32} />
                          <span className="font-extrabold text-black">{c.name}</span>
                        </td>
                        <td className="px-6 py-3 text-[#707070]">{c.username.startsWith("@") ? c.username : `@${c.username}`}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((tag, i) => (
                              <LimeBadge key={i} className="text-[10px]">
                                {tag}
                              </LimeBadge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-black">{t("pages.contacts.messages_count").replace("{count}", String(c.messagesCount))}</td>
                        <td className="px-6 py-3">
                          <StatusPill status={c.status} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => {
                              handleTabChange("chats");
                              const found = chats.find(chat => chat.username.toLowerCase() === c.username.toLowerCase() || chat.name.toLowerCase() === c.name.toLowerCase());
                              if (found) {
                                setActiveChatId(found.id);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200 border border-[#E8E8E8] text-[11px] font-bold rounded-full flex items-center gap-1.5 ml-auto cursor-pointer transition-all"
                          >
                            <MessageSquare size={12} />
                            <span>{t("pages.contacts.write")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {/* ================================== TAB 3: BROADCASTS ================================== */}
        {activeTab === "broadcast" && (
          <>
            <div className="flex items-center justify-between mb-4 mt-2">
              <h3 className="text-[15px] font-extrabold text-black">{t("pages.broadcast.title") || "Ommaviy xabarlar"}</h3>
              <button
                onClick={() => {
                  setBroadcastTitle("");
                  setBroadcastMessage("");
                  setIsBroadcastModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C7F33C] text-black text-[12px] font-bold shadow-xs select-none hover:bg-[#b0df2c] active:scale-95 transition-all cursor-pointer border-0 font-sans font-bold"
              >
                <Plus size={14} />
                <span>Yangi xabar</span>
              </button>
            </div>

            {/* Modal Wizard overlay */}
            {isBroadcastModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
                <Card className="w-full max-w-[500px] shadow-2xl relative p-6 bg-white rounded-[24px]">
                  <button
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors cursor-pointer border-0"
                  >
                    <X size={18} />
                  </button>

                  <h2 className="text-[18px] font-extrabold text-black pr-8">
                    {t("pages.broadcast.modal_title")}
                  </h2>
                  <p className="text-[11px] text-[#707070] mt-1 font-medium">
                    {t("pages.broadcast.modal_desc")}
                  </p>

                  <form onSubmit={handleCreateBroadcast} className="mt-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#707070] px-1">
                        {t("pages.broadcast.field_subject")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t("pages.broadcast.field_subject_placeholder")}
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="w-full rounded-[12px] bg-[#F5F5F5] px-3.5 py-2.5 text-[12px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#707070] px-1">
                        {t("pages.broadcast.field_recipient")}
                      </label>
                      <CustomDropdown
                        value={broadcastTag}
                        onChange={setBroadcastTag}
                        className="bg-[#F5F5F5] border-none px-3.5 py-2 text-[12px] rounded-[12px] focus:border-none focus:shadow-none hover:bg-[#e8e8e8]/80 text-black font-semibold h-10 cursor-pointer"
                        dropdownClassName="mt-2 rounded-[16px]"
                        options={[
                          { value: "all", label: t("pages.broadcast.recipient_all") },
                          { value: "vip", label: t("pages.broadcast.recipient_vip") },
                          { value: "leads", label: t("pages.broadcast.recipient_leads") },
                        ]}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#707070] px-1">
                        {t("pages.broadcast.field_message")}
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder={t("pages.broadcast.field_message_placeholder")}
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full rounded-[12px] bg-[#F5F5F5] px-3.5 py-2.5 text-[12px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] resize-none font-semibold"
                      />
                    </div>

                    {/* URL Tugma Qo'shish */}
                    <div className="flex flex-col gap-2 p-3 bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl w-full shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[12px] font-extrabold text-black">{t("pages.broadcast.add_button_title")}</h3>
                          <p className="text-[10px] text-[#707070] mt-0.5">{t("pages.broadcast.add_button_desc")}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={addUrlButton}
                            onChange={(e) => setAddUrlButton(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[&apos;&apos;] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                      
                      {addUrlButton && (
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#E8E8E8] animate-in slide-in-from-top-1">
                          <input
                            type="text"
                            placeholder={t("pages.broadcast.button_text_placeholder")}
                            value={urlButtonText}
                            onChange={(e) => setUrlButtonText(e.target.value)}
                            className="w-full rounded-[10px] bg-white border border-[#D8D8D8] px-3 py-2 text-[11px] text-black outline-none focus:border-black font-semibold"
                          />
                          <input
                            type="url"
                            placeholder={t("pages.broadcast.button_url_placeholder")}
                            value={urlButtonUrl}
                            onChange={(e) => setUrlButtonUrl(e.target.value)}
                            className="w-full rounded-[10px] bg-white border border-[#D8D8D8] px-3 py-2 text-[11px] text-black outline-none focus:border-black font-mono font-semibold"
                          />
                        </div>
                      )}
                    </div>

                    {/* Workflow Qo'shish */}
                    <div className="flex flex-col gap-2 p-3 bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl w-full shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[12px] font-extrabold text-black">{t("pages.broadcast.add_workflow_title")}</h3>
                          <p className="text-[10px] text-[#707070] mt-0.5">{t("pages.broadcast.add_workflow_desc")}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={addWorkflow}
                            onChange={(e) => setAddWorkflow(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[&apos;&apos;] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                      
                      {addWorkflow && (
                        <div className="flex flex-col gap-2.5 mt-2 pt-2 border-t border-[#E8E8E8] animate-in slide-in-from-top-1">
                          <CustomDropdown
                            value={selectedWorkflowId}
                            onChange={setSelectedWorkflowId}
                            className="bg-white border border-[#D8D8D8] px-3 py-2 text-[11px] rounded-[10px] text-black font-semibold h-9"
                            placeholder={t("pages.broadcast.select_workflow_placeholder")}
                            options={[
                              { value: "wf1", label: t("pages.broadcast.wf_flow1") },
                              { value: "wf2", label: t("pages.broadcast.wf_subscribe") },
                              { value: "wf3", label: t("pages.broadcast.wf_coupon") },
                            ]}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              window.open("/automations/builder", "_blank");
                            }}
                            className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
                          >
                            <Plus size={12} />
                            <span>{t("pages.broadcast.create_workflow_btn")}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsBroadcastModalOpen(false)}
                        className="px-4 py-2 text-[11px] font-bold"
                      >
                        {t("pages.broadcast.btn_cancel")}
                      </Button>
                      <Button
                        type="submit"
                        variant="accent"
                        className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold"
                      >
                        <Send size={12} />
                        {t("pages.broadcast.btn_send")}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* Broadcasts List Card */}
            <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
              <div className="overflow-x-auto w-full bg-white">
                {broadcasts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-[#707070]">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F0F0F0] text-[#707070] mb-4">
                      <Radio size={20} />
                    </div>
                    <h3 className="text-[15px] font-semibold text-black">{t("pages.broadcast.no_broadcasts_title")}</h3>
                    <p className="text-[12px] text-[#707070] mt-1 max-w-[280px]">
                      {t("pages.broadcast.no_broadcasts_desc")}
                    </p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#F0F0F0] text-[11px] font-bold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                        <th className="px-6 py-3.5">{t("pages.broadcast.table_title")}</th>
                        <th className="px-6 py-3.5">{t("pages.broadcast.table_segment")}</th>
                        <th className="px-6 py-3.5">{t("pages.broadcast.table_status")}</th>
                        <th className="px-6 py-3.5">{t("pages.broadcast.table_sent")}</th>
                        <th className="px-6 py-3.5">{t("pages.broadcast.table_date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0] text-[12px] font-semibold">
                      {broadcasts.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F9F9F7]/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-black text-[#C7F33C]">
                                <Send size={13} />
                              </div>
                              <span className="font-extrabold text-black">{b.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-[8px] bg-[#F0F0F0] px-2 py-0.5 text-[10px] text-[#707070] font-bold">
                              {b.segment}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusPill
                              status={b.status === "Completed"}
                              activeText={t("pages.broadcast.status_sent")}
                              inactiveText={t("pages.broadcast.status_pending")}
                            />
                          </td>
                          <td className="px-6 py-4 text-black">
                            {t("pages.broadcast.sent_unit").replace("{count}", b.sentCount)}
                          </td>
                          <td className="px-6 py-4 text-[#707070]">{b.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
