export type TaskCategory = "me" | "ext";
export type HabitCategory = "habit";
export type Category = TaskCategory | HabitCategory;
export type Priority = "high" | "medium" | "low";
export type TabId = "home" | "habit" | "stats" | "settings";

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  startDate: string;
  endDate: string;
  priority?: Priority;
  isCompleted: boolean;
  scheduledTime?: string | null;
  tags: string[];
};

export type Habit = {
  id: string;
  title: string;
  emoji: string;
  category: HabitCategory;
  startedAt: string;
  log: Record<string, 0 | 1>;
};

export type Settings = {
  notify: boolean;
  notifyTime: string;
  weekStart: 0 | 1;
  plan: "free" | "pro";
};

export type ViewState = {
  tab: TabId;
  year: number;
  month: number;
  selectedDate: string;
  dark: boolean;
  sheet: null | { kind: "add"; taskId?: string; date?: string; initialType?: "task" | "habit" };
  detailTaskId: string | null;
};

export type AppState = {
  view: ViewState;
  tasks: Task[];
  habits: Habit[];
  settings: Settings;
};

export type NewTaskInput = {
  title: string;
  category: TaskCategory;
  startDate: string;
  endDate: string;
  priority: Priority;
  scheduledTime?: string | null;
};

export type NewHabitInput = {
  title: string;
  emoji: string;
};
