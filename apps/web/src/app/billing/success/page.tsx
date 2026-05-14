import { BillingSuccessClient } from "./BillingSuccessClient";
import type { TossBillingPlanInterval } from "@/lib/billing/toss-client";

const planInterval = (value: string | string[] | undefined): TossBillingPlanInterval =>
  value === "yearly" ? "yearly" : "monthly";

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <BillingSuccessClient
      authKey={single(params.authKey)}
      customerKey={single(params.customerKey)}
      planInterval={planInterval(params.planInterval)}
    />
  );
}
