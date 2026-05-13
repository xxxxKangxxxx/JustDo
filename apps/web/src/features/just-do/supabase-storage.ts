import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Supabase } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { JustDoStorage, Persisted, RemoteChange } from "./persistence";
import {
  categoryDomainToInsert,
  categoryRowToDomain,
  habitDomainToInsert,
  habitRowToDomain,
  mergeHabitLogs,
  taskDomainToInsert,
  taskRowToDomain,
} from "./supabase-mapping";

type TaskWithJoins = Parameters<typeof taskRowToDomain>[0] & {
  task_tags?: { tags: { name: string | null } | null }[] | null;
};
type CategoryRow = Parameters<typeof categoryRowToDomain>[0];
type LegacyCategoryRow = Omit<CategoryRow, "is_default" | "position"> &
  Partial<Pick<CategoryRow, "is_default" | "position">>;
type TaskRow = Parameters<typeof taskRowToDomain>[0];
type HabitRow = Parameters<typeof habitRowToDomain>[0];
type HabitLogRow = Parameters<typeof mergeHabitLogs>[1][number];
type TagRow = { id: string; user_id: string; name: string };
type TaskTagRow = { task_id: string; tag_id: string };
type UserPreferences = { week_start?: unknown };

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
 */
export const createSupabaseStorage = (
  client: Supabase,
  userId: string,
): JustDoStorage => {
  const normalizeTags = (tags: string[]): string[] =>
    Array.from(
      new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
    );

  const ensureTagIds = async (tags: string[]): Promise<string[]> => {
    const ids: string[] = [];
    for (const name of normalizeTags(tags)) {
      const { data, error } = await client
        .from("tags")
        .upsert({ user_id: userId, name }, { onConflict: "user_id,name" })
        .select("id")
        .single();
      if (error) throw error;
      ids.push(data.id);
    }
    return ids;
  };

  const replaceTaskTags = async (taskId: string, tagNames: string[]) => {
    const nextTagIds = await ensureTagIds(tagNames);
    const { data: currentRows, error: currentError } = await client
      .from("task_tags")
      .select("tag_id")
      .eq("task_id", taskId);
    if (currentError) throw currentError;

    const currentTagIds = new Set((currentRows ?? []).map((row) => row.tag_id));
    const nextTagIdSet = new Set(nextTagIds);
    const staleTagIds = [...currentTagIds].filter((tagId) => !nextTagIdSet.has(tagId));
    const newTagIds = nextTagIds.filter((tagId) => !currentTagIds.has(tagId));

    if (staleTagIds.length > 0) {
      const { error } = await client
        .from("task_tags")
        .delete()
        .eq("task_id", taskId)
        .in("tag_id", staleTagIds);
      if (error) throw error;
    }

    if (newTagIds.length > 0) {
      const { error } = await client
        .from("task_tags")
        .insert(newTagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })));
      if (error) throw error;
    }
  };

  const taskFromJoinedRow = (row: TaskWithJoins) =>
    taskRowToDomain(
      row,
      (row.task_tags ?? [])
        .map((join) => join.tags?.name)
        .filter((name): name is string => Boolean(name)),
    );

  const loadTaskWithTags = async (taskId: string) => {
    const { data, error } = await client
      .from("tasks")
      .select("*, task_tags(tags(name))")
      .eq("user_id", userId)
      .eq("id", taskId)
      .maybeSingle();
    if (error) throw error;
    return data ? taskFromJoinedRow(data as TaskWithJoins) : null;
  };

  const emitTaskReload = async (
    callback: (change: RemoteChange) => void,
    taskId: string,
  ) => {
    const task = await loadTaskWithTags(taskId);
    if (task) {
      emit(callback, { type: "task_upserted", task });
    } else {
      emit(callback, { type: "task_deleted", id: taskId });
    }
  };

  const emitTasksForTag = async (
    callback: (change: RemoteChange) => void,
    tagId: string,
  ) => {
    const { data, error } = await client
      .from("task_tags")
      .select("task_id")
      .eq("tag_id", tagId);
    if (error) throw error;

    await Promise.all(
      Array.from(new Set((data ?? []).map((row) => row.task_id))).map((taskId) =>
        emitTaskReload(callback, taskId),
      ),
    );
  };

  const emit = (callback: (change: RemoteChange) => void, change: RemoteChange) => {
    callback(change);
  };

  const emitError = (callback: (change: RemoteChange) => void, error: unknown) => {
    callback({ type: "error", error });
  };

  const normalizeCategoryRow = (row: LegacyCategoryRow, index: number): CategoryRow => ({
    ...row,
    is_default: row.is_default ?? (row.name === "나" || row.name === "외부"),
    position: row.position ?? index,
  });

  const loadCategories = async () => {
    const result = await client
      .from("categories")
      .select("id, user_id, name, color, is_default, position, created_at")
      .eq("user_id", userId);

    if (!result.error) {
      return ((result.data ?? []) as CategoryRow[]).map(categoryRowToDomain);
    }

    if (result.error.code !== "42703") throw result.error;

    const fallback = await client
      .from("categories")
      .select("id, user_id, name, color, created_at")
      .eq("user_id", userId);
    if (fallback.error) throw fallback.error;
    return ((fallback.data ?? []) as LegacyCategoryRow[])
      .map(normalizeCategoryRow)
      .map(categoryRowToDomain);
  };

  const loadWeekStartPreference = async (): Promise<0 | 1> => {
    const { data, error } = await client
      .from("users")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      if (error.code === "42703") return 0;
      throw error;
    }
    const preferences = (data?.preferences ?? {}) as UserPreferences;
    return preferences.week_start === 1 ? 1 : 0;
  };

  const saveWeekStartPreference = async (weekStart: 0 | 1) => {
    const { data, error } = await client
      .from("users")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      if (error.code === "42703") return;
      throw error;
    }

    const current =
      data?.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)
        ? data.preferences
        : {};
    const preferences: Json = { ...current, week_start: weekStart };
    const { error: updateError } = await client
      .from("users")
      .update({ preferences })
      .eq("id", userId);
    if (updateError) {
      if (updateError.code === "42703") return;
      throw updateError;
    }
  };

  return {
    async load(): Promise<Persisted | null> {
      const [categoriesResult, tasksResult, habitsResult, logsResult, weekStart] = await Promise.all([
        loadCategories(),
        client
          .from("tasks")
          .select("*, task_tags(tags(name))")
          .eq("user_id", userId),
        client.from("habits").select("*").eq("user_id", userId),
        client.from("habit_logs").select("*").eq("user_id", userId),
        loadWeekStartPreference(),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (habitsResult.error) throw habitsResult.error;
      if (logsResult.error) throw logsResult.error;

      const categories = categoriesResult;
      const tasks = ((tasksResult.data ?? []) as TaskWithJoins[]).map(taskFromJoinedRow);
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
        categories,
        tasks,
        habits,
        settings: {
          notify: true,
          notifyTime: "09:00",
          weekStart,
          plan: "free",
        },
      };
    },

    async saveSettings(settings) {
      await saveWeekStartPreference(settings.weekStart);
    },

    async saveView() {
      // View state is intentionally device-local; no remote write.
    },

    async upsertCategory(category) {
      const { error } = await client
        .from("categories")
        .upsert(categoryDomainToInsert(category, userId));
      if (error) throw error;
    },

    async deleteCategory(id) {
      const { error } = await client
        .from("categories")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw error;
    },

    async upsertTask(task) {
      const { error } = await client
        .from("tasks")
        .upsert(taskDomainToInsert(task, userId));
      if (error) throw error;
      await replaceTaskTags(task.id, task.tags);
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

    async deleteHabit(id) {
      const { error } = await client
        .from("habits")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);
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

    subscribe(callback) {
      const channels: RealtimeChannel[] = [];

      // CHANNEL_ERROR fires whenever the realtime websocket cannot be reached,
      // which includes the expected offline transition (DevTools throttle to
      // Offline, network drop, etc). Surfacing those as syncError makes the
      // settings sync panel claim "확인 필요" while the offline queue is still
      // healthy. Treat CHANNEL_ERROR as a real error only when the browser
      // currently believes it is online — otherwise the queue is the source of
      // truth and will reconcile on reconnect.
      const onChannelStatus = (label: string) => (status: string) => {
        if (status !== "CHANNEL_ERROR") return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
        emitError(callback, new Error(`${label} realtime subscription failed`));
      };

      const tasksChannel = client
        .channel(`just-do:${userId}:tasks`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            void (async () => {
              if (payload.eventType === "DELETE") {
                const oldRow = payload.old as Partial<TaskRow>;
                if (oldRow.id) emit(callback, { type: "task_deleted", id: oldRow.id });
                return;
              }

              const row = payload.new as TaskRow;
              await emitTaskReload(callback, row.id);
            })().catch((error: unknown) => emitError(callback, error));
          },
        )
        .subscribe(onChannelStatus("tasks"));
      channels.push(tasksChannel);

      const categoriesChannel = client
        .channel(`just-do:${userId}:categories`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "categories",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<CategoryRow>;
              if (oldRow.id) emit(callback, { type: "category_deleted", id: oldRow.id });
              return;
            }

            emit(callback, {
              type: "category_upserted",
              category: categoryRowToDomain(payload.new as CategoryRow),
            });
          },
        )
        .subscribe(onChannelStatus("categories"));
      channels.push(categoriesChannel);

      const tagsChannel = client
        .channel(`just-do:${userId}:tags`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tags",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            void (async () => {
              if (payload.eventType === "INSERT") return;
              const row =
                payload.eventType === "DELETE"
                  ? (payload.old as Partial<TagRow>)
                  : (payload.new as Partial<TagRow>);
              if (row.id) await emitTasksForTag(callback, row.id);
            })().catch((error: unknown) => emitError(callback, error));
          },
        )
        .subscribe(onChannelStatus("tags"));
      channels.push(tagsChannel);

      const taskTagsChannel = client
        .channel(`just-do:${userId}:task_tags`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "task_tags",
          },
          (payload) => {
            void (async () => {
              const row =
                payload.eventType === "DELETE"
                  ? (payload.old as Partial<TaskTagRow>)
                  : (payload.new as Partial<TaskTagRow>);
              if (row.task_id) await emitTaskReload(callback, row.task_id);
            })().catch((error: unknown) => emitError(callback, error));
          },
        )
        .subscribe(onChannelStatus("task tags"));
      channels.push(taskTagsChannel);

      const habitsChannel = client
        .channel(`just-do:${userId}:habits`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "habits",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<HabitRow>;
              if (oldRow.id) emit(callback, { type: "habit_deleted", id: oldRow.id });
              return;
            }

            emit(callback, {
              type: "habit_upserted",
              habit: habitRowToDomain(payload.new as HabitRow),
            });
          },
        )
        .subscribe(onChannelStatus("habits"));
      channels.push(habitsChannel);

      const logsChannel = client
        .channel(`just-do:${userId}:habit_logs`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "habit_logs",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row =
              payload.eventType === "DELETE"
                ? (payload.old as Partial<HabitLogRow>)
                : (payload.new as Partial<HabitLogRow>);
            if (!row.habit_id || !row.log_date) return;
            emit(callback, {
              type: "habit_log_set",
              habitId: row.habit_id,
              iso: row.log_date,
              value: payload.eventType === "DELETE" ? 0 : row.is_completed ? 1 : 0,
            });
          },
        )
        .subscribe(onChannelStatus("habit logs"));
      channels.push(logsChannel);

      return () => {
        for (const channel of channels) {
          void client.removeChannel(channel);
        }
      };
    },
  };
};
