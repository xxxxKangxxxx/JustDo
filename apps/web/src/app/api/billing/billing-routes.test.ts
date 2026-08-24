import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  serviceClient: null as unknown,
  createSupabaseServerClient: vi.fn(),
  getSupabaseServiceRoleClient: vi.fn(),
  issueTossBillingKey: vi.fn(),
  chargeTossBillingKey: vi.fn(),
  deleteTossBillingKey: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getSupabaseServiceRoleClient: mocks.getSupabaseServiceRoleClient,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/billing/toss", () => ({
  TOSS_BILLING_PLANS: {
    monthly: { amount: 1900, orderName: "Just Do Pro 월간" },
    yearly: { amount: 9900, orderName: "Just Do Pro 연간" },
  },
  TossPaymentsError: class TossPaymentsError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code?: string,
    ) {
      super(message);
    }
  },
  isTossBillingPlanInterval: (value: unknown) =>
    value === "monthly" || value === "yearly",
  issueTossBillingKey: mocks.issueTossBillingKey,
  chargeTossBillingKey: mocks.chargeTossBillingKey,
  deleteTossBillingKey: mocks.deleteTossBillingKey,
}));

const jsonRequest = (body: unknown, init: RequestInit = {}) =>
  new Request("http://test.local", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  });

const malformedJsonRequest = () =>
  new Request("http://test.local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

const queryBuilder = <T,>(result: T) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    limit: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
};

const mutationBuilder = (result = { error: null }) => ({
  eq: vi.fn(async () => result),
});

const createServiceClient = (tables: Record<string, unknown>) => ({
  from: vi.fn((table: string) => tables[table]),
});

const expectBillingDisabled = async (response: Response) => {
  expect.soft(response.status).toBe(410);
  expect.soft(await response.json()).toEqual({ error: "billing_disabled" });
};

const expectNoExternalSideEffects = () => {
  expect.soft(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  expect.soft(mocks.getSupabaseServiceRoleClient).not.toHaveBeenCalled();
  expect.soft(mocks.issueTossBillingKey).not.toHaveBeenCalled();
  expect.soft(mocks.chargeTossBillingKey).not.toHaveBeenCalled();
  expect.soft(mocks.deleteTossBillingKey).not.toHaveBeenCalled();
};

beforeEach(() => {
  mocks.authUser = { id: "user-1" };
  mocks.serviceClient = createServiceClient({});
  mocks.createSupabaseServerClient.mockReset();
  mocks.createSupabaseServerClient.mockImplementation(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mocks.authUser },
        error: mocks.authUser ? null : new Error("unauthorized"),
      })),
    },
  }));
  mocks.getSupabaseServiceRoleClient.mockReset();
  mocks.getSupabaseServiceRoleClient.mockImplementation(() => mocks.serviceClient);
  mocks.issueTossBillingKey.mockReset();
  mocks.chargeTossBillingKey.mockReset();
  mocks.deleteTossBillingKey.mockReset();
  process.env.BILLING_CRON_SECRET = "cron-secret";
  process.env.TOSS_WEBHOOK_SECRET = "webhook-secret";
});

describe("full-free billing-disabled contract", () => {
  it("disables billing-key issuance before auth, database, or Toss calls", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    mocks.serviceClient = createServiceClient({ user_subscriptions: { upsert } });
    mocks.issueTossBillingKey.mockResolvedValue({
      billingKey: "billing-key",
      customerKey: "customer-key",
      method: "card",
      card: { number: "123456******7890" },
    });

    const { POST } = await import("./issue-key/route");
    const response = await POST(
      jsonRequest({
        authKey: "auth-key",
        customerKey: "customer-key",
        planInterval: "yearly",
      }),
    );

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
    expect.soft(upsert).not.toHaveBeenCalled();
  });

  it("returns the same disabled response for malformed issue-key input", async () => {
    const { POST } = await import("./issue-key/route");
    const response = await POST(malformedJsonRequest());

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
  });

  it("disables scheduled charges even with a valid-looking cron secret", async () => {
    const subscriptionId = "11111111-1111-4111-8111-111111111111";
    const dueQuery = queryBuilder({
      data: [
        {
          id: subscriptionId,
          user_id: "user-1",
          toss_billing_key: "billing-key",
          toss_customer_key: "customer-key",
          plan_interval: "monthly",
          amount_krw: 1900,
          payment_failures: 0,
          next_billing_at: "2026-08-21T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const update = vi.fn(() => mutationBuilder());
    const insert = vi.fn(async () => ({ error: null }));
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...dueQuery, update },
      payment_events: { insert },
    });
    mocks.chargeTossBillingKey.mockResolvedValue({
      paymentKey: "payment-key",
      orderId: "order-id",
      orderName: "Just Do Pro 월간",
      status: "DONE",
      totalAmount: 1900,
      approvedAt: "2026-08-21T00:00:00.000Z",
    });

    const { POST } = await import("./charge/route");
    const response = await POST(
      new Request("http://test.local", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      }),
    );

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
    expect.soft(update).not.toHaveBeenCalled();
    expect.soft(insert).not.toHaveBeenCalled();
  });

  it("returns the same disabled response without cron authorization", async () => {
    const { POST } = await import("./charge/route");
    const response = await POST(new Request("http://test.local", { method: "POST" }));

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
  });

  it("disables cancellation before auth, database, or Toss calls", async () => {
    const subscriptionQuery = queryBuilder({
      data: {
        id: "44444444-4444-4444-8444-444444444444",
        user_id: "user-1",
        toss_billing_key: "billing-key",
      },
      error: null,
    });
    const update = vi.fn(() => mutationBuilder());
    const insert = vi.fn(async () => ({ error: null }));
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...subscriptionQuery, update },
      payment_events: { insert },
    });
    mocks.deleteTossBillingKey.mockResolvedValue({});

    const { POST } = await import("./cancel/route");
    const response = await POST();

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
    expect.soft(update).not.toHaveBeenCalled();
    expect.soft(insert).not.toHaveBeenCalled();
  });

  it("returns the same disabled cancellation response for signed-out callers", async () => {
    mocks.authUser = null;
    const { POST } = await import("./cancel/route");
    const response = await POST();

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
  });

  it("disables valid-looking Toss webhooks before database writes", async () => {
    const subscriptionId = "33333333-3333-4333-8333-333333333333";
    const subscriptionQuery = queryBuilder({
      data: { id: subscriptionId, user_id: "user-1", plan_interval: "yearly" },
      error: null,
    });
    const upsert = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => mutationBuilder());
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...subscriptionQuery, update },
      payment_events: { upsert },
    });

    const { POST } = await import("../webhook/toss/route");
    const response = await POST(
      jsonRequest(
        {
          eventId: "event-1",
          eventType: "PAYMENT_STATUS_CHANGED",
          createdAt: "2026-08-21T00:00:00.000Z",
          data: {
            paymentKey: "payment-key",
            orderId: `justdo-${subscriptionId}-1710000000000`,
            status: "DONE",
            approvedAt: "2026-08-21T00:00:00.000Z",
            totalAmount: 9900,
          },
        },
        { headers: { "x-justdo-webhook-secret": "webhook-secret" } },
      ),
    );

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
    expect.soft(upsert).not.toHaveBeenCalled();
    expect.soft(update).not.toHaveBeenCalled();
  });

  it("returns the same disabled webhook response without a shared secret", async () => {
    const { POST } = await import("../webhook/toss/route");
    const response = await POST(
      jsonRequest({
        eventId: "event-1",
        eventType: "PAYMENT_STATUS_CHANGED",
        data: { status: "DONE" },
      }),
    );

    await expectBillingDisabled(response);
    expectNoExternalSideEffects();
  });
});
