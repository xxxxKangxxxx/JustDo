import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { screen } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SupportPage, { metadata } from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("SupportPage", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("exposes contact, account deletion, and policy links without authentication", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<SupportPage />));

    expect(screen.getByRole("heading", { name: "고객지원" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "kang071911@gmail.com" }),
    ).toHaveAttribute("href", "mailto:kang071911@gmail.com");
    expect(screen.getByText(/설정 → 계정 → 회원 탈퇴/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute(
      "href",
      "/terms",
    );
    act(() => root.unmount());
  });

  it("provides store-friendly page metadata", () => {
    expect(metadata.title).toBe("고객지원 · Just Do");
    expect(metadata.description).toBe("Just Do 고객지원 및 계정 삭제 안내");
  });
});
