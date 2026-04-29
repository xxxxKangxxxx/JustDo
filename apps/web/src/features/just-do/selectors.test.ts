import { describe, expect, it } from "vitest";
import type { Habit, Task } from "@/types/domain";
import { habitsOnDate, habitStreak, tasksInRange, tasksOnDate } from "./selectors";

const makeTask = (over: Partial<Task> = {}): Task => ({
  id: "t",
  title: "x",
  category: "me",
  startDate: "2026-04-10",
  endDate: "2026-04-10",
  isCompleted: false,
  scheduledTime: null,
  tags: [],
  ...over,
});

describe("tasksOnDate", () => {
  const tasks: Task[] = [
    makeTask({ id: "a", startDate: "2026-04-08", endDate: "2026-04-12" }),
    makeTask({ id: "b", startDate: "2026-04-10", endDate: "2026-04-10" }),
    makeTask({ id: "c", startDate: "2026-04-11", endDate: "2026-04-15" }),
  ];

  it("includes tasks whose range covers the date", () => {
    const ids = tasksOnDate(tasks, "2026-04-10").map((task) => task.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("includes range edges", () => {
    expect(tasksOnDate(tasks, "2026-04-08").map((task) => task.id)).toEqual(["a"]);
    expect(tasksOnDate(tasks, "2026-04-15").map((task) => task.id)).toEqual(["c"]);
  });

  it("returns empty for dates outside any range", () => {
    expect(tasksOnDate(tasks, "2026-05-01")).toEqual([]);
  });
});

describe("tasksInRange", () => {
  const tasks: Task[] = [
    makeTask({ id: "before", startDate: "2026-03-01", endDate: "2026-03-31" }),
    makeTask({ id: "overlapStart", startDate: "2026-03-25", endDate: "2026-04-05" }),
    makeTask({ id: "inside", startDate: "2026-04-10", endDate: "2026-04-12" }),
    makeTask({ id: "overlapEnd", startDate: "2026-04-25", endDate: "2026-05-03" }),
    makeTask({ id: "after", startDate: "2026-05-10", endDate: "2026-05-15" }),
  ];

  it("returns only tasks whose range intersects the window", () => {
    const ids = tasksInRange(tasks, "2026-04-01", "2026-04-30").map((task) => task.id);
    expect(ids).toEqual(["overlapStart", "inside", "overlapEnd"]);
  });

  it("includes tasks touching the window edges", () => {
    const tasksAt: Task[] = [
      makeTask({ id: "endOnly", startDate: "2026-03-15", endDate: "2026-04-01" }),
      makeTask({ id: "startOnly", startDate: "2026-04-30", endDate: "2026-05-10" }),
    ];
    const ids = tasksInRange(tasksAt, "2026-04-01", "2026-04-30").map((task) => task.id);
    expect(ids).toEqual(["endOnly", "startOnly"]);
  });
});

describe("habitsOnDate", () => {
  const habits: Habit[] = [
    {
      id: "before",
      title: "water",
      emoji: "💧",
      category: "habit",
      startedAt: "2026-04-01",
      log: {},
    },
    {
      id: "today",
      title: "read",
      emoji: "📖",
      category: "habit",
      startedAt: "2026-04-10",
      log: {},
    },
    {
      id: "future",
      title: "run",
      emoji: "🏃",
      category: "habit",
      startedAt: "2026-04-11",
      log: {},
    },
  ];

  it("includes daily habits from their start date onward", () => {
    expect(habitsOnDate(habits, "2026-04-10").map((habit) => habit.id)).toEqual(["before", "today"]);
  });

  it("does not require a completion log for the date", () => {
    expect(habitsOnDate(habits, "2026-04-02").map((habit) => habit.id)).toEqual(["before"]);
  });
});

describe("habitStreak", () => {
  const habit: Habit = {
    id: "h",
    title: "run",
    emoji: "🏃",
    category: "habit",
    startedAt: "2026-04-01",
    log: {
      "2026-04-05": 1,
      "2026-04-06": 1,
      "2026-04-07": 1,
      "2026-04-09": 1,
    },
  };

  it("counts consecutive days backwards from today", () => {
    expect(habitStreak(habit, "2026-04-07")).toBe(3);
  });

  it("returns 0 if today is not logged", () => {
    expect(habitStreak(habit, "2026-04-08")).toBe(0);
  });

  it("breaks at the first missing day", () => {
    expect(habitStreak(habit, "2026-04-09")).toBe(1);
  });
});
