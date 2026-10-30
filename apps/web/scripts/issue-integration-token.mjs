// Issue an integration token for one user. Prints the token once; only its
// hash is stored. Run from apps/web:
//
//   node --env-file=.env.local scripts/issue-integration-token.mjs --email you@example.com --source get_a_job [--label "취업 일정"]
//   node --env-file=.env.local scripts/issue-integration-token.mjs --revoke <token-row-id>
import { createHash, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: { email: { type: "string" }, source: { type: "string" }, label: { type: "string" }, revoke: { type: "string" } },
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

if (values.revoke) {
  const { error } = await supabase.from("integration_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", values.revoke);
  if (error) throw error;
  console.log(`revoked ${values.revoke}`);
  process.exit(0);
}

if (!values.email || !values.source) throw new Error("--email and --source are required");

const { data: user, error: userError } = await supabase.from("users").select("id").eq("email", values.email).maybeSingle();
if (userError) throw userError;
if (!user) throw new Error(`no Just Do user with email ${values.email}`);

const token = `jd_int_${randomBytes(32).toString("base64url")}`;
const { data, error } = await supabase
  .from("integration_tokens")
  .insert({
    user_id: user.id,
    source: values.source,
    label: values.label ?? null,
    token_hash: createHash("sha256").update(token).digest("hex"),
  })
  .select("id")
  .single();
if (error) throw error;

console.log(`token row id: ${data.id}`);
console.log(`token (shown once): ${token}`);
