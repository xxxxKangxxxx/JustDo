import { addDays, daysInMonth, isoOf, parseISO, weekdayOfISO } from "@/lib/date";
import type { Category, Goal, GoalPeriodType, GoalPromptDismissal, Habit, Task } from "@/types/domain";

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

// Variant tokens collapsed to one canonical token. Domain clusters (esp.
// exercise) bridge same-meaning-different-word cases like 헬스장 ↔ 운동 that pure
// token overlap can never catch. Still heuristic: words not listed here stay
// unmatched (the E1 ceiling; true semantic matching is the future E3 track).
const GOAL_SYNONYMS: Record<string, string> = {
  // 운동 cluster
  헬스: "운동",
  헬스장: "운동",
  운동하기: "운동",
  웨이트: "운동",
  홈트: "운동",
  홈트레이닝: "운동",
  피티: "운동",
  pt: "운동",
  크로스핏: "운동",
  스트레칭: "운동",
  산책: "운동",
  걷기: "운동",
  조깅: "운동",
  러닝: "운동",
  런닝: "운동",
  달리기: "운동",
  등산: "운동",
  요가: "운동",
  필라테스: "운동",
  수영: "운동",
  // 책 cluster
  독서: "책",
  책읽기: "책",
  도서: "책",
  // 공부 cluster
  공부하기: "공부",
  학습: "공부",
  스터디: "공부",
  // 영어 cluster
  영어공부: "영어",
  영단어: "영어",
};

// Trailing Korean particles, longest first. Stripped once per token, and only
// when the remaining stem is still >= 2 chars so we never mangle short nouns
// (e.g. 추가 keeps its 가; 운동을 -> 운동).
const GOAL_PARTICLES = [
  "으로", "에서", "에게", "하기", "하고", "해서",
  "을", "를", "은", "는", "이", "가", "에", "의", "로", "도", "만", "과", "와",
];

// Common filler tokens dropped entirely. The counter/unit words (주/회/번/…) keep
// noisy goal-note phrases like "주 3회 이상" from creating false matches now that
// the goal note is part of the matched text.
const GOAL_STOPWORDS = new Set([
  "매일", "매주", "주말", "꾸준히", "열심히", "그리고", "하루", "오늘", "및",
  "주", "회", "번", "개", "이상", "이하", "정도", "매월", "매년",
]);

const normalizeGoalToken = (raw: string): string | null => {
  const lowered = raw.toLowerCase();
  // Drop quantity tokens like 3회 / 30분 / 5개 so a goal note's "주 3회" never
  // matches an unrelated task's "회의 3회".
  if (/^[0-9]/.test(lowered)) return null;
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

// Match against the goal title plus its note, so a note like "주 3회 운동 루틴"
// lets a 헬스장 task count even when the title (e.g. 체력 키우기) shares no token.
const goalTokenSet = (goal: Goal) => {
  const tokens = tokenize(goal.title);
  if (goal.note) {
    for (const token of tokenize(goal.note)) tokens.add(token);
  }
  return tokens;
};
const taskTokenSet = (task: Task) => tokenize(`${task.title} ${task.tags.join(" ")}`);
const habitTokenSet = (habit: Habit) => tokenize(habit.title);

// A habit's period completion over its *elapsed active* days (logged active days
// / active days up to today): `active` is also how we tell whether a habit even
// applies to the period (0 → exclude from achievement rollups).
export const habitPeriodStats = (
  habit: Habit,
  start: string,
  end: string,
  today: string,
): { active: number; done: number; rate: number } => {
  const last = today < end ? today : end;
  if (last < start) return { active: 0, done: 0, rate: 0 };
  let active = 0;
  let done = 0;
  for (let iso = start; iso <= last; iso = addDays(iso, 1)) {
    if (!habitActiveOn(habit, iso)) continue;
    active += 1;
    if (habit.log[iso]) done += 1;
  }
  return { active, done, rate: active ? done / active : 0 };
};

// A matched habit contributes its period log-completion ratio, so habit-oriented
// goals earn partial credit.
const habitPeriodScore = (habit: Habit, start: string, end: string, today: string): number =>
  habitPeriodStats(habit, start, end, today).rate;

export type GoalProgress = {
  goal: Goal;
  relatedTasks: Task[];
  relatedHabits: Habit[];
  completedTasks: Task[];
  slipped: Task[];
  relatedCount: number;
  completedCount: number;
  /** Resolved positive numeric target, or null for qualitative goals. */
  target: number | null;
  progress: number;
};

export type GoalSemanticMatches = Map<string, { taskIds: Set<string>; habitIds: Set<string> }>;

export const goalProgressForPeriod = (
  goals: Goal[],
  tasks: Task[],
  habits: Habit[],
  type: GoalPeriodType,
  periodKey: string,
  today: string,
  matches?: GoalSemanticMatches | null,
): GoalProgress[] => {
  const range = rangeForGoalPeriod(type, periodKey);
  const periodTasks = tasksInRange(tasks, range.start, range.end);
  return goalsForPeriod(goals, type, periodKey).map((goal) => {
    const goalTokens = goalTokenSet(goal);
    // Relevance source: E3 semantic matches when the goal is embedded (present in
    // `matches`), else the E1 token matcher (offline / not-yet-embedded). Either
    // way a goal with no matching items shows "관련 항목 없음" — never the global
    // completion rate.
    const semantic = matches?.get(goal.id);
    const relatedTasks = semantic
      ? periodTasks.filter((task) => semantic.taskIds.has(task.id))
      : periodTasks.filter((task) => tokensOverlap(goalTokens, taskTokenSet(task)));
    const relatedHabits = semantic
      ? habits.filter((habit) => semantic.habitIds.has(habit.id))
      : habits.filter((habit) => tokensOverlap(goalTokens, habitTokenSet(habit)));
    const completedTasks = relatedTasks.filter((task) => task.isCompleted);
    const slipped = relatedTasks.filter((task) => !task.isCompleted && task.endDate < range.end);
    const habitScores = relatedHabits.map((habit) => habitPeriodScore(habit, range.start, range.end, today));
    const relatedCount = relatedTasks.length + relatedHabits.length;
    // tasks score 0/1; habits score their fractional period ratio.
    const score = completedTasks.length + habitScores.reduce((sum, value) => sum + value, 0);
    const completedCount = completedTasks.length + habitScores.filter((value) => value >= 1).length;
    // An optional target only replaces the denominator (the numerator stays the
    // auto-derived score), so a quantitative goal like 책 3권 reads progress
    // toward its target instead of toward the count of matched items.
    const target = typeof goal.target === "number" && goal.target > 0 ? goal.target : null;
    const progress = target
      ? Math.min(score, target) / target
      : relatedCount ? score / relatedCount : 0;
    return {
      goal,
      relatedTasks,
      relatedHabits,
      completedTasks,
      slipped,
      relatedCount,
      completedCount,
      target,
      progress,
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

// --- Activity summary rollups (report 활동 step) ----------------------------
// Period-wide rollups (not goal-scoped) for the report's activity step. All are
// derived from the same period range + completion rules as the goal cards so the
// numbers stay consistent. Ported to iOS GoalSelectors for cross-platform parity.

export type TaskCompletion = { completed: number; total: number; rate: number };

export type CategoryCompletion = {
  categoryId: string | null;
  name: string;
  color: string;
  completed: number;
  total: number;
  rate: number;
};

export type HabitAchievement = { habitId: string; title: string; emoji: string; rate: number };

export type StreakHighlight = { habitId: string; title: string; emoji: string; streak: number };

export type SlippedHighlight = { task: Task; overdueDays: number };

const UNCATEGORIZED_NAME = "미분류";
const UNCATEGORIZED_COLOR = "#9CA3AF";

const daysBetween = (fromISO: string, toISO: string): number =>
  Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);

/** Task 완료율 over the whole period (every task in range, completed or not). */
export const periodTaskCompletion = (
  tasks: Task[],
  type: GoalPeriodType,
  periodKey: string,
): TaskCompletion => {
  const range = rangeForGoalPeriod(type, periodKey);
  const periodTasks = tasksInRange(tasks, range.start, range.end);
  const completed = periodTasks.filter((task) => task.isCompleted).length;
  const total = periodTasks.length;
  return { completed, total, rate: total ? completed / total : 0 };
};

/**
 * 카테고리별 완료율: period tasks grouped by category, most-active first. Tasks
 * with no category collapse into a single "미분류" row.
 */
export const periodCategoryCompletion = (
  tasks: Task[],
  categories: Category[],
  type: GoalPeriodType,
  periodKey: string,
): CategoryCompletion[] => {
  const range = rangeForGoalPeriod(type, periodKey);
  const periodTasks = tasksInRange(tasks, range.start, range.end);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const groups = new Map<string, { completed: number; total: number }>();
  for (const task of periodTasks) {
    const key = task.categoryId ?? "";
    const group = groups.get(key) ?? { completed: 0, total: 0 };
    group.total += 1;
    if (task.isCompleted) group.completed += 1;
    groups.set(key, group);
  }
  const rows: CategoryCompletion[] = [];
  for (const [key, group] of groups) {
    const category = key ? byId.get(key) : undefined;
    rows.push({
      categoryId: key || null,
      name: category?.name ?? UNCATEGORIZED_NAME,
      color: category?.color ?? UNCATEGORIZED_COLOR,
      completed: group.completed,
      total: group.total,
      rate: group.total ? group.completed / group.total : 0,
    });
  }
  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ko-KR"));
};

/**
 * Habit 달성률: per-habit completion over elapsed active days, plus the average.
 * Habits with no active day in the period (e.g. a weekly habit whose days never
 * fell in range) are excluded so they don't drag the average to 0.
 */
export const periodHabitAchievement = (
  habits: Habit[],
  type: GoalPeriodType,
  periodKey: string,
  today: string,
): { average: number; items: HabitAchievement[] } => {
  const range = rangeForGoalPeriod(type, periodKey);
  const items: HabitAchievement[] = [];
  for (const habit of habits) {
    const stats = habitPeriodStats(habit, range.start, range.end, today);
    if (stats.active === 0) continue;
    items.push({ habitId: habit.id, title: habit.title, emoji: habit.emoji, rate: stats.rate });
  }
  const average = items.length ? items.reduce((sum, item) => sum + item.rate, 0) / items.length : 0;
  return { average, items };
};

/**
 * 최고 스트릭: the habit with the longest *current* streak as of today. Streaks
 * are anchored to today (not the period), matching the habit screen's meaning.
 */
export const periodBestStreak = (habits: Habit[], today: string): StreakHighlight | null => {
  let best: StreakHighlight | null = null;
  for (const habit of habits) {
    const streak = habitStreak(habit, today);
    if (streak <= 0) continue;
    if (!best || streak > best.streak) {
      best = { habitId: habit.id, title: habit.title, emoji: habit.emoji, streak };
    }
  }
  return best;
};

/** 가장 많이 밀린 작업: incomplete period task overdue (endDate < today) the longest. */
export const periodMostSlipped = (
  tasks: Task[],
  type: GoalPeriodType,
  periodKey: string,
  today: string,
): SlippedHighlight | null => {
  const range = rangeForGoalPeriod(type, periodKey);
  const periodTasks = tasksInRange(tasks, range.start, range.end);
  let worst: SlippedHighlight | null = null;
  for (const task of periodTasks) {
    if (task.isCompleted || task.endDate >= today) continue;
    const overdueDays = daysBetween(task.endDate, today);
    if (!worst || overdueDays > worst.overdueDays) worst = { task, overdueDays };
  }
  return worst;
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
