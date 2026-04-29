"use client";

import { addDays, parseISO, weekdayOfISO } from "@/lib/date";
import { CircleCheck } from "./primitives";
import { habitStreak } from "./selectors";
import { useJustDo } from "./store";
import { tokens, type ThemeMode } from "./tokens";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function HabitScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const selectedDate = s.state.view.selectedDate;
  const selected = parseISO(selectedDate);
  const days7 = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 6));
  const doneToday = s.state.habits.filter((habit) => habit.log[selectedDate]).length;
  const completionRate = s.state.habits.length
    ? Math.round((doneToday / s.state.habits.length) * 100)
    : 0;

  return (
    <div className="h-[calc(100%-54px)] overflow-auto px-5 pb-[100px] pt-3">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-none tracking-[-0.6px]">Habit</h1>
          <p className="mt-1.5 text-xs font-medium" style={{ color: t.textSecondary }}>
            {selected.month}월 {selected.day}일 {weekdayLabels[weekdayOfISO(selectedDate)]}요일
          </p>
        </div>
        <button
          type="button"
          onClick={() => s.openAddSheet({ date: selectedDate, initialType: "habit" })}
          className="flex h-9 w-9 items-center justify-center rounded-full pb-0.5 text-[23px] font-light text-white"
          style={{ background: t.habit.solid }}
          aria-label="습관 추가"
        >
          +
        </button>
      </header>

      <section className="mb-4 rounded-[14px] px-4 py-3.5" style={{ background: t.surface }}>
        <div className="mb-1 text-[11px] font-semibold tracking-[0.3px]" style={{ color: t.habit.ink }}>
          DAILY CHECK
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tracking-[-1px]">{doneToday}</span>
          <span className="text-[13px] font-medium" style={{ color: t.textSecondary }}>
            / {s.state.habits.length}개 완료
          </span>
          <span className="flex-1" />
          <span className="text-lg font-bold" style={{ color: t.habit.ink }}>
            {completionRate}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: t.surfaceAlt }}>
          <div className="h-full rounded-full" style={{ width: `${completionRate}%`, background: t.habit.solid }} />
        </div>
      </section>

      <SectionTitle mode={mode}>TODAY</SectionTitle>
      <section className="mb-4 rounded-2xl px-4 py-1" style={{ background: t.surface }}>
        {s.state.habits.length ? (
          s.state.habits.map((habit, index) => {
            const done = Boolean(habit.log[selectedDate]);
            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: index === s.state.habits.length - 1 ? "none" : `0.5px solid ${t.divider}` }}
              >
                <button type="button" onClick={() => s.toggleHabit(habit.id, selectedDate)} aria-label={`${habit.title} 완료`}>
                  <CircleCheck checked={done} category="habit" mode={mode} />
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium tracking-[-0.2px]"
                    style={{
                      color: done ? t.textTertiary : t.text,
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    <span>{habit.emoji}</span>
                    <span className="truncate">{habit.title}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium" style={{ color: t.habit.ink }}>
                    {habitStreak(habit, selectedDate)}일째
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-[13px] font-medium" style={{ color: t.textTertiary }}>
            등록된 습관이 없습니다.
          </div>
        )}
      </section>

      <SectionTitle mode={mode}>LAST 7 DAYS</SectionTitle>
      <section className="rounded-2xl p-4" style={{ background: t.surface }}>
        <div className="mb-3 grid grid-cols-[92px_repeat(7,minmax(0,1fr))_36px] items-center gap-1">
          <div />
          {days7.map((day) => (
            <div key={day} className="text-center text-[10px] font-semibold" style={{ color: t.textTertiary }}>
              {weekdayLabels[weekdayOfISO(day)]}
            </div>
          ))}
          <div />
        </div>
        {s.state.habits.map((habit) => {
          const doneDays = days7.map((day) => Boolean(habit.log[day]));
          const rate = Math.round((doneDays.filter(Boolean).length / 7) * 100);
          return (
            <div key={habit.id} className="mb-2 grid grid-cols-[92px_repeat(7,minmax(0,1fr))_36px] items-center gap-1 last:mb-0">
              <div className="min-w-0 truncate text-xs font-medium" style={{ color: t.textSecondary }}>
                {habit.emoji} {habit.title}
              </div>
              {doneDays.map((done, index) => (
                <button
                  key={days7[index]}
                  type="button"
                  onClick={() => s.toggleHabit(habit.id, days7[index])}
                  className="h-6 rounded"
                  style={{ background: done ? t.habit.solid : t.surfaceAlt }}
                  aria-label={`${habit.title} ${days7[index]} 기록`}
                />
              ))}
              <div className="text-right text-[11px] font-bold" style={{ color: t.habit.ink }}>
                {rate}%
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SectionTitle({ children, mode }: { children: React.ReactNode; mode: ThemeMode }) {
  return (
    <div className="mb-2 text-[11px] font-bold tracking-[0.6px]" style={{ color: tokens[mode].textTertiary }}>
      {children}
    </div>
  );
}
