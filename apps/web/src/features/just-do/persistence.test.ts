import { describe, expect, it } from "vitest";
import type { AppState, Habit, Task } from "@/types/domain";
import {
  createIndexedDBStorage,
  createMemoryStorage,
  createMemoryMutationQueue,
  createSnapshotStorage,
  createSyncedStorage,
  flushQueuedMutations,
  mergePersisted,
  toPersisted,
  type JustDoStorage,
  type Persisted,
} from "./persistence";
import { createInitialState } from "./sample-data";

const stripVolatile = (state: AppState) => ({
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

const sampleTask = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Test",
  category: "me",
  startDate: "2026-04-29",
  endDate: "2026-04-29",
  isCompleted: false,
  scheduledTime: null,
  tags: [],
  ...over,
});

const sampleHabit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  title: "Run",
  emoji: "🏃",
  category: "habit",
  startedAt: "2026-04-01",
  log: {},
  ...over,
});

describe("toPersisted", () => {
  it("drops sheet and detailTaskId from view", () => {
    const state: AppState = {
      ...createInitialState(),
      view: {
        ...createInitialState().view,
        sheet: { kind: "add" },
        detailTaskId: "t1",
      },
    };
    const persisted = toPersisted(state);
    expect(persisted.view).not.toHaveProperty("sheet");
    expect(persisted.view).not.toHaveProperty("detailTaskId");
  });
});

describe("mergePersisted", () => {
  it("restores tasks/habits/settings/view but resets sheet and detail", () => {
    const initial = createInitialState();
    const saved: Persisted = {
      ...stripVolatile(initial),
      tasks: [],
      habits: [],
      settings: { ...initial.settings, weekStart: 1 },
      view: {
        tab: "habit",
        year: 2027,
        month: 6,
        selectedDate: "2027-06-15",
        dark: true,
      },
    };
    const merged = mergePersisted(initial, saved);
    expect(merged.tasks).toEqual([]);
    expect(merged.habits).toEqual([]);
    expect(merged.settings.weekStart).toBe(1);
    expect(merged.view.year).toBe(2027);
    expect(merged.view.tab).toBe("habit");
    expect(merged.view.dark).toBe(true);
    expect(merged.view.sheet).toBeNull();
    expect(merged.view.detailTaskId).toBeNull();
  });

  it("falls back to initial settings keys when saved omits them", () => {
    const initial = createInitialState();
    const saved: Persisted = {
      ...stripVolatile(initial),
      // Force a partial settings shape — older clients might omit newly added keys.
      settings: { plan: "pro" } as AppState["settings"],
    };
    const merged = mergePersisted(initial, saved);
    expect(merged.settings.plan).toBe("pro");
    expect(merged.settings.notify).toBe(initial.settings.notify);
    expect(merged.settings.weekStart).toBe(initial.settings.weekStart);
  });
});

describe("createMemoryStorage", () => {
  it("returns null when nothing has been saved yet", async () => {
    const storage = createMemoryStorage();
    expect(await storage.load()).toBeNull();
  });

  it("seeds defaults on the first mutation so later loads return a snapshot", async () => {
    const storage = createMemoryStorage();
    await storage.upsertTask(sampleTask());
    const snap = await storage.load();
    expect(snap?.tasks).toHaveLength(1);
    expect(snap?.tasks[0].id).toBe("t1");
  });

  it("upsertTask replaces an existing task by id", async () => {
    const storage = createMemoryStorage();
    await storage.upsertTask(sampleTask({ title: "v1" }));
    await storage.upsertTask(sampleTask({ title: "v2" }));
    const snap = await storage.load();
    expect(snap?.tasks).toHaveLength(1);
    expect(snap?.tasks[0].title).toBe("v2");
  });

  it("deleteTask removes a task by id", async () => {
    const storage = createMemoryStorage();
    await storage.upsertTask(sampleTask({ id: "a" }));
    await storage.upsertTask(sampleTask({ id: "b" }));
    await storage.deleteTask("a");
    const snap = await storage.load();
    expect(snap?.tasks.map((task) => task.id)).toEqual(["b"]);
  });

  it("upsertHabit replaces an existing habit by id", async () => {
    const storage = createMemoryStorage();
    await storage.upsertHabit(sampleHabit({ title: "Run" }));
    await storage.upsertHabit(sampleHabit({ title: "Run 30" }));
    const snap = await storage.load();
    expect(snap?.habits).toHaveLength(1);
    expect(snap?.habits[0].title).toBe("Run 30");
  });

  it("setHabitLog writes a single date entry without touching others", async () => {
    const storage = createMemoryStorage();
    await storage.upsertHabit(sampleHabit({ log: { "2026-04-28": 1 } }));
    await storage.setHabitLog("h1", "2026-04-29", 1);
    const snap = await storage.load();
    expect(snap?.habits[0].log).toEqual({ "2026-04-28": 1, "2026-04-29": 1 });
  });

  it("saveSettings and saveView persist atomically", async () => {
    const storage = createMemoryStorage();
    await storage.saveSettings({ notify: false, notifyTime: "08:00", weekStart: 1, plan: "pro" });
    await storage.saveView({
      tab: "settings",
      year: 2027,
      month: 7,
      selectedDate: "2027-07-15",
      dark: true,
    });
    const snap = await storage.load();
    expect(snap?.settings.weekStart).toBe(1);
    expect(snap?.view.tab).toBe("settings");
  });

  it("normalizes the removed stats tab to settings when restoring old snapshots", () => {
    const initial = createInitialState();
    const saved: Persisted = {
      ...stripVolatile(initial),
      view: {
        tab: "stats" as Persisted["view"]["tab"],
        year: 2027,
        month: 6,
        selectedDate: "2027-06-15",
        dark: false,
      },
    };
    expect(mergePersisted(initial, saved).view.tab).toBe("settings");
  });
});

describe("createSnapshotStorage", () => {
  it("persists entity mutations through an async snapshot store", async () => {
    let snapshot: Persisted | null = null;
    const storage = createSnapshotStorage({
      async read() {
        return snapshot;
      },
      async write(next) {
        snapshot = next;
      },
    });

    await storage.upsertTask(sampleTask({ id: "a", title: "A" }));
    await storage.upsertHabit(sampleHabit({ id: "h", log: { "2026-04-28": 1 } }));
    await storage.setHabitLog("h", "2026-04-29", 1);
    await storage.saveView({
      tab: "habit",
      year: 2026,
      month: 4,
      selectedDate: "2026-04-29",
      dark: true,
    });

    const loaded = await storage.load();
    expect(loaded?.tasks.map((task) => task.id)).toEqual(["a"]);
    expect(loaded?.habits[0].log).toEqual({ "2026-04-28": 1, "2026-04-29": 1 });
    expect(loaded?.view.tab).toBe("habit");
    expect(loaded?.view.dark).toBe(true);
  });

  it("records queued mutations with updatedAt timestamps", async () => {
    let snapshot: Persisted | null = null;
    let id = 0;
    const queue = createMemoryMutationQueue();
    const storage = createSnapshotStorage(
      {
        async read() {
          return snapshot;
        },
        async write(next) {
          snapshot = next;
        },
      },
      {
        queue,
        now: () => `2026-04-29T00:00:0${id}.000Z`,
        createId: () => `m${++id}`,
      },
    );

    await storage.upsertTask(sampleTask({ id: "t2" }));
    await storage.setHabitLog("h1", "2026-04-29", 1);
    const mutations = await storage.listQueuedMutations?.();

    expect(mutations).toEqual([
      {
        id: "m1",
        updatedAt: "2026-04-29T00:00:01.000Z",
        mutation: { type: "task_upsert", task: sampleTask({ id: "t2" }) },
      },
      {
        id: "m2",
        updatedAt: "2026-04-29T00:00:02.000Z",
        mutation: { type: "habit_log_set", habitId: "h1", iso: "2026-04-29", value: 1 },
      },
    ]);

    await storage.removeQueuedMutation?.("m1");
    expect((await storage.listQueuedMutations?.())?.map((mutation) => mutation.id)).toEqual(["m2"]);
    await storage.clearQueuedMutations?.();
    expect(await storage.listQueuedMutations?.()).toEqual([]);
  });
});

describe("createIndexedDBStorage", () => {
  it("falls back when IndexedDB is unavailable", async () => {
    const fallback = createMemoryStorage();
    const storage = createIndexedDBStorage({
      indexedDBFactory: null,
      fallback,
    });

    await storage.upsertTask(sampleTask({ id: "fallback" }));
    expect((await fallback.load())?.tasks.map((task) => task.id)).toEqual(["fallback"]);
  });
});

describe("flushQueuedMutations", () => {
  it("applies queued mutations to remote storage and removes flushed entries", async () => {
    let snapshot: Persisted | null = null;
    const queue = createMemoryMutationQueue();
    const local = createSnapshotStorage(
      {
        async read() {
          return snapshot;
        },
        async write(next) {
          snapshot = next;
        },
      },
      {
        queue,
        now: () => "2026-04-29T00:00:00.000Z",
        createId: () => crypto.randomUUID(),
      },
    );
    const remote = createMemoryStorage();

    await local.upsertTask(sampleTask({ id: "queued-task" }));
    await local.upsertHabit(sampleHabit({ id: "queued-habit" }));
    await local.setHabitLog("queued-habit", "2026-04-29", 1);
    expect(await local.listQueuedMutations?.()).toHaveLength(3);

    await flushQueuedMutations(local, remote);

    expect(await local.listQueuedMutations?.()).toEqual([]);
    const remoteSnapshot = await remote.load();
    expect(remoteSnapshot?.tasks.map((task) => task.id)).toEqual(["queued-task"]);
    expect(remoteSnapshot?.habits[0].log).toEqual({ "2026-04-29": 1 });
  });
});

describe("createSyncedStorage", () => {
  it("writes locally, flushes to remote, and clears the queue", async () => {
    let snapshot: Persisted | null = null;
    const queue = createMemoryMutationQueue();
    const local = createSnapshotStorage(
      {
        async read() {
          return snapshot;
        },
        async write(next) {
          snapshot = next;
        },
      },
      { queue },
    );
    const remote = createMemoryStorage();
    const synced = createSyncedStorage(local, remote);

    await synced.upsertTask(sampleTask({ id: "synced-task" }));

    expect((await local.load())?.tasks.map((task) => task.id)).toEqual(["synced-task"]);
    expect((await remote.load())?.tasks.map((task) => task.id)).toEqual(["synced-task"]);
    expect(await synced.listQueuedMutations?.()).toEqual([]);
  });

  it("keeps queued mutations locally when remote flush fails", async () => {
    let snapshot: Persisted | null = null;
    const queue = createMemoryMutationQueue();
    const local = createSnapshotStorage(
      {
        async read() {
          return snapshot;
        },
        async write(next) {
          snapshot = next;
        },
      },
      {
        queue,
        now: () => "2026-04-29T00:00:00.000Z",
        createId: () => "pending",
      },
    );
    const remote: JustDoStorage = {
      async load() {
        return null;
      },
      async saveSettings() {},
      async saveView() {},
      async upsertTask() {
        throw new Error("offline");
      },
      async deleteTask() {},
      async upsertHabit() {},
      async setHabitLog() {},
    };
    const synced = createSyncedStorage(local, remote);

    await expect(synced.upsertTask(sampleTask({ id: "offline-task" }))).rejects.toThrow("offline");
    expect((await local.load())?.tasks.map((task) => task.id)).toEqual(["offline-task"]);
    expect((await synced.listQueuedMutations?.())?.map((mutation) => mutation.id)).toEqual(["pending"]);
  });

  it("drains accumulated offline mutations after the remote recovers", async () => {
    let snapshot: Persisted | null = null;
    let nextId = 0;
    const queue = createMemoryMutationQueue();
    const local = createSnapshotStorage(
      {
        async read() {
          return snapshot;
        },
        async write(next) {
          snapshot = next;
        },
      },
      {
        queue,
        now: () => `2026-04-29T00:00:0${nextId}.000Z`,
        createId: () => `m${++nextId}`,
      },
    );

    let remoteOnline = false;
    const remoteBackend = createMemoryStorage();
    const remote: JustDoStorage = {
      async load() {
        if (!remoteOnline) throw new Error("offline");
        return remoteBackend.load();
      },
      async saveSettings(settings) {
        if (!remoteOnline) throw new Error("offline");
        await remoteBackend.saveSettings(settings);
      },
      async saveView(view) {
        if (!remoteOnline) throw new Error("offline");
        await remoteBackend.saveView(view);
      },
      async upsertTask(task) {
        if (!remoteOnline) throw new Error("offline");
        await remoteBackend.upsertTask(task);
      },
      async deleteTask(id) {
        if (!remoteOnline) throw new Error("offline");
        await remoteBackend.deleteTask(id);
      },
      async upsertHabit(habit) {
        if (!remoteOnline) throw new Error("offline");
        await remoteBackend.upsertHabit(habit);
      },
      async setHabitLog(habitId, iso, value) {
        if (!remoteOnline) throw new Error("offline");
        await remoteBackend.setHabitLog(habitId, iso, value);
      },
    };
    const synced = createSyncedStorage(local, remote);

    // Offline: writes succeed locally but the auto-flush rejects.
    await expect(synced.upsertTask(sampleTask({ id: "offline-1", title: "first" }))).rejects.toThrow("offline");
    await expect(synced.upsertHabit(sampleHabit({ id: "offline-habit" }))).rejects.toThrow("offline");
    await expect(synced.setHabitLog("offline-habit", "2026-04-29", 1)).rejects.toThrow("offline");

    expect(await synced.listQueuedMutations?.()).toHaveLength(3);
    expect((await local.load())?.tasks.map((task) => task.id)).toEqual(["offline-1"]);
    expect(await remoteBackend.load()).toBeNull();

    // Recover: load() should detect the queue and trigger an async flush.
    remoteOnline = true;
    await synced.load();
    await flushQueuedMutations(local, remote);

    expect(await synced.listQueuedMutations?.()).toEqual([]);
    const remoteSnapshot = await remoteBackend.load();
    expect(remoteSnapshot?.tasks.map((task) => task.id)).toEqual(["offline-1"]);
    expect(remoteSnapshot?.habits[0].log).toEqual({ "2026-04-29": 1 });
  });

  it("flushes queued mutations in updatedAt order", async () => {
    let snapshot: Persisted | null = null;
    let counter = 0;
    const queue = createMemoryMutationQueue();
    const local = createSnapshotStorage(
      {
        async read() {
          return snapshot;
        },
        async write(next) {
          snapshot = next;
        },
      },
      {
        queue,
        now: () => `2026-04-29T00:00:0${counter}.000Z`,
        createId: () => `m${++counter}`,
      },
    );

    const calls: string[] = [];
    const remote: JustDoStorage = {
      async load() {
        return null;
      },
      async saveSettings() {},
      async saveView() {},
      async upsertTask(task) {
        calls.push(`upsert:${task.id}`);
      },
      async deleteTask(id) {
        calls.push(`delete:${id}`);
      },
      async upsertHabit() {},
      async setHabitLog() {},
    };

    await local.upsertTask(sampleTask({ id: "a" }));
    await local.upsertTask(sampleTask({ id: "b" }));
    await local.deleteTask("a");

    await flushQueuedMutations(local, remote);

    expect(calls).toEqual(["upsert:a", "upsert:b", "delete:a"]);
    expect(await local.listQueuedMutations?.()).toEqual([]);
  });
});
