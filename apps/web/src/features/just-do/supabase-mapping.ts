import type { Database } from "@/lib/supabase/database.types";
import type {
  Category,
  Goal,
  GoalPeriodType,
  GoalPromptDismissal,
  GoalPromptType,
  Habit,
  HabitCategory,
  HabitRecurType,
  Priority,
  Task,
} from "@/types/domain";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type HabitInsert = Database["public"]["Tables"]["habits"]["Insert"];
type HabitLogRow = Database["public"]["Tables"]["habit_logs"]["Row"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];
type GoalPromptDismissalRow = Database["public"]["Tables"]["goal_prompt_dismissals"]["Row"];
type GoalPromptDismissalInsert = Database["public"]["Tables"]["goal_prompt_dismissals"]["Insert"];

const habitCategoryName = "Habit";

const isPriority = (value: string | null): value is Priority =>
  value === "high" || value === "medium" || value === "low";

const toHabitRecurType = (value: string | null): HabitRecurType =>
  value === "weekly" ? "weekly" : "daily";

const toGoalPeriodType = (value: string): GoalPeriodType =>
  value === "yearly" ? "yearly" : "monthly";

const toGoalPromptType = (value: string): GoalPromptType =>
  value === "yearly" ||
  value === "onboarding" ||
  value === "report_monthly" ||
  value === "report_yearly"
    ? value
    : "monthly";

export const categoryRowToDomain = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  isDefault: row.is_default,
  position: row.position,
});

export const categoryDomainToInsert = (
  category: Category,
  userId: string,
): CategoryInsert => ({
  id: category.id,
  user_id: userId,
  name: category.name,
  color: category.color,
  is_default: category.isDefault,
  position: category.position,
});

export const taskRowToDomain = (row: TaskRow, tags: string[] = []): Task => ({
  id: row.id,
  title: row.title,
  categoryId: row.category_id,
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
): TaskInsert => ({
  id: task.id,
  user_id: userId,
  category_id: task.categoryId,
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
  recurType: toHabitRecurType(row.recur_type),
  recurDays:
    row.recur_type === "weekly" && row.recur_days?.length
      ? row.recur_days
      : undefined,
  reminderTime: row.reminder_at,
  log: {},
});

export const habitDomainToInsert = (habit: Habit, userId: string): HabitInsert => ({
  id: habit.id,
  user_id: userId,
  title: habit.title,
  emoji: habit.emoji,
  recur_type: habit.recurType,
  recur_days:
    habit.recurType === "weekly" && habit.recurDays?.length
      ? habit.recurDays
      : null,
  reminder_at: habit.reminderTime ?? null,
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

export const goalRowToDomain = (row: GoalRow): Goal => ({
  id: row.id,
  periodType: toGoalPeriodType(row.period_type),
  periodKey: row.period_key,
  title: row.title,
  note: row.note,
  sortOrder: row.sort_order,
  locked: row.locked,
  lockedAt: row.locked_at,
});

export const goalDomainToInsert = (goal: Goal, userId: string): GoalInsert => ({
  id: goal.id,
  user_id: userId,
  period_type: goal.periodType,
  period_key: goal.periodKey,
  title: goal.title,
  note: goal.note ?? null,
  sort_order: goal.sortOrder,
  locked: goal.locked,
  locked_at: goal.locked ? (goal.lockedAt ?? new Date().toISOString()) : null,
});

export const goalPromptDismissalRowToDomain = (
  row: GoalPromptDismissalRow,
): GoalPromptDismissal => ({
  id: row.id,
  promptType: toGoalPromptType(row.prompt_type),
  periodKey: row.period_key,
  dismissedPermanentlyForPeriod: row.dismissed_permanently_for_period,
  dismissedAt: row.dismissed_at,
});

export const goalPromptDismissalDomainToInsert = (
  dismissal: GoalPromptDismissal,
  userId: string,
): GoalPromptDismissalInsert => ({
  id: dismissal.id,
  user_id: userId,
  prompt_type: dismissal.promptType,
  period_key: dismissal.periodKey,
  dismissed_permanently_for_period: dismissal.dismissedPermanentlyForPeriod,
  dismissed_at: dismissal.dismissedAt,
});
