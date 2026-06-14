import { describe, expect, it } from "vitest";
import type { Category, Goal, GoalPeriodType, GoalPromptDismissal, Habit, Task } from "@/types/domain";
import {
  availableReports,
  goalProgressForPeriod,
  habitActiveOn,
  habitStreak,
  homeBannerReport,
  isReportDismissed,
  justDoTaskSections,
  justDoTasksUntil,
  periodBestStreak,
  periodCategoryCompletion,
  periodHabitAchievement,
  periodMostSlipped,
  periodTaskCompletion,
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
  const makeHabit = (over: Partial<Habit> = {}): Habit => ({
    id: "h",
    title: "운동",
    emoji: "🏃",
    category: "habit",
    startedAt: "2026-04-01",
    recurType: "daily",
    log: {},
    ...over,
  });
  const END = "2026-05-01"; // a "today" past the period so habit days are not capped

  it("derives progress only from tasks matching the goal title", () => {
    const goals = [makeGoal({ id: "g1", title: "운동" })];
    const tasks = [
      makeTask({ id: "m1", title: "아침 운동", isCompleted: true }),
      makeTask({ id: "m2", title: "저녁 운동", isCompleted: false }),
      makeTask({ id: "u1", title: "장보기", isCompleted: true }),
    ];
    const [progress] = goalProgressForPeriod(goals, tasks, [], "monthly", "2026-04", END);
    expect(progress.relatedTasks.map((task) => task.id)).toEqual(["m1", "m2"]);
    expect(progress.completedTasks.map((task) => task.id)).toEqual(["m1"]);
    expect(progress.relatedCount).toBe(2);
    expect(progress.completedCount).toBe(1);
    expect(progress.progress).toBe(0.5);
  });

  it("matches inflected tokens and exercise-cluster synonyms but not substring false positives", () => {
    const goals = [makeGoal({ id: "g1", title: "운동하기" })];
    const tasks = [
      makeTask({ id: "particle", title: "운동을 했다", isCompleted: true }),
      makeTask({ id: "synonym", title: "헬스장 다녀옴", isCompleted: true }),
      makeTask({ id: "walk", title: "산책 30분", isCompleted: true }),
      makeTask({ id: "falsePositive", title: "부동산 계약", isCompleted: true }),
    ];
    const [progress] = goalProgressForPeriod(goals, tasks, [], "monthly", "2026-04", END);
    expect(progress.relatedTasks.map((task) => task.id).sort()).toEqual(["particle", "synonym", "walk"]);
  });

  it("matches a task via a keyword in the goal note, not just the title", () => {
    // Title "체력 키우기" shares no token with "헬스장"; the note bridges them.
    const goals = [makeGoal({ id: "g1", title: "체력 키우기", note: "주 3회 운동 루틴 실행" })];
    const tasks = [
      makeTask({ id: "gym", title: "헬스장 다녀옴", isCompleted: true }),
      makeTask({ id: "unrelated", title: "주간 회의 3회", isCompleted: true }),
    ];
    const [progress] = goalProgressForPeriod(goals, tasks, [], "monthly", "2026-04", END);
    // "주 3회" in the note must not match the "회의 3회" task (counter words are stopwords).
    expect(progress.relatedTasks.map((task) => task.id)).toEqual(["gym"]);
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
    const result = goalProgressForPeriod(goals, tasks, [], "monthly", "2026-04", END);
    for (const progress of result) {
      expect(progress.relatedCount).toBe(0);
      expect(progress.completedCount).toBe(0);
      expect(progress.progress).toBe(0);
    }
  });

  it("scores a matched habit by its period log-completion ratio", () => {
    const goals = [makeGoal({ id: "g1", title: "명상" })];
    // 2 of 4 elapsed April days logged → habit contributes 0.5.
    const habit = makeHabit({
      id: "h1",
      title: "매일 명상",
      log: { "2026-04-01": 1, "2026-04-02": 1, "2026-04-03": 0, "2026-04-04": 0 },
    });
    const [progress] = goalProgressForPeriod(goals, [], [habit], "monthly", "2026-04", "2026-04-04");
    expect(progress.relatedHabits.map((h) => h.id)).toEqual(["h1"]);
    expect(progress.relatedCount).toBe(1);
    expect(progress.completedCount).toBe(0); // ratio < 1
    expect(progress.progress).toBe(0.5);
  });

  it("uses the numeric target as the denominator when set", () => {
    const goals = [makeGoal({ id: "g1", title: "책", target: 3 })];
    const tasks = [
      makeTask({ id: "b1", title: "책 한 권", isCompleted: true }),
      makeTask({ id: "b2", title: "독서 완료", isCompleted: true }),
    ];
    const [progress] = goalProgressForPeriod(goals, tasks, [], "monthly", "2026-04", END);
    // 2 completed matched items toward a target of 3 → 2/3.
    expect(progress.target).toBe(3);
    expect(progress.completedCount).toBe(2);
    expect(progress.progress).toBeCloseTo(2 / 3);
  });

  it("caps target progress at 100% when overachieved", () => {
    const goals = [makeGoal({ id: "g1", title: "책", target: 2 })];
    const tasks = [
      makeTask({ id: "b1", title: "책 1", isCompleted: true }),
      makeTask({ id: "b2", title: "책 2", isCompleted: true }),
      makeTask({ id: "b3", title: "책 3", isCompleted: true }),
    ];
    const [progress] = goalProgressForPeriod(goals, tasks, [], "monthly", "2026-04", END);
    expect(progress.progress).toBe(1);
  });

  it("blends task and habit scores into one progress value", () => {
    const goals = [makeGoal({ id: "g1", title: "운동" })];
    const tasks = [makeTask({ id: "t1", title: "운동 가기", isCompleted: true })];
    const habit = makeHabit({
      id: "h1",
      title: "운동",
      log: { "2026-04-01": 1, "2026-04-02": 0 },
    });
    const [progress] = goalProgressForPeriod(goals, tasks, [habit], "monthly", "2026-04", "2026-04-02");
    // task 1.0 + habit 0.5 over 2 items = 0.75.
    expect(progress.relatedCount).toBe(2);
    expect(progress.progress).toBe(0.75);
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

describe("activity summary rollups", () => {
  const makeHabit = (over: Partial<Habit> = {}): Habit => ({
    id: "h",
    title: "운동",
    emoji: "🏃",
    category: "habit",
    startedAt: "2026-04-01",
    recurType: "daily",
    log: {},
    ...over,
  });
  const makeCategory = (over: Partial<Category> = {}): Category => ({
    id: "cat_me",
    name: "내 일",
    color: "#111",
    isDefault: true,
    position: 0,
    ...over,
  });
  const TYPE = "monthly" as const;
  const KEY = "2026-04";
  const AFTER = "2026-05-01"; // a "today" past the period (full month elapsed)

  describe("periodTaskCompletion", () => {
    it("counts completed over total period tasks", () => {
      const tasks = [
        makeTask({ id: "a", endDate: "2026-04-05", isCompleted: true }),
        makeTask({ id: "b", endDate: "2026-04-10", isCompleted: false }),
        makeTask({ id: "c", endDate: "2026-03-30", isCompleted: true }), // out of range
      ];
      expect(periodTaskCompletion(tasks, TYPE, KEY)).toEqual({ completed: 1, total: 2, rate: 0.5 });
    });

    it("is zero with no tasks", () => {
      expect(periodTaskCompletion([], TYPE, KEY)).toEqual({ completed: 0, total: 0, rate: 0 });
    });
  });

  describe("periodCategoryCompletion", () => {
    it("groups by category, most-active first, with rates", () => {
      const categories = [makeCategory({ id: "work", name: "업무", color: "#abc" }), makeCategory()];
      const tasks = [
        makeTask({ id: "1", categoryId: "work", endDate: "2026-04-02", isCompleted: true }),
        makeTask({ id: "2", categoryId: "work", endDate: "2026-04-03", isCompleted: false }),
        makeTask({ id: "3", categoryId: "work", endDate: "2026-04-04", isCompleted: true }),
        makeTask({ id: "4", categoryId: "cat_me", endDate: "2026-04-05", isCompleted: true }),
      ];
      const rows = periodCategoryCompletion(tasks, categories, TYPE, KEY);
      expect(rows.map((r) => [r.name, r.completed, r.total])).toEqual([
        ["업무", 2, 3],
        ["내 일", 1, 1],
      ]);
      expect(rows[0].color).toBe("#abc");
      expect(rows[0].rate).toBeCloseTo(2 / 3);
    });

    it("collapses uncategorized tasks into a 미분류 row", () => {
      const tasks = [makeTask({ id: "1", categoryId: null, endDate: "2026-04-02", isCompleted: true })];
      const rows = periodCategoryCompletion(tasks, [], TYPE, KEY);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ categoryId: null, name: "미분류", completed: 1, total: 1 });
    });
  });

  describe("periodHabitAchievement", () => {
    it("rates each habit by logged active days and averages them", () => {
      const habits = [
        makeHabit({ id: "h1", log: { "2026-04-01": 1, "2026-04-02": 1 } }), // some days logged
        makeHabit({ id: "h2", log: {} }), // active days but none logged → 0
      ];
      const { average, items } = periodHabitAchievement(habits, TYPE, KEY, AFTER);
      expect(items).toHaveLength(2);
      const h1 = items.find((i) => i.habitId === "h1")!;
      expect(h1.rate).toBeCloseTo(2 / 30);
      expect(items.find((i) => i.habitId === "h2")!.rate).toBe(0);
      expect(average).toBeCloseTo((2 / 30 + 0) / 2);
    });

    it("excludes habits with no active day in the period", () => {
      // A weekly habit on Sundays only; April 2026 has Sundays, so use a day-list
      // that never occurs would be empty — instead use a recurDays set with days.
      const habit = makeHabit({ id: "h1", recurType: "weekly", recurDays: [] }); // no active days
      const { items, average } = periodHabitAchievement([habit], TYPE, KEY, AFTER);
      expect(items).toHaveLength(0);
      expect(average).toBe(0);
    });
  });

  describe("periodBestStreak", () => {
    it("returns the habit with the longest current streak", () => {
      const today = "2026-04-10";
      const habits = [
        makeHabit({ id: "h1", title: "독서", log: { "2026-04-10": 1, "2026-04-09": 1 } }), // 2
        makeHabit({ id: "h2", title: "운동", log: { "2026-04-10": 1 } }), // 1
      ];
      expect(periodBestStreak(habits, today)).toMatchObject({ habitId: "h1", streak: 2 });
    });

    it("returns null when no habit has a live streak", () => {
      const habits = [makeHabit({ id: "h1", log: {} })];
      expect(periodBestStreak(habits, "2026-04-10")).toBeNull();
    });
  });

  describe("periodMostSlipped", () => {
    it("picks the incomplete period task overdue the longest", () => {
      const today = "2026-04-20";
      const tasks = [
        makeTask({ id: "a", endDate: "2026-04-05", isCompleted: false }), // 15 days overdue
        makeTask({ id: "b", endDate: "2026-04-15", isCompleted: false }), // 5 days
        makeTask({ id: "c", endDate: "2026-04-01", isCompleted: true }), // done → ignored
      ];
      const worst = periodMostSlipped(tasks, TYPE, KEY, today);
      expect(worst?.task.id).toBe("a");
      expect(worst?.overdueDays).toBe(15);
    });

    it("returns null when nothing is overdue", () => {
      const tasks = [makeTask({ id: "a", endDate: "2026-04-25", isCompleted: false })];
      expect(periodMostSlipped(tasks, TYPE, KEY, "2026-04-20")).toBeNull();
    });
  });
});
