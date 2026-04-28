import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Just Do",
  description: "Calendar-based task and habit app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
