import type { Supabase } from "@/lib/supabase/client";
import type { JustDoStorage, Persisted } from "./persistence";
import {
  habitDomainToInsert,
  habitRowToDomain,
  mergeHabitLogs,
  taskCategoryToName,
  taskDomainToInsert,
  taskRowToDomain,
} from "./supabase-mapping";

type CategoryCache = Record<string, string>;

/**
 * Supabase implementation of `JustDoStorage`.
 *
 * Scope (Phase 4-2):
 *   - load: tasks, habits, habit_logs round-trip into the domain shape.
 *   - mutations: upsert/delete tasks and habits, set a single habit log entry.
 *   - settings/view: not persisted yet — the v1 schema has no place for them.
 *     Once Phase 4-3 lands an account-scoped settings table, replace these
 *     no-ops. Until then localStorage stays the source of truth for UI state.
 *
 * Categories live in their own table; the constructor warms a name→id cache
 * on first access so per-mutation calls don't pay for the lookup.
 */
export const createSupabaseStorage = (
  client: Supabase,
  userId: string,
): JustDoStorage => {
  let categoryCachePromise: Promise<CategoryCache> | null = null;

  const ensureCategoryCache = (): Promise<CategoryCache> => {
    if (categoryCachePromise) return categoryCachePromise;
    categoryCachePromise = (async () => {
      const { data, error } = await client
        .from("categories")
        .select("id, name")
        .eq("user_id", userId);
      if (error) throw error;
      const cache: CategoryCache = {};
      for (const row of data ?? []) cache[row.name] = row.id;
      return cache;
    })();
    return categoryCachePromise;
  };

  const categoryIdFor = async (
    category: keyof typeof taskCategoryToName,
  ): Promise<string | null> => {
    const cache = await ensureCategoryCache();
    return cache[taskCategoryToName[category]] ?? null;
  };

  return {
    async load(): Promise<Persisted | null> {
      const [tasksResult, habitsResult, logsResult] = await Promise.all([
        client
          .from("tasks")
          .select("*, categories(name)")
          .eq("user_id", userId),
        client.from("habits").select("*").eq("user_id", userId),
        client.from("habit_logs").select("*").eq("user_id", userId),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (habitsResult.error) throw habitsResult.error;
      if (logsResult.error) throw logsResult.error;

      const tasks = (tasksResult.data ?? []).map((row) =>
        taskRowToDomain(row, row.categories?.name ?? null),
      );
      const habitsBare = (habitsResult.data ?? []).map(habitRowToDomain);
      const habits = mergeHabitLogs(habitsBare, logsResult.data ?? []);

      // The remote source has no settings/view yet — return them so the
      // store keeps its in-memory defaults instead of wiping them.
      return {
        view: {
          tab: "home",
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          selectedDate: new Date().toISOString().slice(0, 10),
          dark: false,
        },
        tasks,
        habits,
        settings: {
          notify: true,
          notifyTime: "09:00",
          weekStart: 0,
          plan: "free",
        },
      };
    },

    async saveSettings() {
      // No remote settings table yet — see scope comment above. Local mirror
      // (localStorage) keeps settings until Phase 4-3.
    },

    async saveView() {
      // View state is intentionally device-local; no remote write.
    },

    async upsertTask(task) {
      const categoryId = await categoryIdFor(task.category);
      const { error } = await client
        .from("tasks")
        .upsert(taskDomainToInsert(task, userId, categoryId));
      if (error) throw error;
    },

    async deleteTask(id) {
      const { error } = await client
        .from("tasks")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw error;
    },

    async upsertHabit(habit) {
      const { error } = await client
        .from("habits")
        .upsert(habitDomainToInsert(habit, userId));
      if (error) throw error;
    },

    async setHabitLog(habitId, iso, value) {
      if (value === 1) {
        const { error } = await client
          .from("habit_logs")
          .upsert(
            {
              habit_id: habitId,
              user_id: userId,
              log_date: iso,
              is_completed: true,
            },
            { onConflict: "habit_id,log_date" },
          );
        if (error) throw error;
      } else {
        const { error } = await client
          .from("habit_logs")
          .delete()
          .eq("user_id", userId)
          .eq("habit_id", habitId)
          .eq("log_date", iso);
        if (error) throw error;
      }
    },
  };
};
