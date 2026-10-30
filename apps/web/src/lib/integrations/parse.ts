// Validate the body of PUT /api/integrations/tasks.
import type { IncomingItem } from "./sync-plan";

export const MAX_ITEMS = 500;

export type SyncBody = {
  /** Category name to put new tasks in (created if missing). */
  category: string | null;
  items: IncomingItem[];
};

const isDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : null;

export function parseSyncBody(raw: unknown): { ok: true; body: SyncBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "body_must_be_object" };
  const { category, items } = raw as Record<string, unknown>;

  let cat: string | null = null;
  if (category !== undefined && category !== null) {
    cat = text(category, 40);
    if (!cat) return { ok: false, error: "invalid_category" };
  }

  if (!Array.isArray(items)) return { ok: false, error: "items_must_be_array" };
  if (items.length > MAX_ITEMS) return { ok: false, error: "too_many_items" };

  const seen = new Set<string>();
  const out: IncomingItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as Record<string, unknown> | null;
    if (!it || typeof it !== "object") return { ok: false, error: `items[${i}]_must_be_object` };
    const externalId = text(it.externalId, 200);
    const title = text(it.title, 200);
    if (!externalId) return { ok: false, error: `items[${i}].externalId_invalid` };
    if (!title) return { ok: false, error: `items[${i}].title_invalid` };
    if (seen.has(externalId)) return { ok: false, error: `items[${i}].externalId_duplicate` };
    seen.add(externalId);

    let memo: string | null = null;
    if (it.memo !== undefined && it.memo !== null && it.memo !== "") {
      if (typeof it.memo !== "string" || it.memo.length > 2000) return { ok: false, error: `items[${i}].memo_invalid` };
      memo = it.memo;
    }
    if (!isDate(it.startDate) || !isDate(it.endDate) || it.endDate < it.startDate) {
      return { ok: false, error: `items[${i}].dates_invalid` };
    }
    if (it.completed !== undefined && typeof it.completed !== "boolean") {
      return { ok: false, error: `items[${i}].completed_invalid` };
    }
    out.push({ externalId, title, memo, startDate: it.startDate, endDate: it.endDate, completed: it.completed === true });
  }

  return { ok: true, body: { category: cat, items: out } };
}
