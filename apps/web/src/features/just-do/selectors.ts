import { addDays, daysInMonth, isoOf, parseISO, weekdayOfISO } from "@/lib/date";
import type { Goal, GoalPeriodType, Habit, Task } from "@/types/domain";

export const tasksOnDate = (tasks: Task[], iso: string) =>
  tasks.filter((task) => task.startDate <= iso && iso <= task.endDate);

export const tasksInRange = (tasks: Task[], startISO: string, endISO: string) =>
  tasks.filter((task) => !(task.endDate < startISO || task.startDate > endISO));

export const sortTasksByDueDate = (tasks: Task[]) =>
  tasks.slice().sort((a, b) => {
    if (a.endDate !== b.endDate) return a.endDate.localeCompare(b.endDate);
    const aTime = a.scheduledTime ?? "99:99";
    const bTime = b.scheduledTime ?? "99:99";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.title.localeCompare(b.title, "ko-KR");
  });

export const justDoTasksUntil = (tasks: Task[], selectedDate: string) =>
  sortTasksByDueDate(
    tasks.filter((task) => !task.isCompleted && task.endDate <= selectedDate),
  );

export const justDoTaskSections = (
  tasks: Task[],
  selectedDate: string,
  today: string,
) => {
  const items = justDoTasksUntil(tasks, selectedDate);
  return [
    { title: "지난일", items: items.filter((task) => task.endDate < today) },
    { title: "오늘", items: items.filter((task) => task.endDate === today) },
    {
      title: "해야할일",
      items: items.filter((task) => task.endDate > today && task.endDate <= selectedDate),
    },
  ].filter((section) => section.items.length > 0);
};

export const habitActiveOn = (habit: Habit, iso: string) => {
  if (habit.recurType !== "weekly") return true;
  if (!habit.recurDays?.length) return false;
  return habit.recurDays.includes(weekdayOfISO(iso));
};

export const habitStreak = (habit: Habit, today: string) => {
  if (habit.recurType === "weekly" && !habit.recurDays?.length) return 0;
  let count = 0;
  let cursor = today;
  while (true) {
    if (!habitActiveOn(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!habit.log[cursor]) return count;
    count += 1;
    cursor = addDays(cursor, -1);
  }
};

export const periodKeyOf = (type: GoalPeriodType, iso: string) => {
  const { year, month } = parseISO(iso);
  return type === "yearly" ? String(year) : `${year}-${String(month).padStart(2, "0")}`;
};

export const goalsForPeriod = (goals: Goal[], type: GoalPeriodType, periodKey: string) =>
  goals
    .filter((goal) => goal.periodType === type && goal.periodKey === periodKey)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ko-KR"));

export const rangeForGoalPeriod = (type: GoalPeriodType, periodKey: string) => {
  if (type === "yearly") {
    return { start: `${periodKey}-01-01`, end: `${periodKey}-12-31` };
  }
  const [year, month] = periodKey.split("-").map(Number);
  return {
    start: isoOf(year, month, 1),
    end: isoOf(year, month, daysInMonth(year, month)),
  };
};

const taskMatchesGoal = (task: Task, goal: Goal) => {
  const text = `${task.title} ${task.tags.join(" ")}`.toLowerCase();
  return goal.title
    .split(/\s+/)
    .filter((part) => part.length >= 2)
    .some((part) => text.includes(part.toLowerCase()));
};

export type GoalProgress = {
  goal: Goal;
  related: Task[];
  completed: Task[];
  progress: number;
  slipped: Task[];
};

export const goalProgressForPeriod = (
  goals: Goal[],
  tasks: Task[],
  type: GoalPeriodType,
  periodKey: string,
): GoalProgress[] => {
  const range = rangeForGoalPeriod(type, periodKey);
  const periodTasks = tasksInRange(tasks, range.start, range.end);
  return goalsForPeriod(goals, type, periodKey).map((goal) => {
    const matched = periodTasks.filter((task) => taskMatchesGoal(task, goal));
    const related = matched.length ? matched : periodTasks;
    const completed = related.filter((task) => task.isCompleted);
    const slipped = related.filter((task) => !task.isCompleted && task.endDate < range.end);
    return {
      goal,
      related,
      completed,
      progress: related.length ? completed.length / related.length : 0,
      slipped,
    };
  });
};

export const periodActivityHeatmap = (
  tasks: Task[],
  habits: Habit[],
  type: GoalPeriodType,
  periodKey: string,
) => {
  const range = rangeForGoalPeriod(type, periodKey);
  const days = type === "yearly" ? 12 : daysInMonth(parseISO(range.start).year, parseISO(range.start).month);
  return Array.from({ length: days }, (_, index) => {
    if (type === "yearly") {
      const month = index + 1;
      const monthKey = `${periodKey}-${String(month).padStart(2, "0")}`;
      return tasks.filter((task) => task.isCompleted && task.endDate.startsWith(monthKey)).length;
    }
    const iso = addDays(range.start, index);
    const completedTasks = tasks.filter((task) => task.isCompleted && task.endDate === iso).length;
    const completedHabits = habits.filter((habit) => habit.log[iso]).length;
    return completedTasks + completedHabits;
  });
};
