import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import type { Habit, Task } from "@/types/domain";
import {
  categoryDomainToInsert,
  categoryRowToDomain,
  habitDomainToInsert,
  habitRowToDomain,
  mergeHabitLogs,
  taskDomainToInsert,
  taskRowToDomain,
} from "./supabase-mapping";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type HabitLogRow = Database["public"]["Tables"]["habit_logs"]["Row"];

const taskRow = (over: Partial<TaskRow> = {}): TaskRow => ({
  id: "t1",
  user_id: "u1",
  category_id: null,
  title: "title",
  memo: null,
  priority: null,
  start_date: "2026-04-29",
  end_date: "2026-04-29",
  scheduled_time: null,
  is_completed: false,
  completed_at: null,
  is_recurring: false,
  recur_type: null,
  recur_days: null,
  recur_end_date: null,
  reminder_at: null,
  created_at: "2026-04-29T00:00:00Z",
  updated_at: "2026-04-29T00:00:00Z",
  ...over,
});

const categoryRow = (over: Partial<CategoryRow> = {}): CategoryRow => ({
  id: "cat-me",
  user_id: "u1",
  name: "나",
  color: "#4F6FD8",
  position: 0,
  is_default: true,
  created_at: "2026-04-29T00:00:00Z",
  ...over,
});

const habitRow = (over: Partial<HabitRow> = {}): HabitRow => ({
  id: "h1",
  user_id: "u1",
  category_id: null,
  title: "Run",
  emoji: "🏃",
  goal: null,
  recur_type: "daily",
  recur_days: null,
  reminder_at: null,
  created_at: "2026-04-15T00:00:00Z",
  updated_at: "2026-04-15T00:00:00Z",
  ...over,
});

describe("category mapping", () => {
  it("maps category rows into domain categories", () => {
    expect(categoryRowToDomain(categoryRow())).toEqual({
      id: "cat-me",
      name: "나",
      color: "#4F6FD8",
      isDefault: true,
      position: 0,
    });
  });

  it("maps domain categories into insert payloads", () => {
    const insert = categoryDomainToInsert(
      { id: "cat", name: "Work", color: "#D36A3A", isDefault: false, position: 2 },
      "u1",
    );
    expect(insert).toMatchObject({
      id: "cat",
      user_id: "u1",
      name: "Work",
      color: "#D36A3A",
      is_default: false,
      position: 2,
    });
  });
});

describe("taskRowToDomain", () => {
  it("maps DB columns into the domain Task shape", () => {
    const task = taskRowToDomain(
      taskRow({
        priority: "high",
        is_completed: true,
        scheduled_time: "14:00",
        category_id: "cat-ext",
      }),
      ["#취업", "#면접"],
    );
    expect(task).toEqual<Task>({
      id: "t1",
      title: "title",
      categoryId: "cat-ext",
      startDate: "2026-04-29",
      endDate: "2026-04-29",
      priority: "high",
      isCompleted: true,
      scheduledTime: "14:00",
      tags: ["#취업", "#면접"],
    });
  });

  it("falls back to start_date when end_date is null", () => {
    const task = taskRowToDomain(taskRow({ end_date: null }));
    expect(task.endDate).toBe("2026-04-29");
  });

  it("drops priority that does not match the enum", () => {
    const task = taskRowToDomain(taskRow({ priority: "urgent" }));
    expect(task.priority).toBeUndefined();
  });

  it("keeps a null category id when the row is uncategorized", () => {
    const task = taskRowToDomain(taskRow({ category_id: null }));
    expect(task.categoryId).toBeNull();
  });
});

describe("taskDomainToInsert", () => {
  it("attaches categoryId and stamps completed_at when completed", () => {
    const task: Task = {
      id: "t1",
      title: "Done",
      categoryId: "cat-me",
      startDate: "2026-04-29",
      endDate: "2026-04-29",
      priority: "low",
      isCompleted: true,
      scheduledTime: null,
      tags: [],
    };
    const insert = taskDomainToInsert(task, "u1");
    expect(insert.user_id).toBe("u1");
    expect(insert.category_id).toBe("cat-me");
    expect(insert.priority).toBe("low");
    expect(insert.is_completed).toBe(true);
    expect(insert.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("leaves completed_at null and dates null when domain dates are empty", () => {
    const task: Task = {
      id: "t2",
      title: "Open",
      categoryId: null,
      startDate: "",
      endDate: "",
      isCompleted: false,
      scheduledTime: null,
      tags: [],
    };
    const insert = taskDomainToInsert(task, "u1");
    expect(insert.completed_at).toBeNull();
    expect(insert.start_date).toBeNull();
    expect(insert.end_date).toBeNull();
  });
});

describe("habitRowToDomain / habitDomainToInsert", () => {
  it("round-trips title and emoji", () => {
    const domain = habitRowToDomain(habitRow());
    expect(domain.title).toBe("Run");
    expect(domain.emoji).toBe("🏃");
    expect(domain.category).toBe("habit");
    expect(domain.startedAt).toBe("2026-04-15");
    expect(domain.recurType).toBe("daily");
    expect(domain.recurDays).toBeUndefined();
    expect(domain.log).toEqual({});
  });

  it("maps weekly recurrence from a habit row", () => {
    const domain = habitRowToDomain(habitRow({ recur_type: "weekly", recur_days: [1, 3, 5] }));
    expect(domain.recurType).toBe("weekly");
    expect(domain.recurDays).toEqual([1, 3, 5]);
  });

  it("produces an insert payload that carries title, emoji, and recur_type", () => {
    const habit: Habit = {
      id: "h2",
      title: "Read",
      emoji: "📖",
      category: "habit",
      startedAt: "2026-04-01",
      recurType: "weekly",
      recurDays: [1, 3, 5],
      log: {},
    };
    const insert = habitDomainToInsert(habit, "u1");
    expect(insert.id).toBe("h2");
    expect(insert.user_id).toBe("u1");
    expect(insert.title).toBe("Read");
    expect(insert.emoji).toBe("📖");
    expect(insert.recur_type).toBe("weekly");
    expect(insert.recur_days).toEqual([1, 3, 5]);
  });
});

describe("mergeHabitLogs", () => {
  const habits: Habit[] = [
    {
      id: "h1",
      title: "Run",
      emoji: "🏃",
      category: "habit",
      startedAt: "2026-04-01",
      recurType: "daily",
      log: {},
    },
    {
      id: "h2",
      title: "Read",
      emoji: "📖",
      category: "habit",
      startedAt: "2026-04-01",
      recurType: "daily",
      log: {},
    },
  ];

  const log = (over: Partial<HabitLogRow>): HabitLogRow => ({
    id: "log",
    habit_id: "h1",
    user_id: "u1",
    log_date: "2026-04-29",
    is_completed: true,
    created_at: "2026-04-29T00:00:00Z",
    updated_at: "2026-04-29T00:00:00Z",
    ...over,
  });

  it("attaches log entries by habit id and date", () => {
    const merged = mergeHabitLogs(habits, [
      log({ id: "1", habit_id: "h1", log_date: "2026-04-28", is_completed: true }),
      log({ id: "2", habit_id: "h1", log_date: "2026-04-29", is_completed: true }),
      log({ id: "3", habit_id: "h2", log_date: "2026-04-29", is_completed: false }),
    ]);
    expect(merged[0].log).toEqual({ "2026-04-28": 1, "2026-04-29": 1 });
    expect(merged[1].log).toEqual({ "2026-04-29": 0 });
  });

  it("leaves the habit log untouched when there are no rows for it", () => {
    const merged = mergeHabitLogs(habits, []);
    expect(merged[0].log).toEqual({});
    expect(merged[1].log).toEqual({});
  });
});
