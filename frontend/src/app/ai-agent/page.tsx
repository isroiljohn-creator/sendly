"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
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
  const [selectedAgentType, setSelectedAgentType] = useState<"kurator" | "fb-leads" | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "knowledge">("settings");
  
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

  // Telegram Bot Verification States
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramBotUsername, setTelegramBotUsername] = useState("");

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
      if (savedType === "kurator" || savedType === "fb-leads") {
        setSelectedAgentType(savedType);
      }
    }

    const handleUpdate = () => {
      loadDatabase();
    };
    window.addEventListener("replai-db-update", handleUpdate);
    return () => {
      window.removeEventListener("replai-db-update", handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const loadDatabase = () => {
    const loadedSettings = db.getBotSettings();
    const loadedModules = db.getModules();
    const loadedLessons = db.getLessons();

    setSettings(loadedSettings);
    setModules(loadedModules);
    setLessons(loadedLessons);

    // Check Telegram link status
    const channels = db.getChannels();
    const telegramChannel = channels.find(
      (c) => c.type === "telegram" && c.isConnected && c.telegramToken
    );
    if (telegramChannel) {
      setIsTelegramLinked(true);
      setTelegramBotUsername(telegramChannel.username);
    } else {
      setIsTelegramLinked(false);
      setTelegramBotUsername("");
      // If AI Curator was enabled but bot is missing, disable it
      if (loadedSettings.aiCuratorEnabled) {
        loadedSettings.aiCuratorEnabled = false;
        db.saveBotSettings(loadedSettings);
        setSettings({ ...loadedSettings, aiCuratorEnabled: false });
      }
    }

    // Default to select first lesson if available
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

  // Reset to default demo data
  const handleResetDemo = () => {
    setConfirmModal({
      isOpen: true,
      title: "Namunaviy ma'lumotlarni yuklash",
      message: "Barcha ma'lumotlarni o'chirib, Kurs Yordamchisi namunaviy darslari va AI sozlamalarini qayta yuklashni xohlaysizmi?",
      onConfirm: () => {
        db.resetToDemo();
        loadDatabase();
        setSelectedLesson(null);
        setChatMessages([
          {
            id: `welcome-${Date.now()}`,
            sender: "bot",
            text: "Namunaviy demo ma'lumotlar muvaffaqiyatli yuklandi! ⚡️ Savollaringizni berishingiz mumkin.",
            time: "Hozir",
            confidence: 100
          }
        ]);
        showToast("Demo ma'lumotlar qayta tiklandi");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Save changes to DB
  const handleSaveAll = async () => {
    if (!settings) return;
    try {
      db.saveBotSettings(settings);
      db.saveModules(modules);
      db.saveLessons(lessons);
      
      // Sync client state with local server JSON file db.json
      await db.saveToServer();
      showToast("Barcha o'zgarishlar muvaffaqiyatli saqlandi! 🚀");
    } catch (err) {
      console.error(err);
      showToast("Xatolik yuz berdi", "error");
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

    // Initial steps
    const steps = [
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

      // Step 2: Mapping success, AI starts
      setTimeout(() => {
        setSimSteps(prev =>
          prev.map(s => {
            if (s.id === "step-mapping") return { ...s, status: "success" as const };
            if (s.id === "step-ai") return { ...s, status: "running" as const };
            return s;
          })
        );

        // Step 3: AI analysis done, CRM routing starts
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
            showToast("Lid muvaffaqiyatli simulyatsiya qilindi va saralandi! 🎯");
          }, 800);
        }, 1000);
      }, 800);
    }, 800);
  };

  if (selectedAgentType === null) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-8 relative min-h-[calc(100vh-140px)] pb-12 items-center justify-center max-w-4xl mx-auto py-12">
          {/* Toast Alert */}
          {toast && (
            <div className="fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white shadow-lg animate-in fade-in slide-in-from-top-3 duration-250">
              <CheckCircle className="text-[#9BC92E] w-5 h-5" />
              <span className="text-[13px] font-semibold text-black">{toast.message}</span>
            </div>
          )}

          {/* Header */}
          <div className="text-center flex flex-col gap-3">
            <span className="px-3.5 py-1.5 bg-[#C7F33C]/20 text-[#7CA607] rounded-full text-[11px] font-bold tracking-wider uppercase inline-block mx-auto">
              AI Agent Platformasi
            </span>
            <h1 className="text-[28px] md:text-[34px] font-extrabold text-black tracking-tight leading-tight">
              AI Agent Shablonini Tanlang
            </h1>
            <p className="text-[13px] md:text-[14px] text-[#707070] max-w-lg mx-auto leading-relaxed">
              Biznesingizni avtomatlashtirish uchun mos keladigan sun&apos;iy intellekt agenti shablonlaridan birini ishga tushiring.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
            {/* Card 1: AI Kurator */}
            <div className="bg-white border border-[#E8E8E8] hover:border-black/20 hover:shadow-xl rounded-[28px] p-8 flex flex-col justify-between transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C7F33C]/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-black text-[#C7F33C] grid place-items-center font-bold text-[18px]">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-black group-hover:text-[#7CA607] transition-colors">
                    AI Kurator (Kurs Yordamchisi)
                  </h3>
                  <p className="text-[12px] text-[#707070] mt-2 leading-relaxed">
                    Telegram bot orqali o&apos;quvchilarga darsliklar, transkriptlar va PDF materiallar asosida aqlli, do&apos;stona va aniq javob beruvchi shaxsiy yordamchi (RAG tizimi).
                  </p>
                </div>

                <div className="border-t border-[#F0F0F0] my-2" />

                <ul className="flex flex-col gap-2.5 text-[11px] text-[#595959]">
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>RAG (Bilimlar bazasi) tizimi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>Telegram bot integratsiyasi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>Ohang va hazil darajasini sozlash</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>Inson-kuratorga yo&apos;naltirish qoidalari</span>
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
                className="w-full mt-8 py-3 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Ushbu shablonni sozlash</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 2: Facebook Lead Handler */}
            <div className="bg-white border border-[#E8E8E8] hover:border-black/20 hover:shadow-xl rounded-[28px] p-8 flex flex-col justify-between transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold text-[18px]">
                  <Facebook size={22} />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-black group-hover:text-blue-600 transition-colors">
                    Facebook Lead Handler
                  </h3>
                  <p className="text-[12px] text-[#707070] mt-2 leading-relaxed">
                    Facebook target reklama formalaridan kelgan lid (mijoz) ma&apos;lumotlarini AI yordamida saralab, guruhlarga yo&apos;naltiruvchi va avtomatik salomlashish xabari yuboruvchi agent.
                  </p>
                </div>

                <div className="border-t border-[#F0F0F0] my-2" />

                <ul className="flex flex-col gap-2.5 text-[11px] text-[#595959]">
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>Meta Lead Ads formalari bilan bog&apos;lanish</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>AI orqali mijoz xohishini tahlil qilish</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>Guruhlarga yo&apos;naltirish va taglash</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-55 text-green-600 grid place-items-center font-bold text-[10px]">
                      ✓
                    </div>
                    <span>Avtomatik salomlashish xabarlari</span>
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
                className="w-full mt-8 py-3 rounded-full bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Ushbu shablonni sozlash</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (selectedAgentType === "fb-leads" && settings) {
    const updateFieldMapping = (id: string, key: keyof FieldMapping, value: string) => {
      setFieldMappings(prev =>
        prev.map(m => (m.id === id ? { ...m, [key]: value } : m))
      );
    };

    const removeFieldMapping = (id: string) => {
      setFieldMappings(prev => prev.filter(m => m.id !== id));
      showToast("Maydon mosligi o'chirildi");
    };

    const addFieldMapping = () => {
      const newMap: FieldMapping = {
        id: `map-${Date.now()}`,
        metaField: `meta_field_${fieldMappings.length + 1}`,
        sendlyField: "message",
        description: "Qo'shimcha maydon"
      };
      setFieldMappings(prev => [...prev, newMap]);
      showToast("Yangi maydon mosligi qo'shildi! ➕");
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
      showToast("Teg qo'shildi! 🏷️");
    };

    const removeFbTag = (tagToRemove: string) => {
      setFbTags(prev => prev.filter(t => t !== tagToRemove));
      showToast("Teg o'chirildi");
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
              title="Facebook Lead Handler"
              breadcrumbs="Bosh sahifa / AI Agent / Facebook Leads"
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
                Shablonni almashtirish
              </button>
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold shadow-sm hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Save size={14} />
                <span>Saqlash va faollashtirish</span>
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
                  <h5 className="text-[12px] font-bold text-white leading-tight">Facebook Trigger</h5>
                  <span className="text-[9px] text-[#9BC92E] font-bold uppercase tracking-wider block mt-0.5">Webhook Faol</span>
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
                  <h5 className="text-[12px] font-bold text-white leading-tight">AI Lead Mapper</h5>
                  <span className="text-[9px] text-[#A78BFA] font-bold uppercase tracking-wider block mt-0.5">
                    {fieldMappings.length} ta maydon
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
                    {db.getGroups().find(g => g.id === (settings.targetGroupId || "sales"))?.name || "Guruh"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Settings panel based on activeNode */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
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
                        Facebook Lead Ads forms webhook sozlamalari va kiruvchi kanal
                      </p>
                    </div>
                  </div>

                  {/* Webhook URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black flex items-center justify-between">
                      <span>Webhook URL manzili</span>
                      <span className="text-[9px] text-[#707070] font-normal">Bu URLni Facebook Developer Console-ga yuklang</span>
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
                          showToast("Webhook URL nusxalandi! 📋");
                        }}
                        className="px-3.5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold shrink-0"
                        title="Nusxalash"
                      >
                        <CopyIcon size={14} />
                        <span>Nusxa</span>
                      </button>
                    </div>
                  </div>

                  {/* Verify Token */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black flex items-center justify-between">
                      <span>Verify Token (Access Token)</span>
                      <span className="text-[9px] text-[#707070] font-normal">Meta Webhook &quot;Verify Token&quot; maydoniga yozing</span>
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
                          showToast("Verify Token nusxalandi! 🔑");
                        }}
                        className="px-3.5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold shrink-0"
                        title="Nusxalash"
                      >
                        <CopyIcon size={14} />
                        <span>Nusxa</span>
                      </button>
                    </div>
                  </div>

                  {/* Target Form dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black">Ulanadigan Facebook Target Formasi</label>
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
                        Meta maydonlarini CRM maydonlariga xaritalash va AI yo&apos;riqnomasi
                      </p>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-black">AI Saralash Prompti (System Instruction)</label>
                      <div className="flex items-center gap-1 text-[10px] text-[#707070]">
                        <Info size={12} />
                        <span>Mijoz savoli va intentini tahlil qilish.</span>
                      </div>
                    </div>
                    <textarea
                      value={settings.fbAgentPrompt || ""}
                      onChange={(e) => handleUpdateSettings("fbAgentPrompt", e.target.value)}
                      className="w-full min-h-[140px] p-3 text-[12px] font-mono leading-relaxed bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black resize-y text-black"
                      placeholder="AI mijoz arizasini tahlil qilib, qanday guruhga yo'naltirishini yozing..."
                    />
                  </div>

                  {/* Field Mapping Editor */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[12px] font-bold text-black">Maydonlar Mosligi Sozlamasi (Field Mapping)</h4>
                      <button
                        onClick={addFieldMapping}
                        className="text-[10px] bg-[#C7F33C] hover:bg-[#b5de32] text-black px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                        type="button"
                      >
                        <span>+ Yangi Maydon</span>
                      </button>
                    </div>

                    <div className="border border-[#E8E8E8] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-[#F9F9F7] border-b border-[#E8E8E8] text-black font-bold">
                              <th className="p-2.5">Meta Maydon Kaliti</th>
                              <th className="p-2.5">Sendly CRM Turi</th>
                              <th className="p-2.5">Izoh/Tavsif</th>
                              <th className="p-2.5 text-center w-[60px]">Amal</th>
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
                                    placeholder="Masalan: full_name"
                                  />
                                </td>
                                <td className="p-2">
                                  <CustomDropdown
                                    value={m.sendlyField}
                                    onChange={(val) => updateFieldMapping(m.id, "sendlyField", val)}
                                    options={[
                                      { value: "name", label: "Ism (name)" },
                                      { value: "phone", label: "Telefon (phone)" },
                                      { value: "message", label: "Murojaat (message)" },
                                      { value: "email", label: "Email (email)" },
                                      { value: "company", label: "Kompaniya (company)" }
                                    ]}
                                    className="w-full"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={m.description}
                                    onChange={(e) => updateFieldMapping(m.id, "description", e.target.value)}
                                    className="w-full px-2 py-1.5 border border-[#E8E8E8] rounded-lg bg-white focus:outline-none focus:border-black text-[#595959]"
                                    placeholder="Izoh..."
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => removeFieldMapping(m.id)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                    type="button"
                                    title="Maydonni o'chirish"
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
                        Tahlil qilingan lidlarni CRM guruhlariga yo&apos;naltirish va javob sozlamalari
                      </p>
                    </div>
                  </div>

                  {/* Standard Group Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-black">Yo&apos;naltiriladigan Standart Guruh</label>
                    <CustomDropdown
                      value={settings.targetGroupId || "sales"}
                      onChange={(val) => handleUpdateSettings("targetGroupId", val)}
                      options={db.getGroups().map(g => ({ value: g.id, label: g.name }))}
                    />
                  </div>

                  {/* Welcome Message */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-black">Avtomatik Salomlashish Xabari</label>
                      <span className="text-[9px] text-[#707070] italic">
                        {"{{name}}"} o&apos;rniga mijoz ismi qo&apos;yiladi.
                      </span>
                    </div>
                    <input
                      type="text"
                      value={settings.fbWelcomeMessage || ""}
                      onChange={(e) => handleUpdateSettings("fbWelcomeMessage", e.target.value)}
                      className="w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                      placeholder="Avtomatik yuboriladigan salomlashish xabari..."
                    />
                  </div>

                  {/* Automatic CRM Tags */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-black">Birlashtiriladigan Avtomatik Teglar (Auto-Tags)</label>
                    
                    <form onSubmit={addFbTag} className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Yangi teg yozing va enter bosing..."
                        className="flex-1 px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-black hover:bg-black/90 text-white rounded-xl text-[11px] font-bold transition-all shrink-0"
                      >
                        Qo&apos;shish
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 mt-1 bg-[#F9F9F7] border border-[#E8E8E8] p-3 rounded-xl min-h-[48px]">
                      {fbTags.length === 0 ? (
                        <span className="text-[10px] text-[#A0A0A0] italic">Hozircha teglar yo&apos;q.</span>
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
                    <span>Sandbox Lead Simulator</span>
                  </h4>
                  <span className="text-[10px] text-green-600 flex items-center gap-1 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Sinov rejimi
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
                    Sodda shakl
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimulatorJsonMode(true)}
                    className={`py-1.5 rounded-lg transition-all ${
                      isSimulatorJsonMode ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"
                    }`}
                  >
                    Webhook JSON
                  </button>
                </div>

                <form onSubmit={handleSimulateLead} className="flex flex-col gap-3.5">
                  {!isSimulatorJsonMode ? (
                    <>
                      {/* Simple input fields */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black">Mijoz Ismi</label>
                        <input
                          type="text"
                          value={simLeadName}
                          onChange={(e) => setSimLeadName(e.target.value)}
                          className="px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                          placeholder="Mijoz ismi..."
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black">Mijoz Telefoni</label>
                        <input
                          type="text"
                          value={simLeadPhone}
                          onChange={(e) => setSimLeadPhone(e.target.value)}
                          className="px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black text-black"
                          placeholder="Telefon..."
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black">Mijoz Murojaat Matni</label>
                        <textarea
                          value={simLeadMessage}
                          onChange={(e) => setSimLeadMessage(e.target.value)}
                          className="w-full h-20 px-3 py-2 text-[11px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black resize-none text-black"
                          placeholder="Mijoz savoli yoki arizadagi xabar matni..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Raw Webhook JSON payload text area */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-black">Raw Webhook JSON Payload</label>
                          <span className="text-[9px] text-[#707070]">Meta webhook formati</span>
                        </div>
                        <textarea
                          value={simJsonPayload}
                          onChange={(e) => setSimJsonPayload(e.target.value)}
                          className="w-full h-[220px] p-3 text-[11px] font-mono leading-relaxed bg-[#0A0A0C] text-[#C7F33C] border border-[#1E293B] rounded-xl focus:outline-none focus:border-[#C7F33C]/50 resize-y"
                          placeholder="Webhook JSON ma'lumoti..."
                        />
                        <span className="text-[9px] text-[#909090] leading-relaxed">
                          ⚠️ JSON ichidagi <b>field_data</b> kalitlari chap tomondagi <b>Field Mapping</b> jadvali kalitlariga mos bo&apos;lishi kerak.
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
                        <span>AI Tahlil qilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <PlayIcon size={12} className="fill-white" />
                        <span>Integratsiyani Sinab Ko&apos;rish</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Simulation Step Progress Checklist */}
                {simSteps.length > 0 && (
                  <div className="mt-2 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl flex flex-col gap-3 animate-in fade-in duration-200">
                    <span className="text-[10px] font-bold text-black uppercase tracking-wider">Integratsiya Oqimi Bosqichlari</span>
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
                      <span className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">AI Saralash Natijasi</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded">
                        Muvaffaqiyatli
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-[#707070] block text-[9px]">Yo&apos;naltirilgan Guruh</span>
                        <span className="font-bold text-black">{simResult.groupName}</span>
                      </div>
                      <div>
                        <span className="text-[#707070] block text-[9px]">Biriktirilgan Taglar</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {simResult.tags.map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-semibold rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] border-t border-blue-100/50 pt-2.5">
                      <span className="text-[#707070] block text-[9px]">AI Tahlil Izohi</span>
                      <p className="text-black italic mt-0.5 leading-relaxed">{simResult.summary}</p>
                    </div>

                    <div className="text-[11px] border-t border-blue-100/50 pt-2.5">
                      <span className="text-[#707070] block text-[9px]">Avtomatik Yuborilgan Xabar</span>
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
                  <span>Yaqinda olingan lidlar tarixi</span>
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
                          <span className="text-[#707070] block text-[8px]">Forma</span>
                          <span className="text-black truncate block font-medium max-w-[140px]">{log.formName}</span>
                        </div>
                        <div>
                          <span className="text-[#707070] block text-[8px]">Guruh</span>
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
                          Saralandi
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
            breadcrumbs="Bosh sahifa / AI Agent / Kurator"
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
              Shablonni almashtirish
            </button>
            <button
              onClick={handleResetDemo}
              className="px-4 py-2.5 rounded-full border border-[#D8D8D8] text-[12px] font-bold text-[#595959] hover:bg-white hover:text-black transition-colors"
            >
              Namunaviy ma&apos;lumotlarni yuklash
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-[#C7F33C] text-[12px] font-bold shadow-sm hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Save size={14} />
              <span>Saqlash va faollashtirish</span>
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
            <span>AI Kurator Sozlamalari</span>
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
            <span>Bilim Bazasi (Kurs transkriptlari)</span>
            {activeTab === "knowledge" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
          </button>
        </div>

        {/* Main Workspace */}
        {activeTab === "settings" && settings && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Settings panel */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* AI Agent Status Card */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.aiCuratorEnabled ? "bg-[#C7F33C]/25 text-[#7CA607]" : "bg-gray-100 text-[#707070]"}`}>
                      <Sparkles size={20} className={settings.aiCuratorEnabled ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-black">AI Kurator holati</h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {settings.aiCuratorEnabled 
                          ? "AI Kurator hozirda Telegram bot orqali faol ravishda o'quvchilarga javob bermoqda." 
                          : "AI Kurator o'chirilgan. Savollaringizga Telegram'da avtomatlashtirilgan kalit so'zlar javob beradi."}
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
                {isTelegramLinked ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-[11px] text-green-700">
                    <CheckCircle size={14} className="shrink-0 text-green-500" />
                    <span>Ulangan Telegram bot: <span className="font-bold text-black">{telegramBotUsername}</span></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700">
                    <Info size={14} className="shrink-0 text-amber-500" />
                    <span>Telegram bot ulanmagan. AI Kurator ishlashi uchun avval Telegram botni sozlang.</span>
                  </div>
                )}
              </div>

              {/* System Prompt Settings */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                    Tizimli Ko&apos;rsatma (System Prompt)
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#707070]">
                    <Info size={13} />
                    <span>Darslik konteksti {"{{context}}"} o&apos;rniga keladi.</span>
                  </div>
                </div>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => handleUpdateSettings("systemPrompt", e.target.value)}
                  className="w-full min-h-[220px] p-4 text-[12px] font-mono leading-relaxed bg-[#F9F9F7] border border-[#E8E8E8] rounded-[16px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-y"
                  placeholder="AI agent rolini va javob berish tartibini yozing..."
                />
              </div>

              {/* Sliders (Tone, Length, Humor) */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
                <h3 className="text-[15px] font-bold text-black">
                  AI Kurator Ohangi va Xarakteri
                </h3>

                <div className="flex flex-col gap-5">
                  {/* Tone slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] font-bold text-black">
                      <span>Ohang (Tone)</span>
                      <span className="text-[#707070]">
                        {settings.tone > 75 ? "Rasmiy" : settings.tone < 25 ? "Norasmiy" : "Do'stona"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.tone}
                      onChange={(e) => handleUpdateSettings("tone", parseInt(e.target.value))}
                      className="w-full accent-black h-1 bg-[#F0F0F0] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                      <span>Norasmiy (Do&apos;stona)</span>
                      <span>Rasmiy</span>
                    </div>
                  </div>

                  {/* Length slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] font-bold text-black">
                      <span>Javob uzunligi</span>
                      <span className="text-[#707070]">
                        {settings.length > 75 ? "Batafsil" : settings.length < 25 ? "Londa" : "Me&apos;yorida"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.length}
                      onChange={(e) => handleUpdateSettings("length", parseInt(e.target.value))}
                      className="w-full accent-black h-1 bg-[#F0F0F0] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                      <span>Qisqa (Londa)</span>
                      <span>Batafsil tushuntirish</span>
                    </div>
                  </div>

                  {/* Humor slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] font-bold text-black">
                      <span>Hazil va Emojilar</span>
                      <span className="text-[#707070]">
                        {settings.humor > 75 ? "Ko&apos;p" : settings.humor < 25 ? "Jiddiy" : "Me&apos;yorida"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.humor}
                      onChange={(e) => handleUpdateSettings("humor", parseInt(e.target.value))}
                      className="w-full accent-black h-1 bg-[#F0F0F0] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                      <span>Jiddiy (Akademik)</span>
                      <span>Qiziqarli (Emojilar bilan)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Restricted Topics */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                  <ShieldAlert className="text-red-500 w-4 h-4" />
                  <span>Taqiqlangan mavzular (Forbidden Topics)</span>
                </h3>
                <p className="text-[11px] text-[#707070] leading-relaxed">
                  Ushbu mavzular bo&apos;yicha savol berilganda, bot avtomatik ravishda dars doirasidan chiqmaslikni so&apos;raydi.
                </p>

                <form onSubmit={handleAddTopic} className="flex gap-2">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Masalan: Bitcoin, Siyosat, Narx-navo..."
                    className="flex-1 px-4 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-black text-white hover:bg-black/90 text-[12px] font-bold transition-all"
                  >
                    Qo&apos;shish
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
                    <span className="text-[11px] text-[#A0A0A0] italic">Hozircha taqiqlangan mavzular belgilanmagan.</span>
                  )}
                </div>
              </div>

              {/* Escalation Rules */}
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                  <ArrowRight className="text-blue-500 w-4 h-4" />
                  <span>Inson-kuratorga yo&apos;naltirish qoidalari (Escalation)</span>
                </h3>
                <p className="text-[11px] text-[#707070]">
                  Ushbu shartlar yuzaga kelganda bot liveTakeover bayrog&apos;ini faollashtiradi va kuratorni ogohlantiradi.
                </p>

                <form onSubmit={handleAddRule} className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="Masalan: Kurs to'lovi haqida so'raganda..."
                    className="flex-1 px-4 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-black text-white hover:bg-black/90 text-[12px] font-bold transition-all"
                  >
                    Qo&apos;shish
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
                        title="O'chirish"
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
                      Faol aloqa (Auto outreach)
                    </h3>
                    <p className="text-[11px] text-[#707070] mt-1">
                      O&apos;quvchi darsda qolib ketganda bot birinchi bo&apos;lib yordam taklif qilish xabarini yozadi.
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
                      <span className="text-[11px] font-bold text-black">Aloqa vaqti (Boshlanishi)</span>
                      <input
                        type="time"
                        value={settings.outreachStart}
                        onChange={(e) => handleUpdateSettings("outreachStart", e.target.value)}
                        className="px-3 py-2 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-black">Aloqa vaqti (Tugashi)</span>
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
            </div>

            {/* Right Side: Sandbox Preview chat simulator */}
            <div className="lg:col-span-5 sticky top-28 bg-[#F9F9F7] border border-[#E8E8E8] rounded-[28px] overflow-hidden flex flex-col h-[calc(100vh-140px)] shadow-inner">
              {/* Header */}
              <div className="bg-white border-b border-[#E8E8E8] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black text-[#C7F33C] grid place-items-center font-bold text-[14px]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-black">AI Kurator Sandbox</h4>
                    <span className="text-[10px] text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Faol sinov rejimi
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setChatMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      sender: "bot",
                      text: "Suhbat tarixi tozalandi. Sinov uchun yangi savollarni yozing! 📚",
                      time: "Hozir",
                      confidence: 100
                    }
                  ])}
                  className="text-[10px] text-[#707070] hover:text-black font-semibold"
                >
                  Tozalash
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
                            <p className="font-bold">Moderatsiya to&apos;sig&apos;i</p>
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
                              Ishonch: {msg.confidence}%
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
                              Manba: {src}
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
                  placeholder="O'quvchi savolini yozing..."
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
        )}

        {/* Bilim Bazasi Workspace */}
        {activeTab === "knowledge" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Side: Tree navigation of modules/lessons */}
            <div className="md:col-span-5 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F0F0F0]">
                <h3 className="text-[14px] font-bold text-black">Modullar va Darslar</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAddModuleModal(true)}
                    className="p-1.5 text-black hover:bg-[#F9F9F7] rounded-lg transition-all"
                    title="Yangi modul yaratish"
                  >
                    <FolderPlus size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (modules.length === 0) {
                        setAlertModal({
                          isOpen: true,
                          title: "Modul mavjud emas",
                          message: "Dars yaratish uchun avval kamida bitta modul yaratishingiz kerak.",
                        });
                        return;
                      }
                      setNewLessonModuleId(modules[0].id);
                      setShowAddLessonModal(true);
                    }}
                    className="p-1.5 text-black hover:bg-[#F9F9F7] rounded-lg transition-all"
                    title="Yangi dars yaratish"
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
                            {modLessons.length} dars
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
                            <p className="text-[10px] text-[#A0A0A0] italic p-2">Darslar mavjud emas.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {modules.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[11px] text-[#707070] italic">Modullar mavjud emas.</p>
                    <button
                      onClick={() => setShowAddModuleModal(true)}
                      className="text-[11px] font-bold text-black underline mt-2"
                    >
                      Birinchi modulni yarating
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
                      {modules.find((m) => m.id === selectedLesson.moduleId)?.title || "Modul"}
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
                        Dars Transkripti (Matnli darslik)
                      </label>
                      <span className="text-[10px] text-[#707070]">
                        {selectedLesson.transcript?.length || 0} ta belgi
                      </span>
                    </div>
                    <textarea
                      value={selectedLesson.transcript || ""}
                      onChange={(e) => handleUpdateSelectedLesson("transcript", e.target.value)}
                      className="w-full flex-1 min-h-[300px] p-4 text-[12px] leading-relaxed bg-[#F9F9F7] border border-[#E8E8E8] rounded-[16px] focus:outline-none focus:border-black resize-y"
                      placeholder="Ushbu darsning audio/video yozuvi transkriptini yoki darslik matnini bu yerga joylashtiring. AI shu matnlar asosida RAG orqali javob beradi..."
                    />
                  </div>

                  {/* Materials upload Mock */}
                  <div className="border-t border-[#F0F0F0] pt-4 mt-2">
                    <label className="text-[12px] font-bold text-black block mb-2">
                      Foydali materiallar (PDF, Ko&apos;rsatmalar)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex flex-wrap gap-2">
                        {selectedLesson.pdfMaterials?.map((pdf, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-xl bg-[#F9F9F7] border border-[#E8E8E8] text-[11px] text-[#595959]"
                          >
                            📄 {pdf}
                          </span>
                        )) || <span className="text-[11px] text-[#A0A0A0] italic">Yuklangan materiallar yo&apos;q</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const mockName = prompt("Material nomini yozing:");
                          if (mockName) {
                            const currentPdfs = selectedLesson.pdfMaterials || [];
                            handleUpdateSelectedLesson("pdfMaterials", [...currentPdfs, mockName + ".pdf"]);
                            showToast("Material muvaffaqiyatli qo'shildi (mock)");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-[#D8D8D8] rounded-xl hover:bg-[#F9F9F7] text-[11px] font-semibold text-[#595959] transition-all"
                      >
                        <Upload size={12} />
                        <span>Fayl yuklash</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <BookOpen size={48} className="text-[#A0A0A0] mb-4" />
                  <h4 className="text-[14px] font-bold text-black">Darslik tanlanmagan</h4>
                  <p className="text-[11px] text-[#707070] mt-1 max-w-[280px]">
                    Chap tomondagi ro&apos;yxatdan darsni tanlang yoki bilim bazasini to&apos;ldirish uchun yangi modul/dars yarating.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Module */}
        {showAddModuleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] max-w-[400px] w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <h3 className="text-[15px] font-bold text-black">Yangi Modul Yaratish</h3>
              <input
                type="text"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                placeholder="Modul nomi (masalan: 5-Modul. Tahlillar)"
                className="w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
              />
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowAddModuleModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8D8D8] text-[12px] text-[#595959] hover:bg-[#F9F9F7] transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleAddModule}
                  disabled={!newModuleName.trim()}
                  className="px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 disabled:opacity-50 transition-all"
                >
                  Yaratish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Lesson */}
        {showAddLessonModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] max-w-[400px] w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <h3 className="text-[15px] font-bold text-black">Yangi Dars Yaratish</h3>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-black">Tegishli Modul</span>
                <CustomDropdown
                  value={newLessonModuleId}
                  onChange={(val) => setNewLessonModuleId(val)}
                  options={modules.map(m => ({ value: m.id, label: m.title }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-black">Dars Nomi</span>
                <input
                  type="text"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  placeholder="Dars nomi (masalan: 3-Dars. Funnel sozlash)"
                  className="w-full px-4 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowAddLessonModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8D8D8] text-[12px] text-[#595959] hover:bg-[#F9F9F7] transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleAddLesson}
                  disabled={!newLessonName.trim() || !newLessonModuleId}
                  className="px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 disabled:opacity-50 transition-all"
                >
                  Yaratish
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
                  Bekor qilish
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 transition-all"
                >
                  Tasdiqlash
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
                  Tushunarli
                </button>
                {!isTelegramLinked && alertModal.title.includes("Telegram") && (
                  <Link
                    href="/channels"
                    onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-[#C7F33C] text-[12px] font-bold hover:bg-black/90 transition-all"
                  >
                    <span>Sozlash</span>
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
