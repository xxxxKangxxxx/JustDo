import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 · Just Do",
  description: "Just Do 이용약관",
};

const EFFECTIVE_DATE = "2026-06-14";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-800">
      <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
        ← Just Do
      </Link>
      <h1 className="mt-6 text-2xl font-bold">이용약관</h1>
      <p className="mt-2 text-sm text-neutral-500">시행일: {EFFECTIVE_DATE}</p>

      <section className="mt-10 space-y-8 leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold">서비스 이용</h2>
          <p className="mt-2 text-neutral-700">
            Just Do는 할 일과 습관을 기록하고 관리하기 위한 개인 생산성
            서비스입니다. 사용자는 본인의 계정과 데이터 사용에 대한 책임을
            가집니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">계정</h2>
          <p className="mt-2 text-neutral-700">
            Apple 또는 Google 로그인을 통해 서비스를 사용할 수 있으며, 계정 정보는
            로그인과 동기화 기능 제공을 위해 사용됩니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">데이터</h2>
          <p className="mt-2 text-neutral-700">
            사용자가 입력한 할 일, 습관, 목표, 카테고리, 설정 정보는 서비스 제공과
            동기화를 위해 저장될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">유료 기능</h2>
          <p className="mt-2 text-neutral-700">
            일부 고급 기능(Pro)은 별도의 결제 정책에 따라 제공됩니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">변경</h2>
          <p className="mt-2 text-neutral-700">
            본 약관은 서비스 개선 또는 정책 변경에 따라 업데이트될 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}
