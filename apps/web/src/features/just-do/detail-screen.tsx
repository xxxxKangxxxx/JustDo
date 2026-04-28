"use client";

import { formatTime, parseISO } from "@/lib/date";
import { CatTag, CircleCheck } from "./primitives";
import { useJustDo } from "./store";
import { tokens, type ThemeMode } from "./tokens";

export function DetailScreen({ mode }: { mode: ThemeMode }) {
  const s = useJustDo();
  const t = tokens[mode];
  const task = s.state.tasks.find((item) => item.id === s.state.view.detailTaskId);
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col transition-transform"
      style={{
        background: t.bg,
        transform: task ? "translateX(0)" : "translateX(105%)",
        pointerEvents: task ? "auto" : "none",
      }}
    >
      {task ? (
        <>
          <div className="flex h-[54px] items-end justify-between px-5 pb-2">
            <button type="button" onClick={s.closeDetail} className="text-[15px] font-medium" style={{ color: t.accent }}>
              홈
            </button>
            <div className="text-[15px] font-semibold">Task</div>
            <button type="button" onClick={() => s.openAddSheet({ taskId: task.id })} className="text-[15px] font-semibold" style={{ color: t.accent }}>
              편집
            </button>
          </div>
          <div className="flex-1 overflow-auto px-5 pb-[100px] pt-3">
            <div className="mb-3.5 flex items-center gap-3">
              <button type="button" onClick={() => s.toggleTask(task.id)}>
                <CircleCheck checked={task.isCompleted} category={task.category} mode={mode} size={28} />
              </button>
              <h1 className="flex-1 text-[22px] font-bold tracking-[-0.5px]" style={{ textDecoration: task.isCompleted ? "line-through" : "none", opacity: task.isCompleted ? 0.5 : 1 }}>
                {task.title}
              </h1>
            </div>
            <div className="mb-[18px] flex flex-wrap gap-1.5">
              <CatTag category={task.category} mode={mode} />
              <Chip mode={mode}>{dateText(task.startDate, task.endDate)}</Chip>
              {task.scheduledTime ? <Chip mode={mode}>{formatTime(task.scheduledTime)}</Chip> : null}
              {task.priority ? <Chip mode={mode}>{priorityText(task.priority)}</Chip> : null}
            </div>
            <Card title="태그" mode={mode}>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.length ? task.tags.map((tag) => <span key={tag} className="rounded-md px-2 py-1 text-xs font-medium" style={{ color: t[task.category].ink, background: t[task.category].soft }}>{tag}</span>) : <span style={{ color: t.textTertiary }}>태그 없음</span>}
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
      ) : null}
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
