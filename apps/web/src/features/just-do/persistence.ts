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

export type LocalMutation =
  | { type: "task_upsert"; task: Task }
  | { type: "task_delete"; id: string }
  | { type: "habit_upsert"; habit: Habit }
  | { type: "habit_log_set"; habitId: string; iso: string; value: 0 | 1 };

export type QueuedMutation = {
  id: string;
  updatedAt: string;
  mutation: LocalMutation;
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
  replaceSnapshot?(snapshot: Persisted): Promise<void>;

  saveSettings(settings: Settings): Promise<void>;
  saveView(view: PersistedView): Promise<void>;

  upsertTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;

  upsertHabit(habit: Habit): Promise<void>;
  setHabitLog(habitId: string, iso: string, value: 0 | 1): Promise<void>;

  listQueuedMutations?(): Promise<QueuedMutation[]>;
  removeQueuedMutation?(id: string): Promise<void>;
  clearQueuedMutations?(): Promise<void>;

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

    async replaceSnapshot(snapshot) {
      ref.current = snapshot;
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

    async replaceSnapshot(snapshot) {
      ref.current = snapshot;
      scheduleFlush();
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

type MutationQueueStore = {
  enqueue(mutation: QueuedMutation): Promise<void>;
  list(): Promise<QueuedMutation[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
};

type SnapshotStorageOptions = {
  queue?: MutationQueueStore;
  now?: () => string;
  createId?: () => string;
};

export const createMemoryMutationQueue = (): MutationQueueStore => {
  const queue: QueuedMutation[] = [];
  return {
    async enqueue(mutation) {
      queue.push(mutation);
    },
    async list() {
      return [...queue].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    },
    async remove(id) {
      const index = queue.findIndex((mutation) => mutation.id === id);
      if (index !== -1) queue.splice(index, 1);
    },
    async clear() {
      queue.splice(0);
    },
  };
};

export const createSnapshotStorage = (
  store: SnapshotStore,
  options: SnapshotStorageOptions = {},
): JustDoStorage => {
  const ref: MemoryStateRef = { current: null };
  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => crypto.randomUUID());

  const enqueue = async (mutation: LocalMutation) => {
    if (!options.queue) return;
    await options.queue.enqueue({
      id: createId(),
      updatedAt: now(),
      mutation,
    });
  };

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

    async replaceSnapshot(snapshot) {
      ref.current = snapshot;
      await store.write(snapshot);
    },

    saveSettings: (settings) => mutate((snap) => ({ ...snap, settings })),
    saveView: (view) => mutate((snap) => ({ ...snap, view })),
    upsertTask: async (task) => {
      await mutate((snap) => ({ ...snap, tasks: upsertById(snap.tasks, task) }));
      await enqueue({ type: "task_upsert", task });
    },
    deleteTask: async (id) => {
      await mutate((snap) => ({ ...snap, tasks: snap.tasks.filter((task) => task.id !== id) }));
      await enqueue({ type: "task_delete", id });
    },
    upsertHabit: async (habit) => {
      await mutate((snap) => ({ ...snap, habits: upsertById(snap.habits, habit) }));
      await enqueue({ type: "habit_upsert", habit });
    },
    setHabitLog: async (habitId, iso, value) => {
      await mutate((snap) => ({
        ...snap,
        habits: snap.habits.map((habit) =>
          habit.id === habitId
            ? { ...habit, log: { ...habit.log, [iso]: value } }
            : habit,
        ),
      }));
      await enqueue({ type: "habit_log_set", habitId, iso, value });
    },
    listQueuedMutations: options.queue ? () => options.queue?.list() ?? Promise.resolve([]) : undefined,
    removeQueuedMutation: options.queue ? (id) => options.queue?.remove(id) ?? Promise.resolve() : undefined,
    clearQueuedMutations: options.queue ? () => options.queue?.clear() ?? Promise.resolve() : undefined,
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
  storeNames: { snapshots: string; mutations: string },
): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(dbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeNames.snapshots)) {
        db.createObjectStore(storeNames.snapshots, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(storeNames.mutations)) {
        db.createObjectStore(storeNames.mutations, { keyPath: "id" });
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
  const mutationStoreName = "mutations";
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
      const db = await openIndexedDB(factory, dbName, {
        snapshots: storeName,
        mutations: mutationStoreName,
      });
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
      const db = await openIndexedDB(factory, dbName, {
        snapshots: storeName,
        mutations: mutationStoreName,
      });
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

  const queue: MutationQueueStore = {
    async enqueue(mutation) {
      const db = await openIndexedDB(factory, dbName, {
        snapshots: storeName,
        mutations: mutationStoreName,
      });
      try {
        const transaction = db.transaction(mutationStoreName, "readwrite");
        transaction.objectStore(mutationStoreName).put(mutation);
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    },

    async list() {
      const db = await openIndexedDB(factory, dbName, {
        snapshots: storeName,
        mutations: mutationStoreName,
      });
      try {
        const transaction = db.transaction(mutationStoreName, "readonly");
        const all = await requestResult<QueuedMutation[]>(
          transaction.objectStore(mutationStoreName).getAll(),
        );
        return all.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      } finally {
        db.close();
      }
    },

    async remove(id) {
      const db = await openIndexedDB(factory, dbName, {
        snapshots: storeName,
        mutations: mutationStoreName,
      });
      try {
        const transaction = db.transaction(mutationStoreName, "readwrite");
        transaction.objectStore(mutationStoreName).delete(id);
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    },

    async clear() {
      const db = await openIndexedDB(factory, dbName, {
        snapshots: storeName,
        mutations: mutationStoreName,
      });
      try {
        const transaction = db.transaction(mutationStoreName, "readwrite");
        transaction.objectStore(mutationStoreName).clear();
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    },
  };

  return createSnapshotStorage(store, { queue });
};

const applyQueuedMutation = async (storage: JustDoStorage, queued: QueuedMutation) => {
  switch (queued.mutation.type) {
    case "task_upsert":
      await storage.upsertTask(queued.mutation.task);
      return;
    case "task_delete":
      await storage.deleteTask(queued.mutation.id);
      return;
    case "habit_upsert":
      await storage.upsertHabit(queued.mutation.habit);
      return;
    case "habit_log_set":
      await storage.setHabitLog(
        queued.mutation.habitId,
        queued.mutation.iso,
        queued.mutation.value,
      );
      return;
  }
};

export const flushQueuedMutations = async (
  queueStorage: JustDoStorage,
  remoteStorage: JustDoStorage,
) => {
  const queued = await queueStorage.listQueuedMutations?.();
  if (!queued?.length) return;

  for (const mutation of queued) {
    await applyQueuedMutation(remoteStorage, mutation);
    await queueStorage.removeQueuedMutation?.(mutation.id);
  }
};

const applyRemoteChangeToSnapshot = (snapshot: Persisted, change: RemoteChange): Persisted => {
  switch (change.type) {
    case "task_upserted":
      return { ...snapshot, tasks: upsertById(snapshot.tasks, change.task) };
    case "task_deleted":
      return {
        ...snapshot,
        tasks: snapshot.tasks.filter((task) => task.id !== change.id),
      };
    case "habit_upserted": {
      const existing = snapshot.habits.find((habit) => habit.id === change.habit.id);
      const habit = existing ? { ...change.habit, log: existing.log } : change.habit;
      return { ...snapshot, habits: upsertById(snapshot.habits, habit) };
    }
    case "habit_deleted":
      return {
        ...snapshot,
        habits: snapshot.habits.filter((habit) => habit.id !== change.id),
      };
    case "habit_log_set":
      return {
        ...snapshot,
        habits: snapshot.habits.map((habit) =>
          habit.id === change.habitId
            ? { ...habit, log: { ...habit.log, [change.iso]: change.value } }
            : habit,
        ),
      };
    case "error":
      return snapshot;
  }
};

export const createSyncedStorage = (
  localStorage: JustDoStorage,
  remoteStorage: JustDoStorage,
): JustDoStorage => {
  const flush = () => flushQueuedMutations(localStorage, remoteStorage);

  const withFlush = async (operation: Promise<void>) => {
    await operation;
    await flush();
  };

  return {
    async load() {
      const local = await localStorage.load();
      const pending = await localStorage.listQueuedMutations?.();

      if (pending?.length) {
        void flush().catch(() => undefined);
        return local;
      }

      const remote = await remoteStorage.load();
      if (remote && localStorage.replaceSnapshot) {
        await localStorage.replaceSnapshot(remote);
      }
      return remote ?? local;
    },

    replaceSnapshot: localStorage.replaceSnapshot
      ? (snapshot) => localStorage.replaceSnapshot?.(snapshot) ?? Promise.resolve()
      : undefined,

    saveSettings: (settings) => localStorage.saveSettings(settings),
    saveView: (view) => localStorage.saveView(view),
    upsertTask: (task) => withFlush(localStorage.upsertTask(task)),
    deleteTask: (id) => withFlush(localStorage.deleteTask(id)),
    upsertHabit: (habit) => withFlush(localStorage.upsertHabit(habit)),
    setHabitLog: (habitId, iso, value) =>
      withFlush(localStorage.setHabitLog(habitId, iso, value)),

    listQueuedMutations: () => localStorage.listQueuedMutations?.() ?? Promise.resolve([]),
    removeQueuedMutation: (id) => localStorage.removeQueuedMutation?.(id) ?? Promise.resolve(),
    clearQueuedMutations: () => localStorage.clearQueuedMutations?.() ?? Promise.resolve(),

    subscribe(callback) {
      return remoteStorage.subscribe?.((change) => {
        void (async () => {
          if (change.type !== "error" && localStorage.replaceSnapshot) {
            const snapshot = await localStorage.load();
            if (snapshot) {
              await localStorage.replaceSnapshot(applyRemoteChangeToSnapshot(snapshot, change));
            }
          }
          callback(change);
        })().catch((error: unknown) => callback({ type: "error", error }));
      }) ?? (() => undefined);
    },
  };
};
