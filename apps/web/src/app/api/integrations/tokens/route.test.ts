import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashIntegrationToken } from "@/lib/integrations/token";

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ rows: [] as Row[], seq: 0, sessions: {} as Record<string, string> }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service-role", () => ({
  getSupabaseServiceRoleClient: () => ({
    auth: {
      getUser: async (token: string) =>
        db.sessions[token]
          ? { data: { user: { id: db.sessions[token] } }, error: null }
          : { data: { user: null }, error: new Error("invalid") },
    },
    from: () => query(),
  }),
}));

// Minimal stand-in for the integration_tokens query builder.
function query() {
  const filters: ((r: Row) => boolean)[] = [];
  let op: "select" | "insert" | "update" = "select";
  let payload: Row = {};
  let head = false;
  const run = () => {
    if (op === "insert") {
      const row = { id: `tok${++db.seq}`, created_at: "2026-10-30T00:00:00Z", last_used_at: null, revoked_at: null, ...payload };
      db.rows.push(row);
      return { data: [row], error: null, count: null };
    }
    const hit = db.rows.filter((r) => filters.every((f) => f(r)));
    if (op === "update") hit.forEach((r) => Object.assign(r, payload));
    return { data: head ? null : hit, error: null, count: hit.length };
  };
  const b = {
    select: (_cols?: string, opts?: { head?: boolean }) => ((head = Boolean(opts?.head)), b),
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
    is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
    order: () => b,
    insert: (p: Row) => ((op = "insert"), (payload = p), b),
    update: (p: Row) => ((op = "update"), (payload = p), b),
    single: async () => ({ data: run().data?.[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}

const { GET, POST, DELETE } = await import("./route");

const req = (method: string, { session = "s1", body, query = "" }: { session?: string | null; body?: unknown; query?: string } = {}) =>
  new Request(`http://test.local/api/integrations/tokens${query}`, {
    method,
    headers: { ...(session ? { Authorization: `Bearer ${session}` } : {}), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  db.rows = [];
  db.seq = 0;
  db.sessions = { s1: "user-1", s2: "user-2" };
});

describe("/api/integrations/tokens", () => {
  it("requires a valid session", async () => {
    expect((await GET(req("GET", { session: null }))).status).toBe(401);
    expect((await GET(req("GET", { session: "bad" }))).status).toBe(401);
  });

  it("creates a token, stores only its hash, and lists it without the secret", async () => {
    const res = await POST(req("POST", { body: { source: "get_a_job", label: "내 취업 일정" } }));
    expect(res.status).toBe(201);
    const { token, info } = await res.json();
    expect(token).toMatch(/^jd_int_/);
    expect(info).toMatchObject({ source: "get_a_job", label: "내 취업 일정" });
    expect(db.rows[0]).toMatchObject({ user_id: "user-1", token_hash: hashIntegrationToken(token) });
    expect(JSON.stringify(db.rows)).not.toContain(token);

    const list = await (await GET(req("GET"))).json();
    expect(list.tokens).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(token);
    expect((await (await GET(req("GET", { session: "s2" }))).json()).tokens).toHaveLength(0);
  });

  it("validates source and label", async () => {
    expect((await POST(req("POST", { body: { source: "Get A Job" } }))).status).toBe(400);
    expect((await POST(req("POST", { body: { source: "get_a_job", label: "x".repeat(61) } }))).status).toBe(400);
  });

  it("limits active tokens per user", async () => {
    for (let i = 0; i < 10; i++) await POST(req("POST", { body: { source: "get_a_job" } }));
    const res = await POST(req("POST", { body: { source: "get_a_job" } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "too_many_tokens" });
  });

  it("revokes only the caller's own token", async () => {
    await POST(req("POST", { body: { source: "get_a_job" } }));
    const id = db.rows[0].id as string;
    expect((await DELETE(req("DELETE", { session: "s2", query: `?id=${id}` }))).status).toBe(404);
    expect((await DELETE(req("DELETE", { query: `?id=${id}` }))).status).toBe(200);
    expect(db.rows[0].revoked_at).toBeTruthy();
    expect((await (await GET(req("GET"))).json()).tokens).toHaveLength(0);
  });
});
