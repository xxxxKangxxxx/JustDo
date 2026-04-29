"use client";

import { useState } from "react";
import { authProviders } from "@/lib/auth/providers";
import { useAuth } from "@/lib/auth/useAuth";
import { StatsScreen } from "./stats-screen";
import { useJustDo } from "./store";
import { tokens, type ThemeMode } from "./tokens";

export function SettingsScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const auth = useAuth();
  const t = tokens[mode];
  const [panel, setPanel] = useState<"main" | "activity">("main");
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

  if (panel === "activity") {
    return <StatsScreen mode={mode} onBack={() => setPanel("main")} />;
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
      <Group title="리포트" mode={mode}>
        <Row title="활동 요약" detail="월간" mode={mode} onClick={() => setPanel("activity")} last />
      </Group>
      <Group title="구독" mode={mode}>
        <Row title="현재 플랜" detail={s.state.settings.plan === "pro" ? "Pro" : "Free"} mode={mode} />
        <Row title="Pro로 업그레이드" mode={mode} last highlight />
      </Group>
      <Group title="동기화" mode={mode}>
        <Row
          title="저장 상태"
          detail={s.syncError ? "확인 필요" : "정상"}
          mode={mode}
          last={!s.syncError}
        />
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
