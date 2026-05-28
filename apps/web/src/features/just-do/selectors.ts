import { addDays, weekdayOfISO } from "@/lib/date";
import type { Habit, Task } from "@/types/domain";

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
