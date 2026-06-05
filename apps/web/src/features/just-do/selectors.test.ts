import { describe, expect, it } from "vitest";
import type { Goal, GoalPeriodType, GoalPromptDismissal, Habit, Task } from "@/types/domain";
import {
  availableReports,
  goalProgressForPeriod,
  habitActiveOn,
  habitStreak,
  homeBannerReport,
  isReportDismissed,
  justDoTaskSections,
  justDoTasksUntil,
  tasksInRange,
  tasksOnDate,
} from "./selectors";

const makeTask = (over: Partial<Task> = {}): Task => ({
  id: "t",
  title: "x",
  categoryId: "cat_me",
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

describe("goalProgressForPeriod", () => {
  const makeGoal = (over: Partial<Goal> = {}): Goal => ({
    id: "g",
    periodType: "monthly",
    periodKey: "2026-04",
    title: "운동",
    note: null,
    sortOrder: 0,
    locked: false,
    lockedAt: null,
    ...over,
  });

  it("derives progress only from tasks matching the goal title", () => {
    const goals = [makeGoal({ id: "g1", title: "운동" })];
    const tasks = [
      makeTask({ id: "m1", title: "아침 운동", isCompleted: true }),
      makeTask({ id: "m2", title: "저녁 운동", isCompleted: false }),
      makeTask({ id: "u1", title: "장보기", isCompleted: true }),
    ];
    const [progress] = goalProgressForPeriod(goals, tasks, "monthly", "2026-04");
    expect(progress.related.map((task) => task.id)).toEqual(["m1", "m2"]);
    expect(progress.completed.map((task) => task.id)).toEqual(["m1"]);
    expect(progress.progress).toBe(0.5);
  });

  it("shows no related items instead of the global rate when nothing matches", () => {
    const goals = [
      makeGoal({ id: "g1", title: "독서" }),
      makeGoal({ id: "g2", title: "명상" }),
    ];
    // None of these tasks match either goal; previously both goals fell back to
    // all period tasks and reported the same global completion rate.
    const tasks = [
      makeTask({ id: "u1", title: "장보기", isCompleted: true }),
      makeTask({ id: "u2", title: "청소", isCompleted: true }),
      makeTask({ id: "u3", title: "빨래", isCompleted: false }),
    ];
    const result = goalProgressForPeriod(goals, tasks, "monthly", "2026-04");
    for (const progress of result) {
      expect(progress.related).toEqual([]);
      expect(progress.completed).toEqual([]);
      expect(progress.progress).toBe(0);
    }
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

describe("justDoTasksUntil", () => {
  const tasks: Task[] = [
    makeTask({ id: "done", endDate: "2026-04-08", isCompleted: true }),
    makeTask({ id: "overdue", endDate: "2026-04-09", scheduledTime: "10:00" }),
    makeTask({ id: "today", endDate: "2026-04-10", scheduledTime: "09:00" }),
    makeTask({ id: "later", endDate: "2026-04-12" }),
    makeTask({ id: "future", endDate: "2026-04-13" }),
  ];

  it("returns incomplete tasks due by the selected date in due order", () => {
    expect(justDoTasksUntil(tasks, "2026-04-12").map((task) => task.id)).toEqual([
      "overdue",
      "today",
      "later",
    ]);
  });

  it("groups due tasks into overdue, today, and upcoming sections", () => {
    expect(justDoTaskSections(tasks, "2026-04-12", "2026-04-10")).toEqual([
      { title: "지난일", items: [tasks[1]] },
      { title: "오늘", items: [tasks[2]] },
      { title: "해야할일", items: [tasks[3]] },
    ]);
  });
});

describe("habitStreak", () => {
  const habit: Habit = {
    id: "h",
    title: "run",
    emoji: "🏃",
    category: "habit",
    startedAt: "2026-04-01",
    recurType: "daily",
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

  it("checks weekly habits only on selected weekdays", () => {
    const weekly: Habit = { ...habit, recurType: "weekly", recurDays: [1, 3, 5] };
    expect(habitActiveOn(weekly, "2026-04-06")).toBe(true);
    expect(habitActiveOn(weekly, "2026-04-07")).toBe(false);
  });

  it("skips inactive weekdays when counting a weekly streak", () => {
    const weekly: Habit = {
      ...habit,
      recurType: "weekly",
      recurDays: [1, 3, 5],
      log: {
        "2026-04-06": 1,
        "2026-04-08": 1,
        "2026-04-10": 1,
      },
    };

    expect(habitStreak(weekly, "2026-04-10")).toBe(3);
  });
});

describe("availableReports", () => {
  const goal = (periodType: GoalPeriodType, periodKey: string): Goal => ({
    id: `g-${periodType}-${periodKey}`,
    periodType,
    periodKey,
    title: `goal ${periodKey}`,
    note: null,
    sortOrder: 0,
    locked: false,
    lockedAt: null,
  });

  it("surfaces the previous month throughout the current month", () => {
    expect(availableReports("2026-06-15", [goal("monthly", "2026-05")])).toEqual([
      { periodType: "monthly", periodKey: "2026-05" },
    ]);
  });

  it("rolls the previous month across the year boundary in January", () => {
    expect(availableReports("2026-01-10", [goal("monthly", "2025-12")])).toContainEqual({
      periodType: "monthly",
      periodKey: "2025-12",
    });
  });

  it("does not surface the current (unfinished) month", () => {
    expect(availableReports("2026-06-15", [goal("monthly", "2026-06")])).toEqual([]);
  });

  it("surfaces the previous year only in January, with priority over monthly", () => {
    expect(availableReports("2026-06-15", [goal("yearly", "2025")])).toEqual([]);
    expect(
      availableReports("2026-01-10", [goal("monthly", "2025-12"), goal("yearly", "2025")]),
    ).toEqual([
      { periodType: "yearly", periodKey: "2025" },
      { periodType: "monthly", periodKey: "2025-12" },
    ]);
  });
});

describe("homeBannerReport / isReportDismissed", () => {
  const goal = (periodType: GoalPeriodType, periodKey: string): Goal => ({
    id: `g-${periodType}-${periodKey}`,
    periodType,
    periodKey,
    title: `goal ${periodKey}`,
    note: null,
    sortOrder: 0,
    locked: false,
    lockedAt: null,
  });
  const dismissal = (promptType: GoalPromptDismissal["promptType"], periodKey: string): GoalPromptDismissal => ({
    id: `d-${promptType}-${periodKey}`,
    promptType,
    periodKey,
    dismissedPermanentlyForPeriod: true,
    dismissedAt: "2026-06-01T00:00:00Z",
  });

  it("falls through to the monthly report when the top yearly one is dismissed", () => {
    const banner = homeBannerReport(
      "2026-01-10",
      [goal("monthly", "2025-12"), goal("yearly", "2025")],
      [dismissal("report_yearly", "2025")],
    );
    expect(banner).toEqual({ periodType: "monthly", periodKey: "2025-12" });
  });

  it("returns null when every available report is dismissed", () => {
    const banner = homeBannerReport(
      "2026-06-15",
      [goal("monthly", "2026-05")],
      [dismissal("report_monthly", "2026-05")],
    );
    expect(banner).toBeNull();
  });

  it("scopes dismissal to the matching period", () => {
    const report = { periodType: "monthly" as const, periodKey: "2026-05" };
    expect(isReportDismissed(report, [dismissal("report_monthly", "2026-04")])).toBe(false);
    expect(isReportDismissed(report, [dismissal("report_monthly", "2026-05")])).toBe(true);
  });
});
