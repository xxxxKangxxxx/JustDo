import { NextResponse } from "next/server";

import { deleteTossBillingKey, TossPaymentsError } from "@/lib/billing/toss";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST() {
  const authClient = await createSupabaseServerClient();
  const { data, error: userError } = await authClient.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: subscription, error } = await supabase
    .from("user_subscriptions")
    .select("id,user_id,toss_billing_key")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (error) {
    console.error("[billing.cancel] subscription query failed", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!subscription) {
    return NextResponse.json({ error: "subscription_not_found" }, { status: 404 });
  }

  try {
    if (subscription.toss_billing_key) {
      await deleteTossBillingKey(subscription.toss_billing_key);
    }

    const cancelledAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        cancel_at: cancelledAt,
        cancelled_at: cancelledAt,
        next_billing_at: null,
        toss_billing_key: null,
        payment_failures: 0,
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("[billing.cancel] subscription update failed", updateError.message);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    await supabase.from("payment_events").insert({
      provider: "toss_payments",
      event_type: "BILLING_CANCELLED",
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      payload: { cancelledAt },
      processed_at: cancelledAt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TossPaymentsError) {
      return NextResponse.json(
        { error: "toss_error", code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error("[billing.cancel] failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
