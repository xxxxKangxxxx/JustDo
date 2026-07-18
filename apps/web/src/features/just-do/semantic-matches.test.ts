import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearGoalMatchCache, loadGoalMatches } from "./semantic-matches";

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ rpc }),
}));

describe("loadGoalMatches", () => {
  beforeEach(() => {
    clearGoalMatchCache();
    rpc.mockReset();
  });

  it("scopes cached matches by user", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ goal_id: "goal-a", item_id: "task-a", item_type: "task" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ goal_id: "goal-b", item_id: "task-b", item_type: "task" }],
        error: null,
      });

    const first = await loadGoalMatches("monthly", "2026-07", false, "user-a");
    const second = await loadGoalMatches("monthly", "2026-07", false, "user-b");
    const cachedFirst = await loadGoalMatches("monthly", "2026-07", false, "user-a");

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(first?.get("goal-a")?.taskIds.has("task-a")).toBe(true);
    expect(second?.get("goal-b")?.taskIds.has("task-b")).toBe(true);
    expect(cachedFirst?.get("goal-a")?.taskIds.has("task-a")).toBe(true);
  });

  it("refetches after the cache is cleared", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ goal_id: "goal-a", item_id: "task-a", item_type: "task" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ goal_id: "goal-a", item_id: "task-b", item_type: "task" }],
        error: null,
      });

    const first = await loadGoalMatches("monthly", "2026-07", false, "user-a");
    clearGoalMatchCache();
    const second = await loadGoalMatches("monthly", "2026-07", false, "user-a");

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(first?.get("goal-a")?.taskIds.has("task-a")).toBe(true);
    expect(second?.get("goal-a")?.taskIds.has("task-b")).toBe(true);
  });
});
