import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Category } from "@/types/domain";
import { categoryStyle, tokens, type ThemeMode } from "./tokens";

type VisualCategory = Category | "habit" | null | undefined;

const visualStyle = (category: VisualCategory, mode: ThemeMode) =>
  category === "habit" ? tokens[mode].habit : categoryStyle(category, mode);

export function PhoneFrame({ children, mode }: { children: ReactNode; mode: ThemeMode }) {
  const t = tokens[mode];
  return (
    <main className="min-h-screen bg-[#ECE9E2] px-3 py-6 sm:px-8">
      <div
        className="relative mx-auto h-[844px] w-full max-w-[390px] overflow-hidden rounded-[47px] shadow-2xl"
        style={{
          background: t.bg,
          color: t.text,
          boxShadow:
            mode === "dark"
              ? "inset 0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.3)"
              : "inset 0 0 0 1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.1)",
        }}
      >
        <div className="absolute left-1/2 top-[11px] z-50 h-[37px] w-[126px] -translate-x-1/2 rounded-[24px] bg-black" />
        {children}
        <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-[60] flex justify-center">
          <div
            className="h-[5px] w-[139px] rounded-full"
            style={{ background: mode === "dark" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.32)" }}
          />
        </div>
      </div>
    </main>
  );
}

export function StatusBar({ mode }: { mode: ThemeMode }) {
  const color = mode === "dark" ? "#fff" : "#000";
  return (
    <div className="relative z-20 flex h-[54px] items-center justify-between px-[30px] pt-[21px]">
      <span className="text-[16px] font-semibold tracking-[-0.2px]">9:41</span>
      <div className="w-[100px]" />
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11">
          <rect x="0" y="7" width="3" height="4" rx=".6" fill={color} />
          <rect x="4.5" y="5" width="3" height="6" rx=".6" fill={color} />
          <rect x="9" y="2.5" width="3" height="8.5" rx=".6" fill={color} />
          <rect x="13.5" y="0" width="3" height="11" rx=".6" fill={color} />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={color} strokeOpacity=".35" fill="none" />
          <rect x="2" y="2" width="18" height="8" rx="1.8" fill={color} />
          <rect x="22.5" y="4" width="1.5" height="4" rx=".5" fill={color} fillOpacity=".4" />
        </svg>
      </div>
    </div>
  );
}

export function CircleCheck({
  checked,
  category,
  mode,
  size = 20,
}: {
  checked: boolean;
  category?: VisualCategory;
  mode: ThemeMode;
  size?: number;
}) {
  const t = tokens[mode];
  const c = visualStyle(category, mode);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full transition"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${checked ? c.solid : t.dividerStrong}`,
        background: checked ? c.solid : "transparent",
      }}
    >
      {checked ? (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2L5 8.7L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

export function CatDot({ category, mode, size = 6 }: { category?: VisualCategory; mode: ThemeMode; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full"
      style={{ width: size, height: size, background: visualStyle(category, mode).solid }}
    />
  );
}

export function CatTag({ category, mode }: { category?: VisualCategory; mode: ThemeMode }) {
  const c = visualStyle(category, mode);
  const label = category === "habit" ? "Habit" : category?.name ?? "미분류";
  return (
    <span
      className="rounded-[5px] px-2 py-[3px] text-[11px] font-semibold tracking-[0.2px]"
      style={{ color: c.ink, background: c.soft }}
    >
      {label}
    </span>
  );
}

export function IconButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className="appearance-none border-0 bg-transparent p-0" {...props}>
      {children}
    </button>
  );
}
