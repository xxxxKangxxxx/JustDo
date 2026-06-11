import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { GoalPeriodType } from "@/types/domain";

/**
 * Semantic (E3) goal matches for one period, keyed by goal id. A goal is present
 * only when it has an embedding, so the progress selector can tell "matched
 * nothing semantically" (present, empty sets) from "not embedded yet" (absent →
 * fall back to the E1 token matcher).
 */
export type GoalMatchMap = Map<string, { taskIds: Set<string>; habitIds: Set<string> }>;

async function rpcGoalMatches(
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

// --- Module-level cache + in-flight de-dup ---------------------------------
//
// The goal screen renders a monthly and a yearly section, each report modal
// adds another reader, and the `revision` signal churns while the initial sync
// streams goals/tasks/habits in. Without coalescing this fired 8+ identical
// RPCs per visit. We cache by period key with a short TTL, share one in-flight
// request across all readers of the same key, and only hit the network again
// after the TTL lapses or a caller forces a refresh (window focus).

const CACHE_TTL_MS = 30_000;
const DEBOUNCE_MS = 250;

type CacheEntry = { map: GoalMatchMap | null; fetchedAt: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<GoalMatchMap | null>>();

function cacheKey(periodType: GoalPeriodType, periodKey: string): string {
  return `${periodType}:${periodKey}`;
}

function freshCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry;
  return null;
}

/**
 * Fetch matches for a period, served from cache when fresh and de-duped against
 * any in-flight request for the same key. `force` bypasses the TTL (but still
 * shares one in-flight request) so a focus refetch can pick up newly embedded
 * items without stampeding.
 */
export async function loadGoalMatches(
  periodType: GoalPeriodType,
  periodKey: string,
  force = false,
): Promise<GoalMatchMap | null> {
  const key = cacheKey(periodType, periodKey);
  if (!force) {
    const cached = freshCached(key);
    if (cached) return cached.map;
  }
  const existing = inflight.get(key);
  if (existing) return existing;
  const request = rpcGoalMatches(periodType, periodKey)
    .then((map) => {
      cache.set(key, { map, fetchedAt: Date.now() });
      return map;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}

/**
 * Fetches semantic matches for a period. Returns null while loading, offline, or
 * disabled (guest), in which case the progress selector uses the E1 fallback.
 * `revision` lets callers signal that goals/items changed; rapid changes are
 * debounced and gated by the module cache so they don't restampede the RPC.
 */
export function useGoalMatches(
  periodType: GoalPeriodType,
  periodKey: string,
  enabled: boolean,
  revision = 0,
): GoalMatchMap | null {
  const key = cacheKey(periodType, periodKey);
  // The async result for the current key. Set only from async callbacks so the
  // effects never call setState synchronously.
  const [resolved, setResolved] = useState<{ key: string; map: GoalMatchMap | null } | null>(null);

  // Debounced load: rapid revision/period changes coalesce into one request, and
  // the module cache de-dups it against the other readers of the same key.
  useEffect(() => {
    if (!enabled) return;
    if (freshCached(key)) return; // cache is fresh — rendered below, skip network.
    let cancelled = false;
    const timer = setTimeout(() => {
      loadGoalMatches(periodType, periodKey).then((map) => {
        if (!cancelled) setResolved({ key, map });
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, periodType, periodKey, enabled, revision]);

  // Refetch on window focus so items embedded after the last load (pg_cron runs
  // up to ~1 min behind) show up when the user returns to the tab.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;
    const onFocus = () => {
      loadGoalMatches(periodType, periodKey, true).then((map) => {
        if (!cancelled) setResolved({ key, map });
      });
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [key, periodType, periodKey, enabled]);

  // Derive the displayed value during render: prefer this key's async result,
  // else serve any cached map immediately (no flash to the E1 fallback), else
  // null (guest/offline/loading → caller uses the E1 token matcher).
  return useMemo(() => {
    if (!enabled) return null;
    if (resolved && resolved.key === key) return resolved.map;
    return cache.get(key)?.map ?? null;
  }, [enabled, key, resolved]);
}
