export type HabitCategory = "habit";
export type HabitRecurType = "daily" | "weekly";
export type Priority = "high" | "medium" | "low";
export type TabId = "home" | "habit" | "settings";

export type Category = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  position: number;
};

export type Task = {
  id: string;
  title: string;
  categoryId: string | null;
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
  recurType: HabitRecurType;
  recurDays?: number[];
  reminderTime?: string | null;
  log: Record<string, 0 | 1>;
};

export type Settings = {
  notify: boolean;
  notifyTime: string;
  weekStart: 0 | 1;
  plan: "free" | "pro";
  justDoMode: boolean;
};

export type GoalPeriodType = "monthly" | "yearly";

export type Goal = {
  id: string;
  periodType: GoalPeriodType;
  periodKey: string;
  title: string;
  note?: string | null;
  sortOrder: number;
  locked: boolean;
  lockedAt?: string | null;
};

export type GoalPromptType =
  | "onboarding"
  | "monthly"
  | "yearly"
  | "report_monthly"
  | "report_yearly";

export type GoalPromptDismissal = {
  id: string;
  promptType: GoalPromptType;
  periodKey: string;
  dismissedPermanentlyForPeriod: boolean;
  dismissedAt: string;
};

export type ViewState = {
  tab: TabId;
  year: number;
  month: number;
  selectedDate: string;
  dark: boolean;
  sheet: null | { kind: "add"; taskId?: string; date?: string; initialType?: "task" | "habit" };
  detailTaskId: string | null;
  detailHabitId: string | null;
};

export type AppState = {
  view: ViewState;
  categories: Category[];
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  goalPromptDismissals: GoalPromptDismissal[];
  settings: Settings;
};

export type NewTaskInput = {
  title: string;
  categoryId: string | null;
  startDate: string;
  endDate: string;
  priority: Priority;
  scheduledTime?: string | null;
  tags?: string[];
};

export type NewHabitInput = {
  title: string;
  emoji: string;
  recurType: HabitRecurType;
  recurDays?: number[];
  reminderTime?: string | null;
};
