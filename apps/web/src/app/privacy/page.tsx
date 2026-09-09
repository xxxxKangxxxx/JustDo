import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 · Just Do",
  description: "Just Do 개인정보처리방침",
};

const EFFECTIVE_DATE = "2026-09-09";
const CONTACT_EMAIL = "kang071911@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-800">
      <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
        ← Just Do
      </Link>
      <h1 className="mt-6 text-2xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-neutral-500">시행일: {EFFECTIVE_DATE}</p>

      <section className="mt-10 space-y-8 leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold">1. 수집 항목</h2>
          <p className="mt-2 text-neutral-700">
            서비스는 다음 정보를 처리할 수 있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
            <li>
              계정 정보: Apple 또는 Google 로그인 시 제공되는 이메일 주소,
              (제공되는 경우) 프로필 이름, 서비스 내 사용자 식별자. Apple의 “이메일
              가리기” 사용 시 익명 릴레이 주소가 제공될 수 있습니다.
            </li>
            <li>
              서비스 데이터: 사용자가 입력한 할 일, 습관, 목표, 카테고리, 메모,
              태그 및 앱 설정.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. 이용 목적</h2>
          <p className="mt-2 text-neutral-700">
            수집된 정보는 로그인 및 계정 식별, 기기 간 데이터 동기화, 위젯 표시,
            사용자 설정 유지 등 서비스 제공 목적으로만 사용됩니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">3. 제3자 제공 및 추적</h2>
          <p className="mt-2 text-neutral-700">
            법령에 따른 경우를 제외하고 사용자 정보를 제3자에게 제공하지 않습니다.
            광고나 분석을 위한 추적, 광고 식별자 수집을 하지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">4. 저장 및 위탁</h2>
          <p className="mt-2 text-neutral-700">
            데이터는 클라우드 인프라(Supabase)에 저장되며, 서비스 제공을 위한
            범위에서만 처리됩니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">5. 보관 및 삭제</h2>
          <p className="mt-2 text-neutral-700">
            데이터는 서비스 이용 기간 동안 보관됩니다. iOS 앱의 설정에서 계정
            화면을 열고 “회원 탈퇴”를 선택하면 계정 삭제를 요청할 수 있습니다.
            삭제가 완료되면 인증 계정과 사용자가 입력한 할 일, 습관, 목표,
            카테고리 및 설정 데이터가 삭제됩니다. Apple 로그인 계정은 연결된
            로그인 토큰도 함께 철회됩니다. 법령상 별도의 보관 의무가 있는 정보는
            해당 기간 동안 보관될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">6. 문의</h2>
          <p className="mt-2 text-neutral-700">
            개인정보 관련 문의는 아래 연락처로 접수할 수 있습니다:{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </section>

      <p className="mt-12 text-sm text-neutral-400">
        본 방침은 서비스 개선 또는 정책 변경에 따라 업데이트될 수 있습니다.
      </p>
    </main>
  );
}
