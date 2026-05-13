import { NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const PLATFORMS = new Set(["android", "ios", "web"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const SOURCE_MAX = 64;

type Body = {
  email?: unknown;
  platform?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const platform = typeof body.platform === "string" ? body.platform : "";
  const source =
    typeof body.source === "string" && body.source.length > 0
      ? body.source.slice(0, SOURCE_MAX)
      : null;

  if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("waitlist")
    .upsert(
      { email, platform, source },
      { onConflict: "email,platform", ignoreDuplicates: true },
    );

  if (error) {
    console.error("[waitlist] upsert failed", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
