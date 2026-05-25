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
  useReactFlow,
  getBezierPath,
  EdgeProps,
  useEdges,
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
  Trash2,
  Copy,
  MessageCircle,
  Layers,
  Eye,
  Flame,
  Send,
  AtSign,
  CreditCard,
  Radio,
  Filter,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { Instagram } from "@/components/ui/icons";

// ─────────── TYPES ────────────
type NodeType = "trigger" | "message" | "wait" | "condition" | "action" | "ai";

type ButtonItem = { id: string; label: string; type: "action" | "link" | "payment"; url?: string; multipleClick?: boolean };

interface NodeData {
  label: string;
  nodeType?: NodeType;
  isEntryPoint?: boolean;
  imageUrl?: string;
  triggerSource?: string;
  triggerMatch?: string;
  triggerKeywords?: string;
  prohibitRestart?: boolean;
  conditionType?: string;
  conditionValue?: string;
  actionType?: string;
  actionValue?: string;
  aiPrompt?: string;
  aiOutputVar?: string;
  buttons?: ButtonItem[];
}

// ─────────── CUSTOM EDGE COMPONENT ────────────

function ButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { setEdges } = useReactFlow();

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <path
        id={id}
        style={{ ...style, strokeWidth: 2, stroke: style.stroke || "#A0A0A0" }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <foreignObject
        width={20}
        height={20}
        x={labelX - 10}
        y={labelY - 10}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <button
          className="w-5 h-5 bg-white border border-[#E8E8E8] text-[#707070] hover:text-red-500 hover:border-red-200 rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-110 active:scale-95 p-0"
          onClick={onEdgeClick}
          title="Ulanishni o'chirish"
          type="button"
        >
          <X size={10} strokeWidth={3} />
        </button>
      </foreignObject>
    </>
  );
}

// ─────────── CUSTOM NODE COMPONENTS ────────────

// TriggerNode has been removed. Triggers are now managed at flow-level.

function MessageNode({ data, id }: NodeProps<NodeData>) {
  const { setNodes, setEdges } = useReactFlow();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isEntryPoint = data.isEntryPoint;
  
  return (
    <div className="w-[280px] bg-white border border-[#F2F2F7] rounded-lg shadow-sm overflow-visible text-black text-left relative">
      {isEntryPoint && (
        <div className="absolute -top-[34px] left-0 flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E5EA] rounded-full shadow-sm text-[10px] font-bold text-black select-none z-10 animate-in fade-in slide-in-from-bottom-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#3B82F6] shrink-0">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Entry point</span>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: 24,
          left: -4,
          background: "#9296AD",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />
      
      {/* Node Header */}
      <div className="bg-white px-4 py-3 border-b border-[#F2F2F7] flex items-center justify-between rounded-t-lg h-[45px]">
        <div className="flex items-center gap-2">
          <MessageCircle size={15} className="text-[#3B82F6]" strokeWidth={2.5} />
          <span className="text-[13px] font-bold text-black tracking-wide">Message</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#8E8E93] flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#8E8E93]">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            0
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNodes((nds) => nds.filter((n) => n.id !== id));
              setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
            }}
            className="p-1 rounded-full hover:bg-red-50 text-[#707070] hover:text-red-500 transition-colors cursor-pointer"
            title="Blokni o'chirish"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {/* Content Stack */}
      <div className="p-3 flex flex-col gap-3 overflow-visible">
        {/* Image Block */}
        {data.imageUrl && (
          <div className="relative group/image">
            {/* Left-floating delete button */}
            <div className="absolute -left-[48px] top-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, imageUrl: undefined } } : n));
                }}
                className="w-8 h-8 bg-white border border-[#E8E8E8] text-[#707070] hover:text-red-500 hover:border-red-200 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95"
                title="Rasm blokini o'chirish"
              >
                <Trash2 size={13} />
              </button>
            </div>
            
            {/* Image Card Container */}
            <div className="w-full h-[120px] rounded-lg overflow-hidden border border-[#E5E5EA] bg-[#FAFAFA] flex items-center justify-center relative shadow-sm select-none p-1">
              <div className="w-full h-full rounded-md overflow-hidden bg-gradient-to-tr from-[#9B51E0] to-[#2F80ED] flex items-center justify-center relative">
                {/* Sendly lightning bolt logo inside */}
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M13.5 2c.3 3.5-1.5 5.2-3 6.8C9 10.5 7.5 12 8 14.5 8.4 16.7 10 18 12 18c0-2 .8-3 2-4.2 1.4-1.4 3-3 2.6-6C16.2 5 14.8 3.3 13.5 2Z"
                      fill="#C7F33C"
                    />
                    <path
                      d="M9.5 14c-.6 1-1 2-1 3 0 2.5 1.6 4 3.5 4s3.5-1.5 3.5-4c0-1-.4-2-1-3-.3 1.5-1.2 2.3-2.5 2.3S9.8 15.5 9.5 14Z"
                      fill="#9BC92E"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text Block */}
        {data.label !== "" && data.label !== undefined && (
          <div className="relative group/text">
            {/* Left-floating delete button */}
            <div className="absolute -left-[48px] top-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: "" } } : n));
                }}
                className="w-8 h-8 bg-white border border-[#E8E8E8] text-[#707070] hover:text-red-500 hover:border-red-200 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95"
                title="Matn blokini o'chirish"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Text bubble */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent("edit-node-text", { detail: { nodeId: id } }));
              }}
              className="text-[12px] text-black font-medium leading-relaxed p-3.5 border border-[#E5E5EA] bg-white rounded-xl shadow-sm cursor-pointer whitespace-pre-wrap select-none hover:border-black/20 hover:bg-neutral-50/30 transition-all"
            >
              {data.label || "Suhbatni davom ettirish xabari..."}
            </div>
          </div>
        )}

        {/* Buttons Block */}
        {data.buttons && data.buttons.length > 0 && (
          <div className="relative group/buttons">
            {/* Left-floating delete button */}
            <div className="absolute -left-[48px] top-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, buttons: [] } } : n));
                }}
                className="w-8 h-8 bg-white border border-[#E8E8E8] text-[#707070] hover:text-red-500 hover:border-red-200 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95"
                title="Tugmalar blokini o'chirish"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Buttons list container */}
            <div className="flex flex-col gap-2 p-2 border border-[#E5E5EA] rounded-xl bg-white shadow-sm overflow-visible">
              {data.buttons.map((btn) => (
                <div key={btn.id} className="relative group/btn-item overflow-visible">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent("edit-button", { detail: { nodeId: id, buttonId: btn.id } }));
                    }}
                    className="w-full flex items-center justify-between py-2.5 px-4 border border-[#E5E5EA] hover:border-black rounded-lg text-[11px] font-bold bg-white text-black select-none cursor-pointer transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate text-left">{btn.label}</span>
                    </div>
                    
                    {/* Hover reveal controls */}
                    <div className="flex items-center gap-1 shrink-0 ml-1.5 opacity-0 group-hover/btn-item:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newId = `btn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                          const duplicatedBtn = { ...btn, id: newId, label: `${btn.label} (Nusxa)` };
                          setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, buttons: [...(n.data.buttons || []), duplicatedBtn] } } : n));
                        }}
                        className="p-0.5 rounded hover:bg-neutral-100 text-[#707070] hover:text-black transition-colors"
                        title="Nusxalash"
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, buttons: (n.data.buttons || []).filter(b => b.id !== btn.id) } } : n));
                        }}
                        className="p-0.5 rounded hover:bg-red-50 text-[#707070] hover:text-red-500 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`btn-${btn.id}`}
                    style={{
                      top: "50%",
                      right: -14,
                      background: "#9296AD",
                      border: "1px solid white",
                      width: 8,
                      height: 8,
                    }}
                  />
                </div>
              ))}

              {/* Inner + Add button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newId = `btn-${Date.now()}`;
                  const newBtn = { id: newId, label: "Tugma", type: "action" as const };
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, buttons: [...(n.data.buttons || []), newBtn] } } : n));
                  window.dispatchEvent(new CustomEvent("edit-button", { detail: { nodeId: id, buttonId: newId } }));
                }}
                className="w-full text-center py-2.5 border border-dashed border-[#E5E5EA] hover:border-black/30 rounded-lg text-[10.5px] font-extrabold text-[#707070] hover:text-black flex items-center justify-center gap-1 transition-all bg-white cursor-pointer"
              >
                <span>+ Add button</span>
              </button>
            </div>
          </div>
        )}

        {/* Add Content Trigger / Dropdown Menu */}
        {showAddMenu ? (
          <div className="border border-dashed border-[#E5E5EA] rounded-xl p-3 bg-[#FAFAFA] flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-sm relative overflow-visible">
            <div className="text-[9px] font-bold text-[#707070] uppercase tracking-wider mb-1 px-1">Kontent turi:</div>
            <div className="grid grid-cols-2 gap-1.5">
              {!data.imageUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, imageUrl: "/logo.svg" } } : n));
                    setShowAddMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] hover:border-black/20 rounded-lg text-[10.5px] font-bold text-black cursor-pointer transition-all hover:scale-102 shadow-sm"
                >
                  <span>🖼️ Rasm</span>
                </button>
              )}
              {(data.label === "" || !data.label) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: "Yangi matn xabari..." } } : n));
                    setShowAddMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] hover:border-black/20 rounded-lg text-[10.5px] font-bold text-black cursor-pointer transition-all hover:scale-102 shadow-sm"
                >
                  <span>✍️ Matn</span>
                </button>
              )}
              {(!data.buttons || data.buttons.length === 0) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newBtn = { id: `btn-${Date.now()}`, label: "Tugma", type: "action" as const };
                    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, buttons: [newBtn] } } : n));
                    setShowAddMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] hover:border-black/20 rounded-lg text-[10.5px] font-bold text-black cursor-pointer transition-all hover:scale-102 shadow-sm col-span-2 justify-center"
                >
                  <span>🔘 Tugmalar bloki</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(false);
              }}
              className="w-full text-center py-1 text-red-500 hover:text-red-600 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer mt-1 border-none bg-transparent"
            >
              Yopish
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(true);
            }}
            className="w-full text-center py-2.5 border border-dashed border-[#D8D8D8] hover:border-black/20 hover:bg-[#FAFAFA] rounded-lg text-[10.5px] font-extrabold text-[#707070] hover:text-black flex items-center justify-center gap-1 transition-all bg-white cursor-pointer shadow-sm"
          >
            <span>+ kontent qo&apos;shish</span>
          </button>
        )}
      </div>

      {/* Default bottom-right output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        style={{
          bottom: 24,
          top: "auto",
          right: -4,
          background: "#9296AD",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}

function ActionNode({ data, id }: NodeProps<NodeData>) {
  const { setNodes, setEdges } = useReactFlow();

  return (
    <div className="w-[280px] bg-white border border-[#F2F2F7] rounded-lg shadow-sm overflow-visible text-black text-left relative">
      {data.isEntryPoint && (
        <div className="absolute -top-[34px] left-0 flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E5EA] rounded-full shadow-sm text-[10px] font-bold text-black select-none z-10 animate-in fade-in slide-in-from-bottom-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#3B82F6] shrink-0">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Entry point</span>
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: "50%",
          left: -4,
          background: "#9296AD",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-white px-4 py-3 border-b border-[#F2F2F7] flex items-center justify-between rounded-t-lg h-[45px]">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-black" />
          <span className="text-[12px] font-bold text-black uppercase tracking-wider">Harakat</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNodes((nds) => nds.filter((n) => n.id !== id));
            setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
          }}
          className="p-1 rounded-full hover:bg-red-50 text-[#707070] hover:text-red-500 transition-colors cursor-pointer"
          title="Blokni o'chirish"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="text-[9px] font-bold text-[#707070] uppercase">
              {data.actionType === "add_tag" ? "Teg qo'shish" : data.actionType === "remove_tag" ? "Tegni olib tashlash" : data.actionType === "webhook" ? "Vebxuk yuborish" : data.actionType === "notify_telegram" ? "Telegram xabarnomasi" : "Harakat turi"}
            </p>
            <p className="text-[11px] text-black font-extrabold truncate mt-0.5">
              {data.actionValue || "Tanlanmagan"}
            </p>
          </div>
          {/* Pencil Edit Icon */}
          <svg className="w-3.5 h-3.5 text-[#707070] shrink-0 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          top: "50%",
          right: -4,
          background: "#9296AD",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}

function ConditionNode({ data, id }: NodeProps<NodeData>) {
  const { setNodes, setEdges } = useReactFlow();

  return (
    <div className="w-[280px] bg-white border border-[#F2F2F7] rounded-lg shadow-sm overflow-visible text-black text-left relative">
      {data.isEntryPoint && (
        <div className="absolute -top-[34px] left-0 flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E5EA] rounded-full shadow-sm text-[10px] font-bold text-black select-none z-10 animate-in fade-in slide-in-from-bottom-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#3B82F6] shrink-0">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Entry point</span>
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: 30,
          left: -4,
          background: "#9296AD",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-white px-4 py-3 border-b border-[#F2F2F7] flex items-center justify-between rounded-t-lg h-[45px]">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={12} className="text-black" />
          <span className="text-[12px] font-bold text-black uppercase tracking-wider">Shart</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNodes((nds) => nds.filter((n) => n.id !== id));
            setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
          }}
          className="p-1 rounded-full hover:bg-red-50 text-[#707070] hover:text-red-500 transition-colors cursor-pointer"
          title="Blokni o'chirish"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2">
        <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl p-2.5 flex flex-col gap-2 overflow-visible">
          {/* Condition Row */}
          <div className="relative flex items-center justify-between py-1.5 px-2 bg-white border border-[#E5E5EA] rounded-lg text-[10.5px] font-bold text-black">
            <span>{data.label || "Obuna"}</span>
            <Handle
              type="source"
              position={Position.Right}
              id="yes"
              style={{
                top: "50%",
                right: -14,
                background: "#9296AD",
                border: "1px solid white",
                width: 8,
                height: 8,
              }}
            />
          </div>

          <button type="button" className="w-full text-center py-2 border border-dashed border-[#D8D8D8] rounded-lg text-[10px] font-bold text-black bg-white hover:bg-neutral-50 cursor-pointer">
            + Shart qo&apos;shish
          </button>
        </div>

        {/* Fallback output at bottom-right */}
        <div className="relative flex items-center justify-end pr-2 pt-1">
          <span className="text-[9.5px] text-[#707070] font-semibold">Shartlarga mos emas</span>
          <Handle
            type="source"
            position={Position.Right}
            id="no"
            style={{
              bottom: 8,
              top: "auto",
              right: -4,
              background: "#9296AD",
              border: "1px solid white",
              width: 8,
              height: 8,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function WaitNode({ data, id }: NodeProps<NodeData>) {
  const { setNodes, setEdges } = useReactFlow();

  return (
    <div className="w-[280px] bg-white border border-[#F2F2F7] rounded-lg shadow-sm overflow-visible text-black text-left relative">
      {data.isEntryPoint && (
        <div className="absolute -top-[34px] left-0 flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E5EA] rounded-full shadow-sm text-[10px] font-bold text-black select-none z-10 animate-in fade-in slide-in-from-bottom-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#3B82F6] shrink-0">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Entry point</span>
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          top: "50%",
          left: -4,
          background: "#9296AD",
          border: "1px solid white",
          width: 8,
          height: 8,
        }}
      />

      {/* Node Header */}
      <div className="bg-white px-4 py-3 border-b border-[#F2F2F7] flex items-center justify-between rounded-t-lg h-[45px]">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-black" />
          <span className="text-[12px] font-bold text-black uppercase tracking-wider">Harakat</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNodes((nds) => nds.filter((n) => n.id !== id));
            setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
          }}
          className="p-1 rounded-full hover:bg-red-50 text-[#707070] hover:text-red-500 transition-colors cursor-pointer"
          title="Blokni o'chirish"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="text-[9px] font-bold text-[#707070] uppercase">Kechikish</p>
            <p className="text-[11px] text-black font-extrabold truncate mt-0.5">
              {data.label || "15 Daqiqalar"}
            </p>
          </div>
          <Clock size={13} className="text-[#707070] shrink-0 ml-1.5" />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          top: "50%",
          right: -4,
          background: "#9296AD",
          border: "1px solid white",
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
        { id: "n1", type: "message", data: { label: "Hi, want to get a lesson on setting up automation in Direct with a subscription check and lead magnet delivery?", nodeType: "message", imageUrl: "/logo.svg", isEntryPoint: true, buttons: [{ id: "b1", label: "Yes, I do!🤩", type: "action" }, { id: "b2", label: "Nomini kiriting", type: "action" }] }, position: { x: 100, y: 150 } },
        { id: "n2", type: "action", data: { label: "clicked the button scheme", nodeType: "action" }, position: { x: 450, y: 120 } },
        { id: "n3", type: "condition", data: { label: "Obuna", nodeType: "condition", conditionType: "is_follower" }, position: { x: 770, y: 120 } },
        { id: "n4", type: "message", data: { label: "Yaxshi! Obuna bo'lganingiz uchun rahmat. Mana kitob havolasi: https://t.me/yourusername", nodeType: "message", buttons: [{ id: "b3", label: "Yuklab olish", type: "link", url: "https://example.com" }] }, position: { x: 1120, y: 50 } },
        { id: "n5", type: "message", data: { label: "Afsuski, siz hali obuna bo'lmagansiz. Iltimos obuna bo'ling va keyin 'Tekshirish' tugmasini bosing.", nodeType: "message", buttons: [{ id: "b4", label: "Obunani tekshirish", type: "action" }] }, position: { x: 1120, y: 250 } },
        { id: "n6", type: "wait", data: { label: "10 Daqiqalar", nodeType: "wait" }, position: { x: 450, y: 450 } },
        { id: "n7", type: "condition", data: { label: "Obuna (Eslatma)", nodeType: "condition", conditionType: "is_follower" }, position: { x: 770, y: 450 } },
        { id: "n8", type: "message", data: { label: "Siz hali obuna bo'lmagansiz, bonusni olish uchun obuna bo'lishingiz kerak.", nodeType: "message" }, position: { x: 1120, y: 480 } },
      ],
      edges: [
        { id: "e2", source: "n1", sourceHandle: "btn-b1", target: "n2", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
        { id: "e3", source: "n2", target: "n3", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
        { id: "e4", source: "n3", sourceHandle: "yes", target: "n4", animated: true, style: { stroke: "#16A34A", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#16A34A" } },
        { id: "e5", source: "n3", sourceHandle: "no", target: "n5", animated: true, style: { stroke: "#DC2626", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#DC2626" } },
        { id: "e6", source: "n1", sourceHandle: "btn-b2", target: "n6", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
        { id: "e7", source: "n6", target: "n7", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
        { id: "e8", source: "n7", sourceHandle: "no", target: "n8", animated: true, style: { stroke: "#DC2626", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#DC2626" } },
      ],
    },
    story_coupon: {
      nodes: [
        { id: "n1", type: "message", data: { label: t("pages.builder.tmpl_story_msg_label"), nodeType: "message", isEntryPoint: true, buttons: [{ id: "b2", label: t("pages.builder.tmpl_story_msg_btn"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 100, y: 150 } },
        { id: "n2", type: "action", data: { label: t("pages.builder.tmpl_story_act_label"), nodeType: "action", actionType: "add_tag", actionValue: "story_user" }, position: { x: 450, y: 150 } },
      ],
      edges: [
        { id: "e2", source: "n1", sourceHandle: "btn-b2", target: "n2", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
      ],
    },
    comment_dm: {
      nodes: [
        { id: "n1", type: "message", data: { label: t("pages.builder.tmpl_comment_msg1_label"), nodeType: "message", isEntryPoint: true, buttons: [] }, position: { x: 100, y: 150 } },
        { id: "n2", type: "message", data: { label: t("pages.builder.tmpl_comment_msg2_label"), nodeType: "message", buttons: [{ id: "b2", label: t("pages.builder.tmpl_comment_msg2_btn1"), type: "link", url: "https://t.me/yourusername" }] }, position: { x: 450, y: 150 } },
      ],
      edges: [
        { id: "e2", source: "n1", target: "n2", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
      ],
    },
    welcome_faq: {
      nodes: [
        { id: "n1", type: "message", data: { label: t("pages.builder.tmpl_welcome_msg1_label"), nodeType: "message", isEntryPoint: true, buttons: [{ id: "b2", label: "Savol berish", type: "action" }, { id: "b3", label: "Kurslar haqida", type: "action" }] }, position: { x: 100, y: 150 } },
        { id: "n2", type: "message", data: { label: t("pages.builder.tmpl_welcome_msg2_label"), nodeType: "message", buttons: [] }, position: { x: 450, y: 50 } },
        { id: "n3", type: "message", data: { label: t("pages.builder.tmpl_welcome_msg3_label"), nodeType: "message", buttons: [] }, position: { x: 450, y: 250 } },
      ],
      edges: [
        { id: "e2", source: "n1", sourceHandle: "btn-b2", target: "n2", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
        { id: "e3", source: "n1", sourceHandle: "btn-b3", target: "n3", animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } },
      ],
    },
  };

  const TRIGGER_SOURCES = [
    { value: "message_recognition", label: "Message recognition", icon: Eye },
    { value: "dm", label: "Direct Message", icon: MessageCircle },
    { value: "comment", label: "Post Comment", icon: MessageSquare },
    { value: "live_comment", label: "Live Stream Comment", icon: Radio },
    { value: "story_reaction", label: "Story Reaction", icon: Flame },
    { value: "story_reply", label: "Story Reply", icon: Send },
    { value: "story_mention", label: "Story Mention", icon: AtSign },
    { value: "payment", label: "Successful Payment", icon: CreditCard },
  ];

  const TRIGGER_MATCHES = [
    { value: "any", label: "Any message" },
    { value: "is", label: "Message is" },
    { value: "contains", label: "Message contains" },
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
  const [selectedButton, setSelectedButton] = useState<{ nodeId: string; buttonId: string } | null>(null);

  // Collapsible block palette and react-flow instance hooks
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [activeChannelName, setActiveChannelName] = useState("Flow 1");

  // Inspector fields
  const [inspLabel, setInspLabel] = useState("");
  const [inspTriggerSource, setInspTriggerSource] = useState("dm");
  const [inspTriggerMatch, setInspTriggerMatch] = useState("contains");
  const [inspTriggerKeywords, setInspTriggerKeywords] = useState("");
  const [inspProhibitRestart, setInspProhibitRestart] = useState(false);
  const [inspConditionType, setInspConditionType] = useState("is_follower");
  const [inspConditionValue, setInspConditionValue] = useState("");
  const [inspActionType, setInspActionType] = useState("add_tag");
  const [inspActionValue, setInspActionValue] = useState("");
  const [inspAiPrompt, setInspAiPrompt] = useState("");
  const [inspAiOutputVar, setInspAiOutputVar] = useState("ai_response");
  const [inspButtons, setInspButtons] = useState<ButtonItem[]>([]);

  const [isRichEditorOpen, setIsRichEditorOpen] = useState(false);
  const [showRichEmojiList, setShowRichEmojiList] = useState(false);

  const [entryPointId, setEntryPointId] = useState<string>("n1");
  const [flowTriggerSource, setFlowTriggerSource] = useState("dm");
  const [flowTriggerMatch, setFlowTriggerMatch] = useState("contains");
  const [flowTriggerKeywords, setFlowTriggerKeywords] = useState("");
  const [flowProhibitRestart, setFlowProhibitRestart] = useState(false);
  const [isEditingTrigger, setIsEditingTrigger] = useState(false);

  const openTriggerSettings = () => {
    setIsEditingTrigger(true);
    setSelectedNode(null);
    setSelectedButton(null);
    setInspTriggerSource(flowTriggerSource);
    setInspTriggerMatch(flowTriggerMatch);
    setInspTriggerKeywords(flowTriggerKeywords);
    setInspProhibitRestart(flowProhibitRestart);
  };

  const handleSaveTriggerDetails = () => {
    setFlowTriggerSource(inspTriggerSource);
    setFlowTriggerMatch(inspTriggerMatch);
    setFlowTriggerKeywords(inspTriggerKeywords);
    setFlowProhibitRestart(inspProhibitRestart);
    setIsEditingTrigger(false);
    
    setToastMsg("Trigger sozlamalari muvaffaqiyatli saqlandi!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  useEffect(() => {
    const handleSetEntryPoint = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      setEntryPointId(nodeId);
      setToastMsg("Boshlanish bloki (Entry point) belgilandi!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    };
    window.addEventListener("set-entry-point", handleSetEntryPoint);
    return () => window.removeEventListener("set-entry-point", handleSetEntryPoint);
  }, []);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isEntryPoint: n.id === entryPointId,
        },
      }))
    );
  }, [entryPointId, setNodes]);

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

    if (paramId) {
      const found = activeCh
        ? db.getChannelAutomations(activeCh.id).find((a) => a.id === paramId)
        : db.getAutomations().find((a) => a.id === paramId);
      if (found) {
        setBotName(found.name);

        const savedDiagram = localStorage.getItem(`flow_diagram_${paramId}`);
        if (savedDiagram) {
          try {
            const parsed = JSON.parse(savedDiagram);
            let loadedNodes: Node<NodeData>[] = parsed.nodes || [];
            let loadedEdges: Edge[] = parsed.edges || [];
            let entryId = parsed.entryPointId || "n1";
            let tSource = parsed.flowTriggerSource || "dm";
            let tMatch = parsed.flowTriggerMatch || "contains";
            let tKeywords = parsed.flowTriggerKeywords || "";
            let tProhibitRestart = parsed.flowProhibitRestart || false;

            // Automatically migrate legacy visual trigger nodes
            const triggerNode = loadedNodes.find((n) => n.type === "trigger" || n.data?.nodeType === "trigger");
            if (triggerNode) {
              tSource = triggerNode.data?.triggerSource || tSource;
              tMatch = triggerNode.data?.triggerMatch || tMatch;
              tKeywords = triggerNode.data?.triggerKeywords || tKeywords;
              tProhibitRestart = triggerNode.data?.prohibitRestart || tProhibitRestart;

              const outgoingEdge = loadedEdges.find((e) => e.source === triggerNode.id);
              if (outgoingEdge) {
                entryId = outgoingEdge.target;
              }

              loadedNodes = loadedNodes.filter((n) => n.id !== triggerNode.id);
              loadedEdges = loadedEdges.filter((e) => e.source !== triggerNode.id && e.target !== triggerNode.id);
            }

            setNodes(loadedNodes);
            setEdges(loadedEdges);
            setEntryPointId(entryId);
            setFlowTriggerSource(tSource);
            setFlowTriggerMatch(tMatch);
            setFlowTriggerKeywords(tKeywords);
            setFlowProhibitRestart(tProhibitRestart);
          } catch (e) {
            console.error("Failed to load flow diagram", e);
          }
        } else {
          // Backward compatibility fallback: load single starting node
          const src = found.triggerType === "story" ? "story_mention" : "dm";
          setNodes([
            { id: "n1", type: "message", data: { label: found.replyText || t("pages.builder.initial_msg_how_help"), nodeType: "message", isEntryPoint: true, buttons: [] }, position: { x: 100, y: 150 } }
          ]);
          setEntryPointId("n1");
          setFlowTriggerSource(src);
          setFlowTriggerMatch("contains");
          setFlowTriggerKeywords(found.triggerDetails || "");
        }
      }
    } else if (paramTemplate && TEMPLATE_FLOWS[paramTemplate]) {
      const tflow = TEMPLATE_FLOWS[paramTemplate];
      // Set nodes & edges from template
      setNodes(tflow.nodes);
      setEdges(tflow.edges);
      
      // Select template entryPointId
      setEntryPointId("n1");

      // Set flow triggers depending on template type
      if (paramTemplate === "lead_magnet") {
        setFlowTriggerSource("dm");
        setFlowTriggerMatch("contains");
        setFlowTriggerKeywords("kitob, kurs, bonus");
      } else if (paramTemplate === "story_coupon") {
        setFlowTriggerSource("story_mention");
        setFlowTriggerMatch("any");
        setFlowTriggerKeywords("");
      } else if (paramTemplate === "comment_dm") {
        setFlowTriggerSource("comment");
        setFlowTriggerMatch("contains");
        setFlowTriggerKeywords("narxi, batafsil, link");
      } else if (paramTemplate === "welcome_faq") {
        setFlowTriggerSource("dm");
        setFlowTriggerMatch("contains");
        setFlowTriggerKeywords("salom, start, boshlash");
      }
      
      setBotName(paramTemplate === "lead_magnet" ? "Instagram'da obunani tekshirish" : t("pages.builder.new_flow"));
    } else {
      setBotName(t("pages.builder.new_flow"));
      setNodes([
        { id: "n1", type: "message", data: { label: t("pages.builder.initial_msg_how_help"), nodeType: "message", isEntryPoint: true, buttons: [] }, position: { x: 100, y: 150 } }
      ]);
      setEntryPointId("n1");
      setFlowTriggerSource("dm");
      setFlowTriggerMatch("contains");
      setFlowTriggerKeywords("salom, narx");
      setFlowProhibitRestart(false);
    }
  }, [setNodes, setEdges, t]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#9296AD", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#9296AD" } }, eds)),
    [setEdges]
  );

  useEffect(() => {
    const handleEditButton = (e: Event) => {
      const { nodeId, buttonId } = (e as CustomEvent).detail;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setSelectedButton({ nodeId, buttonId });
        setInspButtons(node.data.buttons || []);
      }
    };

    const handleEditNodeText = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        syncInspector(node);
        setIsRichEditorOpen(true);
      }
    };

    window.addEventListener("edit-button", handleEditButton);
    window.addEventListener("edit-node-text", handleEditNodeText);
    return () => {
      window.removeEventListener("edit-button", handleEditButton);
      window.removeEventListener("edit-node-text", handleEditNodeText);
    };
  }, [nodes]);

  useEffect(() => {
    if (selectedNode) {
      const nodeExists = nodes.some((n) => n.id === selectedNode.id);
      if (!nodeExists) {
        setSelectedNode(null);
        setSelectedButton(null);
      } else if (selectedButton) {
        const node = nodes.find((n) => n.id === selectedNode.id);
        const buttonExists = (node?.data.buttons || []).some((b) => b.id === selectedButton.buttonId);
        if (!buttonExists) {
          setSelectedButton(null);
        }
      }
    }
  }, [nodes, selectedNode, selectedButton]);

  const handleUpdateButtonDetail = (key: keyof ButtonItem, value: any) => {
    if (!selectedButton || !selectedNode) return;
    
    // Update local inspector state
    setInspButtons((prev) =>
      prev.map((btn) => (btn.id === selectedButton.buttonId ? { ...btn, [key]: value } : btn))
    );
    
    // Update global node state immediately
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedButton.nodeId) {
          const updatedButtons = (node.data.buttons || []).map((btn) =>
            btn.id === selectedButton.buttonId ? { ...btn, [key]: value } : btn
          );
          return {
            ...node,
            data: {
              ...node.data,
              buttons: updatedButtons,
            },
          };
        }
        return node;
      })
    );
  };

  const syncInspector = (node: Node<NodeData>) => {
    setSelectedNode(node);
    setSelectedButton(null);
    setInspLabel(node.data.label || "");
    setInspTriggerSource(node.data.triggerSource || "dm");
    setInspTriggerMatch(node.data.triggerMatch || "contains");
    setInspTriggerKeywords(node.data.triggerKeywords || "");
    setInspProhibitRestart(node.data.prohibitRestart || false);
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
    const newLabel =
      selectedNode.data.nodeType === "trigger"
        ? inspLabel
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
          ? { ...n, data: { ...n.data, label: newLabel, triggerSource: inspTriggerSource, triggerMatch: inspTriggerMatch, triggerKeywords: inspTriggerKeywords, prohibitRestart: inspProhibitRestart, conditionType: inspConditionType, conditionValue: inspConditionValue, actionType: inspActionType, actionValue: inspActionValue, aiPrompt: inspAiPrompt, aiOutputVar: inspAiOutputVar, buttons: inspButtons } }
          : n
      )
    );
  };

  const handleSaveFlow = () => {
    const sp = new URLSearchParams(window.location.search);
    const paramId = sp.get("id");
    const activeCh = db.getActiveChannel();
    const list = activeCh ? db.getChannelAutomations(activeCh.id) : db.getAutomations();
    
    // Find the designated entry point message node
    const entryNode = nodes.find((n) => n.id === entryPointId) || nodes.find((n) => n.data.nodeType === "message") || nodes[0];
    const replyText = entryNode?.data.label || "";
    
    const src = flowTriggerSource || "dm";
    const isStory = src.includes("story");
    let savedMsg = t("pages.builder.saved_toast");

    if (paramId) {
      const idx = list.findIndex((a) => a.id === paramId);
      if (idx > -1) {
        list[idx] = { 
          ...list[idx], 
          name: botName, 
          triggerType: isStory ? "story" : "keyword", 
          triggerDetails: flowTriggerKeywords || src, 
          replyText 
        };
      }
      // Save canvas diagram
      localStorage.setItem(`flow_diagram_${paramId}`, JSON.stringify({ nodes, edges, entryPointId, flowTriggerSource, flowTriggerMatch, flowTriggerKeywords, flowProhibitRestart }));
    } else {
      const user = db.getCurrentUser();
      const plan = user?.plan || "free";
      const maxAutos = plan === "premium" ? 500 : plan === "pro" ? 50 : 2;
      const currentActiveCount = db.getAllAutomations().filter((a) => a.active).length;
      const shouldBeActive = currentActiveCount < maxAutos;

      const newId = String(list.length + 1);
      list.push({ 
        id: newId, 
        name: botName, 
        triggerType: isStory ? "story" : "keyword", 
        triggerDetails: flowTriggerKeywords || src, 
        runs: "0", 
        completion: "0%", 
        active: shouldBeActive,
        replyText
      });
      // Save canvas diagram
      localStorage.setItem(`flow_diagram_${newId}`, JSON.stringify({ nodes, edges, entryPointId, flowTriggerSource, flowTriggerMatch, flowTriggerKeywords, flowProhibitRestart }));

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

  const handleInsertFormat = (type: "bold" | "italic" | "underline" | "variable" | "emoji", val?: string) => {
    const textarea = document.getElementById("rich-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = inspLabel;
    const selected = text.substring(start, end);

    let replacement = "";
    if (type === "bold") {
      replacement = `**${selected || "matn"}**`;
    } else if (type === "italic") {
      replacement = `*${selected || "matn"}*`;
    } else if (type === "underline") {
      replacement = `<u>${selected || "matn"}</u>`;
    } else if (type === "variable") {
      replacement = `{{user_name}}`;
    } else if (type === "emoji" && val) {
      replacement = val;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setInspLabel(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const addNewNode = (type: NodeType) => {
    const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
    const newId = `btn-${Date.now()}`;
    const btn: ButtonItem = { id: newId, label: t("pages.builder.btn_placeholder"), type: "action" };
    setInspButtons((prev) => [...prev, btn]);
    if (selectedNode) {
      setSelectedButton({ nodeId: selectedNode.id, buttonId: newId });
    }
  };

  const removeButton = (id: string) => {
    setInspButtons((prev) => prev.filter((b) => b.id !== id));
    if (selectedButton?.buttonId === id) {
      setSelectedButton(null);
    }
  };

  const updateButton = (id: string, key: keyof ButtonItem, value: any) => {
    setInspButtons((prev) => prev.map((b) => b.id === id ? { ...b, [key]: value } : b));
  };

  const nodeTypes = useMemo(() => ({
    message: MessageNode,
    condition: ConditionNode,
    action: ActionNode,
    wait: WaitNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    default: ButtonEdge,
  }), []);

  const currentButton = useMemo(() => {
    if (!selectedButton || !selectedNode) return null;
    const node = nodes.find((n) => n.id === selectedButton.nodeId);
    if (!node) return null;
    return (node.data.buttons || []).find((b) => b.id === selectedButton.buttonId) || null;
  }, [selectedButton, selectedNode, nodes]);


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
            <button 
              onClick={openTriggerSettings}
              className="flex items-center gap-1.5 px-4 h-9 text-[11px] font-extrabold bg-[#FAFAFA] border border-[#E8E8E8] rounded-full hover:bg-[#F0F0F0] text-black shrink-0 transition-colors cursor-pointer"
            >
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
          
          {/* Canvas area */}
          <main className="flex-1 relative bg-[#F5F5F7]">
            {/* ReactFlow Canvas */}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_e, node) => {
                setIsEditingTrigger(false);
                onNodeClick(_e, node);
              }}
              onPaneClick={() => {
                setSelectedNode(null);
                setSelectedButton(null);
                setIsEditingTrigger(false);
              }}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={setReactFlowInstance}
              connectionLineStyle={{ stroke: "#9296AD", strokeWidth: 1.5 }}
              proOptions={{ hideAttribution: true }}
              fitView
            >
              <Background color="#9296AD" variant="dots" gap={20} size={1.5} style={{ opacity: 0.15 }} />
            </ReactFlow>

            {/* Overlay controls rendered after ReactFlow to avoid stacking capture issues */}
            {/* Add Block trigger plus icon button */}
            <button
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="absolute top-4 left-4 z-[50] w-10 h-10 bg-white border border-[#E8E8E8] rounded-xl flex items-center justify-center shadow-sm text-black hover:border-black hover:scale-105 active:scale-[0.97] transition-all cursor-pointer"
              title="Blok qo'shish"
            >
              <Plus size={18} strokeWidth={3} />
            </button>

            {/* Floating Add Block Popup */}
            {isPaletteOpen && (
              <div className="absolute top-16 left-4 z-[50] bg-white rounded-2xl shadow-xl border border-[#E8E8E8] p-2 w-[180px] flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150 text-black">
                {([
                  { type: "message" as NodeType, label: "Message", icon: <MessageCircle size={16} strokeWidth={2.5} className="text-[#3B82F6]" /> },
                  { type: "condition" as NodeType, label: "Condition", icon: <Filter size={16} strokeWidth={2.5} className="text-[#22C55E]" /> },
                  { type: "action" as NodeType, label: "Action", icon: <Zap size={16} strokeWidth={2.5} className="text-[#EAB308]" /> },
                  { type: "wait" as NodeType, label: "Wait", icon: <Clock size={16} strokeWidth={2.5} className="text-[#A855F7]" /> },
                ]).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      addNewNode(item.type);
                      setIsPaletteOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F5F7] transition-all cursor-pointer border-none bg-white text-black font-semibold text-[12.5px] select-none"
                  >
                    <div className="shrink-0 flex items-center justify-center">{item.icon}</div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Canvas control panel left */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 bg-white/80 backdrop-blur-md p-1 border border-[#E8E8E8] rounded-2xl shadow-sm">
              <button
                onClick={() => reactFlowInstance?.zoomIn()}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-black hover:bg-[#F5F5F5] transition-all font-bold text-[14px] cursor-pointer"
                title="Yaqinlashtirish"
              >
                +
              </button>
              <button
                onClick={() => reactFlowInstance?.zoomOut()}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-black hover:bg-[#F5F5F5] transition-all font-bold text-[14px] cursor-pointer"
                title="Uzoqlashtirish"
              >
                −
              </button>
              <button
                onClick={() => reactFlowInstance?.fitView()}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#707070] hover:text-black hover:bg-[#F5F5F5] transition-all cursor-pointer"
                title="Ekranga moslash"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>

            {/* Bottom-right Support Widget */}
            <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3">
              <a
                href="https://t.me/sendly_support_bot"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#24A1DE] hover:bg-[#1f8fc4] flex items-center justify-center text-white shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                title="Qo'llab-quvvatlash"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </main>

          {/* Right Inspector */}
          {(selectedNode || (selectedButton && currentButton) || isEditingTrigger) && (
            <aside className="w-[320px] shrink-0 border-l border-[#E8E8E8] bg-white overflow-y-auto">
            {isEditingTrigger ? (
              <div className="flex flex-col">
                {/* Trigger Inspector Header */}
                <div className="px-5 pt-5 pb-4 border-b border-[#F0F0F0] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-[13px] font-black text-black leading-none">
                      Ishga tushirish triggerlari
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingTrigger(false);
                    }}
                    className="p-1 rounded-full hover:bg-neutral-100 text-[#707070] hover:text-black transition-colors"
                    title="Yopish"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-4 py-4 flex flex-col gap-5 text-left text-black">
                  {/* Trigger Source Cards */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Trigger turi</p>
                    <div className="grid grid-cols-3 gap-2">
                      {TRIGGER_SOURCES.map((s) => {
                        const IconComponent = s.icon;
                        const isSelected = inspTriggerSource === s.value;
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setInspTriggerSource(s.value)}
                            className={`flex flex-col p-3 rounded-2xl h-[92px] text-left transition-all relative border cursor-pointer select-none ${
                              isSelected
                                ? "border-2 border-[#1A73E8] bg-white shadow-sm"
                                : "border border-[#E8E8E8] bg-white hover:border-[#ccc]"
                            }`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <IconComponent size={20} className={isSelected ? "text-[#1A73E8]" : "text-[#707070]"} />
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? "border-[#1A73E8] border-2" : "border-[#D8D8D8]"
                              }`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]" />}
                              </span>
                            </div>
                            <span className="text-[10.5px] font-bold text-black leading-tight mt-auto">
                              {s.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Keyword match type — only for text triggers (dm, comment, message_recognition) */}
                  {(inspTriggerSource === "dm" || inspTriggerSource === "comment" || inspTriggerSource === "message_recognition") && (
                    <div className="flex flex-col gap-3 border-t border-[#F0F0F0] pt-4 mt-2">
                      <h4 className="text-[13px] font-extrabold text-black">Trigger on</h4>
                      <div className="flex flex-col gap-3">
                        {TRIGGER_MATCHES.map((m) => {
                          const isActive = inspTriggerMatch === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => setInspTriggerMatch(m.value)}
                              className="flex items-center gap-3 w-full text-left cursor-pointer group border-none bg-transparent"
                            >
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isActive ? "border-[#1A73E8] border-2" : "border-[#D8D8D8] group-hover:border-[#ccc]"
                              }`}>
                                {isActive && <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8]" />}
                              </span>
                              <span className="text-[12px] font-bold text-black">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Keywords input */}
                  {inspTriggerMatch !== "any" && (inspTriggerSource === "dm" || inspTriggerSource === "comment" || inspTriggerSource === "message_recognition") && (
                    <div className="flex flex-col gap-2 mt-1">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Kalit so'zlar (vergul bilan ajrating)</p>
                      <input
                        value={inspTriggerKeywords}
                        onChange={(e) => setInspTriggerKeywords(e.target.value)}
                        placeholder="masalan: narx, o'qish, chegirma"
                        className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors"
                      />
                    </div>
                  )}

                  {/* Story / Live info banner */}
                  {(inspTriggerSource === "story_mention" || inspTriggerSource === "story_reply" || inspTriggerSource === "story_reaction" || inspTriggerSource === "live_comment") && (
                    <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-[#F9F9F7] border border-[#E8E8E8] mt-2">
                      <Zap size={14} className="text-black shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#505050] leading-relaxed">
                        Ushbu trigger uchun kalit so'zlar talab qilinmaydi. Foydalanuvchi har safar story/live faolligi ko'rsatganda trigger ishga tushadi.
                      </p>
                    </div>
                  )}

                  {/* Prohibit restart Toggle */}
                  <div className="flex items-center justify-between border-t border-[#F0F0F0] pt-4 mt-2">
                    <div className="flex flex-col gap-0.5 max-w-[210px] text-left">
                      <span className="text-[12px] font-extrabold text-black">Prohibit restart</span>
                      <span className="text-[10px] text-[#707070] leading-normal">
                        During the specified time the automation can be started only once. All another restarts will be ignored and skipped.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspProhibitRestart(!inspProhibitRestart)}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        inspProhibitRestart ? "bg-[#1A73E8]" : "bg-[#D8D8D8]"
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                        inspProhibitRestart ? "left-[21px]" : "left-0.5"
                      }`} />
                    </button>
                  </div>

                  {/* Save Trigger Details Button */}
                  <button
                    onClick={handleSaveTriggerDetails}
                    className="w-full py-3 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-black/80 active:scale-[0.98] transition-all mt-4 border-none cursor-pointer"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            ) : selectedButton && currentButton ? (
              <div className="flex flex-col">
                {/* Button Inspector Header */}
                <div className="px-5 pt-5 pb-4 border-b border-[#F0F0F0] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setSelectedButton(null)}
                      className="p-1 rounded-full hover:bg-neutral-100 text-[#707070] hover:text-black transition-colors"
                      title="Orqaga"
                    >
                      <ArrowLeft size={16} strokeWidth={2.5} />
                    </button>
                    <h3 className="text-[13px] font-black text-black leading-none truncate max-w-[170px]">
                      {currentButton.label || "Tugma sozlamalari"}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedButton(null);
                      setSelectedNode(null);
                    }}
                    className="p-1 rounded-full hover:bg-neutral-100 text-[#707070] hover:text-black transition-colors"
                    title="Yopish"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-4 py-4 flex flex-col gap-5 text-left text-black">
                  {/* Button text input */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Tugma matni</p>
                    <input
                      type="text"
                      value={currentButton.label || ""}
                      onChange={(e) => handleUpdateButtonDetail("label", e.target.value)}
                      placeholder="Masalan: Ha, darsni boshlash!"
                      className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-medium border border-transparent focus:border-black/10"
                    />
                  </div>

                  {/* Action on button (Tugma ustidagi amal) */}
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Tugma ustidagi amal</p>
                    
                    <div className="flex flex-col gap-2">
                      {[
                        {
                          id: "action",
                          title: "Keyingi qadamga o'tish",
                          desc: "Navbatdagi blokga yo'naltirish (Canvas bog'lanishi)",
                        },
                        {
                          id: "link",
                          title: "Veb-saytni ochish",
                          desc: "Havola orqali tashqi saytga o'tkazish",
                        },
                        {
                          id: "payment",
                          title: "To'lovga o'tish",
                          desc: "To'lov sahifasiga yo'naltirish havola orqali",
                        },
                      ].map((opt) => {
                        const isSelected = currentButton.type === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleUpdateButtonDetail("type", opt.id as any)}
                            className={`border rounded-2xl p-3 flex items-start gap-3 cursor-pointer transition-all select-none hover:border-black/30 ${
                              isSelected
                                ? "border-black bg-black/[0.02]"
                                : "border-[#E8E8E8] bg-white"
                            }`}
                          >
                            {/* Custom Radio Button */}
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isSelected ? "border-black bg-black" : "border-[#D8D8D8]"
                            }`}>
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C7F33C]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11.5px] font-extrabold text-black leading-tight">{opt.title}</p>
                              <p className="text-[9.5px] text-[#707070] mt-0.5 leading-tight">{opt.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conditional URL Input */}
                  {(currentButton.type === "link" || currentButton.type === "payment") && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-top-1">
                      <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Veb-sayt havolasi (URL)</p>
                      <input
                        type="text"
                        value={currentButton.url || ""}
                        onChange={(e) => handleUpdateButtonDetail("url", e.target.value)}
                        placeholder="https://example.com"
                        className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors font-mono"
                      />
                    </div>
                  )}

                  {/* Toggle: Multiple button click */}
                  <div className="flex items-center justify-between p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full select-none mt-1">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[12px] font-extrabold text-black leading-tight">Bir nechta bosish</span>
                      <span className="text-[9px] text-[#707070] leading-none">Tugmani bir necha bor bosish imkoni</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={!!currentButton.multipleClick}
                        onChange={(e) => handleUpdateButtonDetail("multipleClick", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D8D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C7F33C]"></div>
                    </label>
                  </div>

                  {/* Duplicate and Delete Actions in Inspector */}
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedNode && currentButton) {
                          const newId = `btn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                          const duplicatedBtn = { ...currentButton, id: newId, label: `${currentButton.label} (Nusxa)` };
                          
                          setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, buttons: [...(n.data.buttons || []), duplicatedBtn] } } : n));
                          setSelectedButton({ nodeId: selectedNode.id, buttonId: newId });
                          setInspButtons((prev) => [...prev, duplicatedBtn]);
                          
                          setToastMsg("Tugma nusxalandi!");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-[#E8E8E8] hover:border-black text-[11px] font-black text-black bg-white hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Nusxalash</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedNode && currentButton) {
                          setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, buttons: (n.data.buttons || []).filter(b => b.id !== currentButton.id) } } : n));
                          setInspButtons((prev) => prev.filter((b) => b.id !== currentButton.id));
                          setSelectedButton(null);
                          
                          setToastMsg("Tugma o'chirildi");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-red-200 hover:border-red-500 hover:bg-red-50/50 text-[11px] font-black text-red-500 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>O'chirish</span>
                    </button>
                  </div>

                  {/* Done button */}
                  <button
                    onClick={() => setSelectedButton(null)}
                    className="w-full py-3 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-black/80 active:scale-[0.98] transition-all mt-2 cursor-pointer border-none"
                  >
                    Tayyor
                  </button>
                </div>
              </div>
            ) : selectedNode ? (
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
                        <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Trigger turi</p>
                        <div className="grid grid-cols-3 gap-2">
                          {TRIGGER_SOURCES.map((s) => {
                            const IconComponent = s.icon;
                            const isSelected = inspTriggerSource === s.value;
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => setInspTriggerSource(s.value)}
                                className={`flex flex-col p-3 rounded-2xl h-[92px] text-left transition-all relative border cursor-pointer select-none ${
                                  isSelected
                                    ? "border-2 border-[#1A73E8] bg-white shadow-sm"
                                    : "border border-[#E8E8E8] bg-white hover:border-[#ccc]"
                                }`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <IconComponent size={20} className={isSelected ? "text-[#1A73E8]" : "text-[#707070]"} />
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected ? "border-[#1A73E8] border-2" : "border-[#D8D8D8]"
                                  }`}>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]" />}
                                  </span>
                                </div>
                                <span className="text-[10.5px] font-bold text-black leading-tight mt-auto">
                                  {s.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Keyword match type — only for text triggers (dm, comment, message_recognition) */}
                      {(inspTriggerSource === "dm" || inspTriggerSource === "comment" || inspTriggerSource === "message_recognition") && (
                        <div className="flex flex-col gap-3 border-t border-[#F0F0F0] pt-4 mt-2">
                          <h4 className="text-[13px] font-extrabold text-black">Trigger on</h4>
                          <div className="flex flex-col gap-3">
                            {TRIGGER_MATCHES.map((m) => {
                              const isActive = inspTriggerMatch === m.value;
                              return (
                                <button
                                  key={m.value}
                                  type="button"
                                  onClick={() => setInspTriggerMatch(m.value)}
                                  className="flex items-center gap-3 w-full text-left cursor-pointer group"
                                >
                                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                    isActive ? "border-[#1A73E8] border-2" : "border-[#D8D8D8] group-hover:border-[#ccc]"
                                  }`}>
                                    {isActive && <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8]" />}
                                  </span>
                                  <span className="text-[12px] font-bold text-black">{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Keywords input */}
                      {inspTriggerMatch !== "any" && (inspTriggerSource === "dm" || inspTriggerSource === "comment" || inspTriggerSource === "message_recognition") && (
                        <div className="flex flex-col gap-2 mt-1">
                          <p className="text-[10px] font-bold text-[#707070] uppercase tracking-widest px-0.5">Kalit so'zlar (vergul bilan ajrating)</p>
                          <input
                            value={inspTriggerKeywords}
                            onChange={(e) => setInspTriggerKeywords(e.target.value)}
                            placeholder="masalan: narx, o'qish, chegirma"
                            className="w-full rounded-[12px] bg-[#F0F0F0] px-4 py-3 text-[12px] text-black outline-none focus:bg-[#e8e8e8] transition-colors"
                          />
                        </div>
                      )}

                      {/* Story / Live info banner */}
                      {(inspTriggerSource === "story_mention" || inspTriggerSource === "story_reply" || inspTriggerSource === "story_reaction" || inspTriggerSource === "live_comment") && (
                        <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-[#F9F9F7] border border-[#E8E8E8] mt-2">
                          <Zap size={14} className="text-black shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#505050] leading-relaxed">
                            Ushbu trigger uchun kalit so'zlar talab qilinmaydi. Foydalanuvchi har safar story/live faolligi ko'rsatganda trigger ishga tushadi.
                          </p>
                        </div>
                      )}

                      {/* Prohibit restart Toggle */}
                      <div className="flex items-center justify-between border-t border-[#F0F0F0] pt-4 mt-2">
                        <div className="flex flex-col gap-0.5 max-w-[210px] text-left">
                          <span className="text-[12px] font-extrabold text-black">Prohibit restart</span>
                          <span className="text-[10px] text-[#707070] leading-normal">
                            During the specified time the automation can be started only once. All another restarts will be ignored and skipped.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInspProhibitRestart(!inspProhibitRestart)}
                          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                            inspProhibitRestart ? "bg-[#1A73E8]" : "bg-[#D8D8D8]"
                          }`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                            inspProhibitRestart ? "left-[21px]" : "left-0.5"
                          }`} />
                        </button>
                      </div>
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
                        <button
                          type="button"
                          onClick={() => setIsRichEditorOpen(true)}
                          className="w-full py-2 bg-[#FAFAFA] border border-[#E8E8E8] hover:border-black rounded-xl text-[10.5px] font-bold text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Kengaytirilgan muharrir (Formatlash)</span>
                        </button>
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
                          <div
                            key={btn.id}
                            onClick={() => setSelectedButton({ nodeId: selectedNode.id, buttonId: btn.id })}
                            className="flex items-center justify-between p-3 border border-[#E8E8E8] hover:border-black rounded-xl text-[11px] font-bold bg-white hover:bg-neutral-50 text-black select-none cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[#a0a0a0] font-mono font-bold">==</span>
                              <span className="truncate">{btn.label || t("pages.builder.btn_placeholder")}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase tracking-wider text-[#707070] font-semibold bg-[#F5F5F7] px-2 py-0.5 rounded-md">
                                {btn.type === "action" ? "Qadam" : btn.type === "payment" ? "To'lov" : "Sayt"}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeButton(btn.id);
                                }}
                                className="text-[#DC2626] hover:opacity-70 shrink-0 p-1 rounded hover:bg-red-50"
                              >
                                <X size={14} />
                              </button>
                            </div>
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

                  {/* Entry Point Setting */}
                  <div className="flex items-center justify-between p-4 bg-[#F9F9F7] border border-[#E8E8E8] rounded-2xl w-full select-none mb-4 mt-2">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[12px] font-extrabold text-black leading-tight">Boshlanish bloki (Entry point)</span>
                      <span className="text-[9px] text-[#707070] leading-normal">Ushbu blokdan avtomatlashtirish suhbati boshlanadi</span>
                    </div>
                    {selectedNode.id === entryPointId ? (
                      <span className="text-[10.5px] font-extrabold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        Faol
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("set-entry-point", { detail: { nodeId: selectedNode.id } }));
                        }}
                        className="px-3.5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all active:scale-95 border-none font-sans"
                      >
                        Belgilash
                      </button>
                    )}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveNodeDetails}
                    className="w-full py-3 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-black/80 active:scale-[0.98] transition-all mt-1"
                  >
                    {t("pages.builder.save_btn")}
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        )}
        </div>
      </div>

      {isRichEditorOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 max-w-[480px] w-full shadow-2xl relative border border-[#E8E8E8] animate-in zoom-in-95 duration-150 text-black">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsRichEditorOpen(false)}
              className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full hover:bg-[#F0F0F0] text-[#707070] transition-colors cursor-pointer border-0"
            >
              <X size={16} />
            </button>

            <h3 className="text-[18px] font-black text-black tracking-tight text-left">
              Xabar qo&apos;shish
            </h3>
            <p className="text-[11px] text-[#707070] mt-1 text-left font-medium">
              Tanlangan blok uchun xabar matnini ko&apos;rsating
            </p>

            <div className="mt-4 border border-[#E8E8E8] rounded-2xl overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all bg-white">
              <textarea
                id="rich-textarea"
                value={inspLabel}
                onChange={(e) => setInspLabel(e.target.value.substring(0, 500))}
                className="w-full h-40 p-4 text-[12px] bg-white border-0 outline-none resize-none leading-relaxed text-black focus:ring-0 focus:outline-none"
                maxLength={500}
                placeholder="Xabarni yozing..."
              />
              
              {/* Rich toolbar */}
              <div className="bg-[#F9F9F7] border-t border-[#E8E8E8] px-3 py-2.5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2 relative">
                  {/* Smiley emoji selector */}
                  <button
                    type="button"
                    onClick={() => setShowRichEmojiList(!showRichEmojiList)}
                    className="text-[#707070] hover:text-black transition-colors font-bold text-[13px] h-6 px-1.5 hover:bg-[#F0F0F0] rounded cursor-pointer border-0 bg-transparent"
                    title="Emoji qo'shish"
                  >
                    😊
                  </button>
                  {showRichEmojiList && (
                    <div className="absolute bottom-8 left-0 bg-white border border-[#E8E8E8] rounded-xl p-2 shadow-lg flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-1">
                      {["😊", "🚀", "🔥", "🎉", "✅", "👇", "👉"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            handleInsertFormat("emoji", emoji);
                            setShowRichEmojiList(false);
                          }}
                          className="h-7 w-7 flex items-center justify-center hover:bg-slate-100 rounded text-[14px] cursor-pointer border-0 bg-transparent"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Variables {...} button */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("variable")}
                    className="text-[#707070] hover:text-black font-extrabold text-[12px] h-6 px-1.5 hover:bg-[#F0F0F0] rounded font-mono cursor-pointer border-0 bg-transparent"
                    title="O'zgaruvchi qo'shish"
                  >
                    {`{...}`}
                  </button>

                  <div className="h-4 w-[1px] bg-[#E8E8E8]" />

                  {/* Bold (B) */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("bold")}
                    className="text-[#707070] hover:text-black font-black text-[12px] h-6 w-6 hover:bg-[#F0F0F0] rounded cursor-pointer border-0 bg-transparent"
                    title="Qalin (Bold)"
                  >
                    B
                  </button>

                  {/* Italic (I) */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("italic")}
                    className="text-[#707070] hover:text-black italic font-bold text-[12px] h-6 w-6 hover:bg-[#F0F0F0] rounded cursor-pointer border-0 bg-transparent"
                    title="Kursiv (Italic)"
                  >
                    I
                  </button>

                  {/* Underline (U) */}
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("underline")}
                    className="text-[#707070] hover:text-black underline font-bold text-[12px] h-6 w-6 hover:bg-[#F0F0F0] rounded cursor-pointer border-0 bg-transparent"
                    title="Ostiga chizilgan (Underline)"
                  >
                    U
                  </button>
                </div>
                
                <span className="text-[10px] text-[#707070] font-semibold">
                  {inspLabel.length} / 500
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsRichEditorOpen(false)}
                className="px-5 py-2.5 bg-white border border-[#D8D8D8] text-black font-bold rounded-xl text-[12px] hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveNodeDetails();
                  setIsRichEditorOpen(false);
                }}
                className="px-5 py-2.5 bg-black text-white font-bold rounded-xl text-[12px] hover:bg-neutral-800 transition-all cursor-pointer border-0"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

