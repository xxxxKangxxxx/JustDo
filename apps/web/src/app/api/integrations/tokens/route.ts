// Integration tokens the signed-in user manages from Settings → 외부 연동.
// Auth: "Authorization: Bearer <Supabase access token>" (same as account deletion).
//   GET    → active tokens (never the token itself)
//   POST   { source, label? } → new token, returned once
//   DELETE ?id=<token row id> → revoke
import { NextResponse } from "next/server";

import { hashIntegrationToken, newIntegrationToken } from "@/lib/integrations/token";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const MAX_ACTIVE_TOKENS = 10;
const SOURCE_RE = /^[a-z0-9_-]{1,40}$/;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function currentUserId(request: Request): Promise<string | null> {
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const { data, error } = await getSupabaseServiceRoleClient().auth.getUser(match[1]);
  return error || !data.user ? null : data.user.id;
}

const COLUMNS = "id, source, label, created_at, last_used_at";

export async function GET(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return fail(401, "invalid_session");
  const { data, error } = await getSupabaseServiceRoleClient()
    .from("integration_tokens")
    .select(COLUMNS)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) return fail(500, "load_failed");
  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return fail(401, "invalid_session");

  let body: { source?: unknown; label?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_json");
  }
  const source = typeof body.source === "string" ? body.source.trim() : "";
  if (!SOURCE_RE.test(source)) return fail(400, "invalid_source");
  let label: string | null = null;
  if (body.label !== undefined && body.label !== null && body.label !== "") {
    if (typeof body.label !== "string" || body.label.trim().length > 60) return fail(400, "invalid_label");
    label = body.label.trim() || null;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { count, error: countError } = await supabase
    .from("integration_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (countError) return fail(500, "create_failed");
  if ((count ?? 0) >= MAX_ACTIVE_TOKENS) return fail(409, "too_many_tokens");

  const token = newIntegrationToken();
  const { data, error } = await supabase
    .from("integration_tokens")
    .insert({ user_id: userId, source, label, token_hash: hashIntegrationToken(token) })
    .select(COLUMNS)
    .single();
  if (error || !data) return fail(500, "create_failed");
  return NextResponse.json({ token, info: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return fail(401, "invalid_session");
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail(400, "missing_id");

  const { data, error } = await getSupabaseServiceRoleClient()
    .from("integration_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");
  if (error) return fail(500, "revoke_failed");
  if (!data?.length) return fail(404, "not_found");
  return NextResponse.json({ ok: true });
}
