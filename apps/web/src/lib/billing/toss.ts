import "server-only";

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

export type TossBillingPlanInterval = "monthly" | "yearly";

export const TOSS_BILLING_PLANS: Record<
  TossBillingPlanInterval,
  { amount: number; orderName: string }
> = {
  monthly: { amount: 1900, orderName: "Just Do Pro 월간" },
  yearly: { amount: 9900, orderName: "Just Do Pro 연간" },
};

type TossErrorBody = {
  code?: string;
  message?: string;
};

export type TossBillingIssueResponse = {
  mId?: string;
  customerKey: string;
  authenticatedAt?: string;
  method?: string;
  billingKey: string;
  card?: {
    issuerCode?: string;
    acquirerCode?: string;
    number?: string;
    cardType?: string;
    ownerType?: string;
  };
};

export type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  method?: string;
  card?: {
    number?: string;
  };
};

export class TossPaymentsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const secretKey = () => {
  const key = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!key) {
    throw new Error("Missing TOSS_PAYMENTS_SECRET_KEY.");
  }
  return key;
};

const authHeader = () =>
  `Basic ${Buffer.from(`${secretKey()}:`, "utf8").toString("base64")}`;

const tossFetch = async <T>(path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${TOSS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as TossErrorBody;
    throw new TossPaymentsError(
      body.message ?? "Toss Payments request failed.",
      response.status,
      body.code,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

export const issueTossBillingKey = (input: {
  authKey: string;
  customerKey: string;
}) =>
  tossFetch<TossBillingIssueResponse>("/billing/authorizations/issue", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const chargeTossBillingKey = (input: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}) =>
  tossFetch<TossPaymentResponse>(`/billing/${encodeURIComponent(input.billingKey)}`, {
    method: "POST",
    body: JSON.stringify({
      customerKey: input.customerKey,
      amount: input.amount,
      orderId: input.orderId,
      orderName: input.orderName,
    }),
  });

export const deleteTossBillingKey = (billingKey: string) =>
  tossFetch<Record<string, never>>(`/billing/${encodeURIComponent(billingKey)}`, {
    method: "DELETE",
  });

export const isTossBillingPlanInterval = (
  value: unknown,
): value is TossBillingPlanInterval =>
  value === "monthly" || value === "yearly";
