"use client";

import {
  daysInMonth,
  formatTime,
  isoOf,
  monthCalendar,
  parseISO,
  weekdayLabels,
  weekdayOfISO,
} from "@/lib/date";
import type { Category, Task } from "@/types/domain";
import { CatDot, CircleCheck, IconButton } from "./primitives";
import { tasksInRange, tasksOnDate } from "./selectors";
import { useJustDo } from "./store";
import { categoryStyle, sortedCategories, tokens, type ThemeMode } from "./tokens";

const baseWeekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function HomeScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const { year, month, selectedDate } = s.state.view;
  const selected = parseISO(selectedDate);
  const selectedTasks = tasksOnDate(s.state.tasks, selectedDate);
  const categories = sortedCategories(s.state.categories);
  const grouped = categories
    .map((category) => ({
      category,
      tasks: selectedTasks.filter((task) => task.categoryId === category.id),
    }))
    .filter((group) => group.tasks.length > 0);
  const uncategorizedTasks = selectedTasks.filter((task) => !task.categoryId);

  return (
    <>
      <header className="px-5 pb-2.5 pt-2.5">
        <div className="mb-2.5 flex items-center gap-1 text-[17px] font-extrabold leading-none tracking-[-0.6px]">
          Just Do
          <span className="h-1 w-1 rounded-full" style={{ background: t.accent }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[11px] font-medium tracking-[0.3px]" style={{ color: t.textSecondary }}>
                {year}
              </div>
              <div className="mt-0.5 text-[26px] font-bold leading-none tracking-[-0.8px]">
                {month}
                <span className="ml-0.5 text-[17px] font-semibold" style={{ color: t.textSecondary }}>
                  월
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconButton onClick={() => s.moveMonth(-1)} aria-label="이전 달">
                <svg width="8" height="14" viewBox="0 0 8 14" opacity=".6">
                  <path d="M6 1L1 7l5 6" stroke={t.text} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <IconButton onClick={() => s.moveMonth(1)} aria-label="다음 달">
                <svg width="8" height="14" viewBox="0 0 8 14">
                  <path d="M2 1l5 6-5 6" stroke={t.text} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => s.setDark(!s.state.view.dark)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
              style={{ background: t.surface, borderColor: t.divider, color: t.text }}
            >
              {mode === "dark" ? "☾" : "☼"}
            </button>
            <button
              type="button"
              onClick={() => s.openAddSheet({ date: selectedDate })}
              className="flex h-8 w-8 items-center justify-center rounded-full pb-0.5 text-[22px] font-light text-white"
              style={{ background: t.accent }}
              aria-label="추가"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <Calendar mode={mode} />

      <section className="mx-3.5 mt-3 max-h-[360px] overflow-auto rounded-[20px] px-4 pb-[100px] pt-3.5" style={{ background: t.surface }}>
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full" style={{ background: t.dividerStrong }} />
        <div className="mb-1 flex items-baseline gap-2">
          <h2 className="text-[18px] font-bold tracking-[-0.4px]">
            {selected.month}월 {selected.day}일
          </h2>
          <p className="text-xs font-medium" style={{ color: t.textSecondary }}>
            {baseWeekdayLabels[weekdayOfISO(selectedDate)]}요일
          </p>
          <span className="flex-1" />
          <span className="text-[11px] font-medium" style={{ color: t.textTertiary }}>
            {selectedTasks.length}개
          </span>
        </div>

        {grouped.map(({ category, tasks }) => (
          <TaskGroup key={category.id} category={category} tasks={tasks} mode={mode} />
        ))}
        {uncategorizedTasks.length ? (
          <TaskGroup category={null} tasks={uncategorizedTasks} mode={mode} />
        ) : null}
      </section>
    </>
  );
}

function Calendar({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const { year, month, selectedDate } = s.state.view;
  const { weekStart } = s.state.settings;
  const cells = monthCalendar(year, month, weekStart);
  const days = daysInMonth(year, month);
  const labels = weekdayLabels(weekStart);
  const monthStart = isoOf(year, month, 1);
  const monthEnd = isoOf(year, month, days);
  const bars = tasksInRange(s.state.tasks, monthStart, monthEnd).filter((task) => task.startDate !== task.endDate);
  const categoryById = new Map(s.state.categories.map((category) => [category.id, category]));
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <div className="px-3.5">
      <div className="mb-1 grid grid-cols-7">
        {labels.map((label) => (
          <div
            key={label}
            className="pb-1.5 text-center text-[11px] font-medium tracking-[0.2px]"
            style={{ color: label === "일" ? t.ext.solid : label === "토" ? t.me.solid : t.textTertiary }}
          >
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => {
        const weekBars = bars
          .map((task) => {
            let startCol = -1;
            let endCol = -1;
            week.forEach((cell, index) => {
              if (!cell.muted && cell.iso >= task.startDate && cell.iso <= task.endDate) {
                if (startCol === -1) startCol = index;
                endCol = index;
              }
            });
            if (startCol === -1) return null;
            return { ...task, startCol, endCol, lane: bars.findIndex((b) => b.id === task.id) % 2 };
          })
          .filter(Boolean);
        return (
          <div key={weekIndex} className="relative grid min-h-[66px] grid-cols-7 border-t" style={{ borderColor: t.divider }}>
            {week.map((cell, index) => {
              const selected = cell.iso === selectedDate;
              const dots = cell.iso ? tasksOnDate(s.state.tasks, cell.iso).filter((task) => task.startDate === task.endDate) : [];
              return (
                <button
                  key={`${weekIndex}-${index}`}
                  type="button"
                  disabled={cell.muted}
                  onClick={() => s.selectDate(cell.iso)}
                  className="flex flex-col items-center px-1 py-1.5"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                    style={{
                      background: selected ? t.accent : "transparent",
                      color: selected ? "#fff" : cell.muted ? t.textTertiary : t.text,
                      fontWeight: selected ? 600 : 500,
                    }}
                  >
                    {cell.muted ? "" : cell.day}
                  </span>
                  <span className="mt-0.5 flex h-1 gap-0.5">
                    {Array.from(new Set(dots.map((task) => task.categoryId)))
                      .slice(0, 3)
                      .map((categoryId) => (
                        <CatDot
                          key={categoryId ?? "none"}
                          category={categoryId ? categoryById.get(categoryId) : null}
                          mode={mode}
                          size={4}
                        />
                      ))}
                  </span>
                </button>
              );
            })}
            <div className="pointer-events-none absolute left-0 right-0 top-8">
              {weekBars.map((task) => {
                if (!task) return null;
                return (
                  <div
                    key={`${task.id}-${weekIndex}`}
                    className="absolute flex h-3.5 items-center overflow-hidden whitespace-nowrap rounded px-1.5 text-[10px] font-semibold"
                    style={{
                      left: `calc(${(task.startCol / 7) * 100}% + 2px)`,
                      width: `calc(${((task.endCol - task.startCol + 1) / 7) * 100}% - 4px)`,
                      top: task.lane * 16,
                      background: categoryStyle(categoryById.get(task.categoryId ?? ""), mode).soft,
                      color: categoryStyle(categoryById.get(task.categoryId ?? ""), mode).ink,
                    }}
                  >
                    {task.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskGroup({ category, tasks, mode }: { category: Category | null; tasks: Task[]; mode: ThemeMode }) {
  return (
    <div className="mt-3.5">
      <GroupTitle category={category} count={tasks.length} mode={mode} />
      {tasks.map((task, index) => (
        <TaskRow key={task.id} task={task} mode={mode} last={index === tasks.length - 1} />
      ))}
    </div>
  );
}

function GroupTitle({ category, count, mode }: { category: Category | null; count: number; mode: ThemeMode }) {
  const t = tokens[mode];
  const c = categoryStyle(category, mode);
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <span className="h-3 w-[3px] rounded-sm" style={{ background: c.solid }} />
      <span className="text-xs font-semibold tracking-[0.2px]" style={{ color: c.ink }}>
        [{category?.name ?? "미분류"}]
      </span>
      <span className="ml-0.5 text-[11px]" style={{ color: t.textTertiary }}>
        {count}
      </span>
    </div>
  );
}

function TaskRow({ task, mode, last }: { task: Task; mode: ThemeMode; last: boolean }) {
  const s = useJustDo();
  const t = tokens[mode];
  const category = s.state.categories.find((item) => item.id === task.categoryId) ?? null;
  const isRange = task.startDate !== task.endDate;
  const start = parseISO(task.startDate);
  const end = parseISO(task.endDate);
  const detail = isRange ? `${start.month}/${start.day} - ${end.month}/${end.day}` : formatTime(task.scheduledTime);
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: last ? "none" : `0.5px solid ${t.divider}` }}>
      <button type="button" onClick={() => s.toggleTask(task.id)}>
        <CircleCheck checked={task.isCompleted} category={category} mode={mode} />
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => s.openDetail(task.id)}>
        <div
          className="flex items-center gap-1.5 text-[15px] font-medium tracking-[-0.2px]"
          style={{
            color: task.isCompleted ? t.textTertiary : t.text,
            textDecoration: task.isCompleted ? "line-through" : "none",
          }}
        >
          {task.title}
          {task.priority === "high" ? (
            <span className="rounded-[3px] px-1 text-[9px] font-bold" style={{ color: t.ext.ink, background: t.ext.soft }}>
              !
            </span>
          ) : null}
        </div>
      </button>
      <span className="text-xs tracking-[-0.1px]" style={{ color: t.textSecondary }}>
        {detail}
      </span>
    </div>
  );
}
