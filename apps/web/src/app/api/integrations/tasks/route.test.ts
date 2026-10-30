import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashIntegrationToken } from "@/lib/integrations/token";

// Small in-memory stand-in for the Supabase query builder: enough of
// select/eq/is/in/order/limit/maybeSingle/single/insert/update/delete/upsert
// for this route.
type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, seq: 0 }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service-role", () => ({
  getSupabaseServiceRoleClient: () => ({ from: (t: string) => query(t) }),
}));

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  let payload: Row | Row[] = {};
  let order: { col: string; asc: boolean } | null = null;
  let limit = Infinity;
  const rows = () => (db.tables[table] ??= []);

  const run = () => {
    if (op === "insert" || op === "upsert") {
      const list = (Array.isArray(payload) ? payload : [payload]).map((r) => ({ id: `id${++db.seq}`, ...r }));
      rows().push(...list);
      return { data: list, error: null };
    }
    const hit = rows().filter((r) => filters.every((f) => f(r)));
    if (op === "update") {
      hit.forEach((r) => Object.assign(r, payload));
      return { data: hit, error: null };
    }
    if (op === "delete") {
      db.tables[table] = rows().filter((r) => !hit.includes(r));
      return { data: hit, error: null };
    }
    const out = [...hit];
    if (order) {
      const { col, asc } = order;
      out.sort((a, b) => ((a[col] as number) - (b[col] as number)) * (asc ? 1 : -1));
    }
    return { data: out.slice(0, limit), error: null };
  };

  const b = {
    select: () => b,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
    is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
    in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
    order: (col: string, o: { ascending: boolean }) => ((order = { col, asc: o.ascending }), b),
    limit: (n: number) => ((limit = n), b),
    insert: (p: Row[]) => ((op = "insert"), (payload = p), b),
    upsert: (p: Row) => ((op = "upsert"), (payload = p), b),
    update: (p: Row) => ((op = "update"), (payload = p), b),
    delete: () => ((op = "delete"), b),
    maybeSingle: async () => ({ data: run().data[0] ?? null, error: null }),
    single: async () => ({ data: run().data[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}

const TOKEN = "jd_int_test-token";
const USER = "user-1";

const put = (body: unknown, token = TOKEN) =>
  new Request("http://test.local/api/integrations/tasks", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const item = (id: string, over: Row = {}) => ({
  externalId: id,
  title: `${id} 서류 접수`,
  startDate: "2026-10-20",
  endDate: "2099-12-31",
  ...over,
});

const { PUT } = await import("./route");

beforeEach(() => {
  db.seq = 0;
  db.tables = {
    integration_tokens: [{ id: "tok", user_id: USER, source: "get_a_job", token_hash: hashIntegrationToken(TOKEN), revoked_at: null }],
    categories: [{ id: "cat-me", user_id: USER, name: "나", position: 0 }],
    tasks: [{ id: "mine", user_id: USER, title: "내 할 일", external_source: null, external_id: null, is_completed: false, end_date: "2099-01-01" }],
  };
});

describe("PUT /api/integrations/tasks", () => {
  it("rejects missing or unknown tokens", async () => {
    expect((await PUT(put({ items: [] }, "nope"))).status).toBe(401);
    expect((await PUT(put({ items: [] }, "jd_int_unknown"))).status).toBe(401);
  });

  it("rejects revoked tokens", async () => {
    db.tables.integration_tokens[0].revoked_at = "2026-10-01T00:00:00Z";
    expect((await PUT(put({ items: [] }))).status).toBe(401);
  });

  it("rejects invalid bodies", async () => {
    const res = await PUT(put({ items: [{ externalId: "a" }] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "items[0].title_invalid" });
  });

  it("creates tasks in a new category, then updates and deletes on later syncs", async () => {
    let res = await PUT(put({ category: "취업", items: [item("a"), item("b")] }));
    expect(await res.json()).toEqual({ ok: true, created: 2, updated: 0, deleted: 0, unchanged: 0 });

    const cat = db.tables.categories.find((c) => c.name === "취업");
    expect(cat).toMatchObject({ user_id: USER, position: 1 });
    const synced = db.tables.tasks.filter((t) => t.external_source === "get_a_job");
    expect(synced).toHaveLength(2);
    expect(synced[0]).toMatchObject({ user_id: USER, category_id: cat?.id, external_id: "a", start_date: "2026-10-20" });

    res = await PUT(put({ category: "취업", items: [item("a", { endDate: "2099-12-30", completed: true })] }));
    expect(await res.json()).toEqual({ ok: true, created: 0, updated: 1, deleted: 1, unchanged: 0 });
    expect(db.tables.categories.filter((c) => c.name === "취업")).toHaveLength(1);
    expect(db.tables.tasks.find((t) => t.external_id === "a")).toMatchObject({ end_date: "2099-12-30", is_completed: true });
    expect(db.tables.tasks.find((t) => t.external_id === "b")).toBeUndefined();

    // The user's own task is never touched.
    expect(db.tables.tasks.find((t) => t.id === "mine")).toBeDefined();
    expect(db.tables.integration_tokens[0].last_used_at).toBeTruthy();
  });

  it("does not touch another user's tasks with the same external id", async () => {
    db.tables.tasks.push({ id: "other", user_id: "user-2", external_source: "get_a_job", external_id: "a", is_completed: false, end_date: "2099-01-01" });
    await PUT(put({ items: [] }));
    expect(db.tables.tasks.find((t) => t.id === "other")).toBeDefined();
  });
});
