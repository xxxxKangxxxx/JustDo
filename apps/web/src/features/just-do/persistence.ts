import type { AppState, Category, Habit, Settings, Task } from "@/types/domain";
import { defaultCategories } from "./tokens";

export type PersistedView = Pick<
  AppState["view"],
  "tab" | "year" | "month" | "selectedDate" | "dark"
>;

export type Persisted = {
  view: PersistedView;
  categories: AppState["categories"];
  tasks: AppState["tasks"];
  habits: AppState["habits"];
  settings: AppState["settings"];
};

export type LocalMutation =
  | { type: "category_upsert"; category: Category }
  | { type: "category_delete"; id: string }
  | { type: "preferences_set"; key: "week_start"; value: Settings["weekStart"] }
  | { type: "preferences_set"; key: "just_do_mode"; value: 0 | 1 }
  | { type: "task_upsert"; task: Task }
  | { type: "task_delete"; id: string }
  | { type: "habit_upsert"; habit: Habit }
  | { type: "habit_delete"; id: string }
  | { type: "habit_log_set"; habitId: string; iso: string; value: 0 | 1 };

export type QueuedMutation = {
  id: string;
  updatedAt: string;
  mutation: LocalMutation;
};

export type RemoteChange =
  | { type: "category_upserted"; category: Category }
  | { type: "category_deleted"; id: string }
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

  upsertCategory(category: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  upsertTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;

  upsertHabit(habit: Habit): Promise<void>;
  deleteHabit(id: string): Promise<void>;
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
  categories: state.categories,
  tasks: state.tasks,
  habits: state.habits,
  settings: state.settings,
});

const normalizeTab = (
  tab: PersistedView["tab"] | "stats" | undefined,
): AppState["view"]["tab"] => {
  if (tab === "stats") return "settings";
  if (tab === "home" || tab === "habit" || tab === "settings") return tab;
  return "home";
};

type LegacyTask = Omit<Task, "categoryId"> & {
  category?: "me" | "ext";
  categoryId?: string | null;
};
type LegacyPersisted = Omit<Partial<Persisted>, "tasks"> & { tasks?: LegacyTask[] };
type LegacyHabit = Omit<Habit, "recurType" | "recurDays"> & {
  recurType?: Habit["recurType"];
  recurDays?: number[];
  reminderTime?: string | null;
};

const categoryIdByLegacyName: Record<"me" | "ext", string> = {
  me: defaultCategories[0].id,
  ext: defaultCategories[1].id,
};

const normalizeCategories = (saved: LegacyPersisted) =>
  saved.categories?.length ? saved.categories : defaultCategories;

const normalizeTasks = (saved: LegacyPersisted): Task[] =>
  (saved.tasks ?? []).map((task) => {
    const legacyCategory = task.category;
    const categoryId =
      task.categoryId ??
      (legacyCategory === "me" || legacyCategory === "ext"
        ? categoryIdByLegacyName[legacyCategory]
        : defaultCategories[0].id);
    const rest = { ...task };
    delete rest.category;
    return { ...rest, categoryId };
  });

const normalizeHabits = (habits: Habit[] | undefined): Habit[] =>
  ((habits ?? []) as LegacyHabit[]).map((habit) => ({
    ...habit,
    recurType: habit.recurType === "weekly" ? "weekly" : "daily",
    recurDays:
      habit.recurType === "weekly" && habit.recurDays?.length
        ? habit.recurDays
        : undefined,
    reminderTime: habit.reminderTime ?? null,
  }));

export const mergePersisted = (initial: AppState, saved: Persisted): AppState => {
  const legacy = saved as LegacyPersisted;
  return {
    ...initial,
    categories: normalizeCategories(legacy),
    tasks: normalizeTasks(legacy),
    habits: normalizeHabits(saved.habits),
    settings: { ...initial.settings, ...saved.settings },
    view: {
      ...initial.view,
      ...saved.view,
      tab: normalizeTab(saved.view.tab as PersistedView["tab"] | "stats"),
      sheet: null,
      detailTaskId: null,
      detailHabitId: null,
    },
  };
};

const normalizePersistedSnapshot = (saved: Persisted): Persisted => {
  const legacy = saved as LegacyPersisted;
  const savedSettings = saved.settings as Partial<Settings> | undefined;
  return {
    ...saved,
    categories: normalizeCategories(legacy),
    tasks: normalizeTasks(legacy),
    habits: normalizeHabits(saved.habits),
    settings: {
      notify: true,
      notifyTime: "09:00",
      weekStart: 0,
      plan: "free",
      justDoMode: false,
      ...savedSettings,
    },
    view: {
      tab: normalizeTab(saved.view?.tab as PersistedView["tab"] | "stats"),
      year: saved.view?.year ?? 1970,
      month: saved.view?.month ?? 1,
      selectedDate: saved.view?.selectedDate ?? "1970-01-01",
      dark: saved.view?.dark ?? false,
    },
  };
};

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
      categories: defaultCategories,
      tasks: [],
      habits: [],
      settings: {
        notify: true,
        notifyTime: "09:00",
        weekStart: 0,
        plan: "free",
        justDoMode: false,
      },
    };
  }
  ref.current = normalizePersistedSnapshot(ref.current);
  return ref.current;
};

const applyMutation = (
  ref: MemoryStateRef,
  mutate: (snapshot: Persisted) => Persisted,
) => {
  ref.current = mutate(ensureSnapshot(ref));
};

const upsertById = <T extends { id: string }>(list: T[] | undefined, item: T): T[] => {
  const current = list ?? [];
  const index = current.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...current, item];
  const next = current.slice();
  next[index] = item;
  return next;
};

export const createMemoryStorage = (initial: Persisted | null = null): JustDoStorage => {
  const ref: MemoryStateRef = { current: initial };

  return {
    async load() {
      return ref.current ? normalizePersistedSnapshot(ref.current) : null;
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

    async upsertCategory(category) {
      applyMutation(ref, (snap) => ({
        ...snap,
        categories: upsertById(snap.categories, category),
      }));
    },

    async deleteCategory(id) {
      applyMutation(ref, (snap) => ({
        ...snap,
        categories: snap.categories.filter((category) => category.id !== id),
        tasks: snap.tasks.map((task) =>
          task.categoryId === id ? { ...task, categoryId: null } : task,
        ),
      }));
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

    async deleteHabit(id) {
      applyMutation(ref, (snap) => ({
        ...snap,
        habits: snap.habits.filter((habit) => habit.id !== id),
      }));
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
        const parsed = normalizePersistedSnapshot(JSON.parse(raw) as Persisted);
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
    upsertCategory: (category) =>
      mutate((snap) => ({ ...snap, categories: upsertById(snap.categories, category) })),
    deleteCategory: (id) =>
      mutate((snap) => ({
        ...snap,
        categories: snap.categories.filter((category) => category.id !== id),
        tasks: snap.tasks.map((task) =>
          task.categoryId === id ? { ...task, categoryId: null } : task,
        ),
      })),
    upsertTask: (task) =>
      mutate((snap) => ({ ...snap, tasks: upsertById(snap.tasks, task) })),
    deleteTask: (id) =>
      mutate((snap) => ({ ...snap, tasks: snap.tasks.filter((task) => task.id !== id) })),
    upsertHabit: (habit) =>
      mutate((snap) => ({ ...snap, habits: upsertById(snap.habits, habit) })),
    deleteHabit: (id) =>
      mutate((snap) => ({ ...snap, habits: snap.habits.filter((habit) => habit.id !== id) })),
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
    if (ref.current) return normalizePersistedSnapshot(ref.current);
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
      const saved = await store.read();
      ref.current = saved ? normalizePersistedSnapshot(saved) : null;
      return ref.current;
    },

    async replaceSnapshot(snapshot) {
      ref.current = snapshot;
      await store.write(snapshot);
    },

    saveSettings: async (settings) => {
      const previous = await loadSnapshot();
      await mutate((snap) => ({ ...snap, settings }));
      if (previous.settings.weekStart !== settings.weekStart) {
        await enqueue({ type: "preferences_set", key: "week_start", value: settings.weekStart });
      }
      if (previous.settings.justDoMode !== settings.justDoMode) {
        await enqueue({ type: "preferences_set", key: "just_do_mode", value: settings.justDoMode ? 1 : 0 });
      }
    },
    saveView: (view) => mutate((snap) => ({ ...snap, view })),
    upsertCategory: async (category) => {
      await mutate((snap) => ({ ...snap, categories: upsertById(snap.categories, category) }));
      await enqueue({ type: "category_upsert", category });
    },
    deleteCategory: async (id) => {
      await mutate((snap) => ({
        ...snap,
        categories: snap.categories.filter((category) => category.id !== id),
        tasks: snap.tasks.map((task) =>
          task.categoryId === id ? { ...task, categoryId: null } : task,
        ),
      }));
      await enqueue({ type: "category_delete", id });
    },
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
    deleteHabit: async (id) => {
      await mutate((snap) => ({
        ...snap,
        habits: snap.habits.filter((habit) => habit.id !== id),
      }));
      await enqueue({ type: "habit_delete", id });
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
    case "preferences_set":
      {
        const current = await storage.load();
        const base = current?.settings ?? {
          notify: true,
          notifyTime: "09:00",
          plan: "free" as const,
          weekStart: 0 as const,
          justDoMode: false,
        };
        await storage.saveSettings({
          ...base,
          ...(queued.mutation.key === "week_start"
            ? { weekStart: queued.mutation.value as Settings["weekStart"] }
            : { justDoMode: queued.mutation.value === 1 }),
        });
      }
      return;
    case "category_upsert":
      await storage.upsertCategory(queued.mutation.category);
      return;
    case "category_delete":
      await storage.deleteCategory(queued.mutation.id);
      return;
    case "task_upsert":
      await storage.upsertTask(queued.mutation.task);
      return;
    case "task_delete":
      await storage.deleteTask(queued.mutation.id);
      return;
    case "habit_upsert":
      await storage.upsertHabit(queued.mutation.habit);
      return;
    case "habit_delete":
      await storage.deleteHabit(queued.mutation.id);
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
    case "category_upserted":
      return { ...snapshot, categories: upsertById(snapshot.categories, change.category) };
    case "category_deleted":
      return {
        ...snapshot,
        categories: snapshot.categories.filter((category) => category.id !== change.id),
        tasks: snapshot.tasks.map((task) =>
          task.categoryId === change.id ? { ...task, categoryId: null } : task,
        ),
      };
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
      if (
        remote &&
        local &&
        remote.settings.weekStart === 0 &&
        local.settings.weekStart !== 0
      ) {
        await remoteStorage.saveSettings(local.settings);
        remote.settings = { ...remote.settings, weekStart: local.settings.weekStart };
      }
      if (
        remote &&
        local &&
        !remote.settings.justDoMode &&
        local.settings.justDoMode
      ) {
        await remoteStorage.saveSettings(local.settings);
        remote.settings = { ...remote.settings, justDoMode: local.settings.justDoMode };
      }
      if (remote && localStorage.replaceSnapshot) {
        await localStorage.replaceSnapshot(remote);
      }
      return remote ?? local;
    },

    replaceSnapshot: localStorage.replaceSnapshot
      ? (snapshot) => localStorage.replaceSnapshot?.(snapshot) ?? Promise.resolve()
      : undefined,

    saveSettings: (settings) => withFlush(localStorage.saveSettings(settings)),
    saveView: (view) => localStorage.saveView(view),
    upsertCategory: (category) => withFlush(localStorage.upsertCategory(category)),
    deleteCategory: (id) => withFlush(localStorage.deleteCategory(id)),
    upsertTask: (task) => withFlush(localStorage.upsertTask(task)),
    deleteTask: (id) => withFlush(localStorage.deleteTask(id)),
    upsertHabit: (habit) => withFlush(localStorage.upsertHabit(habit)),
    deleteHabit: (id) => withFlush(localStorage.deleteHabit(id)),
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
