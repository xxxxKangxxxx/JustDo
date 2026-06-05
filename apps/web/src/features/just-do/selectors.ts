import { addDays, daysInMonth, isoOf, parseISO, weekdayOfISO } from "@/lib/date";
import type { Goal, GoalPeriodType, GoalPromptDismissal, Habit, Task } from "@/types/domain";

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

// --- E1 goal matcher --------------------------------------------------------
// Deterministic relevance between a goal and a task/habit, computed client-side
// from text only. Ported byte-for-byte to iOS GoalProgressMatcher so progress
// matches across devices. Replaces the old raw-substring matcher (which scored
// false positives like 운동 ↔ 부동산) with normalized token overlap.

// Variant tokens collapsed to one canonical token. Keep this seed minimal.
const GOAL_SYNONYMS: Record<string, string> = {
  헬스: "운동",
  운동하기: "운동",
  독서: "책",
  책읽기: "책",
  러닝: "달리기",
  공부하기: "공부",
};

// Trailing Korean particles, longest first. Stripped once per token, and only
// when the remaining stem is still >= 2 chars so we never mangle short nouns
// (e.g. 추가 keeps its 가; 운동을 -> 운동).
const GOAL_PARTICLES = [
  "으로", "에서", "에게", "하기", "하고", "해서",
  "을", "를", "은", "는", "이", "가", "에", "의", "로", "도", "만", "과", "와",
];

// Common filler tokens dropped entirely.
const GOAL_STOPWORDS = new Set(["매일", "매주", "주말", "꾸준히", "열심히", "그리고", "하루", "오늘", "및"]);

const normalizeGoalToken = (raw: string): string | null => {
  const lowered = raw.toLowerCase();
  const synonym = GOAL_SYNONYMS[lowered];
  let token = synonym ?? lowered;
  if (!synonym) {
    for (const particle of GOAL_PARTICLES) {
      if (token.length - particle.length >= 2 && token.endsWith(particle)) {
        token = token.slice(0, token.length - particle.length);
        break;
      }
    }
  }
  if (!token || GOAL_STOPWORDS.has(token)) return null;
  return token;
};

const tokenize = (text: string): Set<string> => {
  const tokens = new Set<string>();
  for (const raw of text.replace(/[^0-9a-z가-힣]+/gi, " ").split(/\s+/)) {
    if (!raw) continue;
    const token = normalizeGoalToken(raw);
    if (token) tokens.add(token);
  }
  return tokens;
};

const tokensOverlap = (a: Set<string>, b: Set<string>): boolean => {
  for (const token of a) {
    if (b.has(token)) return true;
  }
  return false;
};

const goalTokenSet = (goal: Goal) => tokenize(goal.title);
const taskTokenSet = (task: Task) => tokenize(`${task.title} ${task.tags.join(" ")}`);
const habitTokenSet = (habit: Habit) => tokenize(habit.title);

// A matched habit contributes its period log-completion ratio (logged active
// days / active days up to today), so habit-oriented goals earn partial credit.
const habitPeriodScore = (habit: Habit, start: string, end: string, today: string): number => {
  const last = today < end ? today : end;
  if (last < start) return 0;
  let active = 0;
  let done = 0;
  for (let iso = start; iso <= last; iso = addDays(iso, 1)) {
    if (!habitActiveOn(habit, iso)) continue;
    active += 1;
    if (habit.log[iso]) done += 1;
  }
  return active ? done / active : 0;
};

export type GoalProgress = {
  goal: Goal;
  relatedTasks: Task[];
  relatedHabits: Habit[];
  completedTasks: Task[];
  slipped: Task[];
  relatedCount: number;
  completedCount: number;
  progress: number;
};

export const goalProgressForPeriod = (
  goals: Goal[],
  tasks: Task[],
  habits: Habit[],
  type: GoalPeriodType,
  periodKey: string,
  today: string,
): GoalProgress[] => {
  const range = rangeForGoalPeriod(type, periodKey);
  const periodTasks = tasksInRange(tasks, range.start, range.end);
  return goalsForPeriod(goals, type, periodKey).map((goal) => {
    const goalTokens = goalTokenSet(goal);
    // A goal with no matching items shows "관련 항목 없음" — never fall back to all
    // period tasks, which would surface the same global completion rate for every
    // unrelated goal.
    const relatedTasks = periodTasks.filter((task) => tokensOverlap(goalTokens, taskTokenSet(task)));
    const relatedHabits = habits.filter((habit) => tokensOverlap(goalTokens, habitTokenSet(habit)));
    const completedTasks = relatedTasks.filter((task) => task.isCompleted);
    const slipped = relatedTasks.filter((task) => !task.isCompleted && task.endDate < range.end);
    const habitScores = relatedHabits.map((habit) => habitPeriodScore(habit, range.start, range.end, today));
    const relatedCount = relatedTasks.length + relatedHabits.length;
    // tasks score 0/1; habits score their fractional period ratio.
    const score = completedTasks.length + habitScores.reduce((sum, value) => sum + value, 0);
    const completedCount = completedTasks.length + habitScores.filter((value) => value >= 1).length;
    return {
      goal,
      relatedTasks,
      relatedHabits,
      completedTasks,
      slipped,
      relatedCount,
      completedCount,
      progress: relatedCount ? score / relatedCount : 0,
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

export type ReportAvailability = { periodType: GoalPeriodType; periodKey: string };

const reportDismissalPromptType = (periodType: GoalPeriodType) =>
  periodType === "yearly" ? "report_yearly" : "report_monthly";

/**
 * Period-end reports eligible to surface today, highest priority first.
 *
 * Reports are retrospective: a period's report only appears once the period has
 * ended. The monthly report surfaces the immediately previous month throughout
 * the current month; the yearly report surfaces the previous year but only in
 * January, where it takes priority over the monthly report. A report is only
 * included when at least one goal exists for that period.
 */
export const availableReports = (
  today: string,
  goals: Goal[],
): ReportAvailability[] => {
  const { year, month } = parseISO(today);
  const result: ReportAvailability[] = [];

  if (month === 1) {
    const previousYearKey = String(year - 1);
    if (goals.some((goal) => goal.periodType === "yearly" && goal.periodKey === previousYearKey)) {
      result.push({ periodType: "yearly", periodKey: previousYearKey });
    }
  }

  const previousMonthYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousMonthKey = `${previousMonthYear}-${String(previousMonth).padStart(2, "0")}`;
  if (goals.some((goal) => goal.periodType === "monthly" && goal.periodKey === previousMonthKey)) {
    result.push({ periodType: "monthly", periodKey: previousMonthKey });
  }

  return result;
};

export const isReportDismissed = (
  report: ReportAvailability,
  dismissals: GoalPromptDismissal[],
) =>
  dismissals.some(
    (dismissal) =>
      dismissal.promptType === reportDismissalPromptType(report.periodType) &&
      dismissal.periodKey === report.periodKey,
  );

/** Highest-priority non-dismissed report for the dismissible Home banner, or null. */
export const homeBannerReport = (
  today: string,
  goals: Goal[],
  dismissals: GoalPromptDismissal[],
): ReportAvailability | null =>
  availableReports(today, goals).find((report) => !isReportDismissed(report, dismissals)) ?? null;
