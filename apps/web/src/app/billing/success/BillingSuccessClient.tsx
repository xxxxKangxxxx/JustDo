"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

import {
  tossBillingPlans,
  type TossBillingPlanInterval,
} from "@/lib/billing/toss-client";

type Props = {
  authKey: string;
  customerKey: string;
  planInterval: TossBillingPlanInterval;
};

type Status = "pending" | "success" | "error";

export function BillingSuccessClient({
  authKey,
  customerKey,
  planInterval,
}: Props) {
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState("Toss 결제 결과를 확인하고 있습니다.");
  const plan = tossBillingPlans[planInterval];

  const body = useMemo(
    () => JSON.stringify({ authKey, customerKey, planInterval }),
    [authKey, customerKey, planInterval],
  );

  useEffect(() => {
    let cancelled = false;
    const issueKey = async () => {
      if (!authKey || !customerKey) {
        setStatus("error");
        setMessage("Toss 결제 결과가 올바르지 않습니다.");
        return;
      }

      try {
        const response = await fetch("/api/billing/issue-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(result.message ?? result.error ?? "billing_key_failed");
        }
        if (cancelled) return;
        setStatus("success");
        setMessage("Pro Trial이 시작되었습니다. 구독 정보는 설정에서 확인할 수 있습니다.");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "billing_key_failed",
        );
      }
    };

    void issueKey();
    return () => {
      cancelled = true;
    };
  }, [authKey, body, customerKey]);

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={eyebrowStyle}>Just Do Pro</div>
        <h1 style={titleStyle}>
          {status === "pending"
            ? "Toss 결제 확인 중"
            : status === "success"
              ? "Trial이 시작되었습니다"
              : "Toss 결제를 완료하지 못했습니다"}
        </h1>
        <p style={copyStyle}>{message}</p>
        <div style={planStyle}>
          <span>{plan.label}</span>
          <strong>{plan.price}</strong>
        </div>
        <Link href="/?settings=subscription" style={buttonStyle}>
          Just Do로 돌아가기
        </Link>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#F7F8FA",
  color: "#1C1D20",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "SF Pro Display", system-ui, sans-serif',
  padding: 24,
} satisfies CSSProperties;

const cardStyle = {
  width: "min(440px, 100%)",
  border: "1px solid #E3E6EA",
  borderRadius: 16,
  background: "#FFFFFF",
  padding: 28,
  boxShadow: "0 18px 50px rgba(20, 24, 34, 0.10)",
} satisfies CSSProperties;

const eyebrowStyle = {
  marginBottom: 8,
  color: "#4F6FD8",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0,
} satisfies CSSProperties;

const titleStyle = {
  margin: 0,
  fontSize: 26,
  lineHeight: 1.18,
  letterSpacing: 0,
} satisfies CSSProperties;

const copyStyle = {
  margin: "12px 0 18px",
  color: "#69717D",
  fontSize: 14,
  lineHeight: 1.55,
} satisfies CSSProperties;

const planStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  border: "1px solid #E3E6EA",
  borderRadius: 10,
  background: "#F7F8FA",
  padding: "12px 14px",
  marginBottom: 18,
  fontSize: 14,
} satisfies CSSProperties;

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: 42,
  borderRadius: 10,
  background: "#4F6FD8",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
} satisfies CSSProperties;
