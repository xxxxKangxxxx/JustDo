import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  serviceClient: null as unknown,
  issueTossBillingKey: vi.fn(),
  chargeTossBillingKey: vi.fn(),
  deleteTossBillingKey: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mocks.authUser },
        error: mocks.authUser ? null : new Error("unauthorized"),
      })),
    },
  })),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getSupabaseServiceRoleClient: vi.fn(() => mocks.serviceClient),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/billing/toss", () => {
  return {
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
  };
});

const jsonRequest = (body: unknown, init: RequestInit = {}) =>
  new Request("http://test.local", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
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

beforeEach(() => {
  vi.useRealTimers();
  vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"));
  mocks.authUser = { id: "user-1" };
  mocks.serviceClient = createServiceClient({});
  mocks.issueTossBillingKey.mockReset();
  mocks.chargeTossBillingKey.mockReset();
  mocks.deleteTossBillingKey.mockReset();
  process.env.BILLING_CRON_SECRET = "cron-secret";
});

describe("billing issue-key route", () => {
  it("issues a Toss billing key and stores subscription metadata", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { upsert },
    });
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

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      planInterval: "yearly",
      amount: 9900,
    });
    expect(mocks.issueTossBillingKey).toHaveBeenCalledWith({
      authKey: "auth-key",
      customerKey: "customer-key",
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        status: "trial",
        billing_provider: "toss_payments",
        toss_billing_key: "billing-key",
        toss_customer_key: "customer-key",
        plan_interval: "yearly",
        amount_krw: 9900,
        payment_method_last4: "7890",
      }),
      { onConflict: "user_id" },
    );
  });

  it("rejects unauthenticated issue-key requests", async () => {
    mocks.authUser = null;
    const { POST } = await import("./issue-key/route");
    const response = await POST(
      jsonRequest({ authKey: "auth-key", customerKey: "customer-key" }),
    );

    expect(response.status).toBe(401);
  });
});

describe("billing charge route", () => {
  it("charges due subscriptions and advances billing dates", async () => {
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
        },
      ],
      error: null,
    });
    const insertEvent = vi.fn(async () => ({ error: null }));
    const updateSubscription = vi.fn(() => mutationBuilder());
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...dueQuery, update: updateSubscription },
      payment_events: { insert: insertEvent },
    });
    mocks.chargeTossBillingKey.mockResolvedValue({
      paymentKey: "payment-key",
      orderId: "order-id",
      orderName: "Just Do Pro 월간",
      status: "DONE",
      totalAmount: 1900,
      approvedAt: "2026-05-19T00:00:00.000Z",
    });

    const { POST } = await import("./charge/route");
    const response = await POST(
      new Request("http://test.local", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      charged: [subscriptionId],
      failed: [],
    });
    expect(mocks.chargeTossBillingKey).toHaveBeenCalledWith(
      expect.objectContaining({
        billingKey: "billing-key",
        customerKey: "customer-key",
        amount: 1900,
      }),
    );
    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        payment_failures: 0,
        toss_last_payment_key: "payment-key",
      }),
    );
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "BILLING_CHARGE_REQUESTED",
        payment_key: "payment-key",
        subscription_id: subscriptionId,
      }),
    );
  });

  it("pauses subscriptions after the third charge failure", async () => {
    const subscriptionId = "22222222-2222-4222-8222-222222222222";
    const dueQuery = queryBuilder({
      data: [
        {
          id: subscriptionId,
          user_id: "user-1",
          toss_billing_key: "billing-key",
          toss_customer_key: "customer-key",
          plan_interval: "monthly",
          amount_krw: 1900,
          payment_failures: 2,
        },
      ],
      error: null,
    });
    const insertEvent = vi.fn(async () => ({ error: null }));
    const updateSubscription = vi.fn(() => mutationBuilder());
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...dueQuery, update: updateSubscription },
      payment_events: { insert: insertEvent },
    });
    mocks.chargeTossBillingKey.mockRejectedValue(new Error("card declined"));

    const { POST } = await import("./charge/route");
    const response = await POST(
      new Request("http://test.local", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      charged: [],
      failed: [subscriptionId],
    });
    expect(updateSubscription).toHaveBeenCalledWith({
      status: "paused",
      payment_failures: 3,
      next_billing_at: null,
    });
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "BILLING_CHARGE_FAILED",
        processing_error: "card declined",
      }),
    );
  });
});

describe("billing cancel route", () => {
  it("cancels an active Toss subscription, deletes the billing key, and records an event", async () => {
    const subscriptionId = "44444444-4444-4444-8444-444444444444";
    const subscriptionQuery = queryBuilder({
      data: {
        id: subscriptionId,
        user_id: "user-1",
        toss_billing_key: "billing-key",
      },
      error: null,
    });
    const updateSubscription = vi.fn(() => mutationBuilder());
    const insertEvent = vi.fn(async () => ({ error: null }));
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...subscriptionQuery, update: updateSubscription },
      payment_events: { insert: insertEvent },
    });
    mocks.deleteTossBillingKey.mockResolvedValue({});

    const { POST } = await import("./cancel/route");
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.deleteTossBillingKey).toHaveBeenCalledWith("billing-key");
    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        next_billing_at: null,
        toss_billing_key: null,
        payment_failures: 0,
      }),
    );
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "toss_payments",
        event_type: "BILLING_CANCELLED",
        subscription_id: subscriptionId,
        user_id: "user-1",
      }),
    );
  });

  it("cancels local subscription state even when no Toss billing key exists", async () => {
    const subscriptionId = "55555555-5555-4555-8555-555555555555";
    const subscriptionQuery = queryBuilder({
      data: {
        id: subscriptionId,
        user_id: "user-1",
        toss_billing_key: null,
      },
      error: null,
    });
    const updateSubscription = vi.fn(() => mutationBuilder());
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...subscriptionQuery, update: updateSubscription },
      payment_events: { insert: vi.fn(async () => ({ error: null })) },
    });

    const { POST } = await import("./cancel/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.deleteTossBillingKey).not.toHaveBeenCalled();
    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        toss_billing_key: null,
      }),
    );
  });

  it("returns a Toss error without clearing local subscription state when billing-key deletion fails", async () => {
    const subscriptionQuery = queryBuilder({
      data: {
        id: "66666666-6666-4666-8666-666666666666",
        user_id: "user-1",
        toss_billing_key: "billing-key",
      },
      error: null,
    });
    const updateSubscription = vi.fn(() => mutationBuilder());
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...subscriptionQuery, update: updateSubscription },
      payment_events: { insert: vi.fn(async () => ({ error: null })) },
    });
    const { TossPaymentsError } = await import("@/lib/billing/toss");
    mocks.deleteTossBillingKey.mockRejectedValue(
      new TossPaymentsError("invalid billing key", 400, "INVALID_BILLING_KEY"),
    );

    const { POST } = await import("./cancel/route");
    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "toss_error",
      code: "INVALID_BILLING_KEY",
      message: "invalid billing key",
    });
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it("returns 404 when there is no subscription to cancel", async () => {
    mocks.serviceClient = createServiceClient({
      user_subscriptions: queryBuilder({ data: null, error: null }),
    });

    const { POST } = await import("./cancel/route");
    const response = await POST();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "subscription_not_found",
    });
  });
});

describe("toss webhook route", () => {
  it("stores webhook events idempotently and activates completed payments", async () => {
    const subscriptionId = "33333333-3333-4333-8333-333333333333";
    const subscriptionQuery = queryBuilder({
      data: { id: subscriptionId, user_id: "user-1", plan_interval: "yearly" },
      error: null,
    });
    const upsertEvent = vi.fn(async () => ({ error: null }));
    const updateSubscription = vi.fn(() => mutationBuilder());
    mocks.serviceClient = createServiceClient({
      user_subscriptions: { ...subscriptionQuery, update: updateSubscription },
      payment_events: { upsert: upsertEvent },
    });

    const { POST } = await import("../webhook/toss/route");
    const response = await POST(
      jsonRequest({
        eventId: "event-1",
        eventType: "PAYMENT_STATUS_CHANGED",
        createdAt: "2026-05-19T00:00:00.000Z",
        data: {
          paymentKey: "payment-key",
          orderId: `justdo-${subscriptionId}-1710000000000`,
          status: "DONE",
          approvedAt: "2026-05-19T00:00:00.000Z",
          totalAmount: 9900,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(upsertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "toss_payments",
        provider_event_id: "event-1",
        payment_key: "payment-key",
        subscription_id: subscriptionId,
      }),
      { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
    );
    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        plan_name: "pro",
        toss_last_payment_key: "payment-key",
        payment_failures: 0,
      }),
    );
  });
});
