"use client";

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

export type TossBillingPlanInterval = "monthly" | "yearly";

export const tossBillingPlans: Record<
  TossBillingPlanInterval,
  { label: string; price: string; amount: number; orderName: string }
> = {
  monthly: {
    label: "월간 Pro",
    price: "₩1,900 / 월",
    amount: 1900,
    orderName: "Just Do Pro 월간",
  },
  yearly: {
    label: "연간 Pro",
    price: "₩9,900 / 년",
    amount: 9900,
    orderName: "Just Do Pro 연간",
  },
};

type TossPayment = {
  requestBillingAuth(input: {
    method: "CARD";
    successUrl: string;
    failUrl: string;
    customerName?: string;
    customerEmail?: string;
    windowTarget?: "self" | "iframe";
  }): Promise<void>;
  destroy(): void;
};

type TossPaymentsInstance = {
  payment(input: { customerKey: string }): TossPayment;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

let sdkPromise: Promise<void> | null = null;

export const loadTossPaymentsSdk = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Toss Payments SDK is browser-only."));
  }
  if (window.TossPayments) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TOSS_SDK_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Toss Payments SDK.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TOSS_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Toss Payments SDK."));
    document.head.appendChild(script);
  });

  return sdkPromise;
};

export const createTossPayment = async (input: {
  clientKey: string;
  customerKey: string;
}) => {
  await loadTossPaymentsSdk();
  if (!window.TossPayments) {
    throw new Error("Toss Payments SDK is unavailable.");
  }
  return window.TossPayments(input.clientKey).payment({
    customerKey: input.customerKey,
  });
};
