"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  X,
  MessageCircle,
  MessageSquare,
  HelpCircle,
  User,
  Phone,
  Video,
  Smile
} from "lucide-react";
import { db, Channel, Automation } from "@/lib/db";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

export default function QuickBotWizardPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // STEP 1 FIELDS
  const [checkSubscription, setCheckSubscription] = useState(true);
  const [triggerDirect, setTriggerDirect] = useState(true);
  const [triggerComment, setTriggerComment] = useState(false);
  
  const [directTriggerType, setDirectTriggerType] = useState<"any" | "keyword">("keyword");
  const [commentTriggerType, setCommentTriggerType] = useState<"any" | "keyword">("keyword");
  
  const [keywordsInput, setKeywordsInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["test"]);
  const [exactMatch, setExactMatch] = useState(false);
  
  const [commentPostsType, setCommentPostsType] = useState<"all" | "selected">("all");

  // Telegram Obuna tekshirish kanal selection
  const [selectedTgSubChannel, setSelectedTgSubChannel] = useState("Sincerelyabror_bot");

  // STEP 2 FIELDS (Message Settings)
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Salom 👋 Chat-bot'larni sozlash darsini olishni xohlaysizmi? @isroil.ai akkauntiga obuna bo'ling va tugmani bosing"
  );
  const [welcomeButton, setWelcomeButton] = useState("Olish");
  
  const [noSubMessage, setNoSubMessage] = useState(
    "Obunani ko'rmayapman 😔 Darslarni olish uchun obuna bo'ling"
  );
  const [noSubButton, setNoSubButton] = useState("✅ Tugallandi");
  
  const [successMessage, setSuccessMessage] = useState(
    "Zo'r! Quyidagi tugmani bosing va darslarni tomosha qilishni boshlang 👇"
  );
  const [successButtonText, setSuccessButtonText] = useState("🔻 Darslarni ko'rish");
  const [successButtonUrl, setSuccessButtonUrl] = useState("https://chatplace.io");

  // STEP 3 FIELDS (Additional Settings)
  const [autoCommentReplies, setAutoCommentReplies] = useState(true);
  const [commentReplies, setCommentReplies] = useState<string[]>([
    "Barcha ma'lumotlar tepadagi xabarda 😊",
    "Yuborilgan ✅",
    "Endi xabarlarni ko'rib chiqing 👌",
    "Zo'r! PM-ingizni tekshiring - hammasi shu yerda! ✉️",
    "Javob yuborildi, PM-da qidiring! 🚀"
  ]);
  const [newCommentReply, setNewCommentReply] = useState("");
  const [remindLinkClick, setRemindLinkClick] = useState(false);
  const [additionalMessageToggle, setAdditionalMessageToggle] = useState(false);

  // Phone Preview Tabs
  const [previewTab, setPreviewTab] = useState<"xabar" | "izoh">("izoh");

  useEffect(() => {
    const chs = db.getChannels();
    setChannels(chs);
    if (chs.length > 0) {
      const activeCh = db.getActiveChannel() || chs[0];
      setSelectedChannel(activeCh);
    }
  }, []);

  // Sync preview tab with channel type and triggers selected
  useEffect(() => {
    if (selectedChannel?.type === "telegram") {
      setPreviewTab("xabar");
      setTriggerDirect(true);
      setTriggerComment(false);
    } else {
      if (triggerDirect && !triggerComment) {
        setPreviewTab("xabar");
      } else if (triggerComment && !triggerDirect) {
        setPreviewTab("izoh");
      }
    }
  }, [selectedChannel, triggerDirect, triggerComment]);

  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = keywordsInput.trim().toLowerCase().replace(/,/g, "");
      if (val && !keywords.includes(val)) {
        setKeywords([...keywords, val]);
        setKeywordsInput("");
      }
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };


  const handleRemoveCommentReply = (index: number) => {
    setCommentReplies(commentReplies.filter((_, i) => i !== index));
  };

  const handleCreateBot = () => {
    if (!selectedChannel) {
      alert("Iltimos, avval akkauntni tanlang.");
      return;
    }
    
    // Save to channel's automations
    const autos = db.getChannelAutomations(selectedChannel.id);
    
    const triggerDetails = selectedChannel.type === "telegram"
      ? (directTriggerType === "any" ? "/start" : keywords.join(", "))
      : (triggerDirect 
        ? (directTriggerType === "any" ? "Har qanday xabar" : keywords.join(", "))
        : (commentTriggerType === "any" ? "Har qanday izoh" : keywords.join(", ")));

    const name = selectedChannel.type === "telegram"
      ? `Tezkor Telegram Bot: ${directTriggerType === "any" ? "/start" : (keywords[0] || "direct")}`
      : (triggerDirect 
        ? `Tezkor DM Bot: ${keywords[0] || "direct"}`
        : `Tezkor Izoh Bot: ${keywords[0] || "izoh"}`);

    const newAuto: Automation = {
      id: `quick_${Date.now()}`,
      name: name,
      triggerType: "keyword",
      triggerDetails: triggerDetails,
      runs: "0",
      completion: "0%",
      active: true,
      replyText: welcomeMessage,
    };

    autos.push(newAuto);
    db.saveChannelAutomations(selectedChannel.id, autos);
    
    // Redirect to automations dashboard
    window.location.href = "/automations?success=created";
  };

  const dropdownOptions = channels.map(c => ({
    value: c.id,
    label: `@${c.username.replace(/^@+/, "")}`,
    icon: c.avatar ? (
      <img src={c.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
    ) : (
      <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[10px] font-bold">
        {c.name.charAt(0).toUpperCase()}
      </div>
    )
  }));

  const activeChannelId = selectedChannel?.id || "";

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col font-sans text-black">
      {/* Header bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#E8E8E8] bg-white">
        <Link href="/automations" className="flex items-center gap-2 text-[13px] text-[#707070] hover:text-black font-semibold transition-colors">
          <ArrowLeft size={16} />
          <span>Chiqish</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#707070]">
            {step}-qadam 3-qadamdan
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-8 gap-8 items-stretch">
        
        {/* Left Side: Wizard Settings */}
        <div className="flex-1 bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold text-black tracking-tight mb-6">
              Kalit so&apos;zli chat-bot
            </h1>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                
                {/* Akkaunt tanlash */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                    Akkauntni tanlash
                  </label>
                  {channels.length > 0 ? (
                    <CustomDropdown
                      value={activeChannelId}
                      onChange={(val) => {
                        const ch = channels.find(c => c.id === val);
                        if (ch) setSelectedChannel(ch);
                      }}
                      options={dropdownOptions}
                      className="w-full max-w-md"
                    />
                  ) : (
                    <div className="text-[12px] text-red-500 font-semibold bg-red-50 p-3.5 rounded-xl border border-red-100">
                      Ulagan kanallaringiz mavjud emas. Iltimos, sozlamalar bo&apos;limiga o&apos;ting.
                    </div>
                  )}
                </div>

                {/* Obunani tekshirish (Instagram vs Telegram) */}
                <div className="flex flex-col gap-3 p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl max-w-md shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-black">
                        {selectedChannel?.type === "telegram" ? "Telegram kanaliga obunani tekshiring" : "Obunani tekshirish"}
                      </h3>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        Chat-bot akkauntga obuna bo&apos;lishni tekshiradi
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={checkSubscription}
                        onChange={(e) => setCheckSubscription(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
                    </label>
                  </div>

                  {/* Telegram Channel Selector Dropdown */}
                  {selectedChannel?.type === "telegram" && checkSubscription && (
                    <div className="flex flex-col gap-1.5 border-t border-[#E8E8E8] pt-3 animate-in slide-in-from-top-1 duration-150">
                      <label className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">Kanal tanlang</label>
                      <div className="relative">
                        <select
                          value={selectedTgSubChannel}
                          onChange={(e) => setSelectedTgSubChannel(e.target.value)}
                          className="w-full text-[12px] font-bold bg-white border border-[#E8E8E8] focus:border-black rounded-xl p-2.5 outline-none appearance-none cursor-pointer pr-8 text-black"
                        >
                          <option value="Sincerelyabror_bot">Sincerelyabror_bot</option>
                          <option value="abror_channel">Abror Ahmedov Kanal</option>
                          <option value="marketing_uz">Marketing Darslari Uz</option>
                        </select>
                        <span className="absolute right-3.5 top-3.5 text-[#707070] pointer-events-none text-[8px]">▼</span>
                      </div>
                      <p className="text-[10px] text-[#707070] mt-1 leading-relaxed font-medium">
                        Agar kanal ro&apos;yxatda bo&apos;lmasa, <a href="/settings" className="text-black hover:underline font-bold">bot qo&apos;shish</a> ushbu Telegram kanalining administratori sifatida yoki <span className="text-black hover:underline font-bold cursor-pointer">ro&apos;yxatni yangilash</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Ishga tushirish shartlari */}
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="text-[13px] font-extrabold text-black">Ishga tushirish shartlari</h3>
                    <p className="text-[11px] text-[#707070] mt-0.5">
                      Qaysi harakat chat-bot&apos;ni ishga tushiradi?
                    </p>
                  </div>

                  {selectedChannel?.type === "telegram" ? (
                    /* Telegram Triggers Radio Options */
                    <div className="flex flex-col gap-3 max-w-md">
                      <label 
                        className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${directTriggerType === "any" ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                        onClick={() => {
                          setDirectTriggerType("any");
                          setTriggerDirect(true);
                          setTriggerComment(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <MessageCircle size={18} className="text-black" />
                          <span className="text-[13px]">Bot&apos;ni ishga tushirish (buyruq/start)</span>
                        </div>
                        <input 
                          type="radio" 
                          name="telegram_trigger" 
                          checked={directTriggerType === "any"} 
                          readOnly 
                          className="h-4 w-4 text-black border-[#D8D8D8] focus:ring-black" 
                        />
                      </label>

                      <label 
                        className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${directTriggerType === "keyword" ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                        onClick={() => {
                          setDirectTriggerType("keyword");
                          setTriggerDirect(true);
                          setTriggerComment(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare size={18} className="text-black" />
                          <span className="text-[13px]">Kalit so&apos;z bilan xabar</span>
                        </div>
                        <input 
                          type="radio" 
                          name="telegram_trigger" 
                          checked={directTriggerType === "keyword"} 
                          readOnly 
                          className="h-4 w-4 text-black border-[#D8D8D8] focus:ring-black" 
                        />
                      </label>

                      {/* Telegram Keywords Input */}
                      {directTriggerType === "keyword" && (
                        <div className="flex flex-col gap-2 max-w-md mt-1 animate-in slide-in-from-top-2 duration-150">
                          <div className="border border-[#D8D8D8] bg-white rounded-xl p-2.5 flex flex-wrap gap-1.5 focus-within:border-black transition-colors min-h-[46px] items-center">
                            {keywords.map((kw, i) => (
                              <span key={i} className="inline-flex items-center gap-1 bg-[#F0F0F0] text-black font-bold text-[10px] px-2.5 py-1 rounded-lg">
                                <span>{kw}</span>
                                <button onClick={() => handleRemoveKeyword(i)} className="text-[#707070] hover:text-black shrink-0">
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                            <input 
                              type="text" 
                              value={keywordsInput}
                              onChange={(e) => setKeywordsInput(e.target.value)}
                              onKeyDown={handleAddKeyword}
                              placeholder="Masalan: kirish, xohish, narx"
                              className="flex-1 min-w-[120px] text-[12px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0.5 text-black"
                            />
                          </div>
                          <p className="text-[9px] text-[#707070] font-semibold mt-0.5">
                            Kalit so&apos;zlarni ajratish uchun &apos;Enter&apos; yoki vergulni bosing
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Instagram Triggers Checkbox Options */
                    <div className="flex flex-col gap-3 max-w-md">
                      {/* Trigger Direct */}
                      <div 
                        className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${triggerDirect ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                        onClick={() => {
                          setTriggerDirect(!triggerDirect);
                          if (!triggerDirect) setTriggerComment(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <MessageCircle size={18} className="text-black" />
                          <span className="text-[13px]">Direkt&apos;ga Xabar</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={triggerDirect} 
                          readOnly 
                          className="rounded border-[#D8D8D8] text-black focus:ring-black h-4 w-4" 
                        />
                      </div>

                      {/* Trigger Comment */}
                      <div 
                        className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${triggerComment ? "border-black bg-[#C7F33C]/10 font-semibold text-black" : "border-[#E8E8E8] hover:border-black/20"}`}
                        onClick={() => {
                          setTriggerComment(!triggerComment);
                          if (!triggerComment) setTriggerDirect(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare size={18} className="text-black" />
                          <span className="text-[13px]">Reels yoki postga izoh</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={triggerComment} 
                          readOnly 
                          className="rounded border-[#D8D8D8] text-black focus:ring-black h-4 w-4" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Instagram Direct sub-triggers */}
                {selectedChannel?.type !== "telegram" && triggerDirect && (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer">
                        <input 
                          type="radio" 
                          name="direct_trigger" 
                          checked={directTriggerType === "any"} 
                          onChange={() => setDirectTriggerType("any")}
                          className="h-4 w-4 text-black border-[#D8D8D8] focus:ring-black"
                        />
                        <span>Har qanday xabar</span>
                      </label>
                      <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer">
                        <input 
                          type="radio" 
                          name="direct_trigger" 
                          checked={directTriggerType === "keyword"} 
                          onChange={() => setDirectTriggerType("keyword")}
                          className="h-4 w-4 text-black border-[#D8D8D8] focus:ring-black"
                        />
                        <span>Kalit so&apos;z bilan xabar</span>
                      </label>
                    </div>

                    {directTriggerType === "keyword" && (
                      <div className="flex flex-col gap-2 max-w-md animate-in slide-in-from-top-2 duration-150">
                        {/* Keyword tags */}
                        <div className="border border-[#D8D8D8] bg-white rounded-xl p-2.5 flex flex-wrap gap-1.5 focus-within:border-black transition-colors min-h-[46px] items-center">
                          {keywords.map((kw, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-[#F0F0F0] text-black font-bold text-[10px] px-2.5 py-1 rounded-lg">
                              <span>{kw}</span>
                              <button onClick={() => handleRemoveKeyword(i)} className="text-[#707070] hover:text-black shrink-0">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            value={keywordsInput}
                            onChange={(e) => setKeywordsInput(e.target.value)}
                            onKeyDown={handleAddKeyword}
                            placeholder="Masalan: kirish, xohish, narx"
                            className="flex-1 min-w-[120px] text-[12px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0.5 text-black"
                          />
                        </div>
                        <p className="text-[9px] text-[#707070] font-semibold mt-0.5">
                          Kalit so&apos;zlarni ajratish uchun &apos;Enter&apos; yoki vergulni bosing
                        </p>

                        {/* Exact match checkbox */}
                        <label className="flex items-center gap-2 mt-1 text-[11px] text-[#505050] font-semibold cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={exactMatch} 
                            onChange={(e) => setExactMatch(e.target.checked)}
                            className="rounded border-[#D8D8D8] text-black focus:ring-black h-3.5 w-3.5" 
                          />
                          <span>Aniq moslik</span>
                          <span title="Aniq mos kelganda chatbot ishga tushadi"><HelpCircle size={12} className="text-[#A0A0A0]" /></span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Instagram comment sub-triggers */}
                {selectedChannel?.type !== "telegram" && triggerComment && (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer">
                        <input 
                          type="radio" 
                          name="comment_trigger" 
                          checked={commentTriggerType === "any"} 
                          onChange={() => setCommentTriggerType("any")}
                          className="h-4 w-4 text-black border-[#D8D8D8] focus:ring-black"
                        />
                        <span>Har qanday izoh</span>
                      </label>
                      <label className="flex items-center gap-2 text-[12px] text-black font-semibold cursor-pointer">
                        <input 
                          type="radio" 
                          name="comment_trigger" 
                          checked={commentTriggerType === "keyword"} 
                          onChange={() => setCommentTriggerType("keyword")}
                          className="h-4 w-4 text-black border-[#D8D8D8] focus:ring-black"
                        />
                        <span>Kalit so&apos;z bilan izoh</span>
                      </label>
                    </div>

                    {commentTriggerType === "keyword" && (
                      <div className="flex flex-col gap-2 max-w-md animate-in slide-in-from-top-2 duration-150">
                        {/* Keyword tags */}
                        <div className="border border-[#D8D8D8] bg-white rounded-xl p-2.5 flex flex-wrap gap-1.5 focus-within:border-black transition-colors min-h-[46px] items-center">
                          {keywords.map((kw, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-[#F0F0F0] text-black font-bold text-[10px] px-2.5 py-1 rounded-lg">
                              <span>{kw}</span>
                              <button onClick={() => handleRemoveKeyword(i)} className="text-[#707070] hover:text-black shrink-0">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            value={keywordsInput}
                            onChange={(e) => setKeywordsInput(e.target.value)}
                            onKeyDown={handleAddKeyword}
                            placeholder="Masalan: test, bonus, dars"
                            className="flex-1 min-w-[120px] text-[12px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0.5 text-black"
                          />
                        </div>
                        <p className="text-[9px] text-[#707070] font-semibold mt-0.5">
                          Kalit so&apos;zlarni ajratish uchun &apos;Enter&apos; yoki vergulni bosing
                        </p>

                        {/* Exact match checkbox */}
                        <label className="flex items-center gap-2 mt-1 text-[11px] text-[#505050] font-semibold cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={exactMatch} 
                            onChange={(e) => setExactMatch(e.target.checked)}
                            className="rounded border-[#D8D8D8] text-black focus:ring-black h-3.5 w-3.5" 
                          />
                          <span>Aniq moslik</span>
                          <span title="Izoh kalit so'zga aniq mos tushgandagina bot javob yozadi"><HelpCircle size={12} className="text-[#A0A0A0]" /></span>
                        </label>

                        {/* Publications options */}
                        <div className="flex border border-[#E8E8E8] rounded-xl p-1 bg-[#F9F9F7] mt-2 self-start">
                          <button
                            type="button"
                            onClick={() => setCommentPostsType("all")}
                            className={`px-4 py-1 rounded-lg text-[11px] font-bold transition-all ${commentPostsType === "all" ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"}`}
                          >
                            Barcha publikatsiyalar
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommentPostsType("selected")}
                            className={`px-4 py-1 rounded-lg text-[11px] font-bold transition-all ${commentPostsType === "selected" ? "bg-white text-black shadow-sm" : "text-[#707070] hover:text-black"}`}
                          >
                            Tanlangan
                          </button>
                        </div>
                        <div className="p-3 bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl text-[10px] text-[#707070] leading-relaxed mt-2 text-center font-medium">
                          Avtomatlashtirish barcha postlar ostidagi izohlarni kuzatib boradi
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="border-b border-[#F0F0F0] pb-2">
                  <h2 className="text-[15px] font-extrabold text-black">Xabar sozlamalari</h2>
                </div>

                {/* Salomlashuv xabari */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                      Salomlashuv xabari
                    </label>
                    <button type="button" className="text-[11px] font-extrabold text-[#16A34A] hover:underline flex items-center gap-1">
                      <Plus size={12} /> + Tasvir
                    </button>
                  </div>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value.substring(0, 500))}
                    className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-[#F9F9F7] border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px]">
                    <span>Maksimal 500 ta belgi</span>
                    <span>{welcomeMessage.length} / 500</span>
                  </div>

                  <input
                    type="text"
                    value={welcomeButton}
                    onChange={(e) => setWelcomeButton(e.target.value)}
                    placeholder="Tugma matni (masalan: Olish)"
                    className="w-full max-w-xs px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                  />
                </div>

                {/* Conditional fields if check subscription is active */}
                {checkSubscription && (
                  <>
                    {/* Agar obuna bo'lmasa */}
                    <div className="flex flex-col gap-1.5 border-t border-[#F0F0F0] pt-3">
                      <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                        Agar obuna bo&apos;lmasa
                      </label>
                      <textarea
                        value={noSubMessage}
                        onChange={(e) => setNoSubMessage(e.target.value.substring(0, 500))}
                        className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-[#F9F9F7] border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                        maxLength={500}
                      />
                      <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px]">
                        <span>{noSubMessage.length} / 500</span>
                      </div>

                      <input
                        type="text"
                        value={noSubButton}
                        onChange={(e) => setNoSubButton(e.target.value)}
                        placeholder="Tugma matni (masalan: ✅ Tugallandi)"
                        className="w-full max-w-xs px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                      />
                    </div>

                    {/* Obuna bo'lgandan so'ng */}
                    <div className="flex flex-col gap-1.5 border-t border-[#F0F0F0] pt-3">
                      <label className="text-[11px] font-extrabold text-[#707070] uppercase tracking-wider">
                        Obuna bo&apos;lgandan so&apos;ng
                      </label>
                      <textarea
                        value={successMessage}
                        onChange={(e) => setSuccessMessage(e.target.value.substring(0, 500))}
                        className="w-full h-16 min-h-[52px] p-2.5 text-[12px] bg-[#F9F9F7] border border-[#D8D8D8] focus:border-black rounded-xl focus:outline-none resize-none font-medium leading-relaxed text-black"
                        maxLength={500}
                      />
                      <div className="flex justify-between text-[10px] text-[#707070] font-semibold mt-[-3px]">
                        <span>{successMessage.length} / 500</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={successButtonText}
                          onChange={(e) => setSuccessButtonText(e.target.value)}
                          placeholder="Tugma matni"
                          className="px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                        />
                        <input
                          type="text"
                          value={successButtonUrl}
                          onChange={(e) => setSuccessButtonUrl(e.target.value)}
                          placeholder="Tugma havolasi (URL)"
                          className="px-3 py-2 text-[12px] bg-white border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-mono font-medium text-black"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="border-b border-[#F0F0F0] pb-2">
                  <h2 className="text-[15px] font-extrabold text-black">Qo&apos;shimcha sozlamalar</h2>
                </div>

                {/* Izohlarga avtomatik javoblar (Only for Instagram!) */}
                {selectedChannel?.type !== "telegram" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold text-black">Izohlarga avtomatik javoblar</h3>
                        <p className="text-[11px] text-[#707070] mt-0.5">
                          Ularni tasodifiy tartibda ishlatamiz
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={autoCommentReplies}
                          onChange={(e) => setAutoCommentReplies(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
                      </label>
                    </div>

                    {autoCommentReplies && (
                      <div className="flex flex-col gap-2.5 max-w-md animate-in slide-in-from-top-2 duration-150">
                        {commentReplies.map((reply, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={reply}
                              onChange={(e) => {
                                const newReplies = [...commentReplies];
                                newReplies[idx] = e.target.value;
                                setCommentReplies(newReplies);
                              }}
                              className="flex-1 px-3 py-1.5 text-[12px] bg-[#F9F9F7] border border-[#D8D8D8] rounded-xl focus:outline-none focus:border-black font-semibold text-black"
                            />
                            <button 
                              onClick={() => handleRemoveCommentReply(idx)}
                              className="h-8 w-8 rounded-full bg-[#F5F5F5] hover:bg-red-50 text-[#707070] hover:text-red-500 flex items-center justify-center transition-colors shrink-0"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}

                        {commentReplies.length < 10 && (
                          <button
                            type="button"
                            onClick={() => setCommentReplies([...commentReplies, ""])}
                            className="w-full py-2 border border-dashed border-[#D8D8D8] hover:border-black rounded-xl text-[12px] font-bold text-black flex items-center justify-center gap-1.5 transition-all bg-white active:scale-95 mt-1"
                          >
                            <Plus size={14} />
                            <span>Avtomatik javob qo&apos;shish</span>
                          </button>
                        )}
                        
                        <div className="p-3 bg-[#F9F9F7] border border-[#E8E8E8] rounded-xl text-[10px] text-[#707070] leading-normal flex items-start gap-1.5 mt-1">
                          <span className="text-[#10B981] font-bold">✓</span>
                          <span>Post yoki Reels ostida izoh qoldirgan mijozga ushbu javoblardan biri tasodifiy ravishda yuboriladi va unga shaxsiy xabar ham jo&apos;natiladi.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Havolaga o'tishni eslatib qo'ying */}
                <div className="flex items-center justify-between p-3.5 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl max-w-md shadow-inner mt-2">
                  <div>
                    <h3 className="text-[13px] font-bold text-black">Havolaga o&apos;tishni eslatib qo&apos;ying</h3>
                    <p className="text-[11px] text-[#707070] mt-0.5">
                      10 daqiqadan so&apos;ng eslatma yuboramiz
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={remindLinkClick}
                      onChange={(e) => setRemindLinkClick(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                {/* Qo'shimcha xabar */}
                <div className="flex items-center justify-between p-3.5 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl max-w-md shadow-inner">
                  <div>
                    <h3 className="text-[13px] font-bold text-black">Qo&apos;shimcha xabar</h3>
                    <p className="text-[11px] text-[#707070] mt-0.5">
                      Xabar belgilangan soniyalarda tugagach, ulanish
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={additionalMessageToggle}
                      onChange={(e) => setAdditionalMessageToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

              </div>
            )}

          </div>

          {/* Footer buttons */}
          <div className="mt-8 pt-4 border-t border-[#F0F0F0] flex justify-center gap-3.5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="px-8 py-2.5 bg-white hover:bg-[#F5F5F5] text-black border border-[#D8D8D8] font-bold rounded-xl text-[12px] transition-all text-center active:scale-95"
              >
                Ortga
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
                className="px-8 py-2.5 bg-black hover:bg-black/90 text-white font-bold rounded-xl text-[12px] transition-all text-center active:scale-95 shadow-sm"
              >
                Keyin
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateBot}
                className="px-8 py-2.5 bg-[#C7F33C] hover:bg-[#b5e02c] text-black border border-[#b2db2a] font-bold rounded-xl text-[12px] transition-all text-center active:scale-95 shadow-md"
              >
                Yaratish
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Phone Mockup Preview */}
        <div className="w-full lg:w-[400px] flex flex-col items-center justify-center bg-[#F9F9F7] rounded-[24px] p-4 shrink-0">
          
          {/* Phone Body Container */}
          <div className="w-[305px] h-[610px] border-[12px] border-black rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col bg-white select-none">
            {/* Phone Top Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130px] h-[24px] bg-black rounded-b-[20px] z-30 flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-white/10 rounded-full mr-2 shrink-0 animate-pulse" />
              <div className="w-14 h-1.5 bg-white/10 rounded-full shrink-0" />
            </div>

            {/* Phone Screen Headers depending on Preview Tab & Channel Type */}
            {selectedChannel?.type === "telegram" ? (
              /* Telegram Chat Header */
              <div className="pt-9 px-4 pb-2 border-b border-[#F0F0F0] flex items-center justify-between bg-white z-10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] text-black font-semibold cursor-pointer mr-1">⟨</span>
                  <div className="min-w-0 flex flex-col items-center justify-center flex-1">
                    <p className="text-[10px] font-extrabold text-black truncate leading-tight">
                      {selectedChannel?.name || "Abror Ahmedov"}
                    </p>
                    <p className="text-[8px] text-[#707070] truncate leading-none mt-0.5 font-bold">
                      0 foydalanuvchilar
                    </p>
                  </div>
                </div>
                <div className="h-6 w-6 rounded-full bg-[#5288c1] flex items-center justify-center shrink-0 text-white text-[10px] font-bold">
                  {(selectedChannel?.name || "Abror Ahmedov").charAt(0).toUpperCase()}
                </div>
              </div>
            ) : previewTab === "xabar" ? (
              /* Instagram DM Header */
              <div className="pt-9 px-4 pb-2 border-b border-[#F0F0F0] flex items-center justify-between bg-white z-10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] text-black font-semibold cursor-pointer mr-1">⟨</span>
                  {selectedChannel?.avatar ? (
                    <img src={selectedChannel.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={12} className="text-[#707070]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold text-black truncate leading-tight">
                      {selectedChannel?.name || "Isroil Samatov"}
                    </p>
                    <p className="text-[8px] text-[#707070] truncate leading-none mt-0.5">
                      @{selectedChannel?.username.replace(/^@+/, "") || "isroilsamatov_"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-[#707070] shrink-0">
                  <Phone size={12} className="cursor-pointer hover:text-black" />
                  <Video size={13} className="cursor-pointer hover:text-black" />
                </div>
              </div>
            ) : (
              /* Instagram Comments Header */
              <div className="pt-9 px-4 pb-2 border-b border-[#F0F0F0] flex items-center bg-white z-10 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14px] text-black font-semibold cursor-pointer">⟨</span>
                    {selectedChannel?.avatar ? (
                      <img src={selectedChannel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-black flex items-center justify-center shrink-0 text-white text-[7px] font-bold">
                        I
                      </div>
                    )}
                    <span className="text-[9px] font-extrabold text-black truncate">
                      {selectedChannel?.username.replace(/^@+/, "") || "isroil.ai"}
                    </span>
                  </div>
                  <div className="text-center flex-1 pr-6">
                    <p className="text-[9px] font-extrabold text-black tracking-tight">Nashrlar</p>
                  </div>
                </div>
              </div>
            )}

            {/* Screen Content */}
            <div className={`flex-1 overflow-y-auto flex flex-col text-[11px] leading-relaxed relative ${selectedChannel?.type === "telegram" ? "bg-[#ECEFF1]" : "bg-[#FCFCFB]"}`}>
              
              {/* Telegram specific mockup screen */}
              {selectedChannel?.type === "telegram" ? (
                <div className="flex-1 p-3 flex flex-col justify-end gap-3 font-sans">
                  {/* Step 1 centered card */}
                  {step === 1 && (
                    <div className="my-auto bg-[#D0D7DE]/60 border border-[#B0BEC5]/30 text-[#37474F] rounded-[16px] p-4 text-center max-w-[85%] mx-auto font-semibold shadow-xs">
                      Bu yerda chat-bot mijoz bilan qanday muloqot qilishini ko&apos;rsatamiz
                    </div>
                  )}

                  {/* Step 2 & 3 flow */}
                  {step >= 2 && (
                    <div className="flex flex-col gap-3 justify-end w-full">
                      {/* User message (right, green bubble) */}
                      <div className="self-end bg-[#EFFDDE] text-black border border-[#D9ECC1] px-3.5 py-1.5 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs font-semibold leading-normal">
                        {directTriggerType === "any" ? "/start" : (keywords[0] || "test")}
                      </div>

                      {/* Bot Welcome reply (left, white bubble) */}
                      {welcomeMessage && (
                        <div className="self-start flex flex-col max-w-[80%]">
                          <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                            {welcomeMessage}
                          </div>
                          {welcomeButton && (
                            <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-[#229ED9] rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                              {welcomeButton}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conditional subscription checker steps */}
                      {checkSubscription && (
                        <>
                          {/* User clicks welcome button */}
                          <div className="self-end bg-[#EFFDDE] text-black border border-[#D9ECC1] px-3.5 py-1.5 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs font-semibold leading-normal">
                            {welcomeButton}
                          </div>

                          {/* Not subscribed error */}
                          {noSubMessage && (
                            <div className="self-start flex flex-col max-w-[80%]">
                              <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                                {noSubMessage}
                              </div>
                              {noSubButton && (
                                <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-[#229ED9] rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                                  {noSubButton}
                                </div>
                              )}
                            </div>
                          )}

                          {/* User clicks completed button */}
                          <div className="self-end bg-[#EFFDDE] text-black border border-[#D9ECC1] px-3.5 py-1.5 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs font-semibold leading-normal">
                            {noSubButton}
                          </div>

                          {/* Success message */}
                          {successMessage && (
                            <div className="self-start flex flex-col max-w-[80%]">
                              <div className="bg-white text-black px-3.5 py-1.5 rounded-2xl rounded-tl-xs shadow-xs font-semibold leading-normal">
                                {successMessage}
                              </div>
                              {successButtonText && (
                                <div className="mt-1 bg-[#F5F8FA] border border-[#E1E8ED] hover:bg-slate-100 text-[#229ED9] rounded-xl py-2 px-3 text-center text-[10.5px] font-bold shadow-xs select-none cursor-pointer truncate max-w-full">
                                  {successButtonText}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div className="h-1" />
                </div>
              ) : (
                /* Instagram Specific Views (Xabar or Izoh) */
                <>
                  {previewTab === "xabar" && (
                    <div className="flex-1 p-4 flex flex-col justify-end gap-3.5 bg-[#FCFCFB]">
                      {/* Step 1 User Message */}
                      {step >= 1 && (
                        <div className="self-end bg-[#8B5CF6] text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-sm font-medium animate-in fade-in duration-200">
                          {keywords[0] ? keywords[0] : "Aniq xabar"}
                        </div>
                      )}

                      {/* Step 2 Bot Welcome message */}
                      {step >= 2 && welcomeMessage && (
                        <div className="self-start flex items-end gap-1.5 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                          <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                            {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                            {welcomeMessage}
                          </div>
                        </div>
                      )}

                      {/* Step 2 Bot Welcome Button */}
                      {step >= 2 && welcomeButton && (
                        <div className="self-center mt-1 py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold shadow-xs select-none max-w-[85%] text-center truncate cursor-pointer hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                          {welcomeButton}
                        </div>
                      )}

                      {/* Step 2 Verification Flow Demo */}
                      {step >= 2 && checkSubscription && (
                        <>
                          {/* User clicks welcome button */}
                          <div className="self-end bg-[#8B5CF6] text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-sm font-medium opacity-80 animate-in fade-in duration-300 delay-200">
                            {welcomeButton}
                          </div>

                          {/* Not subscribed warning */}
                          {noSubMessage && (
                            <div className="self-start flex items-end gap-1.5 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
                              <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                                {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                              </div>
                              <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                                {noSubMessage}
                              </div>
                            </div>
                          )}
                          
                          {noSubButton && (
                            <div className="self-center py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold shadow-xs select-none text-center max-w-[85%] truncate cursor-pointer hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                              {noSubButton}
                            </div>
                          )}

                          {/* User clicks Subscribed Button */}
                          <div className="self-end bg-[#8B5CF6] text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-sm font-medium opacity-80 animate-in fade-in duration-300">
                            {noSubButton}
                          </div>

                          {/* Subscribed Success msg */}
                          {successMessage && (
                            <div className="self-start flex items-end gap-1.5 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                                {selectedChannel?.avatar && <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />}
                              </div>
                              <div className="bg-white border border-[#E8E8E8] text-black px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-xs font-medium">
                                {successMessage}
                              </div>
                            </div>
                          )}
                          
                          {successButtonText && (
                            <div className="self-center py-1.5 px-4 bg-white border border-[#D8D8D8] rounded-xl text-[10px] font-bold text-blue-600 shadow-xs select-none text-center max-w-[85%] truncate cursor-pointer hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                              {successButtonText}
                            </div>
                          )}
                        </>
                      )}
                      <div className="h-1" />
                    </div>
                  )}

                  {/* Comment Tab view */}
                  {previewTab === "izoh" && (
                    <div className="flex-1 flex flex-col justify-between bg-white">
                      {/* Fake post block */}
                      <div className="w-full bg-[#EFEFEF] h-[160px] flex items-center justify-center text-slate-400 font-bold shrink-0 relative">
                        <span>Instagram Post</span>
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-black bg-white/70 px-2 py-1 rounded">
                          <span className="font-semibold">Barcha ma&apos;lumotlar...</span>
                          <span className="text-[#8B5CF6] font-bold">Qarang 🔗</span>
                        </div>
                      </div>

                      {/* Comments Drawer Panel */}
                      <div className="flex-1 bg-white border-t border-[#E8E8E8] rounded-t-[20px] flex flex-col z-10 shadow-lg min-h-[220px]">
                        {/* Drawer swipe pill */}
                        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto my-2.5 shrink-0" />
                        
                        {/* Drawer Title */}
                        <div className="text-[10px] text-black text-center font-extrabold pb-2 border-b border-[#F5F5F5] uppercase tracking-wider shrink-0">
                          Izohlar
                        </div>

                        {/* Scrollable comments list */}
                        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
                          
                          {/* Comment 1: User */}
                          <div className="flex items-start gap-2.5 animate-in fade-in duration-150">
                            <div className="h-5 w-5 rounded-full bg-sky-200 shrink-0 flex items-center justify-center font-bold text-[8px] text-sky-800">L</div>
                            <div className="flex-1">
                              <p className="font-extrabold text-[10px] text-black">
                                lsm <span className="font-normal text-[#909090] ml-1">Endi</span>
                              </p>
                              <p className="text-[10.5px] mt-0.5 text-black font-medium">{keywords[0] || "test"}</p>
                              <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">Javob berish</button>
                            </div>
                          </div>

                          {/* Reply 1: Bot automatic comment reply (Step 3 only) */}
                          {step === 3 && autoCommentReplies && commentReplies[0] && (
                            <div className="flex items-start gap-2.5 pl-7 border-l border-[#F0F0F0] animate-in slide-in-from-left-2 duration-300">
                              {selectedChannel?.avatar ? (
                                <img src={selectedChannel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-black shrink-0 flex items-center justify-center text-white text-[7px] font-bold">
                                  I
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-extrabold text-[10px] text-black">
                                  {selectedChannel?.username.replace(/^@+/, "") || "isroil.ai"}
                                  <span className="font-normal text-[#909090] ml-1">Endi</span>
                                </p>
                                <p className="text-[10.5px] mt-0.5 text-black font-semibold bg-slate-50 p-1.5 rounded-lg border border-[#F0F0F0]">
                                  {commentReplies[0]}
                                </p>
                                <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">Javob berish</button>
                              </div>
                            </div>
                          )}

                          {/* Comment 2: User (Step 3 only) */}
                          {step === 3 && (
                            <div className="flex items-start gap-2.5 animate-in fade-in duration-200 delay-100">
                              <div className="h-5 w-5 rounded-full bg-[#FFE4E6] shrink-0 flex items-center justify-center font-bold text-[8px] text-rose-800">A</div>
                              <div className="flex-1">
                                <p className="font-extrabold text-[10px] text-black">
                                  anvar_m <span className="font-normal text-[#909090] ml-1">Endi</span>
                                </p>
                                <p className="text-[10.5px] mt-0.5 text-black font-medium">{keywords[0] || "test"}</p>
                                <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">Javob berish</button>
                              </div>
                            </div>
                          )}

                          {/* Reply 2: Bot (Step 3 only) */}
                          {step === 3 && autoCommentReplies && commentReplies[1] && (
                            <div className="flex items-start gap-2.5 pl-7 border-l border-[#F0F0F0] animate-in slide-in-from-left-2 duration-300 delay-200">
                              {selectedChannel?.avatar ? (
                                <img src={selectedChannel.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-black shrink-0 flex items-center justify-center text-white text-[7px] font-bold">
                                  I
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-extrabold text-[10px] text-black">
                                  {selectedChannel?.username.replace(/^@+/, "") || "isroil.ai"}
                                  <span className="font-normal text-[#909090] ml-1">Endi</span>
                                </p>
                                <p className="text-[10.5px] mt-0.5 text-black font-semibold bg-slate-50 p-1.5 rounded-lg border border-[#F0F0F0]">
                                  {commentReplies[1]}
                                </p>
                                <button className="text-[9px] text-[#707070] font-bold mt-1 hover:text-black">Javob berish</button>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Emojis row inside drawer */}
                        <div className="flex justify-between items-center px-4 py-1.5 border-t border-b border-[#F0F0F0] bg-white text-[13px] shrink-0">
                          <span className="cursor-pointer hover:scale-125 transition-transform">❤️</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">🙌</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">👍</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">😢</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">😮</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">👏</span>
                          <span className="cursor-pointer hover:scale-125 transition-transform">😍</span>
                        </div>

                        {/* Bottom comment input inside drawer */}
                        <div className="p-2 border-t border-[#F0F0F0] bg-white flex items-center gap-2 shrink-0">
                          <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                            {selectedChannel?.avatar ? (
                              <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-black flex items-center justify-center text-white text-[6px] font-bold">I</div>
                            )}
                          </div>
                          <div className="flex-1 bg-[#F5F5F5] rounded-full px-3 py-1 flex items-center justify-between text-[9px] text-[#707070] font-medium border border-[#E8E8E8]">
                            <span>{selectedChannel ? `${selectedChannel.username.replace(/^@+/, "")} uchun izoh...` : "isroil.ai uchun izoh..."}</span>
                            <Smile size={12} className="text-[#707070]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Bottom DM/Chat input inside the phone screen if DM/Chat mode */}
            {((selectedChannel?.type !== "telegram" && previewTab === "xabar") || selectedChannel?.type === "telegram") && (
              <div className="p-2.5 border-t border-[#F0F0F0] bg-white flex items-center gap-2 shrink-0">
                <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                  {selectedChannel?.avatar ? (
                    <img src={selectedChannel.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={10} className="text-[#707070]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-[#F5F5F5] rounded-full px-3 py-1.5 flex items-center justify-between text-[9px] text-[#A0A0A0] border border-[#E8E8E8]">
                  <span>Xabar yozing...</span>
                  <Smile size={12} className="text-[#707070] cursor-pointer hover:text-black" />
                </div>
              </div>
            )}

            {/* Phone bottom indicator bar */}
            <div className="w-[100px] h-1 bg-black rounded-full mx-auto my-2 shrink-0" />
          </div>

          {/* Toggle buttons below phone (Only if NOT Telegram) */}
          {selectedChannel?.type !== "telegram" && (
            <div className="mt-4 flex bg-[#F0F0F2] border border-[#E4E4E6] rounded-xl p-0.5 w-[160px] shadow-sm shrink-0 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setPreviewTab("xabar")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${previewTab === "xabar" ? "bg-white text-black shadow-xs border border-[#E0E0E0]/30" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                Xabar
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("izoh")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${previewTab === "izoh" ? "bg-white text-black shadow-xs border border-[#E0E0E0]/30" : "text-[#707070] hover:text-black bg-transparent"}`}
              >
                Izoh
              </button>
            </div>
          )}

          <div className="mt-2 text-center">
            <span className="text-[9px] text-[#A0A0A0] uppercase font-bold tracking-wider">
              Jonli Telefon Prevyusi
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}



