"use client";

import { useState } from "react";
import { authProviders } from "@/lib/auth/providers";
import { useAuth } from "@/lib/auth/useAuth";
import { StatsScreen } from "./stats-screen";
import { useJustDo } from "./store";
import { categoryStyle, sortedCategories, tokens, type ThemeMode } from "./tokens";

const categoryPalette = [
  "#4F6FD8",
  "#D36A3A",
  "#2F9B72",
  "#B75CAD",
  "#D2A12D",
  "#2E9AB5",
  "#D85773",
  "#6D7694",
];

const normalizeHexInput = (value: string) => {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

export function SettingsScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const auth = useAuth();
  const t = tokens[mode];
  const [panel, setPanel] = useState<"main" | "activity" | "categories">("main");
  const authDisabled = auth.status === "loading";
  const statusDetail =
    auth.status === "loading"
      ? "확인 중"
      : auth.status === "signedIn"
        ? "로그인됨"
        : "게스트";
  const profileDetail =
    auth.status === "loading"
      ? "확인 중"
      : auth.user?.displayName ?? auth.user?.email ?? "게스트";
  const syncDetail = s.syncError
    ? "확인 필요"
    : !s.syncStatus.isOnline
      ? "오프라인"
      : s.syncStatus.isSyncing
        ? "동기화 중"
        : s.syncStatus.pendingCount > 0
          ? "대기 중"
          : "정상";
  const pendingDetail = s.syncStatus.pendingCount > 0
    ? `${s.syncStatus.pendingCount}개`
    : "없음";

  if (panel === "activity") {
    return <StatsScreen mode={mode} onBack={() => setPanel("main")} />;
  }

  if (panel === "categories") {
    return <CategoryPanel mode={mode} onBack={() => setPanel("main")} />;
  }

  return (
    <div className="h-[calc(100%-54px)] overflow-auto pb-[100px] pt-1">
      <h1 className="px-5 pb-[18px] pt-3 text-[28px] font-bold tracking-[-0.6px]">설정</h1>
      <Group title="계정" mode={mode}>
        <Row title="상태" detail={statusDetail} mode={mode} />
        <Row title="프로필" detail={profileDetail} mode={mode} />
        {auth.error ? <Notice message={auth.error} mode={mode} /> : null}
        {auth.user ? (
          <Row
            title="로그아웃"
            mode={mode}
            disabled={authDisabled}
            onClick={() => void auth.signOut().catch(() => undefined)}
            last
          />
        ) : (
          <>
            {authProviders.map((provider, index) => (
              <Row
                key={provider.id}
                title={provider.enabled ? provider.label : provider.unavailableLabel}
                detail={provider.enabled ? undefined : "비활성"}
                mode={mode}
                disabled={authDisabled || !provider.enabled}
                onClick={() => void auth.signInWithProvider(provider.id).catch(() => undefined)}
                last={index === authProviders.length - 1}
              />
            ))}
          </>
        )}
      </Group>
      <Group title="알림" mode={mode}>
        <Row title="알림" mode={mode} right={<Toggle on={s.state.settings.notify} onChange={(v) => s.updateSetting("notify", v)} mode={mode} />} />
        <Row title="알림 시간" mode={mode} right={<input type="time" value={s.state.settings.notifyTime} onChange={(e) => s.updateSetting("notifyTime", e.target.value)} className="bg-transparent text-sm font-medium outline-none" style={{ color: t.textSecondary }} />} last />
      </Group>
      <Group title="디스플레이" mode={mode}>
        <Row title="다크모드" mode={mode} right={<Toggle on={s.state.view.dark} onChange={s.setDark} mode={mode} />} />
        <Row title="캘린더 시작 요일" detail={s.state.settings.weekStart === 0 ? "일요일" : "월요일"} mode={mode} onClick={() => s.updateSetting("weekStart", s.state.settings.weekStart === 0 ? 1 : 0)} last />
      </Group>
      <Group title="카테고리" mode={mode}>
        <Row title="카테고리 관리" detail={`${s.state.categories.length}개`} mode={mode} onClick={() => setPanel("categories")} last />
      </Group>
      <Group title="리포트" mode={mode}>
        <Row title="활동 요약" detail="월간" mode={mode} onClick={() => setPanel("activity")} last />
      </Group>
      <Group title="구독" mode={mode}>
        <Row title="현재 플랜" detail={s.state.settings.plan === "pro" ? "Pro" : "Free"} mode={mode} />
        <Row title="Pro로 업그레이드" mode={mode} last highlight />
      </Group>
      <Group title="동기화" mode={mode}>
        <Row
          title="연결 상태"
          detail={s.syncStatus.isOnline ? "온라인" : "오프라인"}
          mode={mode}
        />
        <Row title="저장 상태" detail={syncDetail} mode={mode} />
        <Row title="대기 중인 변경" detail={pendingDetail} mode={mode} last={!s.syncError} />
        {s.syncError ? <Notice message={s.syncError} mode={mode} /> : null}
        {s.syncError ? (
          <Row title="오류 지우기" mode={mode} onClick={s.clearSyncError} last />
        ) : null}
      </Group>
      <Group title="데이터" mode={mode}>
        <Row title="데이터 초기화" mode={mode} danger onClick={s.reset} last />
      </Group>
    </div>
  );
}

function CategoryPanel({ mode, onBack }: { mode: ThemeMode; onBack: () => void }) {
  const s = useJustDo();
  const t = tokens[mode];
  const categories = sortedCategories(s.state.categories);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(categoryPalette[0]);
  const [draftHex, setDraftHex] = useState(categoryPalette[0]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const moveByDirection = (id: string, direction: -1 | 1) => {
    const index = categories.findIndex((category) => category.id === id);
    const swap = categories[index + direction];
    const current = categories[index];
    if (!current || !swap) return;
    s.updateCategory(current.id, { position: swap.position });
    s.updateCategory(swap.id, { position: current.position });
  };

  const moveToIndex = (id: string, targetIndex: number) => {
    const fromIndex = categories.findIndex((category) => category.id === id);
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    const next = categories.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    next.forEach((category, index) => {
      if (category.position !== index) s.updateCategory(category.id, { position: index });
    });
  };

  const add = () => {
    const normalized = normalizeHexInput(draftHex) ?? draftColor;
    s.addCategory({ name: draftName, color: normalized });
    setDraftName("");
    setDraftColor(normalized);
    setDraftHex(normalized);
  };

  return (
    <div className="h-[calc(100%-54px)] overflow-auto px-5 pb-[100px] pt-3">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: t.surface, color: t.text }}
          aria-label="뒤로"
        >
          <svg width="8" height="14" viewBox="0 0 8 14">
            <path d="M6 1L1 7l5 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[28px] font-bold tracking-[-0.6px]">카테고리</h1>
      </header>

      <section className="mb-4 rounded-[14px] p-3.5" style={{ background: t.surface }}>
        <div className="mb-2 text-[11px] font-semibold" style={{ color: t.textTertiary }}>새 카테고리</div>
        <div className="flex items-center gap-2">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="이름"
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: t.divider, color: t.text }}
          />
          <input
            value={draftHex}
            onChange={(event) => {
              setDraftHex(event.target.value);
              const normalized = normalizeHexInput(event.target.value);
              if (normalized) setDraftColor(normalized);
            }}
            placeholder="#4F6FD8"
            className="w-[86px] rounded-lg border bg-transparent px-2.5 py-2 text-xs font-semibold outline-none"
            style={{ borderColor: t.divider, color: t.text }}
            aria-label="카테고리 hex 색상"
          />
          <button
            type="button"
            onClick={add}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ background: draftName.trim() ? t.accent : t.dividerStrong }}
          >
            추가
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categoryPalette.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`색상 ${color}`}
              onClick={() => {
                setDraftColor(color);
                setDraftHex(color);
              }}
              className="h-6 w-6 rounded-full"
              style={{
                background: color,
                boxShadow: draftColor.toLowerCase() === color.toLowerCase()
                  ? `0 0 0 2px ${t.surface}, 0 0 0 4px ${t.text}`
                  : `0 0 0 1px ${t.divider}`,
              }}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px]" style={{ background: t.surface }}>
        {categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            mode={mode}
            first={index === 0}
            last={index === categories.length - 1}
            isLastRow={index === categories.length - 1}
            canDelete={categories.length > 1}
            dragging={draggedId === category.id}
            onMove={(direction) => moveByDirection(category.id, direction)}
            onDragStart={() => setDraggedId(category.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={() => {
              if (draggedId) moveToIndex(draggedId, index);
            }}
          />
        ))}
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  mode,
  first,
  last,
  isLastRow,
  canDelete,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
}: {
  category: { id: string; name: string; color: string; isDefault: boolean; position: number };
  mode: ThemeMode;
  first: boolean;
  last: boolean;
  isLastRow: boolean;
  canDelete: boolean;
  dragging: boolean;
  onMove: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
}) {
  const s = useJustDo();
  const t = tokens[mode];
  const c = categoryStyle(category, mode);
  const [hexDraft, setHexDraft] = useState(category.color);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      className="px-3.5 py-3"
      style={{
        borderBottom: isLastRow ? "none" : `0.5px solid ${t.divider}`,
        opacity: dragging ? 0.55 : 1,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-4 items-center justify-center text-[15px]" style={{ color: t.textTertiary }} aria-hidden>
          ⋮
        </span>
        <span className="h-3 w-3 rounded-full" style={{ background: c.solid }} />
        <input
          value={category.name}
          onChange={(event) => s.updateCategory(category.id, { name: event.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
          style={{ color: t.text }}
        />
        <IconMoveButton direction="up" disabled={first} onClick={() => onMove(-1)} mode={mode} />
        <IconMoveButton direction="down" disabled={last} onClick={() => onMove(1)} mode={mode} />
      </div>
      <div className="flex items-center gap-2">
        <input
          value={hexDraft}
          onChange={(event) => {
            setHexDraft(event.target.value);
            const normalized = normalizeHexInput(event.target.value);
            if (normalized) s.updateCategory(category.id, { color: normalized });
          }}
          className="w-[82px] rounded-lg border bg-transparent px-2 py-1.5 text-xs font-semibold outline-none"
          style={{ borderColor: t.divider, color: t.text }}
          aria-label={`${category.name} hex 색상`}
        />
        <div className="flex flex-1 flex-wrap gap-1.5">
          {categoryPalette.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`${category.name} 색상 ${color}`}
              onClick={() => {
                setHexDraft(color);
                s.updateCategory(category.id, { color });
              }}
              className="h-5 w-5 rounded-full"
              style={{
                background: color,
                boxShadow: category.color.toLowerCase() === color.toLowerCase()
                  ? `0 0 0 2px ${t.surface}, 0 0 0 4px ${c.ink}`
                  : `0 0 0 1px ${t.divider}`,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={!canDelete}
          onClick={() => s.deleteCategory(category.id)}
          className="text-xs font-medium disabled:opacity-30"
          style={{ color: t.ext.ink }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function IconMoveButton({
  direction,
  disabled,
  onClick,
  mode,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
  mode: ThemeMode;
}) {
  const t = tokens[mode];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-30"
      style={{ background: t.surfaceAlt, color: t.textSecondary }}
      aria-label={direction === "up" ? "위로 이동" : "아래로 이동"}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        {direction === "up" ? (
          <path d="M6 2.5 2.5 6m3.5-3.5L9.5 6M6 2.5v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : (
          <path d="M6 9.5 2.5 6m3.5 3.5L9.5 6M6 9.5v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
      </svg>
    </button>
  );
}

function Group({ title, mode, children }: { title: string; mode: ThemeMode; children: React.ReactNode }) {
  const t = tokens[mode];
  return (
    <section className="mb-[22px]">
      <div className="px-5 pb-2 text-[11px] font-semibold tracking-[0.4px]" style={{ color: t.textTertiary }}>{title}</div>
      <div className="mx-3.5 overflow-hidden rounded-[14px]" style={{ background: t.surface }}>{children}</div>
    </section>
  );
}

function Row({
  title,
  detail,
  right,
  mode,
  last = false,
  danger = false,
  highlight = false,
  disabled = false,
  onClick,
}: {
  title: string;
  detail?: string;
  right?: React.ReactNode;
  mode: ThemeMode;
  last?: boolean;
  danger?: boolean;
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const t = tokens[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 w-full items-center gap-3 px-3.5 py-[13px] text-left disabled:cursor-not-allowed"
      style={{
        borderBottom: last ? "none" : `0.5px solid ${t.divider}`,
        opacity: disabled ? 0.48 : 1,
      }}
    >
      <span className="flex-1 text-[15px] font-medium tracking-[-0.2px]" style={{ color: danger ? t.ext.ink : highlight ? t.me.ink : t.text }}>{title}</span>
      {detail ? <span className="text-sm font-medium" style={{ color: t.textSecondary }}>{detail}</span> : null}
      {right}
    </button>
  );
}

function Notice({ message, mode }: { message: string; mode: ThemeMode }) {
  const t = tokens[mode];
  return (
    <div className="px-3.5 py-3 text-[12px] leading-[18px]" style={{ color: t.ext.ink, borderBottom: `0.5px solid ${t.divider}` }}>
      {message}
    </div>
  );
}

function Toggle({ on, onChange, mode }: { on: boolean; onChange: (on: boolean) => void; mode: ThemeMode }) {
  const t = tokens[mode];
  return (
    <span
      role="switch"
      aria-checked={on}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!on);
      }}
      className="flex h-[26px] w-[42px] items-center rounded-full p-0.5"
      style={{ justifyContent: on ? "flex-end" : "flex-start", background: on ? t.me.solid : t.dividerStrong }}
    >
      <span className="h-[22px] w-[22px] rounded-full bg-white shadow-sm" />
    </span>
  );
}
