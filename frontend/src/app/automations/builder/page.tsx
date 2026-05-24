"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Zap,
  MessageSquare,
  Clock,
  ShieldAlert,
  ArrowLeft,
  Save,
  CheckCircle,
  Bot,
  Plus,
  X,
  Link as LinkIcon,
  MousePointerClick,
  Tag,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/primitives";
import { db } from "@/lib/db";

// ─────────── TYPES ────────────
type NodeType = "trigger" | "message" | "wait" | "condition" | "action" | "ai";

type ButtonItem = { id: string; label: string; type: "action" | "link"; url?: string };

interface NodeData {
  label: string;
  nodeType?: NodeType;
  triggerSource?: string;
  triggerMatch?: string;
  triggerKeywords?: string;
  conditionType?: string;
  conditionValue?: string;
  actionType?: string;
  actionValue?: string;
  aiPrompt?: string;
  aiOutputVar?: string;
  buttons?: ButtonItem[];
}



// ─────────── COMPONENT ────────────
export default function BuilderPage() {
  const { t } = useI18n();

  const TEMPLATE_FLOWS: Record<string, { nodes: Node<NodeData>[]; edges: Edge[] }> = {
    lead_magnet: {
      nodes: [
        { id: "n1", type: "input", data: { label: t("pages.builder.tmpl_lead_trigger_label"), nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "kitob, kurs, bonus" }, position: { x: 250, y: 50 }, style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 } },
        { id: "n2", data: { label: t("pages.builder.tmpl_lead_cond_label"), nodeType: "condition", conditionType: "is_follower", conditionValue: "" }, position: { x: 250, y: 200 }, style: { background: "#000", color: "#fff", border: "1px solid #333", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        { id: "n3", data: { label: t("pages.builder.tmpl_lead_msg1_label"), nodeType: "message", buttons: [{ id: "b1", label: t("pages.builder.tmpl_lead_msg1_btn"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 100, y: 370 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        { id: "n4", data: { label: t("pages.builder.tmpl_lead_msg2_label"), nodeType: "message", buttons: [] }, position: { x: 420, y: 370 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", target: "n3", label: t("pages.builder.yes"), animated: true, style: { stroke: "#16A34A", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#16A34A" } },
        { id: "e3", source: "n2", target: "n4", label: t("pages.builder.no"), animated: true, style: { stroke: "#DC2626", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#DC2626" } },
      ],
    },
    story_coupon: {
      nodes: [
        { id: "n1", type: "input", data: { label: t("pages.builder.tmpl_story_trigger_label"), nodeType: "trigger", triggerSource: "story_mention", triggerMatch: "any" }, position: { x: 250, y: 50 }, style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 } },
        { id: "n2", data: { label: t("pages.builder.tmpl_story_msg_label"), nodeType: "message", buttons: [{ id: "b1", label: t("pages.builder.tmpl_story_msg_btn"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 250, y: 200 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        { id: "n3", data: { label: t("pages.builder.tmpl_story_act_label"), nodeType: "action", actionType: "add_tag", actionValue: "story_user" }, position: { x: 250, y: 400 }, style: { background: "#F0F0F0", color: "#000", border: "1px solid #dcdcdc", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
      ],
    },
    comment_dm: {
      nodes: [
        { id: "n1", type: "input", data: { label: t("pages.builder.tmpl_comment_trigger_label"), nodeType: "trigger", triggerSource: "comment", triggerMatch: "contains", triggerKeywords: "narxi, batafsil, link" }, position: { x: 250, y: 50 }, style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 } },
        { id: "n2", data: { label: t("pages.builder.tmpl_comment_msg1_label"), nodeType: "message", buttons: [] }, position: { x: 250, y: 200 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        { id: "n3", data: { label: t("pages.builder.tmpl_comment_msg2_label"), nodeType: "message", buttons: [{ id: "b1", label: t("pages.builder.tmpl_comment_msg2_btn1"), type: "link", url: "https://t.me/yourusername" }, { id: "b2", label: t("pages.builder.tmpl_comment_msg2_btn2"), type: "action" }] }, position: { x: 250, y: 370 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
      ],
    },
    welcome_faq: {
      nodes: [
        { id: "n1", type: "input", data: { label: t("pages.builder.tmpl_welcome_trigger_label"), nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "salom, start, boshlash" }, position: { x: 250, y: 50 }, style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 } },
        { id: "n2", data: { label: t("pages.builder.tmpl_welcome_msg1_label"), nodeType: "message", buttons: [{ id: "b1", label: t("pages.builder.tmpl_welcome_msg1_btn1"), type: "action" }, { id: "b2", label: t("pages.builder.tmpl_welcome_msg1_btn2"), type: "action" }, { id: "b3", label: t("pages.builder.tmpl_welcome_msg1_btn3"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 250, y: 200 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        { id: "n3", data: { label: t("pages.builder.tmpl_welcome_msg2_label"), nodeType: "message", buttons: [] }, position: { x: 50, y: 420 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        { id: "n4", data: { label: t("pages.builder.tmpl_welcome_msg3_label"), nodeType: "message", buttons: [] }, position: { x: 450, y: 420 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e3", source: "n2", target: "n4", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
      ],
    },
  };

  const TRIGGER_SOURCES = [
    { value: "dm", label: t("pages.builder.trigger_dm") },
    { value: "comment", label: t("pages.builder.trigger_comment") },
    { value: "story_mention", label: t("pages.builder.trigger_story_mention") },
    { value: "story_reply", label: t("pages.builder.trigger_story_reply") },
    { value: "live_comment", label: t("pages.builder.trigger_live_comment") },
  ];

  const TRIGGER_MATCHES = [
    { value: "any", label: t("pages.builder.match_any") },
    { value: "contains", label: t("pages.builder.match_contains") },
    { value: "is", label: t("pages.builder.match_is") },
  ];

  const CONDITION_TYPES = [
    { value: "is_follower", label: t("pages.builder.cond_follower") },
    { value: "has_tag", label: t("pages.builder.cond_tag") },
    { value: "variable_check", label: t("pages.builder.cond_var") },
  ];

  const ACTION_TYPES = [
    { value: "add_tag", label: t("pages.builder.act_add_tag") },
    { value: "remove_tag", label: t("pages.builder.act_remove_tag") },
    { value: "set_variable", label: t("pages.builder.act_set_var") },
    { value: "webhook", label: t("pages.builder.act_webhook") },
    { value: "notify_telegram", label: t("pages.builder.act_telegram") },
  ];

  const [mounted, setMounted] = useState(false);
  const [botName, setBotName] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);

  // Inspector fields
  const [inspLabel, setInspLabel] = useState("");
  const [inspTriggerSource, setInspTriggerSource] = useState("dm");
  const [inspTriggerMatch, setInspTriggerMatch] = useState("contains");
  const [inspTriggerKeywords, setInspTriggerKeywords] = useState("");
  const [inspConditionType, setInspConditionType] = useState("is_follower");
  const [inspConditionValue, setInspConditionValue] = useState("");
  const [inspActionType, setInspActionType] = useState("add_tag");
  const [inspActionValue, setInspActionValue] = useState("");
  const [inspAiPrompt, setInspAiPrompt] = useState("");
  const [inspAiOutputVar, setInspAiOutputVar] = useState("ai_response");
  const [inspButtons, setInspButtons] = useState<ButtonItem[]>([]);

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) { window.location.href = "/login"; return; }
    setMounted(true);

    const sp = new URLSearchParams(window.location.search);
    const paramId = sp.get("id");
    const paramTemplate = sp.get("template");
    const activeCh = db.getActiveChannel();

    if (paramTemplate && TEMPLATE_FLOWS[paramTemplate]) {
      const tflow = TEMPLATE_FLOWS[paramTemplate];
      setNodes(tflow.nodes);
      setEdges(tflow.edges);
      const found = activeCh
        ? db.getChannelAutomations(activeCh.id).find((a) => a.id === paramId)
        : db.getAutomations().find((a) => a.id === paramId);
      if (found) setBotName(found.name);
      else setBotName(t("pages.builder.new_flow"));
    } else if (paramId) {
      const found = activeCh
        ? db.getChannelAutomations(activeCh.id).find((a) => a.id === paramId)
        : db.getAutomations().find((a) => a.id === paramId);
      if (found) {
        setBotName(found.name);
        setNodes([
          { id: "n1", type: "input", data: { label: `${t("pages.builder.trigger_prefix")}: ${found.triggerDetails}`, nodeType: "trigger", triggerSource: found.triggerType === "story" ? "story_mention" : "dm", triggerMatch: "contains", triggerKeywords: found.triggerDetails }, position: { x: 250, y: 50 }, style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 } },
          { id: "n2", data: { label: t("pages.builder.initial_msg_connected"), nodeType: "message", buttons: [] }, position: { x: 250, y: 220 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
        ]);
        setEdges([{ id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } }]);
      }
    } else {
      setBotName(t("pages.builder.new_flow"));
      setNodes([
        { id: "n1", type: "input", data: { label: t("pages.builder.initial_trigger_kw"), nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "salom, narx" }, position: { x: 250, y: 50 }, style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 } },
        { id: "n2", data: { label: t("pages.builder.initial_msg_how_help"), nodeType: "message", buttons: [] }, position: { x: 250, y: 220 }, style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 } },
      ]);
      setEdges([{ id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } }]);
    }
  }, [setNodes, setEdges, t]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } }, eds)),
    [setEdges]
  );

  const syncInspector = (node: Node<NodeData>) => {
    setSelectedNode(node);
    setInspLabel(node.data.label || "");
    setInspTriggerSource(node.data.triggerSource || "dm");
    setInspTriggerMatch(node.data.triggerMatch || "contains");
    setInspTriggerKeywords(node.data.triggerKeywords || "");
    setInspConditionType(node.data.conditionType || "is_follower");
    setInspConditionValue(node.data.conditionValue || "");
    setInspActionType(node.data.actionType || "add_tag");
    setInspActionValue(node.data.actionValue || "");
    setInspAiPrompt(node.data.aiPrompt || "");
    setInspAiOutputVar(node.data.aiOutputVar || "ai_response");
    setInspButtons(node.data.buttons || []);
  };

  const onNodeClick = (_: React.MouseEvent, node: Node<NodeData>) => syncInspector(node);

  const handleSaveNodeDetails = () => {
    if (!selectedNode) return;
    const srcLabel = TRIGGER_SOURCES.find(s => s.value === inspTriggerSource)?.label || inspTriggerSource;
    const newLabel =
      selectedNode.data.nodeType === "trigger"
        ? `${t("pages.builder.trigger_prefix")}: ${srcLabel} – ${inspTriggerKeywords || t("pages.builder.any_keywords")}`
        : selectedNode.data.nodeType === "condition"
        ? `${t("pages.builder.condition_prefix")}: ${CONDITION_TYPES.find(c => c.value === inspConditionType)?.label || ""}`
        : selectedNode.data.nodeType === "action"
        ? `${t("pages.builder.action_prefix")}: ${ACTION_TYPES.find(a => a.value === inspActionType)?.label || ""} – ${inspActionValue}`
        : selectedNode.data.nodeType === "ai"
        ? `${t("pages.builder.ai_prefix")}: ${inspAiPrompt.substring(0, 40)}...`
        : inspLabel;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, label: newLabel, triggerSource: inspTriggerSource, triggerMatch: inspTriggerMatch, triggerKeywords: inspTriggerKeywords, conditionType: inspConditionType, conditionValue: inspConditionValue, actionType: inspActionType, actionValue: inspActionValue, aiPrompt: inspAiPrompt, aiOutputVar: inspAiOutputVar, buttons: inspButtons } }
          : n
      )
    );
  };

  const handleSaveFlow = () => {
    const sp = new URLSearchParams(window.location.search);
    const paramId = sp.get("id");
    const activeCh = db.getActiveChannel();
    const list = activeCh ? db.getChannelAutomations(activeCh.id) : db.getAutomations();
    const triggerNode = nodes.find((n) => n.data.nodeType === "trigger");
    const src = triggerNode?.data.triggerSource || "dm";
    const isStory = src.includes("story");
    let savedMsg = t("pages.builder.saved_toast");

    if (paramId) {
      const idx = list.findIndex((a) => a.id === paramId);
      if (idx > -1) {
        list[idx] = { ...list[idx], name: botName, triggerType: isStory ? "story" : "keyword", triggerDetails: triggerNode?.data.triggerKeywords || src };
      }
    } else {
      const user = db.getCurrentUser();
      const plan = user?.plan || "free";
      const maxAutos = plan === "premium" ? 500 : plan === "pro" ? 50 : 2;
      const currentActiveCount = db.getAllAutomations().filter((a) => a.active).length;
      const shouldBeActive = currentActiveCount < maxAutos;

      list.push({ 
        id: String(list.length + 1), 
        name: botName, 
        triggerType: isStory ? "story" : "keyword", 
        triggerDetails: triggerNode?.data.triggerKeywords || src, 
        runs: "0", 
        completion: "100%", 
        active: shouldBeActive 
      });

      if (!shouldBeActive) {
        savedMsg = t("pages.builder.limit_toast");
      }
    }

    if (activeCh) {
      db.saveChannelAutomations(activeCh.id, list);
    } else {
      db.saveAutomations(list);
    }
    setToastMsg(savedMsg);
    setShowToast(true);
    setTimeout(() => { window.location.href = "/automations"; }, 1500);
  };

  const addNewNode = (type: NodeType) => {
    const id = `node-${nodes.length + 1}`;
    const configs: Record<NodeType, { label: string; style: object; data: Partial<NodeData> }> = {
      trigger: { label: t("pages.builder.block_trigger"), style: { background: "#C7F33C", color: "#1A2906", border: "1px solid #9BC92E", borderRadius: "14px", padding: "12px", fontSize: "12px", fontWeight: 500, width: 240 }, data: { nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "" } },
      message: { label: t("pages.builder.block_message"), style: { background: "#fff", color: "#000", border: "1px solid #E8E8E8", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 }, data: { nodeType: "message", buttons: [] } },
      wait: { label: t("pages.builder.block_wait"), style: { background: "#F0F0F0", color: "#000", border: "1px solid #dcdcdc", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 }, data: { nodeType: "wait" } },
      condition: { label: t("pages.builder.block_condition"), style: { background: "#000", color: "#fff", border: "1px solid #333", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 }, data: { nodeType: "condition", conditionType: "is_follower", conditionValue: "" } },
      action: { label: t("pages.builder.block_action"), style: { background: "#F0F0F0", color: "#000", border: "1px solid #dcdcdc", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 }, data: { nodeType: "action", actionType: "add_tag", actionValue: "" } },
      ai: { label: t("pages.builder.ai_request_title"), style: { background: "#0F0F0F", color: "#C7F33C", border: "1px solid #2a2a2a", borderRadius: "14px", padding: "12px", fontSize: "12px", width: 240 }, data: { nodeType: "ai", aiPrompt: "", aiOutputVar: "ai_response" } },
    };
    const cfg = configs[type];
    const newNode: Node<NodeData> = { id, data: { label: cfg.label, ...cfg.data }, position: { x: 250, y: nodes.length * 120 + 50 }, style: cfg.style };
    setNodes((nds) => [...nds, newNode]);
    syncInspector(newNode);
  };

  const addButton = () => {
    const btn: ButtonItem = { id: `btn-${Date.now()}`, label: t("pages.builder.btn_placeholder"), type: "action" };
    setInspButtons((prev) => [...prev, btn]);
  };

  const removeButton = (id: string) => setInspButtons((prev) => prev.filter((b) => b.id !== id));

  const updateButton = (id: string, key: keyof ButtonItem, value: string) => {
    setInspButtons((prev) => prev.map((b) => b.id === id ? { ...b, [key]: value } : b));
  };

  if (!mounted) return <div className="flex h-screen items-center justify-center bg-[#E8E8E8] text-black text-[13px]">{t("common.loading")}</div>;

  const nodeType = selectedNode?.data.nodeType;

  return (
    <div className="flex h-screen flex-col bg-[#E8E8E8] relative">
      {/* Toast */}
      {showToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-2xl border border-[#C7F33C]/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle size={16} className="text-[#C7F33C]" />
          <span className="text-[13px] font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#D8D8D8] bg-white px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/automations">
            <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#F0F0F0] transition-colors text-black shrink-0">
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>
          </Link>
          <input
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            className="text-[16px] font-medium text-black bg-transparent outline-none border-b-2 border-transparent focus:border-[#C7F33C] transition-all min-w-0 truncate"
          />
        </div>
        <Button variant="primary" className="flex items-center gap-1.5 px-5 py-2 text-[12px] bg-black text-white rounded-full hover:bg-black/90 shrink-0" onClick={handleSaveFlow}>
          <Save size={14} /> {t("pages.automations.save_flow")}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Palette */}
        <aside className="w-[220px] shrink-0 border-r border-[#D8D8D8] bg-white p-4 flex flex-col gap-3 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#707070] uppercase tracking-wider px-1">{t("pages.builder.blocks_title")}</p>
          {([
            { type: "trigger" as NodeType, icon: <Zap size={15} />, label: t("pages.builder.block_trigger"), sub: t("pages.builder.block_trigger_sub"), cls: "bg-[#C7F33C]/15 text-[#1A2906] border border-[#C7F33C]/40 hover:bg-[#C7F33C]/30" },
            { type: "message" as NodeType, icon: <MessageSquare size={15} className="text-[#707070]" />, label: t("pages.builder.block_message"), sub: t("pages.builder.block_message_sub"), cls: "bg-white text-black border border-[#E8E8E8] hover:bg-[#F9F9F7]" },
            { type: "condition" as NodeType, icon: <ShieldAlert size={15} className="text-[#C7F33C]" />, label: t("pages.builder.block_condition"), sub: t("pages.builder.block_condition_sub"), cls: "bg-black text-white hover:bg-black/90" },
            { type: "action" as NodeType, icon: <Tag size={15} className="text-[#707070]" />, label: t("pages.builder.block_action"), sub: t("pages.builder.block_action_sub"), cls: "bg-[#F0F0F0] text-black border border-[#dcdcdc] hover:bg-[#e4e4e4]" },
            { type: "wait" as NodeType, icon: <Clock size={15} className="text-[#707070]" />, label: t("pages.builder.block_wait"), sub: t("pages.builder.block_wait_sub"), cls: "bg-[#F0F0F0] text-black border border-[#dcdcdc] hover:bg-[#e4e4e4]" },
          ]).map(({ type, icon, label, sub, cls }) => (
            <button key={type} onClick={() => addNewNode(type)} className={`flex w-full items-center gap-3 rounded-[12px] p-3 text-left transition-colors ${cls}`}>
              {icon}
              <div>
                <div className="text-[12px] font-medium leading-none">{label}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>
              </div>
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative bg-[#E8E8E8]">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={onNodeClick} fitView>
            <Background color="#000" gap={16} size={1} style={{ opacity: 0.05 }} />
            <Controls className="bg-white border border-[#D8D8D8] rounded-[10px]" />
          </ReactFlow>
        </main>

        {/* Right Inspector */}
        <aside className="w-[300px] shrink-0 border-l border-[#D8D8D8] bg-white overflow-y-auto">
          {selectedNode ? (
            <div className="flex flex-col">
              {/* Inspector Header */}
              <div className="px-5 pt-5 pb-4 border-b border-[#F0F0F0] flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-[10px] shrink-0 ${
                  nodeType === "trigger" ? "bg-[#C7F33C]" :
                  nodeType === "message" ? "bg-[#F0F0F0]" :
                  nodeType === "condition" ? "bg-black" :
                  nodeType === "action" ? "bg-[#F0F0F0]" :
                  nodeType === "ai" ? "bg-black" : "bg-[#F0F0F0]"
                }`}>
                  {nodeType === "trigger" && <Zap size={16} className="text-[#1A2906]" />}
                  {nodeType === "message" && <MessageSquare size={16} className="text-[#707070]" />}
                  {nodeType === "condition" && <ShieldAlert size={16} className="text-[#C7F33C]" />}
                  {nodeType === "action" && <Tag size={16} className="text-[#707070]" />}
                  {nodeType === "ai" && <Bot size={16} className="text-[#C7F33C]" />}
                  {nodeType === "wait" && <Clock size={16} className="text-[#707070]" />}
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-black leading-none">
                    {nodeType === "trigger" ? t("pages.builder.block_trigger") : nodeType === "message" ? t("pages.builder.block_message") : nodeType === "condition" ? t("pages.builder.block_condition") : nodeType === "action" ? t("pages.builder.block_action") : nodeType === "ai" ? t("pages.builder.ai_request_title") : t("pages.builder.block_wait")}
                  </h3>
                  <p className="text-[10px] text-[#707070] mt-0.5">ID: {selectedNode.id}</p>
                </div>
              </div>

              <div className="px-4 py-4 flex flex-col gap-5">

                {/* ── TRIGGER INSPECTOR ── */}
                {nodeType === "trigger" && (
                  <>
                    {/* Trigger Source Cards */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.trigger_source")}</p>
                      <div className="flex flex-col gap-1.5">
                        {TRIGGER_SOURCES.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setInspTriggerSource(s.value)}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-left transition-all border ${
                              inspTriggerSource === s.value
                                ? "bg-black text-white border-black"
                                : "bg-[#F9F9F7] text-[#333] border-[#E8E8E8] hover:border-[#ccc]"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${inspTriggerSource === s.value ? "bg-[#C7F33C]" : "bg-[#D8D8D8]"}`} />
                            <span className="text-[12px] font-medium">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Keyword match type — only for DM / Comment */}
                    {(inspTriggerSource === "dm" || inspTriggerSource === "comment") && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.trigger_match")}</p>
                        <div className="flex gap-2 flex-wrap">
                          {TRIGGER_MATCHES.map((m) => (
                            <button
                              key={m.value}
                              onClick={() => setInspTriggerMatch(m.value)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                                inspTriggerMatch === m.value
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-[#707070] border-[#E8E8E8] hover:border-black hover:text-black"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Keywords input */}
                    {inspTriggerMatch !== "any" && (inspTriggerSource === "dm" || inspTriggerSource === "comment") && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.trigger_keywords")}</p>
                        <input
                          value={inspTriggerKeywords}
                          onChange={(e) => setInspTriggerKeywords(e.target.value)}
                          placeholder={t("pages.builder.trigger_keywords_placeholder")}
                          className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors"
                        />
                        <p className="text-[10px] text-[#a0a0a0] px-0.5">{t("pages.builder.trigger_keywords")}</p>
                      </div>
                    )}

                    {/* Story / Live info banner */}
                    {(inspTriggerSource === "story_mention" || inspTriggerSource === "story_reply" || inspTriggerSource === "live_comment") && (
                      <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-[#F9F9F7] border border-[#E8E8E8]">
                        <span className="text-base mt-0.5">⚡</span>
                        <p className="text-[11px] text-[#505050] leading-relaxed">{t("pages.builder.trigger_desc_no_kw")}</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── MESSAGE INSPECTOR ── */}
                {nodeType === "message" && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.node_title_label")}</p>
                      <textarea
                        value={inspLabel}
                        onChange={(e) => setInspLabel(e.target.value)}
                        className="w-full min-h-[130px] rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none resize-none focus:bg-[#e8e8e8] transition-colors leading-relaxed"
                        placeholder={t("pages.builder.placeholder_msg")}
                      />
                    </div>

                    {/* Buttons section */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-0.5">
                        <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest">{t("pages.builder.buttons_desc")}</p>
                        <button
                          onClick={addButton}
                          className="flex items-center gap-1 text-[11px] font-semibold text-black bg-[#F0F0F0] hover:bg-[#E8E8E8] px-2.5 py-1 rounded-full transition-colors"
                        >
                          <Plus size={11} /> {t("pages.builder.add_btn")}
                        </button>
                      </div>

                      {inspButtons.length === 0 && (
                        <div className="text-center py-4 rounded-[12px] border border-dashed border-[#D8D8D8] text-[11px] text-[#a0a0a0]">
                          {t("pages.builder.no_buttons")}
                        </div>
                      )}

                      {inspButtons.map((btn, idx) => (
                        <div key={btn.id} className="rounded-[12px] border border-[#E8E8E8] bg-[#FAFAFA] overflow-hidden">
                          <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                            <span className="text-[10px] font-bold text-[#a0a0a0] shrink-0">#{idx + 1}</span>
                            <input
                              value={btn.label}
                              onChange={(e) => updateButton(btn.id, "label", e.target.value)}
                              className="flex-1 text-[12px] font-medium bg-transparent outline-none"
                              placeholder={t("pages.builder.btn_placeholder")}
                            />
                            <button onClick={() => removeButton(btn.id)} className="text-[#DC2626] hover:opacity-70 shrink-0">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex border-t border-[#F0F0F0]">
                            <button
                              onClick={() => updateButton(btn.id, "type", "action")}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-all ${btn.type === "action" ? "bg-black text-white" : "text-[#707070] hover:bg-[#F0F0F0]"}`}
                            >
                              <MousePointerClick size={11} /> {t("pages.builder.btn_action")}
                            </button>
                            <button
                              onClick={() => updateButton(btn.id, "type", "link")}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-all border-l border-[#F0F0F0] ${btn.type === "link" ? "bg-black text-white" : "text-[#707070] hover:bg-[#F0F0F0]"}`}
                            >
                              <LinkIcon size={11} /> {t("pages.builder.btn_link")}
                            </button>
                          </div>
                          {btn.type === "link" && (
                            <div className="border-t border-[#F0F0F0] px-3 py-2">
                              <input
                                value={btn.url || ""}
                                onChange={(e) => updateButton(btn.id, "url", e.target.value)}
                                className="w-full text-[11px] bg-[#F0F0F0] rounded-[8px] px-3 py-1.5 outline-none"
                                placeholder={t("pages.builder.btn_url_placeholder")}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── CONDITION INSPECTOR ── */}
                {nodeType === "condition" && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.condition_type")}</p>
                      <div className="flex flex-col gap-1.5">
                        {CONDITION_TYPES.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setInspConditionType(c.value)}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-left transition-all border ${
                              inspConditionType === c.value
                                ? "bg-black text-white border-black"
                                : "bg-[#F9F9F7] text-[#333] border-[#E8E8E8] hover:border-[#ccc]"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${inspConditionType === c.value ? "bg-[#C7F33C]" : "bg-[#D8D8D8]"}`} />
                            <span className="text-[12px] font-medium">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {inspConditionType !== "is_follower" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">
                          {inspConditionType === "has_tag" ? t("pages.builder.tag_name") : t("pages.builder.var_name")}
                        </p>
                        <input
                          value={inspConditionValue}
                          onChange={(e) => setInspConditionValue(e.target.value)}
                          placeholder={inspConditionType === "has_tag" ? "vip_client" : "user_points"}
                          className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-mono"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[12px] bg-[#16A34A]/8 border border-[#16A34A]/20">
                        <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                        <span className="text-[11px] font-semibold text-[#16A34A]">{t("pages.builder.yes_next")}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[12px] bg-[#DC2626]/8 border border-[#DC2626]/20">
                        <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
                        <span className="text-[11px] font-semibold text-[#DC2626]">{t("pages.builder.no_alt")}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* ── ACTION INSPECTOR ── */}
                {nodeType === "action" && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.action_type")}</p>
                      <div className="flex flex-col gap-1.5">
                        {ACTION_TYPES.map((a) => (
                          <button
                            key={a.value}
                            onClick={() => setInspActionType(a.value)}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-left transition-all border ${
                              inspActionType === a.value
                                ? "bg-black text-white border-black"
                                : "bg-[#F9F9F7] text-[#333] border-[#E8E8E8] hover:border-[#ccc]"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${inspActionType === a.value ? "bg-[#C7F33C]" : "bg-[#D8D8D8]"}`} />
                            <span className="text-[12px] font-medium">{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">
                        {inspActionType === "webhook" ? t("pages.builder.webhook_url") : inspActionType === "notify_telegram" ? t("pages.builder.tg_chat_id") : t("pages.builder.val_label")}
                      </p>
                      <input
                        value={inspActionValue}
                        onChange={(e) => setInspActionValue(e.target.value)}
                        placeholder={
                          inspActionType === "webhook" ? "https://hooks.zapier.com/..."
                          : inspActionType === "notify_telegram" ? "-100123456789"
                          : inspActionType.includes("tag") ? t("pages.builder.tag_name")
                          : t("pages.builder.val_label")
                        }
                        className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-mono"
                      />
                    </div>
                  </>
                )}

                {/* ── WAIT INSPECTOR ── */}
                {nodeType === "wait" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("pages.builder.wait_duration")}</p>
                    <input
                      value={inspLabel}
                      onChange={(e) => setInspLabel(e.target.value)}
                      placeholder={t("pages.builder.wait_15m")}
                      className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: t("pages.builder.wait_1m"), val: `Kutish: ${t("pages.builder.wait_1m")}` },
                        { label: t("pages.builder.wait_5m"), val: `Kutish: ${t("pages.builder.wait_5m")}` },
                        { label: t("pages.builder.wait_15m"), val: `Kutish: ${t("pages.builder.wait_15m")}` },
                        { label: t("pages.builder.wait_1h"), val: `Kutish: ${t("pages.builder.wait_1h")}` },
                        { label: t("pages.builder.wait_24h"), val: `Kutish: ${t("pages.builder.wait_24h")}` },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setInspLabel(preset.val)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#F0F0F0] text-[#707070] hover:bg-black hover:text-white transition-all border border-[#E8E8E8]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── AI INSPECTOR ── */}
                {nodeType === "ai" && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("builder.ai_prompt_label")}</p>
                      <textarea
                        value={inspAiPrompt}
                        onChange={(e) => setInspAiPrompt(e.target.value)}
                        className="w-full min-h-[110px] rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none resize-none focus:bg-[#e8e8e8] transition-colors leading-relaxed"
                        placeholder={t("builder.ai_prompt_placeholder")}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">{t("builder.ai_output_var_label")}</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0] text-[12px] font-mono">{"{{"}</span>
                        <input
                          value={inspAiOutputVar}
                          onChange={(e) => setInspAiOutputVar(e.target.value)}
                          className="w-full rounded-[12px] bg-[#F0F0F0] pl-9 pr-9 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-mono"
                          placeholder="ai_response"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0a0a0] text-[12px] font-mono">{"}}"}</span>
                      </div>
                      <p className="text-[10px] text-[#a0a0a0] px-0.5">
                        {t("builder.ai_output_var_desc").replace("{variable}", `{{${inspAiOutputVar || "ai_response"}}}`)}
                      </p>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveNodeDetails}
                  className="w-full py-3 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-black/80 active:scale-[0.98] transition-all mt-1"
                >
                  {t("pages.builder.save_btn")}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-6">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[#F0F0F0]">
                <Zap size={22} className="opacity-30" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-black">{t("pages.builder.unselected_block")}</p>
                <p className="text-[11px] text-[#707070] mt-1 max-w-[190px] leading-relaxed">{t("pages.builder.unselected_block_desc")}</p>
              </div>
              <div className="w-full p-3.5 rounded-[14px] bg-[#F9F9F7] border border-[#E8E8E8] text-left">
                <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest mb-2.5">{t("pages.builder.variables")}</p>
                {["{{user_name}}", "{{user_points}}"].map((v) => (
                  <code key={v} className="block text-[11px] text-black py-1 border-b border-[#F0F0F0] last:border-0">{v}</code>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

