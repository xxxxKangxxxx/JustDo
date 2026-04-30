"use client";

import { addDays } from "@/lib/date";
import { CatDot } from "./primitives";
import { habitActiveOn, habitStreak, tasksInRange } from "./selectors";
import { useJustDo } from "./store";
import { categoryStyle, sortedCategories, tokens, type ThemeMode } from "./tokens";

export function StatsScreen({ mode, onBack }: { mode: ThemeMode; onBack?: () => void }) {
  const s = useJustDo();
  const t = tokens[mode];
  const start = `${s.state.view.year}-${String(s.state.view.month).padStart(2, "0")}-01`;
  const end = `${s.state.view.year}-${String(s.state.view.month).padStart(2, "0")}-31`;
  const tasks = tasksInRange(s.state.tasks, start, end);
  const doneCount = tasks.filter((task) => task.isCompleted).length;
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(s.state.view.selectedDate, i - 6));
  const taskRate = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const activeTodayHabits = s.state.habits.filter((habit) => habitActiveOn(habit, s.state.view.selectedDate));
  const todayHabitDone = activeTodayHabits.filter((habit) => habit.log[s.state.view.selectedDate]).length;
  const habitChecks7 = s.state.habits.reduce(
    (total, habit) => total + days7.filter((day) => habitActiveOn(habit, day) && habit.log[day]).length,
    0,
  );
  const habitSlots7 = s.state.habits.reduce(
    (total, habit) => total + days7.filter((day) => habitActiveOn(habit, day)).length,
    0,
  );
  const habitRate7 = habitSlots7 ? Math.round((habitChecks7 / habitSlots7) * 100) : 0;
  const topStreaks = [...s.state.habits]
    .sort((a, b) => habitStreak(b, s.state.view.selectedDate) - habitStreak(a, s.state.view.selectedDate))
    .slice(0, 3);

  return (
    <div className="h-[calc(100%-54px)] overflow-auto px-5 pb-[100px] pt-3">
      <header className="mb-4 flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: t.surface, color: t.text }}
            aria-label="뒤로"
          >
            <svg width="8" height="14" viewBox="0 0 8 14">
              <path d="M6 1L1 7l5 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        <h1 className="text-[28px] font-bold tracking-[-0.6px]">활동 요약</h1>
      </header>

      <section className="mb-[18px] rounded-[14px] px-4 py-3.5" style={{ background: t.surface }}>
        <div className="mb-1 text-[11px] font-semibold tracking-[0.3px]" style={{ color: t.me.ink }}>
          {s.state.view.year}년 {s.state.view.month}월
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SummaryMetric label="Task 완료" value={`${doneCount}/${tasks.length}`} mode={mode} />
          <SummaryMetric label="Task 완료율" value={`${taskRate}%`} mode={mode} />
          <SummaryMetric label="오늘 Habit" value={`${todayHabitDone}/${activeTodayHabits.length}`} mode={mode} />
        </div>
      </section>

      <SectionTitle mode={mode}>TASK</SectionTitle>
      <section className="mb-3.5 rounded-2xl p-4" style={{ background: t.surface }}>
        {sortedCategories(s.state.categories).map((category) => {
          const items = tasks.filter((task) => task.categoryId === category.id);
          const done = items.filter((task) => task.isCompleted).length;
          const total = Math.max(items.length, 1);
          const rate = Math.round((done / total) * 100);
          const c = categoryStyle(category, mode);
          return (
            <div key={category.id} className="mb-2.5">
              <div className="mb-1 flex items-center text-xs">
                <CatDot category={category} mode={mode} size={7} />
                <span className="ml-1.5 font-semibold">[{category.name}]</span>
                <span className="flex-1" />
                <span style={{ color: t.textSecondary }}>{done} / {items.length}</span>
                <span className="ml-2.5 min-w-8 text-right font-bold" style={{ color: c.ink }}>{rate}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: t.surfaceAlt }}>
                <div className="h-full rounded-full" style={{ width: `${rate}%`, background: c.solid }} />
              </div>
            </div>
          );
        })}
      </section>

      <SectionTitle mode={mode}>HABIT</SectionTitle>
      <section className="rounded-2xl p-4" style={{ background: t.surface }}>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <SummaryMetric label="활성 습관" value={`${s.state.habits.length}`} mode={mode} />
          <SummaryMetric label="7일 체크" value={`${habitChecks7}/${habitSlots7}`} mode={mode} />
          <SummaryMetric label="7일 완료율" value={`${habitRate7}%`} mode={mode} />
        </div>
        {topStreaks.map((habit, index) => (
          <div
            key={habit.id}
            className="flex items-center gap-2 py-2.5"
            style={{ borderTop: index === 0 ? `0.5px solid ${t.divider}` : "none" }}
          >
            <span className="text-lg">{habit.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: t.text }}>
              {habit.title}
            </span>
            <span className="text-[13px] font-bold" style={{ color: t.habit.ink }}>
              {habitStreak(habit, s.state.view.selectedDate)}일
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function SummaryMetric({ label, value, mode }: { label: string; value: string; mode: ThemeMode }) {
  const t = tokens[mode];
  return (
    <div className="rounded-xl px-2.5 py-3 text-center" style={{ background: t.surfaceAlt }}>
      <div className="mb-1 text-[10px] font-semibold" style={{ color: t.textTertiary }}>
        {label}
      </div>
      <div className="text-lg font-bold tracking-[-0.3px]" style={{ color: t.text }}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children, mode }: { children: React.ReactNode; mode: ThemeMode }) {
  return <div className="mb-2 text-[11px] font-bold tracking-[0.6px]" style={{ color: tokens[mode].textTertiary }}>{children}</div>;
}
