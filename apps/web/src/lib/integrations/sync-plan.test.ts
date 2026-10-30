import { describe, expect, it } from "vitest";

import { planSync, type ExistingTask, type IncomingItem } from "./sync-plan";

const NOW = "2026-10-30T00:00:00.000Z";
const TODAY = "2026-10-30";

const item = (over: Partial<IncomingItem> = {}): IncomingItem => ({
  externalId: "period:a",
  title: "동국제약 서류 접수",
  memo: null,
  startDate: "2026-10-20",
  endDate: "2026-11-02",
  completed: false,
  ...over,
});

const task = (over: Partial<ExistingTask> = {}): ExistingTask => ({
  id: "t1",
  external_id: "period:a",
  title: "동국제약 서류 접수",
  memo: null,
  start_date: "2026-10-20",
  end_date: "2026-11-02",
  is_completed: false,
  ...over,
});

describe("planSync", () => {
  it("inserts new items", () => {
    const plan = planSync([], [item()], TODAY, NOW);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.updates).toEqual([]);
    expect(plan.deletes).toEqual([]);
  });

  it("leaves identical tasks alone", () => {
    const plan = planSync([task()], [item()], TODAY, NOW);
    expect(plan).toEqual({ inserts: [], updates: [], deletes: [], unchanged: 1 });
  });

  it("updates only changed fields", () => {
    const plan = planSync([task()], [item({ endDate: "2026-11-05", memo: "구매팀" })], TODAY, NOW);
    expect(plan.updates).toEqual([{ id: "t1", patch: { end_date: "2026-11-05", memo: "구매팀" } }]);
  });

  it("marks done but never reopens a task the user completed", () => {
    expect(planSync([task()], [item({ completed: true })], TODAY, NOW).updates).toEqual([
      { id: "t1", patch: { is_completed: true, completed_at: NOW } },
    ]);
    expect(planSync([task({ is_completed: true })], [item({ completed: false })], TODAY, NOW).unchanged).toBe(1);
  });

  it("deletes open, current tasks the source no longer sends", () => {
    const plan = planSync([task()], [], TODAY, NOW);
    expect(plan.deletes).toEqual(["t1"]);
  });

  it("keeps completed and past tasks as history", () => {
    const plan = planSync(
      [
        task({ id: "done", external_id: "period:b", is_completed: true }),
        task({ id: "past", external_id: "period:c", end_date: "2026-10-29" }),
        task({ id: "today", external_id: "period:d", end_date: TODAY }),
      ],
      [],
      TODAY,
      NOW,
    );
    expect(plan.deletes).toEqual(["today"]);
  });
});
