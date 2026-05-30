"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { db, BotSettings, Lesson, Module } from "@/lib/db";
import { queryRAG } from "@/lib/ai/rag";
import { moderateMessage } from "@/lib/ai/moderation";
import {
  Sparkles,
  Database,
  Trash2,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Save,
  Upload,
  Send,
  Info,
  ShieldAlert,
  ArrowRight,
  FolderPlus,
  FilePlus,
  CheckCircle,
  History,
  RefreshCw,
  AlertTriangle,
  FileText,
  BarChart2,
  TrendingUp,
  Loader2
} from "lucide-react";

const Facebook = ({ size = 24, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const CopyIcon = ({ size = 16, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PlayIcon = ({ size = 16, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="miter" />
  </svg>
);

interface FieldMapping {
  id: string;
  metaField: string;
  sendlyField: string;
  description: string;
}

const generateJsonPayload = (name: string, phone: string, message: string, mappings: FieldMapping[]) => {
  const fieldData = mappings.map((m) => {
    let value = "";
    if (m.sendlyField === "name") value = name;
    else if (m.sendlyField === "phone") value = phone;
    else if (m.sendlyField === "message") value = message;
    else value = "Mock qiymat";
    return {
      name: m.metaField,
      values: [value]
    };
  });

  return JSON.stringify({
    object: "page",
    entry: [
      {
        id: "10928392182",
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "leadgen",
            value: {
              form_id: "form-1",
              leadgen_id: "lead_" + Math.floor(Math.random() * 100000),
              page_id: "10928392182",
              created_time: Math.floor(Date.now() / 1000),
              field_data: fieldData
            }
          }
        ]
      }
    ]
  }, null, 2);
};

const parseJsonPayload = (jsonStr: string, mappings: FieldMapping[]) => {
  try {
    const data = JSON.parse(jsonStr);
    const changes = data?.entry?.[0]?.changes?.[0]?.value;
    if (!changes) return null;

    const fieldData = changes.field_data || [];
    let extractedName = "";
    let extractedPhone = "";
    let extractedMessage = "";

    mappings.forEach((m) => {
      const match = fieldData.find((fd: { name: string; values?: string[] }) => fd.name === m.metaField);
      if (match && match.values && match.values[0]) {
        if (m.sendlyField === "name") extractedName = match.values[0];
        else if (m.sendlyField === "phone") extractedPhone = match.values[0];
        else if (m.sendlyField === "message") extractedMessage = match.values[0];
      }
    });

    return {
      name: extractedName || "Noma'lum Mijoz",
      phone: extractedPhone || "Noma'lum Telefon",
      message: extractedMessage || "",
      formId: changes.form_id || "form-1"
    };
  } catch (e) {
    console.error("Failed to parse visual webhook JSON payload", e);
    return null;
  }
};


interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

function CustomDropdown({ value, onChange, options, placeholder = "Tanlang...", className = "" }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl hover:border-black/20 focus:outline-none transition-all text-left text-black font-semibold shadow-sm"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={14} className={`text-[#707070] transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown on click outside */}
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown panel */}
          <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-[#E8E8E8] rounded-xl shadow-xl py-1.5 max-h-[220px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] text-left hover:bg-[#F9F9F7] transition-colors ${
                  option.value === value ? "text-black font-bold bg-[#C7F33C]/10" : "text-[#595959]"
                }`}
              >
                <span className="truncate mr-2">{option.label}</span>
                {option.value === value && <CheckCircle size={13} className="text-[#7CA607] shrink-0" />}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-2 text-[11px] text-[#A0A0A0] italic text-center">
                Ma&apos;lumot mavjud emas
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface SimulatedMessage {
  id: string;
  sender: "user" | "bot" | "warning";
  text: string;
  time: string;
  confidence?: number;
  sources?: string[];
}

const MOCK_FB_FORMS = [
  { id: "form-1", name: "Kuzgi chegirmalar va aksiya formasi" },
  { id: "form-2", name: "Bepul dars va maslahat formasi" },
  { id: "form-3", name: "Premium a'zolik uchun ariza formasi" },
];

export default function AIAgentPage() {
  const { t } = useI18n();
  const [selectedAgentType, setSelectedAgentType] = useState<"kurator" | "fb-leads" | "fb-leads-direct" | null>(null);
  const [sliderPreviewType, setSliderPreviewType] = useState<"tone" | "length" | "humor">("tone");
  const [activeTab, setActiveTab] = useState<"settings" | "knowledge" | "analytics">("settings");
  
  // Curator Analyzed Messages for CustDev Analytics
  const [analyzedMessages, setAnalyzedMessages] = useState<Array<{
    id: string;
    username: string;
    message: string;
    response: string;
    intent: string;
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
    date: string;
    painPoint: string;
  }>>([]);

  const classifyIntentForCustDev = (text: string): string => {
    const msg = text.toLowerCase();
    if (
      msg.includes("pul") ||
      msg.includes("narx") ||
      msg.includes("to'lov") ||
      msg.includes("dollar") ||
      msg.includes("click") ||
      msg.includes("payme") ||
      msg.includes("karta") ||
      msg.includes("obuna") ||
      msg.includes("tarif")
    ) {
      return "billing";
    }
    if (
      msg.includes("bot") ||
      msg.includes("telegram") ||
      msg.includes("kanal") ||
      msg.includes("token") ||
      msg.includes("ulash") ||
      msg.includes("xatolik") ||
      msg.includes("muammo") ||
      msg.includes("ishlamayapti")
    ) {
      return "support";
    }
    if (
      msg.includes("dars") ||
      msg.includes("modul") ||
      msg.includes("kirish") ||
      msg.includes("o'qish") ||
      msg.includes("kurs") ||
      msg.includes("dastur")
    ) {
      return "faq";
    }
    if (
      msg.includes("hamkor") ||
      msg.includes("referal") ||
      msg.includes("pul ishlash") ||
      msg.includes("komissiya")
    ) {
      return "affiliate";
    }
    return "general";
  };

  const detectSentiment = (text: string): "positive" | "neutral" | "negative" => {
    const msg = text.toLowerCase();
    if (msg.includes("yaxshi") || msg.includes("zo'r") || msg.includes("rahmat") || msg.includes("ajoyib") || msg.includes("muvaffaqiyat") || msg.includes("😊") || msg.includes("👍")) {
      return "positive";
    }
    if (msg.includes("xatolik") || msg.includes("ishlamadi") || msg.includes("muammo") || msg.includes("afsus") || msg.includes("yomon") || msg.includes("tushunmadim") || msg.includes("qiyin") || msg.includes("😡") || msg.includes("👎")) {
      return "negative";
    }
    return "neutral";
  };

  const extractPainPoint = (text: string, intent: string): string => {
    if (intent === "billing") {
      return "To'lov usullari yoki kartani bog'lash jarayonidagi qiyinchiliklar";
    }
    if (intent === "support") {
      return "Platformani ijtimoiy tarmoqlar yoki Telegram botga bog'lashdagi texnik muammolar";
    }
    if (intent === "faq") {
      return "Dars transkriptlari ichidan kerakli mavzuni mustaqil topa olmaslik";
    }
    if (intent === "affiliate") {
      return "Hamkorlik komissiyalari va taklif etish havolasi ishlash qoidalarini aniqlashtirish";
    }
    return "Platformaning ishlash imkoniyatlari haqida qo'shimcha ma'lumot olish";
  };
  
  // Database States
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Knowledge Base UI States
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({ "mod-1": true });
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Input fields for adding items
  const [newModuleName, setNewModuleName] = useState("");
  const [newLessonName, setNewLessonName] = useState("");
  const [newLessonModuleId, setNewLessonModuleId] = useState("");
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  
  // Bot Settings UI States
  const [newTopic, setNewTopic] = useState("");
  const [newRule, setNewRule] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Curator Analytics UI States
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsFilter, setAnalyticsFilter] = useState("All");
  const [isRefreshingAnalysis, setIsRefreshingAnalysis] = useState(false);

  // Telegram Bot Verification States
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramBotUsername, setTelegramBotUsername] = useState("");
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [adminVerifyCode, setAdminVerifyCode] = useState("");
  const [verifyAdminError, setVerifyAdminError] = useState("");
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Sandbox Simulator States
  const [chatMessages, setChatMessages] = useState<SimulatedMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Salom! Men o'quvchilarga yordam beruvchi shaxsiy AI kuratorman. Bilimlar bazasidagi ma'lumotlar asosida savollarga javob beraman. Meni sinab ko'rish uchun bu yerga biror savol yozing! 📚",
      time: "Hozir",
      confidence: 100
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Slider preview states
  const [sliderPreview, setSliderPreview] = useState<{
    type: "tone" | "length" | "humor";
    value: number;
    visible: boolean;
  } | null>(null);
  const sliderPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Facebook Lead Simulator States
  const [simLeadName, setSimLeadName] = useState("Sardor Salimov");
  const [simLeadPhone, setSimLeadPhone] = useState("+998 90 123 45 67");
  const [simLeadMessage, setSimLeadMessage] = useState("Kurs narxi qancha? Chegirma bormi?");
  const [simResult, setSimResult] = useState<{
    groupName: string;
    groupId: string;
    tags: string[];
    welcomeMsg: string;
    summary: string;
  } | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [leadLogs, setLeadLogs] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    formName: string;
    group: string;
    tags: string[];
    summary: string;
    date: string;
    status: string;
  }>>([
    {
      id: "log-1",
      name: "Aziz Rahimov",
      phone: "+998 93 555 44 33",
      formName: "Kuzgi chegirmalar va aksiya formasi",
      group: "Sotuvlar",
      tags: ["Narxga Qiziqqan", "High Intent"],
      summary: "Mijoz aksiya va narx bo'yicha murojaat qilgan. Sotuv bo'limiga yo'naltirildi.",
      date: "Bugun, 18:42",
      status: "success",
    },
    {
      id: "log-2",
      name: "Madina Umarova",
      phone: "+998 99 888 77 66",
      formName: "Bepul dars va maslahat formasi",
      group: "Qo'llab-quvvatlash",
      tags: ["Texnik muammo", "Support"],
      summary: "Mijoz darsga kirish parolini tiklash bo'yicha yordam so'radi.",
      date: "Bugun, 15:10",
      status: "success",
    },
  ]);
  // Facebook Visual Integrator States
  const [activeNode, setActiveNode] = useState<"trigger" | "mapper" | "router">("trigger");
  const [isSimulatorJsonMode, setIsSimulatorJsonMode] = useState(false);
  const [simJsonPayload, setSimJsonPayload] = useState("");
  const [simSteps, setSimSteps] = useState<Array<{ id: string; label: string; status: "pending" | "running" | "success" | "error" }>>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("replai_fb_field_mappings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      { id: "map-1", metaField: "full_name", sendlyField: "name", description: "Mijozning to'liq ismi (Ism)" },
      { id: "map-2", metaField: "phone_number", sendlyField: "phone", description: "Telefon raqami (Telefon)" },
      { id: "map-3", metaField: "user_question", sendlyField: "message", description: "Murojaat matni / Savol (Izoh)" },
    ];
  });

  // Save mappings to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("replai_fb_field_mappings", JSON.stringify(fieldMappings));
    }
  }, [fieldMappings]);

  const [fbTags, setFbTags] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("replai_fb_tags");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return ["Meta Lead", "AI Saralangan"];
  });

  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("replai_fb_tags", JSON.stringify(fbTags));
    }
  }, [fbTags]);

  // Keep JSON payload updated when simple inputs change
  useEffect(() => {
    if (!isSimulatorJsonMode) {
      setSimJsonPayload(generateJsonPayload(simLeadName, simLeadPhone, simLeadMessage, fieldMappings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simLeadName, simLeadPhone, simLeadMessage, fieldMappings, isSimulatorJsonMode]);

  // Sync state from local storage / db
  useEffect(() => {
    loadDatabase();
    if (typeof window !== "undefined") {
      const savedType = localStorage.getItem("sendly_selected_agent_type");
      if (savedType === "kurator" || savedType === "fb-leads" || savedType === "fb-leads-direct") {
        setSelectedAgentType(savedType);
      }
    }

    const handleUpdate = () => {
      loadDatabase();
    };
    window.addEventListener("replai-db-update", handleUpdate);
    return () => {
      window.removeEventListener("replai-db-update", handleUpdate);
      if (sliderPreviewTimeoutRef.current) {
        clearTimeout(sliderPreviewTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize analyzed messages
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("replai_curator_analyzed_messages");
      let shouldLoadInitial = false;
      
      const initialSamples = [
        {
          id: "cur-msg-1",
          username: "dilshod_marketing",
          message: "Uzcard orqali to'lov qilsam bo'ladimi? Karta ulab bo'lmadi.",
          response: "Ha, Uzcard/Humo orqali to'lov qilsangiz bo'ladi. Hisobingizda kartani bog'lang.",
          intent: "billing",
          sentiment: "negative" as const,
          confidence: 92,
          date: "Bugun, 14:20",
          painPoint: "To'lov kartasini bog'lashda Uzcard/Humo tizimidagi nosozliklar"
        },
        {
          id: "cur-msg-2",
          username: "umid_kod",
          message: "Telegram bot yaratish uchun tokeni qayerdan olaman?",
          response: "Telegramda @BotFather orqali /newbot buyrug'ini yuboring va tokeni oling.",
          intent: "support",
          sentiment: "neutral" as const,
          confidence: 95,
          date: "Bugun, 12:05",
          painPoint: "@BotFather orqali bot yaratish va token olish jarayonini bilmaslik"
        },
        {
          id: "cur-msg-3",
          username: "sarvar_brand",
          message: "Sotuvlarni avtomatlashtirish darsini qaysi modulda o'rganamiz?",
          response: "Ushbu dars 2-Modulda joylashgan, unda Direct orqali avtomatik zanjir sozlash o'rgatiladi.",
          intent: "faq",
          sentiment: "positive" as const,
          confidence: 88,
          date: "Kecha, 18:40",
          painPoint: "Kerakli dars yoki modulni qidirib topishdagi qiyinchilik"
        },
        {
          id: "cur-msg-4",
          username: "nodira_yusupova",
          message: "Referal havola orqali necha foiz komissiya beriladi?",
          response: "Hamkorlarimiz uchun har bir o'quvchining premium to'lovidan 30% hamkorlik komissiyasi taqdim etiladi.",
          intent: "affiliate",
          sentiment: "positive" as const,
          confidence: 90,
          date: "Kecha, 15:30",
          painPoint: "Hamkorlik tizimi komissiyasi va shartlarini aniqlashtirish"
        },
        {
          id: "cur-msg-5",
          username: "malika_ig",
          message: "Instagram professional akkauntini ulashda xatolik beryapti, shaxsiy profil bo'lsa bo'ladimi?",
          response: "Kechirasiz, faqat Professional (Business yoki Creator) hisoblarni bog'lash mumkin, shaxsiy hisoblar qo'llab-quvvatlanmaydi.",
          intent: "support",
          sentiment: "negative" as const,
          confidence: 85,
          date: "24 May, 10:15",
          painPoint: "Shaxsiy profil bilan Instagram API cheklovlariga duch kelish"
        },
        {
          id: "cur-msg-6",
          username: "doston_smm",
          message: "Kursni tugatgach sertifikat beriladimi? Qachon olsam bo'ladi?",
          response: "Ha, barcha modullarni va uy vazifalarini muvaffaqiyatli topshirgan o'quvchilarga sertifikat taqdim etiladi.",
          intent: "faq",
          sentiment: "positive" as const,
          confidence: 94,
          date: "24 May, 09:30",
          painPoint: "Kurs yakunida sertifikat taqdim etilishi shartlari"
        },
        {
          id: "cur-msg-7",
          username: "akbar_biznes",
          message: "Click orqali to'lov qildim, lekin balansim yangilanmadi. Kimga yozay?",
          response: "To'lov tasdiqlanishi bilan hisob faollashadi. Agar balans o'zgarmasa, to'lov kvitansiyasini texnik yordamga yuboring.",
          intent: "billing",
          sentiment: "negative" as const,
          confidence: 89,
          date: "23 May, 16:45",
          painPoint: "To'lovdan so'ng hisob holatining avtomatik yangilanmasligi"
        },
        {
          id: "cur-msg-8",
          username: "kamola_growth",
          message: "Hamkorlik balansidagi pulni Humo kartamga o'tkazib olsam bo'ladimi?",
          response: "Albatta, yig'ilgan komissiyalarni o'zingizning mahalliy kartalaringizga yechib olishingiz mumkin. Murojaat yuboring.",
          intent: "affiliate",
          sentiment: "neutral" as const,
          confidence: 91,
          date: "23 May, 11:20",
          painPoint: "Hamkorlik mukofotini yechish yo'llari va to'lov turlari"
        },
        {
          id: "cur-msg-9",
          username: "jasur_ceo",
          message: "Instagram orqali mijozlar bilan muloqot qiladigan bot kerak. Shuni qanday ulayman?",
          response: "Instagram Professional akkauntingizni Sendly-ga bog'lang. Avtomatlashtirish bo'limidan bot yaratishingiz mumkin.",
          intent: "general",
          sentiment: "neutral" as const,
          confidence: 83,
          date: "22 May, 15:10",
          painPoint: "Instagram botining ulanish jarayoni va imkoniyatlari"
        },
        {
          id: "cur-msg-10",
          username: "nigora_ads",
          message: "AI kurator savollarga juda tez javob beryapti, uning tezligini biroz sekinlashtirish mumkinmi?",
          response: "Ha, AI javob berish kechikish vaqtini sozlamalardan o'zgartirishingiz mumkin. Bu tabiiylikni ta'minlaydi.",
          intent: "support",
          sentiment: "positive" as const,
          confidence: 87,
          date: "22 May, 10:05",
          painPoint: "AI javob berish kechikish rejimini sozlash imkoniyati"
        },
        {
          id: "cur-msg-11",
          username: "nodir_dev",
          message: "Darslikdagi kodlar yozilgan Github havola ochilmayapti, ruxsat bering.",
          response: "Kechirasiz, havola yangilandi. Iltimos, dars sahifasidan eng oxirgi havolani yuklab oling.",
          intent: "faq",
          sentiment: "negative" as const,
          confidence: 91,
          date: "21 May, 18:30",
          painPoint: "Dars materiallarining ochilishida ruxsat xatoligi"
        },
        {
          id: "cur-msg-12",
          username: "shahlo_brand",
          message: "Yillik obuna narxida qancha chegirma bor? Buni hisoblab bering.",
          response: "Yillik obuna sotib olganda oylik to'lovga nisbatan 20% chegirma taqdim etiladi. Bu 2 oylik to'lov tejalishini anglatadi.",
          intent: "billing",
          sentiment: "positive" as const,
          confidence: 93,
          date: "21 May, 14:15",
          painPoint: "Yillik obuna tariflaridagi chegirmalar va ularning foydasi"
        }
      ];

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Check if any of them contains the old intent style or 3D emojis
            const hasOldData = parsed.some(
              (m: any) =>
                !["billing", "support", "faq", "affiliate", "general"].includes(m.intent) ||
                m.sentiment === "🔴" ||
                m.sentiment === "🟢" ||
                m.sentiment === "🟡"
            );
            if (hasOldData) {
              shouldLoadInitial = true;
            } else {
              setAnalyzedMessages(parsed);
            }
          } else {
            shouldLoadInitial = true;
          }
        } catch (e) {
          shouldLoadInitial = true;
        }
      } else {
        shouldLoadInitial = true;
      }

      if (shouldLoadInitial) {
        localStorage.setItem("replai_curator_analyzed_messages", JSON.stringify(initialSamples));
        setAnalyzedMessages(initialSamples);
      }
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const loadDatabase = () => {
    const channels = db.getChannels();
    const tgChannels = channels.filter(
      (c) => c.type === "telegram" && c.isConnected && c.telegramToken
    );

    const activeCh = db.getActiveChannel();
    let initialBotId = "";
    if (activeCh && activeCh.type === "telegram" && activeCh.isConnected && activeCh.telegramToken) {
      initialBotId = activeCh.id;
    } else if (tgChannels.length > 0) {
      initialBotId = tgChannels[0].id;
    }

    const loadedSettings = db.getBotSettings(initialBotId);
    const loadedModules = db.getModules();
    const loadedLessons = db.getLessons();

    if (initialBotId && loadedSettings.telegramBotId !== initialBotId) {
      loadedSettings.telegramBotId = initialBotId;
    }

    setSettings(loadedSettings);
    setModules(loadedModules);
    setLessons(loadedLessons);

    const selectedBotId = loadedSettings.telegramBotId || initialBotId;
    const telegramChannel = tgChannels.find(c => c.id === selectedBotId);

    if (telegramChannel) {
      setIsTelegramLinked(true);
      setTelegramBotUsername(telegramChannel.username);
      if (!loadedSettings.telegramBotId) {
        loadedSettings.telegramBotId = telegramChannel.id;
        db.saveBotSettings(loadedSettings, telegramChannel.id);
      }
    } else {
      setIsTelegramLinked(false);
      setTelegramBotUsername("");
      if (loadedSettings.aiCuratorEnabled) {
        loadedSettings.aiCuratorEnabled = false;
        db.saveBotSettings(loadedSettings, loadedSettings.telegramBotId);
        setSettings({ ...loadedSettings, aiCuratorEnabled: false });
      }
    }

    if (loadedLessons.length > 0 && !selectedLesson) {
      setSelectedLesson(loadedLessons[0]);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Toggle AI Curator state with Telegram connection checking
  const handleToggleAiCurator = (enabled: boolean) => {
    if (!settings) return;
    if (enabled) {
      // Check Telegram bot status
      const channels = db.getChannels();
      const telegramChannel = channels.find(
        (c) => c.type === "telegram" && c.isConnected && c.telegramToken
      );
      if (!telegramChannel) {
        setAlertModal({
          isOpen: true,
          title: "Telegram Bot ulanmagan",
          message: "AI Agentni faollashtirish uchun avval Telegram botingizni integratsiya qilishingiz kerak. Kanallar bo'limiga o'ting va Telegram bot tokenini kiriting.",
        });
        return;
      }
    }
    handleUpdateSettings("aiCuratorEnabled", enabled);
  };

  const handleBotChange = (botId: string) => {
    db.setActiveChannel(botId);

    const loadedSettings = db.getBotSettings(botId);
    loadedSettings.telegramBotId = botId;
    setSettings(loadedSettings);
    db.saveBotSettings(loadedSettings, botId);

    const channels = db.getChannels();
    const ch = channels.find(c => c.id === botId);
    if (ch) {
      setTelegramBotUsername(ch.username);
      setIsTelegramLinked(true);
    } else {
      setIsTelegramLinked(false);
      setTelegramBotUsername("");
    }
    showToast("Telegram bot muvaffaqiyatli bog'landi");
  };

  // Save changes to DB
  const handleSaveAll = async () => {
    if (!settings) return;
    try {
      if (selectedAgentType === "fb-leads-direct") {
        settings.fbAgentMode = "direct";
      } else if (selectedAgentType === "fb-leads") {
        settings.fbAgentMode = "ai";
      }
      db.saveBotSettings(settings, settings.telegramBotId);
      db.saveModules(modules);
      db.saveLessons(lessons);
      
      // Sync client state with local server JSON file db.json
      await db.saveToServer();
      showToast("Barcha o'zgarishlar muvaffaqiyatli saqlandi!");
    } catch (err) {
      console.error(err);
      showToast("Xatolik yuz berdi", "error");
    }
  };

  // Verify Telegram Admin Code
  const handleVerifyAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminVerifyCode.trim() || !settings?.telegramBotId) return;

    setIsVerifyLoading(true);
    setVerifyAdminError("");

    try {
      const userId = db.getCurrentUser()?.id || "guest";
      const res = await fetch("/api/telegram/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          channelId: settings.telegramBotId,
          code: adminVerifyCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setVerifyAdminError(data.error || "Tasdiqlash kodini tekshirishda xatolik yuz berdi");
        setIsVerifyLoading(false);
        return;
      }

      // Success! Reload settings from server
      await db.fetchFromServer();
      loadDatabase();

      setIsVerifyingAdmin(false);
      setAdminVerifyCode("");
      showToast("Admin profil muvaffaqiyatli bog'landi!");
    } catch (err) {
      console.error("Verification error:", err);
      setVerifyAdminError("Server bilan bog'lanishda xatolik yuz berdi");
    } finally {
      setIsVerifyLoading(false);
    }
  };

  // Toggle module tree collapse
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Add new module
  const handleAddModule = () => {
    if (!newModuleName.trim()) return;
    const newMod = db.addModule(newModuleName.trim());
    setModules(db.getModules());
    setNewModuleName("");
    setShowAddModuleModal(false);
    showToast(`"${newMod.title}" moduli yaratildi`);
  };

  // Delete module
  const handleDeleteModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Modulni o'chirish",
      message: "Ushbu modul va uning ichidagi barcha darslarni o'chirishni tasdiqlaysizmi?",
      onConfirm: () => {
        db.deleteModule(moduleId);
        setModules(db.getModules());
        const remainingLessons = db.getLessons();
        setLessons(remainingLessons);
        if (selectedLesson && selectedLesson.moduleId === moduleId) {
          setSelectedLesson(remainingLessons[0] || null);
        }
        showToast("Modul o'chirildi");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Add new lesson
  const handleAddLesson = () => {
    if (!newLessonName.trim() || !newLessonModuleId) return;
    const newLes = db.addLesson(newLessonModuleId, newLessonName.trim(), "Yangi dars matni transkripti...");
    const updatedLessons = db.getLessons();
    setLessons(updatedLessons);
    setSelectedLesson(newLes);
    setNewLessonName("");
    setShowAddLessonModal(false);
    showToast(`"${newLes.title}" darsi yaratildi`);
  };

  // Delete lesson
  const handleDeleteLesson = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Darsni o'chirish",
      message: "Ushbu darsni o'chirishni tasdiqlaysizmi?",
      onConfirm: () => {
        db.deleteLesson(lessonId);
        const updatedLessons = db.getLessons();
        setLessons(updatedLessons);
        if (selectedLesson && selectedLesson.id === lessonId) {
          setSelectedLesson(updatedLessons[0] || null);
        }
        showToast("Dars o'chirildi");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Update current lesson transcript or title
  const handleUpdateSelectedLesson = <K extends keyof Lesson>(field: K, value: Lesson[K]) => {
    if (!selectedLesson) return;
    const updated = { ...selectedLesson, [field]: value };
    setSelectedLesson(updated);
    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? updated : l));
  };

  // Settings: Add dynamic forbidden topic badge
  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !settings) return;
    if (settings.topics.includes(newTopic.trim())) return;
    const updated = {
      ...settings,
      topics: [...settings.topics, newTopic.trim()]
    };
    setSettings(updated);
    setNewTopic("");
  };

  // Settings: Remove dynamic forbidden topic badge
  const handleRemoveTopic = (topic: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      topics: settings.topics.filter(t => t !== topic)
    };
    setSettings(updated);
  };

  // Settings: Add custom escalation rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trim() || !settings) return;
    const updated = {
      ...settings,
      escalationRules: [
        ...settings.escalationRules,
        { id: `esc-${Date.now()}`, text: newRule.trim(), enabled: true }
      ]
    };
    setSettings(updated);
    setNewRule("");
  };

  // Settings: Toggle rule enabled/disabled
  const handleToggleRule = (ruleId: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      escalationRules: settings.escalationRules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    };
    setSettings(updated);
  };

  // Settings: Delete escalation rule
  const handleDeleteRule = (ruleId: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      escalationRules: settings.escalationRules.filter(r => r.id !== ruleId)
    };
    setSettings(updated);
  };

  // Settings: Update slider/prompt properties
  const handleUpdateSettings = <K extends keyof BotSettings>(field: K, value: BotSettings[K]) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value
    });
  };

  const handleSliderChange = (type: "tone" | "length" | "humor", value: number) => {
    handleUpdateSettings(type, value);
    setSliderPreviewType(type);
  };

  const getSliderPreviewContent = (type: "tone" | "length" | "humor", value: number) => {
    if (type === "tone") {
      if (value < 33) {
        return {
          title: "Ohang: Norasmiy (Do'stona)",
          question: "Narxlaringiz qanaqa?",
          reply: "Salom! 😊 Bizda narxlar juda ham hamyonbop. Kurslarimiz oyiga atigi 150 ming so'mdan boshlanadi. Qiziqib ko'rasizmi? 😉"
        };
      } else if (value >= 33 && value <= 66) {
        return {
          title: "Ohang: Me'yorida (Samimiy)",
          question: "Narxlaringiz qanaqa?",
          reply: "Salom, xush kelibsiz! Bizning o'quv dasturlarimiz narxi oyiga 150 000 so'mdan boshlanadi. Batafsil ma'lumot olishni istasangiz, yozib qoldiring."
        };
      } else {
        return {
          title: "Ohang: Rasmiy",
          question: "Narxlaringiz qanaqa?",
          reply: "Assalomu alaykum. Bizning xizmatlarimiz va o'quv kurslarimizning to'lov miqdori oyiga 150 000 so'mni tashkil etadi. Savollaringiz bo'lsa, xizmatingizdamiz."
        };
      }
    } else if (type === "length") {
      if (value < 33) {
        return {
          title: "Javob uzunligi: Qisqa (Londa)",
          question: "Darslar qachon boshlanadi?",
          reply: "Darslar dushanba kuni soat 19:00 da boshlanadi."
        };
      } else if (value >= 33 && value <= 66) {
        return {
          title: "Javob uzunligi: Me'yorida",
          question: "Darslar qachon boshlanadi?",
          reply: "Yangi guruhimiz uchun darslar kelasi dushanba kuni soat 19:00 da boshlanadi. Darslar haftada 3 marta bo'ladi."
        };
      } else {
        return {
          title: "Javob uzunligi: Batafsil tushuntirish",
          question: "Darslar qachon boshlanadi?",
          reply: "Bizning darslarimiz kelasi haftaning dushanba kunidan (soat 19:00 da) boshlanadi. Har bir dars davomiyligi 2 soat bo'lib, haftada 3 kun davom etadi. Dastlabki dars bepul."
        };
      }
    } else {
      if (value < 33) {
        return {
          title: "Hazil va Emojilar: Jiddiy (Akademik)",
          question: "Kursni sotib olsam bo'ladimi?",
          reply: "Ha, kursni xarid qilishingiz mumkin. Quyidagi havola orqali Click yoki Payme tizimi orqali to'lovni amalga oshiring."
        };
      } else if (value >= 33 && value <= 66) {
        return {
          title: "Hazil va Emojilar: Me'yorida",
          question: "Kursni sotib olsam bo'ladimi?",
          reply: "Albatta bo'ladi! 😊 Quyidagi to'lov havolasi orqali to'lovni amalga oshiring va guruhga qo'shiling. 🚀"
        };
      } else {
        return {
          title: "Hazil va Emojilar: Qiziqarli (Emojilar bilan)",
          question: "Kursni sotib olsam bo'ladimi?",
          reply: "Voy, albatta-da! 😍 Koinotimizga xush kelibsiz! 🚀 Quyidagi havola orqali to'lovni qilishingiz bilan guruhga uchyapmiz! Click/Payme tayyor! 😉💳✨"
        };
      }
    }
  };

  // Send message to live sandbox preview simulator
  const handleSendSimMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !settings) return;

    const userText = chatInput.trim();
    setChatInput("");
    
    const timeString = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    const userMsg: SimulatedMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      time: timeString
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    // 1. Moderate message
    const modResult = moderateMessage(userText, settings.topics);
    if (modResult.flagged) {
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          {
            id: `mod-${Date.now()}`,
            sender: "warning",
            text: modResult.warningMessage || "Taqiqlangan mavzu aniqlandi.",
            time: timeString
          }
        ]);
        setChatLoading(false);
      }, 600);
      return;
    }

    // 2. Query RAG (local mock or live Gemini API depending on environment keys)
    try {
      const ragResult = await queryRAG(
        userText,
        "Sinovchi Foydalanuvchi",
        lessons,
        modules,
        settings,
        chatMessages
          .filter(m => m.sender !== "warning")
          .map(m => ({
            role: m.sender === "user" ? "user" : "model",
            parts: [{ text: m.text }]
          }))
      );

      setChatMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: ragResult.text,
          time: timeString,
          confidence: ragResult.confidence,
          sources: ragResult.sources
        }
      ]);

      // Classify the message for CustDev
      const detectedIntent = classifyIntentForCustDev(userText);
      const sentiment = detectSentiment(userText);
      const painPoint = extractPainPoint(userText, detectedIntent);
      
      const randomUsernames = [
        "umid_growth", "kamola_smm", "shoxrux_biz", "dilnoza_ad", 
        "anvar_sales", "malika_creatives", "bekzod_seo", "feruza_targeting"
      ];
      const randomUser = randomUsernames[Math.floor(Math.random() * randomUsernames.length)];

      const newAnalyzedMsg = {
        id: `cur-msg-${Date.now()}`,
        username: randomUser,
        message: userText,
        response: ragResult.text,
        intent: detectedIntent,
        sentiment: sentiment,
        confidence: ragResult.confidence || 75,
        date: "Hozir",
        painPoint: painPoint
      };

      setAnalyzedMessages(prev => {
        const updated = [newAnalyzedMsg, ...prev];
        if (typeof window !== "undefined") {
          localStorage.setItem("replai_curator_analyzed_messages", JSON.stringify(updated));
        }
        return updated;
      });
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "bot",
          text: "Kechirasiz, javob shakllantirishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
          time: timeString,
          confidence: 0
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSimulateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSimLoading(true);
    setSimResult(null);

    const isDirect = selectedAgentType === "fb-leads-direct";

    // Initial steps
    const steps = isDirect ? [
      { id: "step-webhook", label: "Facebook Webhook so'rovi qabul qilindi", status: "running" as const },
      { id: "step-mapping", label: "Lead maydonlari moslashtirildi (Field Mapping)", status: "pending" as const },
      { id: "step-crm", label: "Mijoz ma'lumotlari Sendly CRM-ga joylandi va Telegramga yuborildi", status: "pending" as const },
    ] : [
      { id: "step-webhook", label: "Facebook Webhook so'rovi qabul qilindi", status: "running" as const },
      { id: "step-mapping", label: "Lead maydonlari moslashtirildi (Field Mapping)", status: "pending" as const },
      { id: "step-ai", label: "AI Agent orqali intent/savol tahlil qilindi", status: "pending" as const },
      { id: "step-crm", label: "Mijoz ma'lumotlari Sendly CRM-ga joylandi", status: "pending" as const },
    ];
    setSimSteps(steps);

    // Step 1: Webhook parsing
    setTimeout(() => {
      let leadName = "";
      let leadPhone = "";
      let leadMessage = "";
      let formId = settings.fbFormId || "form-1";

      if (isSimulatorJsonMode) {
        const parsed = parseJsonPayload(simJsonPayload, fieldMappings);
        if (!parsed) {
          setSimSteps(prev =>
            prev.map(s => {
              if (s.id === "step-webhook") return { ...s, status: "success" as const };
              if (s.id === "step-mapping") return { ...s, status: "error" as const, label: "Xatolik: Webhook JSON formatini o'qib bo'lmadi" };
              return s;
            })
          );
          setSimLoading(false);
          showToast("Webhook JSON formatida xatolik! ❌", "error");
          return;
        }
        leadName = parsed.name;
        leadPhone = parsed.phone;
        leadMessage = parsed.message;
        formId = parsed.formId;
      } else {
        if (!simLeadName.trim() || !simLeadPhone.trim()) {
          setSimSteps(prev =>
            prev.map(s => {
              if (s.id === "step-webhook") return { ...s, status: "error" as const, label: "Xatolik: Ism va telefon kiritilishi shart" };
              return s;
            })
          );
          setSimLoading(false);
          showToast("Iltimos, ism va telefon raqamini kiriting! ❌", "error");
          return;
        }
        leadName = simLeadName;
        leadPhone = simLeadPhone;
        leadMessage = simLeadMessage;
      }

      // If parsing/validation succeeds, mark webhook as success and mapping as running
      setSimSteps(prev =>
        prev.map(s => {
          if (s.id === "step-webhook") return { ...s, status: "success" as const };
          if (s.id === "step-mapping") return { ...s, status: "running" as const };
          return s;
        })
      );

      // Step 2: Mapping success, AI starts (or CRM starts in direct mode)
      setTimeout(() => {
        setSimSteps(prev =>
          prev.map(s => {
            if (s.id === "step-mapping") return { ...s, status: "success" as const };
            if (isDirect) {
              if (s.id === "step-crm") return { ...s, status: "running" as const };
            } else {
              if (s.id === "step-ai") return { ...s, status: "running" as const };
            }
            return s;
          })
        );

        if (isDirect) {
          // Direct Forwarder Mode Flow
          setTimeout(() => {
            const detectedGroup = "Sotuvlar";
            const groupId = settings.targetGroupId || "sales";
            const tags = ["Meta Lead", "Yo'naltirilgan"];
            const summary = "Mijoz Facebook forma orqali ariza qoldirdi (To'g'ridan-to'g'ri yo'naltirish).";
            const welcomeMsg = (settings.fbWelcomeMessage || "Salom {{name}}! So'rovingiz qabul qilindi. Tez orada bog'lanamiz.")
              .replace("{{name}}", leadName);

            const newResult = {
              groupName: detectedGroup,
              groupId,
              tags,
              welcomeMsg,
              summary,
            };

            setSimSteps(prev =>
              prev.map(s => {
                if (s.id === "step-crm") return { ...s, status: "success" as const };
                return s;
              })
            );

            setSimResult(newResult);
            setSimLoading(false);

            const selectedForm = MOCK_FB_FORMS.find(f => f.id === formId)?.name || "Kuzgi chegirmalar formasi";

            const newLog = {
              id: `log-${Date.now()}`,
              name: leadName,
              phone: leadPhone,
              formName: selectedForm,
              group: detectedGroup,
              tags: tags,
              summary: summary,
              date: "Hozir",
              status: "success",
            };

            setLeadLogs(prev => [newLog, ...prev]);

            // Save contact to database
            const allContacts = db.getContacts();
            const contactId = `contact-${Date.now()}`;
            const cleanPhone = leadPhone.replace(/\s+/g, "");
            const newContact = {
              id: contactId,
              name: leadName,
              username: cleanPhone,
              status: true,
              messagesCount: 2,
              tags: tags,
              lastActive: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            };
            db.saveContacts([newContact, ...allContacts]);

            // Save chat history to active channel
            const channelId = settings.telegramBotId || db.getActiveChannel()?.id;
            if (channelId) {
              const chatsKey = `replai_chats_${channelId}`;
              const storedChats = localStorage.getItem(chatsKey);
              let chatsList = [];
              if (storedChats) {
                try {
                  chatsList = JSON.parse(storedChats);
                } catch (e) {
                  console.error(e);
                }
              }

              const userMsgId = `msg-user-${Date.now()}`;
              const botMsgId = `msg-bot-${Date.now() + 1}`;
              const timestampStr = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

              const newChatThread = {
                id: contactId,
                name: leadName,
                username: cleanPhone,
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(leadName)}`,
                lastMessage: welcomeMsg,
                time: timestampStr,
                unread: true,
                tags: tags,
                messages: [
                  {
                    id: userMsgId,
                    sender: "user" as const,
                    text: `[Facebook Lead Form: ${selectedForm}]\nIsm: ${leadName}\nTel: ${leadPhone}\nSavol: ${leadMessage}`,
                    timestamp: timestampStr,
                  },
                  {
                    id: botMsgId,
                    sender: "bot" as const,
                    text: welcomeMsg,
                    timestamp: timestampStr,
                  }
                ]
              };

              chatsList = [newChatThread, ...chatsList.filter((c: any) => c.id !== contactId)];
              localStorage.setItem(chatsKey, JSON.stringify(chatsList));
            }

            db.saveToServer();
            showToast("Lid muvaffaqiyatli simulyatsiya qilindi va Telegramga yuborildi! 🎯");
          }, 1000);
        } else {
          // AI Qualification Mode Flow (Step 3: AI analysis done, CRM routing starts)
          setTimeout(() => {
            const msg = leadMessage.toLowerCase();
            let detectedGroup = "Sotuvlar";
            let groupId = "sales";
            
            // Get saved default tags
            let savedTags: string[] = [];
            if (typeof window !== "undefined") {
              try {
                const saved = localStorage.getItem("replai_fb_tags");
                if (saved) savedTags = JSON.parse(saved);
              } catch (e) {
                console.error(e);
              }
            }
            if (savedTags.length === 0) {
              savedTags = ["Meta Lead", "AI Saralangan"];
            }

            const tags = [...savedTags];
            let summary = "Mijoz umumiy ma'lumot so'radi.";

            const currentGroups = db.getGroups();
            const salesGroup = currentGroups.find(g => g.id === "sales")?.name || "Sotuvlar";
            const supportGroup = currentGroups.find(g => g.id === "support")?.name || "Qo'llab-quvvatlash";

            if (
              msg.includes("narx") ||
              msg.includes("qancha") ||
              msg.includes("chegirma") ||
              msg.includes("to'lov") ||
              msg.includes("narxi") ||
              msg.includes("aksiy") ||
              msg.includes("sotib") ||
              msg.includes("dollar") ||
              msg.includes("so'm") ||
              msg.includes("aksiya") ||
              msg.includes("skidka") ||
              msg.includes("pul")
            ) {
              detectedGroup = salesGroup;
              groupId = "sales";
              tags.push("High Intent", "Narxga Qiziqqan");
              summary = "Mijoz to'lov shakli, narx yoki chegirmalar bo'yicha ma'lumot so'ragan.";
            } else if (
              msg.includes("kirish") ||
              msg.includes("kirmayapti") ||
              msg.includes("parol") ||
              msg.includes("kod") ||
              msg.includes("ochilmadi") ||
              msg.includes("texnik") ||
              msg.includes("yordam") ||
              msg.includes("xatolik") ||
              msg.includes("muammo") ||
              msg.includes("sayt") ||
              msg.includes("telegram bot") ||
              msg.includes("ishlamayapti")
            ) {
              detectedGroup = supportGroup;
              groupId = "support";
              tags.push("Texnik muammo", "Support");
              summary = "Mijoz tizimga kirish yoki texnik nosozlik yuzasidan yordam so'ragan.";
            } else {
              const selectedG = currentGroups.find(g => g.id === (settings.targetGroupId || "sales"));
              detectedGroup = selectedG ? selectedG.name : salesGroup;
              groupId = settings.targetGroupId || "sales";
              tags.push("Yangi Lead");
              summary = "Mijoz Facebook forma orqali ariza qoldirgan.";
            }

            const welcomeMsg = (settings.fbWelcomeMessage || "Salom {{name}}! So'rovingiz qabul qilindi. Tez orada bog'lanamiz.")
              .replace("{{name}}", leadName);

            const newResult = {
              groupName: detectedGroup,
              groupId,
              tags,
              welcomeMsg,
              summary,
            };

            setSimSteps(prev =>
              prev.map(s => {
                if (s.id === "step-ai") return { ...s, status: "success" as const };
                if (s.id === "step-crm") return { ...s, status: "running" as const };
                return s;
              })
            );

            // Step 4: CRM routing done
            setTimeout(() => {
              setSimSteps(prev =>
                prev.map(s => {
                  if (s.id === "step-crm") return { ...s, status: "success" as const };
                  return s;
                })
              );

              setSimResult(newResult);
              setSimLoading(false);

              const selectedForm = MOCK_FB_FORMS.find(f => f.id === formId)?.name || "Kuzgi chegirmalar formasi";

              const newLog = {
                id: `log-${Date.now()}`,
                name: leadName,
                phone: leadPhone,
                formName: selectedForm,
                group: detectedGroup,
                tags: tags,
                summary: summary,
                date: "Hozir",
                status: "success",
              };

              setLeadLogs(prev => [newLog, ...prev]);

              // Save contact to database
              const allContacts = db.getContacts();
              const contactId = `contact-${Date.now()}`;
              const cleanPhone = leadPhone.replace(/\s+/g, "");
              const newContact = {
                id: contactId,
                name: leadName,
                username: cleanPhone,
                status: true,
                messagesCount: 2,
                tags: tags,
                lastActive: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
              };
              db.saveContacts([newContact, ...allContacts]);

              // Save chat history to active channel
              const channelId = settings.telegramBotId || db.getActiveChannel()?.id;
              if (channelId) {
                const chatsKey = `replai_chats_${channelId}`;
                const storedChats = localStorage.getItem(chatsKey);
                let chatsList = [];
                if (storedChats) {
                  try {
                    chatsList = JSON.parse(storedChats);
                  } catch (e) {
                    console.error(e);
                  }
                }

                const userMsgId = `msg-user-${Date.now()}`;
                const botMsgId = `msg-bot-${Date.now() + 1}`;
                const timestampStr = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

                const newChatThread = {
                  id: contactId,
                  name: leadName,
                  username: cleanPhone,
                  avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(leadName)}`,
                  lastMessage: welcomeMsg,
                  time: timestampStr,
                  unread: true,
                  tags: tags,
                  messages: [
                    {
                      id: userMsgId,
                      sender: "user" as const,
                      text: `[Facebook Lead Form: ${selectedForm}]\nIsm: ${leadName}\nTel: ${leadPhone}\nSavol: ${leadMessage}`,
                      timestamp: timestampStr,
                    },
                    {
                      id: botMsgId,
                      sender: "bot" as const,
                      text: welcomeMsg,
                      timestamp: timestampStr,
                    }
                  ]
                };

                chatsList = [newChatThread, ...chatsList.filter((c: any) => c.id !== contactId)];
                localStorage.setItem(chatsKey, JSON.stringify(chatsList));
              }

              db.saveToServer();
              showToast("Lid muvaffaqiyatli simulyatsiya qilindi va saralandi! 🎯");
            }, 800);
          }, 1000);
        }
      }, 800);
    }, 800);
  };

  if (selectedAgentType === null) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-5 relative pb-6 items-center justify-start max-w-4xl mx-auto py-2">
          {/* Toast Alert */}
          {toast && (
            <div className="fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white shadow-lg animate-in fade-in slide-in-from-top-3 duration-250">
              <CheckCircle className="text-[#9BC92E] w-5 h-5" />
              <span className="text-[13px] font-semibold text-black">{toast.message}</span>
            </div>
          )}

          {/* Header */}
          <div className="text-center flex flex-col gap-1.5">
            <span className="px-3.5 py-1.5 bg-[#C7F33C]/20 text-[#7CA607] rounded-full text-[11px] font-bold tracking-wider uppercase inline-block mx-auto">
              {t("pages.ai_agent.agent_platform")}
            </span>
            <h1 className="text-[26px] md:text-[32px] font-extrabold text-black tracking-tight leading-tight">
              {t("pages.ai_agent.select_template_title")}
            </h1>
            <p className="text-[13px] text-[#707070] max-w-lg mx-auto leading-relaxed">
              {t("pages.ai_agent.select_template_desc")}
            </p>
          </div>

          {/* Active Agents Section */}
          {(() => {
            const channels = db.getChannels();
            const activeAgents = channels.map(channel => {
              const botSettings = db.getBotSettings(channel.id);
              return {
                channel,
                settings: botSettings
              };
            }).filter(item => item.settings.aiCuratorEnabled || item.settings.fbAgentEnabled);

            const isAnyAgentActive = activeAgents.length > 0;
            return (
              <>
                {isAnyAgentActive && (
                  <div className="w-full flex flex-col gap-3 mt-1">
                    <h2 className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider self-start">
                      Ishlab turgan AI agent
                    </h2>
                    <div className="grid grid-cols-1 gap-4 w-full">
                      {activeAgents.map(item => (
                        <React.Fragment key={item.channel.id}>
                          {item.settings.aiCuratorEnabled && (
                            <div className="bg-white border border-[#E8E8E8] rounded-[28px] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-md relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C7F33C]/10 rounded-bl-full -z-10" />
                              <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-black text-[#C7F33C] grid place-items-center font-bold text-[18px] shrink-0">
                                  <Sparkles size={22} />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[17px] font-bold text-black">
                                      {t("pages.ai_agent.kurator_agent")}
                                    </h3>
                                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#C7F33C]/20 border border-[#7CA607]/20 rounded-full text-[9px] font-extrabold text-[#7CA607] uppercase tracking-wider">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7CA607] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7CA607]"></span>
                                      </span>
                                      FAOL
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#7CA607] font-semibold mt-1">
                                    Bot: @{item.channel.username.replace(/^@+/, "")}
                                  </p>
                                  <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                                    {t("pages.ai_agent.curator_desc")}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  // Switch active editing context to this channel
                                  const loadedSettings = db.getBotSettings(item.channel.id);
                                  loadedSettings.telegramBotId = item.channel.id;
                                  setSettings(loadedSettings);
                                  setTelegramBotUsername(item.channel.username);
                                  setIsTelegramLinked(true);

                                  setSelectedAgentType("kurator");
                                  if (typeof window !== "undefined") {
                                    localStorage.setItem("sendly_selected_agent_type", "kurator");
                                  }
                                }}
                                className="px-5 py-2.5 bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all text-center rounded-full flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto shadow-sm"
                              >
                                <span>Sozlash</span>
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          )}

                                {item.settings.fbAgentEnabled && item.settings.fbAgentMode === "direct" && (
                              <div className="bg-white border border-[#E8E8E8] rounded-[28px] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-md relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10" />
                                <div className="flex gap-4 items-center">
                                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold text-[18px] shrink-0">
                                    <Send size={22} />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-[17px] font-bold text-black">
                                        {"Lidlarni Telegramga yo'naltirish"}
                                      </h3>
                                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                        FAOL
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-blue-600 font-semibold mt-1">
                                      Kanal: @{item.channel.username.replace(/^@+/, "")} | Guruh: {item.settings.adminTelegramUsername ? `@${item.settings.adminTelegramUsername}` : "Ulanmagan"}
                                    </p>
                                    <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                                      {"Facebook reklama formasidan kelgan arizalar Telegram guruh yoki profilingizga yo'naltirilmoqda."}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    // Switch active editing context to this channel
                                    const loadedSettings = db.getBotSettings(item.channel.id);
                                    loadedSettings.telegramBotId = item.channel.id;
                                    setSettings(loadedSettings);
                                    setTelegramBotUsername(item.channel.username);
                                    setIsTelegramLinked(true);

                                    setSelectedAgentType("fb-leads-direct");
                                    if (typeof window !== "undefined") {
                                      localStorage.setItem("sendly_selected_agent_type", "fb-leads-direct");
                                    }
                                  }}
                                  className="px-5 py-2.5 bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-center rounded-full flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto shadow-sm"
                                >
                                  <span>Sozlash</span>
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            )}

                            {item.settings.fbAgentEnabled && item.settings.fbAgentMode !== "direct" && (
                              <div className="bg-white border border-[#E8E8E8] rounded-[28px] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-md relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10" />
                                <div className="flex gap-4 items-center">
                                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold text-[18px] shrink-0">
                                    <Facebook size={22} />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-[17px] font-bold text-black">
                                        {t("pages.ai_agent.fb_leads_agent")}
                                      </h3>
                                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                        FAOL
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-blue-600 font-semibold mt-1">
                                      Kanal: @{item.channel.username.replace(/^@+/, "")} | Guruh: {db.getGroups().find(g => g.id === (item.settings.targetGroupId || "sales"))?.name || "Sotuvlar"}
                                    </p>
                                    <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                                      {t("pages.ai_agent.fb_leads_desc_card")}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    // Switch active editing context to this channel
                                    const loadedSettings = db.getBotSettings(item.channel.id);
                                    loadedSettings.telegramBotId = item.channel.id;
                                    setSettings(loadedSettings);
                                    setTelegramBotUsername(item.channel.username);
                                    setIsTelegramLinked(true);

                                    setSelectedAgentType("fb-leads");
                                    if (typeof window !== "undefined") {
                                      localStorage.setItem("sendly_selected_agent_type", "fb-leads");
                                    }
                                  }}
                                  className="px-5 py-2.5 bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-center rounded-full flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto shadow-sm"
                                >
                                  <span>Sozlash</span>
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )/* note: isAnyAgentActive closing brace is below */}
  
                  {isAnyAgentActive && (
                    <h2 className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider self-start mt-3.5">
                      AI agentlar qo&apos;shish
                    </h2>
                  )}
  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-1">
                  {/* Card 1: AI Kurator */}
                  <div className="bg-white border border-[#E8E8E8] hover:border-black/20 hover:shadow-xl rounded-[28px] p-6 flex flex-col justify-between transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#C7F33C]/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-black text-[#C7F33C] grid place-items-center font-bold text-[18px]">
                          <Sparkles size={22} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">
                            {t("pages.ai_agent.inactive")}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[17px] font-bold text-black group-hover:text-[#7CA607] transition-colors">
                          {t("pages.ai_agent.kurator_agent")}
                        </h3>
                        <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                          {t("pages.ai_agent.curator_desc")}
                        </p>
                      </div>

                      <div className="border-t border-[#F0F0F0] my-1" />

                      <ul className="flex flex-col gap-2 text-[11px] text-[#595959]">
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#9BC92E] shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.curator_feature_1")}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#9BC92E] shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.curator_feature_2")}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#9BC92E] shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.curator_feature_3")}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#9BC92E] shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.curator_feature_4")}</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAgentType("kurator");
                        if (typeof window !== "undefined") {
                          localStorage.setItem("sendly_selected_agent_type", "kurator");
                        }
                      }}
                      className="w-full mt-6 py-3 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <span>{t("pages.ai_agent.setup_template_btn")}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Card 2: Facebook Lead Handler */}
                  <div className="bg-white border border-[#E8E8E8] hover:border-black/20 hover:shadow-xl rounded-[28px] p-6 flex flex-col justify-between transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold text-[18px]">
                          <Facebook size={22} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">
                            {t("pages.ai_agent.inactive")}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[17px] font-bold text-black group-hover:text-blue-600 transition-colors">
                          {t("pages.ai_agent.fb_leads_agent")}
                        </h3>
                        <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                          {t("pages.ai_agent.fb_leads_desc_card")}
                        </p>
                      </div>

                      <div className="border-t border-[#F0F0F0] my-1" />

                      <ul className="flex flex-col gap-2 text-[11px] text-[#595959]">
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.fb_feature_1")}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.fb_feature_2")}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.fb_feature_3")}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{t("pages.ai_agent.fb_feature_4")}</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAgentType("fb-leads");
                        if (typeof window !== "undefined") {
                          localStorage.setItem("sendly_selected_agent_type", "fb-leads");
                        }
                      }}
                      className="w-full mt-6 py-3 rounded-full bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <span>{t("pages.ai_agent.setup_template_btn")}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Card 3: Meta Leads Telegram Forwarder (AIsiz) */}
                  <div className="bg-white border border-[#E8E8E8] hover:border-black/20 hover:shadow-xl rounded-[28px] p-6 flex flex-col justify-between transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold text-[18px]">
                          <Send size={22} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">
                            {t("pages.ai_agent.inactive")}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[17px] font-bold text-black group-hover:text-blue-600 transition-colors">
                          {"Lidlarni Telegramga yo'naltirish"}
                        </h3>
                        <p className="text-[12px] text-[#707070] mt-1.5 leading-relaxed">
                          {"Facebook target arizalarini AIsiz, chiroyli ko'rinishda to'g'ridan-to'g'ri Telegram guruh yoki profilingizga yo'naltiring."}
                        </p>
                      </div>

                      <div className="border-t border-[#F0F0F0] my-1" />

                      <ul className="flex flex-col gap-2 text-[11px] text-[#595959]">
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{"Arizalarni Telegram guruh yoki lichkaga yuborish"}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{"AIsiz to'g'ridan-to'g'ri yo'naltirish rejimida ishlash"}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{"Lid ma'lumotlarini qulay formatda taqdim etish"}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>{"Tasdiqlash kodi orqali guruh/botni oson ulash"}</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAgentType("fb-leads-direct");
                        if (typeof window !== "undefined") {
                          localStorage.setItem("sendly_selected_agent_type", "fb-leads-direct");
                        }
                      }}
                      className="w-full mt-6 py-3 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <span>{t("pages.ai_agent.setup_template_btn")}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </AppLayout>
    );
  }

  if ((selectedAgentType === "fb-leads" || selectedAgentType === "fb-leads-direct") && settings) {
    const updateFieldMapping = (id: string, key: keyof FieldMapping, value: string) => {
      setFieldMappings(prev =>
        prev.map(m => (m.id === id ? { ...m, [key]: value } : m))
      );
    };

    const removeFieldMapping = (id: string) => {
      setFieldMappings(prev => prev.filter(m => m.id !== id));
      showToast(t("pages.ai_agent.field_mapping_deleted"));
    };

    const addFieldMapping = () => {
      const newMap: FieldMapping = {
        id: `map-${Date.now()}`,
        metaField: `meta_field_${fieldMappings.length + 1}`,
        sendlyField: "message",
        description: t("pages.ai_agent.description_placeholder")
      };
      setFieldMappings(prev => [...prev, newMap]);
      showToast(t("pages.ai_agent.field_mapping_added"));
    };

    const addFbTag = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTagInput.trim()) return;
      if (fbTags.includes(newTagInput.trim())) {
        setNewTagInput("");
        return;
      }
      setFbTags(prev => [...prev, newTagInput.trim()]);
      setNewTagInput("");
      showToast(t("pages.ai_agent.tag_added"));
    };

    const removeFbTag = (tagToRemove: string) => {
      setFbTags(prev => prev.filter(t => t !== tagToRemove));
      showToast(t("pages.ai_agent.tag_removed"));
    };

    return (
      <AppLayout>
        <div className="flex flex-col gap-6 relative min-h-screen pb-12">
          {/* Style override for dots flow animation */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes flowRight {
              0% { left: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { left: 100%; opacity: 0; }
            }
            .animate-flow-right {
              position: absolute;
              animation: flowRight 2s linear infinite;
            }
            .animate-flow-right-delay {
              position: absolute;
              animation: flowRight 2s linear infinite;
              animation-delay: 1s;
            }
          ` }} />

          {/* Toast Alert */}
          {toast && (
            <div className="fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white shadow-lg animate-in fade-in slide-in-from-top-3 duration-250">
              <CheckCircle className="text-[#9BC92E] w-5 h-5" />
              <span className="text-[13px] font-semibold text-black">{toast.message}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <PageHeader
              title={selectedAgentType === "fb-leads-direct" ? "Lidlarni Telegramga yo'naltirish" : "Facebook Lead Handler"}
              breadcrumbs={t("pages.ai_agent.fb_leads_breadcrumb")}
            />
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedAgentType(null);
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("sendly_selected_agent_type");
                  }
                }}
                className="px-4 py-2.5 rounded-full border border-[#D8D8D8] text-[12px] font-bold text-[#595959] hover:bg-white hover:text-black transition-colors"
              >
                {t("pages.ai_agent.change_template")}
              </button>
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold shadow-sm hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Save size={14} />
                <span>{t("pages.ai_agent.save_activate")}</span>
              </button>
            </div>
          </div>

          {/* Make.com Style Visual Flow Canvas */}
          <div className="relative w-full bg-[#0D0E12] rounded-[24px] border border-[#1E293B] p-6 md:p-8 min-h-[220px] overflow-hidden flex items-center justify-center shadow-inner select-none mb-6">
            {/* Dotted Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none" 
              style={{
                backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
                backgroundSize: '20px 20px'
              }}
            />

            <div className="flex items-center justify-between w-full max-w-4xl mx-auto relative z-10 py-4 gap-4 md:gap-12">
              {/* Node 1: FB Trigger */}
              <div 
                onClick={() => setActiveNode("trigger")}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  activeNode === "trigger" 
                    ? "bg-[#1E293B]/70 ring-2 ring-[#C7F33C] scale-105 shadow-[0_0_25px_rgba(199,243,60,0.25)]" 
                    : "hover:bg-[#1E293B]/40 hover:scale-102"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg border-2 border-blue-500 relative">
                  <Facebook size={28} />
                  {/* Status indicator */}
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-[#0D0E12]"></span>
                  </span>
                </div>
                <div className="text-center">
                  <h5 className="text-[12px] font-bold text-white leading-tight">{t("pages.ai_agent.fb_trigger_node")}</h5>
                  <span className="text-[9px] text-[#9BC92E] font-bold uppercase tracking-wider block mt-0.5">{t("pages.ai_agent.active")}</span>
                </div>
              </div>

              {/* Connector 1 */}
              <div className="flex-1 max-w-[80px] md:max-w-[120px] h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 blur-[1px]" />
                {/* Animated Dot */}
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#C7F33C] shadow-[0_0_10px_#C7F33C] animate-flow-right" />
              </div>

              {/* Node 2: AI Lead Mapper */}
              <div 
                onClick={() => setActiveNode("mapper")}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  activeNode === "mapper" 
                    ? "bg-[#1E293B]/70 ring-2 ring-[#C7F33C] scale-105 shadow-[0_0_25px_rgba(199,243,60,0.25)]" 
                    : "hover:bg-[#1E293B]/40 hover:scale-102"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg border-2 border-purple-500 relative">
                  <Sparkles size={28} />
                </div>
                <div className="text-center">
                  <h5 className="text-[12px] font-bold text-white leading-tight">
                    {selectedAgentType === "fb-leads-direct" ? "Maydonlar moslashuvi" : t("pages.ai_agent.ai_mapper_node")}
                  </h5>
                  <span className="text-[9px] text-[#A78BFA] font-bold uppercase tracking-wider block mt-0.5">
                    {t("pages.ai_agent.fields_count").replace("{count}", fieldMappings.length.toString())}
                  </span>
                </div>
              </div>

              {/* Connector 2 */}
              <div className="flex-1 max-w-[80px] md:max-w-[120px] h-[2px] bg-gradient-to-r from-purple-500 to-[#C7F33C] relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-[#C7F33C] opacity-50 blur-[1px]" />
                {/* Animated Dot */}
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#C7F33C] shadow-[0_0_10px_#C7F33C] animate-flow-right-delay" />
              </div>

              {/* Node 3: Sendly CRM Action */}
              <div 
                onClick={() => setActiveNode("router")}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  activeNode === "router" 
                    ? "bg-[#1E293B]/70 ring-2 ring-[#C7F33C] scale-105 shadow-[0_0_25px_rgba(199,243,60,0.25)]" 
                    : "hover:bg-[#1E293B]/40 hover:scale-102"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#1e2310] text-[#C7F33C] flex items-center justify-center shadow-lg border-2 border-[#C7F33C]/60">
                  <Send size={26} />
                </div>
                <div className="text-center">
                  <h5 className="text-[12px] font-bold text-white leading-tight">Sendly CRM</h5>
                  <span className="text-[9px] text-[#C7F33C] font-bold uppercase tracking-wider block mt-0.5 truncate max-w-[110px]">
                    {db.getGroups().find(g => g.id === (settings.targetGroupId || "sales"))?.name || t("pages.ai_agent.th_group")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Settings panel based on activeNode */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Facebook Lead Handler Status Card */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.fbAgentEnabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-[#707070]"}`}>
                      <Facebook size={20} className={settings.fbAgentEnabled ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-black">
                        {selectedAgentType === "fb-leads-direct" ? "Lidlarni Telegramga yo'naltirish holati" : t("pages.ai_agent.fb_leads_status")}
                      </h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {settings.fbAgentEnabled 
                          ? (selectedAgentType === "fb-leads-direct" ? "Yo'naltirish faol. Target arizalari Telegram bot orqali guruhga yuborilmoqda." : t("pages.ai_agent.fb_leads_status_active_desc")) 
                          : (selectedAgentType === "fb-leads-direct" ? "Yo'naltirish o'chirilgan." : t("pages.ai_agent.fb_leads_status_inactive_desc"))}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.fbAgentEnabled || false}
                      onChange={(e) => handleUpdateSettings("fbAgentEnabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              
              {/* TRIGGER CONFIGURATION CARD */}
              {activeNode === "trigger" && (
                <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Facebook size={20} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-black">Meta Lead Ads Trigger</h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {t("pages.ai_agent.fb_leads_desc")}
                      </p>
                    </div>
                  </div>

                  {/* Webhook URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black flex items-center justify-between">
                      <span>{t("pages.ai_agent.webhook_url_label")}</span>
                      <span className="text-[9px] text-[#707070] font-normal">{t("pages.ai_agent.webhook_url_desc")}</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`https://api.sendly.uz/webhooks/fb-leads/${settings.fbFormId || "form-1"}`}
                        className="flex-1 px-3 py-2.5 text-[11px] font-mono bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none text-[#595959] select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://api.sendly.uz/webhooks/fb-leads/${settings.fbFormId || "form-1"}`);
                          showToast(t("common.copied"));
                        }}
                        className="px-3.5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold shrink-0"
                        title={t("common.copy")}
                      >
                        <CopyIcon size={14} />
                        <span>{t("common.copy")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Verify Token */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black flex items-center justify-between">
                      <span>{t("pages.ai_agent.verify_token_label")}</span>
                      <span className="text-[9px] text-[#707070] font-normal">{t("pages.ai_agent.verify_token_desc")}</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`sdly_fb_tok_${settings.fbFormId || "form-1"}_${settings.targetGroupId || "sales"}`}
                        className="flex-1 px-3 py-2.5 text-[11px] font-mono bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none text-[#595959] select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`sdly_fb_tok_${settings.fbFormId || "form-1"}_${settings.targetGroupId || "sales"}`);
                          showToast(t("common.copied"));
                        }}
                        className="px-3.5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold shrink-0"
                        title={t("common.copy")}
                      >
                        <CopyIcon size={14} />
                        <span>{t("common.copy")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Target Form dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black">{t("pages.ai_agent.fb_target_form")}</label>
                    <CustomDropdown
                      value={settings.fbFormId || "form-1"}
                      onChange={(val) => handleUpdateSettings("fbFormId", val)}
                      options={MOCK_FB_FORMS.map(f => ({ value: f.id, label: f.name }))}
                    />
                  </div>
                </div>
              )}

              {/* MAPPER CONFIGURATION CARD */}
              {activeNode === "mapper" && (
                <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-black">AI Lead Mapper & Processor</h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {t("pages.ai_agent.mapping_desc")}
                      </p>
                    </div>
                  </div>

                  {/* System Prompt */}
                  {selectedAgentType === "fb-leads-direct" ? (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col gap-1 text-[11px] text-blue-800 leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Info size={14} className="text-blue-600 shrink-0" />
                        <span>To&apos;g&apos;ridan-to&apos;g&apos;ri yo&apos;naltirish faol</span>
                      </div>
                      <p>
                        Ushbu rejimda AI ishtirok etmaydi va lid ma&apos;lumotlarini saralamaydi. Shuning uchun AI prompti talab etilmaydi.
                        Barcha arizalar to&apos;g&apos;ridan-to&apos;g&apos;ri Telegram guruh yoki profilingizga yo&apos;naltiriladi.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-black">{t("pages.ai_agent.ai_prompt_label")}</label>
                        <div className="flex items-center gap-1 text-[10px] text-[#707070]">
                          <Info size={12} />
                          <span>{t("pages.ai_agent.ai_prompt_desc")}</span>
                        </div>
                      </div>
                      <textarea
                        value={settings.fbAgentPrompt || ""}
                        onChange={(e) => handleUpdateSettings("fbAgentPrompt", e.target.value)}
                        className="w-full min-h-[140px] p-3 text-[12px] font-mono leading-relaxed bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black resize-y text-black"
                        placeholder={t("pages.ai_agent.ai_prompt_placeholder")}
                      />
                    </div>
                  )}

                  {/* Field Mapping Editor */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[12px] font-bold text-black">{t("pages.ai_agent.field_mapping_title")}</h4>
                      <button
                        onClick={addFieldMapping}
                        className="text-[10px] bg-[#C7F33C] hover:bg-[#b5de32] text-black px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                        type="button"
                      >
                        <span>{t("pages.ai_agent.add_field_btn")}</span>
                      </button>
                    </div>

                    <div className="border border-[#E8E8E8] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-[#F9F9F7] border-b border-[#E8E8E8] text-black font-bold">
                              <th className="p-2.5">{t("pages.ai_agent.meta_field_key")}</th>
                              <th className="p-2.5">{t("pages.ai_agent.sendly_crm_type")}</th>
                              <th className="p-2.5">{t("pages.ai_agent.field_description_label")}</th>
                              <th className="p-2.5 text-center w-[60px]">{t("pages.ai_agent.action_th")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fieldMappings.map((m) => (
                              <tr key={m.id} className="border-b border-[#E8E8E8] hover:bg-[#F9F9F7]/30 transition-colors last:border-0">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={m.metaField}
                                    onChange={(e) => updateFieldMapping(m.id, "metaField", e.target.value)}
                                    className="w-full px-2 py-1.5 border border-[#E8E8E8] rounded-lg bg-white focus:outline-none focus:border-black font-semibold text-black"
                                    placeholder={t("pages.ai_agent.field_key_placeholder")}
                                  />
                                </td>
                                <td className="p-2">
                                  <CustomDropdown
                                    value={m.sendlyField}
                                    onChange={(val) => updateFieldMapping(m.id, "sendlyField", val)}
                                    options={[
                                      { value: "name", label: t("pages.ai_agent.field_type_name") },
                                      { value: "phone", label: t("pages.ai_agent.field_type_phone") },
                                      { value: "message", label: t("pages.ai_agent.field_type_message") },
                                      { value: "email", label: t("pages.ai_agent.field_type_email") },
                                      { value: "company", label: t("pages.ai_agent.field_type_company") }
                                    ]}
                                    className="w-full"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={m.description}
                                    onChange={(e) => updateFieldMapping(m.id, "description", e.target.value)}
                                    className="w-full px-2 py-1.5 border border-[#E8E8E8] rounded-lg bg-white focus:outline-none focus:border-black text-black"
                                    placeholder={t("pages.ai_agent.description_placeholder")}
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => removeFieldMapping(m.id)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                    type="button"
                                    title={t("common.delete")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ROUTER CONFIGURATION CARD */}
              {activeNode === "router" && (
                <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4">
                    <div className="w-10 h-10 rounded-full bg-lime-50 text-lime-700 flex items-center justify-center shrink-0">
                      <Send size={20} className="text-[#7CA607]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-black">Sendly CRM Router</h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {t("pages.ai_agent.routing_desc")}
                      </p>
                    </div>
                  </div>

                  {/* Standard Group Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black">{t("pages.ai_agent.target_group_label")}</label>
                    <CustomDropdown
                      value={settings.targetGroupId || "sales"}
                      onChange={(val) => handleUpdateSettings("targetGroupId", val)}
                      options={db.getGroups().map(g => ({ value: g.id, label: g.name }))}
                    />
                  </div>

                  {/* Welcome Message */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-black">{t("pages.ai_agent.welcome_message_label")}</label>
                      <span className="text-[9px] text-[#707070] italic">
                        {t("pages.ai_agent.welcome_message_desc")}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={settings.fbWelcomeMessage || ""}
                      onChange={(e) => handleUpdateSettings("fbWelcomeMessage", e.target.value)}
                      className="w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                      placeholder={t("pages.ai_agent.welcome_message_placeholder")}
                    />
                  </div>

                  {/* Automatic CRM Tags */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-black">{t("pages.ai_agent.auto_tags_label")}</label>
                    
                    <form onSubmit={addFbTag} className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder={t("pages.ai_agent.add_tag_placeholder")}
                        className="flex-1 px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-black hover:bg-black/90 text-white rounded-xl text-[11px] font-bold transition-all shrink-0"
                      >
                        {t("pages.ai_agent.add_btn")}
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 mt-1 bg-[#F9F9F7] border border-[#E8E8E8] p-3 rounded-xl min-h-[48px]">
                      {fbTags.length === 0 ? (
                        <span className="text-[10px] text-[#A0A0A0] italic">{t("pages.ai_agent.no_tags_yet")}</span>
                      ) : (
                        fbTags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E8E8E8] text-black text-[10px] font-semibold rounded-full shadow-sm"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeFbTag(tag)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-[#909090] font-bold transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Telegram Bot Selector for Facebook lead handlers */}
                  <div className="flex flex-col gap-1.5 pt-4 border-t border-[#F0F0F0] mt-3">
                    <label className="text-[11px] font-bold text-black">Telegram Bot</label>
                    {(() => {
                      const tgChannels = db.getChannels().filter(c => c.type === "telegram" && c.isConnected && c.telegramToken);
                      if (tgChannels.length > 0) {
                        const botOptions = tgChannels.map(c => ({
                          value: c.id,
                          label: `${c.name} (@${c.username.replace(/^@+/, "")})`
                        }));
                        const selectedBotId = settings.telegramBotId || tgChannels[0].id;
                        return (
                          <div className="flex flex-col gap-2 mt-1">
                            <CustomDropdown
                              value={selectedBotId}
                              onChange={handleBotChange}
                              options={botOptions}
                              placeholder="Telegram botni tanlang..."
                              className="w-full"
                            />
                            <div className="flex items-center gap-1.5 text-[10px] text-green-700 mt-0.5 bg-green-50/50 p-2.5 rounded-xl border border-green-100">
                              <CheckCircle size={12} className="text-green-500 shrink-0" />
                              <span>
                                {selectedAgentType === "fb-leads-direct" 
                                  ? "Lidlar ushbu Telegram bot orqali guruh yoki profilingizga yo'naltiriladi." 
                                  : "Inson-kuratorga murojaatlar ushbu Telegram bot orqali yuboriladi."}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex flex-col gap-2.5 p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-[11px] text-amber-800 mt-1">
                            <div className="flex items-center gap-2">
                              <Info size={14} className="shrink-0 text-amber-500" />
                              <span className="font-bold">Telegram bot topilmadi</span>
                            </div>
                            <p className="text-[10px] text-amber-600 leading-relaxed">
                              Telegram integratsiyasidan foydalanish uchun sozlamalar sahifasida kamida 1ta Telegram bot ulangan bo&apos;lishi lozim.
                            </p>
                            <Link href="/settings" className="mt-1 inline-block w-fit px-4 py-2 bg-black text-[#C7F33C] rounded-full hover:bg-black/90 font-bold text-[10px] shadow-sm transition-all text-center">
                              Sozlamalar bo&apos;limiga o&apos;tish ➔
                            </Link>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Curator Admin Connection Settings Inside Router */}
                  <div className="flex flex-col gap-3 pt-4 border-t border-[#F0F0F0] mt-3">
                    <div>
                      <h4 className="text-[12px] font-bold text-black">
                        {selectedAgentType === "fb-leads-direct" ? "Telegram guruh yoki lichkani ulash" : "Inson-kuratorni ulash"}
                      </h4>
                      <p className="text-[10px] text-[#707070] mt-1 leading-relaxed">
                        {selectedAgentType === "fb-leads-direct"
                          ? "Lidlar to'g'ridan-to'g'ri Telegram guruh yoki profilingizga yuborilishi uchun admin profilini ulang."
                          : "AI javob bera olmagan yoki operator kutilgan holatlarda bot sizga Telegram orqali xabar yo'llashi uchun kurator (admin) profilini ulang."}
                      </p>
                    </div>

                    {settings.adminTelegramChatId ? (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-green-50 border border-green-200">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-800">
                            <CheckCircle size={14} className="text-green-600 shrink-0" />
                            <span>{"Admin bog'langan"}</span>
                          </div>
                          <span className="text-[10px] text-green-700 mt-0.5">
                            Foydalanuvchi: @{settings.adminTelegramUsername} (Chat ID: {settings.adminTelegramChatId})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateSettings("adminTelegramChatId", "");
                            handleUpdateSettings("adminTelegramUsername", "");
                          }}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2.5 py-1.5 rounded-lg shadow-sm hover:shadow active:scale-95 transition-all"
                        >
                          {"O'chirish"}
                        </button>
                      </div>
                    ) : isVerifyingAdmin ? (
                      <form onSubmit={handleVerifyAdminCode} className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800">
                          <Sparkles size={14} className="text-blue-600 shrink-0 animate-pulse" />
                          <span>{"Tasdiqlash kodini kiriting"}</span>
                        </div>
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          {telegramBotUsername ? (
                            <>
                              {"Telegram-da "}
                              <a
                                href={`https://t.me/${telegramBotUsername.replace(/^@+/, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-bold text-blue-900"
                              >
                                @{telegramBotUsername.replace(/^@+/, "")}
                              </a>
                              {" botimizga o'ting va "}<strong>{"/start"}</strong>{" buyrug'ini bosing. Bot sizga yuborgan tasdiqlash kodini quyida kiriting."}
                            </>
                          ) : (
                            "Telegram botimizga o'ting va /start buyrug'ini bosing. Bot yuborgan tasdiqlash kodini quyida kiriting."
                          )}
                        </p>
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Kodni kiriting (masalan: 123456)"
                              value={adminVerifyCode}
                              onChange={(e) => setAdminVerifyCode(e.target.value)}
                              disabled={isVerifyLoading}
                              className="px-3 py-2 text-[11px] bg-white border border-blue-300 rounded-xl focus:outline-none focus:border-blue-600 flex-1 text-black"
                            />
                            {telegramBotUsername && (
                              <a
                                href={`https://t.me/${telegramBotUsername.replace(/^@+/, "")}?start=verify`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 bg-[#229ED9] hover:bg-[#1e8ec3] text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95 text-center flex items-center justify-center gap-1 shrink-0"
                              >
                                <Send size={12} />
                                <span>Kodni olish</span>
                              </a>
                            )}
                          </div>
                          
                          <div className="flex gap-2 justify-end">
                            <button
                              type="submit"
                              disabled={isVerifyLoading || !adminVerifyCode.trim()}
                              className="text-[10px] font-bold text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                            >
                              {isVerifyLoading ? "Tekshirilmoqda..." : "Tasdiqlash"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsVerifyingAdmin(false);
                                setVerifyAdminError("");
                                setAdminVerifyCode("");
                              }}
                              disabled={isVerifyLoading}
                              className="text-[10px] font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                            >
                              {"Bekor qilish"}
                            </button>
                          </div>
                        </div>
                        {verifyAdminError && (
                          <span className="text-[10px] text-red-600 font-bold mt-1">
                            {verifyAdminError}
                          </span>
                        )}
                      </form>
                    ) : (
                      <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800">
                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                            <span>{"Admin ulanmagan"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsVerifyingAdmin(true)}
                            className="text-[10px] font-bold text-white bg-black hover:bg-gray-800 px-4 py-2 rounded-lg shadow-sm hover:shadow active:scale-95 transition-all"
                          >
                            {"Ulash"}
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          {"Ulash uchun ulanayotgan Telegram botingizga borib, profilingizdan botni boshlang (/start). Bot sizga tasdiqlash kodini yuboradi."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Simulator and History */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Sandbox Lead Simulator */}
              <div className="bg-white border border-[#E8E8E8] rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
                  <h4 className="text-[13px] font-bold text-black flex items-center gap-1.5">
                    <RefreshCw size={14} className={`text-blue-500 ${simLoading ? "animate-spin" : ""}`} />
                    <span>{t("pages.ai_agent.sandbox_title")}</span>
                  </h4>
                  <span className="text-[10px] text-green-600 flex items-center gap-1 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {t("pages.ai_agent.sandbox_mode_title")}
                  </span>
                </div>

                {/* Simulator Mode Tabs */}
                <div className="grid grid-cols-2 bg-[#F5F5F3] p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setIsSimulatorJsonMode(false)}
                    className={`py-1.5 rounded-lg transition-all ${
                      !isSimulatorJsonMode ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"
                    }`}
                  >
                    {t("pages.ai_agent.simple_form")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimulatorJsonMode(true)}
                    className={`py-1.5 rounded-lg transition-all ${
                      isSimulatorJsonMode ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"
                    }`}
                  >
                    {t("pages.ai_agent.webhook_json")}
                  </button>
                </div>

                <form onSubmit={handleSimulateLead} className="flex flex-col gap-3.5">
                  {!isSimulatorJsonMode ? (
                    <>
                      {/* Simple input fields */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black">{t("pages.ai_agent.customer_name")}</label>
                        <input
                          type="text"
                          value={simLeadName}
                          onChange={(e) => setSimLeadName(e.target.value)}
                          className="px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                          placeholder={t("pages.ai_agent.customer_name_placeholder")}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black">{t("pages.ai_agent.customer_phone")}</label>
                        <input
                          type="text"
                          value={simLeadPhone}
                          onChange={(e) => setSimLeadPhone(e.target.value)}
                          className="px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                          placeholder={t("pages.ai_agent.customer_phone_placeholder")}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black">{t("pages.ai_agent.customer_message")}</label>
                        <textarea
                          value={simLeadMessage}
                          onChange={(e) => setSimLeadMessage(e.target.value)}
                          className="w-full h-20 px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black resize-none text-black"
                          placeholder={t("pages.ai_agent.customer_message_placeholder")}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Raw Webhook JSON payload text area */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-black">{t("pages.ai_agent.raw_webhook_json")}</label>
                          <span className="text-[9px] text-[#707070]">{t("pages.ai_agent.raw_webhook_json_desc")}</span>
                        </div>
                        <textarea
                          value={simJsonPayload}
                          onChange={(e) => setSimJsonPayload(e.target.value)}
                          className="w-full h-[220px] p-3 text-[11px] font-mono leading-relaxed bg-[#0A0A0C] text-[#C7F33C] border border-[#1E293B] rounded-xl focus:outline-none focus:border-[#C7F33C]/50 resize-y"
                          placeholder={t("pages.ai_agent.raw_webhook_placeholder")}
                        />
                        <span className="text-[9px] text-[#909090] leading-relaxed">
                          {t("pages.ai_agent.raw_webhook_warning")}
                        </span>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={simLoading || (!isSimulatorJsonMode && (!simLeadName.trim() || !simLeadPhone.trim()))}
                    className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {simLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{t("pages.ai_agent.ai_analyzing")}</span>
                      </>
                    ) : (
                      <>
                        <PlayIcon size={12} className="fill-white" />
                        <span>{t("pages.ai_agent.test_integration")}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Simulation Step Progress Checklist */}
                {simSteps.length > 0 && (
                  <div className="mt-2 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl flex flex-col gap-3 animate-in fade-in duration-200">
                    <span className="text-[10px] font-bold text-black uppercase tracking-wider">{t("pages.ai_agent.integration_flow_steps")}</span>
                    <div className="flex flex-col gap-2.5">
                      {simSteps.map((step) => {
                        const isPending = step.status === "pending";
                        const isRunning = step.status === "running";
                        const isSuccess = step.status === "success";
                        const isError = step.status === "error";

                        return (
                          <div key={step.id} className="flex items-center gap-2.5 text-[11px]">
                            {/* Step Status Indicator */}
                            {isPending && (
                              <div className="w-4 h-4 rounded-full border-2 border-[#D8D8D8] bg-white shrink-0" />
                            )}
                            {isRunning && (
                              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                            )}
                            {isSuccess && (
                              <CheckCircle className="text-green-500 w-4 h-4 shrink-0" />
                            )}
                            {isError && (
                              <ShieldAlert className="text-red-500 w-4 h-4 shrink-0" />
                            )}
                            
                            {/* Step Text Label */}
                            <span className={`font-semibold ${
                              isSuccess ? "text-[#595959] line-through" : isError ? "text-red-600 font-bold" : isRunning ? "text-blue-600 font-bold" : "text-[#909090]"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Simulation Final Output Results */}
                {simResult && !simLoading && (
                  <div className="mt-1 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">{t("pages.ai_agent.ai_sort_result")}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded">
                        {t("pages.ai_agent.success_badge")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-[#707070] block text-[9px]">{t("pages.ai_agent.routed_group")}</span>
                        <span className="font-bold text-black">{simResult.groupName}</span>
                      </div>
                      <div>
                        <span className="text-[#707070] block text-[9px]">{t("pages.ai_agent.assigned_tags")}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {simResult.tags.map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-[#F0F0F0] text-[#595959] text-[8px] font-medium rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] border-t border-blue-100/50 pt-2.5">
                      <span className="text-[#707070] block text-[9px]">{t("pages.ai_agent.ai_analysis_note")}</span>
                      <p className="text-black italic mt-0.5 leading-relaxed">{simResult.summary}</p>
                    </div>

                    <div className="text-[11px] border-t border-blue-100/50 pt-2.5">
                      <span className="text-[#707070] block text-[9px]">{t("pages.ai_agent.auto_sent_message")}</span>
                      <p className="text-black mt-0.5 font-medium leading-relaxed bg-white border border-[#E8E8E8] p-2 rounded-lg">
                        {simResult.welcomeMsg}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* History Logs list */}
              <div className="bg-white border border-[#E8E8E8] rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
                <h4 className="text-[13px] font-bold text-black flex items-center gap-1.5 border-b border-[#F0F0F0] pb-3">
                  <History size={14} className="text-[#707070]" />
                  <span>{t("pages.ai_agent.recent_leads_history")}</span>
                </h4>

                <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {leadLogs.map((log) => (
                    <div key={log.id} className="border-b border-[#F5F5F5] pb-3.5 last:border-0 last:pb-0 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-[11px] font-bold text-black">{log.name}</h5>
                          <span className="text-[10px] text-[#707070]">{log.phone}</span>
                        </div>
                        <span className="text-[9px] text-[#A0A0A0]">{log.date}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[#707070] block text-[8px]">{t("pages.ai_agent.th_form")}</span>
                          <span className="text-black truncate block font-medium max-w-[140px]">{log.formName}</span>
                        </div>
                        <div>
                          <span className="text-[#707070] block text-[8px]">{t("pages.ai_agent.th_group")}</span>
                          <span className="text-black font-semibold">{log.group}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex flex-wrap gap-1">
                          {log.tags.map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-[#F0F0F0] text-[#595959] text-[8px] font-medium rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-[9px] text-[#7CA607] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {t("pages.ai_agent.status_sorted")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 relative min-h-screen pb-12">
        {/* Toast Alert */}
        {toast && (
          <div className="fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white shadow-lg animate-in fade-in slide-in-from-top-3 duration-250">
            <CheckCircle className="text-[#9BC92E] w-5 h-5" />
            <span className="text-[13px] font-semibold text-black">{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            title="AI Kurator Agent"
            breadcrumbs={t("pages.ai_agent.curator_breadcrumb")}
          />
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setSelectedAgentType(null);
                if (typeof window !== "undefined") {
                  localStorage.removeItem("sendly_selected_agent_type");
                }
              }}
              className="px-4 py-2.5 rounded-full border border-[#D8D8D8] text-[12px] font-bold text-[#595959] hover:bg-white hover:text-black transition-colors"
            >
              {t("pages.ai_agent.change_template")}
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold shadow-sm hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Save size={14} />
              <span>{t("pages.ai_agent.save_activate")}</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-[#E8E8E8] gap-8">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 pb-4 text-[14px] font-bold border-b-2 transition-colors relative ${
              activeTab === "settings"
                ? "border-black text-black"
                : "border-transparent text-[#707070] hover:text-black"
            }`}
          >
            <Sparkles size={16} />
            <span>{t("pages.ai_agent.curator_settings_tab")}</span>
            {activeTab === "settings" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-2 pb-4 text-[14px] font-bold border-b-2 transition-colors relative ${
              activeTab === "knowledge"
                ? "border-black text-black"
                : "border-transparent text-[#707070] hover:text-black"
            }`}
          >
            <Database size={16} />
            <span>{t("pages.ai_agent.knowledge_base_tab")}</span>
            {activeTab === "knowledge" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 pb-4 text-[14px] font-bold border-b-2 transition-colors relative ${
              activeTab === "analytics"
                ? "border-black text-black"
                : "border-transparent text-[#707070] hover:text-black"
            }`}
          >
            <BarChart2 size={16} />
            <span>{t("pages.ai_agent.curator_analytics_tab")}</span>
            {activeTab === "analytics" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
          </button>
        </div>

        {/* Main Workspace */}
        {activeTab === "settings" && !settings && (
          <div className="flex flex-col items-center justify-center p-12 text-[#707070] gap-3">
            <Loader2 className="animate-spin text-black" size={24} />
            <span>Sozlamalar yuklanmoqda...</span>
          </div>
        )}

        {activeTab === "settings" && settings && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Settings panel */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* System Prompt Settings */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                    {t("pages.ai_agent.system_instruction_label")}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#707070]">
                    <Info size={13} />
                    <span>{t("pages.ai_agent.system_instruction_desc")}</span>
                  </div>
                </div>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => handleUpdateSettings("systemPrompt", e.target.value)}
                  className="w-full min-h-[220px] p-4 text-[12px] font-mono leading-relaxed bg-[#F9F9F7] border border-[#E8E8E8] rounded-[16px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-y text-black"
                  placeholder={t("pages.ai_agent.system_instruction_placeholder")}
                />
              </div>

              {/* Sliders (Tone, Length, Humor) */}
              <div className="relative bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
                <h3 className="text-[15px] font-bold text-black">
                  {t("pages.ai_agent.curator_tone_title")}
                </h3>

                <div className="flex flex-col gap-5">
                  {/* Tone slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] font-bold text-black">
                      <span>{t("pages.ai_agent.tone_label")}</span>
                      <span className="text-[#707070]">
                        {settings.tone > 75 ? t("pages.ai_agent.tone_formal") : settings.tone < 25 ? t("pages.ai_agent.tone_informal") : t("pages.ai_agent.tone_friendly")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.tone}
                      onChange={(e) => handleSliderChange("tone", parseInt(e.target.value))}
                      className="w-full accent-black h-1 bg-[#F0F0F0] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                      <span>{t("pages.ai_agent.tone_informal_friendly_desc")}</span>
                      <span>{t("pages.ai_agent.tone_formal_desc")}</span>
                    </div>
                  </div>

                  {/* Length slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] font-bold text-black">
                      <span>{t("pages.ai_agent.response_length_label")}</span>
                      <span className="text-[#707070]">
                        {settings.length > 75 ? t("pages.ai_agent.length_detailed") : settings.length < 25 ? t("pages.ai_agent.length_concise") : t("pages.ai_agent.length_moderate")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.length}
                      onChange={(e) => handleSliderChange("length", parseInt(e.target.value))}
                      className="w-full accent-black h-1 bg-[#F0F0F0] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                      <span>{t("pages.ai_agent.length_concise_desc")}</span>
                      <span>{t("pages.ai_agent.length_detailed_desc")}</span>
                    </div>
                  </div>

                  {/* Humor slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] font-bold text-black">
                      <span>{t("pages.ai_agent.humor_emojis_label")}</span>
                      <span className="text-[#707070]">
                        {settings.humor > 75 ? t("pages.ai_agent.humor_many") : settings.humor < 25 ? t("pages.ai_agent.humor_serious") : t("pages.ai_agent.humor_moderate")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.humor}
                      onChange={(e) => handleSliderChange("humor", parseInt(e.target.value))}
                      className="w-full accent-black h-1 bg-[#F0F0F0] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                      <span>{t("pages.ai_agent.humor_serious_desc")}</span>
                      <span>{t("pages.ai_agent.humor_funny_desc")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permanent Sliders Preview Card */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-[#F0F0F0] pb-3">
                  <Sparkles size={16} className="text-black" />
                  <h3 className="text-[14px] font-bold text-black">
                    {"Ohang va Xarakter ta'siri (Suhbat namunasi)"}
                  </h3>
                </div>

                {/* Tab Pills */}
                <div className="flex bg-[#F5F5F3] p-1 rounded-xl text-[11px] font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setSliderPreviewType("tone")}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                      sliderPreviewType === "tone"
                        ? "bg-white text-black shadow-sm"
                        : "text-[#707070] hover:text-black"
                    }`}
                  >
                    {"Muloqot ohangi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderPreviewType("length")}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                      sliderPreviewType === "length"
                        ? "bg-white text-black shadow-sm"
                        : "text-[#707070] hover:text-black"
                    }`}
                  >
                    {"Javob uzunligi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderPreviewType("humor")}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                      sliderPreviewType === "humor"
                        ? "bg-white text-black shadow-sm"
                        : "text-[#707070] hover:text-black"
                    }`}
                  >
                    {"Hazil-mutoyiba"}
                  </button>
                </div>

                {/* Render preview message */}
                {(() => {
                  const sliderVal = sliderPreviewType === "tone" 
                    ? settings.tone 
                    : sliderPreviewType === "length" 
                    ? settings.length 
                    : settings.humor;
                  const content = getSliderPreviewContent(sliderPreviewType, sliderVal);
                  return (
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#707070] px-1 uppercase tracking-wider">
                        <span>{content.title}</span>
                        <span className="bg-black/5 px-2 py-0.5 rounded-md text-black font-extrabold">
                          {sliderVal}%
                        </span>
                      </div>
                      <div className="flex flex-col gap-2.5 pt-1 text-[11px]">
                        {/* User Message */}
                        <div className="flex flex-col items-end max-w-[85%] ml-auto">
                          <div className="bg-[#F0F0F0] text-black px-3.5 py-2 rounded-[16px] rounded-tr-sm leading-relaxed text-right">
                            {content.question}
                          </div>
                        </div>
                        {/* Bot Reply */}
                        <div className="flex flex-col items-start max-w-[85%] mr-auto">
                          <div className="bg-black text-[#C7F33C] px-3.5 py-2 rounded-[16px] rounded-tl-sm leading-relaxed text-left">
                            {content.reply}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Dynamic Restricted Topics */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                  <ShieldAlert className="text-red-500 w-4 h-4" />
                  <span>{t("pages.ai_agent.forbidden_topics_title")}</span>
                </h3>
                <p className="text-[11px] text-[#707070] leading-relaxed">
                  {t("pages.ai_agent.forbidden_topics_desc")}
                </p>

                <form onSubmit={handleAddTopic} className="flex gap-2">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder={t("pages.ai_agent.forbidden_topic_placeholder")}
                    className="flex-1 px-4 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-black text-white hover:bg-black/90 text-[12px] font-bold transition-all"
                  >
                    {t("pages.ai_agent.add_btn")}
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.topics.map((topic) => (
                    <span
                      key={topic}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-semibold text-red-700"
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        className="text-red-400 hover:text-red-800 font-bold ml-1 text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {settings.topics.length === 0 && (
                    <span className="text-[11px] text-[#A0A0A0] italic">{t("pages.ai_agent.no_forbidden_topics")}</span>
                  )}
                </div>
              </div>

              {/* Escalation Rules */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                  <ArrowRight className="text-blue-500 w-4 h-4" />
                  <span>{t("pages.ai_agent.escalation_rules_title")}</span>
                </h3>
                <p className="text-[11px] text-[#707070]">
                  {t("pages.ai_agent.escalation_rules_desc")}
                </p>

                <form onSubmit={handleAddRule} className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder={t("pages.ai_agent.escalation_rule_placeholder")}
                    className="flex-1 px-4 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-black text-white hover:bg-black/90 text-[12px] font-bold transition-all"
                  >
                    {t("pages.ai_agent.add_btn")}
                  </button>
                </form>

                <div className="flex flex-col gap-2 mt-2">
                  {settings.escalationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E8E8E8] hover:bg-[#F9F9F7] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          className="w-4 h-4 accent-black cursor-pointer"
                        />
                        <span className={`text-[12px] font-medium ${rule.enabled ? "text-black" : "text-[#707070] line-through"}`}>
                          {rule.text}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-[#707070] hover:text-red-600 transition-colors p-1"
                        title={t("common.delete")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outreach Auto settings */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-black">
                      {t("pages.ai_agent.auto_outreach_title")}
                    </h3>
                    <p className="text-[11px] text-[#707070] mt-1">
                      {t("pages.ai_agent.auto_outreach_desc")}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoOutreach}
                      onChange={(e) => handleUpdateSettings("autoOutreach", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                {settings.autoOutreach && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-black">{t("pages.ai_agent.outreach_start_time")}</span>
                      <input
                        type="time"
                        value={settings.outreachStart}
                        onChange={(e) => handleUpdateSettings("outreachStart", e.target.value)}
                        className="px-3 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-black">{t("pages.ai_agent.outreach_end_time")}</span>
                      <input
                        type="time"
                        value={settings.outreachEnd}
                        onChange={(e) => handleUpdateSettings("outreachEnd", e.target.value)}
                        className="px-3 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Curator Admin Notification Settings */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-[15px] font-bold text-black">
                    {"Inson-kuratorni ulash"}
                  </h3>
                  <p className="text-[11px] text-[#707070] mt-1">
                    {"AI javob bera olmagan yoki operator kutilgan holatlarda bot sizga Telegram orqali xabar yo'llashi uchun kurator (admin) profilini ulang."}
                  </p>
                </div>

                {settings.adminTelegramChatId ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-green-800">
                        <CheckCircle size={14} className="text-green-600 shrink-0" />
                        <span>{"Admin profil bog'langan"}</span>
                      </div>
                      <span className="text-[11px] text-green-700 mt-1">
                        Foydalanuvchi: @{settings.adminTelegramUsername} (Chat ID: {settings.adminTelegramChatId})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateSettings("adminTelegramChatId", "");
                        handleUpdateSettings("adminTelegramUsername", "");
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow active:scale-95 transition-all"
                    >
                      {"O'chirish"}
                    </button>
                  </div>
                ) : isVerifyingAdmin ? (
                  <form onSubmit={handleVerifyAdminCode} className="flex flex-col gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-blue-800">
                      <Sparkles size={14} className="text-blue-600 shrink-0 animate-pulse" />
                      <span>{"Tasdiqlash kodini kiriting"}</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      {telegramBotUsername ? (
                        <>
                          {"Telegram-da "}
                          <a
                            href={`https://t.me/${telegramBotUsername.replace(/^@+/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-bold text-blue-900"
                          >
                            @{telegramBotUsername.replace(/^@+/, "")}
                          </a>
                          {" botimizga o'ting va "}<strong>{"/start"}</strong>{" buyrug'ini bosing. Bot sizga yuborgan tasdiqlash kodini quyida kiriting."}
                        </>
                      ) : (
                        "Telegram botimizga o'ting va /start buyrug'ini bosing. Bot yuborgan tasdiqlash kodini quyida kiriting."
                      )}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Kodni kiriting (masalan: 123456)"
                        value={adminVerifyCode}
                        onChange={(e) => setAdminVerifyCode(e.target.value)}
                        disabled={isVerifyLoading}
                        className="px-3 py-2 text-[12px] bg-white border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black flex-1 text-black"
                      />
                      {telegramBotUsername && (
                        <a
                          href={`https://t.me/${telegramBotUsername.replace(/^@+/, "")}?start=verify`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-[#229ED9] hover:bg-[#1e8ec3] text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95 text-center flex items-center justify-center gap-1 shrink-0"
                        >
                          <Send size={12} />
                          <span>Kodni olish</span>
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        type="submit"
                        disabled={isVerifyLoading || !adminVerifyCode.trim()}
                        className="text-[11px] font-bold text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        {isVerifyLoading ? "Tekshirilmoqda..." : "Tasdiqlash"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsVerifyingAdmin(false);
                          setVerifyAdminError("");
                          setAdminVerifyCode("");
                        }}
                        disabled={isVerifyLoading}
                        className="text-[11px] font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        {"Bekor qilish"}
                      </button>
                    </div>
                    {verifyAdminError && (
                      <span className="text-[10px] text-red-600 font-bold mt-1">
                        {verifyAdminError}
                      </span>
                    )}
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-blue-800">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>{"Admin profil ulanmagan"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVerifyingAdmin(true)}
                        className="text-[11px] font-bold text-white bg-black hover:bg-gray-800 px-4 py-1.5 rounded-lg shadow-sm hover:shadow active:scale-95 transition-all"
                      >
                        {"Ulash"}
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      {"Ulash uchun ulanayotgan Telegram botingizga borib, profilingizdan botni boshlang (/start). Bot sizga tasdiqlash kodini yuboradi."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Sticky column */}
            <div className="lg:col-span-5 lg:sticky lg:top-28 flex flex-col gap-5 lg:h-[calc(100vh-140px)]">
              {/* AI Agent Status Card (Moved from Left Side) */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.aiCuratorEnabled ? "bg-[#C7F33C]/25 text-[#7CA607]" : "bg-gray-100 text-[#707070]"}`}>
                      <Sparkles size={20} className={settings.aiCuratorEnabled ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-black">{t("pages.ai_agent.curator_status")}</h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {settings.aiCuratorEnabled 
                          ? t("pages.ai_agent.curator_active_desc") 
                          : t("pages.ai_agent.curator_inactive_desc")}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.aiCuratorEnabled || false}
                      onChange={(e) => handleToggleAiCurator(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[#F0F0F0]">
                  <label className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">AI Curator uchun Telegram Bot</label>
                  {(() => {
                    const tgChannels = db.getChannels().filter(c => c.type === "telegram" && c.isConnected && c.telegramToken);
                    if (tgChannels.length > 0) {
                      const botOptions = tgChannels.map(c => ({
                        value: c.id,
                        label: `${c.name} (@${c.username.replace(/^@+/, "")})`
                      }));
                      const selectedBotId = settings.telegramBotId || tgChannels[0].id;
                      return (
                        <div className="flex flex-col gap-2 mt-1">
                          <CustomDropdown
                            value={selectedBotId}
                            onChange={handleBotChange}
                            options={botOptions}
                            placeholder="Telegram botni tanlang..."
                            className="w-full"
                          />
                          <div className="flex items-center gap-1.5 text-[10px] text-green-700 mt-1 bg-green-50/50 p-2.5 rounded-xl border border-green-100">
                            <CheckCircle size={12} className="text-green-500 shrink-0" />
                            <span>AI kuratori ushbu tanlangan Telegram bot orqali savollarga javob beradi.</span>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex flex-col gap-2.5 p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-[11px] text-amber-800 mt-1">
                          <div className="flex items-center gap-2">
                            <Info size={14} className="shrink-0 text-amber-500" />
                            <span className="font-bold">Telegram bot topilmadi</span>
                          </div>
                          <p className="text-[10px] text-amber-600 leading-relaxed">
                            AI kuratordan foydalanish uchun sozlamalar sahifasida kamida 1ta Telegram bot ulangan bo&apos;lishi lozim.
                          </p>
                          <Link href="/settings" className="mt-1 inline-block w-fit px-4 py-2 bg-black text-[#C7F33C] rounded-full hover:bg-black/90 font-bold text-[10px] shadow-sm transition-all text-center">
                            Sozlamalar bo&apos;limiga o&apos;tish ➔
                          </Link>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Sandbox Preview chat simulator */}
              <div className="bg-[#F9F9F7] border border-[#E8E8E8] rounded-[28px] overflow-hidden flex flex-col flex-1 shadow-inner min-h-[400px]">
              {/* Header */}
              <div className="bg-white border-b border-[#E8E8E8] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black text-[#C7F33C] grid place-items-center font-bold text-[14px]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-black">{t("pages.ai_agent.curator_sandbox_title")}</h4>
                    <span className="text-[10px] text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {t("pages.ai_agent.curator_sandbox_active")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setChatMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      sender: "bot",
                      text: t("pages.ai_agent.chat_history_cleared"),
                      time: t("common.today"),
                      confidence: 100
                    }
                  ])}
                  className="text-[10px] text-[#707070] hover:text-black font-semibold"
                >
                  {t("pages.ai_agent.clear_btn")}
                </button>
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  const isWarning = msg.sender === "warning";

                  if (isWarning) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2 max-w-[90%] mx-auto">
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-[11px] text-red-700 flex gap-2.5 items-start">
                          <ShieldAlert size={16} className="shrink-0 text-red-500 mt-0.5" />
                          <div>
                            <p className="font-bold">{t("pages.ai_agent.moderation_block_title")}</p>
                            <p className="mt-1 leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      <div
                        className={`p-3.5 rounded-[20px] text-[12px] leading-relaxed ${
                          isUser
                            ? "bg-black text-[#C7F33C] rounded-tr-sm"
                            : "bg-white text-black border border-[#E8E8E8] rounded-tl-sm shadow-sm"
                        }`}
                      >
                        {msg.text}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 px-1 text-[9px] text-[#A0A0A0]">
                        <span>{msg.time}</span>
                        {!isUser && msg.confidence !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">
                              {t("pages.ai_agent.confidence_label")} {msg.confidence}%
                            </span>
                          </>
                        )}
                      </div>

                      {/* Sources ground details if any */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {msg.sources.map((src, i) => (
                            <span
                              key={i}
                              className="text-[8px] bg-white border border-[#E8E8E8] px-2 py-0.5 rounded text-[#707070] italic"
                            >
                              {t("pages.ai_agent.source_label")} {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex mr-auto items-start max-w-[80%]">
                    <div className="bg-white text-[#707070] border border-[#E8E8E8] p-3.5 rounded-[20px] rounded-tl-sm text-[12px] shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#A0A0A0] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#A0A0A0] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-[#A0A0A0] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSendSimMessage}
                className="bg-white border-t border-[#E8E8E8] p-3 flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  disabled={chatLoading}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t("pages.ai_agent.student_question_placeholder")}
                  className="flex-1 px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-10 h-10 rounded-xl bg-black text-[#C7F33C] grid place-items-center hover:bg-black/90 disabled:opacity-50 transition-all shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

        {/* Bilim Bazasi Workspace */}
        {activeTab === "knowledge" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Side: Tree navigation of modules/lessons */}
            <div className="md:col-span-5 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F0F0F0]">
                <h3 className="text-[14px] font-bold text-black">{t("pages.ai_agent.modules_lessons_title")}</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAddModuleModal(true)}
                    className="p-1.5 text-black hover:bg-[#F9F9F7] rounded-lg transition-all"
                    title={t("pages.ai_agent.create_module_tooltip")}
                  >
                    <FolderPlus size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (modules.length === 0) {
                        setAlertModal({
                          isOpen: true,
                          title: t("pages.ai_agent.lesson_create_error_title"),
                          message: t("pages.ai_agent.lesson_create_error_desc"),
                        });
                        return;
                      }
                      setNewLessonModuleId(modules[0].id);
                      setShowAddLessonModal(true);
                    }}
                    className="p-1.5 text-black hover:bg-[#F9F9F7] rounded-lg transition-all"
                    title={t("pages.ai_agent.create_lesson_tooltip")}
                  >
                    <FilePlus size={16} />
                  </button>
                </div>
              </div>

              {/* Tree structure */}
              <div className="flex flex-col gap-3">
                {modules.map((mod) => {
                  const isExpanded = expandedModules[mod.id];
                  const modLessons = lessons.filter((l) => l.moduleId === mod.id);

                  return (
                    <div key={mod.id} className="flex flex-col gap-1 border-b border-[#F9F9F7] pb-2 last:border-0 last:pb-0">
                      {/* Module title header */}
                      <div
                        onClick={() => toggleModule(mod.id)}
                        className="flex items-center justify-between p-2 hover:bg-[#F9F9F7] rounded-xl cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} className="text-[#707070]" /> : <ChevronRight size={14} className="text-[#707070]" />}
                          <span className="text-[12px] font-bold text-black">{mod.title}</span>
                          <span className="text-[9px] bg-[#F0F0F0] px-1.5 py-0.5 rounded-full text-[#707070] font-medium">
                            {t("pages.ai_agent.lesson_count_badge").replace("{count}", modLessons.length.toString())}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteModule(mod.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-[#A0A0A0] hover:text-red-600 transition-all p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Lessons list under module */}
                      {isExpanded && (
                        <div className="pl-6 flex flex-col gap-0.5">
                          {modLessons.map((les) => {
                            const isSelected = selectedLesson?.id === les.id;
                            return (
                              <div
                                key={les.id}
                                onClick={() => setSelectedLesson(les)}
                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer group transition-all ${
                                  isSelected
                                    ? "bg-black text-[#C7F33C]"
                                    : "text-black hover:bg-[#F9F9F7]"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen size={12} className={isSelected ? "text-[#C7F33C]" : "text-[#707070]"} />
                                  <span className="text-[11px] font-medium truncate">{les.title}</span>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteLesson(les.id, e)}
                                  className={`opacity-0 group-hover:opacity-100 transition-all p-1 ${
                                    isSelected ? "text-[#C7F33C] hover:text-red-400" : "text-[#A0A0A0] hover:text-red-600"
                                  }`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                          {modLessons.length === 0 && (
                            <p className="text-[10px] text-[#A0A0A0] italic p-2">{t("pages.ai_agent.no_lessons_yet")}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {modules.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[11px] text-[#707070] italic">{t("pages.ai_agent.no_modules_yet")}</p>
                    <button
                      onClick={() => setShowAddModuleModal(true)}
                      className="text-[11px] font-bold text-black underline mt-2"
                    >
                      {t("pages.ai_agent.create_first_module")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Transcript / Lesson editor */}
            <div className="md:col-span-7 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
              {selectedLesson ? (
                <div className="flex flex-col gap-5 flex-1">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold">
                      {modules.find((m) => m.id === selectedLesson.moduleId)?.title || t("pages.ai_agent.module_label")}
                    </span>
                    <input
                      type="text"
                      value={selectedLesson.title}
                      onChange={(e) => handleUpdateSelectedLesson("title", e.target.value)}
                      className="w-full text-[16px] font-bold text-black border-b border-transparent hover:border-[#E8E8E8] focus:border-black focus:outline-none py-1.5 transition-colors"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-black">
                        {t("pages.ai_agent.lesson_transcript_label")}
                      </label>
                      <span className="text-[10px] text-[#707070]">
                        {t("pages.ai_agent.chars_count").replace("{count}", (selectedLesson.transcript?.length || 0).toString())}
                      </span>
                    </div>
                    <textarea
                      value={selectedLesson.transcript || ""}
                      onChange={(e) => handleUpdateSelectedLesson("transcript", e.target.value)}
                      className="w-full flex-1 min-h-[300px] p-4 text-[12px] leading-relaxed bg-[#F9F9F7] border border-[#E8E8E8] rounded-[16px] focus:outline-none focus:border-black resize-y"
                      placeholder={t("pages.ai_agent.lesson_transcript_placeholder")}
                    />
                  </div>

                  {/* Materials upload Mock */}
                  <div className="border-t border-[#F0F0F0] pt-4 mt-2">
                    <label className="text-[12px] font-bold text-black block mb-2">
                      {t("pages.ai_agent.useful_materials_label")}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex flex-wrap gap-2">
                        {selectedLesson.pdfMaterials?.map((pdf, idx) => (
                          <span
                            key={idx}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F9F7] border border-[#E8E8E8] text-[11px] text-[#595959]"
                          >
                            <FileText size={12} className="text-[#707070]" />
                            <span>{pdf}</span>
                          </span>
                        )) || <span className="text-[11px] text-[#A0A0A0] italic">{t("pages.ai_agent.no_materials_yet")}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const mockName = prompt(t("pages.ai_agent.enter_material_name"));
                          if (mockName) {
                            const currentPdfs = selectedLesson.pdfMaterials || [];
                            handleUpdateSelectedLesson("pdfMaterials", [...currentPdfs, mockName + ".pdf"]);
                            showToast(t("pages.ai_agent.material_added_toast"));
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-[#D8D8D8] rounded-xl hover:bg-[#F9F9F7] text-[11px] font-semibold text-[#595959] transition-all"
                      >
                        <Upload size={12} />
                        <span>{t("pages.ai_agent.upload_file_btn")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <BookOpen size={48} className="text-[#A0A0A0] mb-4" />
                  <h4 className="text-[14px] font-bold text-black">{t("pages.ai_agent.no_lesson_selected")}</h4>
                  <p className="text-[11px] text-[#707070] mt-1 max-w-[280px]">
                    {t("pages.ai_agent.no_lesson_selected_desc")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Workspace */}
        {activeTab === "analytics" && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Summary metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                <div className="absolute right-4 top-4 text-black/10">
                  <BarChart2 size={24} />
                </div>
                <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">{t("pages.ai_agent.total_analyzed")}</span>
                <span className="text-[24px] font-extrabold text-black">{analyzedMessages.length} {t("pages.ai_agent.count_unit")}</span>
                <span className="text-[10px] text-[#A0A0A0] mt-1">Real vaqtda yangilanmoqda</span>
              </div>

              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                <div className="absolute right-4 top-4 text-[#7CA607]/20">
                  <CheckCircle size={24} />
                </div>
                <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">{t("pages.ai_agent.resolution_rate")}</span>
                <span className="text-[24px] font-extrabold text-[#7CA607]">
                  {analyzedMessages.length > 0 ? Math.min(98, Math.round(88 + (analyzedMessages.length % 7))) : 0}%
                </span>
                <span className="text-[10px] text-[#A0A0A0] mt-1">Operator aralashuvisiz hal bo'ldi</span>
              </div>

              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                <div className="absolute right-4 top-4 text-amber-500/20">
                  <Sparkles size={24} />
                </div>
                <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">{t("pages.ai_agent.avg_confidence")}</span>
                <span className="text-[24px] font-extrabold text-black">
                  {analyzedMessages.length > 0 
                    ? Math.round(analyzedMessages.reduce((acc, curr) => acc + curr.confidence, 0) / analyzedMessages.length) 
                    : 0}%
                </span>
                <span className="text-[10px] text-[#A0A0A0] mt-1">AI javob berish aniqligi</span>
              </div>

              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                <div className="absolute right-4 top-4 text-blue-500/20">
                  <History size={24} />
                </div>
                <span className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">{t("pages.ai_agent.avg_response_time")}</span>
                <span className="text-[24px] font-extrabold text-blue-600">1.1 sek</span>
                <span className="text-[10px] text-[#A0A0A0] mt-1">O'rtacha javob qaytarish tezligi</span>
              </div>
            </div>

            {/* Split Grid for metrics charts & actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Customer Sentiment Breakdown */}
              <div className="lg:col-span-4 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-[13px] font-extrabold text-black border-b border-[#F0F0F0] pb-2.5">
                    {t("pages.ai_agent.customer_sentiment")}
                  </h3>
                  {(() => {
                    const pos = analyzedMessages.filter(m => m.sentiment === "positive").length;
                    const neu = analyzedMessages.filter(m => m.sentiment === "neutral").length;
                    const neg = analyzedMessages.filter(m => m.sentiment === "negative").length;
                    const total = analyzedMessages.length || 1;
                    const posPct = Math.round((pos / total) * 100);
                    const neuPct = Math.round((neu / total) * 100);
                    const negPct = Math.round((neg / total) * 100);

                    return (
                      <div className="flex flex-col gap-4 mt-3">
                        {/* Visual multi-segmented bar */}
                        <div className="h-3.5 w-full rounded-full overflow-hidden bg-[#F5F5F3] flex">
                          <div className="bg-[#34C759] h-full transition-all" style={{ width: `${posPct}%` }} title={`Ijobiy: ${posPct}%`} />
                          <div className="bg-[#FFCC00] h-full transition-all" style={{ width: `${neuPct}%` }} title={`Neytral: ${neuPct}%`} />
                          <div className="bg-[#FF3B30] h-full transition-all" style={{ width: `${negPct}%` }} title={`Salbiy: ${negPct}%`} />
                        </div>
                        {/* Statistics rows */}
                        <div className="flex flex-col gap-2.5 text-[11px] font-semibold">
                          <div className="flex justify-between items-center p-1.5 hover:bg-[#F9F9F7] rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                              <span className="text-[#34C759]">{t("pages.ai_agent.sentiment_positive")}</span>
                            </div>
                            <span className="text-black">{pos} {t("pages.ai_agent.count_unit")} ({posPct}%)</span>
                          </div>
                          <div className="flex justify-between items-center p-1.5 hover:bg-[#F9F9F7] rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
                              <span className="text-[#B8860B]">{t("pages.ai_agent.sentiment_neutral")}</span>
                            </div>
                            <span className="text-black">{neu} {t("pages.ai_agent.count_unit")} ({neuPct}%)</span>
                          </div>
                          <div className="flex justify-between items-center p-1.5 hover:bg-[#F9F9F7] rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" />
                              <span className="text-[#FF3B30]">{t("pages.ai_agent.sentiment_negative")}</span>
                            </div>
                            <span className="text-black">{neg} {t("pages.ai_agent.count_unit")} ({negPct}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <span className="text-[10px] text-[#A0A0A0] text-center">Neyron tarmoq tahlili asosida</span>
              </div>

              {/* Topics Breakdown */}
              <div className="lg:col-span-5 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-[13px] font-extrabold text-black border-b border-[#F0F0F0] pb-2.5">
                    {t("pages.ai_agent.topics_distribution")}
                  </h3>
                  {analyzedMessages.length === 0 ? (
                    <p className="text-[11px] text-[#A0A0A0] italic text-center py-6">{t("pages.ai_agent.no_analytics_yet")}</p>
                  ) : (
                    <div className="flex flex-col gap-3 mt-3">
                      {(() => {
                        const intents = ["billing", "support", "faq", "affiliate", "general"];
                        return intents.map(intent => {
                          const count = analyzedMessages.filter(m => m.intent === intent).length;
                          const percentage = analyzedMessages.length > 0 ? Math.round((count / analyzedMessages.length) * 100) : 0;
                          return (
                            <div key={intent} className="flex flex-col gap-1 text-[11px]">
                              <div className="flex justify-between font-bold text-black text-[10px]">
                                <span>{t("pages.ai_agent.intent_" + intent)}</span>
                                <span className="text-[#707070]">{count} ta ({percentage}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#F5F5F3] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    intent === "billing" ? "bg-black" :
                                    intent === "support" ? "bg-blue-600" :
                                    intent === "faq" ? "bg-green-600" :
                                    intent === "affiliate" ? "bg-purple-600" : "bg-gray-400"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-[#A0A0A0] text-center">Foydalanuvchi savollari toifalari</span>
              </div>

              {/* Exports & Control Center */}
              <div className="lg:col-span-3 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-[13px] font-extrabold text-black border-b border-[#F0F0F0] pb-2.5">
                    Hisobotlar & Boshqaruv
                  </h3>
                  <div className="flex flex-col gap-2.5 mt-4">
                    <button
                      onClick={() => {
                        if (analyzedMessages.length === 0) {
                          showToast("Eksport qilish uchun ma'lumotlar yo'q!");
                          return;
                        }
                        const headers = ["Foydalanuvchi", "Murojaat matni", "AI javobi", "Toifa", "Kayfiyat", "Ishonch darajasi", "Sana"];
                        const rows = analyzedMessages.map(m => [
                          `@${m.username}`,
                          m.message.replace(/"/g, '""'),
                          m.response.replace(/"/g, '""'),
                          t("pages.ai_agent.intent_" + m.intent),
                          t("pages.ai_agent.sentiment_" + m.sentiment),
                          `${m.confidence}%`,
                          m.date
                        ]);
                        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                          + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `sendly_custdev_report_${Date.now()}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast("CSV hisoboti muvaffaqiyatli yuklab olindi! 📊");
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-black hover:bg-black/90 text-[#C7F33C] text-[11px] font-bold rounded-xl transition-all shadow-sm"
                    >
                      <Upload size={13} className="rotate-180" />
                      <span>{t("pages.ai_agent.export_csv")}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (analyzedMessages.length === 0) {
                          showToast("Eksport qilish uchun ma'lumotlar yo'q!");
                          return;
                        }
                        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                          JSON.stringify(analyzedMessages, null, 2)
                        )}`;
                        const link = document.createElement("a");
                        link.setAttribute("href", jsonString);
                        link.setAttribute("download", `sendly_custdev_report_${Date.now()}.json`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast("JSON hisoboti muvaffaqiyatli yuklab olindi! 💻");
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F9F9F7] hover:bg-[#F0F0EE] border border-[#E8E8E8] text-black text-[11px] font-bold rounded-xl transition-all shadow-sm"
                    >
                      <FileText size={13} />
                      <span>{t("pages.ai_agent.export_json")}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Tahlillar tarixini tozalash",
                      message: "Haqiqatan ham barcha tahlil qilingan xabarlar tarixini o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
                      onConfirm: () => {
                        setAnalyzedMessages([]);
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("replai_curator_analyzed_messages");
                        }
                        showToast("Tahlillar tarixi muvaffaqiyatli tozalandi! 🧹");
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      }
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-[10px] font-bold rounded-xl transition-all"
                >
                  <Trash2 size={12} />
                  <span>{t("pages.ai_agent.clear_history")}</span>
                </button>
              </div>
            </div>

            {/* Split Grid for intent stats and paint points */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* CustDev suggestions */}
              <div className="lg:col-span-7 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[#F0F0F0] pb-3">
                  <h3 className="text-[13px] font-extrabold text-black">
                    {t("pages.ai_agent.pain_points_suggestions")}
                  </h3>
                  <button
                    onClick={() => {
                      setIsRefreshingAnalysis(true);
                      setTimeout(() => {
                        setIsRefreshingAnalysis(false);
                        showToast("AI CustDev tahlillari yangilandi! 🚀");
                      }, 1000);
                    }}
                    className="text-[9px] bg-black hover:bg-black/90 text-[#C7F33C] px-2.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw size={10} className={isRefreshingAnalysis ? "animate-spin" : ""} />
                    <span>{t("pages.ai_agent.update_analysis")}</span>
                  </button>
                </div>
                {analyzedMessages.length === 0 ? (
                  <p className="text-[11px] text-[#A0A0A0] italic text-center py-6">{t("pages.ai_agent.no_analytics_yet")}</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
                    {(() => {
                      const uniqueIntents = Array.from(new Set(analyzedMessages.map(m => m.intent)));
                      return uniqueIntents.map(intent => {
                        const msgs = analyzedMessages.filter(m => m.intent === intent);
                        if (msgs.length === 0) return null;
                        const sampleMsg = msgs[0];
                        
                        let solution = "Tavsif yoki qo'llanmaga qo'shimcha ma'lumotlar qo'shish.";
                        if (intent === "billing") solution = "Uzcard/Humo kartalarini ulash bo'yicha bosqichma-bosqich rasm/video qo'llanma qo'shish va to'lov xatoliklari bo'yicha ogohlantirish.";
                        if (intent === "support") solution = "@BotFather orqali token olish qismini darslikning 1-modulida visual animatsiyalar bilan boyitish.";
                        if (intent === "faq") solution = "Darslik bilimlar bazasiga (RAG) o'quvchilar tomonidan eng ko'p so'ralgan FAQ javoblarni yangi modul sifatida kiritish.";
                        if (intent === "affiliate") solution = "Hamkor kabineti sahifasiga komissiya yechib olish va referal tizim shartlari bo'yicha FAQ bo'limini qo'shish.";

                        return (
                          <div key={intent} className="p-3 bg-[#F9F9F7] rounded-xl border border-[#E8E8E8] flex flex-col gap-2 text-[11px]">
                            <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-1.5">
                              <span className="font-bold text-black">{t("pages.ai_agent.intent_" + intent)}</span>
                              <span className="text-[8px] bg-black text-[#C7F33C] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">CustDev</span>
                            </div>
                            <div>
                              <span className="font-bold text-black block mb-0.5 text-[10px]">{t("pages.ai_agent.custdev_pain_point")}</span>
                              <span className="text-[#595959] leading-relaxed">{sampleMsg.painPoint}</span>
                            </div>
                            <div className="bg-[#C7F33C]/10 border border-[#b2db2a]/20 p-2.5 rounded-lg mt-0.5">
                              <span className="font-bold text-[#7CA607] block mb-0.5 text-[10px]">{t("pages.ai_agent.custdev_solution")}</span>
                              <span className="text-[#595959] leading-relaxed">{solution}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Recurring Friction Points */}
              <div className="lg:col-span-5 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-[13px] font-extrabold text-black border-b border-[#F0F0F0] pb-3">
                  {t("pages.ai_agent.recurring_pain_points")}
                </h3>
                {analyzedMessages.length === 0 ? (
                  <p className="text-[11px] text-[#A0A0A0] italic text-center py-6">{t("pages.ai_agent.no_analytics_yet")}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {[
                      { text: "Uzcard/Humo kartalarini bog'lash va to'lov xatoliklari", count: 32, priority: "high", color: "red" },
                      { text: "@BotFather orqali API token olish va sozlash bosqichlari", count: 24, priority: "medium", color: "amber" },
                      { text: "Instagram professional akkauntini ulashdagi cheklovlar", count: 19, priority: "medium", color: "amber" },
                      { text: "Referal komissiyalarni yechish va hamkorlik shartlari", count: 12, priority: "low", color: "blue" }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#F9F9F7] rounded-xl border border-[#E8E8E8] flex flex-col gap-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            item.priority === "high" ? "bg-red-50 text-red-600 border border-red-200" :
                            item.priority === "medium" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                            "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}>
                            {item.priority === "high" ? "Yuqori" : item.priority === "medium" ? "O'rta" : "Past"}
                          </span>
                          <span className="text-[10px] font-bold text-[#707070]">
                            {item.count} {t("pages.ai_agent.count_unit")}
                          </span>
                        </div>
                        <p className="text-black font-semibold leading-relaxed text-[10px]">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* List of Messages */}
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#F0F0F0] pb-4">
                <h3 className="text-[13px] font-extrabold text-black">
                  {t("pages.ai_agent.analyzed_logs")}
                </h3>
                
                {/* Search & Filter row */}
                <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
                  <input
                    type="text"
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    placeholder={t("pages.ai_agent.search_placeholder")}
                    className="px-3.5 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black w-full sm:w-[180px]"
                  />
                  <CustomDropdown
                    value={analyticsFilter}
                    onChange={(val) => setAnalyticsFilter(val)}
                    options={[
                      { value: "All", label: t("pages.ai_agent.all_categories") },
                      { value: "billing", label: t("pages.ai_agent.intent_billing") },
                      { value: "support", label: t("pages.ai_agent.intent_support") },
                      { value: "faq", label: t("pages.ai_agent.intent_faq") },
                      { value: "affiliate", label: t("pages.ai_agent.intent_affiliate") },
                      { value: "general", label: t("pages.ai_agent.intent_general") }
                    ]}
                    className="w-full sm:w-[160px]"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-[#E8E8E8] rounded-xl overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-[11px] min-w-[700px]">
                    <thead>
                      <tr className="bg-[#F9F9F7] border-b border-[#E8E8E8] text-black font-bold">
                        <th className="p-3 w-[120px]">Foydalanuvchi</th>
                        <th className="p-3 min-w-[150px] max-w-[280px]">{t("pages.ai_agent.raw_message")}</th>
                        <th className="p-3 min-w-[180px] max-w-[320px]">{t("pages.ai_agent.ai_response_msg")}</th>
                        <th className="p-3 w-[130px]">{t("pages.ai_agent.custdev_tag")}</th>
                        <th className="p-3 w-[90px] text-center">Kayfiyat</th>
                        <th className="p-3 w-[70px] text-center">{t("pages.ai_agent.confidence_level")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = analyzedMessages.filter(m => {
                          const matchesFilter = analyticsFilter === "All" || m.intent === analyticsFilter;
                          const matchesSearch = analyticsSearch.trim() === "" || 
                            m.username.toLowerCase().includes(analyticsSearch.toLowerCase()) ||
                            m.message.toLowerCase().includes(analyticsSearch.toLowerCase());
                          return matchesFilter && matchesSearch;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-[#A0A0A0] italic">
                                Ma&apos;lumot topilmadi.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((m) => (
                          <tr key={m.id} className="border-b border-[#E8E8E8] hover:bg-[#F9F9F7]/30 transition-colors last:border-0">
                            <td className="p-3 font-semibold text-black">
                              @{m.username}
                            </td>
                            <td className="p-3 text-[#595959] max-w-[280px] break-words whitespace-normal leading-relaxed" title={m.message}>
                              {m.message}
                            </td>
                            <td className="p-3 text-[#707070] max-w-[320px] break-words whitespace-normal leading-relaxed" title={m.response}>
                              {m.response}
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border whitespace-nowrap inline-block ${
                                m.intent === "billing" ? "bg-black/5 border-black/10 text-black" :
                                m.intent === "support" ? "bg-blue-50 border-blue-100 text-blue-600" :
                                m.intent === "faq" ? "bg-green-50 border-green-100 text-green-600" :
                                m.intent === "affiliate" ? "bg-purple-50 border-purple-100 text-purple-600" :
                                "bg-gray-50 border-gray-100 text-gray-500"
                              }`}>
                                {t("pages.ai_agent.intent_" + m.intent)}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  m.sentiment === "positive" ? "bg-[#34C759]" : 
                                  m.sentiment === "negative" ? "bg-[#FF3B30]" : 
                                  "bg-[#FFCC00]"
                                }`} />
                                <span className={`text-[10px] font-bold ${
                                  m.sentiment === "positive" ? "text-[#34C759]" : 
                                  m.sentiment === "negative" ? "text-[#FF3B30]" : 
                                  "text-[#B8860B]"
                                }`}>
                                  {t("pages.ai_agent.sentiment_" + m.sentiment)}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-black">
                              {m.confidence}%
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Module */}
        {showAddModuleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] max-w-[400px] w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <h3 className="text-[15px] font-bold text-black">{t("pages.ai_agent.create_new_module_title")}</h3>
              <input
                type="text"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                placeholder={t("pages.ai_agent.module_name_placeholder")}
                className="w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
              />
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowAddModuleModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8D8D8] text-[12px] text-[#595959] hover:bg-[#F9F9F7] transition-all"
                >
                  {t("pages.ai_agent.confirm_modal_cancel_btn")}
                </button>
                <button
                  onClick={handleAddModule}
                  disabled={!newModuleName.trim()}
                  className="px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 disabled:opacity-50 transition-all"
                >
                  {t("common.create")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Lesson */}
        {showAddLessonModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] max-w-[400px] w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <h3 className="text-[15px] font-bold text-black">{t("pages.ai_agent.create_new_lesson_title")}</h3>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-black">{t("pages.ai_agent.related_module_label")}</span>
                <CustomDropdown
                  value={newLessonModuleId}
                  onChange={(val) => setNewLessonModuleId(val)}
                  options={modules.map(m => ({ value: m.id, label: m.title }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-black">{t("pages.ai_agent.lesson_name_label")}</span>
                <input
                  type="text"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  placeholder={t("pages.ai_agent.lesson_name_placeholder")}
                  className="w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowAddLessonModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8D8D8] text-[12px] text-[#595959] hover:bg-[#F9F9F7] transition-all"
                >
                  {t("pages.ai_agent.confirm_modal_cancel_btn")}
                </button>
                <button
                  onClick={handleAddLesson}
                  disabled={!newLessonName.trim() || !newLessonModuleId}
                  className="px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 disabled:opacity-50 transition-all"
                >
                  {t("common.create")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] max-w-[420px] w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="text-[15px] font-bold text-black">{confirmModal.title}</h3>
              </div>
              <p className="text-[12px] text-[#595959] leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-[#D8D8D8] text-[12px] font-bold text-[#595959] hover:bg-[#F9F9F7] transition-all"
                >
                  {t("pages.ai_agent.confirm_modal_cancel_btn")}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 transition-all"
                >
                  {t("pages.ai_agent.confirm_modal_confirm_btn")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Modal */}
        {alertModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] max-w-[420px] w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <h3 className="text-[15px] font-bold text-black">{alertModal.title}</h3>
              </div>
              <p className="text-[12px] text-[#595959] leading-relaxed">
                {alertModal.message}
              </p>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-[#D8D8D8] text-[12px] font-bold text-[#595959] hover:bg-[#F9F9F7] transition-all"
                >
                  {t("pages.ai_agent.alert_modal_close_btn")}
                </button>
                {!isTelegramLinked && alertModal.title.includes("Telegram") && (
                  <Link
                    href="/channels"
                    onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 transition-all"
                  >
                    <span>{t("pages.ai_agent.alert_modal_configure_btn")}</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
