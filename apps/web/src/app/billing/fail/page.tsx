import Link from "next/link";
import type { CSSProperties } from "react";

export default function BillingFailPage() {
  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={eyebrowStyle}>Just Do</div>
        <h1 style={titleStyle}>결제 기능을 제공하지 않습니다</h1>
        <p style={copyStyle}>
          Just Do의 모든 기능은 현재 무료입니다. 결제를 다시 시도할 필요 없이
          앱으로 돌아가 모든 기능을 이용할 수 있습니다.
        </p>
        <Link href="/" style={buttonStyle}>
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
