import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "고객지원 · Just Do",
  description: "Just Do 고객지원 및 계정 삭제 안내",
};

const CONTACT_EMAIL = "kang071911@gmail.com";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-800">
      <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
        ← Just Do
      </Link>
      <h1 className="mt-6 text-2xl font-bold">고객지원</h1>
      <p className="mt-2 text-neutral-600">
        Just Do 이용 중 궁금한 점이나 문제가 있다면 이메일로 문의해 주세요.
      </p>

      <section className="mt-10 space-y-8 leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold">문의하기</h2>
          <p className="mt-2 text-neutral-700">
            문의 이메일: {" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            사용 중인 기기와 문제 상황을 함께 적어주시면 확인에 도움이 됩니다.
            접수된 문의는 해당 이메일로 답변드립니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">계정 삭제</h2>
          <p className="mt-2 text-neutral-700">
            iOS 앱에서 설정 → 계정 → 회원 탈퇴를 선택하면 계정과 서비스
            데이터를 삭제할 수 있습니다. 삭제가 완료되면 복구할 수 없습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">정책 안내</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <Link className="underline" href="/privacy">
              개인정보처리방침
            </Link>
            <Link className="underline" href="/terms">
              이용약관
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
