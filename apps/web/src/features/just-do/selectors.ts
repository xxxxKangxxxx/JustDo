import { addDays, weekdayOfISO } from "@/lib/date";
import type { Habit, Task } from "@/types/domain";

export const tasksOnDate = (tasks: Task[], iso: string) =>
  tasks.filter((task) => task.startDate <= iso && iso <= task.endDate);

export const tasksInRange = (tasks: Task[], startISO: string, endISO: string) =>
  tasks.filter((task) => !(task.endDate < startISO || task.startDate > endISO));

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
