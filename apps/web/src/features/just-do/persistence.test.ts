import { describe, expect, it } from "vitest";
import type { AppState } from "@/types/domain";
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
        tab: "stats",
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
    expect(merged.view.tab).toBe("stats");
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

  it("round-trips a save", async () => {
    const initial = createInitialState();
    const persisted = toPersisted(initial);
    const storage = createMemoryStorage();
    await storage.save(persisted);
    expect(await storage.load()).toEqual(persisted);
  });
});
