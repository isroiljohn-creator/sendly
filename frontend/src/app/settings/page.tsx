"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, StatusPill, ConfirmModal, AlertModal } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Save, Database, Trash2, Plus, Bot, X, CheckCircle, ChevronDown, Download, Upload } from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { db } from "@/lib/db";
import type { User, Channel } from "@/lib/db";

type ModalType = "instagram" | "telegram" | "choose" | null;

export default function SettingsPage() {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<string>("general");

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://api.sendly.uz/webhooks/instagram");
  const [isIgConnected] = useState(true);

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);

  // Instagram OAuth states
  const [oAuthWaiting, setOAuthWaiting] = useState(false);

  // Listen to Meta OAuth messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
      const allowedOrigins = [window.location.origin];
      try {
        allowedOrigins.push(new URL(backendUrl).origin);
      } catch {
        console.error("Invalid NEXT_PUBLIC_BACKEND_URL:", backendUrl);
      }

      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data?.type === "INSTAGRAM_CONNECTED") {
        const { username, name, followers } = event.data;

        const userPlan = db.getCurrentUser()?.plan || "free";
        const limit = userPlan === "premium" ? 10 : 1;
        if (db.getChannels().length >= limit) {
          setModal(null);
          setOAuthWaiting(false);
          showAlert(t("pages.settings_page.card_limit_title"), t("pages.settings_page.card_limit_msg").replace("{limit}", limit.toString()));
          return;
        }

        const newCh = db.addChannel({
          type: "instagram",
          name: name || username,
          username: username,
          isConnected: true,
          followersCount: followers || "0",
        });

        setModal(null);
        setOAuthWaiting(false);
        refreshChannels();
        setActiveSection(newCh.id);
        showAlert(t("common.success"), t("pages.settings_page.ig_link_success"));
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, []);

  useEffect(() => {
    if (modal !== "instagram") {
      setOAuthWaiting(false);
    }
  }, [modal]);



  const handleInstagramLogin = async () => {
    if (!currentUser?.id) {
      showAlert(t("common.error"), t("pages.settings_page.invalid_session"));
      return;
    }

    setOAuthWaiting(true);
    const width = 580;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    try {
      const tokenRes = await fetch(`/api/auth/token?userId=${currentUser.id}`);
      if (!tokenRes.ok) throw new Error("Token olishda xatolik yuz berdi");
      const { token: jwtToken } = await tokenRes.json();

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.sendly.uz";
      window.open(
        `${backendUrl}/oauth/instagram/start?token=${jwtToken}`,
        "instagram_oauth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );
    } catch (err: unknown) {
      setOAuthWaiting(false);
      showAlert(t("common.error"), t("pages.settings_page.ig_link_error") + ": " + (err instanceof Error ? err.message : String(err)));
    }
  };


  // Telegram connection form
  const [tgToken, setTgToken] = useState("");
  const [tgName, setTgName] = useState("");
  const [tgUsername, setTgUsername] = useState("");



  // Modal states
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isChannelDeleteModalOpen, setIsChannelDeleteModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Team members state — initialized from real current user in useEffect
  const [teamMembers, setTeamMembers] = useState<{id: string; name: string; email: string; role: string}[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Administrator");

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newMember = {
      id: `m_${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole
    };
    setTeamMembers([...teamMembers, newMember]);
    setInviteEmail("");
    showAlert(t("common.success"), t("pages.settings_page.team_title") + " (" + inviteEmail + ")");
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, role: newRole } : m));
    showAlert(t("common.success"), t("common.success"));
  };
  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  const refreshChannels = () => {
    setChannels(db.getChannels());
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setName(user.fullName);
      setEmail(user.email);
      // Initialize team with real current user as Owner
      setTeamMembers([
        { id: user.id || "owner", name: user.fullName, email: user.email, role: "Egasi" }
      ]);
    }

    refreshChannels();

    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      if (tabParam === "subscription" || tabParam === "billing") {
        window.location.href = "/account?tab=billing";
      } else {
        setActiveSection(tabParam === "profile" ? "general" : tabParam);
      }
    }

    const connectParam = searchParams.get("connect");
    if (connectParam) {
      setModal("choose");
    }

    window.addEventListener("replai-db-update", refreshChannels);
    return () => {
      window.removeEventListener("replai-db-update", refreshChannels);
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Save updated name/email
    const users = db.getUsers();
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx > -1) {
      users[idx].fullName = name;
      users[idx].email = email;
      localStorage.setItem("replai_users", JSON.stringify(users));
    }
    
    const updatedUser = { ...currentUser, fullName: name, email };
    localStorage.setItem("replai_current_user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    showAlert(t("common.success"), t("toast.success"));
  };



  const handleConfirmClear = () => {
    db.clearAllData();
    window.location.reload();
  };



  // Instagram connection is now handled securely via Facebook login flow

  const handleAddTelegram = () => {
    if (!tgToken.trim() || !tgUsername.trim()) return;
    const userPlan = db.getCurrentUser()?.plan || "free";
    const limit = userPlan === "premium" ? 10 : 1;
    if (db.getChannels().length >= limit) {
      setModal(null);
      showAlert(t("pages.settings_page.card_limit_title"), t("pages.settings_page.card_limit_msg").replace("{limit}", limit.toString()));
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const newCh = db.addChannel({
        type: "telegram",
        name: tgName || tgUsername,
        username: tgUsername.startsWith("@") ? tgUsername : `@${tgUsername}`,
        telegramToken: tgToken,
        isConnected: true,
        followersCount: "0",
      });
      setTgToken("");
      setTgName("");
      setTgUsername("");
      setModal(null);
      setSaving(false);
      refreshChannels();
      setActiveSection(newCh.id);
      showAlert(t("common.success"), t("pages.settings_page.tg_link_success"));
    }, 800);
  };

  const handleConfirmDeleteChannel = () => {
    if (!channelToDelete) return;
    db.removeChannel(channelToDelete.id);
    refreshChannels();
    setIsChannelDeleteModalOpen(false);
    setChannelToDelete(null);
    setDeleteConfirmInput("");
    setActiveSection("general");
    showAlert(t("common.success"), t("pages.settings_page.delete_success"));
  };

  const handleExportDatabase = () => {
    try {
      const data = db.exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `sendly_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showAlert(t("common.success"), t("pages.settings_page.export_success"));
    } catch {
      showAlert(t("common.error"), t("common.error"));
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsedData = JSON.parse(fileContent);
        
        const success = db.importData(parsedData);
        if (success) {
          showAlert(t("common.success"), t("pages.settings_page.import_success"));
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showAlert(t("common.error"), t("pages.settings_page.import_error"));
        }
      } catch {
        showAlert(t("common.error"), t("common.error"));
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("pages.settings.title")}
          breadcrumbs={t("pages.settings.breadcrumb")}
        />

        <div className="flex bg-white rounded-[24px] border border-[#D8D8D8] min-h-[calc(100vh-180px)] overflow-hidden shadow-sm">
          {/* Left Column: Settings Sub-sidebar */}
          <div className="w-[260px] shrink-0 border-r border-[#E8E8E8] flex flex-col justify-between bg-white p-5">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-[17px] font-bold text-black px-2">{t("pages.settings.title")}</h2>
              </div>

              {/* Workspace Section */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#909090] uppercase tracking-wider px-2 mb-1">
                  {t("pages.settings_page.workspace_section")}
                </span>
                <button
                  onClick={() => setActiveSection("general")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "general"
                      ? "bg-[#EFF2FC] text-black font-bold"
                      : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.general")}
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/contacts";
                  }}
                  className="flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-[#707070] hover:bg-[#F9F9F7] hover:text-black text-left"
                >
                  {t("pages.settings_page.contacts")}
                </button>
                <button
                  onClick={() => setActiveSection("integrations")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "integrations"
                      ? "bg-[#EFF2FC] text-black font-bold"
                      : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings.tab_integrations")}
                </button>
                <button
                  onClick={() => setActiveSection("team")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "team"
                      ? "bg-[#EFF2FC] text-black font-bold"
                      : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.team")}
                </button>
                <button
                  onClick={() => setActiveSection("apikeys")}
                  className={`flex items-center w-full px-3 py-2 text-[12px] font-semibold rounded-[10px] transition-colors text-left ${
                    activeSection === "apikeys"
                      ? "bg-[#EFF2FC] text-black font-bold"
                      : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                  }`}
                >
                  {t("pages.settings_page.apikeys")}
                </button>
              </div>

              {/* Accounts Section */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-bold text-[#909090] uppercase tracking-wider">
                    {t("pages.settings_page.accounts")}
                  </span>
                  <button
                    onClick={() => setModal("choose")}
                    className="text-[#707070] hover:text-black hover:bg-[#F0F0F0] rounded-full p-0.5 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
                  {channels.length === 0 ? (
                    <span className="text-[11px] text-[#a0a0a0] px-2 italic py-1">{t("pages.settings_page.no_channel")}</span>
                  ) : (
                    channels.map((ch) => {
                      const isSelected = activeSection === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setActiveSection(ch.id)}
                          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] transition-colors text-left ${
                            isSelected
                              ? "bg-[#EFF2FC] text-black font-bold"
                              : "text-[#707070] hover:bg-[#F9F9F7] hover:text-black"
                          }`}
                        >
                          <div
                            className={`grid h-5 w-5 place-items-center rounded-full shrink-0 ${
                              ch.type === "instagram"
                                ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
                                : "bg-[#229ED9]"
                            }`}
                          >
                            {ch.type === "instagram" ? (
                              <Instagram size={10} className="text-white" />
                            ) : (
                              <Bot size={10} className="text-white" />
                            )}
                          </div>
                          <span className="text-[12px] truncate">{ch.username}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#a0a0a0] text-center pt-4 border-t border-[#F0F0F0]">
              v1.0.0 · Sendly
            </div>
          </div>

          {/* Right Column: Settings Content */}
          <div className="flex-1 p-8 md:p-10 bg-white overflow-y-auto">
            {/* General Tab */}
            {activeSection === "general" && (
              <div className="flex flex-col gap-6 max-w-[600px]">
                <Card className="border border-[#D8D8D8]">
                  <form onSubmit={handleSave} className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-[15px] font-medium text-black">
                        {t("pages.settings_page.user_details")}
                      </h3>
                      <p className="text-[12px] text-[#707070] mt-0.5">
                        {t("pages.settings_page.user_details_desc")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#707070] px-1">
                        {t("pages.settings_page.full_name")}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#707070] px-1">
                        {t("pages.settings_page.email")}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="accent"
                      className="flex items-center justify-center gap-1.5 py-3 self-start text-[12px]"
                    >
                      <Save size={14} />
                      <span>{t("pages.settings.save_settings")}</span>
                    </Button>
                  </form>
                </Card>

                {/* Database Backup & Management Option */}
                <Card className="border border-[#D8D8D8] bg-white">
                  <div className="flex flex-col gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-black" />
                        <h3 className="text-[15px] font-medium text-black">
                          {t("pages.settings_page.db_manage")}
                        </h3>
                      </div>
                      <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                        {t("pages.settings_page.db_manage_desc")}
                      </p>
                    </div>

                    {/* Import & Export Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Export Button */}
                      <button
                        type="button"
                        onClick={handleExportDatabase}
                        className="flex flex-col items-center justify-center gap-3 p-5 rounded-[20px] border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-black transition-all active:scale-[0.98] group text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                          <Download size={18} />
                        </div>
                        <div>
                          <span className="text-[13px] font-bold block">{t("pages.settings_page.db_export")}</span>
                          <span className="text-[10px] text-[#707070] block mt-0.5">{t("pages.settings_page.db_export_desc")}</span>
                        </div>
                      </button>

                      {/* Import Button */}
                      <label className="flex flex-col items-center justify-center gap-3 p-5 rounded-[20px] border border-[#E8E8E8] hover:border-black bg-[#F9F9F7] text-black transition-all active:scale-[0.98] group cursor-pointer text-center relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportDatabase}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                          <Upload size={18} />
                        </div>
                        <div>
                          <span className="text-[13px] font-bold block">{t("pages.settings_page.db_import")}</span>
                          <span className="text-[10px] text-[#707070] block mt-0.5">{t("pages.settings_page.db_import_desc")}</span>
                        </div>
                      </label>
                    </div>

                    <hr className="border-[#F0F0F0]" />

                    {/* Reset Actions (Secondary) */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-black">{t("pages.settings_page.extra_actions")}</span>
                        <span className="text-[10px] text-[#707070]">{t("pages.settings_page.extra_actions_desc")}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsClearModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-full border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 px-4 py-2 text-[11px] font-semibold transition-all active:scale-95"
                        >
                          <Trash2 size={13} />
                          {t("pages.settings_page.clear_all")}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            {/* Team Members Tab */}
            {activeSection === "team" && (
              <div className="max-w-[640px] flex flex-col gap-6">
                <div>
                  <h3 className="text-[28px] font-bold text-black">{t("pages.settings_page.team")}</h3>
                </div>

                {/* Invite form row */}
                <form onSubmit={handleInviteMember} className="flex gap-3 items-center mt-2 pb-6 border-b border-[#F0F0F0]">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 rounded-[10px] border border-[#D8D8D8] px-4 py-3 text-[13px] text-black focus:outline-none focus:border-black"
                    placeholder={t("pages.settings_page.invite_email_placeholder")}
                  />
                  <div className="relative">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="appearance-none bg-white rounded-[10px] border border-[#D8D8D8] pl-4 pr-10 py-3 text-[13px] font-semibold text-black focus:outline-none focus:border-black cursor-pointer h-[44px]"
                    >
                      <option value="Administrator">{t("pages.settings_page.team_role_admin")}</option>
                      <option value="Egasi">{t("pages.settings_page.team_role_owner")}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#707070]">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[13px] px-6 rounded-[10px] transition-colors"
                  >
                    {t("pages.settings_page.invite_btn")}
                  </button>
                </form>

                {/* Team members list */}
                <div className="mt-4 flex flex-col">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="py-4 flex justify-between items-center border-b border-[#F0F0F0]">
                      <div>
                        <p className="text-[14px] font-bold text-black">{member.name}</p>
                        <p className="text-[12px] text-[#707070] mt-0.5">{member.email}</p>
                      </div>
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="appearance-none bg-transparent pl-2 pr-8 py-1.5 text-[13px] font-semibold text-[#707070] hover:text-black focus:outline-none cursor-pointer"
                        >
                          <option value="Egasi">{t("pages.settings_page.team_role_owner")}</option>
                          <option value="Administrator">{t("pages.settings_page.team_role_admin")}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-[#707070]">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeSection === "integrations" && (
              <div className="flex flex-col gap-6 max-w-[650px]">
                {/* Instagram Connection Status */}
                <Card className="border border-[#D8D8D8]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#E1306C]/10 text-[#E1306C] shrink-0">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[16px] font-medium text-black">Instagram Direct Api</h3>
                          <StatusPill status={isIgConnected} activeText={t("common.active")} inactiveText={t("common.inactive")} />
                        </div>
                        <p className="mt-1 text-[12px] text-[#707070]">
                          {t("pages.settings_page.ig_direct_desc")}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-2 rounded-full text-[12px] font-medium bg-[#C7F33C]/10 text-[#5A7C1E]">
                      {t("pages.settings_page.ig_direct_active")}
                    </div>
                  </div>
                </Card>

                {/* Custom Webhooks Info */}
                <Card className="border border-[#D8D8D8]">
                  <form onSubmit={handleSave} className="flex flex-col gap-5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Database size={16} className="text-black" />
                        <h3 className="text-[15px] font-medium text-black">Webhooks & API</h3>
                      </div>
                      <p className="text-[12px] text-[#707070] mt-0.5">
                        {t("pages.settings_page.webhook_desc")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#707070] px-1">
                        {t("pages.settings_page.webhook_url_label")}
                      </label>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="accent"
                      className="flex items-center justify-center gap-1.5 py-3 self-start text-[12px]"
                    >
                      <Save size={14} />
                      <span>{t("pages.settings_page.webhook_update_btn")}</span>
                    </Button>
                  </form>
                </Card>
              </div>
            )}

            {/* API Keys Tab */}
            {activeSection === "apikeys" && (
              <div className="max-w-[640px] flex flex-col gap-6">
                <div>
                  <h3 className="text-[28px] font-bold text-black">API Keys</h3>
                  <p className="text-[13px] text-[#707070] mt-1.5">{t("pages.settings_page.api_keys_desc")}</p>
                </div>

                <div className="p-5 rounded-[14px] bg-[#F9F9F7] border border-[#F0F0F0] mt-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-black uppercase tracking-wider">{t("pages.settings_page.api_key_label")}</span>
                    <span className="bg-[#C7F33C]/20 text-[#5A7C1E] text-[10px] font-bold px-2 py-0.5 rounded-full">{t("common.active")}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="password"
                      readOnly
                      value="pk_live_51Mxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="flex-1 rounded-[10px] border border-[#D8D8D8] px-4 py-2.5 text-[13px] text-black bg-white focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => showAlert("Nusxalandi", "API kalit buferga nusxalandi.")}
                      className="h-[38px] bg-black hover:bg-black/80 text-white font-semibold text-[12px] px-4 rounded-[10px] transition-colors"
                    >
                      {t("common.copy")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Channel Management Settings (matching 2nd screenshot layout) */}
            {(() => {
              const selectedCh = channels.find((c) => c.id === activeSection);
              if (!selectedCh) return null;
              const isInstagram = selectedCh.type === "instagram";
              return (
                <div className="max-w-[650px] flex flex-col gap-8 bg-white p-6 rounded-[20px] border border-[#E8E8E8]">
                  {/* Account Heading details */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-full shrink-0 text-white ${
                        isInstagram
                          ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
                          : "bg-[#229ED9]"
                      }`}
                    >
                      {isInstagram ? <Instagram size={18} /> : <Bot size={18} />}
                    </div>
                    <span className="text-[13px] font-medium text-[#707070]">{selectedCh.username}</span>
                  </div>

                  <div>
                    <h1 className="text-[26px] font-bold text-black leading-tight">{t("pages.settings_page.acct_settings_title")}</h1>
                  </div>

                  {/* Section 1: Refresh Permissions */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[15px] font-bold text-black">
                      {isInstagram ? t("pages.settings_page.refresh_ig_perms") : t("pages.settings_page.refresh_tg_conn")}
                    </h3>
                    <p className="text-[13px] text-[#707070] leading-relaxed">
                      {isInstagram ? t("pages.settings_page.ig_perms_desc") : t("pages.settings_page.tg_perms_desc")}
                    </p>
                    <button
                      disabled={refreshingPermissions}
                      onClick={() => {
                        setRefreshingPermissions(true);
                        setTimeout(() => {
                          setRefreshingPermissions(false);
                          showAlert(
                            "Muvaffaqiyatli",
                            isInstagram ? t("pages.settings_page.refresh_success_ig") : t("pages.settings_page.refresh_success_tg")
                          );
                        }, 1500);
                      }}
                      className="bg-[#1F69FF] hover:bg-[#1558E8] text-white text-[12px] font-semibold px-5 py-3 rounded-[12px] self-start transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75"
                    >
                      {refreshingPermissions ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{t("pages.settings_page.refreshing")}</span>
                        </>
                      ) : (
                        <span>{t("pages.settings_page.refresh_btn")}</span>
                      )}
                    </button>
                  </div>

                  <hr className="border-[#F0F0F0]" />

                  {/* Section 2: Remove Account */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[15px] font-bold text-black">{t("pages.settings_page.remove_account")}</h3>
                    <p className="text-[13px] text-[#707070] leading-relaxed">
                      {t("pages.settings_page.remove_account_desc")}
                    </p>
                    <button
                      onClick={() => {
                        setChannelToDelete(selectedCh);
                        setIsChannelDeleteModalOpen(true);
                      }}
                      className="border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 text-[12px] font-semibold px-5 py-3 rounded-[12px] self-start transition-all active:scale-95"
                    >
                      {t("pages.settings_page.remove_account")}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={t("pages.settings_page.clear_data_confirm_title")}
        message={t("pages.settings_page.clear_data_confirm_desc")}
        confirmText={t("pages.settings_page.clear_data_confirm_btn")}
        cancelText={t("common.cancel")}
      />



      {/* Delete Channel confirmation */}
      {isChannelDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
          <div className="w-full max-w-[380px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-semibold text-black leading-tight">
              {t("pages.settings_page.delete_channel_confirm_title")}
            </h3>
            <p className="mt-2.5 text-[12px] text-[#707070] leading-relaxed">
              {t("pages.settings_page.delete_channel_confirm_desc")}
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#707070] uppercase">{t("pages.settings_page.delete_confirm_label")}</label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={t("pages.settings_page.delete_confirm_placeholder")}
                className="w-full rounded-[10px] border border-[#D8D8D8] px-3 py-2 text-[12px] text-black outline-none focus:border-black"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setIsChannelDeleteModalOpen(false);
                  setDeleteConfirmInput("");
                  setChannelToDelete(null);
                }}
                className="rounded-full bg-[#F0F0F0] px-4 py-2 font-medium text-black hover:bg-[#E8E8E8] active:scale-95 transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput !== t("pages.settings_page.delete_confirm_placeholder")}
                onClick={handleConfirmDeleteChannel}
                className="rounded-full bg-[#DC2626] px-4 py-2 font-medium text-white hover:bg-[#B91C1C] disabled:opacity-40 disabled:hover:bg-[#DC2626] active:scale-95 transition-all"
              >
                {t("pages.settings_page.delete_confirm_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        buttonText={"OK"}
      />

      {/* ── CHOOSE CHANNEL MODAL ── */}
      {modal === "choose" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[360px] shadow-2xl overflow-hidden p-6 border border-[#D8D8D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0] mb-5">
              <h3 className="text-[15px] font-bold text-black">{t("pages.settings_page.choose_channel_type")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setModal("instagram")}
                className="flex items-center gap-3 w-full p-3.5 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white">
                  <Instagram size={16} />
                </div>
                <div>
                  <p className="font-semibold text-black">{t("pages.settings_page.ig_direct_api")}</p>
                  <p className="text-[11px] text-[#707070]">{t("pages.settings_page.ig_direct_subtitle")}</p>
                </div>
              </button>
              <button
                onClick={() => setModal("telegram")}
                className="flex items-center gap-3 w-full p-3.5 rounded-[16px] border border-[#E8E8E8] hover:border-black text-[13px] font-medium transition-all text-left"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#229ED9] text-white">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="font-semibold text-black">{t("pages.settings_page.tg_bot_title")}</p>
                  <p className="text-[11px] text-[#707070]">{t("pages.settings_page.tg_bot_subtitle")}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INSTAGRAM MODAL ── */}
      {modal === "instagram" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[420px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]">
                <Instagram size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] font-bold text-black">{t("pages.settings_page.link_ig_title")}</h2>
                <p className="text-[11px] text-[#707070]">{t("pages.settings_page.link_ig_subtitle")}</p>
              </div>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
              {/* Connected Icons Illustration */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#bc1888] to-[#e6683c] flex items-center justify-center shadow-lg text-white">
                  <Instagram size={28} />
                </div>
                <div className="text-[#a0a0a0] font-bold text-[20px]">⇄</div>
                <div className="w-14 h-14 rounded-2xl bg-[#0095f6]/10 flex items-center justify-center shadow-sm border border-[#0095f6]/20 text-[#0095f6]">
                  <span className="font-bold text-[22px]">S</span>
                </div>
              </div>

              <div>
                <h3 className="text-[16px] font-bold text-black leading-snug">
                  {t("pages.settings_page.link_ig_title")}
                </h3>
                <p className="text-[12px] text-[#707070] mt-2 max-w-[320px] mx-auto leading-relaxed">
                  {t("pages.settings_page.ig_connect_desc")}
                </p>
              </div>

              {oAuthWaiting ? (
                <div className="w-full p-4 rounded-2xl bg-[#EFF2FC] border border-[#EFF2FC] flex flex-col items-center gap-3 animate-pulse">
                  <span className="w-6 h-6 border-3 border-[#0095f6]/30 border-t-[#0095f6] rounded-full animate-spin" />
                  <p className="text-[12px] font-medium text-[#0095f6]">
                    {t("pages.settings_page.waiting_for_account")}
                  </p>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-3">
                  {/* Primary Instagram Button */}
                  <button
                    onClick={handleInstagramLogin}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-gradient-to-r from-[#f09433] via-[#bc1888] to-[#e6683c] hover:opacity-95 text-white text-[13px] font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                  >
                    <Instagram size={18} className="shrink-0" />
                    <span>{t("pages.settings_page.connect_via_ig")}</span>
                  </button>

                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F9F9F7] border border-[#E8E8E8] flex items-start gap-2.5 text-left w-full">
                <CheckCircle size={14} className="text-[#16A34A] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#505050] leading-relaxed">
                  {t("pages.settings_page.ig_personal_warning")}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setModal(null)} variant="secondary" className="w-full py-3 text-[12px] border border-[#E8E8E8]">
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── TELEGRAM MODAL ── */}
      {modal === "telegram" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[440px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#F0F0F0]">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#229ED9]">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] font-bold text-black">{t("pages.settings_page.link_tg_title")}</h2>
                <p className="text-[11px] text-[#707070]">{t("pages.settings_page.link_tg_subtitle")}</p>
              </div>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070]">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.settings_page.bot_token_label")}</label>
                <input
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.settings_page.bot_username_label")}</label>
                <div className="flex items-center gap-0 rounded-[12px] bg-[#F0F0F0] overflow-hidden focus-within:bg-[#e8e8e8] transition-colors">
                  <span className="pl-4 text-[13px] text-[#707070] font-medium select-none">@</span>
                  <input
                    value={tgUsername.replace(/^@/, "")}
                    onChange={(e) => setTgUsername(e.target.value)}
                    placeholder="mybrandbot"
                    className="flex-1 bg-transparent px-2 py-3 text-[13px] text-black outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.settings_page.channel_name_optional")}</label>
                <input
                  value={tgName}
                  onChange={(e) => setTgName(e.target.value)}
                  placeholder={t("pages.settings_page.channel_name_placeholder")}
                  className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none focus:bg-[#e8e8e8] transition-colors"
                />
              </div>

              {/* Steps */}
              <div className="p-3 rounded-[12px] bg-[#F9F9F7] border border-[#E8E8E8] flex flex-col gap-2">
                <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.settings_page.how_to_get_title")}</p>
                {[
                  t("pages.settings_page.tg_step_1"),
                  t("pages.settings_page.tg_step_2"),
                  t("pages.settings_page.tg_step_3"),
                  t("pages.settings_page.tg_step_4"),
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-black text-white text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-[#505050]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1 py-3 text-[12px] border border-[#E8E8E8]">
                {t("common.cancel")}
              </Button>
              <button
                onClick={handleAddTelegram}
                disabled={!tgToken.trim() || !tgUsername.trim() || saving}
                className="flex-1 py-3 rounded-full bg-[#229ED9] text-white text-[12px] font-semibold disabled:opacity-40 hover:bg-[#1a8ec4] transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Bot size={13} /> {t("common.connect")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
