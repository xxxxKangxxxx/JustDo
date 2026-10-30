// Decide how to bring a source's tasks in line with the items it sent.
// Pure function: no database access, so it is easy to test.

export type IncomingItem = {
  externalId: string;
  title: string;
  memo: string | null;
  startDate: string;
  endDate: string;
  completed: boolean;
};

export type ExistingTask = {
  id: string;
  external_id: string | null;
  title: string;
  memo: string | null;
  start_date: string | null;
  end_date: string | null;
  is_completed: boolean;
};

export type TaskPatch = {
  title?: string;
  memo?: string | null;
  start_date?: string;
  end_date?: string;
  is_completed?: boolean;
  completed_at?: string;
};

export type SyncPlan = {
  inserts: IncomingItem[];
  updates: { id: string; patch: TaskPatch }[];
  deletes: string[];
  unchanged: number;
};

/**
 * - New item → insert.
 * - Known item → update title, memo and dates when they changed.
 *   Completion only moves forward: the source can mark a task done, but never
 *   reopens a task the user completed.
 * - Task the source no longer sends → delete, unless it is completed or
 *   already over (end_date before today). Those stay as history.
 */
export function planSync(
  existing: ExistingTask[],
  items: IncomingItem[],
  today: string,
  now: string,
): SyncPlan {
  const byId = new Map(existing.filter((t) => t.external_id).map((t) => [t.external_id as string, t]));
  const plan: SyncPlan = { inserts: [], updates: [], deletes: [], unchanged: 0 };

  for (const item of items) {
    const task = byId.get(item.externalId);
    if (!task) {
      plan.inserts.push(item);
      continue;
    }
    byId.delete(item.externalId);

    const patch: TaskPatch = {};
    if (task.title !== item.title) patch.title = item.title;
    if ((task.memo ?? null) !== item.memo) patch.memo = item.memo;
    if (task.start_date !== item.startDate) patch.start_date = item.startDate;
    if (task.end_date !== item.endDate) patch.end_date = item.endDate;
    if (item.completed && !task.is_completed) {
      patch.is_completed = true;
      patch.completed_at = now;
    }
    if (Object.keys(patch).length === 0) plan.unchanged++;
    else plan.updates.push({ id: task.id, patch });
  }

  for (const task of byId.values()) {
    if (task.is_completed) continue;
    if (task.end_date && task.end_date < today) continue;
    plan.deletes.push(task.id);
  }

  return plan;
}
