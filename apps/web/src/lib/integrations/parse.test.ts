import { describe, expect, it } from "vitest";

import { MAX_ITEMS, parseSyncBody } from "./parse";

const good = { externalId: "period:a", title: "접수", startDate: "2026-10-20", endDate: "2026-11-02" };

describe("parseSyncBody", () => {
  it("accepts a valid body and fills defaults", () => {
    const r = parseSyncBody({ category: "취업", items: [good] });
    expect(r).toEqual({
      ok: true,
      body: { category: "취업", items: [{ ...good, memo: null, completed: false }] },
    });
  });

  it("accepts an empty list (removes everything from the source)", () => {
    expect(parseSyncBody({ items: [] })).toEqual({ ok: true, body: { category: null, items: [] } });
  });

  it.each([
    [null, "body_must_be_object"],
    [{}, "items_must_be_array"],
    [{ items: [{ ...good, externalId: "" }] }, "items[0].externalId_invalid"],
    [{ items: [{ ...good, title: " " }] }, "items[0].title_invalid"],
    [{ items: [good, good] }, "items[1].externalId_duplicate"],
    [{ items: [{ ...good, startDate: "2026-02-30" }] }, "items[0].dates_invalid"],
    [{ items: [{ ...good, endDate: "2026-10-01" }] }, "items[0].dates_invalid"],
    [{ items: [{ ...good, completed: "yes" }] }, "items[0].completed_invalid"],
    [{ items: [{ ...good, memo: 3 }] }, "items[0].memo_invalid"],
    [{ category: "", items: [] }, "invalid_category"],
  ])("rejects %j", (body, error) => {
    expect(parseSyncBody(body)).toEqual({ ok: false, error });
  });

  it("limits the number of items", () => {
    const items = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ ...good, externalId: `p${i}` }));
    expect(parseSyncBody({ items })).toEqual({ ok: false, error: "too_many_items" });
  });
});
