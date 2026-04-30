"use client";

import { useEffect, useMemo, useState } from "react";
import { weekdayOfISO } from "@/lib/date";
import type { HabitRecurType, Priority } from "@/types/domain";
import { useJustDo } from "./store";
import { mergeTags, parseTagInput } from "./tags";
import { categoryStyle, sortedCategories, tokens, type ThemeMode } from "./tokens";

export function AddSheet({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const categories = useMemo(() => sortedCategories(s.state.categories), [s.state.categories]);
  const sheet = s.state.view.sheet;
  const open = sheet?.kind === "add";
  const editTask = sheet?.taskId ? s.state.tasks.find((task) => task.id === sheet.taskId) : null;
  const initDate = sheet?.date ?? s.state.view.selectedDate;
  const initialType = sheet?.initialType ?? "task";
  const [type, setType] = useState<"task" | "habit">(initialType);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(initDate);
  const [endDate, setEndDate] = useState(initDate);
  const [scheduledTime, setScheduledTime] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [recurType, setRecurType] = useState<HabitRecurType>("daily");
  const [recurDays, setRecurDays] = useState<number[]>([weekdayOfISO(initDate)]);
  const [habitReminderTime, setHabitReminderTime] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editTask) {
      // The sheet form is intentionally reset from the selected task/date whenever
      // a new sheet session opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType("task");
      setTitle(editTask.title);
      setStartDate(editTask.startDate);
      setEndDate(editTask.endDate);
      setScheduledTime(editTask.scheduledTime ?? "");
      setCategoryId(editTask.categoryId);
      setPriority(editTask.priority ?? "medium");
      setTags(editTask.tags ?? []);
      setTagDraft("");
    } else {
      setType(initialType);
      setTitle("");
      setStartDate(initDate);
      setEndDate(initDate);
      setScheduledTime("");
      setCategoryId(categories[0]?.id ?? null);
      setPriority("medium");
      setTags([]);
      setTagDraft("");
      setEmoji("🌱");
      setRecurType("daily");
      setRecurDays([weekdayOfISO(initDate)]);
      setHabitReminderTime("");
    }
  }, [categories, editTask, initDate, initialType, open]);

  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? categories[0] ?? null;
  const selectedCategoryStyle = categoryStyle(selectedCategory, mode);

  const updateStartDate = (value: string) => {
    setStartDate(value);
    setEndDate((current) => (current < value ? value : current));
  };

  const updateEndDate = (value: string) => {
    setEndDate(value < startDate ? startDate : value);
  };

  const commitTagDraft = (raw: string) => {
    const next = parseTagInput(raw);
    if (!next.length) {
      setTagDraft("");
      return;
    }
    setTags((current) => mergeTags(current, next));
    setTagDraft("");
  };

  const onTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTagDraft(tagDraft);
      return;
    }
    if (event.key === "Backspace" && tagDraft.length === 0 && tags.length > 0) {
      event.preventDefault();
      setTags((current) => current.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((existing) => existing !== tag));
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const safeEndDate = endDate < startDate ? startDate : endDate;
    const finalTags = mergeTags(tags, parseTagInput(tagDraft));
    if (type === "habit") {
      const finalRecurDays =
        recurType === "weekly"
          ? recurDays.length
            ? [...recurDays].sort((a, b) => a - b)
            : [weekdayOfISO(initDate)]
          : undefined;
      s.addHabit({
        title: trimmed,
        emoji,
        recurType,
        recurDays: finalRecurDays,
        reminderTime: habitReminderTime || null,
      });
    } else if (editTask) {
      s.updateTask(editTask.id, {
        title: trimmed,
        startDate,
        endDate: safeEndDate,
        scheduledTime: scheduledTime || null,
        categoryId: selectedCategory?.id ?? null,
        priority,
        tags: finalTags,
      });
    } else {
      s.addTask({
        title: trimmed,
        startDate,
        endDate: safeEndDate,
        scheduledTime: scheduledTime || null,
        categoryId: selectedCategory?.id ?? null,
        priority,
        tags: finalTags,
      });
    }
    s.closeSheet();
  };

  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        onClick={s.closeSheet}
        className="absolute inset-0 z-[70] transition"
        style={{
          background: "rgba(15,12,8,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 z-[71] max-h-[78%] overflow-auto rounded-t-[22px] px-5 pb-8 pt-2.5 shadow-2xl transition-transform"
        style={{
          background: t.surface,
          transform: open ? "translateY(0)" : "translateY(105%)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: t.dividerStrong }} />
        {!editTask ? (
          <div className="mb-[18px] flex gap-1 rounded-[10px] p-[3px]" style={{ background: t.surfaceAlt }}>
            {(["task", "habit"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className="flex-1 rounded-lg py-1.5 text-[13px] font-semibold"
                style={{
                  background: type === option ? t.surface : "transparent",
                  color: type === option ? t.text : t.textSecondary,
                }}
              >
                {option === "task" ? "Task" : "Habit"}
              </button>
            ))}
          </div>
        ) : null}
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={type === "task" ? "무엇을 할까요?" : "어떤 습관을?"}
          className="w-full border-0 bg-transparent pb-3.5 text-xl font-semibold tracking-[-0.4px] outline-none"
          style={{ color: t.text, borderBottom: `0.5px solid ${t.divider}` }}
        />
        {type === "task" ? (
          <>
            <Field label="시작" mode={mode}>
              <input type="date" value={startDate} onChange={(event) => updateStartDate(event.target.value)} className="bg-transparent text-[13px] font-medium outline-none" style={{ color: t.text }} />
            </Field>
            <Field label="종료" mode={mode}>
              <input type="date" min={startDate} value={endDate} onChange={(event) => updateEndDate(event.target.value)} className="bg-transparent text-[13px] font-medium outline-none" style={{ color: t.text }} />
            </Field>
            <Field label="시간" mode={mode}>
              <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="bg-transparent text-[13px] font-medium outline-none" style={{ color: t.text }} />
            </Field>
            <Field label="카테고리" mode={mode}>
              <CategorySelector
                categories={categories}
                value={selectedCategory?.id ?? null}
                onChange={setCategoryId}
                mode={mode}
              />
            </Field>
            <Field label="우선순위" mode={mode}>
              <Segment options={[["high", "높음"], ["medium", "중간"], ["low", "낮음"]]} value={priority} onChange={(v) => setPriority(v as Priority)} mode={mode} color={selectedCategoryStyle} />
            </Field>
            <Field label="태그" mode={mode} noBorder align="start">
              <div className="flex w-full flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`태그 ${tag} 삭제`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                    style={{ background: selectedCategoryStyle.soft, color: selectedCategoryStyle.ink }}
                  >
                    <span>{tag}</span>
                    <span aria-hidden style={{ color: selectedCategoryStyle.ink, opacity: 0.7 }}>×</span>
                  </button>
                ))}
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => commitTagDraft(tagDraft)}
                  placeholder={tags.length ? "" : "태그 추가"}
                  className="min-w-[80px] flex-1 bg-transparent py-1 text-[13px] font-medium outline-none"
                  style={{ color: t.text }}
                />
              </div>
            </Field>
          </>
        ) : (
          <Field label="이모지" mode={mode} noBorder>
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5">
                {["🌱", "💧", "🏃", "📖", "🧘", "✏️"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEmoji(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                    style={{ background: emoji === item ? t.habit.soft : "transparent", border: emoji === item ? "none" : `0.5px solid ${t.divider}` }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Segment
                options={[["daily", "매일"], ["weekly", "요일"]]}
                value={recurType}
                onChange={(value) => setRecurType(value as HabitRecurType)}
                mode={mode}
                color={t.habit}
              />
              {recurType === "weekly" ? (
                <WeekdayPicker value={recurDays} onChange={setRecurDays} mode={mode} />
              ) : null}
              <input
                type="time"
                value={habitReminderTime}
                onChange={(event) => setHabitReminderTime(event.target.value)}
                className="w-fit bg-transparent text-[13px] font-medium outline-none"
                style={{ color: t.text }}
                aria-label="습관 알림 시간"
              />
            </div>
          </Field>
        )}
        <div className="mt-[18px] flex items-center gap-2.5">
          {editTask ? (
            <button type="button" onClick={() => s.deleteTask(editTask.id)} className="text-[13px] font-medium" style={{ color: t.ext.ink }}>
              삭제
            </button>
          ) : null}
          <span className="flex-1" />
          <button type="button" onClick={s.closeSheet} className="px-3.5 py-2.5 text-[13px] font-medium" style={{ color: t.textSecondary }}>
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-xl px-[22px] py-2.5 text-sm font-semibold text-white"
            style={{ background: title.trim() ? t.accent : t.dividerStrong }}
          >
            {editTask ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
  mode,
  noBorder = false,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  mode: ThemeMode;
  noBorder?: boolean;
  align?: "center" | "start";
}) {
  const t = tokens[mode];
  return (
    <div
      className={`flex py-[13px] ${align === "start" ? "items-start" : "items-center"}`}
      style={{ borderBottom: noBorder ? "none" : `0.5px solid ${t.divider}` }}
    >
      <div
        className={`w-[72px] text-xs font-medium tracking-[0.1px] ${align === "start" ? "pt-1.5" : ""}`}
        style={{ color: t.textTertiary }}
      >
        {label}
      </div>
      <div className="flex flex-1 items-center text-[13px]">{children}</div>
    </div>
  );
}

function Segment({
  options,
  value,
  onChange,
  mode,
  color,
}: {
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
  mode: ThemeMode;
  color?: { soft: string; ink: string };
}) {
  const t = tokens[mode];
  const activeColor = color ?? { soft: t.me.soft, ink: t.me.ink };
  return (
    <div className="flex gap-1.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="rounded-[7px] px-2.5 py-1 text-xs font-semibold"
          style={{
            background: value === key ? activeColor.soft : "transparent",
            color: value === key ? activeColor.ink : t.textSecondary,
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
  const labels = ["일", "월", "화", "수", "목", "금", "토"] as const;
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
    <div className="grid w-full grid-cols-7 gap-1">
      {labels.map((label, day) => {
        const selected = value.includes(day);
        return (
          <button
            key={label}
            type="button"
            onClick={() => toggle(day)}
            aria-pressed={selected}
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

function CategorySelector({
  categories,
  value,
  onChange,
  mode,
}: {
  categories: Array<{ id: string; name: string; color: string }>;
  value: string | null;
  onChange: (value: string | null) => void;
  mode: ThemeMode;
}) {
  const t = tokens[mode];
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => {
        const c = categoryStyle(category, mode);
        const selected = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className="rounded-[7px] px-2.5 py-1 text-xs font-semibold"
            style={{
              background: selected ? c.soft : "transparent",
              color: selected ? c.ink : t.textSecondary,
              border: selected ? "none" : `0.5px solid ${t.divider}`,
            }}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
