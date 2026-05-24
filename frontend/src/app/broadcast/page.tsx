"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, StatusPill } from "@/components/ui/primitives";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useI18n } from "@/i18n/I18nProvider";
import { Send, X, Plus, Radio } from "lucide-react";
import { db } from "@/lib/db";
import type { Broadcast, Channel } from "@/lib/db";
 
export default function BroadcastPage() {
  const { t } = useI18n();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
 
  // Form states
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Barcha faol mijozlar");
  const [message, setMessage] = useState("");
 
  useEffect(() => {
    setBroadcasts(db.getBroadcasts());
    setActiveChannel(db.getActiveChannel());

    const handleDbUpdate = () => {
      setActiveChannel(db.getActiveChannel());
    };
    window.addEventListener("replai-db-update", handleDbUpdate);
    return () => window.removeEventListener("replai-db-update", handleDbUpdate);
  }, []);
 
  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
 
    const newBroadcast: Broadcast = {
      id: `${broadcasts.length + 1}`,
      name: title,
      segment: tag,
      sentCount: tag === "Barcha faol mijozlar" ? "2,418" : tag === "VIP foydalanuvchilar" ? "480" : "928",
      date: "Hozirgina",
      status: "Completed",
    };
 
    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    db.saveBroadcasts(updated);
 
    setIsModalOpen(false);
    setTitle("");
    setMessage("");
  };
 
  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px] relative">
        <PageHeader
          title={t("pages.broadcast.title")}
          breadcrumbs={t("pages.broadcast.breadcrumb")}
          actions={
            <Button variant="accent" onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5">
              <Plus size={16} />
              <span>{t("pages.broadcast.create_new")}</span>
            </Button>
          }
        />

        {/* Modal Wizard overlay */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <Card className="w-full max-w-[500px] shadow-2xl relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors"
              >
                <X size={18} />
              </button>

              <h2 className="text-[20px] font-medium text-black pr-8">
                {t("pages.broadcast.modal_title")}
              </h2>
              <p className="text-[12px] text-[#707070] mt-1">
                {t("pages.broadcast.modal_desc")}
              </p>

              <form onSubmit={handleCreateBroadcast} className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#707070] px-1">
                    {t("pages.broadcast.field_subject")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("pages.broadcast.field_subject_placeholder")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#707070] px-1">
                    {t("pages.broadcast.field_recipient")}
                  </label>
                  <CustomDropdown
                    value={tag}
                    onChange={setTag}
                    className="bg-[#F0F0F0] border-none px-4 py-3 text-[13px] rounded-[14px] focus:border-none focus:shadow-none hover:bg-[#e8e8e8]/80 text-black font-semibold h-11"
                    dropdownClassName="mt-2 rounded-[16px]"
                    options={[
                      { value: "Barcha faol mijozlar", label: t("pages.broadcast.recipient_all") },
                      { value: "VIP foydalanuvchilar", label: t("pages.broadcast.recipient_vip") },
                      { value: "Qiziqqan (Leads)", label: t("pages.broadcast.recipient_leads") },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#707070] px-1">
                    {t("pages.broadcast.field_message")}
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={t("pages.broadcast.field_message_placeholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-[14px] bg-[#F0F0F0] px-4 py-3 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8] resize-none"
                  />
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5"
                  >
                    {t("pages.broadcast.btn_cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    className="flex items-center gap-1.5 px-5 py-2.5"
                  >
                    <Send size={14} />
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
                  <tr className="border-b border-[#F0F0F0] text-[11px] font-semibold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                    <th className="px-6 py-3.5">{t("pages.broadcast.table_title")}</th>
                    <th className="px-6 py-3.5">{t("pages.broadcast.table_segment")}</th>
                    <th className="px-6 py-3.5">{t("pages.broadcast.table_status")}</th>
                    <th className="px-6 py-3.5">{t("pages.broadcast.table_sent")}</th>
                    <th className="px-6 py-3.5">{t("pages.broadcast.table_date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] text-[13px]">
                  {broadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F9F9F7]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-black text-[#C7F33C]">
                            <Send size={14} />
                          </div>
                          <span className="font-medium text-black">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-[8px] bg-[#F0F0F0] px-2 py-0.5 text-[11px] text-[#707070] font-medium">
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
                      <td className="px-6 py-4 font-medium text-black">
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
      </div>
    </AppLayout>
  );
}
