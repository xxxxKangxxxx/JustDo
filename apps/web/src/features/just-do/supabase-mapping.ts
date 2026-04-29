import type { Database } from "@/lib/supabase/database.types";
import type { Habit, HabitCategory, Priority, Task, TaskCategory } from "@/types/domain";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type HabitInsert = Database["public"]["Tables"]["habits"]["Insert"];
type HabitLogRow = Database["public"]["Tables"]["habit_logs"]["Row"];

/**
 * Domain `Task.category` is a small enum (`"me"`, `"ext"`) while the DB stores
 * a FK to `categories(name)`. The signup trigger seeds these names on every
 * new account so this map is the bridge between the two layers. If a future
 * migration changes the seed names, update this map and write a data
 * migration; do not branch on the domain enum elsewhere.
 */
export const taskCategoryToName: Record<TaskCategory, string> = {
  me: "나",
  ext: "외부",
};

const habitCategoryName = "Habit";

const nameToTaskCategory = (name: string | null | undefined): TaskCategory => {
  if (name === taskCategoryToName.ext) return "ext";
  return "me";
};

const isPriority = (value: string | null): value is Priority =>
  value === "high" || value === "medium" || value === "low";

export const taskRowToDomain = (
  row: TaskRow,
  categoryName: string | null,
  tags: string[] = [],
): Task => ({
  id: row.id,
  title: row.title,
  category: nameToTaskCategory(categoryName),
  startDate: row.start_date ?? "",
  endDate: row.end_date ?? row.start_date ?? "",
  priority: isPriority(row.priority) ? row.priority : undefined,
  isCompleted: row.is_completed,
  scheduledTime: row.scheduled_time,
  tags,
});

export const taskDomainToInsert = (
  task: Task,
  userId: string,
  categoryId: string | null,
): TaskInsert => ({
  id: task.id,
  user_id: userId,
  category_id: categoryId,
  title: task.title,
  priority: task.priority ?? null,
  start_date: task.startDate || null,
  end_date: task.endDate || null,
  scheduled_time: task.scheduledTime ?? null,
  is_completed: task.isCompleted,
  completed_at: task.isCompleted ? new Date().toISOString() : null,
});

export const habitRowToDomain = (row: HabitRow): Habit => ({
  id: row.id,
  title: row.title,
  emoji: row.emoji,
  category: habitCategoryName.toLowerCase() as HabitCategory,
  startedAt: row.created_at.slice(0, 10),
  log: {},
});

export const habitDomainToInsert = (habit: Habit, userId: string): HabitInsert => ({
  id: habit.id,
  user_id: userId,
  title: habit.title,
  emoji: habit.emoji,
  // Domain habits are always daily for v1. Recur configuration is wired up
  // alongside the recurring-task work later.
  recur_type: "daily",
});

export const mergeHabitLogs = (habits: Habit[], logs: HabitLogRow[]): Habit[] => {
  const byHabit = new Map<string, Record<string, 0 | 1>>();
  for (const log of logs) {
    const entry = byHabit.get(log.habit_id) ?? {};
    entry[log.log_date] = log.is_completed ? 1 : 0;
    byHabit.set(log.habit_id, entry);
  }
  return habits.map((habit) => ({ ...habit, log: byHabit.get(habit.id) ?? habit.log }));
};
