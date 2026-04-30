"use client";

import { useState } from "react";
import { addDays, formatTime, parseISO, weekdayOfISO } from "@/lib/date";
import type { Habit, HabitRecurType } from "@/types/domain";
import { CatTag, CircleCheck } from "./primitives";
import { habitActiveOn } from "./selectors";
import { useJustDo } from "./store";
import { categoryStyle, tokens, type ThemeMode } from "./tokens";

const habitEmojis = ["🌱", "💧", "🏃", "📖", "🧘", "✏️"] as const;
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function DetailScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const task = s.state.tasks.find((item) => item.id === s.state.view.detailTaskId);
  const habit = s.state.habits.find((item) => item.id === s.state.view.detailHabitId);
  const open = Boolean(task || habit);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col transition-transform"
      style={{
        background: t.bg,
        transform: open ? "translateX(0)" : "translateX(105%)",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {task ? <TaskDetail mode={mode} taskId={task.id} /> : null}
      {habit ? <HabitDetail key={habit.id} mode={mode} habit={habit} /> : null}
    </div>
  );
}

function TaskDetail({ mode, taskId }: { mode: ThemeMode; taskId: string }) {
  const s = useJustDo();
  const t = tokens[mode];
  const task = s.state.tasks.find((item) => item.id === taskId);
  if (!task) return null;
  const category = s.state.categories.find((item) => item.id === task.categoryId) ?? null;
  const taskCategoryStyle = categoryStyle(category, mode);

  return (
    <>
      <DetailHeader title="Task" mode={mode} onBack={s.closeDetail} rightLabel="편집" onRight={() => s.openAddSheet({ taskId: task.id })} />
      <div className="flex-1 overflow-auto px-5 pb-[100px] pt-3">
        <div className="mb-3.5 flex items-center gap-3">
          <button type="button" onClick={() => s.toggleTask(task.id)}>
            <CircleCheck checked={task.isCompleted} category={category} mode={mode} size={28} />
          </button>
          <h1 className="flex-1 text-[22px] font-bold tracking-[-0.5px]" style={{ textDecoration: task.isCompleted ? "line-through" : "none", opacity: task.isCompleted ? 0.5 : 1 }}>
            {task.title}
          </h1>
        </div>
        <div className="mb-[18px] flex flex-wrap gap-1.5">
          <CatTag category={category} mode={mode} />
          <Chip mode={mode}>{dateText(task.startDate, task.endDate)}</Chip>
          {task.scheduledTime ? <Chip mode={mode}>{formatTime(task.scheduledTime)}</Chip> : null}
          {task.priority ? <Chip mode={mode}>{priorityText(task.priority)}</Chip> : null}
        </div>
        <Card title="태그" mode={mode}>
          <div className="flex flex-wrap gap-1.5">
            {task.tags.length ? task.tags.map((tag) => <span key={tag} className="rounded-md px-2 py-1 text-xs font-medium" style={{ color: taskCategoryStyle.ink, background: taskCategoryStyle.soft }}>{tag}</span>) : <span style={{ color: t.textTertiary }}>태그 없음</span>}
          </div>
        </Card>
        <Card title="기간" mode={mode}>
          <div className="text-sm font-medium">{dateText(task.startDate, task.endDate)}</div>
        </Card>
        <button type="button" onClick={() => s.deleteTask(task.id)} className="mt-3.5 block w-full rounded-[14px] p-3.5 text-center text-[15px] font-medium" style={{ background: t.surface, color: t.ext.ink }}>
          Task 삭제
        </button>
      </div>
    </>
  );
}

function HabitDetail({ mode, habit }: { mode: ThemeMode; habit: Habit }) {
  const s = useJustDo();
  const t = tokens[mode];
  const [titleDraft, setTitleDraft] = useState(habit.title);
  const days = Array.from({ length: 14 }, (_, index) => addDays(s.state.view.selectedDate, index - 13));

  const commitTitle = () => {
    const title = titleDraft.trim();
    if (title && title !== habit.title) s.updateHabit(habit.id, { title });
    else setTitleDraft(habit.title);
  };

  const updateRecurType = (recurType: HabitRecurType) => {
    s.updateHabit(habit.id, {
      recurType,
      recurDays: recurType === "weekly" ? habit.recurDays?.length ? habit.recurDays : [weekdayOfISO(s.state.view.selectedDate)] : undefined,
    });
  };

  return (
    <>
      <DetailHeader title="Habit" mode={mode} onBack={s.closeDetail} />
      <div className="flex-1 overflow-auto px-5 pb-[100px] pt-3">
        <Card title="기본 정보" mode={mode}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{habit.emoji}</span>
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="min-w-0 flex-1 bg-transparent text-[20px] font-bold tracking-[-0.4px] outline-none"
              style={{ color: t.text }}
              aria-label="습관 제목"
            />
          </div>
        </Card>

        <Card title="이모지" mode={mode}>
          <div className="flex gap-1.5">
            {habitEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => s.updateHabit(habit.id, { emoji })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                style={{ background: habit.emoji === emoji ? t.habit.soft : "transparent", border: habit.emoji === emoji ? "none" : `0.5px solid ${t.divider}` }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Card>

        <Card title="반복" mode={mode}>
          <div className="flex flex-col gap-3">
            <Segment
              options={[["daily", "매일"], ["weekly", "요일"]]}
              value={habit.recurType}
              onChange={(value) => updateRecurType(value as HabitRecurType)}
              mode={mode}
            />
            {habit.recurType === "weekly" ? (
              <WeekdayPicker
                value={habit.recurDays ?? []}
                onChange={(recurDays) => s.updateHabit(habit.id, { recurType: "weekly", recurDays })}
                mode={mode}
              />
            ) : null}
          </div>
        </Card>

        <Card title="알림" mode={mode}>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={habit.reminderTime ?? ""}
              onChange={(event) => s.updateHabit(habit.id, { reminderTime: event.target.value || null })}
              className="bg-transparent text-sm font-medium outline-none"
              style={{ color: t.text }}
              aria-label="습관 알림 시간"
            />
            {habit.reminderTime ? (
              <button type="button" onClick={() => s.updateHabit(habit.id, { reminderTime: null })} className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                해제
              </button>
            ) : null}
          </div>
        </Card>

        <Card title="최근 기록" mode={mode}>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const active = habitActiveOn(habit, day);
              const checked = Boolean(habit.log[day]);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!active}
                  onClick={() => s.toggleHabit(habit.id, day)}
                  className="flex h-11 flex-col items-center justify-center rounded-lg text-[10px] font-semibold"
                  style={{
                    background: checked ? t.habit.solid : t.surfaceAlt,
                    color: checked ? "#fff" : t.textSecondary,
                    opacity: active ? 1 : 0.35,
                  }}
                >
                  <span>{weekdayLabels[weekdayOfISO(day)]}</span>
                  <span>{parseISO(day).day}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <button type="button" onClick={() => s.deleteHabit(habit.id)} className="mt-3.5 block w-full rounded-[14px] p-3.5 text-center text-[15px] font-medium" style={{ background: t.surface, color: t.ext.ink }}>
          Habit 삭제
        </button>
      </div>
    </>
  );
}

function DetailHeader({
  title,
  mode,
  onBack,
  rightLabel,
  onRight,
}: {
  title: string;
  mode: ThemeMode;
  onBack: () => void;
  rightLabel?: string;
  onRight?: () => void;
}) {
  const t = tokens[mode];
  return (
    <div className="flex h-[54px] items-end justify-between px-5 pb-2">
      <button type="button" onClick={onBack} className="text-[15px] font-medium" style={{ color: t.accent }}>
        홈
      </button>
      <div className="text-[15px] font-semibold">{title}</div>
      {rightLabel ? (
        <button type="button" onClick={onRight} className="text-[15px] font-semibold" style={{ color: t.accent }}>
          {rightLabel}
        </button>
      ) : (
        <span className="w-[31px]" />
      )}
    </div>
  );
}

function Card({ title, mode, children }: { title: string; mode: ThemeMode; children: React.ReactNode }) {
  const t = tokens[mode];
  return (
    <section className="mb-2.5 rounded-[14px] px-3.5 py-3" style={{ background: t.surface }}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: t.textTertiary }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Segment({
  options,
  value,
  onChange,
  mode,
}: {
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
  mode: ThemeMode;
}) {
  const t = tokens[mode];
  return (
    <div className="flex gap-1.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="rounded-[7px] px-2.5 py-1 text-xs font-semibold"
          style={{
            background: value === key ? t.habit.soft : "transparent",
            color: value === key ? t.habit.ink : t.textSecondary,
            border: value === key ? "none" : `0.5px solid ${t.divider}`,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function WeekdayPicker({
  value,
  onChange,
  mode,
}: {
  value: number[];
  onChange: (value: number[]) => void;
  mode: ThemeMode;
}) {
  const t = tokens[mode];
  const toggle = (day: number) => {
    const selected = value.includes(day);
    if (selected && value.length === 1) return;
    onChange(
      selected
        ? value.filter((current) => current !== day)
        : [...value, day].sort((a, b) => a - b),
    );
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {weekdayLabels.map((label, day) => {
        const selected = value.includes(day);
        return (
          <button
            key={label}
            type="button"
            onClick={() => toggle(day)}
            className="h-8 rounded-[7px] text-xs font-semibold"
            style={{
              background: selected ? t.habit.soft : "transparent",
              color: selected ? t.habit.ink : t.textSecondary,
              border: selected ? "none" : `0.5px solid ${t.divider}`,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const t = tokens[mode];
  return (
    <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold" style={{ color: t.textSecondary, background: t.surfaceAlt, border: `0.5px solid ${t.divider}` }}>
      {children}
    </span>
  );
}

function dateText(startISO: string, endISO: string) {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  return startISO === endISO ? `${start.month}/${start.day}` : `${start.month}/${start.day} - ${end.month}/${end.day}`;
}

function priorityText(priority: string) {
  return priority === "high" ? "높음" : priority === "low" ? "낮음" : "중간";
}
