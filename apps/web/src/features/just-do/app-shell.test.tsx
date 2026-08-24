import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, parseISO, todayISO } from "@/lib/date";
import type { Persisted } from "./persistence";
import { createMemoryStorage } from "./persistence";
import { defaultCategories } from "./tokens";
import { JustDoApp } from "./app-shell";

const authMock = vi.hoisted(() => ({
  value: {
    user: { id: "user-1", email: "user@example.com", displayName: "Tester" },
    status: "signedIn" as const,
    error: null,
    clearError: vi.fn(),
    signInWithProvider: vi.fn(),
    signOut: vi.fn(),
  },
}));

const signedInAuth = () => ({
  user: { id: "user-1", email: "user@example.com", displayName: "Tester" },
  status: "signedIn" as const,
  error: null,
  clearError: vi.fn(),
  signInWithProvider: vi.fn(),
  signOut: vi.fn(),
});

const signedOutAuth = () => ({
  user: null,
  status: "signedOut" as const,
  error: null,
  clearError: vi.fn(),
  signInWithProvider: vi.fn(),
  signOut: vi.fn(),
});

vi.mock("@/lib/auth/useAuth", async () => {
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => authMock.value,
  };
});

const mountedRoots: Root[] = [];

const renderWithAppReact = (ui: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => {
    root.render(ui);
  });
};

const selectedDate = todayISO();
const selected = parseISO(selectedDate);

const persistedState = (overrides: Partial<Persisted> = {}): Persisted => ({
  view: {
    tab: "home",
    year: selected.year,
    month: selected.month,
    selectedDate,
    dark: false,
  },
  categories: defaultCategories,
  tasks: [
    {
      id: "task-1",
      title: "기존 할일",
      startDate: selectedDate,
      endDate: selectedDate,
      scheduledTime: "09:00",
      categoryId: defaultCategories[0].id,
      priority: "medium",
      isCompleted: false,
      reminderMode: "default",
      reminderOffsetsMinutes: [],
      tags: ["existing"],
    },
  ],
  habits: [
    {
      id: "habit-1",
      title: "기존 습관",
      emoji: "🌱",
      category: "habit",
      startedAt: selectedDate,
      recurType: "daily",
      reminderTime: null,
      log: {},
    },
  ],
  goals: [],
  goalPromptDismissals: [],
  settings: {
    notify: true,
    notifyTime: "09:00",
    weekStart: 0,
    plan: "free",
    justDoMode: false,
  },
  ...overrides,
});

const renderApp = (state: Persisted = persistedState()) => {
  const storage = createMemoryStorage(state);
  renderWithAppReact(<JustDoApp storage={storage} />);
  return storage;
};

const openNewItemModal = async () => {
  click(await screen.findByRole("button", { name: /새 Task/ }));
  return screen.findByPlaceholderText("무엇을 할까요?");
};

const submitOpenModal = () => {
  const addButtons = screen.getAllByRole("button", { name: "추가" });
  click(addButtons[addButtons.length - 1]);
};

beforeEach(() => {
  authMock.value = signedInAuth();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  mountedRoots.splice(0).forEach((root) => {
    act(() => root.unmount());
  });
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

type LegacySubscriptionFixture = {
  plan_name?: string;
  status: string;
  billing_provider?: string | null;
} | null;

const mockSubscriptionFetch = (subscription: LegacySubscriptionFixture) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        subscription: subscription ? {
          id: "sub-1",
          plan_name: subscription.plan_name ?? "pro",
          status: subscription.status,
          trial_start_at: null,
          trial_end_at: "2026-06-18T00:00:00.000Z",
          subscribed_at: null,
          expires_at: null,
          billing_provider: subscription.billing_provider ?? null,
          plan_interval: "monthly",
          amount_krw: 1900,
          currency: "KRW",
          next_billing_at: null,
          cancel_at: null,
          cancelled_at: null,
          last_payment_at: null,
          payment_failures: 0,
          payment_method_label: null,
          payment_method_last4: null,
        } : null,
      }),
    }),
  );
};

const mockSubscriptionFetchError = () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("subscription_fetch_failed")));
};

const legacySubscriptionCases: ReadonlyArray<readonly [string, LegacySubscriptionFixture]> = [
  ["no subscription row", null],
  ["free", { plan_name: "free", status: "active" }],
  ["trial", { status: "trial" }],
  ["active Pro", { status: "active", billing_provider: "toss_payments" }],
  ["expired", { status: "expired" }],
  ["paused", { status: "paused" }],
  ["cancelled", { status: "cancelled" }],
  ["malformed", { plan_name: "unknown", status: "unknown" }],
];

const click = (element: Element) => {
  act(() => {
    fireEvent.click(element);
  });
};

const change = (element: Element, value: string) => {
  act(() => {
    fireEvent.change(element, { target: { value } });
    fireEvent.input(element, { target: { value } });
  });
};

const blur = (element: Element) => {
  act(() => {
    fireEvent.blur(element);
  });
};

const keyDown = (element: Element, key: string) => {
  act(() => {
    fireEvent.keyDown(element, { key });
  });
};

const keyDownWindow = (key: string) => {
  act(() => {
    fireEvent.keyDown(window, { key });
  });
};

describe("desktop app shell interactions", () => {
  it("keeps signed-out users on the login screen", async () => {
    authMock.value = signedOutAuth();
    renderApp();

    expect(await screen.findByRole("button", { name: "Google로 로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /새 Task/ })).not.toBeInTheDocument();
  });

  it("adds a task with tag chips from the desktop add modal", async () => {
    renderApp();

    const titleInput = await openNewItemModal();
    change(titleInput, "기획 회의");

    const tagInput = screen.getByPlaceholderText("태그 추가");
    change(tagInput, "deep, work");
    blur(tagInput);
    submitOpenModal();

    const createdTaskTexts = await screen.findAllByText("기획 회의");
    expect(createdTaskTexts.length).toBeGreaterThan(0);

    click(createdTaskTexts[createdTaskTexts.length - 1]);

    expect((await screen.findAllByText("deep")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("work").length).toBeGreaterThan(0);
  });

  it("commits and normalizes task tags with space in the desktop add modal", async () => {
    renderApp();

    const titleInput = await openNewItemModal();
    change(titleInput, "태그 정규화 테스트");

    const tagInput = screen.getByPlaceholderText("태그 추가");
    change(tagInput, "#운동");
    keyDown(tagInput, " ");
    change(tagInput, "운동");
    keyDown(tagInput, "Enter");
    change(tagInput, "식단");
    keyDown(tagInput, " ");
    submitOpenModal();

    const createdTaskTexts = await screen.findAllByText("태그 정규화 테스트");
    expect(createdTaskTexts.length).toBeGreaterThan(0);
    click(createdTaskTexts[createdTaskTexts.length - 1]);

    expect((await screen.findAllByText("운동")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("식단").length).toBeGreaterThan(0);
    expect(screen.queryByText("#운동")).toBeNull();
    expect(screen.getAllByRole("button", { name: "태그 운동 삭제" })).toHaveLength(1);
  });

  it("filters calendar tasks by a selected sidebar tag instead of opening search", async () => {
    renderApp(persistedState({
      tasks: [
        {
          id: "task-work",
          title: "업무 태그 할일",
          startDate: selectedDate,
          endDate: selectedDate,
          scheduledTime: null,
          categoryId: defaultCategories[0].id,
          priority: "medium",
          isCompleted: false,
          reminderMode: "default",
          reminderOffsetsMinutes: [],
          tags: ["work"],
        },
        {
          id: "task-personal",
          title: "개인 태그 할일",
          startDate: selectedDate,
          endDate: selectedDate,
          scheduledTime: null,
          categoryId: defaultCategories[1].id,
          priority: "medium",
          isCompleted: false,
          reminderMode: "default",
          reminderOffsetsMinutes: [],
          tags: ["personal"],
        },
      ],
    }));

    click(await screen.findByTitle("Today 패널"));
    click(screen.getByRole("button", { name: "리스트" }));
    expect(screen.getByText("업무 태그 할일")).toBeTruthy();
    expect(screen.getByText("개인 태그 할일")).toBeTruthy();

    click(screen.getByRole("button", { name: "work" }));

    expect(screen.getByText("업무 태그 할일")).toBeTruthy();
    expect(screen.queryByText("개인 태그 할일")).toBeNull();
    expect(screen.queryByText(/결과/)).toBeNull();
  });

  it("edits task tags from the task detail modal", async () => {
    renderApp();

    const existingTaskTexts = await screen.findAllByText("기존 할일");
    click(existingTaskTexts[existingTaskTexts.length - 1]);

    expect(await screen.findByRole("button", { name: "태그 existing 삭제" })).toBeInTheDocument();

    const tagInput = screen.getByLabelText("Task 태그 추가");
    change(tagInput, "review, next");
    keyDown(tagInput, "Enter");

    expect((await screen.findAllByText("review")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("next").length).toBeGreaterThan(0);

    click(screen.getByRole("button", { name: "태그 existing 삭제" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "태그 existing 삭제" })).not.toBeInTheDocument();
    });
  });

  it("switches the add modal to Habit and creates a visible today habit", async () => {
    renderApp();

    await openNewItemModal();
    click(screen.getByRole("button", { name: "Habit" }));

    const titleInput = await screen.findByPlaceholderText("어떤 습관을 만들까요?");
    change(titleInput, "물 마시기");
    submitOpenModal();

    expect(await screen.findByText("물 마시기")).toBeInTheDocument();
  });

  it("selects calendar dates without opening creation, while the small plus opens it", async () => {
    renderApp();

    await screen.findByRole("button", { name: /새 Task/ });
    const addForToday = screen.getAllByLabelText(`${selected.day}일에 항목 추가`)[0];

    click(addForToday.parentElement as HTMLElement);
    expect(screen.queryByPlaceholderText("무엇을 할까요?")).not.toBeInTheDocument();

    click(screen.getAllByLabelText(`${selected.day}일에 항목 추가`)[0]);
    expect(await screen.findByPlaceholderText("무엇을 할까요?")).toBeInTheDocument();
  });

  it("toggles today task and habit completion in place", async () => {
    renderApp();

    const taskToggle = await screen.findByRole("button", { name: "기존 할일 완료 토글" });
    const habitToggle = await screen.findByRole("button", { name: "기존 습관 완료 토글" });

    click(taskToggle);
    click(habitToggle);

    await waitFor(() => expect(taskToggle).toHaveAttribute("aria-pressed", "true"));
    expect(habitToggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("완료")).not.toBeInTheDocument();
  });

  it("renders only the selected settings section content", async () => {
    renderApp();

    click(await screen.findByRole("button", { name: "설정" }));
    expect(await screen.findByText("프로필")).toBeInTheDocument();

    click(screen.getByRole("button", { name: "카테고리" }));
    expect(await screen.findByText("카테고리 관리")).toBeInTheDocument();
    expect(screen.queryByText("프로필")).not.toBeInTheDocument();
  });

  it.each(legacySubscriptionCases)(
    "renders the full Stats dashboard for the %s legacy state",
    async (_label, subscription) => {
      mockSubscriptionFetch(subscription);
      renderApp();

      click(await screen.findByRole("button", { name: "설정" }));
      click(await screen.findByRole("button", { name: "습관" }));

      expect(await screen.findByText("이번 주 활동")).toBeInTheDocument();
      expect(screen.queryByText("통계는 Pro 기능입니다")).not.toBeInTheDocument();
      expect(screen.queryByText("구독 상태를 확인하고 있습니다.")).not.toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("renders Stats even when the legacy subscription request fails", async () => {
    mockSubscriptionFetchError();
    renderApp();

    click(await screen.findByRole("button", { name: "설정" }));
    click(await screen.findByRole("button", { name: "습관" }));

    expect(await screen.findByText("이번 주 활동")).toBeInTheDocument();
    expect(screen.queryByText("통계는 Pro 기능입니다")).not.toBeInTheDocument();
    expect(screen.queryByText("구독 상태를 확인하지 못했습니다.")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps desktop Just Do Mode available without a subscription row", async () => {
    mockSubscriptionFetch(null);
    const overdueDate = addDays(selectedDate, -1);
    renderApp(
      persistedState({
        tasks: [
          ...persistedState().tasks,
          {
            id: "task-overdue",
            title: "밀린 할일",
            startDate: overdueDate,
            endDate: overdueDate,
            scheduledTime: "08:00",
            categoryId: defaultCategories[0].id,
            priority: "high",
            isCompleted: false,
            reminderMode: "default",
            reminderOffsetsMinutes: [],
            tags: [],
          },
        ],
        settings: {
          ...persistedState().settings,
          justDoMode: true,
        },
      }),
    );

    const dueByButton = await screen.findByRole("button", { name: "이 날까지" });
    await waitFor(() => expect(dueByButton).not.toBeDisabled());
    expect(screen.queryByText(/지난일/)).not.toBeInTheDocument();

    click(dueByButton);

    expect(await screen.findByText(/지난일/)).toBeInTheDocument();
    expect(screen.queryByText("Pro 업그레이드")).not.toBeInTheDocument();

    keyDownWindow("j");

    await waitFor(() => {
      expect(screen.queryByText(/지난일/)).not.toBeInTheDocument();
    });
  });

  it("moves the Just Do Mode preference to non-commercial Settings", async () => {
    mockSubscriptionFetch(null);
    const storage = renderApp();

    click(await screen.findByRole("button", { name: "설정" }));
    click(await screen.findByRole("button", { name: "화면" }));

    const label = await screen.findByText("Just Do Mode");
    const toggle = label.parentElement?.querySelector("button");
    expect(toggle).not.toBeNull();
    click(toggle as HTMLButtonElement);

    await waitFor(async () => {
      expect((await storage.load())?.settings.justDoMode).toBe(true);
    });
    expect(screen.queryByRole("button", { name: "구독" })).not.toBeInTheDocument();
  });

  it("renders a full goal report for a legacy Free account", async () => {
    mockSubscriptionFetch({ plan_name: "free", status: "active" });
    const previousMonthDate = addDays(selectedDate, -selected.day);
    const previousMonth = parseISO(previousMonthDate);
    const previousMonthKey = `${previousMonth.year}-${String(previousMonth.month).padStart(2, "0")}`;
    renderApp(
      persistedState({
        goals: [
          {
            id: "goal-report",
            periodType: "monthly",
            periodKey: previousMonthKey,
            title: "지난달 목표",
            note: null,
            sortOrder: 0,
            locked: false,
            lockedAt: null,
            target: null,
          },
        ],
      }),
    );

    click(await screen.findByRole("button", { name: "설정" }));
    click(await screen.findByRole("button", { name: "목표" }));
    click(await screen.findByRole("button", { name: /리포트 준비 완료/ }));

    expect(await screen.findByRole("button", { name: "다음" })).toBeInTheDocument();
    expect(screen.queryByText("전체 리포트는 Pro에서 펼쳐져요")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pro로 펼치기" })).not.toBeInTheDocument();
  });

  it("removes subscription, pricing, and checkout surfaces from Settings", async () => {
    mockSubscriptionFetch({ status: "trial" });
    renderApp();

    click(await screen.findByRole("button", { name: "설정" }));
    expect(await screen.findByText("프로필")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "구독" })).not.toBeInTheDocument();
    expect(screen.queryByText("월간 Pro")).not.toBeInTheDocument();
    expect(screen.queryByText("연간 Pro")).not.toBeInTheDocument();
    expect(screen.queryByText("₩1,900 / 월")).not.toBeInTheDocument();
    expect(screen.queryByText("₩9,900 / 년")).not.toBeInTheDocument();
    expect(screen.queryByText("Toss 결제 연결")).not.toBeInTheDocument();
  });

  it("moves the desktop calendar back to the current month from the Today button", async () => {
    const previousDate = addDays(selectedDate, -40);
    const previous = parseISO(previousDate);
    renderApp(
      persistedState({
        view: {
          ...persistedState().view,
          year: previous.year,
          month: previous.month,
          selectedDate: previousDate,
        },
      }),
    );

    expect(await screen.findByText(`${previous.year}년 ${previous.month}월`)).toBeInTheDocument();

    click(screen.getByRole("button", { name: "오늘" }));

    expect(await screen.findByText(`${selected.year}년 ${selected.month}월`)).toBeInTheDocument();
  });

  it("reorders categories from desktop settings", async () => {
    renderApp();

    click(await screen.findByRole("button", { name: "설정" }));
    click(screen.getByRole("button", { name: "카테고리" }));
    expect(await screen.findByText("카테고리 관리")).toBeInTheDocument();

    const categoryInputsBefore = screen.getAllByRole("textbox", { name: /이름/ });
    expect(categoryInputsBefore.map((input) => (input as HTMLInputElement).value)).toEqual(["나", "외부"]);

    expect(screen.getByRole("button", { name: "나 위로 이동" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "외부 아래로 이동" })).toBeDisabled();

    click(screen.getByRole("button", { name: "외부 위로 이동" }));

    await waitFor(() => {
      const categoryInputsAfter = screen.getAllByRole("textbox", { name: /이름/ });
      expect(categoryInputsAfter.map((input) => (input as HTMLInputElement).value)).toEqual(["외부", "나"]);
    });
  });

  it("edits a habit from desktop settings", async () => {
    renderApp();

    click(await screen.findByRole("button", { name: "설정" }));
    click(screen.getByRole("button", { name: "습관" }));
    expect(await screen.findByText("습관 관리")).toBeInTheDocument();

    click(screen.getByRole("button", { name: "수정" }));
    const titleInput = await screen.findByLabelText("Habit 제목");
    change(titleInput, "수정된 습관");

    click(screen.getByRole("button", { name: "요일" }));
    const reminderInput = screen.getByLabelText("Habit 알림 시간");
    change(reminderInput, "08:30");
    click(screen.getByRole("button", { name: "저장" }));

    expect((await screen.findAllByText("수정된 습관")).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/요일/).length).toBeGreaterThan(0);
    expect(screen.getByText(/8:30/)).toBeInTheDocument();
  });
});
