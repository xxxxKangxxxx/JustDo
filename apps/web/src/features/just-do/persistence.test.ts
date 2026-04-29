import { describe, expect, it } from "vitest";
import type { AppState, Habit, Task } from "@/types/domain";
import {
  createMemoryStorage,
  mergePersisted,
  toPersisted,
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
