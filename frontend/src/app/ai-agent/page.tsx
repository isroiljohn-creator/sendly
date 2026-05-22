"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

interface SimulatedMessage {
  id: string;
  sender: "user" | "bot" | "warning";
  text: string;
  time: string;
  confidence?: number;
  sources?: string[];
}

export default function AIAgentPage() {
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

  // Sync state from local storage / db
  useEffect(() => {
    loadDatabase();
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

  // Reset to default demo data
  const handleResetDemo = () => {
    if (window.confirm("Barcha ma'lumotlarni o'chirib, Kurs Yordamchisi namunaviy darslari va AI sozlamalarini qayta yuklashni xohlaysizmi?")) {
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
    }
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
    if (window.confirm("Ushbu modul va uning ichidagi barcha darslarni o'chirishni tasdiqlaysizmi?")) {
      db.deleteModule(moduleId);
      setModules(db.getModules());
      const remainingLessons = db.getLessons();
      setLessons(remainingLessons);
      if (selectedLesson && selectedLesson.moduleId === moduleId) {
        setSelectedLesson(remainingLessons[0] || null);
      }
      showToast("Modul o'chirildi");
    }
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
    if (window.confirm("Ushbu darsni o'chirishni tasdiqlaysizmi?")) {
      db.deleteLesson(lessonId);
      const updatedLessons = db.getLessons();
      setLessons(updatedLessons);
      if (selectedLesson && selectedLesson.id === lessonId) {
        setSelectedLesson(updatedLessons[0] || null);
      }
      showToast("Dars o'chirildi");
    }
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
            breadcrumbs="Bosh sahifa / AI Agent"
          />
          <div className="flex items-center gap-3 shrink-0">
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
                        alert("Avval modul yarating!");
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
                <select
                  value={newLessonModuleId}
                  onChange={(e) => setNewLessonModuleId(e.target.value)}
                  className="w-full px-3 py-2.5 text-[12px] bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl focus:outline-none focus:border-black"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
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
      </div>
    </AppLayout>
  );
}
