import { NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/lib/supabase/database.types";

type TossWebhookBody = {
  eventId?: unknown;
  eventType?: unknown;
  createdAt?: unknown;
  data?: {
    paymentKey?: unknown;
    orderId?: unknown;
    status?: unknown;
    approvedAt?: unknown;
    totalAmount?: unknown;
  };
};

const subscriptionIdFromOrderId = (orderId: string | null) => {
  const match = orderId?.match(/^justdo-([0-9a-f-]{36})-/i);
  return match?.[1] ?? null;
};

export async function POST(request: Request) {
  let body: TossWebhookBody;
  try {
    body = (await request.json()) as TossWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const eventType =
    typeof body.eventType === "string" ? body.eventType : "UNKNOWN";
  const data = body.data ?? {};
  const paymentKey =
    typeof data.paymentKey === "string" ? data.paymentKey : null;
  const orderId = typeof data.orderId === "string" ? data.orderId : null;
  const providerEventId =
    typeof body.eventId === "string"
      ? body.eventId
      : [eventType, paymentKey, orderId, body.createdAt].filter(Boolean).join(":");

  const supabase = getSupabaseServiceRoleClient();
  const payload = JSON.parse(JSON.stringify(body)) as Json;
  const subscriptionId = subscriptionIdFromOrderId(orderId);
  const subscriptionQuery = subscriptionId
    ? supabase
        .from("user_subscriptions")
        .select("id,user_id,plan_interval")
        .eq("id", subscriptionId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const { data: subscription, error: subscriptionError } =
    await subscriptionQuery;
  if (subscriptionError) {
    console.error("[webhook.toss] subscription query failed", subscriptionError.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("payment_events").upsert(
    {
      provider: "toss_payments",
      provider_event_id: providerEventId || null,
      event_type: eventType,
      payment_key: paymentKey,
      order_id: orderId,
      subscription_id: subscription?.id ?? null,
      user_id: subscription?.user_id ?? null,
      payload,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
  );

  if (eventError) {
    console.error("[webhook.toss] event insert failed", eventError.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (subscription && data.status === "DONE") {
    const approvedAt =
      typeof data.approvedAt === "string" ? data.approvedAt : new Date().toISOString();
    const next = new Date(approvedAt);
    if (subscription.plan_interval === "yearly") {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }

    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        status: "active",
        plan_name: "pro",
        subscribed_at: approvedAt,
        expires_at: next.toISOString(),
        next_billing_at: next.toISOString(),
        last_payment_at: approvedAt,
        toss_last_payment_key: paymentKey,
        payment_failures: 0,
      })
      .eq("id", subscription.id);

    if (error) {
      console.error("[webhook.toss] subscription update failed", error.message);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
