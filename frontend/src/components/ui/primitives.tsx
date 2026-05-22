"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// 1. CARD
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "dark" | "glass";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[28px] p-6 md:p-7 transition-all duration-200",
          variant === "default" && "bg-white text-black",
          variant === "dark" && "bg-black text-white",
          variant === "glass" && "bf-glass text-black",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

// 2. BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-[13px] active:scale-[0.98]",
          variant === "primary" && "bg-black text-white hover:bg-black/90 px-5 py-3 rounded-full",
          variant === "accent" && "bg-[#C7F33C] text-[#1A2906] hover:bg-[#9BC92E] px-5 py-3 rounded-full",
          variant === "secondary" && "bg-white text-black hover:bg-[#F0F0F0] px-5 py-3 rounded-full",
          variant === "icon" && "h-10 w-10 rounded-full bg-white text-black hover:bg-[#F0F0F0] p-0 flex items-center justify-center shrink-0",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// 3. PILL TAB
interface PillTabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function PillTab({ className, active, ...props }: PillTabProps) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 active:scale-[0.98]",
        active ? "bg-black text-white" : "text-[#595959] hover:bg-white hover:text-black",
        className
      )}
      {...props}
    />
  );
}

// 4. STATUS PILL
interface StatusPillProps {
  status: "active" | "inactive" | boolean;
  activeText?: string;
  inactiveText?: string;
}

export function StatusPill({ status, activeText = "Faol", inactiveText = "Nofaol" }: StatusPillProps) {
  const isActive = typeof status === "boolean" ? status : status === "active";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium leading-none shrink-0",
        isActive ? "bg-[#C7F33C]/20 text-[#1A2906]" : "bg-[#F0F0F0] text-[#707070]"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-[#16A34A]" : "bg-[#707070]")} />
      {isActive ? activeText : inactiveText}
    </div>
  );
}

// 5. LIME BADGE
export function LimeBadge({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[8px] bg-[#C7F33C] px-[9px] py-[3px] text-[11px] font-medium text-[#1A2906] leading-none shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// 6. AVATAR
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  fallbackColor?: string;
  style?: React.CSSProperties;
}

export function Avatar({ src, alt, size = 38, className, fallbackColor, style }: AvatarProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-full ring-2 ring-[#E8E8E8] shrink-0", className)}
      style={{
        width: size,
        height: size,
        background: fallbackColor || "radial-gradient(circle at 35% 35%, #C7F33C 0%, #9BC92E 70%, #5A7C1E 100%)",
        ...style,
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || "Avatar"}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

// 7. AVATAR STACK
interface AvatarStackProps {
  avatars: Array<{ src?: string; fallbackColor?: string }>;
  max?: number;
  size?: number;
}

export function AvatarStack({ avatars, max = 3, size = 34 }: AvatarStackProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex items-center shrink-0">
      {visibleAvatars.map((av, i) => (
        <Avatar
          key={i}
          src={av.src}
          size={size}
          fallbackColor={av.fallbackColor}
          className="ring-2 ring-[#E8E8E8]"
          style={{ marginLeft: i === 0 ? 0 : -10 }}
        />
      ))}
      {remaining > 0 && (
        <div
          className="grid place-items-center rounded-full bg-black text-[11px] font-medium text-white ring-2 ring-[#E8E8E8] shrink-0"
          style={{
            width: size,
            height: size,
            marginLeft: -10,
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// 8. METRIC CARD
interface MetricCardProps {
  label: string;
  value: string | number;
  caption: string;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
}

export function MetricCard({ label, value, caption, trend, trendType = "positive" }: MetricCardProps) {
  return (
    <Card className="flex min-h-[140px] flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-[#707070]">{label}</span>
        {trend && (
          <div
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              trendType === "positive" && "bg-[#C7F33C] text-[#1A2906]",
              trendType === "negative" && "bg-[#DC2626]/20 text-[#DC2626]",
              trendType === "neutral" && "bg-[#F0F0F0] text-[#707070]"
            )}
          >
            {trend}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="bf-tight text-[32px] md:text-[38px] font-medium leading-none text-black">
          {value}
        </div>
        <div className="mt-1 text-[11px] text-[#707070]">{caption}</div>
      </div>
    </Card>
  );
}

// 9. BAR CHART
interface BarChartProps {
  values: number[];
  days: string[];
  highlightIndex?: number;
  highlightTag?: string;
  height?: number;
}

export function BarChart({ values, days, highlightIndex = 5, highlightTag = "12,464", height = 140 }: BarChartProps) {
  const max = Math.max(...values) || 1;

  return (
    <div className="mt-auto w-full">
      <div className="relative flex items-end justify-between gap-2" style={{ height }}>
        {values.map((v, i) => {
          const h = (v / max) * 100;
          const highlighted = i === highlightIndex;
          return (
            <div key={i} className="relative flex flex-1 flex-col items-center">
              {highlighted && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-full bg-[#C7F33C] px-2 py-0.5 text-[10px] font-medium text-[#1A2906] whitespace-nowrap z-10">
                  {highlightTag}
                </div>
              )}
              <div
                className={cn(
                  "w-full rounded-t-[6px] transition-all",
                  highlighted ? "bg-black" : "bg-[#F0F0F0]"
                )}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 text-center text-[10px]",
              i === highlightIndex ? "text-black font-medium" : "text-[#707070]"
            )}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

// 10. AREA CHART
interface AreaChartProps {
  points: number[];
  highlightIndex?: number;
  highlightTag?: string;
  width?: number;
  height?: number;
}

export function AreaChart({ points, highlightIndex = 6, highlightTag = "+9%", width = 320, height = 110 }: AreaChartProps) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 20) - 8;
    return { x, y };
  });

  const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const highlight = coords[highlightIndex] || coords[coords.length - 1];

  return (
    <div className="relative mt-auto w-full">
      {highlight && (
        <div
          className="absolute rounded-full bg-[#C7F33C] px-2 py-0.5 text-[10px] font-medium text-[#1A2906] z-10 whitespace-nowrap"
          style={{
            left: `${(highlight.x / width) * 100}%`,
            top: `${(highlight.y / height) * 60}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          {highlightTag}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          </pattern>
        </defs>
        <path d={area} fill="url(#hatch)" />
        <path d={line} fill="none" stroke="#000" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === highlightIndex ? 3.5 : 2}
            fill="#000"
          />
        ))}
      </svg>
    </div>
  );
}

// 11. CONFIRMATION MODAL
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "O'chirish",
  cancelText = "Bekor qilish",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4">
      <div className="w-full max-w-[380px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-[16px] font-semibold text-black leading-tight">
          {title}
        </h3>
        <p className="mt-2.5 text-[12px] text-[#707070] leading-relaxed">
          {message}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2 text-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#F0F0F0] px-4 py-2 font-medium text-black hover:bg-[#E8E8E8] active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-full bg-[#DC2626] px-4 py-2 font-medium text-white hover:bg-[#B91C1C] active:scale-95 transition-all"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// 12. ALERT MODAL
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = "Yopish",
}: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] rounded-[28px] bg-white p-6 border border-[#D8D8D8] shadow-[0_20px_50px_rgba(0,0,0,0.15)] scale-100 animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#C7F33C]/20 text-black">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-[16px] font-semibold text-black leading-tight">
          {title}
        </h3>
        <p className="mt-2.5 text-[12px] text-[#707070] leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-black py-3 text-[12px] font-bold text-white hover:bg-black/90 active:scale-[0.98] transition-all"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}


