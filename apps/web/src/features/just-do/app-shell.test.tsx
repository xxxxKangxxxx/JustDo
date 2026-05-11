import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseISO, todayISO } from "@/lib/date";
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

const persistedState = (): Persisted => ({
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
  settings: {
    notify: true,
    notifyTime: "09:00",
    weekStart: 0,
    plan: "free",
  },
});

const renderApp = () => {
  const storage = createMemoryStorage(persistedState());
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

describe("desktop app shell interactions", () => {
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
    const addForToday = screen.getByLabelText(`${selected.day}일에 항목 추가`);

    click(addForToday.parentElement as HTMLElement);
    expect(screen.queryByPlaceholderText("무엇을 할까요?")).not.toBeInTheDocument();

    click(addForToday);
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

    expect(await screen.findByText("수정된 습관")).toBeInTheDocument();
    expect(screen.getByText(/요일/)).toBeInTheDocument();
    expect(screen.getByText(/8:30/)).toBeInTheDocument();
  });
});
