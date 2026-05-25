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
  MoreVertical,
  Pencil,
  Play,
  Pause
} from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, ConfirmModal, AlertModal } from "@/components/ui/primitives";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useI18n } from "@/i18n/I18nProvider";
import { db } from "@/lib/db";
import type { Automation, Channel, Group } from "@/lib/db";

export default function AutomationsPage() {
  const { t } = useI18n();
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

  // Yangi avtomatlashtirish popup modal state
  const [isCreateFlowModalOpen, setIsCreateFlowModalOpen] = useState(false);
  const [createFlowMode, setCreateFlowMode] = useState<"scratch" | "template">("scratch");

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
    const targetAuto = autos.find((a) => a.id === id);
    if (!targetAuto) return;

    if (!targetAuto.active) {
      // Activating: check active automations limit
      const user = db.getCurrentUser();
      const plan = user?.plan || "free";
      const maxAutos = plan === "premium" ? 500 : plan === "pro" ? 50 : 2;
      const currentActiveCount = db.getAllAutomations().filter((a) => a.active).length;

      if (currentActiveCount >= maxAutos) {
        showAlert(
          t("pages.settings_page.card_limit_title"),
          t("pages.automations_page.activation_limit_reached").replace("{limit}", String(maxAutos))
        );
        return;
      }
    }

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
      showAlert(t("common.error"), t("pages.automations_page.error_select_channel"));
      return;
    }
    if (!quickBotKeywords.trim()) {
      showAlert(t("common.error"), t("pages.automations_page.error_enter_keywords"));
      return;
    }
    if (!quickBotReply.trim()) {
      showAlert(t("common.error"), t("pages.automations_page.error_enter_reply"));
      return;
    }

    const user = db.getCurrentUser();
    const plan = user?.plan || "free";
    const maxAutos = plan === "premium" ? 500 : plan === "pro" ? 50 : 2;
    const currentActiveCount = db.getAllAutomations().filter((a) => a.active).length;
    const shouldBeActive = currentActiveCount < maxAutos;

    if (!shouldBeActive) {
      showAlert(
        t("pages.automations_page.quick_bot_title"),
        t("pages.automations_page.quick_bot_created_inactive").replace("{limit}", String(maxAutos))
      );
    }

    const current = db.getChannelAutomations(quickBotChannelId);
    const newAuto: Automation = {
      id: `quick_${Date.now()}`,
      name: quickBotName.trim() || t("pages.automations_page.quick_bot"),
      triggerType: "keyword",
      triggerDetails: quickBotKeywords.trim(),
      runs: "0",
      completion: "0%",
      active: shouldBeActive,
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
      showAlert(t("common.error"), t("pages.automations_page.error_enter_group_name"));
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
        showAlert(t("common.error"), t("pages.automations_page.template_error_no_channels"));
        return;
      }
    }

    const user = db.getCurrentUser();
    const plan = user?.plan || "free";
    const maxAutos = plan === "premium" ? 500 : plan === "pro" ? 50 : 2;
    const currentActiveCount = db.getAllAutomations().filter((a) => a.active).length;
    const shouldBeActive = currentActiveCount < maxAutos;

    if (!shouldBeActive) {
      showAlert(
        t("pages.automations_page.templates_title"),
        t("pages.automations_page.template_inactive").replace("{limit}", String(maxAutos))
      );
    }

    const current = db.getChannelAutomations(targetChannelId);
    const templates: Record<string, Automation> = {
      lead_magnet: { id: `tmpl_${Date.now()}`, name: t("pages.automations_page.tmpl_lead_magnet_name"), triggerType: "keyword", triggerDetails: t("pages.automations_page.tmpl_lead_magnet_trigger"), runs: "0", completion: "0%", active: shouldBeActive },
      story_coupon: { id: `tmpl_${Date.now()}`, name: t("pages.automations_page.tmpl_story_coupon_name"), triggerType: "story", triggerDetails: t("pages.automations_page.tmpl_story_coupon_trigger"), runs: "0", completion: "0%", active: shouldBeActive },
      comment_dm: { id: `tmpl_${Date.now()}`, name: t("pages.automations_page.tmpl_comment_dm_name"), triggerType: "keyword", triggerDetails: t("pages.automations_page.tmpl_comment_dm_trigger"), runs: "0", completion: "0%", active: shouldBeActive },
      welcome_faq: { id: `tmpl_${Date.now()}`, name: t("pages.automations_page.tmpl_welcome_faq_name"), triggerType: "keyword", triggerDetails: t("pages.automations_page.tmpl_welcome_faq_trigger"), runs: "0", completion: "0%", active: shouldBeActive },
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
            <h2 className="text-[16px] font-extrabold text-black tracking-tight">{t("pages.automations.title")}</h2>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsCreateFlowModalOpen(true)}
              className="w-full justify-center text-[12px] font-bold py-2.5 rounded-[12px] bg-black text-white hover:bg-black/90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} strokeWidth={2.5} /> {t("pages.automations_page.create_flow_btn")}
            </button>
            <button
              onClick={() => {
                window.location.href = "/automations/quick-bot";
              }}
              className="w-full justify-center text-[12px] font-bold py-2.5 rounded-[12px] bg-[#C7F33C] text-black hover:bg-[#b5e02c] transition-all flex items-center gap-1.5 shadow-sm border border-[#b2db2a]"
            >
              <Zap size={14} fill="currentColor" /> {t("pages.automations_page.quick_bot")}
            </button>
          </div>

          {/* Groups section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-extrabold text-[#A0A0A0]">
              <span>{t("pages.automations_page.groups")}</span>
              <button
                onClick={() => setIsAddGroupModalOpen(true)}
                className="hover:text-black transition-colors p-0.5 rounded hover:bg-[#F5F5F5]"
                title={t("pages.automations_page.add_group_title")}
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
                  <Folder size={14} className="text-black" /> {t("pages.automations_page.all_flows")}
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
                  <Folder size={14} className="text-[#808080]" /> {t("pages.automations_page.uncategorized")}
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
                    title={t("pages.automations_page.delete_group_title")}
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
              <span>{t("pages.automations_page.accounts")}</span>
              <Link
                href="/settings?connect=choose"
                className="hover:text-black transition-colors p-0.5 rounded hover:bg-[#F5F5F5]"
                title={t("pages.settings_page.manage_channels")}
              >
                <Plus size={14} />
              </Link>
            </div>

            <div className="flex flex-col gap-1.5">
              {channels.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-[#E8E8E8] rounded-[16px]">
                  <p className="text-[10px] text-[#A0A0A0] leading-normal">{t("pages.automations_page.no_accounts")}</p>
                  <Link href="/settings?connect=choose">
                    <span className="inline-block mt-1 text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">
                      {t("pages.automations_page.connect_channel")}
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
                {t("pages.automations.breadcrumb")}
              </div>
              <h1 className="text-[20px] font-extrabold text-black flex items-center gap-2 tracking-tight">
                {selectedGroupId === "all" ? (
                  t("pages.automations_page.all_flows")
                ) : selectedGroupId === "none" ? (
                  t("pages.automations_page.uncategorized")
                ) : (
                  <span>{t("pages.automations_page.groups")}: {groups.find((g) => g.id === selectedGroupId)?.name}</span>
                )}
                {selectedChannelId !== "all" && (
                  <span className="text-[11px] font-normal bg-black text-[#C7F33C] px-2 py-0.5 rounded-full">
                    @{channels.find((c) => c.id === selectedChannelId)?.username}
                  </span>
                )}
                <span className="text-[11px] font-bold text-[#707070] bg-[#F5F5F5] border border-[#E8E8E8] px-2.5 py-0.5 rounded-full">
                  {t("pages.automations_page.flows_count").replace("{count}", String(filteredAutomations.length))}
                </span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("pages.automations_page.search_placeholder")}
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
                    { value: "recent", label: t("pages.automations_page.sort_recent") },
                    { value: "oldest", label: t("pages.automations_page.sort_oldest") },
                    { value: "runs", label: t("pages.automations_page.sort_runs") },
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
                  <p className="text-[12px] font-bold">{t("pages.automations_page.no_channels_warning")}</p>
                  <p className="text-[10px] text-white/60">{t("pages.automations_page.no_channels_warning_desc")}</p>
                </div>
              </div>
              <Link href="/settings?connect=choose">
                <Button variant="accent" className="text-[10px] py-1.5 px-3.5 rounded-full whitespace-nowrap bg-[#C7F33C] text-black hover:bg-[#b0d82f]">
                  {t("pages.automations_page.connect_channel")}
                </Button>
              </Link>
            </div>
          )}



          {/* Grid of regular automation cards */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-black uppercase tracking-wider">
                {t("pages.automations_page.flows_list")}
              </h3>
              <span className="text-[10px] text-[#707070] bg-white px-2 py-0.5 rounded border border-[#E8E8E8] font-bold">
                {t("pages.automations_page.active_count").replace("{count}", String(filteredAutomations.filter(a => a.active).length))}
              </span>
            </div>

            {filteredAutomations.length === 0 ? (
              <div className="flex flex-col gap-6 w-full">
                {/* 1. Promotional Quick Bot Card (First Card, larger version) */}
                <Link 
                  href="/automations/quick-bot" 
                  className="bg-black hover:bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 flex flex-col justify-between gap-6 shadow-md hover:shadow-xl transition-all relative group cursor-pointer text-left"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="bg-[#C7F33C] text-black font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      Tezkor bot sozlash
                    </div>
                    <span className="text-[16px] text-[#C7F33C] group-hover:translate-x-1 transition-transform font-extrabold">→</span>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-white leading-tight mt-2">
                      Tezkor bot sozlash (Kalit so&apos;zli chat-bot)
                    </h3>
                    <p className="text-[12px] text-[#A0A0A0] mt-1.5 leading-relaxed font-medium">
                      Har qanday qurilmadan, murakkab bloklar va konstruktorsiz avtomatlashtirish yaratishning eng oson va tezkor usuli. Kalit so&apos;zni kiriting va javob matnini sozlang!
                    </p>
                  </div>
                </Link>

                {/* Templates Section */}
                <div className="flex flex-col gap-4 mt-2">
                  <h3 className="text-[14px] font-extrabold text-black uppercase tracking-wider text-left">
                    Tayyor shablonlar (Avtomatlashtirish shablonlari)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lead Magnet Template */}
                    <div 
                      onClick={() => handleUseTemplate("lead_magnet")}
                      className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group text-left"
                    >
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                          <BookOpen size={18} />
                        </div>
                        <span className="text-[12px] text-slate-400 group-hover:text-black transition-colors font-extrabold">Foydalanish →</span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-black">{t("pages.automations_page.tmpl_lead_magnet_name")}</h4>
                        <p className="text-[11px] text-[#707070] mt-1 leading-normal font-medium">
                          Mijozlar yozgan kalit so&apos;z (masalan: &quot;bonus&quot;) orqali ularga avtomatik tarzda PDF qo&apos;llanma yoki havola yuborish.
                        </p>
                      </div>
                    </div>

                    {/* Story Coupon Template */}
                    <div 
                      onClick={() => handleUseTemplate("story_coupon")}
                      className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group text-left"
                    >
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Gift size={18} />
                        </div>
                        <span className="text-[12px] text-slate-400 group-hover:text-black transition-colors font-extrabold">Foydalanish →</span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-black">{t("pages.automations_page.tmpl_story_coupon_name")}</h4>
                        <p className="text-[11px] text-[#707070] mt-1 leading-normal font-medium">
                          Mijozlar sizning hikoyangizga (story) munosabat bildirganda ularga avtomatik ravishda kupon yuborish.
                        </p>
                      </div>
                    </div>

                    {/* Comment DM Template */}
                    <div 
                      onClick={() => handleUseTemplate("comment_dm")}
                      className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group text-left"
                    >
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <MessageSquare size={18} />
                        </div>
                        <span className="text-[12px] text-slate-400 group-hover:text-black transition-colors font-extrabold">Foydalanish →</span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-black">{t("pages.automations_page.tmpl_comment_dm_name")}</h4>
                        <p className="text-[11px] text-[#707070] mt-1 leading-normal font-medium">
                          Postlar ostida izoh qoldirgan mijozlarga shaxsiy xabar (DM) orqali batafsil ma&apos;lumot yuborish.
                        </p>
                      </div>
                    </div>

                    {/* Welcome FAQ Template */}
                    <div 
                      onClick={() => handleUseTemplate("welcome_faq")}
                      className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group text-left"
                    >
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <HelpCircle size={18} />
                        </div>
                        <span className="text-[12px] text-slate-400 group-hover:text-black transition-colors font-extrabold">Foydalanish →</span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-black">{t("pages.automations_page.tmpl_welcome_faq_name")}</h4>
                        <p className="text-[11px] text-[#707070] mt-1 leading-normal font-medium">
                          Mijozlar birinchi marta yozganda salomlashish va eng ko&apos;p so&apos;raladigan savollarga tezkor javob berish.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* 1. Promotional Quick Bot Card (First Card) */}
                <Link 
                  href="/automations/quick-bot" 
                  className="bg-black hover:bg-neutral-900 border border-neutral-800 rounded-[24px] p-5 flex flex-col justify-between gap-6 shadow-sm hover:shadow-md transition-all relative group cursor-pointer text-left"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="bg-[#C7F33C] text-black font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      Tezkor bot sozlash
                    </div>
                    <span className="text-[16px] text-[#C7F33C] group-hover:translate-x-1 transition-transform font-extrabold">→</span>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-white leading-tight mt-2">
                      Kalit so&apos;zli chat-bot
                    </h3>
                    <p className="text-[11px] text-[#A0A0A0] mt-1 leading-normal font-medium">
                      Har qanday qurilmadan, konstruktorsiz avtomatlashtirish yaratishning yangi usuli
                    </p>
                  </div>
                </Link>

                {/* 2. User's Connected Automations */}
                {filteredAutomations.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all relative group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap size={14} className="text-[#10B981] fill-[#10B981] shrink-0" />
                        <h3 className="text-[13px] font-black text-black leading-tight line-clamp-2 break-words flex-1" title={a.name}>
                          {a.name}
                        </h3>
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
                                <Pencil size={12} className="text-[#707070] shrink-0" />
                                {t("pages.automations_page.edit_action")}
                              </button>
                              <button
                                onClick={() => {
                                  toggleActive(a.id, a.channelId);
                                  setActiveCardMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#333] hover:bg-[#F5F5F5] text-left font-semibold"
                              >
                                {a.active ? (
                                  <>
                                    <Pause size={12} className="text-[#707070] shrink-0" />
                                    {t("pages.automations_page.deactivate_action")}
                                  </>
                                ) : (
                                  <>
                                    <Play size={12} className="text-[#707070] shrink-0" />
                                    {t("pages.automations_page.activate_action")}
                                  </>
                                )}
                              </button>
                              
                              {/* Assign Group */}
                              <div className="h-[1px] bg-[#F0F0F0] my-1" />
                              <div className="px-3 py-1 text-[8px] uppercase font-bold text-[#A0A0A0]">
                                {t("pages.automations_page.change_group")}
                              </div>
                              <button
                                onClick={() => {
                                  handleSetAutomationGroup(a.id, a.channelId, undefined);
                                  setActiveCardMenuId(null);
                                }}
                                className={`w-full flex items-center gap-1.5 px-3 py-1 text-[10px] hover:bg-[#F5F5F5] text-left ${!a.groupId ? "font-bold text-black" : "text-[#707070]"}`}
                              >
                                <Folder size={12} className="text-[#707070] shrink-0 mr-1.5" />{t("pages.automations_page.uncategorized")}
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
                                  <Folder size={12} className="text-[#707070] shrink-0 mr-1.5" fill="none" />{g.name}
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
                                <Trash2 size={12} className="text-red-500 shrink-0" />
                                {t("pages.automations_page.delete_action")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-left mt-3.5 bg-[#F5F5F7] border border-[#E8E8E8] rounded-xl p-2">
                      <div className="bg-white border border-[#E8E8E8]/80 rounded-[10px] p-2">
                        <span className="text-[8px] text-[#A0A0A0] uppercase font-bold tracking-wider block">Kontaktlar</span>
                        <p className="text-[14px] font-black text-black mt-0.5">{a.runs}</p>
                      </div>
                      <div className="bg-white border border-[#E8E8E8]/80 rounded-[10px] p-2">
                        <span className="text-[8px] text-[#A0A0A0] uppercase font-bold tracking-wider block">Konversiya</span>
                        <p className="text-[14px] font-black text-[#16A34A] mt-0.5">{a.completion}</p>
                      </div>
                    </div>

                    {/* Footer Owner Profile */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F5F5F5] min-w-0">
                      {a.channel?.avatar ? (
                        <img src={a.channel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {a.channel?.name ? a.channel.name.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                      <span className="text-[10px] text-[#707070] font-bold truncate">
                        @{a.channel?.username.replace(/^@+/, "") || "isroil.ai"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ================= MODALS & CONFIRMATIONS ================= */}

      {/* Yangi Avtomatlashtirish Modal */}
      {isCreateFlowModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E8E8E8] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 relative text-black">
            <button
              onClick={() => setIsCreateFlowModalOpen(false)}
              className="absolute right-4 top-4 text-[#707070] hover:text-black font-semibold text-[16px] p-1"
            >
              ✕
            </button>

            <div>
              <h3 className="text-[17px] font-black text-black tracking-tight">
                Yangi avtomatlashtirish
              </h3>
              <p className="text-[12px] text-[#707070] mt-1 font-medium">
                Avtomatlashtirishni yaratish usulini tanlang
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option 1: Scratch */}
              <label 
                className={`border rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all ${createFlowMode === "scratch" ? "border-black bg-[#C7F33C]/10 font-semibold" : "border-[#E8E8E8] hover:border-black/20"}`}
                onClick={() => setCreateFlowMode("scratch")}
              >
                <input 
                  type="radio" 
                  name="create_flow_mode" 
                  checked={createFlowMode === "scratch"} 
                  readOnly 
                  className="mt-1 h-4 w-4 text-black border-[#D8D8D8] focus:ring-black shrink-0" 
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-black">Noldan o&apos;zingiz bajaring</span>
                  <span className="text-[10.5px] text-[#707070] mt-0.5 font-medium leading-relaxed">
                    Servisning imkoniyatlari bilan tanish bo&apos;lgan ilg&apos;or foydalanuvchilar uchun mos keladi
                  </span>
                </div>
              </label>

              {/* Option 2: Template */}
              <label 
                className={`border rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all ${createFlowMode === "template" ? "border-black bg-[#C7F33C]/10 font-semibold" : "border-[#E8E8E8] hover:border-black/20"}`}
                onClick={() => setCreateFlowMode("template")}
              >
                <input 
                  type="radio" 
                  name="create_flow_mode" 
                  checked={createFlowMode === "template"} 
                  readOnly 
                  className="mt-1 h-4 w-4 text-black border-[#D8D8D8] focus:ring-black shrink-0" 
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-black">Tayyor shablon bo&apos;yicha</span>
                  <span className="text-[10.5px] text-[#707070] mt-0.5 font-medium leading-relaxed">
                    5 daqiqada birinchi avtomatlashtirishni ishga tushirishni rejalashtirgan yangi boshlovchilar uchun mos keladi
                  </span>
                </div>
              </label>
            </div>

            <button
              onClick={() => {
                setIsCreateFlowModalOpen(false);
                if (createFlowMode === "scratch") {
                  window.location.href = "/automations/builder";
                } else {
                  window.location.href = "/automations/templates";
                }
              }}
              className="w-full py-3 bg-black hover:bg-black/90 text-white font-extrabold rounded-xl text-[12px] transition-all text-center active:scale-95 shadow-sm mt-2"
            >
              Keyin
            </button>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isAddGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[#E8E8E8] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-wider">📂 {t("pages.automations_page.add_group_title")}</h3>
              <button
                onClick={() => setIsAddGroupModalOpen(false)}
                className="text-[#707070] hover:text-black font-semibold text-[14px] p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#707070] uppercase">{t("pages.automations_page.group_name_label")}</label>
              <input
                type="text"
                placeholder={t("pages.automations_page.group_name_placeholder")}
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
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleAddGroup}
                variant="primary"
                className="text-[11px] font-bold px-3.5 py-1.5 bg-black text-white hover:bg-black/90 rounded-[12px]"
              >
                {t("common.create")}
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
        title={t("pages.automations_page.delete_confirm_title")}
        message={t("pages.automations_page.delete_confirm_msg")}
        confirmText={t("pages.settings_page.delete_confirm_btn")}
        cancelText={t("common.cancel")}
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
        title={t("pages.automations_page.delete_group_title")}
        message={t("pages.automations_page.delete_group_desc")}
        confirmText={t("pages.settings_page.delete_confirm_btn")}
        cancelText={t("common.cancel")}
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
