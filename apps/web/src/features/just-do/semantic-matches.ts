import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { GoalPeriodType } from "@/types/domain";

/**
 * Semantic (E3) goal matches for one period, keyed by goal id. A goal is present
 * only when it has an embedding, so the progress selector can tell "matched
 * nothing semantically" (present, empty sets) from "not embedded yet" (absent →
 * fall back to the E1 token matcher).
 */
export type GoalMatchMap = Map<string, { taskIds: Set<string>; habitIds: Set<string> }>;

export async function fetchGoalMatches(
  periodType: GoalPeriodType,
  periodKey: string,
): Promise<GoalMatchMap | null> {
  try {
    const { data, error } = await getSupabaseClient().rpc("goal_semantic_matches", {
      p_period_type: periodType,
      p_period_key: periodKey,
    });
    if (error || !data) return null;
    const map: GoalMatchMap = new Map();
    for (const row of data) {
      let entry = map.get(row.goal_id);
      if (!entry) {
        entry = { taskIds: new Set(), habitIds: new Set() };
        map.set(row.goal_id, entry);
      }
      if (!row.item_id) continue;
      if (row.item_type === "task") entry.taskIds.add(row.item_id);
      else if (row.item_type === "habit") entry.habitIds.add(row.item_id);
    }
    return map;
  } catch {
    return null;
  }
}

/**
 * Fetches semantic matches for a period. Returns null while loading, offline, or
 * disabled (guest), in which case the progress selector uses the E1 fallback.
 * `revision` lets callers force a refetch when goals/items change.
 */
export function useGoalMatches(
  periodType: GoalPeriodType,
  periodKey: string,
  enabled: boolean,
  revision = 0,
): GoalMatchMap | null {
  const [matches, setMatches] = useState<GoalMatchMap | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchGoalMatches(periodType, periodKey).then((result) => {
      if (!cancelled) setMatches(result);
    });
    return () => {
      cancelled = true;
    };
  }, [periodType, periodKey, enabled, revision]);
  // Derive the disabled case (guest/offline) instead of a synchronous setState.
  return enabled ? matches : null;
}
