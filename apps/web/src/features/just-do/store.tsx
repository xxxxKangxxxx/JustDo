"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addMonths, todayISO } from "@/lib/date";
import type { AppState, NewHabitInput, NewTaskInput, TabId } from "@/types/domain";
import { createInitialState } from "./sample-data";

const storageKey = "just-do/web/v1";

type StoreValue = {
  state: AppState;
  setTab: (tab: TabId) => void;
  setDark: (dark: boolean) => void;
  setMonth: (year: number, month: number) => void;
  moveMonth: (offset: number) => void;
  selectDate: (iso: string) => void;
  openAddSheet: (payload?: { taskId?: string; date?: string }) => void;
  closeSheet: () => void;
  openDetail: (taskId: string) => void;
  closeDetail: () => void;
  toggleTask: (id: string) => void;
  addTask: (task: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<NewTaskInput>) => void;
  deleteTask: (id: string) => void;
  toggleHabit: (id: string, iso: string) => void;
  addHabit: (habit: NewHabitInput) => void;
  updateSetting: <K extends keyof AppState["settings"]>(
    key: K,
    value: AppState["settings"][K],
  ) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const loadState = () => {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return createInitialState();
    const saved = JSON.parse(raw) as AppState;
    const init = createInitialState();
    return {
      ...init,
      ...saved,
      view: { ...init.view, ...saved.view, sheet: null, detailTaskId: null },
    };
  } catch {
    return createInitialState();
  }
};

export function JustDoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [state]);

  const update = useCallback((fn: (state: AppState) => AppState) => {
    setState((current) => fn(current));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      setTab: (tab) =>
        update((s) => ({ ...s, view: { ...s.view, tab, detailTaskId: null } })),
      setDark: (dark) => update((s) => ({ ...s, view: { ...s.view, dark } })),
      setMonth: (year, month) => update((s) => ({ ...s, view: { ...s.view, year, month } })),
      moveMonth: (offset) =>
        update((s) => {
          const next = addMonths(s.view.year, s.view.month, offset);
          return { ...s, view: { ...s.view, year: next.year, month: next.month } };
        }),
      selectDate: (iso) => update((s) => ({ ...s, view: { ...s.view, selectedDate: iso } })),
      openAddSheet: (payload) =>
        update((s) => ({
          ...s,
          view: { ...s.view, sheet: { kind: "add", ...(payload ?? {}) } },
        })),
      closeSheet: () => update((s) => ({ ...s, view: { ...s.view, sheet: null } })),
      openDetail: (taskId) => update((s) => ({ ...s, view: { ...s.view, detailTaskId: taskId } })),
      closeDetail: () => update((s) => ({ ...s, view: { ...s.view, detailTaskId: null } })),
      toggleTask: (id) =>
        update((s) => ({
          ...s,
          tasks: s.tasks.map((task) =>
            task.id === id ? { ...task, isCompleted: !task.isCompleted } : task,
          ),
        })),
      addTask: (task) =>
        update((s) => ({
          ...s,
          tasks: [
            ...s.tasks,
            {
              id: `t_${crypto.randomUUID().slice(0, 8)}`,
              tags: [],
              isCompleted: false,
              ...task,
            },
          ],
        })),
      updateTask: (id, patch) =>
        update((s) => ({
          ...s,
          tasks: s.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
        })),
      deleteTask: (id) =>
        update((s) => ({
          ...s,
          tasks: s.tasks.filter((task) => task.id !== id),
          view: {
            ...s.view,
            sheet: s.view.sheet?.taskId === id ? null : s.view.sheet,
            detailTaskId: s.view.detailTaskId === id ? null : s.view.detailTaskId,
          },
        })),
      toggleHabit: (id, iso) =>
        update((s) => ({
          ...s,
          habits: s.habits.map((habit) =>
            habit.id === id
              ? {
                  ...habit,
                  log: { ...habit.log, [iso]: habit.log[iso] ? 0 : 1 },
                }
              : habit,
          ),
        })),
      addHabit: (habit) =>
        update((s) => ({
          ...s,
          habits: [
            ...s.habits,
            {
              id: `h_${crypto.randomUUID().slice(0, 8)}`,
              category: "habit",
              startedAt: todayISO(),
              log: {},
              ...habit,
            },
          ],
        })),
      updateSetting: (key, value) =>
        update((s) => ({ ...s, settings: { ...s.settings, [key]: value } })),
      reset: () => setState(createInitialState()),
    }),
    [state, update],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useJustDo = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useJustDo must be used inside JustDoProvider");
  return ctx;
};
