import { addDays } from "@/lib/date";
import type { Habit, Task } from "@/types/domain";

export const tasksOnDate = (tasks: Task[], iso: string) =>
  tasks.filter((task) => task.startDate <= iso && iso <= task.endDate);

export const tasksInRange = (tasks: Task[], startISO: string, endISO: string) =>
  tasks.filter((task) => !(task.endDate < startISO || task.startDate > endISO));

export const habitStreak = (habit: Habit, today: string) => {
  let count = 0;
  let cursor = today;
  while (habit.log[cursor]) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
};
