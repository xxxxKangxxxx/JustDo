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
import { addMonths, parseISO, todayISO } from "@/lib/date";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  AppState,
  Category,
  Goal,
  GoalPromptDismissal,
  Habit,
  NewHabitInput,
  NewTaskInput,
  Settings,
  TabId,
  Task,
} from "@/types/domain";
import {
  createIndexedDBStorage,
  createLocalStorageStorage,
  createSyncedStorage,
  mergePersisted,
  type JustDoStorage,
  type PersistedView,
  type RemoteChange,
} from "./persistence";
import { createInitialState } from "./sample-data";
import { createSupabaseStorage } from "./supabase-storage";

const defaultStorageKey = "just-do/web/v1";
const defaultStorage = createIndexedDBStorage({
  fallback: createLocalStorageStorage(defaultStorageKey),
});

const storageForUser = (userId: string) => {
  const local = createIndexedDBStorage({
    dbName: `just-do-web-${userId}`,
    fallback: createLocalStorageStorage(`${defaultStorageKey}/${userId}`),
  });
  const remote = createSupabaseStorage(getSupabaseClient(), userId);
  return createSyncedStorage(local, remote);
};

type StoreValue = {
  state: AppState;
  isHydrated: boolean;
  syncError: string | null;
  syncStatus: {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
  };
  clearSyncError: () => void;
  setTab: (tab: TabId) => void;
  setDark: (dark: boolean) => void;
  setMonth: (year: number, month: number) => void;
  moveMonth: (offset: number) => void;
  selectDate: (iso: string) => void;
  openAddSheet: (payload?: { taskId?: string; date?: string; initialType?: "task" | "habit" }) => void;
  closeSheet: () => void;
  openDetail: (taskId: string) => void;
  openHabitDetail: (habitId: string) => void;
  closeDetail: () => void;
  toggleTask: (id: string) => void;
  addCategory: (input: { name: string; color: string }) => void;
  updateCategory: (
    id: string,
    patch: Partial<Pick<Category, "name" | "color" | "position">>,
  ) => void;
  deleteCategory: (id: string) => void;
  addTask: (task: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<NewTaskInput>) => void;
  deleteTask: (id: string) => void;
  toggleHabit: (id: string, iso: string) => void;
  addHabit: (habit: NewHabitInput) => void;
  updateHabit: (id: string, patch: Partial<NewHabitInput>) => void;
  deleteHabit: (id: string) => void;
  addGoal: (input: Omit<Goal, "id">) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => void;
  deleteGoal: (id: string) => void;
  dismissGoalPrompt: (
    input: Omit<GoalPromptDismissal, "id" | "dismissedAt"> & { dismissedAt?: string },
  ) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const browserOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;

const viewOf = (state: AppState): PersistedView => ({
  tab: state.view.tab,
  year: state.view.year,
  month: state.view.month,
  selectedDate: state.view.selectedDate,
  dark: state.view.dark,
});

const upsertById = <T extends { id: string }>(list: T[], item: T): T[] => {
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
};

export function JustDoProvider({
  children,
  storage,
  userId = null,
}: {
  children: ReactNode;
  storage?: JustDoStorage;
  userId?: string | null;
}) {
  const activeStorage = useMemo(() => {
    if (storage) return storage;
    if (userId) return storageForUser(userId);
    return defaultStorage;
  }, [storage, userId]);
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydratedStorage, setHydratedStorage] = useState<JustDoStorage | null>(null);
  const isHydrated = hydratedStorage === activeStorage;
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: browserOnline(),
    isSyncing: false,
    pendingCount: 0,
  });
  const hydratedRef = useRef(false);

  const reportSyncError = useCallback((err: unknown) => {
    // Suppress while offline — queued mutations stay in IndexedDB and the
    // online listener flushes them on reconnect. Surfacing offline fetch
    // failures as syncError makes the settings panel claim "확인 필요" while
    // the connection row already says "오프라인".
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("JustDo storage error suppressed (offline):", err);
      }
      return;
    }
    const message = err instanceof Error && err.message
      ? err.message
      : "저장 중 문제가 발생했습니다.";
    setSyncError(message);
    if (process.env.NODE_ENV !== "production") {
      console.error("JustDo storage error:", err);
    }
  }, []);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  const refreshPendingCount = useCallback(() => {
    void (async () => {
      const queued = await activeStorage.listQueuedMutations?.();
      setSyncStatus((current) => ({
        ...current,
        pendingCount: queued?.length ?? 0,
      }));
    })().catch(reportSyncError);
  }, [activeStorage, reportSyncError]);

  const syncNow = useCallback(() => {
    setSyncStatus((current) => ({ ...current, isOnline: browserOnline(), isSyncing: true }));
    return activeStorage
      .load()
      .then((saved) => {
        if (saved) {
          setState((current) => mergePersisted(current, saved));
        }
        clearSyncError();
        refreshPendingCount();
        if (typeof window !== "undefined") {
          window.setTimeout(refreshPendingCount, 500);
        }
      })
      .catch(reportSyncError)
      .finally(() => setSyncStatus((current) => ({ ...current, isSyncing: false })));
  }, [activeStorage, clearSyncError, refreshPendingCount, reportSyncError]);

  const persist = useCallback(
    (operation: Promise<void>) => {
      setSyncStatus((current) => ({ ...current, isSyncing: true }));
      operation
        .then(clearSyncError)
        .catch(reportSyncError)
        .finally(() => {
          setSyncStatus((current) => ({ ...current, isSyncing: false }));
          refreshPendingCount();
        });
    },
    [clearSyncError, refreshPendingCount, reportSyncError],
  );

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    activeStorage
      .load()
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setState((current) => mergePersisted(current, saved));
        }
        hydratedRef.current = true;
        setHydratedStorage(activeStorage);
        clearSyncError();
        refreshPendingCount();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        hydratedRef.current = true;
        setHydratedStorage(activeStorage);
        reportSyncError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeStorage, clearSyncError, refreshPendingCount, reportSyncError]);

  useEffect(() => {
    const setOnline = () => {
      void syncNow();
    };
    const setOffline = () => {
      setSyncStatus((current) => ({ ...current, isOnline: false }));
      refreshPendingCount();
    };

    if (typeof window === "undefined") return;
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, [refreshPendingCount, syncNow]);

  useEffect(() => {
    if (!isHydrated || !syncStatus.isOnline || syncStatus.isSyncing || syncStatus.pendingCount <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      void syncNow();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [isHydrated, syncNow, syncStatus.isOnline, syncStatus.isSyncing, syncStatus.pendingCount]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void syncNow();
      }
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [syncNow]);

  const applyRemoteChange = useCallback(
    (change: RemoteChange) => {
      if (change.type === "error") {
        reportSyncError(change.error);
        return;
      }

      clearSyncError();

      setState((current) => {
        switch (change.type) {
          case "category_upserted":
            return { ...current, categories: upsertById(current.categories, change.category) };
          case "category_deleted":
            return {
              ...current,
              categories: current.categories.filter((category) => category.id !== change.id),
              tasks: current.tasks.map((task) =>
                task.categoryId === change.id ? { ...task, categoryId: null } : task,
              ),
            };
          case "task_upserted":
            return { ...current, tasks: upsertById(current.tasks, change.task) };
          case "task_deleted":
            return {
              ...current,
              tasks: current.tasks.filter((task) => task.id !== change.id),
              view: {
                ...current.view,
                sheet: current.view.sheet?.taskId === change.id ? null : current.view.sheet,
                detailTaskId:
                  current.view.detailTaskId === change.id ? null : current.view.detailTaskId,
                detailHabitId: current.view.detailHabitId,
              },
            };
          case "habit_upserted": {
            const existing = current.habits.find((habit) => habit.id === change.habit.id);
            const habit = existing
              ? { ...change.habit, log: existing.log }
              : change.habit;
            return { ...current, habits: upsertById(current.habits, habit) };
          }
          case "habit_deleted":
            return {
              ...current,
              habits: current.habits.filter((habit) => habit.id !== change.id),
              view: {
                ...current.view,
                detailHabitId:
                  current.view.detailHabitId === change.id ? null : current.view.detailHabitId,
              },
            };
          case "habit_log_set":
            return {
              ...current,
              habits: current.habits.map((habit) =>
                habit.id === change.habitId
                  ? { ...habit, log: { ...habit.log, [change.iso]: change.value } }
                  : habit,
              ),
            };
          case "goal_upserted":
            return { ...current, goals: upsertById(current.goals, change.goal) };
          case "goal_deleted":
            return {
              ...current,
              goals: current.goals.filter((goal) => goal.id !== change.id),
            };
          case "goal_prompt_dismissal_upserted":
            return {
              ...current,
              goalPromptDismissals: upsertById(
                current.goalPromptDismissals,
                change.dismissal,
              ),
            };
        }
      });
    },
    [clearSyncError, reportSyncError],
  );

  useEffect(() => {
    if (!activeStorage.subscribe) return;
    return activeStorage.subscribe(applyRemoteChange);
  }, [activeStorage, applyRemoteChange]);

  // Persistence helpers — fire-and-forget from the caller's perspective. Any
  // rejected adapter operation is captured in `syncError` for the UI.
  const persistTask = useCallback(
    (task: Task) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.upsertTask(task));
    },
    [activeStorage, persist],
  );
  const persistTaskDelete = useCallback(
    (id: string) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.deleteTask(id));
    },
    [activeStorage, persist],
  );
  const persistCategory = useCallback(
    (category: Category) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.upsertCategory(category));
    },
    [activeStorage, persist],
  );
  const persistCategoryDelete = useCallback(
    (id: string) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.deleteCategory(id));
    },
    [activeStorage, persist],
  );
  const persistHabit = useCallback(
    (habit: Habit) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.upsertHabit(habit));
    },
    [activeStorage, persist],
  );
  const persistHabitDelete = useCallback(
    (id: string) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.deleteHabit(id));
    },
    [activeStorage, persist],
  );
  const persistHabitLog = useCallback(
    (habitId: string, iso: string, value: 0 | 1) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.setHabitLog(habitId, iso, value));
    },
    [activeStorage, persist],
  );
  const persistSettings = useCallback(
    (settings: Settings) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.saveSettings(settings));
    },
    [activeStorage, persist],
  );
  const persistGoal = useCallback(
    (goal: Goal) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.upsertGoal(goal));
    },
    [activeStorage, persist],
  );
  const persistGoalDelete = useCallback(
    (id: string) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.deleteGoal(id));
    },
    [activeStorage, persist],
  );
  const persistGoalPromptDismissal = useCallback(
    (dismissal: GoalPromptDismissal) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.upsertGoalPromptDismissal(dismissal));
    },
    [activeStorage, persist],
  );
  const persistView = useCallback(
    (view: PersistedView) => {
      if (!hydratedRef.current) return;
      persist(activeStorage.saveView(view));
    },
    [activeStorage, persist],
  );

  const updateView = useCallback(
    (fn: (view: AppState["view"]) => AppState["view"], opts: { persist?: boolean } = {}) => {
      const persist = opts.persist ?? true;
      const nextView = fn(state.view);
      setState((current) => ({ ...current, view: nextView }));
      if (persist) persistView(viewOf({ ...state, view: nextView }));
    },
    [persistView, state],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      isHydrated,
      syncError,
      syncStatus,
      clearSyncError,
      setTab: (tab) =>
        updateView((view) => ({ ...view, tab, detailTaskId: null, detailHabitId: null })),
      setDark: (dark) => updateView((view) => ({ ...view, dark })),
      setMonth: (year, month) => updateView((view) => ({ ...view, year, month })),
      moveMonth: (offset) =>
        updateView((view) => {
          const next = addMonths(view.year, view.month, offset);
          return { ...view, year: next.year, month: next.month };
        }),
      selectDate: (iso) =>
        updateView((view) => {
          const parsed = parseISO(iso);
          return { ...view, year: parsed.year, month: parsed.month, selectedDate: iso };
        }),
      // Sheet/detail are session-local and intentionally excluded from persistence.
      openAddSheet: (payload) =>
        updateView((view) => ({ ...view, sheet: { kind: "add", ...(payload ?? {}) } }), {
          persist: false,
        }),
      closeSheet: () => updateView((view) => ({ ...view, sheet: null }), { persist: false }),
      openDetail: (taskId) =>
        updateView((view) => ({ ...view, detailTaskId: taskId, detailHabitId: null }), {
          persist: false,
        }),
      openHabitDetail: (habitId) =>
        updateView((view) => ({ ...view, detailTaskId: null, detailHabitId: habitId }), {
          persist: false,
        }),
      closeDetail: () =>
        updateView((view) => ({ ...view, detailTaskId: null, detailHabitId: null }), {
          persist: false,
        }),
      toggleTask: (id) => {
        const updated = state.tasks.find((task) => task.id === id);
        if (!updated) return;
        const nextTask = { ...updated, isCompleted: !updated.isCompleted };
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((task) => (task.id === id ? nextTask : task)),
        }));
        persistTask(nextTask);
      },
      addCategory: (input) => {
        const nextPosition = state.categories.reduce(
          (max, category) => Math.max(max, category.position),
          -1,
        ) + 1;
        const category: Category = {
          id: crypto.randomUUID(),
          name: input.name.trim() || "새 카테고리",
          color: input.color,
          isDefault: false,
          position: nextPosition,
        };
        setState((s) => ({ ...s, categories: [...s.categories, category] }));
        persistCategory(category);
      },
      updateCategory: (id, patch) => {
        const existing = state.categories.find((category) => category.id === id);
        if (!existing) return;
        const updated = {
          ...existing,
          ...patch,
          name: patch.name === undefined ? existing.name : patch.name.trim() || existing.name,
        };
        setState((s) => ({
          ...s,
          categories: s.categories.map((category) =>
            category.id === id ? updated : category,
          ),
        }));
        persistCategory(updated);
      },
      deleteCategory: (id) => {
        if (state.categories.length <= 1) return;
        setState((s) => ({
          ...s,
          categories: s.categories.filter((category) => category.id !== id),
          tasks: s.tasks.map((task) =>
            task.categoryId === id ? { ...task, categoryId: null } : task,
          ),
        }));
        persistCategoryDelete(id);
      },
      addTask: (input) => {
        const created: Task = {
          id: crypto.randomUUID(),
          isCompleted: false,
          ...input,
          tags: input.tags ?? [],
        };
        setState((s) => ({ ...s, tasks: [...s.tasks, created] }));
        persistTask(created);
      },
      updateTask: (id, patch) => {
        const existing = state.tasks.find((task) => task.id === id);
        if (!existing) return;
        const updated = { ...existing, ...patch };
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((task) => (task.id === id ? updated : task)),
        }));
        persistTask(updated);
      },
      deleteTask: (id) => {
        setState((s) => ({
          ...s,
          tasks: s.tasks.filter((task) => task.id !== id),
          view: {
            ...s.view,
            sheet: s.view.sheet?.taskId === id ? null : s.view.sheet,
            detailTaskId: s.view.detailTaskId === id ? null : s.view.detailTaskId,
            detailHabitId: s.view.detailHabitId,
          },
        }));
        persistTaskDelete(id);
      },
      toggleHabit: (id, iso) => {
        const existing = state.habits.find((habit) => habit.id === id);
        if (!existing) return;
        const nextValue: 0 | 1 = existing.log[iso] ? 0 : 1;
        setState((s) => ({
          ...s,
          habits: s.habits.map((habit) =>
            habit.id === id
              ? { ...habit, log: { ...habit.log, [iso]: nextValue } }
              : habit,
          ),
        }));
        persistHabitLog(id, iso, nextValue);
      },
      addHabit: (input) => {
        const created: Habit = {
          id: crypto.randomUUID(),
          category: "habit",
          startedAt: todayISO(),
          log: {},
          ...input,
        };
        setState((s) => ({ ...s, habits: [...s.habits, created] }));
        persistHabit(created);
      },
      updateHabit: (id, patch) => {
        const existing = state.habits.find((habit) => habit.id === id);
        if (!existing) return;
        const nextRecurType = patch.recurType ?? existing.recurType;
        const updated: Habit = {
          ...existing,
          ...patch,
          title: patch.title === undefined ? existing.title : patch.title.trim() || existing.title,
          recurType: nextRecurType,
          recurDays:
            nextRecurType === "weekly"
              ? (patch.recurDays ?? existing.recurDays ?? []).slice().sort((a, b) => a - b)
              : undefined,
          reminderTime:
            patch.reminderTime === undefined ? existing.reminderTime ?? null : patch.reminderTime,
        };
        setState((s) => ({
          ...s,
          habits: s.habits.map((habit) => (habit.id === id ? updated : habit)),
        }));
        persistHabit(updated);
      },
      deleteHabit: (id) => {
        setState((s) => ({
          ...s,
          habits: s.habits.filter((habit) => habit.id !== id),
          view: {
            ...s.view,
            detailHabitId: s.view.detailHabitId === id ? null : s.view.detailHabitId,
          },
        }));
        persistHabitDelete(id);
      },
      addGoal: (input) => {
        const goal: Goal = {
          id: crypto.randomUUID(),
          ...input,
          title: input.title.trim() || "새 목표",
          note: input.note?.trim() ? input.note.trim() : null,
          lockedAt: input.locked ? (input.lockedAt ?? new Date().toISOString()) : null,
        };
        setState((s) => ({ ...s, goals: [...s.goals, goal] }));
        persistGoal(goal);
      },
      updateGoal: (id, patch) => {
        const existing = state.goals.find((goal) => goal.id === id);
        if (!existing) return;
        const nextLocked = patch.locked ?? existing.locked;
        const updated: Goal = {
          ...existing,
          ...patch,
          title: patch.title === undefined ? existing.title : patch.title.trim() || existing.title,
          note: patch.note === undefined
            ? existing.note
            : patch.note?.trim()
              ? patch.note.trim()
              : null,
          locked: nextLocked,
          lockedAt: nextLocked
            ? (patch.lockedAt ?? existing.lockedAt ?? new Date().toISOString())
            : null,
        };
        setState((s) => ({
          ...s,
          goals: s.goals.map((goal) => (goal.id === id ? updated : goal)),
        }));
        persistGoal(updated);
      },
      deleteGoal: (id) => {
        setState((s) => ({ ...s, goals: s.goals.filter((goal) => goal.id !== id) }));
        persistGoalDelete(id);
      },
      dismissGoalPrompt: (input) => {
        const dismissal: GoalPromptDismissal = {
          id: crypto.randomUUID(),
          dismissedAt: input.dismissedAt ?? new Date().toISOString(),
          ...input,
        };
        setState((s) => ({
          ...s,
          goalPromptDismissals: upsertById(s.goalPromptDismissals, dismissal),
        }));
        persistGoalPromptDismissal(dismissal);
      },
      updateSetting: (key, value) => {
        const settings = { ...state.settings, [key]: value };
        setState((s) => ({ ...s, settings }));
        persistSettings(settings);
      },
      reset: () => setState(createInitialState()),
    }),
    [
      state,
      isHydrated,
      updateView,
      persistTask,
      persistTaskDelete,
      persistCategory,
      persistCategoryDelete,
      persistHabit,
      persistHabitDelete,
      persistHabitLog,
      persistSettings,
      persistGoal,
      persistGoalDelete,
      persistGoalPromptDismissal,
      syncError,
      syncStatus,
      clearSyncError,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useJustDo = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useJustDo must be used inside JustDoProvider");
  return ctx;
};
