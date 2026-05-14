import Link from "next/link";
import type { CSSProperties } from "react";

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function BillingFailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = single(params.code) || "PAY_PROCESS_ABORTED";
  const message = single(params.message) || "Toss 결제가 완료되지 않았습니다.";

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={eyebrowStyle}>Just Do Pro</div>
        <h1 style={titleStyle}>Toss 결제가 중단되었습니다</h1>
        <p style={copyStyle}>{message}</p>
        <div style={errorStyle}>{code}</div>
        <Link href="/?settings=subscription" style={buttonStyle}>
          구독 화면으로 돌아가기
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
  color: "#D36A3A",
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

const errorStyle = {
  border: "1px solid #E3E6EA",
  borderRadius: 10,
  background: "#F7F8FA",
  padding: "12px 14px",
  marginBottom: 18,
  fontSize: 12,
  color: "#D36A3A",
  fontWeight: 700,
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
