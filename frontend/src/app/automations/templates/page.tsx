"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Search, 
  Bot, 
  Crown, 
  HelpCircle, 
  Zap, 
  BookOpen, 
  MessageSquare,
  Gift,
  Send,
  X
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, AlertModal } from "@/components/ui/primitives";
import { Instagram } from "@/components/ui/icons";
import { db, Channel, Automation } from "@/lib/db";
import { useI18n } from "@/i18n/I18nProvider";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

interface TemplateItem {
  id: string;
  name: string;
  category: "subscription" | "ai" | "content" | "crm" | "games" | "referrals";
  platforms: ("instagram" | "telegram")[];
  isPro?: boolean;
  hasBuilderBadge?: boolean; // e.g. "Konstruktor yo'q"
  description: string;
  actionKey: string; // "quick_bot", "ai_agent", "builder_template"
  templateKey?: string; // "lead_magnet", "story_coupon", "comment_dm", "welcome_faq"
}

export default function TemplatesPage() {
  const { t } = useI18n();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | "instagram" | "telegram">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);

  // Modal States
  const [isSelectChannelModalOpen, setIsSelectChannelModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  useEffect(() => {
    const chs = db.getChannels();
    setChannels(chs);
    const active = db.getActiveChannel();
    if (active) {
      setSelectedChannelId(active.id);
    } else if (chs.length > 0) {
      setSelectedChannelId(chs[0].id);
    }
  }, []);

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ isOpen: true, title, message });
  };

  const categories = [
    { value: "all", label: "Barcha mavzular" },
    { value: "subscription", label: "Obunani tekshirish" },
    { value: "ai", label: "AI chatbotlar" },
    { value: "content", label: "Kontent faoliyati" },
    { value: "crm", label: "CRM va to'lov" },
    { value: "games", label: "O'yinlar va gamifikatsiya" },
    { value: "referrals", label: "Referral mexanikalari" },
  ];

  const templates: TemplateItem[] = [
    // Obunani tekshirish
    {
      id: "tmpl_quick_bot",
      name: "Kalit so'zli chat-bot",
      category: "subscription",
      platforms: ["instagram", "telegram"],
      hasBuilderBadge: true,
      description: "Oddiy 5 daqiqalik sozlash shakl orqali. Obunani tekshiradi va foydali fayl yoki veb-sayt havolasini yuboradi",
      actionKey: "quick_bot"
    },
    {
      id: "tmpl_insta_sub",
      name: "Instagram'da obunani tekshirish",
      category: "subscription",
      platforms: ["instagram"],
      description: "Instagram akkauntingizga obunani tekshiradi va PDF fayl yoki boshqa kontentdan foydalanishga ruxsat beradi",
      actionKey: "builder_template",
      templateKey: "lead_magnet"
    },
    {
      id: "tmpl_tg_sub",
      name: "Telegram'da obunani tekshirish",
      category: "subscription",
      platforms: ["telegram"],
      description: "Telegram-kanaldagi obunani tekshiradi va havola yoki PDF faylga kirishni ta'minlaydi",
      actionKey: "builder_template",
      templateKey: "lead_magnet"
    },
    {
      id: "tmpl_acct_badge",
      name: "Akkaunt belgisi",
      category: "subscription",
      platforms: ["instagram"],
      description: "Instagram obunasini tekshiradi, teglarni belgilaydi va lid-magnitni yuboradi",
      actionKey: "builder_template",
      templateKey: "comment_dm"
    },
    {
      id: "tmpl_tags_sub",
      name: "Teglar va obunani tekshirish",
      category: "subscription",
      platforms: ["instagram"],
      description: "Instagram obunasini tekshiradi, teglarni belgilaydi va lid-magnitni yuboradi",
      actionKey: "builder_template",
      templateKey: "comment_dm"
    },

    // AI chatbotlar
    {
      id: "tmpl_ai_agent",
      name: "AI kuratori",
      category: "ai",
      platforms: ["instagram", "telegram"],
      hasBuilderBadge: true,
      description: "Darsliklar, dars transkriptlari va PDF hujjatlar asosida o'quvchilar va mijozlar savollariga javob beruvchi yordamchi.",
      actionKey: "ai_agent",
      templateKey: "kurator"
    },
    {
      id: "tmpl_ai_sales",
      name: "Sotuvchi AI Agent",
      category: "ai",
      platforms: ["instagram", "telegram"],
      hasBuilderBadge: true,
      description: "Katalog, narxlar va ish vaqti kabi ma'lumotlarni o'rganib, mijozlar bilan muloqot qiladi va mahsulot sotadi.",
      actionKey: "ai_agent",
      templateKey: "sales"
    },
    {
      id: "tmpl_ai_booker",
      name: "Konsultatsiya va Band qilish AI",
      category: "ai",
      platforms: ["instagram", "telegram"],
      hasBuilderBadge: true,
      description: "Mutaxassis bilimlari va gaplashish ohangi asosida maslahat beradi va konsultatsiya uchun vaqt band qiladi (pullik to'lov bilan).",
      actionKey: "ai_agent",
      templateKey: "booker"
    },
    {
      id: "tmpl_ai_recruiter",
      name: "HR va Vakansiyalar uchun AI",
      category: "ai",
      platforms: ["instagram", "telegram"],
      hasBuilderBadge: true,
      description: "Bo'sh ish o'rinlari va nomzodga qo'yiladigan talablar asosida nomzodlarni suhbatdan o'tkazadi, saralaydi va HR menejeriga yuboradi.",
      actionKey: "ai_agent",
      templateKey: "recruiter"
    },
    {
      id: "tmpl_ai_chatgpt",
      name: "AI · ChatGPT",
      category: "ai",
      platforms: ["instagram", "telegram"],
      isPro: true,
      description: "ChatGPT xatti-harakatlarini takrorlaydi: jonli muloqotni imitatsiya qilgan holda OpenAI...",
      actionKey: "ai_agent"
    },
    {
      id: "tmpl_ai_savol",
      name: "AI · Savol",
      category: "ai",
      platforms: ["telegram", "instagram"],
      isPro: true,
      description: "Foydalanuvchi ma'lumotlarini to'playdi, murakkab so'rovni shakllantiradi va uni...",
      actionKey: "ai_agent"
    },
    {
      id: "tmpl_fb_leads_direct",
      name: "Lidlarni Telegramga yo'naltirish (AIsiz)",
      category: "ai",
      platforms: ["telegram"],
      description: "Facebook target arizalarini AIsiz, chiroyli ko'rinishda to'g'ridan-to'g'ri Telegram guruh yoki profilingizga yo'naltiring.",
      actionKey: "fb_leads_direct"
    },

    // Referral mexanikalari
    {
      id: "tmpl_ref_link",
      name: "Ref. havolalar · Havola",
      category: "referrals",
      platforms: ["telegram"],
      isPro: true,
      description: "Telegram-kanalga taklif qilish uchun shaxsiy referral havolani yaratadi",
      actionKey: "builder_template",
      templateKey: "welcome_faq"
    },
    {
      id: "tmpl_ref_gift",
      name: "Ref. havolalar · Sovrin",
      category: "referrals",
      platforms: ["telegram"],
      isPro: true,
      description: "Telegram-kanalga referralni taklif qilganligi uchun sovrin berish...",
      actionKey: "builder_template",
      templateKey: "story_coupon"
    },
    {
      id: "tmpl_tg_circle",
      name: "Telegram'dagi doira · Referal uchun ballar",
      category: "referrals",
      platforms: ["telegram"],
      isPro: true,
      description: "Taklif qilingan foydalanuvchilarning doiradagi kanallariga obuna bo'lgani uchun ball hisoblaydi...",
      actionKey: "builder_template",
      templateKey: "welcome_faq"
    },
    {
      id: "tmpl_ref_code",
      name: "Referal kod",
      category: "referrals",
      platforms: ["instagram"],
      isPro: true,
      description: "Referal kodini tekshirib, taklif qilgan va yangi a'zoga ball beradi",
      actionKey: "builder_template",
      templateKey: "comment_dm"
    },
    {
      id: "tmpl_ref_check",
      name: "Ref. havolalar · Referal",
      category: "referrals",
      platforms: ["telegram"],
      isPro: true,
      description: "Sizning havolangiz orqali taklif qilingan foydalanuvchining Telegram-kanalga obuna bo'lganligini tekshiradi",
      actionKey: "builder_template",
      templateKey: "welcome_faq"
    },

    // Placeholder content templates for remaining categories
    {
      id: "tmpl_content_prod",
      name: "Reels orqali sotuv",
      category: "content",
      platforms: ["instagram"],
      description: "Izoh yozgan mijozga avtomat ravishda direkt orqali havola yuboradi va savdoni oshiradi",
      actionKey: "builder_template",
      templateKey: "comment_dm"
    },
    {
      id: "tmpl_crm_pay",
      name: "CRM va to'lovlarni ulash",
      category: "crm",
      platforms: ["telegram", "instagram"],
      isPro: true,
      description: "Bot orqali to'lov havolasini yuborish va mijoz holatini CRM tizimida yangilash",
      actionKey: "builder_template",
      templateKey: "lead_magnet"
    },
    {
      id: "tmpl_gamify_quiz",
      name: "Gamifikatsiya testi",
      category: "games",
      platforms: ["telegram"],
      description: "Mijozlarga test topshiriqlarini taklif qiladi va to'g'ri javob uchun ball beradi",
      actionKey: "builder_template",
      templateKey: "story_coupon"
    }
  ];

  const handleUseTemplate = (tmpl: TemplateItem) => {
    const chs = db.getChannels();
    if (chs.length === 0) {
      showAlert(t("common.error"), "Ulagan akkauntingiz mavjud emas. Shablonni yuklash uchun avval sozlamalardan akkaunt ulashing.");
      return;
    }
    setSelectedTemplate(tmpl);
    const active = db.getActiveChannel();
    if (active) {
      setSelectedChannelId(active.id);
    } else {
      setSelectedChannelId(chs[0].id);
    }
    setIsSelectChannelModalOpen(true);
  };

  const handleConfirmTemplate = () => {
    if (!selectedTemplate || !selectedChannelId) return;

    db.setActiveChannel(selectedChannelId);

    if (selectedTemplate.actionKey === "quick_bot") {
      setIsSelectChannelModalOpen(false);
      window.location.href = "/automations/quick-bot";
      return;
    }
    if (selectedTemplate.actionKey === "ai_agent") {
      setIsSelectChannelModalOpen(false);
      const agentType = selectedTemplate.templateKey || "kurator";
      window.location.href = `/ai-agent?type=${agentType}`;
      return;
    }
    if (selectedTemplate.actionKey === "fb_leads_direct") {
      setIsSelectChannelModalOpen(false);
      window.location.href = "/ai-agent?type=fb-leads-direct";
      return;
    }

    // Builder template path
    const user = db.getCurrentUser();
    const plan = user?.plan || "free";
    const maxAutos = plan === "premium" ? 500 : plan === "pro" ? 50 : 2;
    const currentActiveCount = db.getAllAutomations().filter((a) => a.active).length;
    const shouldBeActive = currentActiveCount < maxAutos;

    if (!shouldBeActive) {
      showAlert(
        "Shablon yuklanmoqda",
        `Sizning tarifingizda faol botlar limiti (${maxAutos} ta) to'lgan. Yangi bot faolsiz holatda yaratiladi.`
      );
    }

    const current = db.getChannelAutomations(selectedChannelId);
    const newAuto: Automation = {
      id: `tmpl_${Date.now()}`,
      name: selectedTemplate.name,
      triggerType: "keyword",
      triggerDetails: "test, dars",
      runs: "0",
      completion: "0%",
      active: shouldBeActive
    };

    current.push(newAuto);
    db.saveChannelAutomations(selectedChannelId, current);
    
    setIsSelectChannelModalOpen(false);
    window.location.href = `/automations/builder?id=${newAuto.id}&template=${selectedTemplate.templateKey || "lead_magnet"}`;
  };

  const channelOptions = channels.map((ch) => {
    const isIg = ch.type === "instagram";
    return {
      value: ch.id,
      label: ch.username.startsWith("@") ? ch.username : `@${ch.username}`,
      icon: ch.avatar ? (
        <img src={ch.avatar} alt={ch.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
            isIg
              ? "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
              : "bg-[#229ED9]"
          }`}
        >
          {isIg ? (
            <Instagram size={10} className="text-white" />
          ) : (
            <Send size={10} className="text-white" />
          )}
        </div>
      )
    };
  });

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    // Platform check
    if (selectedPlatform !== "all" && !t.platforms.includes(selectedPlatform)) {
      return false;
    }
    // Category check
    if (selectedCategory !== "all" && t.category !== selectedCategory) {
      return false;
    }
    // Search query check
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 w-full text-black">
        
        {/* Header Section */}
        <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/automations" 
              className="h-9 w-9 rounded-full bg-slate-50 border border-[#E8E8E8] flex items-center justify-center text-[#707070] hover:text-black hover:border-black transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-[20px] font-extrabold text-black tracking-tight">Shablonlar</h1>
              <p className="text-[11px] text-[#707070] font-medium mt-0.5">Tezkor avtomatlashtirish shablonlari ro&apos;yxati</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Shablonlar bo'yicha qidir"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[190px] sm:w-[240px] pl-8 pr-3 py-1.5 text-[11px] bg-white border border-[#E8E8E8] rounded-full focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-black"
              />
              <Search size={12} className="absolute left-3 top-2.5 text-[#A0A0A0]" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2 text-[#707070] hover:text-black">✕</button>
              )}
            </div>

            {/* Platform filter tabs */}
            <div className="flex bg-[#F0F0F2] border border-[#E4E4E6] rounded-full p-0.5 shrink-0">
              <button
                onClick={() => setSelectedPlatform("all")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${selectedPlatform === "all" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                Barcha kanallar
              </button>
              <button
                onClick={() => setSelectedPlatform("instagram")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${selectedPlatform === "instagram" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                <Instagram size={10} /> Instagram
              </button>
              <button
                onClick={() => setSelectedPlatform("telegram")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${selectedPlatform === "telegram" ? "bg-white text-black shadow-xs" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                <Send size={10} /> Telegram
              </button>
            </div>
          </div>
        </div>

        {/* Content Section: Sidebar + Grid */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          
          {/* Sidebar */}
          <div className="w-full lg:w-[240px] shrink-0 flex flex-col gap-1.5 bg-white border border-[#E8E8E8] rounded-[24px] p-4 shadow-sm">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#A0A0A0] px-2.5 pb-2 border-b border-[#F0F0F0] mb-1.5">Mavzular</span>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[12px] text-[12px] transition-all text-left ${selectedCategory === cat.value ? "bg-[#C7F33C]/20 text-black font-bold" : "text-[#505050] hover:bg-[#F5F5F5]"}`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 w-full flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#A0A0A0]">
                Shablonlar ({filteredTemplates.length} ta)
              </span>
            </div>

            {filteredTemplates.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-14 text-center border border-[#E8E8E8] rounded-[24px] bg-white w-full">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F5F5F5] text-[#A0A0A0] mb-4">
                  <Search size={20} />
                </div>
                <h3 className="text-[15px] font-bold text-black">Shablon topilmadi</h3>
                <p className="text-[11px] text-[#707070] mt-1 max-w-[280px] leading-normal font-medium">
                  Ushbu qidiruv mezonlariga mos keladigan shablonlar mavjud emas. Iltimos, boshqa toifa yoki platformani tanlang.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                {filteredTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleUseTemplate(tmpl)}
                    className="bg-white border border-[#E8E8E8] hover:border-black rounded-[24px] p-5 flex flex-col justify-between gap-5 shadow-sm hover:shadow-md transition-all relative group cursor-pointer"
                  >
                    {/* Card Top Header */}
                    <div className="flex items-center justify-between w-full">
                      {/* Platform Icons */}
                      <div className="flex items-center gap-1.5 bg-[#F5F5F7] px-2.5 py-1 rounded-lg border border-[#E8E8E8] text-[#707070]">
                        {tmpl.platforms.map((p) => (
                          <span key={p} className="flex items-center" title={p}>
                            {p === "instagram" ? (
                              <Instagram size={10} />
                            ) : (
                              <Send size={10} />
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Badges (Pro / Custom Badge) */}
                      <div className="flex items-center gap-1">
                        {tmpl.isPro && (
                          <div className="bg-black text-[#C7F33C] font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <Crown size={10} strokeWidth={2.5} /> Pro
                          </div>
                        )}
                        {tmpl.hasBuilderBadge && (
                          <div className="bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                            Konstruktor yo&apos;q
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Description */}
                    <div>
                      <h4 className="text-[13px] font-black text-black leading-tight group-hover:text-neutral-700 transition-colors">
                        {tmpl.name}
                      </h4>
                      <p className="text-[11px] text-[#707070] mt-1.5 leading-relaxed font-medium">
                        {tmpl.description}
                      </p>
                    </div>

                    {/* Arrow / Hover Helper */}
                    <div className="flex justify-end items-center text-[11px] font-bold text-[#707070] group-hover:text-black transition-colors pt-2 border-t border-[#F5F5F5] w-full">
                      <span>Shablonni ishga tushirish</span>
                      <span className="ml-1 text-[13px] group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Account Selector Modal */}
      {isSelectChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-[440px] bg-white rounded-[28px] p-6 shadow-2xl border border-[#E8E8E8] flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              onClick={() => setIsSelectChannelModalOpen(false)}
              className="absolute top-5 right-5 text-[#8E8E93] hover:text-black transition-colors"
            >
              <span className="bg-[#E4E4E6]/60 rounded-full p-1.5 flex items-center justify-center hover:bg-[#E4E4E6] transition-all">
                <X size={12} strokeWidth={2.5} />
              </span>
            </button>

            {/* Modal Header */}
            <div className="flex flex-col gap-1">
              <h3 className="text-[18px] font-black text-black tracking-tight leading-none">Shablon qo&apos;shish</h3>
              <p className="text-[11px] text-[#707070] font-medium leading-none mt-1">Shablon joriy loyihada saqlanadi</p>
            </div>

            {/* Account Selector Dropdown */}
            <div className="flex flex-col gap-1.5">
              <CustomDropdown
                value={selectedChannelId}
                onChange={(val) => setSelectedChannelId(val)}
                options={channelOptions}
                placeholder="Akkauntni tanlash"
                className="h-11 rounded-[14px]"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleConfirmTemplate}
              className="w-full h-11 bg-black text-white rounded-[16px] text-[12px] font-black hover:bg-black/95 active:scale-[0.98] transition-all flex items-center justify-center"
            >
              Qo&apos;shish
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={!!alertConfig?.isOpen}
        onClose={() => setAlertConfig(null)}
        title={alertConfig?.title || ""}
        message={alertConfig?.message || ""}
      />
    </AppLayout>
  );
}
