"use client";

import { useEffect, useState } from "react";
import type { Priority, TaskCategory } from "@/types/domain";
import { useJustDo } from "./store";
import { tokens, type ThemeMode } from "./tokens";

export function AddSheet({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const sheet = s.state.view.sheet;
  const open = sheet?.kind === "add";
  const editTask = sheet?.taskId ? s.state.tasks.find((task) => task.id === sheet.taskId) : null;
  const initDate = sheet?.date ?? s.state.view.selectedDate;
  const [type, setType] = useState<"task" | "habit">("task");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(initDate);
  const [endDate, setEndDate] = useState(initDate);
  const [scheduledTime, setScheduledTime] = useState("");
  const [category, setCategory] = useState<TaskCategory>("me");
  const [priority, setPriority] = useState<Priority>("medium");
  const [emoji, setEmoji] = useState("🌱");

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
      setCategory(editTask.category);
      setPriority(editTask.priority ?? "medium");
    } else {
      setType("task");
      setTitle("");
      setStartDate(initDate);
      setEndDate(initDate);
      setScheduledTime("");
      setCategory("me");
      setPriority("medium");
      setEmoji("🌱");
    }
  }, [editTask, initDate, open]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (type === "habit") {
      s.addHabit({ title: trimmed, emoji });
    } else if (editTask) {
      s.updateTask(editTask.id, {
        title: trimmed,
        startDate,
        endDate,
        scheduledTime: scheduledTime || null,
        category,
        priority,
      });
    } else {
      s.addTask({
        title: trimmed,
        startDate,
        endDate,
        scheduledTime: scheduledTime || null,
        category,
        priority,
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
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="bg-transparent text-[13px] font-medium outline-none" style={{ color: t.text }} />
            </Field>
            <Field label="종료" mode={mode}>
              <input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="bg-transparent text-[13px] font-medium outline-none" style={{ color: t.text }} />
            </Field>
            <Field label="시간" mode={mode}>
              <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="bg-transparent text-[13px] font-medium outline-none" style={{ color: t.text }} />
            </Field>
            <Field label="카테고리" mode={mode}>
              <Segment options={[["me", "나"], ["ext", "외부"]]} value={category} onChange={(v) => setCategory(v as TaskCategory)} mode={mode} />
            </Field>
            <Field label="우선순위" mode={mode} noBorder>
              <Segment options={[["high", "높음"], ["medium", "중간"], ["low", "낮음"]]} value={priority} onChange={(v) => setPriority(v as Priority)} mode={mode} category={category} />
            </Field>
          </>
        ) : (
          <Field label="이모지" mode={mode} noBorder>
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

function Field({ label, children, mode, noBorder = false }: { label: string; children: React.ReactNode; mode: ThemeMode; noBorder?: boolean }) {
  const t = tokens[mode];
  return (
    <div className="flex items-center py-[13px]" style={{ borderBottom: noBorder ? "none" : `0.5px solid ${t.divider}` }}>
      <div className="w-[72px] text-xs font-medium tracking-[0.1px]" style={{ color: t.textTertiary }}>
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
  category = "me",
}: {
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
  mode: ThemeMode;
  category?: TaskCategory;
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
            background: value === key ? t[category].soft : "transparent",
            color: value === key ? t[category].ink : t.textSecondary,
            border: value === key ? "none" : `0.5px solid ${t.divider}`,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
