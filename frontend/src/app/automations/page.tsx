"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Trash2,
  BookOpen,
  Gift,
  MessageSquare,
  HelpCircle,
  Bot,
  Folder,
  Plus,
  Search,
  SlidersHorizontal,
  FolderPlus,
  AlertCircle,
  MoreVertical
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, ConfirmModal, AlertModal } from "@/components/ui/primitives";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { db } from "@/lib/db";
import type { Automation, Channel, Group } from "@/lib/db";

export default function AutomationsPage() {
  const [allAutomations, setAllAutomations] = useState<(Automation & { channel?: Channel })[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Filtering / Sorting State
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all"); // "all", "none", or group ID
  const [selectedChannelId, setSelectedChannelId] = useState<string>("all"); // "all" or channel ID
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("recent"); // "recent", "oldest", "runs"

  // Dropdowns & Modals State
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetChannelId, setDeleteTargetChannelId] = useState<string | null>(null);
  
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [isQuickBotModalOpen, setIsQuickBotModalOpen] = useState(false);
  const [quickBotName, setQuickBotName] = useState("");
  const [quickBotKeywords, setQuickBotKeywords] = useState("");
  const [quickBotReply, setQuickBotReply] = useState("");
  const [quickBotChannelId, setQuickBotChannelId] = useState("");

  const [showTemplates, setShowTemplates] = useState(true);

  // Custom alert / confirm states
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);
  const [groupDeleteTargetId, setGroupDeleteTargetId] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ isOpen: true, title, message });
  };

  // Load all data on mount and trigger on update
  const loadAllData = () => {
    const all = db.getAllAutomations();
    setAllAutomations(all);

    const chs = db.getChannels();
    setChannels(chs);

    const grps = db.getGroups();
    setGroups(grps);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle active state toggle
  const toggleActive = (id: string, channelId?: string) => {
    if (!channelId) return;
    const autos = db.getChannelAutomations(channelId);
    const updated = autos.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    db.saveChannelAutomations(channelId, updated);
    loadAllData();
  };

  // Handle delete trigger
  const handleDeleteClick = (id: string, channelId?: string) => {
    if (channelId) {
      setDeleteTargetId(id);
      setDeleteTargetChannelId(channelId);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId && deleteTargetChannelId) {
      const autos = db.getChannelAutomations(deleteTargetChannelId);
      const updated = autos.filter((a) => a.id !== deleteTargetId);
      db.saveChannelAutomations(deleteTargetChannelId, updated);
      setDeleteTargetId(null);
      setDeleteTargetChannelId(null);
      loadAllData();
    }
  };

  // Edit click: sets the target automation's channel as the active channel in db, then redirects
  const handleEditClick = (id: string, channelId?: string) => {
    if (channelId) {
      db.setActiveChannel(channelId);
    }
    window.location.href = `/automations/builder?id=${id}`;
  };

  // Re-assign group of an automation
  const handleSetAutomationGroup = (id: string, channelId?: string, groupId?: string) => {
    if (!channelId) return;
    const autos = db.getChannelAutomations(channelId);
    const updated = autos.map((a) => (a.id === id ? { ...a, groupId } : a));
    db.saveChannelAutomations(channelId, updated);
    loadAllData();
  };

  // Create Quick keyword bot
  const handleCreateQuickBot = () => {
    if (!quickBotChannelId) {
      showAlert("Xatolik", "Iltimos, kanalni tanlang.");
      return;
    }
    if (!quickBotKeywords.trim()) {
      showAlert("Xatolik", "Iltimos, kalit so'zlarni kiriting.");
      return;
    }
    if (!quickBotReply.trim()) {
      showAlert("Xatolik", "Iltimos, javob matnini kiriting.");
      return;
    }

    const current = db.getChannelAutomations(quickBotChannelId);
    const newAuto: Automation = {
      id: `quick_${Date.now()}`,
      name: quickBotName.trim() || "Tezkor Chatbot",
      triggerType: "keyword",
      triggerDetails: quickBotKeywords.trim(),
      runs: "0",
      completion: "100%",
      active: true,
      groupId: selectedGroupId !== "all" && selectedGroupId !== "none" ? selectedGroupId : undefined,
    };

    current.push(newAuto);
    db.saveChannelAutomations(quickBotChannelId, current);

    // Reset and close
    setQuickBotName("");
    setQuickBotKeywords("");
    setQuickBotReply("");
    setQuickBotChannelId("");
    setIsQuickBotModalOpen(false);
    loadAllData();
  };

  // Add custom group
  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      showAlert("Xatolik", "Iltimos, guruh nomini kiriting.");
      return;
    }
    db.addGroup(newGroupName.trim());
    setNewGroupName("");
    setIsAddGroupModalOpen(false);
    loadAllData();
  };

  // Delete custom group
  const handleDeleteGroup = (groupId: string) => {
    setGroupDeleteTargetId(groupId);
  };

  // Load a template flow
  const handleUseTemplate = (templateKey: string) => {
    let targetChannelId = selectedChannelId;
    if (targetChannelId === "all") {
      const activeCh = db.getActiveChannel();
      if (activeCh) {
        targetChannelId = activeCh.id;
      } else if (channels.length > 0) {
        targetChannelId = channels[0].id;
      } else {
        showAlert("Xatolik", "Shablon yuklash uchun avval sozlamalardan yoki kanallar sahifasidan hisob bog'lang!");
        return;
      }
    }

    const current = db.getChannelAutomations(targetChannelId);
    const templates: Record<string, Automation> = {
      lead_magnet: { id: `tmpl_${Date.now()}`, name: "Lead Magnet (Bepul qo'llanma)", triggerType: "keyword", triggerDetails: "kitob, kurs, bonus", runs: "0", completion: "98%", active: true },
      story_coupon: { id: `tmpl_${Date.now()}`, name: "Stories-da belgilaganda kupon", triggerType: "story", triggerDetails: "Story mentions", runs: "0", completion: "95%", active: true },
      comment_dm: { id: `tmpl_${Date.now()}`, name: "Izoh yozganda DM-ga havola", triggerType: "keyword", triggerDetails: "narxi, batafsil, link", runs: "0", completion: "92%", active: true },
      welcome_faq: { id: `tmpl_${Date.now()}`, name: "Kutib olish va Tezkor FAQ", triggerType: "keyword", triggerDetails: "salom, start, boshlash", runs: "0", completion: "96%", active: true },
    };

    const newTemplate = templates[templateKey] ?? null;
    if (newTemplate) {
      if (selectedGroupId !== "all" && selectedGroupId !== "none") {
        newTemplate.groupId = selectedGroupId;
      }
      current.push(newTemplate);
      db.saveChannelAutomations(targetChannelId, current);
      db.setActiveChannel(targetChannelId);
      window.location.href = `/automations/builder?id=${newTemplate.id}&template=${templateKey}`;
    }
  };

  // Filtered and Sorted Automations
  const filteredAutomations = allAutomations
    .filter((a) => {
      // Channel filter
      if (selectedChannelId !== "all" && a.channelId !== selectedChannelId) {
        return false;
      }

      // Group filter
      if (selectedGroupId === "none") {
        if (a.groupId && a.groupId !== "") return false;
      } else if (selectedGroupId !== "all") {
        if (a.groupId !== selectedGroupId) return false;
      }

      // Search text query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(query);
        const matchesTrigger = a.triggerDetails.toLowerCase().includes(query);
        return matchesName || matchesTrigger;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "runs") {
        const runsA = parseInt(a.runs.replace(/,/g, "")) || 0;
        const runsB = parseInt(b.runs.replace(/,/g, "")) || 0;
        return runsB - runsA;
      }
      if (sortBy === "oldest") {
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      }
      return b.id.localeCompare(a.id, undefined, { numeric: true });
    });

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        
        {/* ================= LEFT SUB-SIDEBAR ================= */}
        <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6 bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
            <h2 className="text-[16px] font-extrabold text-black tracking-tight">Avtomatlashtirish</h2>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Link href="/automations/builder" className="w-full">
              <button className="w-full justify-center text-[12px] font-bold py-2.5 rounded-[12px] bg-black text-white hover:bg-black/90 transition-all flex items-center gap-1.5 shadow-sm">
                <Plus size={14} strokeWidth={2.5} /> Yangi oqim yaratish
              </button>
            </Link>
            <button
              onClick={() => {
                if (selectedChannelId !== "all") {
                  setQuickBotChannelId(selectedChannelId);
                } else if (channels.length > 0) {
                  const activeCh = db.getActiveChannel();
                  setQuickBotChannelId(activeCh ? activeCh.id : channels[0].id);
                }
                setIsQuickBotModalOpen(true);
              }}
              className="w-full justify-center text-[12px] font-bold py-2.5 rounded-[12px] bg-[#C7F33C] text-black hover:bg-[#b5e02c] transition-all flex items-center gap-1.5 shadow-sm border border-[#b2db2a]"
            >
              <Zap size={14} fill="currentColor" /> Tezkor Bot
            </button>
          </div>

          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[11px] font-bold text-[#707070] hover:text-black mt-[-4px] flex items-center justify-center gap-1 transition-colors"
          >
            <BookOpen size={12} /> {showTemplates ? "Shablonlarni yashirish" : "Shablonlarni ko'rsatish"}
          </button>

          {/* Groups section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-extrabold text-[#A0A0A0]">
              <span>Guruhlar</span>
              <button
                onClick={() => setIsAddGroupModalOpen(true)}
                className="hover:text-black transition-colors p-0.5 rounded hover:bg-[#F5F5F5]"
                title="Guruh qo'shish"
              >
                <FolderPlus size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {/* All streams */}
              <button
                onClick={() => setSelectedGroupId("all")}
                className={`flex items-center justify-between px-3 py-2 rounded-[12px] text-[12px] transition-all text-left ${selectedGroupId === "all" ? "bg-[#C7F33C]/20 text-black font-bold" : "text-[#505050] hover:bg-[#F5F5F5]"}`}
              >
                <span className="flex items-center gap-2">
                  <Folder size={14} className="text-black" /> Barcha oqimlar
                </span>
                <span className="text-[10px] bg-white border border-[#E8E8E8] px-1.5 py-0.5 rounded-full font-bold">
                  {allAutomations.length}
                </span>
              </button>

              {/* Uncategorized */}
              <button
                onClick={() => setSelectedGroupId("none")}
                className={`flex items-center justify-between px-3 py-2 rounded-[12px] text-[12px] transition-all text-left ${selectedGroupId === "none" ? "bg-[#C7F33C]/20 text-black font-bold" : "text-[#505050] hover:bg-[#F5F5F5]"}`}
              >
                <span className="flex items-center gap-2">
                  <Folder size={14} className="text-[#808080]" /> Guruhsiz
                </span>
                <span className="text-[10px] bg-white border border-[#E8E8E8] px-1.5 py-0.5 rounded-full font-bold">
                  {allAutomations.filter((a) => !a.groupId).length}
                </span>
              </button>

              {/* Custom groups */}
              {groups.map((group) => (
                <div key={group.id} className="group/item flex items-center justify-between rounded-[12px] hover:bg-[#F5F5F5] transition-all">
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex-1 flex items-center justify-between px-3 py-2 text-[12px] text-left rounded-[12px] ${selectedGroupId === group.id ? "bg-[#C7F33C]/20 text-black font-bold" : "text-[#505050]"}`}
                  >
                    <span className="flex items-center gap-2">
                      <Folder size={14} className="text-[#3b82f6]" fill="#3b82f6" /> {group.name}
                    </span>
                    <span className="text-[10px] bg-white border border-[#E8E8E8] px-1.5 py-0.5 rounded-full font-bold">
                      {allAutomations.filter((a) => a.groupId === group.id).length}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="opacity-0 group-hover/item:opacity-100 p-2 text-red-500 hover:text-red-700 transition-all"
                    title="Guruhni o'chirish"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Connected accounts section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-extrabold text-[#A0A0A0]">
              <span>Akkauntlar</span>
              <Link
                href="/settings?connect=choose"
                className="hover:text-black transition-colors p-0.5 rounded hover:bg-[#F5F5F5]"
                title="Kanal qo'shish"
              >
                <Plus size={14} />
              </Link>
            </div>

            <div className="flex flex-col gap-1.5">
              {channels.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-[#E8E8E8] rounded-[16px]">
                  <p className="text-[10px] text-[#A0A0A0] leading-normal">Hozircha hisob ulanmagan.</p>
                  <Link href="/settings?connect=choose">
                    <span className="inline-block mt-1 text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">
                      Kanal ulash →
                    </span>
                  </Link>
                </div>
              ) : (
                channels.map((ch) => {
                  const isSelected = selectedChannelId === ch.id;
                  const channelCount = allAutomations.filter((a) => a.channelId === ch.id).length;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        window.location.href = `/settings?tab=${ch.id}`;
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-[16px] text-[12px] border transition-all text-left ${isSelected ? "border-black bg-black text-white shadow-md scale-[1.02]" : "border-[#E8E8E8] bg-white text-[#505050] hover:border-black"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`grid h-6 w-6 place-items-center rounded-full shrink-0 ${ch.type === "instagram" ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]" : "bg-[#229ED9]"}`}>
                          {ch.type === "instagram" ? (
                            <Instagram size={10} className="text-white" />
                          ) : (
                            <Bot size={10} className="text-white" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate text-[11px] leading-tight">{ch.name}</span>
                          <span className={`text-[9px] truncate ${isSelected ? "text-white/60" : "text-[#707070]"}`}>{ch.username}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${isSelected ? "bg-white/20 text-white" : "bg-[#F0F0F0] text-[#707070]"}`}>
                        {channelCount}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>


        </div>

        {/* ================= RIGHT CONTENT PANEL ================= */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">

          {/* Breadcrumbs and Page title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm">
            <div>
              <div className="text-[10px] text-[#A0A0A0] uppercase font-bold tracking-wider mb-1">
                Boshqaruv / Oqimlar
              </div>
              <h1 className="text-[20px] font-extrabold text-black flex items-center gap-2 tracking-tight">
                {selectedGroupId === "all" ? (
                  "Barcha oqimlar"
                ) : selectedGroupId === "none" ? (
                  "Guruhsiz oqimlar"
                ) : (
                  <span>Guruh: {groups.find((g) => g.id === selectedGroupId)?.name}</span>
                )}
                {selectedChannelId !== "all" && (
                  <span className="text-[11px] font-normal bg-black text-[#C7F33C] px-2 py-0.5 rounded-full">
                    @{channels.find((c) => c.id === selectedChannelId)?.username}
                  </span>
                )}
                <span className="text-[11px] font-bold text-[#707070] bg-[#F5F5F5] border border-[#E8E8E8] px-2.5 py-0.5 rounded-full">
                  {filteredAutomations.length} ta oqim
                </span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Qidiruv..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[180px] sm:w-[220px] pl-8 pr-3 py-1.5 text-[11px] bg-white border border-[#E8E8E8] rounded-full focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium"
                />
                <Search size={12} className="absolute left-3 top-2.5 text-[#A0A0A0]" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2 text-[#707070] hover:text-black">
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 bg-white border border-[#E8E8E8] rounded-full px-2 py-0.5 min-w-[130px]">
                <SlidersHorizontal size={11} className="text-[#707070] shrink-0 ml-1.5" />
                <CustomDropdown
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: "recent", label: "Sana (yangi)" },
                    { value: "oldest", label: "Sana (eski)" },
                    { value: "runs", label: "Ishlash soni" },
                  ]}
                  className="border-0 bg-transparent p-0 text-[11px] font-bold text-[#505050] focus:border-0 focus:shadow-none hover:bg-transparent rounded-none h-auto w-auto flex-1 select-none pr-1"
                  dropdownClassName="min-w-[120px] right-0 left-auto mt-2"
                />
              </div>
            </div>
          </div>

          {/* No Channel Warn Badge */}
          {channels.length === 0 && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-[20px] bg-black text-white">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-[#C7F33C]" />
                <div>
                  <p className="text-[12px] font-bold">{"Hech qanday ijtimoiy tarmoq bog'lanmagan"}</p>
                  <p className="text-[10px] text-white/60">{"Yangi oqim yaratish yoki ishga tushirish uchun avval sahifada hisobni bog'lang."}</p>
                </div>
              </div>
              <Link href="/settings?connect=choose">
                <Button variant="accent" className="text-[10px] py-1.5 px-3.5 rounded-full whitespace-nowrap bg-[#C7F33C] text-black hover:bg-[#b0d82f]">
                  Hisob ulash →
                </Button>
              </Link>
            </div>
          )}

          {/* Templates Drawer / Accordion */}
          {showTemplates && (
            <div className="flex flex-col gap-3 bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                <h3 className="text-[13px] font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5">
                  📁 Shablonlar Kutubxonasi
                </h3>
                <span className="text-[9px] font-bold text-[#707070] bg-[#F5F5F5] px-2 py-0.5 rounded-full">
                  1-klikda yuklash
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* Template 1 */}
                <Card className="flex flex-col justify-between p-4 border border-[#E8E8E8] hover:border-black hover:shadow-md transition-all bg-white relative group rounded-[20px]">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#C7F33C]/20 text-black group-hover:bg-[#C7F33C] transition-all duration-300">
                      <BookOpen size={14} />
                    </div>
                    <h4 className="text-[12px] font-bold text-black mt-3">Lead Magnet Delivery</h4>
                    <p className="text-[10px] text-[#707070] mt-1 leading-relaxed">
                      {"DM orqali kalit so'z yozganda bepul qo'llanma havolasini yuborish."}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUseTemplate("lead_magnet")}
                    variant="secondary"
                    className="w-full mt-3.5 py-1.5 text-[10px] font-bold border border-[#E8E8E8] hover:bg-black hover:text-white hover:border-black transition-all rounded-[10px]"
                  >
                    Shablonni yuklash
                  </Button>
                </Card>

                {/* Template 2 */}
                <Card className="flex flex-col justify-between p-4 border border-[#E8E8E8] hover:border-black hover:shadow-md transition-all bg-white relative group rounded-[20px]">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#C7F33C]/20 text-black group-hover:bg-[#C7F33C] transition-all duration-300">
                      <Gift size={14} />
                    </div>
                    <h4 className="text-[12px] font-bold text-black mt-3">Story Mention Coupon</h4>
                    <p className="text-[10px] text-[#707070] mt-1 leading-relaxed">
                      Stories-da belgilagan foydalanuvchiga avtomatik chegirma kuponini yuborish.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUseTemplate("story_coupon")}
                    variant="secondary"
                    className="w-full mt-3.5 py-1.5 text-[10px] font-bold border border-[#E8E8E8] hover:bg-black hover:text-white hover:border-black transition-all rounded-[10px]"
                  >
                    Shablonni yuklash
                  </Button>
                </Card>

                {/* Template 3 */}
                <Card className="flex flex-col justify-between p-4 border border-[#E8E8E8] hover:border-black hover:shadow-md transition-all bg-white relative group rounded-[20px]">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#C7F33C]/20 text-black group-hover:bg-[#C7F33C] transition-all duration-300">
                      <MessageSquare size={14} />
                    </div>
                    <h4 className="text-[12px] font-bold text-black mt-3">Comment to DM Link</h4>
                    <p className="text-[10px] text-[#707070] mt-1 leading-relaxed">
                      Post ostiga izoh yozilganida izohga avtojavob va DM-ga havola.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUseTemplate("comment_dm")}
                    variant="secondary"
                    className="w-full mt-3.5 py-1.5 text-[10px] font-bold border border-[#E8E8E8] hover:bg-black hover:text-white hover:border-black transition-all rounded-[10px]"
                  >
                    Shablonni yuklash
                  </Button>
                </Card>

                {/* Template 4 */}
                <Card className="flex flex-col justify-between p-4 border border-[#E8E8E8] hover:border-black hover:shadow-md transition-all bg-white relative group rounded-[20px]">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#C7F33C]/20 text-black group-hover:bg-[#C7F33C] transition-all duration-300">
                      <HelpCircle size={14} />
                    </div>
                    <h4 className="text-[12px] font-bold text-black mt-3">Welcome FAQ Bot</h4>
                    <p className="text-[10px] text-[#707070] mt-1 leading-relaxed">
                      {"Yangi mijozlar uchun salomlashish va tez-tez so'raladigan savollar oqimi."}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUseTemplate("welcome_faq")}
                    variant="secondary"
                    className="w-full mt-3.5 py-1.5 text-[10px] font-bold border border-[#E8E8E8] hover:bg-black hover:text-white hover:border-black transition-all rounded-[10px]"
                  >
                    Shablonni yuklash
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* AI Quick Bot Creation Banner */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-black via-[#111111] to-[#222222] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10 shadow-md">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[#C7F33C] text-black shrink-0 shadow-inner">
                <Bot size={22} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-black bg-[#C7F33C] px-2 py-0.5 rounded-full">
                    Tezkor sozlash
                  </span>
                </div>
                <h2 className="text-[17px] font-black mt-2 tracking-tight">Tezkor Keyword Chatbot</h2>
                <p className="text-[11px] text-white/70 mt-1 max-w-[500px] leading-relaxed">
                  {"Murakkab vizual sxemalarni chizmasdan, shunchaki kalit so'zlar va javob matnini kiritib, bir daqiqada chatbot oqimini tayyorlang."}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedChannelId !== "all") {
                  setQuickBotChannelId(selectedChannelId);
                } else if (channels.length > 0) {
                  const activeCh = db.getActiveChannel();
                  setQuickBotChannelId(activeCh ? activeCh.id : channels[0].id);
                }
                setIsQuickBotModalOpen(true);
              }}
              className="px-5 py-2.5 bg-[#C7F33C] hover:bg-[#b0d82f] text-black font-extrabold rounded-full text-[11px] transition-all whitespace-nowrap shrink-0 shadow-md transform hover:scale-[1.02]"
            >
              + Tezkor bot yaratish
            </button>
          </div>

          {/* Grid of regular automation cards */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-black uppercase tracking-wider">
                {"Oqimlar Ro'yxati"}
              </h3>
              <span className="text-[10px] text-[#707070] bg-white px-2 py-0.5 rounded border border-[#E8E8E8] font-bold">
                {filteredAutomations.filter(a => a.active).length} ta faol
              </span>
            </div>

            {filteredAutomations.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-14 text-center border border-[#E8E8E8] rounded-[24px]">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F5F5F5] text-[#707070] mb-4">
                  <Zap size={20} className="text-[#A0A0A0]" />
                </div>
                <h3 className="text-[15px] font-bold text-black">Mos keladigan oqimlar topilmadi</h3>
                <p className="text-[11px] text-[#707070] mt-1 max-w-[280px] leading-normal">
                  {"Siz tanlagan guruh yoki qidiruv so'rovi bo'yicha hech qanday avtomatlashtirish yaratilmagan."}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => {
                      setSelectedGroupId("all");
                      setSelectedChannelId("all");
                      setSearchQuery("");
                    }}
                    variant="secondary"
                    className="text-[11px]"
                  >
                    Filtrlarni tozalash
                  </Button>
                  <Link href="/automations/builder">
                    <Button variant="primary" className="text-[11px] bg-black text-white hover:bg-black/90">
                      Oqim yaratish
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAutomations.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all relative group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`grid h-8 w-8 place-items-center rounded-[10px] shrink-0 ${a.active ? "bg-[#C7F33C]/20 text-black" : "bg-[#F5F5F5] text-[#A0A0A0]"}`}>
                          <Zap size={14} fill={a.active ? "currentColor" : "none"} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-wider block">
                            {a.triggerType === "keyword" ? "Kalit so'z" : "Story javob"}
                          </span>
                          <h3 className="text-[13px] font-extrabold text-black leading-tight mt-0.5 truncate max-w-[170px]" title={a.name}>
                            {a.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Menu */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setActiveCardMenuId(activeCardMenuId === a.id ? null : a.id)}
                          className="h-7 w-7 rounded-full hover:bg-[#F5F5F5] flex items-center justify-center text-[#707070] hover:text-black transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {activeCardMenuId === a.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveCardMenuId(null)}
                            />
                            <div className="absolute right-0 top-8 bg-white border border-[#E8E8E8] rounded-[16px] shadow-xl py-1.5 w-[160px] z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                onClick={() => {
                                  handleEditClick(a.id, a.channelId);
                                  setActiveCardMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#333] hover:bg-[#F5F5F5] text-left font-semibold"
                              >
                                ✏️ Tahrirlash
                              </button>
                              <button
                                onClick={() => {
                                  toggleActive(a.id, a.channelId);
                                  setActiveCardMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#333] hover:bg-[#F5F5F5] text-left font-semibold"
                              >
                                {a.active ? "⏸ Nofaol qilish" : "▶️ Faol qilish"}
                              </button>
                              
                              {/* Assign Group */}
                              <div className="h-[1px] bg-[#F0F0F0] my-1" />
                              <div className="px-3 py-1 text-[8px] uppercase font-bold text-[#A0A0A0]">
                                {"Guruhni o'zgartirish"}
                              </div>
                              <button
                                onClick={() => {
                                  handleSetAutomationGroup(a.id, a.channelId, undefined);
                                  setActiveCardMenuId(null);
                                }}
                                className={`w-full flex items-center gap-1.5 px-3 py-1 text-[10px] hover:bg-[#F5F5F5] text-left ${!a.groupId ? "font-bold text-black" : "text-[#707070]"}`}
                              >
                                📂 Guruhsiz
                              </button>
                              {groups.map((g) => (
                                <button
                                  key={g.id}
                                  onClick={() => {
                                    handleSetAutomationGroup(a.id, a.channelId, g.id);
                                    setActiveCardMenuId(null);
                                  }}
                                  className={`w-full flex items-center gap-1.5 px-3 py-1 text-[10px] hover:bg-[#F5F5F5] text-left ${a.groupId === g.id ? "font-bold text-black" : "text-[#707070]"}`}
                                >
                                  📂 {g.name}
                                </button>
                              ))}

                              <div className="h-[1px] bg-[#F0F0F0] my-1" />
                              <button
                                onClick={() => {
                                  handleDeleteClick(a.id, a.channelId);
                                  setActiveCardMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 text-left font-semibold"
                              >
                                {"🗑️ O'chirish"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Trigger details */}
                    <div className="bg-[#F9F9F9] rounded-[16px] px-3 py-2 text-[10px] text-[#505050] border border-[#F0F0F0] leading-relaxed">
                      <span className="text-[#A0A0A0] font-bold">Tepki:</span>{" "}
                      <span className="font-semibold text-black truncate max-w-full block mt-0.5">
                        {a.triggerDetails}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-b border-[#F0F0F0] py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-[#707070] uppercase font-bold tracking-wider">Ishga tushdi</span>
                        <span className="text-[14px] font-extrabold text-black mt-0.5">{a.runs}</span>
                      </div>
                      <div className="flex flex-col items-center border-l border-[#F0F0F0]">
                        <span className="text-[9px] text-[#707070] uppercase font-bold tracking-wider">Konversiya</span>
                        <span className="text-[14px] font-extrabold text-[#16A34A] mt-0.5">{a.completion}</span>
                      </div>
                    </div>

                    {/* Footer owner info and toggle switch */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {a.channel ? (
                          <>
                            <div className={`grid h-5 w-5 place-items-center rounded-full shrink-0 ${a.channel.type === "instagram" ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]" : "bg-[#229ED9]"}`}>
                              {a.channel.type === "instagram" ? (
                                <Instagram size={8} className="text-white" />
                              ) : (
                                <Bot size={8} className="text-white" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-black truncate max-w-[100px]" title={a.channel.username}>
                              {a.channel.username}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-[#A0A0A0]">{"Noma'lum kanal"}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold ${a.active ? "text-[#16A34A]" : "text-[#707070]"}`}>
                          {a.active ? "Faol" : "Nofaol"}
                        </span>
                        <button
                          onClick={() => toggleActive(a.id, a.channelId)}
                          className={[
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            a.active ? "bg-black" : "bg-[#F0F0F0]",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              a.active ? "translate-x-4 bg-[#C7F33C]" : "translate-x-0",
                            ].join(" ")}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ================= MODALS & CONFIRMATIONS ================= */}

      {/* Quick Bot Modal */}
      {isQuickBotModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-[#E8E8E8] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <h3 className="text-[14px] font-extrabold text-black flex items-center gap-2 uppercase tracking-wider">
                {"🤖 Tezkor Keyword Chatbot yaratish"}
              </h3>
              <button
                onClick={() => setIsQuickBotModalOpen(false)}
                className="text-[#707070] hover:text-black font-semibold text-[16px] p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Bot Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#707070] uppercase">Bot nomi</label>
                <input
                  type="text"
                  placeholder="Masalan: Chegirma Bot"
                  value={quickBotName}
                  onChange={(e) => setQuickBotName(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-white border border-[#E8E8E8] rounded-[12px] focus:outline-none focus:border-black font-semibold"
                />
              </div>

              {/* Channel Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#707070] uppercase">Kanalni tanlang</label>
                <CustomDropdown
                  value={quickBotChannelId}
                  onChange={setQuickBotChannelId}
                  placeholder="Kanalni tanlang..."
                  options={channels.map((ch) => ({
                    value: ch.id,
                    label: `${ch.name} (${ch.username})`,
                    icon: (
                      <span className="text-[14px]">
                        {ch.type === "instagram" ? "📸" : "✈️"}
                      </span>
                    ),
                  }))}
                />
              </div>

              {/* Keywords */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#707070] uppercase">{"Kalit so'zlar (vergul bilan)"}</label>
                <input
                  type="text"
                  placeholder="Masalan: narx, buyurtma, chegirma"
                  value={quickBotKeywords}
                  onChange={(e) => setQuickBotKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-white border border-[#E8E8E8] rounded-[12px] focus:outline-none focus:border-black font-semibold"
                />
              </div>

              {/* Reply Message */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#707070] uppercase">Javob xabari matni</label>
                <textarea
                  placeholder={"Foydalanuvchi kalit so'zni yozganda yuboriladigan xabar matni..."}
                  value={quickBotReply}
                  onChange={(e) => setQuickBotReply(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-[12px] bg-white border border-[#E8E8E8] rounded-[12px] focus:outline-none focus:border-black resize-none font-semibold text-[#303030]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#F0F0F0]">
              <Button
                onClick={() => setIsQuickBotModalOpen(false)}
                variant="secondary"
                className="text-[11px] font-bold px-4 py-2"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={handleCreateQuickBot}
                variant="primary"
                className="text-[11px] font-bold px-4 py-2 bg-black text-white hover:bg-black/90 rounded-[12px]"
              >
                Yaratish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isAddGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[#E8E8E8] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-wider">{"📂 Yangi guruh qo'shish"}</h3>
              <button
                onClick={() => setIsAddGroupModalOpen(false)}
                className="text-[#707070] hover:text-black font-semibold text-[14px] p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#707070] uppercase">Guruh nomi</label>
              <input
                type="text"
                placeholder="Masalan: Sotuvlar"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 text-[12px] bg-white border border-[#E8E8E8] rounded-[12px] focus:outline-none focus:border-black font-semibold"
              />
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                onClick={() => setIsAddGroupModalOpen(false)}
                variant="secondary"
                className="text-[11px] font-bold px-3.5 py-1.5"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={handleAddGroup}
                variant="primary"
                className="text-[11px] font-bold px-3.5 py-1.5 bg-black text-white hover:bg-black/90 rounded-[12px]"
              >
                {"Qo'shish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => {
          setDeleteTargetId(null);
          setDeleteTargetChannelId(null);
        }}
        onConfirm={handleConfirmDelete}
        title={"Oqimni o'chirish"}
        message={"Haqiqatan ham ushbu avtomatlashtirish oqimini butunlay o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi."}
        confirmText={"Ha, o'chirish"}
        cancelText={"Bekor qilish"}
      />

      {/* Group Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={groupDeleteTargetId !== null}
        onClose={() => setGroupDeleteTargetId(null)}
        onConfirm={() => {
          if (groupDeleteTargetId) {
            db.deleteGroup(groupDeleteTargetId);
            if (selectedGroupId === groupDeleteTargetId) {
              setSelectedGroupId("all");
            }
            setGroupDeleteTargetId(null);
            loadAllData();
          }
        }}
        title={"Guruhni o'chirish"}
        message={"Haqiqatan ham ushbu guruhni o'chirib tashlamoqchimisiz? Guruh ichidagi oqimlar o'chirilmaydi."}
        confirmText={"Ha, o'chirish"}
        cancelText={"Bekor qilish"}
      />

      {/* General Alert Modal */}
      <AlertModal
        isOpen={!!alertConfig?.isOpen}
        onClose={() => setAlertConfig(null)}
        title={alertConfig?.title || ""}
        message={alertConfig?.message || ""}
      />
    </AppLayout>
  );
}
