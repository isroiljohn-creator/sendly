"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, Avatar, StatusPill, LimeBadge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/I18nProvider";
import { Search, MessageSquare, Users, Bot, Zap } from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Contact, Channel } from "@/lib/db";

export default function ContactsPage() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  useEffect(() => {
    setContacts(db.getContacts());
    setActiveChannel(db.getActiveChannel());
  }, []);

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedContacts = activeChannel ? filteredContacts : [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-[28px]">
        {/* No channel warning */}
        {!activeChannel && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-[16px] bg-black text-white shrink-0">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-[#C7F33C]" />
              <div>
                <p className="text-[13px] font-semibold">{t("pages.contacts.no_channel_title")}</p>
                <p className="text-[11px] text-white/60">{t("pages.contacts.no_channel_desc")}</p>
              </div>
            </div>
            <Link href="/settings?connect=choose">
              <button className="bg-white text-black text-[11px] font-semibold py-2 px-4 rounded-full whitespace-nowrap hover:bg-[#F0F0F0] transition-colors">
                {t("pages.contacts.connect_channel_btn")}
              </button>
            </Link>
          </div>
        )}



        <PageHeader
          title={t("pages.contacts.title")}
          breadcrumbs={t("pages.contacts.breadcrumb")}
        />

        <Card className="p-0 overflow-hidden border border-[#D8D8D8]">
          {/* Table Header Filter controls */}
          <div className="p-5 border-b border-[#F0F0F0] flex flex-wrap gap-4 items-center justify-between bg-white">
            <div className="relative flex items-center w-full max-w-[340px]">
              <Search size={16} className="absolute left-4 text-[#707070]" />
              <input
                type="text"
                placeholder={t("pages.contacts.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 py-2.5 text-[13px] text-black outline-none placeholder:text-[#a0a0a0] transition-colors focus:bg-[#e8e8e8]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#707070] font-medium">
                {t("pages.contacts.total_contacts").replace("{count}", String(displayedContacts.length))}
              </span>
            </div>
          </div>

          {/* Contacts Table List */}
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
                {!activeChannel && (
                  <Link href="/settings?connect=choose" className="mt-4">
                    <Button variant="primary">{t("pages.contacts.connect_channel")}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#F0F0F0] text-[11px] font-semibold text-[#707070] uppercase tracking-wider bg-[#F9F9F7]">
                    <th className="px-6 py-3.5">{t("pages.contacts.table_name")}</th>
                    <th className="px-6 py-3.5">{t("pages.contacts.table_username")}</th>
                    <th className="px-6 py-3.5">{t("pages.chats.tags")}</th>
                    <th className="px-6 py-3.5">{t("pages.contacts.table_chats")}</th>
                    <th className="px-6 py-3.5">{t("common.status")}</th>
                    <th className="px-6 py-3.5 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] text-[13px]">
                  {displayedContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F9F9F7]/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <Avatar size={36} />
                        <span className="font-medium text-black">{c.name}</span>
                      </td>
                      <td className="px-6 py-4 text-[#707070]">{c.username.startsWith("@") ? c.username : `@${c.username}`}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((tag, i) => (
                            <LimeBadge key={i} className="text-[10px]">
                              {tag}
                            </LimeBadge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-black">{t("pages.contacts.messages_count").replace("{count}", String(c.messagesCount))}</td>
                      <td className="px-6 py-4">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href="/chats">
                          <Button variant="secondary" className="px-3 py-1.5 border border-[#E8E8E8] text-[12px] flex items-center gap-1.5 ml-auto">
                            <MessageSquare size={13} />
                            <span>{t("pages.contacts.write")}</span>
                          </Button>
                        </Link>
                      </td>
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
