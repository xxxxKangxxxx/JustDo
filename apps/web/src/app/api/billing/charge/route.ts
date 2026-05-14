import { NextResponse } from "next/server";

import {
  chargeTossBillingKey,
  TOSS_BILLING_PLANS,
  TossPaymentsError,
} from "@/lib/billing/toss";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type SubscriptionRow = {
  id: string;
  user_id: string;
  toss_billing_key: string | null;
  toss_customer_key: string | null;
  plan_interval: string;
  amount_krw: number;
  payment_failures: number;
};

const authorized = (request: Request) => {
  const secret = process.env.BILLING_CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
};

const nextBillingAt = (interval: string) => {
  const next = new Date();
  if (interval === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
};

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("id,user_id,toss_billing_key,toss_customer_key,plan_interval,amount_krw,payment_failures")
    .not("toss_billing_key", "is", null)
    .not("toss_customer_key", "is", null)
    .lte("next_billing_at", now)
    .in("status", ["trial", "active", "past_due"])
    .limit(20);

  if (error) {
    console.error("[billing.charge] due subscription query failed", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const charged: string[] = [];
  const failed: string[] = [];

  for (const subscription of (data ?? []) as SubscriptionRow[]) {
    if (!subscription.toss_billing_key || !subscription.toss_customer_key) continue;

    const interval =
      subscription.plan_interval === "yearly" ? "yearly" : "monthly";
    const amount =
      subscription.amount_krw > 0
        ? subscription.amount_krw
        : TOSS_BILLING_PLANS[interval].amount;
    const orderId = `justdo-${subscription.id}-${Date.now()}`;

    try {
      const payment = await chargeTossBillingKey({
        billingKey: subscription.toss_billing_key,
        customerKey: subscription.toss_customer_key,
        amount,
        orderId,
        orderName: TOSS_BILLING_PLANS[interval].orderName,
      });

      await supabase.from("payment_events").insert({
        provider: "toss_payments",
        event_type: "BILLING_CHARGE_REQUESTED",
        payment_key: payment.paymentKey,
        order_id: payment.orderId,
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        payload: payment,
        processed_at: new Date().toISOString(),
      });

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          status: "active",
          plan_name: "pro",
          subscribed_at: payment.approvedAt ?? new Date().toISOString(),
          expires_at: nextBillingAt(interval),
          next_billing_at: nextBillingAt(interval),
          last_payment_at: payment.approvedAt ?? new Date().toISOString(),
          toss_last_payment_key: payment.paymentKey,
          payment_failures: 0,
        })
        .eq("id", subscription.id);

      if (updateError) throw new Error(updateError.message);
      charged.push(subscription.id);
    } catch (error) {
      const nextFailures = subscription.payment_failures + 1;
      const paused = nextFailures >= 3;
      await supabase
        .from("user_subscriptions")
        .update({
          status: paused ? "paused" : "past_due",
          payment_failures: nextFailures,
          next_billing_at: paused
            ? null
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", subscription.id);

      await supabase.from("payment_events").insert({
        provider: "toss_payments",
        event_type: "BILLING_CHARGE_FAILED",
        order_id: orderId,
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        payload:
          error instanceof TossPaymentsError
            ? { code: error.code, message: error.message, status: error.status }
            : { message: error instanceof Error ? error.message : "unknown" },
        processing_error:
          error instanceof Error ? error.message : "Unknown billing failure.",
        processed_at: new Date().toISOString(),
      });

      failed.push(subscription.id);
    }
  }

  return NextResponse.json({ ok: true, charged, failed });
}
