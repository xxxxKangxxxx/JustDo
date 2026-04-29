"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addMonths, todayISO } from "@/lib/date";
import type {
  AppState,
  Habit,
  NewHabitInput,
  NewTaskInput,
  Settings,
  TabId,
  Task,
} from "@/types/domain";
import {
  createLocalStorageStorage,
  mergePersisted,
  type JustDoStorage,
  type PersistedView,
} from "./persistence";
import { createInitialState } from "./sample-data";

const defaultStorageKey = "just-do/web/v1";
const defaultStorage = createLocalStorageStorage(defaultStorageKey);

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
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const viewOf = (state: AppState): PersistedView => ({
  tab: state.view.tab,
  year: state.view.year,
  month: state.view.month,
  selectedDate: state.view.selectedDate,
  dark: state.view.dark,
});

export function JustDoProvider({
  children,
  storage = defaultStorage,
}: {
  children: ReactNode;
  storage?: JustDoStorage;
}) {
  const [state, setState] = useState<AppState>(createInitialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    storage.load().then((saved) => {
      if (cancelled) return;
      if (saved) {
        setState((current) => mergePersisted(current, saved));
      }
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  // Persistence helpers — fire-and-forget. Adapters are expected not to throw
  // on the happy path; failures will be surfaced via subscribe() in Phase 4-4.
  const persistTask = useCallback(
    (task: Task) => {
      if (!hydratedRef.current) return;
      void storage.upsertTask(task);
    },
    [storage],
  );
  const persistTaskDelete = useCallback(
    (id: string) => {
      if (!hydratedRef.current) return;
      void storage.deleteTask(id);
    },
    [storage],
  );
  const persistHabit = useCallback(
    (habit: Habit) => {
      if (!hydratedRef.current) return;
      void storage.upsertHabit(habit);
    },
    [storage],
  );
  const persistHabitLog = useCallback(
    (habitId: string, iso: string, value: 0 | 1) => {
      if (!hydratedRef.current) return;
      void storage.setHabitLog(habitId, iso, value);
    },
    [storage],
  );
  const persistSettings = useCallback(
    (settings: Settings) => {
      if (!hydratedRef.current) return;
      void storage.saveSettings(settings);
    },
    [storage],
  );
  const persistView = useCallback(
    (view: PersistedView) => {
      if (!hydratedRef.current) return;
      void storage.saveView(view);
    },
    [storage],
  );

  const updateView = useCallback(
    (fn: (view: AppState["view"]) => AppState["view"], opts: { persist?: boolean } = {}) => {
      const persist = opts.persist ?? true;
      setState((current) => {
        const nextView = fn(current.view);
        const next = { ...current, view: nextView };
        if (persist) persistView(viewOf(next));
        return next;
      });
    },
    [persistView],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      setTab: (tab) => updateView((view) => ({ ...view, tab, detailTaskId: null })),
      setDark: (dark) => updateView((view) => ({ ...view, dark })),
      setMonth: (year, month) => updateView((view) => ({ ...view, year, month })),
      moveMonth: (offset) =>
        updateView((view) => {
          const next = addMonths(view.year, view.month, offset);
          return { ...view, year: next.year, month: next.month };
        }),
      selectDate: (iso) => updateView((view) => ({ ...view, selectedDate: iso })),
      // Sheet/detail are session-local and intentionally excluded from persistence.
      openAddSheet: (payload) =>
        updateView((view) => ({ ...view, sheet: { kind: "add", ...(payload ?? {}) } }), {
          persist: false,
        }),
      closeSheet: () => updateView((view) => ({ ...view, sheet: null }), { persist: false }),
      openDetail: (taskId) =>
        updateView((view) => ({ ...view, detailTaskId: taskId }), { persist: false }),
      closeDetail: () =>
        updateView((view) => ({ ...view, detailTaskId: null }), { persist: false }),
      toggleTask: (id) =>
        setState((s) => {
          let updated: Task | null = null;
          const tasks = s.tasks.map((task) => {
            if (task.id !== id) return task;
            updated = { ...task, isCompleted: !task.isCompleted };
            return updated;
          });
          if (updated) persistTask(updated);
          return { ...s, tasks };
        }),
      addTask: (input) =>
        setState((s) => {
          const created: Task = {
            id: `t_${crypto.randomUUID().slice(0, 8)}`,
            tags: [],
            isCompleted: false,
            ...input,
          };
          persistTask(created);
          return { ...s, tasks: [...s.tasks, created] };
        }),
      updateTask: (id, patch) =>
        setState((s) => {
          let updated: Task | null = null;
          const tasks = s.tasks.map((task) => {
            if (task.id !== id) return task;
            updated = { ...task, ...patch };
            return updated;
          });
          if (updated) persistTask(updated);
          return { ...s, tasks };
        }),
      deleteTask: (id) =>
        setState((s) => {
          persistTaskDelete(id);
          return {
            ...s,
            tasks: s.tasks.filter((task) => task.id !== id),
            view: {
              ...s.view,
              sheet: s.view.sheet?.taskId === id ? null : s.view.sheet,
              detailTaskId: s.view.detailTaskId === id ? null : s.view.detailTaskId,
            },
          };
        }),
      toggleHabit: (id, iso) =>
        setState((s) => {
          let nextValue: 0 | 1 | null = null;
          const habits = s.habits.map((habit) => {
            if (habit.id !== id) return habit;
            nextValue = habit.log[iso] ? 0 : 1;
            return { ...habit, log: { ...habit.log, [iso]: nextValue } };
          });
          if (nextValue !== null) persistHabitLog(id, iso, nextValue);
          return { ...s, habits };
        }),
      addHabit: (input) =>
        setState((s) => {
          const created: Habit = {
            id: `h_${crypto.randomUUID().slice(0, 8)}`,
            category: "habit",
            startedAt: todayISO(),
            log: {},
            ...input,
          };
          persistHabit(created);
          return { ...s, habits: [...s.habits, created] };
        }),
      updateSetting: (key, value) =>
        setState((s) => {
          const settings = { ...s.settings, [key]: value };
          persistSettings(settings);
          return { ...s, settings };
        }),
      reset: () => setState(createInitialState()),
    }),
    [
      state,
      updateView,
      persistTask,
      persistTaskDelete,
      persistHabit,
      persistHabitLog,
      persistSettings,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useJustDo = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useJustDo must be used inside JustDoProvider");
  return ctx;
};
