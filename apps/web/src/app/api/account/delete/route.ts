import { NextResponse } from "next/server";

import {
  AppleRevocationError,
  revokeAppleAuthorization,
  type AppleServerConfiguration,
} from "@/lib/account-deletion/apple";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type DeleteAccountBody = {
  apple_authorization_code?: unknown;
};

const bearerToken = (request: Request): string | null => {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const appleConfiguration = (): AppleServerConfiguration | null => {
  const clientId = process.env.APPLE_NATIVE_CLIENT_ID;
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID;
  const teamId = process.env.APPLE_SIGN_IN_TEAM_ID;
  const privateKeyBase64 = process.env.APPLE_SIGN_IN_PRIVATE_KEY_BASE64;
  if (!clientId || !keyId || !teamId || !privateKeyBase64) return null;
  return { clientId, keyId, teamId, privateKeyBase64 };
};

const appleSubject = (
  identities: Array<{
    id?: string;
    provider?: string;
    identity_data?: Record<string, unknown> | null;
  }> | null | undefined,
): string | null => {
  const identity = identities?.find((item) => item.provider === "apple");
  if (!identity) return null;
  const subject = identity.identity_data?.sub;
  return typeof subject === "string" ? subject : identity.id ?? null;
};

export async function POST(request: Request) {
  const accessToken = bearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  let body: DeleteAccountBody = {};
  try {
    const rawBody = await request.text();
    if (rawBody) {
      body = JSON.parse(rawBody) as DeleteAccountBody;
    }
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  const expectedAppleSubject = appleSubject(user.identities);
  if (expectedAppleSubject) {
    const authorizationCode =
      typeof body.apple_authorization_code === "string"
        ? body.apple_authorization_code.trim()
        : "";
    if (!authorizationCode || authorizationCode.length > 4096) {
      return NextResponse.json(
        { error: "apple_reauthentication_required" },
        { status: 409 },
      );
    }
    const configuration = appleConfiguration();
    if (!configuration) {
      return NextResponse.json({ error: "apple_not_configured" }, { status: 503 });
    }
    try {
      await revokeAppleAuthorization({
        authorizationCode,
        expectedSubject: expectedAppleSubject,
        configuration,
      });
    } catch (error) {
      if (error instanceof AppleRevocationError) {
        const status = error.code === "apple_identity_mismatch" ? 409 : 502;
        return NextResponse.json({ error: error.code }, { status });
      }
      return NextResponse.json({ error: "apple_revoke_failed" }, { status: 502 });
    }
  }

  // Full-free v1 has no completed purchase records, but remove any historical
  // test billing events before the user row is cascaded so their payload cannot
  // remain detached by the legacy ON DELETE SET NULL relationship.
  const { error: paymentDeleteError } = await supabase
    .from("payment_events")
    .delete()
    .eq("user_id", user.id);
  if (paymentDeleteError) {
    console.error("[account-delete] payment event cleanup failed", paymentDeleteError.message);
    return NextResponse.json({ error: "account_delete_failed" }, { status: 500 });
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id, false);
  if (deleteError) {
    console.error("[account-delete] auth user deletion failed", deleteError.message);
    return NextResponse.json({ error: "account_delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
