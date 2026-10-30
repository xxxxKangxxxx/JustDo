// PUT /api/integrations/tasks — an external service sends the full set of
// tasks it owns for this user; Just Do creates, updates and deletes so the
// user's tasks match. Auth: "Authorization: Bearer jd_int_..." (integration
// token, see docs/integrations.md). The token decides the user and source.
import { NextResponse } from "next/server";

import { parseSyncBody } from "@/lib/integrations/parse";
import { planSync } from "@/lib/integrations/sync-plan";
import { bearerToken, hashIntegrationToken, todayKST } from "@/lib/integrations/token";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const CATEGORY_COLOR = "#2F8F6B";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function PUT(request: Request) {
  const token = bearerToken(request);
  if (!token) return fail(401, "invalid_token");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail(400, "invalid_json");
  }
  const parsed = parseSyncBody(raw);
  if (!parsed.ok) return fail(400, parsed.error);
  const { category, items } = parsed.body;

  const supabase = getSupabaseServiceRoleClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("integration_tokens")
    .select("id, user_id, source")
    .eq("token_hash", hashIntegrationToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (tokenError) {
    console.error("[integrations] token lookup failed", tokenError.message);
    return fail(500, "sync_failed");
  }
  if (!tokenRow) return fail(401, "invalid_token");
  const { user_id: userId, source } = tokenRow;

  try {
    const categoryId = category ? await ensureCategory(supabase, userId, category) : null;

    const { data: existing, error: existingError } = await supabase
      .from("tasks")
      .select("id, external_id, title, memo, start_date, end_date, is_completed")
      .eq("user_id", userId)
      .eq("external_source", source);
    if (existingError) throw new Error(`load tasks: ${existingError.message}`);

    const now = new Date().toISOString();
    const plan = planSync(existing ?? [], items, todayKST(), now);

    if (plan.inserts.length > 0) {
      const { error } = await supabase.from("tasks").insert(
        plan.inserts.map((item) => ({
          user_id: userId,
          category_id: categoryId,
          external_source: source,
          external_id: item.externalId,
          title: item.title,
          memo: item.memo,
          start_date: item.startDate,
          end_date: item.endDate,
          is_completed: item.completed,
          completed_at: item.completed ? now : null,
        })),
      );
      if (error) throw new Error(`insert tasks: ${error.message}`);
    }

    for (const { id, patch } of plan.updates) {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(`update task: ${error.message}`);
    }

    if (plan.deletes.length > 0) {
      const { error } = await supabase.from("tasks").delete().in("id", plan.deletes).eq("user_id", userId);
      if (error) throw new Error(`delete tasks: ${error.message}`);
    }

    await supabase.from("integration_tokens").update({ last_used_at: now }).eq("id", tokenRow.id);

    return NextResponse.json({
      ok: true,
      created: plan.inserts.length,
      updated: plan.updates.length,
      deleted: plan.deletes.length,
      unchanged: plan.unchanged,
    });
  } catch (e) {
    console.error("[integrations] sync failed", e instanceof Error ? e.message : e);
    return fail(500, "sync_failed");
  }
}

type Client = ReturnType<typeof getSupabaseServiceRoleClient>;

/** Find the user's category by name, or create it at the end of their list. */
async function ensureCategory(supabase: Client, userId: string, name: string): Promise<string> {
  const { data: found, error: findError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();
  if (findError) throw new Error(`load category: ${findError.message}`);
  if (found) return found.id;

  const { data: last } = await supabase
    .from("categories")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error: createError } = await supabase
    .from("categories")
    .upsert(
      { user_id: userId, name, color: CATEGORY_COLOR, position: (last?.position ?? -1) + 1 },
      { onConflict: "user_id,name", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  if (createError || !created) throw new Error(`create category: ${createError?.message ?? "no row"}`);
  return created.id;
}
