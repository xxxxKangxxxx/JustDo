import { NextResponse } from "next/server";

import {
  isTossBillingPlanInterval,
  issueTossBillingKey,
  TOSS_BILLING_PLANS,
  TossPaymentsError,
} from "@/lib/billing/toss";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type Body = {
  authKey?: unknown;
  customerKey?: unknown;
  planInterval?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const authKey = typeof body.authKey === "string" ? body.authKey.trim() : "";
  const customerKey =
    typeof body.customerKey === "string" ? body.customerKey.trim() : "";
  const planInterval = isTossBillingPlanInterval(body.planInterval)
    ? body.planInterval
    : "monthly";

  if (!authKey || !customerKey) {
    return NextResponse.json({ error: "missing_billing_auth" }, { status: 400 });
  }

  const authClient = await createSupabaseServerClient();
  const { data, error: userError } = await authClient.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = TOSS_BILLING_PLANS[planInterval];

  try {
    const billing = await issueTossBillingKey({ authKey, customerKey });
    const supabase = getSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: data.user.id,
          plan_name: "pro",
          status: "trial",
          billing_provider: "toss_payments",
          toss_billing_key: billing.billingKey,
          toss_customer_key: billing.customerKey,
          plan_interval: planInterval,
          amount_krw: plan.amount,
          currency: "KRW",
          trial_start_at: new Date().toISOString(),
          trial_end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_failures: 0,
          payment_method_label: billing.method ?? "card",
          payment_method_last4: billing.card?.number?.slice(-4) ?? null,
        },
        { onConflict: "user_id" },
      );

    if (error) {
      console.error("[billing.issue-key] subscription upsert failed", error.message);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      planInterval,
      amount: plan.amount,
      trialDays: 30,
    });
  } catch (error) {
    if (error instanceof TossPaymentsError) {
      return NextResponse.json(
        { error: "toss_error", code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error("[billing.issue-key] failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
