import type { AppState, Habit, Settings, Task } from "@/types/domain";

export type PersistedView = Pick<
  AppState["view"],
  "tab" | "year" | "month" | "selectedDate" | "dark"
>;

export type Persisted = {
  view: PersistedView;
  tasks: AppState["tasks"];
  habits: AppState["habits"];
  settings: AppState["settings"];
};

export type RemoteChange =
  | { type: "task_upserted"; task: Task }
  | { type: "task_deleted"; id: string }
  | { type: "habit_upserted"; habit: Habit }
  | { type: "habit_deleted"; id: string }
  | { type: "habit_log_set"; habitId: string; iso: string; value: 0 | 1 }
  | { type: "error"; error: unknown };

/**
 * Persistence boundary used by the store.
 *
 * The interface is per-entity rather than a single `save(state)` call so
 * remote adapters (Supabase, future self-hosted backend) can map each
 * mutation to a targeted query instead of upserting the whole world.
 *
 * Every mutation is fire-and-forget from the store's perspective —
 * adapters MUST NOT throw on the happy path. Failures should be surfaced
 * through `subscribe` (Phase 4-4) or a separate error channel rather than
 * rejecting these promises.
 */
export interface JustDoStorage {
  load(): Promise<Persisted | null>;

  saveSettings(settings: Settings): Promise<void>;
  saveView(view: PersistedView): Promise<void>;

  upsertTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;

  upsertHabit(habit: Habit): Promise<void>;
  setHabitLog(habitId: string, iso: string, value: 0 | 1): Promise<void>;

  subscribe?(callback: (change: RemoteChange) => void): () => void;
}

export const toPersisted = (state: AppState): Persisted => ({
  view: {
    tab: state.view.tab,
    year: state.view.year,
    month: state.view.month,
    selectedDate: state.view.selectedDate,
    dark: state.view.dark,
  },
  tasks: state.tasks,
  habits: state.habits,
  settings: state.settings,
});

const normalizeTab = (tab: PersistedView["tab"] | "stats"): AppState["view"]["tab"] =>
  tab === "stats" ? "settings" : tab;

export const mergePersisted = (initial: AppState, saved: Persisted): AppState => ({
  ...initial,
  tasks: saved.tasks,
  habits: saved.habits,
  settings: { ...initial.settings, ...saved.settings },
  view: {
    ...initial.view,
    ...saved.view,
    tab: normalizeTab(saved.view.tab as PersistedView["tab"] | "stats"),
    sheet: null,
    detailTaskId: null,
  },
});

// ---------------------------------------------------------------------------
// In-memory adapter — used by tests and as a base for the localStorage adapter.
// Maintains a single `Persisted` snapshot and applies mutations to it.
// ---------------------------------------------------------------------------

type MemoryStateRef = { current: Persisted | null };

const ensureSnapshot = (ref: MemoryStateRef): Persisted => {
  if (!ref.current) {
    ref.current = {
      view: {
        tab: "home",
        year: 1970,
        month: 1,
        selectedDate: "1970-01-01",
        dark: false,
      },
      tasks: [],
      habits: [],
      settings: {
        notify: true,
        notifyTime: "09:00",
        weekStart: 0,
        plan: "free",
      },
    };
  }
  return ref.current;
};

const applyMutation = (
  ref: MemoryStateRef,
  mutate: (snapshot: Persisted) => Persisted,
) => {
  ref.current = mutate(ensureSnapshot(ref));
};

const upsertById = <T extends { id: string }>(list: T[], item: T): T[] => {
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
};

export const createMemoryStorage = (initial: Persisted | null = null): JustDoStorage => {
  const ref: MemoryStateRef = { current: initial };

  return {
    async load() {
      return ref.current;
    },

    async saveSettings(settings) {
      applyMutation(ref, (snap) => ({ ...snap, settings }));
    },

    async saveView(view) {
      applyMutation(ref, (snap) => ({ ...snap, view }));
    },

    async upsertTask(task) {
      applyMutation(ref, (snap) => ({ ...snap, tasks: upsertById(snap.tasks, task) }));
    },

    async deleteTask(id) {
      applyMutation(ref, (snap) => ({
        ...snap,
        tasks: snap.tasks.filter((task) => task.id !== id),
      }));
    },

    async upsertHabit(habit) {
      applyMutation(ref, (snap) => ({ ...snap, habits: upsertById(snap.habits, habit) }));
    },

    async setHabitLog(habitId, iso, value) {
      applyMutation(ref, (snap) => ({
        ...snap,
        habits: snap.habits.map((habit) =>
          habit.id === habitId
            ? { ...habit, log: { ...habit.log, [iso]: value } }
            : habit,
        ),
      }));
    },

    subscribe() {
      return () => undefined;
    },
  };
};

// ---------------------------------------------------------------------------
// localStorage adapter — wraps the memory adapter and serializes after each
// mutation with a debounced flush. We re-serialize the whole blob because
// localStorage is synchronous and per-entity writes would just churn JSON
// stringification for no real win.
// ---------------------------------------------------------------------------

export const createLocalStorageStorage = (
  key: string,
  options: { debounceMs?: number } = {},
): JustDoStorage => {
  const debounceMs = options.debounceMs ?? 150;
  const ref: MemoryStateRef = { current: null };
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleFlush = () => {
    if (typeof window === "undefined") return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!ref.current) return;
      try {
        window.localStorage.setItem(key, JSON.stringify(ref.current));
      } catch {
        // Quota exceeded or serialization failure — drop silently for now.
        // A future error channel can surface this.
      }
    }, debounceMs);
  };

  const mutate = async (fn: (snapshot: Persisted) => Persisted) => {
    applyMutation(ref, fn);
    scheduleFlush();
  };

  return {
    async load() {
      if (typeof window === "undefined") return null;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Persisted;
        ref.current = parsed;
        return parsed;
      } catch {
        return null;
      }
    },

    saveSettings: (settings) => mutate((snap) => ({ ...snap, settings })),
    saveView: (view) => mutate((snap) => ({ ...snap, view })),
    upsertTask: (task) =>
      mutate((snap) => ({ ...snap, tasks: upsertById(snap.tasks, task) })),
    deleteTask: (id) =>
      mutate((snap) => ({ ...snap, tasks: snap.tasks.filter((task) => task.id !== id) })),
    upsertHabit: (habit) =>
      mutate((snap) => ({ ...snap, habits: upsertById(snap.habits, habit) })),
    setHabitLog: (habitId, iso, value) =>
      mutate((snap) => ({
        ...snap,
        habits: snap.habits.map((habit) =>
          habit.id === habitId
            ? { ...habit, log: { ...habit.log, [iso]: value } }
            : habit,
        ),
      })),
    subscribe: () => () => undefined,
  };
};

type SnapshotStore = {
  read(): Promise<Persisted | null>;
  write(snapshot: Persisted): Promise<void>;
};

export const createSnapshotStorage = (store: SnapshotStore): JustDoStorage => {
  const ref: MemoryStateRef = { current: null };

  const loadSnapshot = async () => {
    if (ref.current) return ref.current;
    ref.current = await store.read();
    return ensureSnapshot(ref);
  };

  const mutate = async (fn: (snapshot: Persisted) => Persisted) => {
    const current = await loadSnapshot();
    const next = fn(current);
    ref.current = next;
    await store.write(next);
  };

  return {
    async load() {
      ref.current = await store.read();
      return ref.current;
    },

    saveSettings: (settings) => mutate((snap) => ({ ...snap, settings })),
    saveView: (view) => mutate((snap) => ({ ...snap, view })),
    upsertTask: (task) =>
      mutate((snap) => ({ ...snap, tasks: upsertById(snap.tasks, task) })),
    deleteTask: (id) =>
      mutate((snap) => ({ ...snap, tasks: snap.tasks.filter((task) => task.id !== id) })),
    upsertHabit: (habit) =>
      mutate((snap) => ({ ...snap, habits: upsertById(snap.habits, habit) })),
    setHabitLog: (habitId, iso, value) =>
      mutate((snap) => ({
        ...snap,
        habits: snap.habits.map((habit) =>
          habit.id === habitId
            ? { ...habit, log: { ...habit.log, [iso]: value } }
            : habit,
        ),
      })),
    subscribe: () => () => undefined,
  };
};

type IndexedDBStorageOptions = {
  dbName?: string;
  storeName?: string;
  recordKey?: string;
  indexedDBFactory?: IDBFactory | null;
  fallback?: JustDoStorage;
};

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });

const openIndexedDB = (
  factory: IDBFactory,
  dbName: string,
  storeName: string,
): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });

export const createIndexedDBStorage = (
  options: IndexedDBStorageOptions = {},
): JustDoStorage => {
  const dbName = options.dbName ?? "just-do-web";
  const storeName = options.storeName ?? "snapshots";
  const recordKey = options.recordKey ?? "state";
  const fallback = options.fallback ?? createLocalStorageStorage("just-do/web/v1");
  const factory =
    options.indexedDBFactory === undefined
      ? typeof indexedDB === "undefined"
        ? null
        : indexedDB
      : options.indexedDBFactory;

  if (!factory) return fallback;

  const store: SnapshotStore = {
    async read() {
      const db = await openIndexedDB(factory, dbName, storeName);
      try {
        const transaction = db.transaction(storeName, "readonly");
        const objectStore = transaction.objectStore(storeName);
        const record = await requestResult<{ key: string; value: Persisted } | undefined>(
          objectStore.get(recordKey),
        );
        return record?.value ?? null;
      } finally {
        db.close();
      }
    },

    async write(snapshot) {
      const db = await openIndexedDB(factory, dbName, storeName);
      try {
        const transaction = db.transaction(storeName, "readwrite");
        const objectStore = transaction.objectStore(storeName);
        objectStore.put({ key: recordKey, value: snapshot });
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    },
  };

  return createSnapshotStorage(store);
};
