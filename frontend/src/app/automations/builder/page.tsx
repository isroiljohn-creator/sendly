"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Handle,
  Position,
  NodeProps,
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
  Settings,
  Layers,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { Instagram } from "@/components/ui/icons";

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

// ─────────── CUSTOM NODE COMPONENTS ────────────

function TriggerNode({ data, id }: NodeProps<NodeData>) {
  const isIg = data.triggerSource === "instagram" || true;
  return (
    <div className="w-[260px] bg-white border border-[#E8E8E8] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden text-black text-left">
      {/* Node Header */}
      <div className="bg-[#F5F5F7] px-4 py-2.5 border-b border-[#E8E8E8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0" />
          <span className="text-[10px] font-black text-[#505050] uppercase tracking-wider">Boshlanishi</span>
        </div>
        <span className="text-[9px] text-[#A0A0A0] font-mono">ID: {id}</span>
      </div>
      
      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Trigger Badge */}
        <div className="bg-[#C7F33C]/10 border border-[#C7F33C]/30 text-black px-3 py-1.5 rounded-[10px] text-[11px] font-bold flex items-center gap-1.5">
          <Zap size={11} className="text-black" />
          <span className="truncate">Instagram: Kalit so&apos;z</span>
        </div>

        {/* Message Sub-block */}
        <div className="border border-[#E8E8E8] rounded-[14px] bg-[#FAFAFA] overflow-hidden">
          <div className="px-3 py-1.5 bg-[#F0F0F2] border-b border-[#E8E8E8] flex items-center gap-1.5">
            <MessageSquare size={10} className="text-[#707070]" />
            <span className="text-[9px] font-bold text-[#707070] uppercase">Xabar</span>
          </div>
          
          {/* Mock Media Banner */}
          <div className="h-20 bg-gradient-to-br from-[#D946EF] via-[#A855F7] to-[#6366F1] flex items-center justify-center p-2 relative">
            <div className="text-white text-[16px] font-black tracking-tight">sendly</div>
          </div>

          <div className="p-3 flex flex-col gap-2">
            <p className="text-[10px] text-black font-semibold leading-relaxed">
              {data.label || "Assalomu alaykum! Bizning sahifamizga xush kelibsiz. Obuna bo'ldingizmi?"}
            </p>

            {/* Buttons list */}
            <div className="flex flex-col gap-1.5 mt-1">
              {(data.buttons || [
                { id: "b1", label: "Ha, qatnashaman", type: "action" },
                { id: "b2", label: "Yo'q, qatnashmayman", type: "action" }
              ]).map((btn) => (
                <div key={btn.id} className="relative">
                  <div className="w-full text-center py-2 px-3 border border-[#E8E8E8] rounded-[10px] text-[10px] font-black bg-white hover:bg-neutral-50 text-black select-none truncate">
                    {btn.label}
                  </div>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`btn-${btn.id}`}
                    style={{
                      top: "50%",
                      right: -12,
                      background: "#C7F33C",
                      border: "1px solid black",
                      width: 8,
                      height: 8,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageNode({ data, id }: NodeProps<NodeData>) {
  return (
    <div className="w-[260px] bg-white border border-[#E8E8E8] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden text-black text-left">
      {/* Target input handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: 30,
          left: -4,
          background: "#A0A0A0",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-[#F5F5F7] px-4 py-2.5 border-b border-[#E8E8E8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={12} className="text-[#707070]" />
          <span className="text-[10px] font-black text-[#505050] uppercase tracking-wider">Xabar</span>
        </div>
        <span className="text-[9px] text-[#A0A0A0] font-mono">ID: {id}</span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <div className="p-3 bg-[#F9F9F7] rounded-[14px] border border-[#E8E8E8]">
          <p className="text-[10px] text-black font-semibold leading-relaxed">
            {data.label || "Suhbatni davom ettirish xabari..."}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5 mt-1">
          {(data.buttons || []).map((btn) => (
            <div key={btn.id} className="relative">
              <div className="w-full text-center py-2 px-3 border border-[#E8E8E8] rounded-[10px] text-[10px] font-black bg-white hover:bg-neutral-50 text-black select-none truncate">
                {btn.label}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`btn-${btn.id}`}
                style={{
                  top: "50%",
                  right: -12,
                  background: "#C7F33C",
                  border: "1px solid black",
                  width: 8,
                  height: 8,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionNode({ data, id }: NodeProps<NodeData>) {
  return (
    <div className="w-[260px] bg-white border border-[#E8E8E8] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden text-black text-left">
      {/* Target input handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: "50%",
          left: -4,
          background: "#A0A0A0",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-[#F5F5F7] px-4 py-2.5 border-b border-[#E8E8E8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#C7F33C]/20 flex items-center justify-center shrink-0">
            <Zap size={9} className="text-black" />
          </div>
          <span className="text-[10px] font-black text-[#505050] uppercase tracking-wider">Harakat</span>
        </div>
        <span className="text-[9px] text-[#A0A0A0] font-mono">ID: {id}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="p-3 bg-[#F9F9F7] rounded-[14px] border border-[#E8E8E8] flex flex-col gap-1">
          <p className="text-[9px] font-black text-[#707070] uppercase">Bajariladigan ish</p>
          <p className="text-[11px] text-black font-bold leading-tight">
            {data.label || "Tezkor javoblar tugmasiga kirdi"}
          </p>
        </div>
      </div>

      {/* Source output handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          top: "50%",
          right: -4,
          background: "#C7F33C",
          border: "1px solid black",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}

function ConditionNode({ data, id }: NodeProps<NodeData>) {
  return (
    <div className="w-[260px] bg-white border border-[#E8E8E8] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden text-black text-left">
      {/* Target input handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: 30,
          left: -4,
          background: "#A0A0A0",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-[#F5F5F7] px-4 py-2.5 border-b border-[#E8E8E8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#505050] uppercase tracking-wider">Shart</span>
        </div>
        <span className="text-[9px] text-[#A0A0A0] font-mono">ID: {id}</span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        <div className="p-3 bg-[#F9F9F7] rounded-[14px] border border-[#E8E8E8]">
          <p className="text-[9px] font-black text-[#707070] uppercase">Tekshirish sharti</p>
          <p className="text-[11px] text-black font-bold mt-0.5">
            {data.label || "Obuna bo'lganligi"}
          </p>
        </div>

        {/* Branching options with handles */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center justify-between p-2 rounded-[10px] border border-[#16A34A]/20 bg-[#16A34A]/5">
            <span className="text-[10px] font-bold text-[#16A34A]">Obuna bo&apos;lingan</span>
            <Handle
              type="source"
              position={Position.Right}
              id="yes"
              style={{
                top: "50%",
                right: -12,
                background: "#16A34A",
                border: "1px solid black",
                width: 8,
                height: 8,
              }}
            />
          </div>

          <div className="relative flex items-center justify-between p-2 rounded-[10px] border border-[#DC2626]/20 bg-[#DC2626]/5">
            <span className="text-[10px] font-bold text-[#DC2626]">Obuna bo&apos;linmagan</span>
            <Handle
              type="source"
              position={Position.Right}
              id="no"
              style={{
                top: "50%",
                right: -12,
                background: "#DC2626",
                border: "1px solid black",
                width: 8,
                height: 8,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitNode({ data, id }: NodeProps<NodeData>) {
  return (
    <div className="w-[260px] bg-white border border-[#E8E8E8] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden text-black text-left">
      {/* Target input handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: "50%",
          left: -4,
          background: "#A0A0A0",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-[#F5F5F7] px-4 py-2.5 border-b border-[#E8E8E8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-[#707070]" />
          <span className="text-[10px] font-black text-[#505050] uppercase tracking-wider">Kutish</span>
        </div>
        <span className="text-[9px] text-[#A0A0A0] font-mono">ID: {id}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="p-3 bg-[#F9F9F7] rounded-[14px] border border-[#E8E8E8] flex flex-col gap-1">
          <p className="text-[9px] font-black text-[#707070] uppercase">Muddati</p>
          <p className="text-[11px] text-black font-bold">
            {data.label || "Kutish: 15 Daqiqalar"}
          </p>
        </div>
      </div>

      {/* Source output handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          top: "50%",
          right: -4,
          background: "#C7F33C",
          border: "1px solid black",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}

// ─────────── COMPONENT ────────────
export default function BuilderPage() {
  const { t } = useI18n();

  const TEMPLATE_FLOWS: Record<string, { nodes: Node<NodeData>[]; edges: Edge[] }> = {
    lead_magnet: {
      nodes: [
        { id: "n1", type: "trigger", data: { label: "Instagram'da obunani tekshirish", nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "kitob, kurs, bonus", buttons: [{ id: "b1", label: "Ha, qatnashaman", type: "action" }, { id: "b2", label: "Yo'q, qatnashmayman", type: "action" }] }, position: { x: 50, y: 150 } },
        { id: "n2", type: "action", data: { label: "Tezkor javoblar: 'Qatnashaman' tugmasiga kirdi", nodeType: "action" }, position: { x: 380, y: 120 } },
        { id: "n3", type: "condition", data: { label: "Obuna bo'linganligi", nodeType: "condition", conditionType: "is_follower" }, position: { x: 700, y: 120 } },
        { id: "n4", type: "message", data: { label: "Yaxshi! Obuna bo'lganingiz uchun rahmat. Mana kitob havolasi: https://t.me/yourusername", nodeType: "message", buttons: [{ id: "b3", label: "Yuklab olish", type: "link", url: "https://example.com" }] }, position: { x: 1050, y: 50 } },
        { id: "n5", type: "message", data: { label: "Afsuski, siz hali obuna bo'lmagansiz. Iltimos obuna bo'ling va keyin 'Tekshirish' tugmasini bosing.", nodeType: "message", buttons: [{ id: "b4", label: "Obunani tekshirish", type: "action" }] }, position: { x: 1050, y: 250 } },
        { id: "n6", type: "wait", data: { label: "Kutish: 15 Daqiqalar", nodeType: "wait" }, position: { x: 380, y: 450 } },
        { id: "n7", type: "condition", data: { label: "Obuna bo'linganligi (Eslatma)", nodeType: "condition", conditionType: "is_follower" }, position: { x: 700, y: 450 } },
        { id: "n8", type: "message", data: { label: "Siz hali obuna bo'lmagansiz, bonusni olish uchun obuna bo'lishingiz kerak.", nodeType: "message" }, position: { x: 1050, y: 480 } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "btn-b1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e3", source: "n3", sourceHandle: "yes", target: "n4", animated: true, style: { stroke: "#16A34A", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#16A34A" } },
        { id: "e4", source: "n3", sourceHandle: "no", target: "n5", animated: true, style: { stroke: "#DC2626", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#DC2626" } },
        { id: "e5", source: "n1", sourceHandle: "btn-b2", target: "n6", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e6", source: "n6", target: "n7", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e7", source: "n7", sourceHandle: "no", target: "n8", animated: true, style: { stroke: "#DC2626", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#DC2626" } },
      ],
    },
    story_coupon: {
      nodes: [
        { id: "n1", type: "trigger", data: { label: t("pages.builder.tmpl_story_trigger_label"), nodeType: "trigger", triggerSource: "story_mention", triggerMatch: "any", buttons: [{ id: "b1", label: "Kuponni olish", type: "action" }] }, position: { x: 50, y: 150 } },
        { id: "n2", type: "message", data: { label: t("pages.builder.tmpl_story_msg_label"), nodeType: "message", buttons: [{ id: "b2", label: t("pages.builder.tmpl_story_msg_btn"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 380, y: 150 } },
        { id: "n3", type: "action", data: { label: t("pages.builder.tmpl_story_act_label"), nodeType: "action", actionType: "add_tag", actionValue: "story_user" }, position: { x: 700, y: 150 } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "btn-b1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", sourceHandle: "btn-b2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
      ],
    },
    comment_dm: {
      nodes: [
        { id: "n1", type: "trigger", data: { label: t("pages.builder.tmpl_comment_trigger_label"), nodeType: "trigger", triggerSource: "comment", triggerMatch: "contains", triggerKeywords: "narxi, batafsil, link", buttons: [{ id: "b1", label: "Batafsil ma'lumot", type: "action" }] }, position: { x: 50, y: 150 } },
        { id: "n2", type: "message", data: { label: t("pages.builder.tmpl_comment_msg1_label"), nodeType: "message", buttons: [] }, position: { x: 380, y: 150 } },
        { id: "n3", type: "message", data: { label: t("pages.builder.tmpl_comment_msg2_label"), nodeType: "message", buttons: [{ id: "b2", label: t("pages.builder.tmpl_comment_msg2_btn1"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 700, y: 150 } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "btn-b1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
      ],
    },
    welcome_faq: {
      nodes: [
        { id: "n1", type: "trigger", data: { label: t("pages.builder.tmpl_welcome_trigger_label"), nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "salom, start, boshlash", buttons: [{ id: "b1", label: "Boshlash", type: "action" }] }, position: { x: 50, y: 150 } },
        { id: "n2", type: "message", data: { label: t("pages.builder.tmpl_welcome_msg1_label"), nodeType: "message", buttons: [{ id: "b2", label: "Savol berish", type: "action" }, { id: "b3", label: "Kurslar haqida", type: "action" }] }, position: { x: 380, y: 150 } },
        { id: "n3", type: "message", data: { label: t("pages.builder.tmpl_welcome_msg2_label"), nodeType: "message", buttons: [] }, position: { x: 700, y: 50 } },
        { id: "n4", type: "message", data: { label: t("pages.builder.tmpl_welcome_msg3_label"), nodeType: "message", buttons: [] }, position: { x: 700, y: 250 } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "btn-b1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e2", source: "n2", sourceHandle: "btn-b2", target: "n3", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
        { id: "e3", source: "n2", sourceHandle: "btn-b3", target: "n4", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } },
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

  // Collapsible block palette and react-flow instance hooks
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [activeChannelName, setActiveChannelName] = useState("Flow 1");

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
    if (activeCh) {
      setActiveChannelName(activeCh.username.startsWith("@") ? activeCh.username : `@${activeCh.username}`);
    }

    if (paramTemplate && TEMPLATE_FLOWS[paramTemplate]) {
      const tflow = TEMPLATE_FLOWS[paramTemplate];
      setNodes(tflow.nodes);
      setEdges(tflow.edges);
      const found = activeCh
        ? db.getChannelAutomations(activeCh.id).find((a) => a.id === paramId)
        : db.getAutomations().find((a) => a.id === paramId);
      if (found) setBotName(found.name);
      else setBotName(paramTemplate === "lead_magnet" ? "Instagram'da obunani tekshirish" : t("pages.builder.new_flow"));
    } else if (paramId) {
      const found = activeCh
        ? db.getChannelAutomations(activeCh.id).find((a) => a.id === paramId)
        : db.getAutomations().find((a) => a.id === paramId);
      if (found) {
        setBotName(found.name);
        setNodes([
          { id: "n1", type: "trigger", data: { label: found.triggerDetails || "Instagram'da obunani tekshirish", nodeType: "trigger", triggerSource: found.triggerType === "story" ? "story_mention" : "dm", triggerMatch: "contains", triggerKeywords: found.triggerDetails }, position: { x: 50, y: 150 } },
          { id: "n2", type: "message", data: { label: found.replyText || t("pages.builder.initial_msg_connected"), nodeType: "message", buttons: [] }, position: { x: 380, y: 150 } },
        ]);
        setEdges([{ id: "e1", source: "n1", target: "n2", animated: true, style: { stroke: "#000", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#000" } }]);
      }
    } else {
      setBotName(t("pages.builder.new_flow"));
      setNodes([
        { id: "n1", type: "trigger", data: { label: t("pages.builder.initial_trigger_kw"), nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "salom, narx" }, position: { x: 50, y: 150 } },
        { id: "n2", type: "message", data: { label: t("pages.builder.initial_msg_how_help"), nodeType: "message", buttons: [] }, position: { x: 380, y: 150 } },
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
    const messageNode = nodes.find((n) => n.data.nodeType === "message");
    const replyText = messageNode?.data.label || "";
    const src = triggerNode?.data.triggerSource || "dm";
    const isStory = src.includes("story");
    let savedMsg = t("pages.builder.saved_toast");

    if (paramId) {
      const idx = list.findIndex((a) => a.id === paramId);
      if (idx > -1) {
        list[idx] = { ...list[idx], name: botName, triggerType: isStory ? "story" : "keyword", triggerDetails: triggerNode?.data.triggerKeywords || src, replyText };
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
        completion: "0%", 
        active: shouldBeActive,
        replyText
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
    const configs: Record<NodeType, { label: string; data: Partial<NodeData> }> = {
      trigger: { label: t("pages.builder.block_trigger"), data: { nodeType: "trigger", triggerSource: "dm", triggerMatch: "contains", triggerKeywords: "", buttons: [] } },
      message: { label: t("pages.builder.block_message"), data: { nodeType: "message", buttons: [] } },
      wait: { label: "Kutish: 15 Daqiqalar", data: { nodeType: "wait" } },
      condition: { label: "Obuna bo'linganligi", data: { nodeType: "condition", conditionType: "is_follower", conditionValue: "" } },
      action: { label: "Tezkor javoblar tugmasiga kirdi", data: { nodeType: "action", actionType: "add_tag", actionValue: "" } },
      ai: { label: t("pages.builder.ai_request_title"), data: { nodeType: "ai", aiPrompt: "", aiOutputVar: "ai_response" } },
    };
    const cfg = configs[type];
    const newNode: Node<NodeData> = { id, type, data: { label: cfg.label, ...cfg.data }, position: { x: 250, y: nodes.length * 120 + 50 } };
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

  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    message: MessageNode,
    condition: ConditionNode,
    action: ActionNode,
    wait: WaitNode,
  }), []);

  if (!mounted) return <div className="flex h-screen items-center justify-center bg-[#E8E8E8] text-black text-[13px]">{t("common.loading")}</div>;

  const nodeType = selectedNode?.data.nodeType;

  return (
    <div className="min-h-screen w-full bg-[#E8E8E8] p-6 flex gap-4 overflow-hidden h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white border border-[#E8E8E8] rounded-[24px] overflow-hidden shadow-sm relative h-full">
        {/* Toast */}
        {showToast && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-2xl border border-[#C7F33C]/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle size={16} className="text-[#C7F33C]" />
            <span className="text-[13px] font-medium">{toastMsg}</span>
          </div>
        )}

        {/* Top Header */}
        <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#E8E8E8] bg-white px-6 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/automations">
              <button className="grid h-10 w-10 place-items-center rounded-full border border-[#E8E8E8] hover:bg-[#F0F0F0] transition-colors text-[#707070] hover:text-black shrink-0">
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
            </Link>
            <div className="flex flex-col text-left">
              <input
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="text-[15px] font-black text-black bg-transparent outline-none border-b border-transparent focus:border-black transition-all min-w-0 truncate"
              />
              <span className="text-[10px] text-[#707070] font-medium leading-none mt-0.5">{activeChannelName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 h-9 text-[11px] font-extrabold bg-[#FAFAFA] border border-[#E8E8E8] rounded-full hover:bg-[#F0F0F0] text-black shrink-0 transition-colors">
              <Settings size={12} />
              <span>Ishga tushirish triggerlari</span>
            </button>
            <button className="flex items-center gap-1.5 px-5 h-9 text-[11px] font-extrabold bg-black text-white rounded-full hover:bg-neutral-800 shrink-0 transition-all active:scale-[0.98]" onClick={handleSaveFlow}>
              <Save size={12} />
              <span>Saqlash</span>
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Collapsible Left Palette */}
          {isPaletteOpen && (
            <aside className="w-[240px] shrink-0 border-r border-[#E8E8E8] bg-white p-4 flex flex-col gap-3 overflow-y-auto z-20 shadow-md">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-[#F0F0F0] mb-1">
                <p className="text-[10px] font-black text-[#A0A0A0] uppercase tracking-wider">{t("pages.builder.blocks_title")}</p>
                <button onClick={() => setIsPaletteOpen(false)} className="text-[#A0A0A0] hover:text-black transition-colors">
                  <X size={14} />
                </button>
              </div>
              {([
                { type: "trigger" as NodeType, icon: <Zap size={13} />, label: t("pages.builder.block_trigger"), sub: t("pages.builder.block_trigger_sub"), cls: "bg-[#C7F33C]/10 text-black border border-[#C7F33C]/35 hover:bg-[#C7F33C]/20" },
                { type: "message" as NodeType, icon: <MessageSquare size={13} className="text-[#707070]" />, label: t("pages.builder.block_message"), sub: t("pages.builder.block_message_sub"), cls: "bg-white text-black border border-[#E8E8E8] hover:bg-[#F9F9F7]" },
                { type: "condition" as NodeType, icon: <ShieldAlert size={13} className="text-black" />, label: t("pages.builder.block_condition"), sub: t("pages.builder.block_condition_sub"), cls: "bg-black text-white hover:bg-black/90" },
                { type: "action" as NodeType, icon: <Tag size={13} className="text-[#707070]" />, label: t("pages.builder.block_action"), sub: t("pages.builder.block_action_sub"), cls: "bg-[#F0F0F0] text-black border border-[#dcdcdc] hover:bg-[#e4e4e4]" },
                { type: "wait" as NodeType, icon: <Clock size={13} className="text-[#707070]" />, label: t("pages.builder.block_wait"), sub: t("pages.builder.block_wait_sub"), cls: "bg-[#F0F0F0] text-black border border-[#dcdcdc] hover:bg-[#e4e4e4]" },
              ]).map(({ type, icon, label, sub, cls }) => (
                <button key={type} onClick={() => addNewNode(type)} className={`flex w-full items-center gap-3 rounded-[12px] p-3 text-left transition-colors ${cls}`}>
                  {icon}
                  <div>
                    <div className="text-[11px] font-bold leading-none">{label}</div>
                    <div className="text-[9px] opacity-60 mt-1 leading-none">{sub}</div>
                  </div>
                </button>
              ))}
            </aside>
          )}

          {/* Canvas area */}
          <main className="flex-1 relative bg-[#F5F5F7]">
            {/* Palette Trigger stack layers icon button */}
            <button
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="absolute top-4 left-4 z-30 w-10 h-10 bg-white border border-[#E8E8E8] rounded-xl flex items-center justify-center shadow-sm text-[#707070] hover:text-black hover:border-black transition-colors"
              title="Palitrani ochish/yopish"
            >
              <Layers size={16} />
            </button>

            {/* Canvas control panel right */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 bg-white/80 backdrop-blur-md p-1 border border-[#E8E8E8] rounded-2xl shadow-sm">
              <button
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#707070] hover:text-black hover:bg-[#F5F5F5] transition-all"
                title="Blok qo'shish"
              >
                <Plus size={14} />
              </button>
              <div className="h-[1px] bg-[#E8E8E8] mx-1" />
              <button
                onClick={() => reactFlowInstance?.zoomIn()}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-black hover:bg-[#F5F5F5] transition-all font-bold text-[14px]"
                title="Yaqinlashtirish"
              >
                +
              </button>
              <button
                onClick={() => reactFlowInstance?.zoomOut()}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-black hover:bg-[#F5F5F5] transition-all font-bold text-[14px]"
                title="Uzoqlashtirish"
              >
                −
              </button>
              <button
                onClick={() => reactFlowInstance?.fitView()}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#707070] hover:text-black hover:bg-[#F5F5F5] transition-all"
                title="Ekranga moslash"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>

            {/* Bottom-right AI Improvement widgets */}
            <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3">
              <button className="h-10 bg-black hover:bg-neutral-900 text-white rounded-full px-5 flex items-center gap-2 text-[11px] font-black shadow-lg transition-all active:scale-[0.98]">
                <Zap size={11} className="text-[#C7F33C] fill-[#C7F33C]" />
                <span>AI bilan stsenariylarni yaxshilash</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-[#1F69FF] hover:bg-blue-600 flex items-center justify-center text-white shadow-lg cursor-pointer transition-all active:scale-[0.98]">
                <MessageSquare size={14} />
              </div>
            </div>

            {/* ReactFlow Canvas */}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              onInit={setReactFlowInstance}
              fitView
            >
              <Background color="#000" gap={16} size={1} style={{ opacity: 0.05 }} />
            </ReactFlow>
          </main>

          {/* Right Inspector */}
          <aside className="w-[300px] shrink-0 border-l border-[#E8E8E8] bg-white overflow-y-auto">
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

                <div className="px-4 py-4 flex flex-col gap-5 text-left text-black">

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
                          className="w-full min-h-[130px] rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none resize-none focus:bg-[#e8e8e8] transition-colors leading-relaxed animate-none"
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
                                className="flex-1 text-[12px] font-medium bg-transparent outline-none text-black"
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
                                  className="w-full text-[11px] bg-[#F0F0F0] rounded-[8px] px-3 py-1.5 outline-none text-black"
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
                      <div className="flex gap-2 flex-wrap text-black">
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
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-6 text-black">
                <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[#F0F0F0]">
                  <Zap size={22} className="opacity-30 text-black" />
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
    </div>
  );
}

