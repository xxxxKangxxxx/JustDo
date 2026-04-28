"use client";

import type { ReactElement } from "react";
import type { TabId } from "@/types/domain";
import { useJustDo } from "./store";
import { tokens, type ThemeMode } from "./tokens";

const tabs: Array<{ id: TabId; label: string; icon: (color: string) => ReactElement }> = [
  {
    id: "home",
    label: "홈",
    icon: (color) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="15" rx="3" stroke={color} strokeWidth="1.7" />
        <path d="M4 9h16" stroke={color} strokeWidth="1.7" />
        <path d="M8 3v4M16 3v4" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "stats",
    label: "통계",
    icon: (color) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 18V11M10 18V7M15 18v-5M20 18V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "설정",
    icon: (color) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.7" />
        <path
          d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function TabBar({ mode }: { mode: ThemeMode }) {
  const { state, setTab } = useJustDo();
  const t = tokens[mode];
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 flex justify-around border-t pb-[22px] pt-2 backdrop-blur-2xl"
      style={{
        background: mode === "dark" ? "rgba(19,18,16,0.72)" : "rgba(246,244,239,0.78)",
        borderColor: t.divider,
      }}
    >
      {tabs.map((tab) => {
        const active = state.view.tab === tab.id;
        const color = active ? t.accent : t.textTertiary;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className="flex min-w-16 flex-col items-center gap-[3px] px-3 py-1"
          >
            {tab.icon(color)}
            <span className="text-[10px] font-medium tracking-[0.1px]" style={{ color }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
