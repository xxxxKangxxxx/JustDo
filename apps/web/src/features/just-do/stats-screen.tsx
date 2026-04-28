"use client";

import { addDays } from "@/lib/date";
import { CatDot } from "./primitives";
import { habitStreak, tasksInRange } from "./selectors";
import { useJustDo } from "./store";
import { tokens, type ThemeMode } from "./tokens";

export function StatsScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const start = `${s.state.view.year}-${String(s.state.view.month).padStart(2, "0")}-01`;
  const end = `${s.state.view.year}-${String(s.state.view.month).padStart(2, "0")}-31`;
  const tasks = tasksInRange(s.state.tasks, start, end);
  const doneCount = tasks.filter((task) => task.isCompleted).length;
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(s.state.view.selectedDate, i - 6));

  return (
    <div className="h-[calc(100%-54px)] overflow-auto px-5 pb-[100px] pt-3">
      <h1 className="mb-3.5 text-[28px] font-bold tracking-[-0.6px]">통계</h1>
      <section className="mb-[18px] rounded-[14px] px-4 py-3.5" style={{ background: `linear-gradient(135deg, ${t.me.soft}, ${t.habit.soft})` }}>
        <div className="mb-1 text-[11px] font-semibold tracking-[0.3px]" style={{ color: t.me.ink }}>
          {s.state.view.year}년 {s.state.view.month}월
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tracking-[-1px]">{doneCount}</span>
          <span className="text-[13px] font-medium" style={{ color: t.textSecondary }}>
            / {tasks.length}개 완료
          </span>
        </div>
      </section>
      <SectionTitle mode={mode}>TASK</SectionTitle>
      <section className="mb-3.5 rounded-2xl p-4" style={{ background: t.surface }}>
        {(["me", "ext"] as const).map((category) => {
          const items = tasks.filter((task) => task.category === category);
          const done = items.filter((task) => task.isCompleted).length;
          const total = Math.max(items.length, 1);
          const rate = Math.round((done / total) * 100);
          return (
            <div key={category} className="mb-2.5">
              <div className="mb-1 flex items-center text-xs">
                <CatDot category={category} mode={mode} size={7} />
                <span className="ml-1.5 font-semibold">[{category === "me" ? "나" : "외부"}]</span>
                <span className="flex-1" />
                <span style={{ color: t.textSecondary }}>{done} / {items.length}</span>
                <span className="ml-2.5 min-w-8 text-right font-bold" style={{ color: t[category].ink }}>{rate}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: t.surfaceAlt }}>
                <div className="h-full rounded-full" style={{ width: `${rate}%`, background: t[category].solid }} />
              </div>
            </div>
          );
        })}
      </section>
      <SectionTitle mode={mode}>HABIT</SectionTitle>
      <div className="mb-2.5 grid grid-cols-3 gap-2">
        {s.state.habits.slice(0, 3).map((habit) => (
          <div key={habit.id} className="rounded-xl px-2.5 py-3 text-center" style={{ background: t.surface }}>
            <div className="mb-1 text-[22px]">{habit.emoji}</div>
            <div className="mb-0.5 text-[11px] font-medium" style={{ color: t.textSecondary }}>{habit.title}</div>
            <div className="text-xl font-bold tracking-[-0.4px]" style={{ color: t.habit.ink }}>
              {habitStreak(habit, s.state.view.selectedDate)}
              <span className="ml-0.5 text-[10px] font-medium" style={{ color: t.textTertiary }}>일</span>
            </div>
          </div>
        ))}
      </div>
      <section className="rounded-2xl p-4" style={{ background: t.surface }}>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="text-[13px] font-semibold">최근 7일 습관</div>
          <div className="text-[11px]" style={{ color: t.textTertiary }}>7일</div>
        </div>
        {s.state.habits.map((habit) => {
          const dots = days7.map((day) => Boolean(habit.log[day]));
          const rate = Math.round((dots.filter(Boolean).length / 7) * 100);
          return (
            <div key={habit.id} className="mb-2 flex items-center">
              <div className="w-[88px] text-xs font-medium" style={{ color: t.textSecondary }}>{habit.emoji} {habit.title}</div>
              <div className="flex flex-1 gap-1">
                {dots.map((done, index) => (
                  <button key={days7[index]} type="button" onClick={() => s.toggleHabit(habit.id, days7[index])} className="h-5 flex-1 rounded" style={{ background: done ? t.habit.solid : t.surfaceAlt }} />
                ))}
              </div>
              <div className="ml-2.5 min-w-7 text-right text-[11px] font-bold" style={{ color: t.habit.ink }}>{rate}%</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SectionTitle({ children, mode }: { children: React.ReactNode; mode: ThemeMode }) {
  return <div className="mb-2 text-[11px] font-bold tracking-[0.6px]" style={{ color: tokens[mode].textTertiary }}>{children}</div>;
}
