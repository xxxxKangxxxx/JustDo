import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const baseSubscriptionSelect = [
  "id",
  "plan_name",
  "status",
  "trial_start_at",
  "trial_end_at",
  "subscribed_at",
  "expires_at",
].join(",");

const billingSubscriptionSelect = [
  baseSubscriptionSelect,
  "billing_provider",
  "plan_interval",
  "amount_krw",
  "currency",
  "next_billing_at",
  "cancel_at",
  "cancelled_at",
  "last_payment_at",
  "payment_failures",
  "payment_method_label",
  "payment_method_last4",
].join(",");

type BaseSubscription = {
  id: string;
  plan_name: string;
  status: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  subscribed_at: string | null;
  expires_at: string | null;
};

const withBillingDefaults = (row: BaseSubscription) => ({
  ...row,
  billing_provider: null,
  plan_interval: "monthly",
  amount_krw: 1900,
  currency: "KRW",
  next_billing_at: null,
  cancel_at: null,
  cancelled_at: null,
  last_payment_at: null,
  payment_failures: 0,
  payment_method_label: null,
  payment_method_last4: null,
});

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data, error: userError } = await authClient.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: subscription, error } = await supabase
    .from("user_subscriptions")
    .select(billingSubscriptionSelect)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (error) {
    if (error.message.includes("does not exist")) {
      const { data: legacySubscription, error: legacyError } = await supabase
        .from("user_subscriptions")
        .select(baseSubscriptionSelect)
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!legacyError) {
        return NextResponse.json({
          subscription: legacySubscription
            ? withBillingDefaults(legacySubscription as unknown as BaseSubscription)
            : null,
          schema: "legacy",
        });
      }
    }

    console.error("[billing.subscription] query failed", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ subscription, schema: "billing" });
}
