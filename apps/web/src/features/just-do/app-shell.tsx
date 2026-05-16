"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  daysInMonth,
  formatTime,
  isoOf,
  parseISO,
  todayISO,
  weekdayLabels,
  weekdayOfISO,
} from "@/lib/date";
import { authProviders } from "@/lib/auth/providers";
import { AuthProvider, useAuth } from "@/lib/auth/useAuth";
import {
  createTossPayment,
  tossBillingPlans,
  type TossBillingPlanInterval,
} from "@/lib/billing/toss-client";
import type { Habit, HabitRecurType, Priority, Task } from "@/types/domain";
import { habitActiveOn, habitStreak, tasksOnDate } from "./selectors";
import { JustDoProvider, useJustDo } from "./store";
import { mergeTags, parseTagInput } from "./tags";
import { categoryStyle, sortedCategories, tokens, type ThemeMode } from "./tokens";
import type { JustDoStorage } from "./persistence";

type Page = "calendar" | "stats" | "settings" | "search";
type CalendarView = "month" | "week" | "list";
type SettingsSection =
  | "account"
  | "notifications"
  | "display"
  | "categories"
  | "habits"
  | "subscription"
  | "sync"
  | "data";
type NewTaskDraft = { date: string; range?: [string, string]; time?: string } | null;
type UpgradePlan = TossBillingPlanInterval;
type PaymentMethodKey = "toss" | "card" | "bank" | "naverpay" | "kakaopay" | "other";
type BillingSubscription = {
  id: string;
  plan_name: string;
  status: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  subscribed_at: string | null;
  expires_at: string | null;
  billing_provider: string | null;
  plan_interval: string;
  amount_krw: number;
  currency: string;
  next_billing_at: string | null;
  cancel_at: string | null;
  cancelled_at: string | null;
  last_payment_at: string | null;
  payment_failures: number;
  payment_method_label: string | null;
  payment_method_last4: string | null;
};
type BillingSubscriptionResponse = {
  subscription: BillingSubscription | null;
};

const paymentMethods: Array<{
  key: PaymentMethodKey;
  label: string;
  enabled: boolean;
  accent: string;
  soft: string;
}> = [
  { key: "toss", label: "토스", enabled: true, accent: "#0064FF", soft: "#EAF2FF" },
  { key: "card", label: "신용카드", enabled: false, accent: "#4F6FD8", soft: "#EEF2FF" },
  { key: "bank", label: "계좌이체", enabled: false, accent: "#2F9B72", soft: "#EAF8F2" },
  { key: "naverpay", label: "네이버페이", enabled: false, accent: "#03C75A", soft: "#E7FBEF" },
  { key: "kakaopay", label: "카카오페이", enabled: false, accent: "#FEE500", soft: "#FFF9C7" },
  { key: "other", label: "기타결제수단", enabled: false, accent: "#6D7694", soft: "#F1F3F7" },
];
const subscriptionStatusLabels: Record<string, string> = {
  trial: "Trial",
  active: "활성",
  past_due: "결제 확인 필요",
  paused: "일시중지",
  expired: "만료",
  cancelled: "해지됨",
};

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const fontStack =
  '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "SF Pro Display", Pretendard, "Noto Sans KR", system-ui, sans-serif';
const priorityLabels: Record<Priority, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};
const priorityOrder: Array<"all" | Priority> = ["all", "high", "medium", "low"];
const habitEmojis = ["🌱", "💧", "🏃", "📖", "🧘", "✏️"] as const;
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

export function JustDoApp({ storage }: { storage?: JustDoStorage } = {}) {
  return (
    <AuthProvider>
      <JustDoAppWithAuth storage={storage} />
    </AuthProvider>
  );
}

function JustDoAppWithAuth({ storage }: { storage?: JustDoStorage }) {
  const { status, user } = useAuth();
  if (status === "loading") return <LoadingViewport mode="light" />;
  return (
    <JustDoProvider userId={user?.id ?? null} storage={storage}>
      <JustDoViewport />
    </JustDoProvider>
  );
}

function JustDoViewport() {
  const auth = useAuth();
  const s = useJustDo();
  const mode = s.state.view.dark ? "dark" : "light";
  const t = webTokens(mode);
  const today = todayISO();
  const [page, setPage] = useState<Page>("calendar");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [collapsed, setCollapsed] = useState(false);
  const [showToday, setShowToday] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [taskModalId, setTaskModalId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<NewTaskDraft>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1600);
  };

  const filteredTasks = useMemo(
    () => filterTasks(s.state.tasks, categoryFilter, priorityFilter, search),
    [categoryFilter, priorityFilter, s.state.tasks, search],
  );
  const visiblePage: Page = search.trim() ? "search" : page === "search" ? "calendar" : page;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (isInput) {
        if (event.key === "Escape") target?.blur();
        return;
      }
      if (event.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (taskModalId) setTaskModalId(null);
        else if (newTask) setNewTask(null);
        else if (selectedIds.length) setSelectedIds([]);
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewTask({ date: s.state.view.selectedDate });
        return;
      }
      if (event.key.toLowerCase() === "t") {
        s.setMonth(parseISO(today).year, parseISO(today).month);
        s.selectDate(today);
        return;
      }
      if (event.key.toLowerCase() === "j") s.selectDate(addDays(s.state.view.selectedDate, 1));
      if (event.key.toLowerCase() === "k") s.selectDate(addDays(s.state.view.selectedDate, -1));
      if (event.key === "1") {
        setCalendarView("month");
        setPage("calendar");
      }
      if (event.key === "2") {
        setCalendarView("week");
        setPage("calendar");
      }
      if (event.key === "3") {
        setCalendarView("list");
        setPage("calendar");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newTask, paletteOpen, s, selectedIds.length, taskModalId, today]);

  if (!s.isHydrated) return <LoadingViewport mode={mode} />;

  if (!auth.user) {
    return (
      <>
        <div className="md:hidden">
          <MobileWebGuide mode={mode} />
        </div>
        <div className="hidden md:block">
          <AuthScreen mode={mode} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <MobileWebGuide mode={mode} />
      </div>
      <div
        className="hidden h-screen overflow-hidden md:flex"
        style={{ background: t.bg, color: t.text, fontFamily: fontStack }}
      >
        <Sidebar
          mode={mode}
          page={visiblePage}
          collapsed={collapsed}
          categoryFilter={categoryFilter}
          priorityFilter={priorityFilter}
          onPage={setPage}
          onToggle={() => setCollapsed((value) => !value)}
          onCategory={setCategoryFilter}
          onPriority={setPriorityFilter}
          onSearchTag={(tag) => {
            setSearch(tag);
            setPage("search");
          }}
          onPalette={() => setPaletteOpen(true)}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            mode={mode}
            page={visiblePage}
            calendarView={calendarView}
            search={search}
            searchRef={searchRef}
            showToday={showToday}
            onSearch={(value) => {
              setSearch(value);
              if (value.trim()) setPage("search");
              else if (page === "search") setPage("calendar");
            }}
            onView={setCalendarView}
            onPrev={() => moveCalendar(s, calendarView, -1)}
            onNext={() => moveCalendar(s, calendarView, 1)}
            onToday={() => {
              const parsed = parseISO(today);
              s.setMonth(parsed.year, parsed.month);
              s.selectDate(today);
            }}
            onPalette={() => setPaletteOpen(true)}
            onToggleToday={() => setShowToday((value) => !value)}
            onNew={() => setNewTask({ date: s.state.view.selectedDate })}
          />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {visiblePage === "calendar" && calendarView === "month" ? (
                <MonthGrid
                  mode={mode}
                  tasks={filteredTasks}
                  onOpenTask={setTaskModalId}
                  onNewTask={setNewTask}
                />
              ) : null}
              {visiblePage === "calendar" && calendarView === "week" ? (
                <WeekView mode={mode} tasks={filteredTasks} onOpenTask={setTaskModalId} onNewTask={setNewTask} />
              ) : null}
              {visiblePage === "calendar" && calendarView === "list" ? (
                <ListView
                  mode={mode}
                  tasks={filteredTasks}
                  selectedIds={selectedIds}
                  onSelect={setSelectedIds}
                  onOpenTask={setTaskModalId}
                />
              ) : null}
              {visiblePage === "search" ? <SearchPage mode={mode} tasks={filteredTasks} query={search} onOpenTask={setTaskModalId} /> : null}
              {visiblePage === "stats" ? <StatsDashboard mode={mode} /> : null}
              {visiblePage === "settings" ? <SettingsPage mode={mode} /> : null}
            </div>
            {visiblePage === "calendar" && showToday ? <TodayPanel mode={mode} onOpenTask={setTaskModalId} /> : null}
          </div>
        </main>
        <TaskModal mode={mode} taskId={taskModalId} onClose={() => setTaskModalId(null)} onToast={flash} />
        <NewTaskInline mode={mode} draft={newTask} onClose={() => setNewTask(null)} onToast={flash} />
        <CommandPalette
          key={paletteOpen ? "palette-open" : "palette-closed"}
          mode={mode}
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          tasks={s.state.tasks}
          onOpenTask={setTaskModalId}
          onNew={() => setNewTask({ date: s.state.view.selectedDate })}
          onPage={setPage}
          onView={setCalendarView}
        />
        <BulkActionBar mode={mode} selectedIds={selectedIds} onClear={() => setSelectedIds([])} onToast={flash} />
        {toast ? <Toast mode={mode}>{toast}</Toast> : null}
      </div>
    </>
  );
}

function LoadingViewport({ mode }: { mode: ThemeMode }) {
  const t = webTokens(mode);
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: t.bg, color: t.text }}>
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-transparent"
        style={{
          borderTopColor: mode === "dark" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.35)",
          borderRightColor: mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
        }}
      />
    </div>
  );
}

function AuthScreen({ mode }: { mode: ThemeMode }) {
  const auth = useAuth();
  const t = webTokens(mode);
  return (
    <div className="flex h-screen items-center justify-center px-6" style={{ background: t.bg, color: t.text, fontFamily: fontStack }}>
      <div className="w-[380px] max-w-full text-center">
        <div className="inline-flex items-baseline gap-1 text-[44px] font-extrabold tracking-[-1.6px]">
          Just Do
          <span className="h-[9px] w-[9px] rounded-full" style={{ background: t.accent }} />
        </div>
        <p className="mt-2.5 text-[13px] leading-5" style={{ color: t.textSecondary }}>
          오늘 할 일을, 그냥 한다.
          <br />
          캘린더 위에서 시간을 디자인하세요.
        </p>
        <div className="mt-9 flex flex-col gap-2.5">
          {authProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={!provider.enabled || auth.status === "loading"}
              onClick={() => void auth.signInWithProvider(provider.id).catch(() => undefined)}
              className="flex h-11 items-center justify-center rounded-[10px] border text-[14px] font-semibold disabled:opacity-45"
              style={{
                borderColor: provider.id === "apple" ? "#000" : t.divider,
                background: provider.id === "apple" ? "#000" : t.surface,
                color: provider.id === "apple" ? "#fff" : t.text,
              }}
            >
              {provider.enabled ? provider.label : provider.unavailableLabel}
            </button>
          ))}
        </div>
        {auth.error ? <p className="mt-4 text-xs" style={{ color: t.danger }}>{auth.error}</p> : null}
      </div>
    </div>
  );
}

function MobileWebGuide({ mode }: { mode: ThemeMode }) {
  const t = webTokens(mode);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL;

  useEffect(() => {
    if (!iosUrl) return;
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    if (window.sessionStorage.getItem("justdo:ios-redirect") === "1") return;
    window.sessionStorage.setItem("justdo:ios-redirect", "1");
    window.location.replace(iosUrl);
  }, [iosUrl]);

  return (
    <div
      className="min-h-dvh overflow-hidden px-5 py-6"
      style={{ background: t.bg, color: t.text, fontFamily: fontStack }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] max-w-[430px] flex-col justify-between">
        <div>
          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-baseline gap-1 text-[25px] font-extrabold tracking-[-0.7px]">
              Just Do
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: t.accent }} />
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: t.selected, color: t.textSecondary }}
            >
              Web
            </span>
          </div>

          <div className="relative mb-8 h-[295px]">
            <div
              className="absolute left-1/2 top-2 h-[245px] w-[325px] max-w-[86vw] -translate-x-1/2 rounded-[18px] border p-3 shadow-2xl"
              style={{ background: t.surface, borderColor: t.divider }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.danger }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.ext.solid }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.habit.solid }} />
                <span className="ml-auto h-2 w-16 rounded-full" style={{ background: t.divider }} />
              </div>
              <div className="grid h-[194px] grid-cols-[64px_1fr] gap-2">
                <div className="rounded-[10px] p-2" style={{ background: t.bg2 }}>
                  <div className="mb-2 h-2.5 w-9 rounded-full" style={{ background: t.accent }} />
                  <div className="mb-1.5 h-2 w-11 rounded-full" style={{ background: t.dividerStrong }} />
                  <div className="mb-1.5 h-2 w-8 rounded-full" style={{ background: t.divider }} />
                  <div className="h-2 w-10 rounded-full" style={{ background: t.divider }} />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      key={index}
                      className="rounded-[7px] border p-1.5"
                      style={{ borderColor: t.divider, background: index === 4 ? t.me.softer : t.bg2 }}
                    >
                      <div className="mb-2 h-1.5 w-3 rounded-full" style={{ background: index === 4 ? t.me.solid : t.divider }} />
                      {index === 4 || index === 8 ? (
                        <div className="h-3 rounded-[4px]" style={{ background: index === 4 ? t.me.solid : t.ext.solid }} />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div
              className="absolute bottom-0 right-2 h-[150px] w-[84px] rounded-[22px] border-[5px] shadow-xl"
              style={{ background: t.surface, borderColor: mode === "dark" ? "#0D0C0A" : "#1F1B16" }}
            >
              <div className="mx-auto mt-2 h-1 w-7 rounded-full" style={{ background: t.dividerStrong }} />
              <div className="px-2 pt-4">
                <div className="mb-2 h-2 w-9 rounded-full" style={{ background: t.text }} />
                <div className="mb-1.5 h-8 rounded-lg" style={{ background: t.me.softer }} />
                <div className="mb-1.5 h-8 rounded-lg" style={{ background: t.habit.softer }} />
                <div className="h-8 rounded-lg" style={{ background: t.bg2 }} />
              </div>
            </div>
          </div>

          <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.9px]">
            Web은 데스크톱 화면에 맞춰 준비 중입니다.
          </h1>
          <p className="mt-3 text-[14px] leading-6" style={{ color: t.textSecondary }}>
            모바일에서는 iOS 앱을 기준으로 확인하고, web은 캘린더와 사이드 패널을 넓은 화면에서 쓰는 별도 경험으로 구현합니다.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <MobileGuideIosCta mode={mode} iosUrl={iosUrl} />
          <MobileGuideAndroidCta mode={mode} />
        </div>

        <div className="mt-6 rounded-[14px] border p-4" style={{ background: t.surface, borderColor: t.divider }}>
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.35px]" style={{ color: t.textTertiary }}>
            권장 환경
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[10px] p-3" style={{ background: t.bg2 }}>
              <div className="mb-2 h-7 w-7 rounded-lg" style={{ background: t.me.softer, color: t.me.ink }}>
                <IconDesktop />
              </div>
              <div className="text-[13px] font-bold">데스크톱 Web</div>
              <div className="mt-1 text-[11px] leading-4" style={{ color: t.textTertiary }}>1024px 이상</div>
            </div>
            <div className="rounded-[10px] p-3" style={{ background: t.bg2 }}>
              <div className="mb-2 h-7 w-7 rounded-lg" style={{ background: t.habit.softer, color: t.habit.ink }}>
                <IconPhone />
              </div>
              <div className="text-[13px] font-bold">모바일 App</div>
              <div className="mt-1 text-[11px] leading-4" style={{ color: t.textTertiary }}>iOS 앱 기준</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileGuideIosCta({ mode, iosUrl }: { mode: ThemeMode; iosUrl: string | undefined }) {
  const t = webTokens(mode);
  const enabled = Boolean(iosUrl);
  return (
    <div className="rounded-[14px] border p-4" style={{ background: t.surface, borderColor: t.divider }}>
      <div className="mb-1 text-[13px] font-bold">iOS 앱</div>
      <div className="mb-3 text-[12px] leading-5" style={{ color: t.textSecondary }}>
        {enabled
          ? "App Store에서 Just Do를 받아 모바일에서 바로 사용하세요."
          : "iOS 앱은 곧 App Store에 출시됩니다. 출시되면 이 화면에서 바로 이동할 수 있어요."}
      </div>
      <a
        href={enabled ? iosUrl : undefined}
        aria-disabled={!enabled}
        onClick={(event) => {
          if (!enabled) event.preventDefault();
        }}
        className="flex h-11 items-center justify-center rounded-[10px] text-[14px] font-semibold transition-opacity"
        style={{
          background: t.text,
          color: t.bg,
          opacity: enabled ? 1 : 0.4,
          pointerEvents: enabled ? "auto" : "none",
        }}
      >
        {enabled ? "App Store에서 받기" : "App Store 출시 예정"}
      </a>
    </div>
  );
}

function MobileGuideAndroidCta({ mode }: { mode: ThemeMode }) {
  const t = webTokens(mode);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage("이메일 형식을 확인해 주세요.");
      return;
    }
    setStatus("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, platform: "android", source: "mobile_web_guide" }),
      });
      if (!res.ok) {
        throw new Error(`status ${res.status}`);
      }
      setStatus("success");
      setMessage("출시 알림 신청이 완료됐어요.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const hint =
    status === "success"
      ? message
      : status === "error"
        ? message
        : "Android 앱은 v3에 출시 예정입니다. 출시되면 알려드릴게요.";

  const hintColor = status === "success" ? t.habit.ink : status === "error" ? t.danger : t.textSecondary;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[14px] border p-4"
      style={{ background: t.surface, borderColor: t.divider }}
    >
      <div className="mb-1 text-[13px] font-bold">Android 출시 알림</div>
      <div className="mb-3 text-[12px] leading-5" style={{ color: hintColor }}>
        {hint}
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-label="이메일"
          placeholder="you@example.com"
          value={email}
          disabled={status === "submitting"}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage(null);
            }
          }}
          className="h-11 min-w-0 flex-1 rounded-[10px] border px-3 text-[14px] outline-none"
          style={{ background: t.bg2, borderColor: t.divider, color: t.text }}
        />
        <button
          type="submit"
          disabled={status === "submitting" || status === "success"}
          className="h-11 shrink-0 rounded-[10px] px-3 text-[13px] font-semibold disabled:opacity-50"
          style={{ background: t.accent, color: "#fff" }}
        >
          {status === "submitting" ? "등록 중…" : status === "success" ? "완료" : "알림 받기"}
        </button>
      </div>
    </form>
  );
}

function Sidebar({
  mode,
  page,
  collapsed,
  categoryFilter,
  priorityFilter,
  onPage,
  onToggle,
  onCategory,
  onPriority,
  onSearchTag,
  onPalette,
}: {
  mode: ThemeMode;
  page: Page;
  collapsed: boolean;
  categoryFilter: string;
  priorityFilter: "all" | Priority;
  onPage: (page: Page) => void;
  onToggle: () => void;
  onCategory: (id: string) => void;
  onPriority: (priority: "all" | Priority) => void;
  onSearchTag: (tag: string) => void;
  onPalette: () => void;
}) {
  const s = useJustDo();
  const auth = useAuth();
  const t = webTokens(mode);
  const categories = sortedCategories(s.state.categories);
  const nav = [
    { id: "calendar" as const, label: "캘린더", icon: <IconCalendar /> },
    { id: "stats" as const, label: "통계", icon: <IconChart /> },
    { id: "settings" as const, label: "설정", icon: <IconGear /> },
  ];
  return (
    <aside
      className="flex shrink-0 flex-col border-r px-2.5 py-3.5 transition-[width]"
      style={{ width: collapsed ? 60 : 240, background: t.bg2, borderColor: t.divider }}
    >
      <div className={`flex items-center gap-2 px-2 pb-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed ? (
          <div className="inline-flex items-baseline gap-1 text-[19px] font-extrabold tracking-[-0.8px]">
            Just Do
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: t.accent }} />
          </div>
        ) : null}
        <IconShellButton mode={mode} title="사이드바 토글" onClick={onToggle}>
          <IconSidebar />
        </IconShellButton>
      </div>

      <div className="flex flex-col gap-0.5">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPage(item.id)}
            className={`flex items-center rounded-[7px] text-[13px] ${collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-[7px]"}`}
            style={{
              background: page === item.id ? t.selected : "transparent",
              color: page === item.id ? t.text : t.textSecondary,
              fontWeight: page === item.id ? 600 : 500,
            }}
          >
            {item.icon}
            {!collapsed ? item.label : null}
          </button>
        ))}
      </div>

      {!collapsed ? (
        <>
          <SidebarSection title="필터" mode={mode}>
            <SidebarChip active={categoryFilter === "all"} onClick={() => onCategory("all")} mode={mode}>
              전체 <span className="ml-auto rounded bg-[rgba(0,0,0,0.05)] px-1.5 text-[10px]">{s.state.tasks.length}</span>
            </SidebarChip>
            {categories.map((category) => (
              <SidebarChip key={category.id} active={categoryFilter === category.id} onClick={() => onCategory(category.id)} mode={mode} color={category.color}>
                {category.name}
              </SidebarChip>
            ))}
          </SidebarSection>
          <SidebarSection title="우선순위" mode={mode}>
            {priorityOrder.map((priority) => (
              <SidebarChip key={priority} active={priorityFilter === priority} onClick={() => onPriority(priority)} mode={mode}>
                {priority === "all" ? "모두" : priorityLabels[priority]}
              </SidebarChip>
            ))}
          </SidebarSection>
          <SidebarSection title="태그" mode={mode}>
            {topTags(s.state.tasks).map((tag) => (
              <SidebarChip key={tag} onClick={() => onSearchTag(tag)} mode={mode}>
                {tag}
              </SidebarChip>
            ))}
          </SidebarSection>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onPalette}
            className="mt-1.5 flex items-center justify-between rounded-[7px] border px-2.5 py-2 text-[12px] font-medium"
            style={{ borderColor: t.divider, color: t.textSecondary }}
          >
            <span className="flex items-center gap-2"><IconSearch /> 빠른 검색</span>
            <Kbd mode={mode}>⌘K</Kbd>
          </button>
          <button
            type="button"
            onClick={() => s.setDark(!s.state.view.dark)}
            className="mt-1.5 flex items-center gap-2 rounded-[7px] px-2.5 py-[7px] text-[12px] font-medium"
            style={{ color: t.textSecondary }}
          >
            <span className="w-3.5 text-center">{mode === "dark" ? "☾" : "☼"}</span>
            {mode === "dark" ? "다크 모드" : "라이트 모드"}
          </button>
          <div className="mt-2 flex items-center gap-2 border-t px-2.5 pb-1 pt-2.5" style={{ borderColor: t.divider }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: t.accent }}>
              {(auth.user?.displayName ?? auth.user?.email ?? "J").slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold">{auth.user?.displayName ?? "Just Do"}</div>
              <div className="truncate text-[10px]" style={{ color: t.textTertiary }}>{auth.user?.email}</div>
            </div>
            <button type="button" onClick={() => void auth.signOut().catch(() => undefined)} style={{ color: t.textTertiary }} title="로그아웃">
              <IconLogout />
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
}

function Header({
  mode,
  page,
  calendarView,
  search,
  searchRef,
  showToday,
  onSearch,
  onView,
  onPrev,
  onNext,
  onToday,
  onPalette,
  onToggleToday,
  onNew,
}: {
  mode: ThemeMode;
  page: Page;
  calendarView: CalendarView;
  search: string;
  searchRef: React.RefObject<HTMLInputElement | null>;
  showToday: boolean;
  onSearch: (value: string) => void;
  onView: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPalette: () => void;
  onToggleToday: () => void;
  onNew: () => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const title = page === "calendar" ? `${s.state.view.year}년 ${s.state.view.month}월` : page === "stats" ? "통계" : page === "settings" ? "설정" : "검색";
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b px-[22px] py-2.5 backdrop-blur-xl xl:gap-4" style={{ background: t.glass, borderColor: t.glassBorder }}>
      {page === "calendar" ? (
        <>
          <div className="flex shrink-0 items-center gap-2.5">
            <IconShellButton mode={mode} title="이전" onClick={onPrev}><IconChevronLeft /></IconShellButton>
            <button type="button" onClick={onToday} className="whitespace-nowrap rounded-md border px-2.5 py-[5px] text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.textSecondary }}>
              오늘
            </button>
            <IconShellButton mode={mode} title="다음" onClick={onNext}><IconChevronRight /></IconShellButton>
          </div>
          <div className="shrink-0 whitespace-nowrap text-[19px] font-bold tracking-[-0.6px]">{title}</div>
          <div className="flex shrink-0 gap-px rounded-lg p-0.5" style={{ background: t.surfaceAlt }}>
            {(["month", "week", "list"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => onView(view)}
                className="whitespace-nowrap rounded-md px-3 py-[5px] text-[12px] font-semibold"
                style={{
                  background: calendarView === view ? t.surface : "transparent",
                  color: calendarView === view ? t.text : t.textSecondary,
                  boxShadow: calendarView === view ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {view === "month" ? "월" : view === "week" ? "주" : "리스트"}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="shrink-0 whitespace-nowrap text-[19px] font-bold tracking-[-0.6px]">{title}</div>
      )}
      <div className="min-w-0 flex-1" />
      <div className="relative hidden w-[180px] shrink-0 xl:block xl:w-[280px]">
        <span className="absolute left-[11px] top-1/2 -translate-y-1/2" style={{ color: t.textTertiary }}><IconSearch /></span>
        <input
          ref={searchRef}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="제목, 태그, 날짜 검색  /"
          className="w-full rounded-lg border py-[7px] pl-[30px] pr-2.5 text-[12.5px] outline-none"
          style={{ background: t.surface, borderColor: t.divider, color: t.text }}
        />
      </div>
      <IconShellButton mode={mode} title="명령 (⌘K)" onClick={onPalette}><IconCommand /></IconShellButton>
      <IconShellButton mode={mode} title="Today 패널" active={showToday} onClick={onToggleToday}><IconPanel /></IconShellButton>
      <button
        type="button"
        onClick={onNew}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-white"
        style={{ background: t.accent }}
      >
        <IconPlus /> 새 Task <span className="rounded bg-white/20 px-1 text-[10px]">N</span>
      </button>
    </header>
  );
}

function MonthGrid({
  mode,
  tasks,
  onOpenTask,
  onNewTask,
}: {
  mode: ThemeMode;
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onNewTask: (draft: NewTaskDraft) => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const weeks = monthWeeks(s.state.view.year, s.state.view.month, s.state.settings.weekStart, tasks);
  const labels = weekdayLabels(s.state.settings.weekStart);
  const today = todayISO();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b" style={{ background: t.bg, borderColor: t.divider }}>
        {labels.map((label) => (
          <div key={label} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: label === "일" ? t.ext.ink : label === "토" ? t.me.ink : t.textTertiary }}>
            {label}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="relative grid grid-cols-7 border-b" style={{ borderColor: weekIndex === weeks.length - 1 ? "transparent" : t.divider }}>
            {week.cells.map((cell, index) => {
              const isSelected = cell.iso === s.state.view.selectedDate;
              const isToday = cell.iso === today;
              return (
                <div
                  key={cell.iso}
                  role="button"
                  tabIndex={0}
                  onClick={() => s.selectDate(cell.iso)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    s.selectDate(cell.iso);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    const id = event.dataTransfer.getData("text/task");
                    if (id) moveTaskToDate(s, id, cell.iso);
                  }}
                  className="group relative flex min-h-0 flex-col gap-0.5 border-r px-2 py-1.5 text-left"
                  style={{
                    borderColor: index === 6 ? "transparent" : t.divider,
                    background: isSelected ? t.selected : "transparent",
                    opacity: cell.muted ? 0.45 : 1,
                  }}
                >
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px]" style={{ background: isToday ? t.accent : "transparent", color: isToday ? "#fff" : t.text, fontWeight: isToday ? 700 : 500 }}>
                    {cell.day}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${cell.day}일에 항목 추가`}
                    onClick={(event) => {
                      event.stopPropagation();
                      s.selectDate(cell.iso);
                      onNewTask({ date: cell.iso });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      s.selectDate(cell.iso);
                      onNewTask({ date: cell.iso });
                    }}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-[14px] font-semibold opacity-0 transition group-hover:opacity-100"
                    style={{ background: t.accent, color: "#fff" }}
                  >
                    +
                  </span>
                  <span className="flex-1" />
                </div>
              );
            })}
            <div className="pointer-events-none absolute inset-x-0 bottom-1 top-[30px] flex flex-col gap-0.5">
              {week.tracks.slice(0, 4).map((track, trackIndex) => (
                <div key={trackIndex} className="relative h-5">
                  {track.map(({ task, startCol, endCol }) => {
                    const category = s.state.categories.find((item) => item.id === task.categoryId);
                    const c = categoryStyle(category, mode);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/task", task.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenTask(task.id);
                        }}
                        className="pointer-events-auto absolute h-[18px] overflow-hidden rounded px-1.5 text-left text-[11px] font-semibold leading-[18px]"
                        style={{
                          left: `calc(${(startCol / 7) * 100}% + 4px)`,
                          width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 8px)`,
                          background: c.soft,
                          color: c.ink,
                          borderLeft: `2px solid ${c.solid}`,
                          opacity: task.isCompleted ? 0.55 : 1,
                          textDecoration: task.isCompleted ? "line-through" : "none",
                        }}
                        title={task.title}
                      >
                        {task.scheduledTime ? <span className="mr-1 font-medium opacity-70">{task.scheduledTime}</span> : null}
                        {task.title}
                      </button>
                    );
                  })}
                </div>
              ))}
              {week.tracks.length > 4 ? <div className="absolute bottom-0 right-1.5 text-[10px]" style={{ color: t.textTertiary }}>+{week.tracks.length - 4}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({
  mode,
  tasks,
  onOpenTask,
  onNewTask,
}: {
  mode: ThemeMode;
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onNewTask: (draft: NewTaskDraft) => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const start = weekStart(s.state.view.selectedDate, s.state.settings.weekStart);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const labels = weekdayLabels(s.state.settings.weekStart);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid border-b" style={{ gridTemplateColumns: "50px repeat(7, 1fr)", borderColor: t.divider, background: t.bg }}>
        <div />
        {days.map((day, index) => {
          const parsed = parseISO(day);
          return (
            <button key={day} type="button" onClick={() => s.selectDate(day)} className="border-l px-2.5 py-2 text-left" style={{ borderColor: t.divider }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>{labels[index]}</div>
              <div className="mt-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full text-[16px] font-bold" style={{ background: day === todayISO() ? t.accent : "transparent", color: day === todayISO() ? "#fff" : t.text }}>{parsed.day}</div>
            </button>
          );
        })}
      </div>
      <div className="grid border-b py-1" style={{ gridTemplateColumns: "50px repeat(7, 1fr)", borderColor: t.divider, background: t.bg2 }}>
        <div className="px-2 py-1 text-right text-[10px]" style={{ color: t.textTertiary }}>종일</div>
        {days.map((day) => (
          <div key={day} className="flex min-h-[34px] flex-col gap-0.5 border-l px-1" style={{ borderColor: t.divider }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveTaskToDate(s, event.dataTransfer.getData("text/task"), day)}>
            {tasksOnDate(tasks, day).filter((task) => !task.scheduledTime).slice(0, 2).map((task) => <CompactTask key={task.id} mode={mode} task={task} onOpen={onOpenTask} />)}
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
          <div>
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="h-9 border-t px-2 text-right text-[10px]" style={{ borderColor: hour === 0 ? "transparent" : t.divider, color: t.textTertiary }}>{hour === 0 ? "" : `${hour}시`}</div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day} className="relative border-l" style={{ borderColor: t.divider }}>
              {Array.from({ length: 24 }, (_, hour) => (
                <button key={hour} type="button" className="block h-9 w-full border-t" style={{ borderColor: hour === 0 ? "transparent" : t.divider }} onClick={() => onNewTask({ date: day, time: `${String(hour).padStart(2, "0")}:00` })} />
              ))}
              {tasksOnDate(tasks, day).filter((task) => task.scheduledTime).map((task) => {
                const [hour, minute] = (task.scheduledTime ?? "00:00").split(":").map(Number);
                const category = s.state.categories.find((item) => item.id === task.categoryId);
                const c = categoryStyle(category, mode);
                return (
                  <button key={task.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/task", task.id)} onClick={() => onOpenTask(task.id)} className="absolute left-1 right-1 min-h-8 rounded px-2 py-1 text-left" style={{ top: hour * 36 + (minute / 60) * 36, background: c.soft, color: c.ink, borderLeft: `3px solid ${c.solid}`, opacity: task.isCompleted ? 0.55 : 1 }}>
                    <div className="text-[10px] font-semibold opacity-70">{formatTime(task.scheduledTime)}</div>
                    <div className="truncate text-[11.5px] font-bold">{task.title}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListView({
  mode,
  tasks,
  selectedIds,
  onSelect,
  onOpenTask,
}: {
  mode: ThemeMode;
  tasks: Task[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onOpenTask: (id: string) => void;
}) {
  const t = webTokens(mode);
  const today = todayISO();
  const upcoming = addDays(today, 7);
  const sections = [
    { title: "오늘", items: tasks.filter((task) => !task.isCompleted && task.startDate <= today && today <= task.endDate) },
    { title: "다가오는 7일", items: tasks.filter((task) => !task.isCompleted && task.startDate > today && task.startDate <= upcoming) },
    { title: "나중에", items: tasks.filter((task) => !task.isCompleted && task.startDate > upcoming) },
    { title: "완료", items: tasks.filter((task) => task.isCompleted) },
  ];
  return (
    <div className="flex-1 overflow-auto px-7 py-5">
      <div className="mx-auto max-w-[920px]">
        {sections.map((section) => (
          <section key={section.title} className="mb-5 overflow-hidden rounded-[10px] border" style={{ background: t.surface, borderColor: t.divider }}>
            <div className="border-b px-4 py-2 text-[11px] font-bold uppercase tracking-[0.4px]" style={{ borderColor: t.divider, color: t.textTertiary }}>
              {section.title} {section.items.length}
            </div>
            {section.items.length ? section.items.map((task, index) => (
              <TaskRow
                key={task.id}
                mode={mode}
                task={task}
                selected={selectedIds.includes(task.id)}
                last={index === section.items.length - 1}
                onOpen={onOpenTask}
                onToggleSelect={(id) => onSelect(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id])}
              />
            )) : <div className="px-4 py-5 text-[12px]" style={{ color: t.textTertiary }}>비어 있습니다</div>}
          </section>
        ))}
      </div>
    </div>
  );
}

function TodayPanel({
  mode,
  onOpenTask,
}: {
  mode: ThemeMode;
  onOpenTask: (id: string) => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const date = s.state.view.selectedDate;
  const parsed = parseISO(date);
  const tasks = tasksOnDate(s.state.tasks, date);
  const done = tasks.filter((task) => task.isCompleted);
  const habits = s.state.habits.filter((habit) => habitActiveOn(habit, date));
  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-auto border-l" style={{ background: t.bg2, borderColor: t.divider }}>
      <div className="border-b px-4 py-3.5" style={{ borderColor: t.divider }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>{date === todayISO() ? "오늘" : "선택 날짜"}</div>
        <div className="mt-0.5 text-[22px] font-bold tracking-[-0.5px]">
          {parsed.month}월 {parsed.day}일 <span className="ml-1 text-[13px] font-medium" style={{ color: t.textTertiary }}>{weekdayLabels()[weekdayOfISO(date)]}요일</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: t.surfaceAlt }}>
          <div className="h-full rounded-full" style={{ width: `${tasks.length ? Math.round((done.length / tasks.length) * 100) : 0}%`, background: t.me.solid }} />
        </div>
        <div className="mt-1 text-[11px]" style={{ color: t.textTertiary }}>{done.length}/{tasks.length} 완료</div>
      </div>
      <div className="px-3.5 py-3">
        <div className="mb-1.5 flex items-center text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>
          할일 {tasks.length}
        </div>
        {tasks.length ? tasks.map((task) => <TodayCard key={task.id} mode={mode} task={task} onOpen={onOpenTask} />) : <div className="px-1 py-2 text-[12px]" style={{ color: t.textTertiary }}>등록된 할일이 없어요</div>}
      </div>
      <div className="mt-1 border-t px-3.5 py-4" style={{ borderColor: t.divider }}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>습관</div>
        <div className="flex flex-col gap-1.5">
          {habits.map((habit) => (
            <HabitMiniRow key={habit.id} mode={mode} habit={habit} iso={date} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function TaskModal({
  mode,
  taskId,
  onClose,
  onToast,
}: {
  mode: ThemeMode;
  taskId: string | null;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const task = taskId ? s.state.tasks.find((item) => item.id === taskId) : null;
  if (!task) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[3px]" onClick={onClose}>
      <div className="flex max-h-[86vh] w-[540px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border shadow-2xl" style={{ background: t.surface, borderColor: t.divider }} onClick={(event) => event.stopPropagation()}>
        <TaskModalBody key={task.id} mode={mode} task={task} onClose={onClose} onToast={onToast} />
      </div>
    </div>
  );
}

function TaskModalBody({
  mode,
  task,
  onClose,
  onToast,
}: {
  mode: ThemeMode;
  task: Task;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const categories = sortedCategories(s.state.categories);
  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.startDate);
  const [endDate, setEndDate] = useState(task.endDate);
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(task.categoryId);
  const [priority, setPriority] = useState<Priority>(task.priority ?? "medium");
  const [tags, setTags] = useState<string[]>(task.tags);
  const [tagDraft, setTagDraft] = useState("");
  const category = categories.find((item) => item.id === categoryId) ?? categories[0] ?? null;
  const c = categoryStyle(category, mode);
  const save = () => {
    if (!title.trim()) return;
    s.updateTask(task.id, {
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      scheduledTime: scheduledTime || null,
      categoryId: category?.id ?? null,
      priority,
      tags,
    });
    onToast("저장됨");
  };
  const updateTags = (nextTags: string[]) => {
    setTags(nextTags);
    s.updateTask(task.id, { tags: nextTags });
  };
  const commitTagDraft = (raw: string) => {
    const parsed = parseTagInput(raw);
    setTagDraft("");
    if (!parsed.length) return;
    updateTags(mergeTags(tags, parsed));
  };
  const onTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingInputEvent(event)) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTagDraft(event.currentTarget.value || tagDraft);
      return;
    }
    if (event.key === "Backspace" && !tagDraft && tags.length) {
      event.preventDefault();
      updateTags(tags.slice(0, -1));
    }
  };
  return (
    <>
        <div className="flex items-center gap-2.5 border-b px-[18px] py-3.5" style={{ borderColor: t.divider }}>
          <button type="button" onClick={() => s.toggleTask(task.id)} className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border" style={{ background: task.isCompleted ? c.solid : "transparent", borderColor: task.isCompleted ? c.solid : c.ink }}>
            {task.isCompleted ? <IconCheck /> : null}
          </button>
          <input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={save} className="min-w-0 flex-1 bg-transparent text-[19px] font-bold tracking-[-0.4px] outline-none" style={{ color: t.text, textDecoration: task.isCompleted ? "line-through" : "none", opacity: task.isCompleted ? 0.55 : 1 }} />
          <IconShellButton mode={mode} title="삭제" onClick={() => { s.deleteTask(task.id); onClose(); onToast("삭제됨"); }}><IconTrash /></IconShellButton>
          <IconShellButton mode={mode} title="닫기" onClick={onClose}><IconClose /></IconShellButton>
        </div>
        <div className="flex flex-col gap-2.5 overflow-auto px-[18px] py-4">
          <ModalRow label="기간" mode={mode}>
            <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (event.target.value > endDate) setEndDate(event.target.value); }} onBlur={save} style={dateInputStyle(t)} />
            <span style={{ color: t.textTertiary }}>-</span>
            <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} onBlur={save} style={dateInputStyle(t)} />
          </ModalRow>
          <ModalRow label="시간" mode={mode}>
            <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} onBlur={save} style={dateInputStyle(t)} />
            {scheduledTime ? <button type="button" onClick={() => { setScheduledTime(""); s.updateTask(task.id, { scheduledTime: null }); }} className="text-[11px]" style={{ color: t.textTertiary }}>지우기</button> : null}
          </ModalRow>
          <ModalRow label="카테고리" mode={mode}>
            <div className="flex flex-wrap gap-1">
              {categories.map((item) => {
                const active = item.id === categoryId;
                const style = categoryStyle(item, mode);
                return <button key={item.id} type="button" onClick={() => { setCategoryId(item.id); s.updateTask(task.id, { categoryId: item.id }); }} className="rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: active ? style.soft : "transparent", color: active ? style.ink : t.textSecondary, border: active ? "none" : `0.5px solid ${t.divider}` }}>{item.name}</button>;
              })}
            </div>
          </ModalRow>
          <ModalRow label="우선순위" mode={mode}>
            <div className="flex gap-1">
              {(["high", "medium", "low"] as Priority[]).map((item) => (
                <button key={item} type="button" onClick={() => { setPriority(item); s.updateTask(task.id, { priority: item }); }} className="rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: priority === item ? c.soft : "transparent", color: priority === item ? c.ink : t.textSecondary, border: priority === item ? "none" : `0.5px solid ${t.divider}` }}>{priorityLabels[item]}</button>
              ))}
            </div>
          </ModalRow>
          <ModalRow label="태그" mode={mode}>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => updateTags(tags.filter((item) => item !== tag))}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium"
                  style={{ background: c.soft, color: c.ink }}
                  aria-label={`태그 ${tag} 삭제`}
                >
                  <span>{tag}</span>
                  <span aria-hidden style={{ opacity: 0.7 }}>×</span>
                </button>
              ))}
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={(event) => commitTagDraft(event.currentTarget.value || tagDraft)}
                placeholder={tags.length ? "" : "태그 추가"}
                className="min-w-[100px] flex-1 bg-transparent py-1 text-[13px] font-medium outline-none"
                style={{ color: t.text }}
                aria-label="Task 태그 추가"
              />
            </div>
          </ModalRow>
        </div>
        <div className="flex items-center justify-between border-t px-[18px] py-2.5 text-[11px]" style={{ borderColor: t.divider, color: t.textTertiary }}>
          <span>드래그해서 다른 날짜로 이동</span>
          <span><Kbd mode={mode}>Esc</Kbd> 닫기</span>
        </div>
    </>
  );
}

function NewTaskInline({ mode, draft, onClose, onToast }: { mode: ThemeMode; draft: NewTaskDraft; onClose: () => void; onToast: (message: string) => void }) {
  if (!draft) return null;
  const start = draft.range?.[0] ?? draft.date;
  const end = draft.range?.[1] ?? draft.date;
  return <NewTaskInlineBody key={`${start}-${end}-${draft.time ?? ""}`} mode={mode} draft={draft} onClose={onClose} onToast={onToast} />;
}

function NewTaskInlineBody({ mode, draft, onClose, onToast }: { mode: ThemeMode; draft: NonNullable<NewTaskDraft>; onClose: () => void; onToast: (message: string) => void }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const categories = sortedCategories(s.state.categories);
  const initDate = draft.range?.[0] ?? draft.date;
  const initEndDate = draft.range?.[1] ?? draft.date;
  const [type, setType] = useState<"task" | "habit">("task");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(initDate);
  const [endDate, setEndDate] = useState(initEndDate);
  const [scheduledTime, setScheduledTime] = useState(draft.time ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [recurType, setRecurType] = useState<HabitRecurType>("daily");
  const [recurDays, setRecurDays] = useState<number[]>([weekdayOfISO(initDate)]);
  const [habitReminderTime, setHabitReminderTime] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const category = categories.find((item) => item.id === categoryId) ?? categories[0] ?? null;
  const c = categoryStyle(category, mode);
  const safeEndDate = endDate < startDate ? startDate : endDate;
  const commitTagDraft = (raw: string) => {
    const next = parseTagInput(raw);
    if (next.length) setTags((current) => mergeTags(current, next));
    setTagDraft("");
  };
  const onTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingInputEvent(event)) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTagDraft(tagDraft);
      return;
    }
    if (event.key === "Backspace" && !tagDraft && tags.length) {
      event.preventDefault();
      setTags((current) => current.slice(0, -1));
    }
  };
  const submit = () => {
    if (!title.trim()) {
      onClose();
      return;
    }
    if (type === "habit") {
      s.addHabit({
        title: title.trim(),
        emoji,
        recurType,
        recurDays: recurType === "weekly" ? (recurDays.length ? [...recurDays].sort((a, b) => a - b) : [weekdayOfISO(startDate)]) : undefined,
        reminderTime: habitReminderTime || null,
      });
      onToast("Habit 추가됨");
    } else {
      s.addTask({
        title: title.trim(),
        startDate,
        endDate: safeEndDate,
        scheduledTime: scheduledTime || null,
        categoryId: category?.id ?? null,
        priority,
        tags: mergeTags(tags, parseTagInput(tagDraft)),
      });
      onToast("Task 추가됨");
    }
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/30 p-6 backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex max-h-[88vh] w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-[14px] border shadow-2xl" style={{ background: t.surface, borderColor: t.divider }} onClick={(event) => event.stopPropagation()}>
        <div className="border-b px-4 py-3" style={{ borderColor: t.divider }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>새 항목 · {dateRangeLabel(startDate, safeEndDate, scheduledTime || undefined)}</div>
            <IconShellButton mode={mode} title="닫기" onClick={onClose}><IconClose /></IconShellButton>
          </div>
          <div className="flex gap-1 rounded-[10px] p-[3px]" style={{ background: t.surfaceAlt }}>
            {(["task", "habit"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className="flex-1 rounded-lg py-1.5 text-[13px] font-semibold"
                style={{ background: type === item ? t.surface : "transparent", color: type === item ? t.text : t.textSecondary }}
              >
                {item === "task" ? "Task" : "Habit"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto px-4 py-4">
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
            }}
            placeholder={type === "task" ? "무엇을 할까요?" : "어떤 습관을 만들까요?"}
            className="mb-2 w-full border-b bg-transparent pb-3 text-[19px] font-semibold tracking-[-0.3px] outline-none"
            style={{ borderColor: t.divider, color: t.text }}
          />
          {type === "task" ? (
            <div className="flex flex-col gap-2.5">
              <ModalRow label="기간" mode={mode}>
                <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (event.target.value > endDate) setEndDate(event.target.value); }} style={dateInputStyle(t)} />
                <span style={{ color: t.textTertiary }}>-</span>
                <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} style={dateInputStyle(t)} />
              </ModalRow>
              <ModalRow label="시간" mode={mode}>
                <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} style={dateInputStyle(t)} />
                {scheduledTime ? <button type="button" onClick={() => setScheduledTime("")} className="text-[11px]" style={{ color: t.textTertiary }}>지우기</button> : null}
              </ModalRow>
              <ModalRow label="카테고리" mode={mode}>
                <div className="flex flex-wrap gap-1">
                  {categories.map((item) => {
                    const active = item.id === categoryId;
                    const style = categoryStyle(item, mode);
                    return <button key={item.id} type="button" onClick={() => setCategoryId(item.id)} className="rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: active ? style.soft : "transparent", color: active ? style.ink : t.textSecondary, border: active ? "none" : `0.5px solid ${t.divider}` }}>{item.name}</button>;
                  })}
                </div>
              </ModalRow>
              <ModalRow label="우선순위" mode={mode}>
                <SegmentedButtons
                  mode={mode}
                  color={c}
                  options={(["high", "medium", "low"] as Priority[]).map((item) => [item, priorityLabels[item]])}
                  value={priority}
                  onChange={(value) => setPriority(value as Priority)}
                />
              </ModalRow>
              <ModalRow label="태그" mode={mode}>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium"
                      style={{ background: c.soft, color: c.ink }}
                      aria-label={`태그 ${tag} 삭제`}
                    >
                      <span>{tag}</span>
                      <span aria-hidden style={{ opacity: 0.7 }}>×</span>
                    </button>
                  ))}
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={onTagKeyDown}
                    onBlur={() => commitTagDraft(tagDraft)}
                    placeholder={tags.length ? "" : "태그 추가"}
                    className="min-w-[100px] flex-1 bg-transparent py-1 text-[13px] font-medium outline-none"
                    style={{ color: t.text }}
                  />
                </div>
              </ModalRow>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <ModalRow label="이모지" mode={mode}>
                <div className="flex flex-wrap gap-1.5">
                  {habitEmojis.map((item) => (
                    <button key={item} type="button" onClick={() => setEmoji(item)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg" style={{ background: emoji === item ? t.habit.soft : "transparent", border: emoji === item ? "none" : `0.5px solid ${t.divider}` }}>{item}</button>
                  ))}
                </div>
              </ModalRow>
              <ModalRow label="반복" mode={mode}>
                <SegmentedButtons
                  mode={mode}
                  color={t.habit}
                  options={[["daily", "매일"], ["weekly", "요일"]]}
                  value={recurType}
                  onChange={(value) => setRecurType(value as HabitRecurType)}
                />
              </ModalRow>
              {recurType === "weekly" ? (
                <ModalRow label="요일" mode={mode}>
                  <WeekdayPicker mode={mode} value={recurDays} onChange={setRecurDays} />
                </ModalRow>
              ) : null}
              <ModalRow label="알림" mode={mode}>
                <input type="time" value={habitReminderTime} onChange={(event) => setHabitReminderTime(event.target.value)} style={dateInputStyle(t)} />
                {habitReminderTime ? <button type="button" onClick={() => setHabitReminderTime("")} className="text-[11px]" style={{ color: t.textTertiary }}>지우기</button> : null}
              </ModalRow>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: t.divider }}>
          <span className="text-[11px]" style={{ color: t.textTertiary }}><Kbd mode={mode}>⌘↵</Kbd> 추가</span>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-3.5 py-2 text-[13px] font-medium" style={{ color: t.textSecondary }}>취소</button>
          <button type="button" onClick={submit} className="rounded-lg px-5 py-2 text-[13px] font-semibold text-white" style={{ background: title.trim() ? (type === "task" ? c.solid : t.habit.solid) : t.dividerStrong }}>
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

function CommandPalette({
  mode,
  open,
  tasks,
  onClose,
  onOpenTask,
  onNew,
  onPage,
  onView,
}: {
  mode: ThemeMode;
  open: boolean;
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (id: string) => void;
  onNew: () => void;
  onPage: (page: Page) => void;
  onView: (view: CalendarView) => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);
  if (!open) return null;
  const actions = [
    { id: "new", label: "새 Task 추가", hint: "N", kind: "cmd", run: () => { onNew(); onClose(); } },
    { id: "today", label: "오늘로 이동", hint: "T", kind: "cmd", run: () => { const today = parseISO(todayISO()); s.setMonth(today.year, today.month); s.selectDate(todayISO()); onClose(); } },
    { id: "month", label: "월간 뷰", kind: "view", run: () => { onPage("calendar"); onView("month"); onClose(); } },
    { id: "week", label: "주간 뷰", kind: "view", run: () => { onPage("calendar"); onView("week"); onClose(); } },
    { id: "list", label: "리스트 뷰", kind: "view", run: () => { onPage("calendar"); onView("list"); onClose(); } },
    { id: "stats", label: "통계로 이동", kind: "nav", run: () => { onPage("stats"); onClose(); } },
    { id: "settings", label: "설정으로 이동", kind: "nav", run: () => { onPage("settings"); onClose(); } },
  ];
  const taskItems = tasks.map((task) => ({ id: task.id, label: task.title, hint: shortDate(task.startDate), kind: "task", run: () => { onOpenTask(task.id); onClose(); } }));
  const items = query.trim() ? [...actions, ...taskItems].filter((item) => item.label.toLowerCase().includes(query.toLowerCase())) : actions;
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/40 pt-[100px] backdrop-blur" onClick={onClose}>
      <div className="flex max-h-[480px] w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-xl border shadow-2xl" style={{ background: t.surface, borderColor: t.divider }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b px-3.5 py-3" style={{ borderColor: t.divider }}>
          <IconSearch />
          <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }} onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setIndex((value) => Math.min(value + 1, items.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setIndex((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter") { event.preventDefault(); items[index]?.run(); }
            if (event.key === "Escape") onClose();
          }} placeholder="명령, task, 페이지 검색..." className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none" style={{ color: t.text }} />
          <Kbd mode={mode}>Esc</Kbd>
        </div>
        <div className="overflow-auto p-1.5">
          {items.map((item, itemIndex) => (
            <button key={item.id} type="button" onMouseEnter={() => setIndex(itemIndex)} onClick={item.run} className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left" style={{ background: itemIndex === index ? t.selected : "transparent" }}>
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded text-[11px] font-semibold" style={{ background: t.surfaceAlt, color: t.textSecondary }}>{item.kind === "task" ? "✓" : item.kind === "view" ? "⊞" : item.kind === "nav" ? "↗" : "⌘"}</span>
              <span className="flex-1 text-[13px] font-medium">{item.label}</span>
              {"hint" in item && item.hint ? <Kbd mode={mode}>{item.hint}</Kbd> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsDashboard({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const tasks = s.state.tasks;
  const done = tasks.filter((task) => task.isCompleted).length;
  const open = tasks.length - done;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const days = Array.from({ length: 7 }, (_, index) => addDays(s.state.view.selectedDate, index - 6));
  const dayCounts = days.map((day) => {
    const dayTasks = tasksOnDate(tasks, day);
    return { day, total: dayTasks.length, done: dayTasks.filter((task) => task.isCompleted).length };
  });
  const max = Math.max(1, ...dayCounts.map((item) => item.total));
  return (
    <div className="flex-1 overflow-auto px-7 py-5">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <StatCard mode={mode} label="완료율" value={`${completion}%`} hint={`${done}/${tasks.length}`} accent={t.me.solid} />
          <StatCard mode={mode} label="진행 중" value={open} hint="open tasks" accent={t.ext.solid} />
          <StatCard mode={mode} label="완료" value={done} hint="this period" accent={t.habit.solid} />
          <StatCard mode={mode} label="활성 습관" value={s.state.habits.length} hint="streaks" accent={t.accent} />
        </div>
        <Panel mode={mode} title="이번 주 활동" subtitle="최근 7일 task 완료 추이">
          <div className="flex h-40 items-end gap-2.5 px-1 py-3">
            {dayCounts.map((item) => (
              <div key={item.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full max-w-[50px] flex-1 items-end">
                  <div className="relative w-full overflow-hidden rounded" style={{ height: `${(item.total / max) * 100}%`, background: t.surfaceAlt }}>
                    <div className="absolute inset-x-0 bottom-0 rounded-b" style={{ height: `${item.total ? (item.done / item.total) * 100 : 0}%`, background: t.me.solid }} />
                  </div>
                </div>
                <div className="text-[10.5px] font-semibold" style={{ color: item.day === todayISO() ? t.accent : t.textTertiary }}>{parseISO(item.day).day}</div>
                <div className="text-[10px] font-medium" style={{ color: item.day === todayISO() ? t.accent : t.textTertiary }}>{weekdayLabels()[weekdayOfISO(item.day)]}</div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Panel mode={mode} title="카테고리별">
            {sortedCategories(s.state.categories).map((category) => {
              const items = tasks.filter((task) => task.categoryId === category.id);
              const doneItems = items.filter((task) => task.isCompleted).length;
              return <BarRow key={category.id} mode={mode} label={category.name} done={doneItems} total={items.length} color={category.color} />;
            })}
          </Panel>
          <Panel mode={mode} title="습관">
            <div className="flex flex-col gap-2">
              {s.state.habits.map((habit) => <HabitStatRow key={habit.id} mode={mode} habit={habit} />)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const auth = useAuth();
  const t = webTokens(mode);
  const [section, setSection] = useState<SettingsSection>("account");
  const [upgradePlan, setUpgradePlan] = useState<UpgradePlan | null>(null);
  const [editHabitId, setEditHabitId] = useState<string | null>(null);
  const syncDetail = s.syncError ? "확인 필요" : !s.syncStatus.isOnline ? "오프라인" : s.syncStatus.isSyncing ? "동기화 중" : s.syncStatus.pendingCount > 0 ? "대기 중" : "정상";
  const sections: Array<[SettingsSection, string]> = [
    ["account", "계정"],
    ["notifications", "알림"],
    ["display", "화면"],
    ["categories", "카테고리"],
    ["habits", "습관"],
    ["subscription", "구독"],
    ["sync", "동기화"],
    ["data", "데이터"],
  ];
  return (
    <div className="flex-1 overflow-auto px-7 py-5">
      <div className="mx-auto grid max-w-[980px] grid-cols-[220px_1fr] gap-6">
        <nav className="flex flex-col gap-1 text-[13px] font-semibold" style={{ color: t.textSecondary }}>
          {sections.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className="rounded-[7px] px-3 py-2 text-left"
              style={{
                background: section === id ? t.selected : "transparent",
                color: section === id ? t.text : t.textSecondary,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div>
          {section === "account" ? (
          <Panel mode={mode} title="계정">
            <SettingRow mode={mode} label="상태" value={auth.user ? "로그인됨" : "게스트"} />
            <SettingRow mode={mode} label="프로필" value={auth.user?.displayName ?? auth.user?.email ?? "게스트"} />
            <button type="button" onClick={() => void auth.signOut().catch(() => undefined)} className="mt-2 rounded-md border px-3 py-1.5 text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.danger }}>로그아웃</button>
          </Panel>
          ) : null}
          {section === "notifications" ? (
          <Panel mode={mode} title="알림">
            <SettingRow mode={mode} label="일일 알림" right={<Switch mode={mode} on={s.state.settings.notify} onChange={(value) => s.updateSetting("notify", value)} />} />
            <SettingRow mode={mode} label="알림 시간" right={<input type="time" value={s.state.settings.notifyTime} onChange={(event) => s.updateSetting("notifyTime", event.target.value)} style={dateInputStyle(t)} />} />
          </Panel>
          ) : null}
          {section === "display" ? (
          <Panel mode={mode} title="화면">
            <SettingRow mode={mode} label="다크 모드" right={<Switch mode={mode} on={s.state.view.dark} onChange={s.setDark} />} />
            <SettingRow mode={mode} label="주 시작" right={<select value={s.state.settings.weekStart} onChange={(event) => s.updateSetting("weekStart", Number(event.target.value) as 0 | 1)} style={dateInputStyle(t)}><option value={0}>일요일</option><option value={1}>월요일</option></select>} />
          </Panel>
          ) : null}
          {section === "categories" ? <CategoryManagementPanel mode={mode} /> : null}
          {section === "habits" ? (
          <Panel mode={mode} title="습관 관리" subtitle="web에서도 habit을 확인하고 수정/삭제할 수 있습니다. 새 habit은 상단 새 Task 버튼에서 Habit 탭으로 추가합니다.">
            <div className="flex flex-col gap-2">
              {s.state.habits.length ? s.state.habits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: t.divider, background: t.bg2 }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-lg" style={{ background: t.habit.softer }}>{habit.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{habit.title}</div>
                    <div className="text-[11px]" style={{ color: t.textTertiary }}>
                      {habit.recurType === "daily" ? "매일" : `요일 · ${(habit.recurDays ?? []).map((day) => weekdayLabels()[day]).join(", ")}`}
                      {habit.reminderTime ? ` · ${formatTime(habit.reminderTime)}` : ""}
                    </div>
                  </div>
                  <button type="button" onClick={() => setEditHabitId(habit.id)} className="rounded-md border px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.text }}>
                    수정
                  </button>
                  <button type="button" onClick={() => s.deleteHabit(habit.id)} className="rounded-md border px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.danger }}>
                    삭제
                  </button>
                </div>
              )) : <div className="text-[12px]" style={{ color: t.textTertiary }}>아직 habit이 없습니다.</div>}
            </div>
          </Panel>
          ) : null}
          {section === "subscription" ? <SubscriptionPanel mode={mode} onUpgrade={setUpgradePlan} /> : null}
          {section === "sync" ? (
          <Panel mode={mode} title="동기화">
            <SettingRow mode={mode} label="연결 상태" value={s.syncStatus.isOnline ? "온라인" : "오프라인"} />
            <SettingRow mode={mode} label="저장 상태" value={syncDetail} />
            <SettingRow mode={mode} label="대기 중인 변경" value={s.syncStatus.pendingCount ? `${s.syncStatus.pendingCount}개` : "없음"} />
            {s.syncError ? <div className="text-[12px]" style={{ color: t.danger }}>{s.syncError}</div> : null}
            {s.syncError ? <button type="button" onClick={s.clearSyncError} className="w-fit rounded-md border px-3 py-1.5 text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.text }}>오류 지우기</button> : null}
          </Panel>
          ) : null}
          {section === "data" ? (
          <Panel mode={mode} title="데이터">
            <button type="button" onClick={s.reset} className="w-fit rounded-md border px-3 py-1.5 text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.danger }}>모든 데이터 초기화</button>
          </Panel>
          ) : null}
        </div>
      </div>
      {upgradePlan ? <UpgradeModal mode={mode} plan={upgradePlan} onClose={() => setUpgradePlan(null)} /> : null}
      <HabitEditModal mode={mode} habitId={editHabitId} onClose={() => setEditHabitId(null)} />
    </div>
  );
}

function SearchPage({ mode, tasks, query, onOpenTask }: { mode: ThemeMode; tasks: Task[]; query: string; onOpenTask: (id: string) => void }) {
  const t = webTokens(mode);
  return (
    <div className="flex-1 overflow-auto px-7 py-5">
      <div className="mx-auto max-w-[820px]">
        <div className="mb-4 text-[12.5px]" style={{ color: t.textTertiary }}><strong style={{ color: t.text }}>&quot;{query}&quot;</strong> 결과 {tasks.length}개</div>
        <div className="overflow-hidden rounded-[10px] border" style={{ background: t.surface, borderColor: t.divider }}>
          {tasks.length ? tasks.map((task, index) => <TaskRow key={task.id} mode={mode} task={task} selected={false} last={index === tasks.length - 1} onOpen={onOpenTask} onToggleSelect={() => undefined} />) : <div className="px-4 py-10 text-center text-[13px]" style={{ color: t.textTertiary }}>일치하는 task가 없어요</div>}
        </div>
      </div>
    </div>
  );
}

function HabitEditModal({ mode, habitId, onClose }: { mode: ThemeMode; habitId: string | null; onClose: () => void }) {
  const s = useJustDo();
  const habit = habitId ? s.state.habits.find((item) => item.id === habitId) : null;
  if (!habit) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-6 backdrop-blur" onClick={onClose}>
      <HabitEditModalBody key={habit.id} mode={mode} habit={habit} onClose={onClose} />
    </div>
  );
}

function HabitEditModalBody({ mode, habit, onClose }: { mode: ThemeMode; habit: Habit; onClose: () => void }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const [title, setTitle] = useState(habit.title);
  const [emoji, setEmoji] = useState(habit.emoji);
  const [recurType, setRecurType] = useState<HabitRecurType>(habit.recurType);
  const [recurDays, setRecurDays] = useState<number[]>(habit.recurDays?.length ? habit.recurDays : [weekdayOfISO(todayISO())]);
  const [reminderTime, setReminderTime] = useState(habit.reminderTime ?? "");

  const save = () => {
    const nextTitle = title.trim() || habit.title;
    const nextRecurDays = recurType === "weekly" ? (recurDays.length ? [...recurDays].sort((a, b) => a - b) : [weekdayOfISO(todayISO())]) : undefined;
    s.updateHabit(habit.id, {
      title: nextTitle,
      emoji,
      recurType,
      recurDays: nextRecurDays,
      reminderTime: reminderTime || null,
    });
    onClose();
  };

  return (
    <div
      className="flex max-h-[88vh] w-[520px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border shadow-2xl"
      style={{ background: t.surface, borderColor: t.divider }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="border-b px-5 py-4" style={{ borderColor: t.divider }}>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[18px] font-bold tracking-[-0.4px]">Habit 수정</div>
          <IconShellButton mode={mode} title="닫기" onClick={onClose}><IconClose /></IconShellButton>
        </div>
        <div className="text-[12px]" style={{ color: t.textTertiary }}>반복 주기와 알림 시간을 조정합니다.</div>
      </div>
      <div className="flex flex-col gap-3 overflow-auto px-5 py-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
          }}
          className="w-full border-b bg-transparent pb-3 text-[19px] font-semibold tracking-[-0.3px] outline-none"
          style={{ borderColor: t.divider, color: t.text }}
          aria-label="Habit 제목"
        />
        <ModalRow label="이모지" mode={mode}>
          <div className="flex flex-wrap gap-1.5">
            {habitEmojis.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setEmoji(item)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                style={{ background: emoji === item ? t.habit.soft : "transparent", border: emoji === item ? "none" : `0.5px solid ${t.divider}` }}
                aria-label={`이모지 ${item}`}
              >
                {item}
              </button>
            ))}
          </div>
        </ModalRow>
        <ModalRow label="반복" mode={mode}>
          <SegmentedButtons
            mode={mode}
            color={t.habit}
            options={[["daily", "매일"], ["weekly", "요일"]]}
            value={recurType}
            onChange={(value) => setRecurType(value as HabitRecurType)}
          />
        </ModalRow>
        {recurType === "weekly" ? (
          <ModalRow label="요일" mode={mode}>
            <WeekdayPicker mode={mode} value={recurDays} onChange={setRecurDays} />
          </ModalRow>
        ) : null}
        <ModalRow label="알림" mode={mode}>
          <input
            type="time"
            value={reminderTime}
            onChange={(event) => setReminderTime(event.target.value)}
            style={dateInputStyle(t)}
            aria-label="Habit 알림 시간"
          />
          {reminderTime ? <button type="button" onClick={() => setReminderTime("")} className="text-[11px]" style={{ color: t.textTertiary }}>지우기</button> : null}
        </ModalRow>
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-3" style={{ borderColor: t.divider }}>
        <span className="text-[11px]" style={{ color: t.textTertiary }}><Kbd mode={mode}>⌘↵</Kbd> 저장</span>
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="px-3.5 py-2 text-[13px] font-medium" style={{ color: t.textSecondary }}>취소</button>
        <button type="button" onClick={save} className="rounded-lg px-5 py-2 text-[13px] font-semibold text-white" style={{ background: t.habit.solid }}>
          저장
        </button>
      </div>
    </div>
  );
}

function SubscriptionPanel({ mode, onUpgrade }: { mode: ThemeMode; onUpgrade: (plan: UpgradePlan) => void }) {
  const auth = useAuth();
  const t = webTokens(mode);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const isPro = Boolean(
    subscription &&
      subscription.plan_name === "pro" &&
      !["cancelled", "expired"].includes(subscription.status),
  );
  const statusLabel = subscription
    ? subscriptionStatusLabels[subscription.status] ?? subscription.status
    : auth.user
      ? "Free"
      : "게스트";
  const billingAmount = subscription
    ? `₩${subscription.amount_krw.toLocaleString("ko-KR")} / ${subscription.plan_interval === "yearly" ? "년" : "월"}`
    : null;
  const paymentMethod = subscription?.payment_method_last4
    ? `${subscription.payment_method_label ?? "Toss"} •••• ${subscription.payment_method_last4}`
    : subscription?.billing_provider === "toss_payments"
      ? "Toss Payments"
      : "등록 전";

  const refresh = useCallback(() => {
    if (!auth.user) {
      setSubscription(null);
      setError(null);
      return;
    }
    setLoading(true);
    fetch("/api/billing/subscription")
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as
          | BillingSubscriptionResponse
          | { error?: string };
        if (!response.ok) {
          throw new Error("error" in body && body.error ? body.error : "subscription_fetch_failed");
        }
        setSubscription((body as BillingSubscriptionResponse).subscription);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "subscription_fetch_failed"))
      .finally(() => setLoading(false));
  }, [auth.user]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const cancelSubscription = () => {
    if (!subscription || cancelling) return;
    setCancelling(true);
    fetch("/api/billing/cancel", { method: "POST" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "subscription_cancel_failed");
        }
        refresh();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "subscription_cancel_failed"))
      .finally(() => setCancelling(false));
  };

  return (
    <Panel mode={mode} title="구독" subtitle="Pro 플랜 상태와 업그레이드 진입점입니다.">
      <div className="mb-3 rounded-lg border p-4" style={{ borderColor: t.divider, background: t.bg2 }}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>현재 플랜</div>
        <div className="mb-3 flex items-center gap-3">
          <div className="text-[26px] font-bold tracking-[-0.6px]">{isPro ? "Pro" : "Free"}</div>
          <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: isPro ? t.habit.softer : t.surfaceAlt, color: isPro ? t.habit.ink : t.textSecondary }}>
            {loading ? "확인 중" : statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <SettingRow mode={mode} label="결제 주기" value={billingAmount ?? "-"} />
          <SettingRow mode={mode} label="다음 결제일" value={formatDateLabel(subscription?.next_billing_at)} />
          <SettingRow mode={mode} label="결제수단" value={paymentMethod} />
          <SettingRow mode={mode} label="Trial 종료" value={formatDateLabel(subscription?.trial_end_at)} />
        </div>
        {error ? <div className="mt-3 text-[12px]" style={{ color: t.danger }}>{error}</div> : null}
        <div className="mt-3 flex gap-2">
          {auth.user ? (
            <button type="button" onClick={refresh} className="rounded-md border px-3 py-1.5 text-[12px] font-semibold" style={{ borderColor: t.divider, color: t.textSecondary }}>
              새로고침
            </button>
          ) : null}
          {subscription?.billing_provider === "toss_payments" && !["cancelled", "expired"].includes(subscription.status) ? (
            <button
              type="button"
              onClick={cancelSubscription}
              disabled={cancelling}
              className="rounded-md border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
              style={{ borderColor: t.divider, color: t.danger }}
            >
              {cancelling ? "해지 중" : "구독 해지"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PlanCard mode={mode} plan="monthly" title="월간 Pro" price="₩1,900 / 월" onUpgrade={onUpgrade} disabled={isPro} />
        <PlanCard mode={mode} plan="yearly" title="연간 Pro" price="₩9,900 / 년" badge="추천" onUpgrade={onUpgrade} disabled={isPro} />
      </div>
    </Panel>
  );
}

function PlanCard({
  mode,
  plan,
  title,
  price,
  badge,
  disabled,
  onUpgrade,
}: {
  mode: ThemeMode;
  plan: UpgradePlan;
  title: string;
  price: string;
  badge?: string;
  disabled: boolean;
  onUpgrade: (plan: UpgradePlan) => void;
}) {
  const t = webTokens(mode);
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: t.divider, background: t.bg2 }}>
      <div className="mb-2 flex items-center gap-2">
        <div className="text-[14px] font-bold">{title}</div>
        {badge ? <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: t.accent }}>{badge}</span> : null}
      </div>
      <div className="mb-3 text-[20px] font-bold tracking-[-0.4px]">{price}</div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onUpgrade(plan)}
        className="w-full rounded-lg px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-45"
        style={{ background: disabled ? t.dividerStrong : t.accent }}
      >
        {disabled ? "사용 중" : "Pro로 업그레이드"}
      </button>
    </div>
  );
}

function UpgradeModal({ mode, plan, onClose }: { mode: ThemeMode; plan: UpgradePlan; onClose: () => void }) {
  const auth = useAuth();
  const t = webTokens(mode);
  const selected = tossBillingPlans[plan];
  const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY;
  const [method, setMethod] = useState<PaymentMethodKey>("toss");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canStart = Boolean(auth.user && clientKey && method === "toss");

  const startBillingAuth = async () => {
    if (!canStart) return;
    const tossClientKey = clientKey;
    if (!auth.user || !tossClientKey) return;
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const successUrl = new URL("/billing/success", origin);
      successUrl.searchParams.set("planInterval", plan);
      const failUrl = new URL("/billing/fail", origin);
      failUrl.searchParams.set("planInterval", plan);
      const payment = await createTossPayment({
        clientKey: tossClientKey,
        customerKey: auth.user.id,
      });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
        customerName: auth.user.displayName ?? undefined,
        customerEmail: auth.user.email ?? undefined,
        windowTarget: "iframe",
      });
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "결제창을 열지 못했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-6 backdrop-blur" onClick={onClose}>
      <div
        className="w-[460px] max-w-[92vw] rounded-2xl border p-5 shadow-2xl"
        style={{ background: t.surface, borderColor: t.divider }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[18px] font-bold tracking-[-0.4px]">Pro 업그레이드</div>
          <IconShellButton mode={mode} title="닫기" onClick={onClose}><IconClose /></IconShellButton>
        </div>
        <p className="mb-4 text-[13px] leading-5" style={{ color: t.textSecondary }}>
          Toss 결제로 30일 Trial을 시작합니다. Trial 종료 후 선택한 주기로 자동 결제가 진행됩니다.
        </p>
        <div className="mb-3 rounded-lg border p-3" style={{ borderColor: t.divider, background: t.bg2 }}>
          <div className="mb-1 text-[12px] font-semibold" style={{ color: t.textSecondary }}>{selected.label}</div>
          <div className="text-[24px] font-bold tracking-[-0.4px]">{selected.price}</div>
          <div className="mt-1 text-[11px]" style={{ color: t.textTertiary }}>오늘 결제 없음 · 30일 후 첫 결제</div>
        </div>
        <div className="mb-3">
          <div className="mb-2 text-[12px] font-bold" style={{ color: t.text }}>결제수단</div>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((item) => {
              const selectedMethod = method === item.key;
              const ink = item.key === "kakaopay" ? "#191600" : item.accent;
              const isToss = item.key === "toss";
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!item.enabled || (isToss && busy)}
                  onClick={() => {
                    setMethod(item.key);
                    if (isToss) void startBillingAuth();
                  }}
                  className="relative min-h-[58px] rounded-lg border px-2 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    borderColor: selectedMethod ? item.accent : t.dividerStrong,
                    background: selectedMethod ? item.soft : t.surface,
                    color: selectedMethod ? ink : t.textSecondary,
                    boxShadow: selectedMethod ? `0 0 0 1px ${item.accent} inset` : "none",
                  }}
                >
                  {item.key === "kakaopay" ? (
                    <span
                      className="absolute -right-1 -top-2 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold text-white"
                      style={{ background: "#EF3340" }}
                    >
                      예정
                    </span>
                  ) : null}
                  {isToss && busy ? "Toss 연결 중" : item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[11px]" style={{ color: t.textTertiary }}>
            현재는 Toss 자동결제만 사용할 수 있습니다. 네이버페이와 카카오페이는 추후 추가됩니다.
          </div>
        </div>
        {!auth.user ? <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: t.divider, color: t.danger }}>Pro 업그레이드는 로그인 후 사용할 수 있습니다.</div> : null}
        {auth.user && !clientKey ? <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: t.divider, color: t.danger }}>Toss Payments client key가 설정되지 않았습니다.</div> : null}
        {error ? <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: t.divider, color: t.danger }}>{error}</div> : null}
      </div>
    </div>
  );
}

function CategoryManagementPanel({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const categories = sortedCategories(s.state.categories);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(categoryPalette[0]);

  const addCategory = () => {
    if (!draftName.trim()) return;
    s.addCategory({ name: draftName.trim(), color: draftColor });
    setDraftName("");
  };
  const moveCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const current = categories[index];
    const target = categories[targetIndex];
    if (!current || !target) return;
    s.updateCategory(current.id, { position: target.position });
    s.updateCategory(target.id, { position: current.position });
  };

  return (
    <Panel mode={mode} title="카테고리 관리" subtitle="Task 분류에 쓰는 카테고리를 추가, 수정, 삭제합니다.">
      <div className="mb-3 rounded-lg border p-3" style={{ borderColor: t.divider, background: t.bg2 }}>
        <div className="mb-2 flex items-center gap-2">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addCategory();
            }}
            placeholder="새 카테고리 이름"
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none"
            style={{ borderColor: t.divider, color: t.text }}
          />
          <input
            value={draftColor}
            onChange={(event) => {
              const normalized = normalizeHexInput(event.target.value);
              setDraftColor(normalized ?? event.target.value);
            }}
            onBlur={() => setDraftColor(normalizeHexInput(draftColor) ?? categoryPalette[0])}
            className="w-[92px] rounded-lg border bg-transparent px-2.5 py-2 text-[12px] font-semibold outline-none"
            style={{ borderColor: t.divider, color: t.text }}
            aria-label="새 카테고리 색상"
          />
          <button
            type="button"
            onClick={addCategory}
            className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white"
            style={{ background: draftName.trim() ? t.accent : t.dividerStrong }}
          >
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categoryPalette.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setDraftColor(color)}
              aria-label={`색상 ${color}`}
              className="h-6 w-6 rounded-full"
              style={{
                background: color,
                boxShadow: draftColor.toLowerCase() === color.toLowerCase()
                  ? `0 0 0 2px ${t.bg2}, 0 0 0 4px ${t.text}`
                  : `0 0 0 1px ${t.divider}`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {categories.map((category, index) => (
          <CategoryManagementRow
            key={category.id}
            mode={mode}
            category={category}
            canMoveUp={index > 0}
            canMoveDown={index < categories.length - 1}
            canDelete={categories.length > 1}
            onMoveUp={() => moveCategory(index, -1)}
            onMoveDown={() => moveCategory(index, 1)}
          />
        ))}
      </div>
    </Panel>
  );
}

function CategoryManagementRow({
  mode,
  category,
  canMoveUp,
  canMoveDown,
  canDelete,
  onMoveUp,
  onMoveDown,
}: {
  mode: ThemeMode;
  category: { id: string; name: string; color: string };
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const s = useJustDo();
  const t = webTokens(mode);
  const c = categoryStyle(category, mode);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);

  const commitName = () => {
    const next = name.trim();
    if (!next) {
      setName(category.name);
      return;
    }
    if (next !== category.name) s.updateCategory(category.id, { name: next });
  };

  const commitColor = () => {
    const normalized = normalizeHexInput(color);
    if (!normalized) {
      setColor(category.color);
      return;
    }
    setColor(normalized);
    if (normalized.toLowerCase() !== category.color.toLowerCase()) {
      s.updateCategory(category.id, { color: normalized });
    }
  };

  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: t.divider, background: t.bg2 }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: c.solid }} />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setName(category.name);
              event.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none"
          style={{ color: t.text }}
          aria-label={`${category.name} 이름`}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-[12px] font-bold disabled:opacity-30"
            style={{ borderColor: t.divider, color: t.textSecondary }}
            aria-label={`${category.name} 위로 이동`}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-[12px] font-bold disabled:opacity-30"
            style={{ borderColor: t.divider, color: t.textSecondary }}
            aria-label={`${category.name} 아래로 이동`}
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          disabled={!canDelete}
          onClick={() => s.deleteCategory(category.id)}
          className="rounded-md border px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-30"
          style={{ borderColor: t.divider, color: t.danger }}
        >
          삭제
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={color}
          onChange={(event) => setColor(event.target.value)}
          onBlur={commitColor}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setColor(category.color);
              event.currentTarget.blur();
            }
          }}
          className="w-[92px] rounded-lg border bg-transparent px-2 py-1.5 text-[12px] font-semibold outline-none"
          style={{ borderColor: t.divider, color: t.text }}
          aria-label={`${category.name} 색상`}
        />
        <div className="flex flex-1 flex-wrap gap-1.5">
          {categoryPalette.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setColor(preset);
                s.updateCategory(category.id, { color: preset });
              }}
              aria-label={`${category.name} 색상 ${preset}`}
              className="h-5 w-5 rounded-full"
              style={{
                background: preset,
                boxShadow: category.color.toLowerCase() === preset.toLowerCase()
                  ? `0 0 0 2px ${t.bg2}, 0 0 0 4px ${c.ink}`
                  : `0 0 0 1px ${t.divider}`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ mode, task, selected, last, onOpen, onToggleSelect }: { mode: ThemeMode; task: Task; selected: boolean; last: boolean; onOpen: (id: string) => void; onToggleSelect: (id: string) => void }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const category = s.state.categories.find((item) => item.id === task.categoryId);
  const c = categoryStyle(category, mode);
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderBottom: last ? "none" : `0.5px solid ${t.divider}` }}>
      <button type="button" onClick={() => onToggleSelect(task.id)} className="h-4 w-4 rounded border" style={{ background: selected ? t.accent : "transparent", borderColor: selected ? t.accent : t.dividerStrong }} aria-label="선택" />
      <button type="button" onClick={() => s.toggleTask(task.id)} className="flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border" style={{ background: task.isCompleted ? c.solid : "transparent", borderColor: task.isCompleted ? c.solid : c.ink }}>{task.isCompleted ? <IconCheck /> : null}</button>
      <button type="button" onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13px] font-semibold" style={{ textDecoration: task.isCompleted ? "line-through" : "none", opacity: task.isCompleted ? 0.55 : 1 }}>{task.title}</div>
        <div className="mt-0.5 text-[11px]" style={{ color: t.textTertiary }}>{dateRangeLabel(task.startDate, task.endDate, task.scheduledTime ?? undefined)}</div>
      </button>
      {category ? <span className="rounded px-2 py-1 text-[11px] font-semibold" style={{ background: c.soft, color: c.ink }}>{category.name}</span> : null}
    </div>
  );
}

function CompactTask({ mode, task, onOpen }: { mode: ThemeMode; task: Task; onOpen: (id: string) => void }) {
  const s = useJustDo();
  const category = s.state.categories.find((item) => item.id === task.categoryId);
  const c = categoryStyle(category, mode);
  return (
    <button type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/task", task.id)} onClick={() => onOpen(task.id)} className="truncate rounded px-1.5 py-0.5 text-left text-[10.5px] font-semibold" style={{ background: c.soft, color: c.ink, borderLeft: `2px solid ${c.solid}`, opacity: task.isCompleted ? 0.55 : 1 }}>
      {task.title}
    </button>
  );
}

function TodayCard({ mode, task, onOpen }: { mode: ThemeMode; task: Task; onOpen: (id: string) => void }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const category = s.state.categories.find((item) => item.id === task.categoryId);
  const c = categoryStyle(category, mode);
  return (
    <div className="mb-1.5 flex w-full items-center gap-2 rounded-[7px] border p-2 text-left" style={{ background: t.surface, borderColor: t.divider }}>
      <button type="button" onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[12.5px] font-semibold" style={{ textDecoration: task.isCompleted ? "line-through" : "none", opacity: task.isCompleted ? 0.55 : 1 }}>{task.title}</div>
        <div className="mt-1 text-[10.5px]" style={{ color: t.textTertiary }}>{task.scheduledTime ? formatTime(task.scheduledTime) : dateRangeLabel(task.startDate, task.endDate)}</div>
      </button>
      <button
        type="button"
        onClick={() => s.toggleTask(task.id)}
        aria-label={`${task.title} 완료 토글`}
        aria-pressed={task.isCompleted}
        className="mr-1.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border"
        style={{ background: task.isCompleted ? c.solid : "transparent", borderColor: task.isCompleted ? c.solid : c.ink }}
      >
        {task.isCompleted ? <IconCheck /> : null}
      </button>
    </div>
  );
}

function HabitMiniRow({ mode, habit, iso }: { mode: ThemeMode; habit: Habit; iso: string }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const checked = Boolean(habit.log[iso]);
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[13px]" style={{ background: t.habit.softer }}>{habit.emoji}</div>
      <div className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{habit.title}</div>
      <button
        type="button"
        onClick={() => s.toggleHabit(habit.id, iso)}
        aria-label={`${habit.title} 완료 토글`}
        aria-pressed={checked}
        className="mr-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-md border"
        style={{ background: checked ? t.habit.solid : "transparent", borderColor: checked ? t.habit.solid : t.habit.ink }}
      >
        {checked ? <IconCheck /> : null}
      </button>
    </div>
  );
}

function BulkActionBar({ mode, selectedIds, onClear, onToast }: { mode: ThemeMode; selectedIds: string[]; onClear: () => void; onToast: (message: string) => void }) {
  const s = useJustDo();
  const t = webTokens(mode);
  if (!selectedIds.length) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold shadow-2xl" style={{ background: t.text, color: t.bg }}>
      <span>{selectedIds.length}개 선택됨</span>
      <button type="button" onClick={() => { selectedIds.forEach((id) => { const task = s.state.tasks.find((item) => item.id === id); if (task && !task.isCompleted) s.toggleTask(id); }); onClear(); onToast("완료 처리"); }} className="rounded-md bg-white/10 px-3 py-1.5">완료</button>
      <button type="button" onClick={() => { selectedIds.forEach(s.deleteTask); onClear(); onToast("삭제됨"); }} className="rounded-md bg-white/10 px-3 py-1.5">삭제</button>
      <button type="button" onClick={onClear} className="rounded-md px-3 py-1.5">해제</button>
    </div>
  );
}

function Panel({ mode, title, subtitle, children }: { mode: ThemeMode; title: string; subtitle?: string; children: React.ReactNode }) {
  const t = webTokens(mode);
  return (
    <section className="rounded-xl border p-[18px]" style={{ background: t.surface, borderColor: t.divider }}>
      <div className="mb-3">
        <div className="text-[14.5px] font-bold tracking-[-0.3px]">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[11.5px]" style={{ color: t.textTertiary }}>{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({ mode, label, value, hint, accent }: { mode: ThemeMode; label: string; value: React.ReactNode; hint: string; accent: string }) {
  const t = webTokens(mode);
  return (
    <div className="rounded-xl border p-4" style={{ background: t.surface, borderColor: t.divider }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>{label}</div>
      <div className="mt-1 text-[30px] font-bold tracking-[-0.8px]" style={{ color: t.text }}>{value}</div>
      <div className="mt-0.5 text-[11px]" style={{ color: t.textTertiary }}>{hint}</div>
      <div className="mt-3 h-1 rounded-full" style={{ background: accent }} />
    </div>
  );
}

function BarRow({ mode, label, done, total, color }: { mode: ThemeMode; label: string; done: number; total: number; color: string }) {
  const t = webTokens(mode);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const c = categoryStyle({ color }, mode);
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-[12px]"><span className="font-semibold" style={{ color: t.textSecondary }}>{label}</span><span style={{ color: t.textTertiary }}>{done}/{total} · {pct}%</span></div>
      <div className="h-2 overflow-hidden rounded" style={{ background: c.soft }}><div className="h-full rounded" style={{ width: `${pct}%`, background: c.solid }} /></div>
    </div>
  );
}

function HabitStatRow({ mode, habit }: { mode: ThemeMode; habit: Habit }) {
  const s = useJustDo();
  const t = webTokens(mode);
  const count = Object.values(habit.log).filter(Boolean).length;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[16px]" style={{ background: t.habit.softer }}>{habit.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold">{habit.title}</div>
        <div className="text-[10.5px]" style={{ color: t.textTertiary }}>{count}회 누적</div>
      </div>
      <div><span className="text-[18px] font-bold" style={{ color: t.habit.ink }}>{habitStreak(habit, s.state.view.selectedDate)}</span><span className="ml-1 text-[10px] font-semibold" style={{ color: t.textTertiary }}>일</span></div>
    </div>
  );
}

function SettingRow({ mode, label, value, right }: { mode: ThemeMode; label: string; value?: React.ReactNode; right?: React.ReactNode }) {
  const t = webTokens(mode);
  return (
    <div className="flex min-h-10 items-center gap-3 border-b py-2 last:border-b-0" style={{ borderColor: t.divider }}>
      <div className="flex-1 text-[13px] font-semibold">{label}</div>
      {value ? <div className="text-[13px]" style={{ color: t.textSecondary }}>{value}</div> : null}
      {right}
    </div>
  );
}

function Switch({ mode, on, onChange }: { mode: ThemeMode; on: boolean; onChange: (value: boolean) => void }) {
  const t = webTokens(mode);
  return (
    <button type="button" onClick={() => onChange(!on)} className="relative h-5 w-9 rounded-full" style={{ background: on ? t.me.solid : t.dividerStrong }}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left]" style={{ left: on ? 18 : 2 }} />
    </button>
  );
}

function SidebarSection({ title, mode, children }: { title: string; mode: ThemeMode; children: React.ReactNode }) {
  const t = webTokens(mode);
  return (
    <div className="mt-4 flex flex-col gap-0.5">
      <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.4px]" style={{ color: t.textTertiary }}>{title}</div>
      {children}
    </div>
  );
}

function SidebarChip({ active = false, color, onClick, mode, children }: { active?: boolean; color?: string; onClick: () => void; mode: ThemeMode; children: React.ReactNode }) {
  const t = webTokens(mode);
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-left text-[12.5px]" style={{ background: active ? t.selected : "transparent", color: active ? t.text : t.textSecondary, fontWeight: active ? 600 : 500 }}>
      {color ? <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} /> : null}
      {children}
    </button>
  );
}

function ModalRow({ label, mode, children }: { label: string; mode: ThemeMode; children: React.ReactNode }) {
  const t = webTokens(mode);
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[72px] text-[11.5px] font-semibold uppercase tracking-[0.2px]" style={{ color: t.textTertiary }}>{label}</div>
      <div className="flex flex-1 items-center gap-1.5 text-[12.5px]">{children}</div>
    </div>
  );
}

function SegmentedButtons({
  mode,
  color,
  options,
  value,
  onChange,
}: {
  mode: ThemeMode;
  color: { soft: string; ink: string };
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = webTokens(mode);
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
          style={{
            background: value === key ? color.soft : "transparent",
            color: value === key ? color.ink : t.textSecondary,
            border: value === key ? "none" : `0.5px solid ${t.divider}`,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function WeekdayPicker({
  mode,
  value,
  onChange,
}: {
  mode: ThemeMode;
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const t = webTokens(mode);
  return (
    <div className="flex flex-wrap gap-1">
      {weekdayLabels().map((label, day) => {
        const active = value.includes(day);
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (active && value.length <= 1) return;
              onChange(active ? value.filter((item) => item !== day) : [...value, day].sort((a, b) => a - b));
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold"
            style={{
              background: active ? t.habit.soft : "transparent",
              color: active ? t.habit.ink : t.textSecondary,
              border: active ? "none" : `0.5px solid ${t.divider}`,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function IconShellButton({ mode, title, active = false, onClick, children }: { mode: ThemeMode; title: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  const t = webTokens(mode);
  return (
    <button type="button" title={title} onClick={onClick} className="flex h-[30px] w-[30px] items-center justify-center rounded-md" style={{ color: active ? t.accent : t.textSecondary }}>
      {children}
    </button>
  );
}

function Kbd({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const t = webTokens(mode);
  return <span className="rounded border px-1 py-px text-[10px] font-semibold" style={{ background: t.surfaceAlt, borderColor: t.divider, color: t.textSecondary }}>{children}</span>;
}

function Toast({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const t = webTokens(mode);
  return <div className="fixed bottom-8 left-1/2 z-[200] -translate-x-1/2 rounded-lg px-4 py-2 text-[12.5px] font-semibold shadow-2xl" style={{ background: t.text, color: t.bg }}>{children}</div>;
}

function monthWeeks(year: number, month: number, weekStartValue: 0 | 1, tasks: Task[]) {
  const first = new Date(year, month - 1, 1).getDay();
  const offset = (first - weekStartValue + 7) % 7;
  const start = addDays(isoOf(year, month, 1), -offset);
  const total = Math.ceil((offset + daysInMonth(year, month)) / 7) * 7;
  const cells = Array.from({ length: total }, (_, index) => {
    const iso = addDays(start, index);
    const parsed = parseISO(iso);
    return { iso, day: parsed.day, muted: parsed.month !== month };
  });
  return Array.from({ length: cells.length / 7 }, (_, index) => {
    const weekCells = cells.slice(index * 7, index * 7 + 7);
    return { cells: weekCells, tracks: buildTracks(weekCells, tasks) };
  });
}

function buildTracks(cells: Array<{ iso: string }>, tasks: Task[]) {
  const weekStartISO = cells[0].iso;
  const weekEndISO = cells[6].iso;
  const weekTasks = tasks
    .filter((task) => !(task.endDate < weekStartISO || task.startDate > weekEndISO))
    .sort((a, b) => Number(b.endDate > b.startDate) - Number(a.endDate > a.startDate) || a.startDate.localeCompare(b.startDate));
  const tracks: Array<Array<{ task: Task; startCol: number; endCol: number }>> = [];
  weekTasks.forEach((task) => {
    const startISO = task.startDate < weekStartISO ? weekStartISO : task.startDate;
    const endISO = task.endDate > weekEndISO ? weekEndISO : task.endDate;
    const startCol = cells.findIndex((cell) => cell.iso === startISO);
    const endCol = cells.findIndex((cell) => cell.iso === endISO);
    let trackIndex = 0;
    while (tracks[trackIndex]?.some((item) => !(item.endCol < startCol || item.startCol > endCol))) trackIndex += 1;
    tracks[trackIndex] = tracks[trackIndex] ?? [];
    tracks[trackIndex].push({ task, startCol, endCol });
  });
  return tracks;
}

function filterTasks(tasks: Task[], categoryId: string, priority: "all" | Priority, query: string) {
  const q = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (categoryId !== "all" && task.categoryId !== categoryId) return false;
    if (priority !== "all" && (task.priority ?? "medium") !== priority) return false;
    if (!q) return true;
    return `${task.title} ${(task.tags ?? []).join(" ")} ${task.startDate} ${task.endDate}`.toLowerCase().includes(q);
  });
}

function moveCalendar(s: ReturnType<typeof useJustDo>, view: CalendarView, offset: -1 | 1) {
  if (view === "month") {
    s.moveMonth(offset);
    return;
  }
  const next = addDays(s.state.view.selectedDate, view === "week" ? offset * 7 : offset);
  const parsed = parseISO(next);
  s.setMonth(parsed.year, parsed.month);
  s.selectDate(next);
}

function moveTaskToDate(s: ReturnType<typeof useJustDo>, id: string, iso: string) {
  if (!id) return;
  const task = s.state.tasks.find((item) => item.id === id);
  if (!task) return;
  const start = new Date(`${task.startDate}T00:00:00`);
  const end = new Date(`${task.endDate}T00:00:00`);
  const length = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  s.updateTask(id, { startDate: iso, endDate: addDays(iso, length) });
}

function weekStart(iso: string, weekStartValue: 0 | 1) {
  const weekday = weekdayOfISO(iso);
  return addDays(iso, -((weekday - weekStartValue + 7) % 7));
}

function dateRangeLabel(start: string, end: string, time?: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const date = start === end ? `${startDate.month}월 ${startDate.day}일` : `${startDate.month}/${startDate.day} - ${endDate.month}/${endDate.day}`;
  return time ? `${date} · ${formatTime(time)}` : date;
}

function shortDate(iso: string) {
  const parsed = parseISO(iso);
  return `${parsed.month}/${parsed.day}`;
}

function topTags(tasks: Task[]) {
  const tags = new Map<string, number>();
  tasks.forEach((task) => task.tags.forEach((tag) => tags.set(tag, (tags.get(tag) ?? 0) + 1)));
  return [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
}

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
}

function dateInputStyle(t: ReturnType<typeof webTokens>) {
  return {
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 5,
    border: `0.5px solid ${t.divider}`,
    color: t.text,
    background: "transparent",
    fontSize: 12,
    outline: "none",
  } as const;
}

function isComposingInputEvent(event: React.KeyboardEvent<HTMLInputElement>) {
  const native = event.nativeEvent as KeyboardEvent;
  return event.nativeEvent.isComposing || event.key === "Process" || native.keyCode === 229;
}

function webTokens(mode: ThemeMode) {
  const base = tokens[mode];
  return {
    ...base,
    bg2: mode === "dark" ? "#181714" : "#FBF9F4",
    glass: mode === "dark" ? "rgba(24,23,20,0.82)" : "rgba(246,244,239,0.82)",
    glassBorder: mode === "dark" ? "rgba(255,248,235,0.08)" : "rgba(30,25,20,0.08)",
    selected: mode === "dark" ? "rgba(255,248,235,0.08)" : "rgba(30,25,20,0.06)",
    danger: mode === "dark" ? "oklch(0.74 0.11 30)" : "oklch(0.46 0.09 30)",
    me: { ...base.me, softer: mode === "dark" ? "hsl(220 24% 18%)" : "hsl(220 54% 96%)" },
    ext: { ...base.ext, softer: mode === "dark" ? "hsl(25 28% 18%)" : "hsl(25 64% 96%)" },
    habit: { ...base.habit, softer: mode === "dark" ? "hsl(155 24% 18%)" : "hsl(155 54% 96%)" },
  };
}

function IconCalendar() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2 6h10M5 2v2M9 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function IconChart() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11h10M4 9V5M7 9V3M10 9V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconGear() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.3" /><path d="M7 1.8v1.3M7 10.9v1.3M12.2 7h-1.3M3.1 7H1.8M10.7 3.3l-.9.9M4.2 9.8l-.9.9M10.7 10.7l-.9-.9M4.2 4.2l-.9-.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function IconSidebar() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2v10M2 2h10v10H2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconChevronLeft() { return <svg width="11" height="11" viewBox="0 0 11 11"><path d="M7 2 3 5.5 7 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconChevronRight() { return <svg width="11" height="11" viewBox="0 0 11 11"><path d="m4 2 4 3.5L4 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconSearch() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.4" /><path d="M8.5 8.5 12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconCommand() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="2" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 5h3v3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" /></svg>; }
function IconPanel() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.4" stroke="currentColor" strokeWidth="1.3" /><path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" /></svg>; }
function IconPlus() { return <svg width="12" height="12" viewBox="0 0 13 13"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function IconLogout() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2H2v9h3M8 4l3 2.5L8 9M5 6.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconCheck() { return <svg width="11" height="11" viewBox="0 0 9 9"><path d="M1 4.5 3.5 7 8 1.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconTrash() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 4h7M5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 4l.5 7a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconClose() { return <svg width="13" height="13" viewBox="0 0 13 13"><path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconDesktop() { return <svg className="h-full w-full p-1.5" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M7 15h4M9 12v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconPhone() { return <svg className="h-full w-full p-1.5" viewBox="0 0 18 18" fill="none"><rect x="5" y="2.5" width="8" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M8 13.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
