# Just Do 프로젝트 전체 검토 (2026-07-12)

문서·코드 전체를 훑고 발견한 문제점 / 개선점 / 수정 필요 항목 정리.
검토 범위: `docs/*` 19개 문서, `apps/web`, `apps/ios`, `supabase/`,
API 라우트, 빌드/테스트 상태, 저장소 구성.

검증 스냅샷 (2026-07-12 로컬 실행):

- `npm run lint:web` — 통과
- `npm run test:web` — 140개 전부 통과
- git 트리 clean, 커밋 안 된 변경 없음

---

## 1. 🔴 보안 — 출시 전 반드시 수정

### 1-1. Toss webhook 서명 검증 없음 (최우선)

`apps/web/src/app/api/webhook/toss/route.ts:24` — POST body를 그대로 신뢰한다.
`orderId`에서 subscription UUID를 뽑아 `status === "DONE"`이면 곧바로
`user_subscriptions`를 `status='active', plan_name='pro'`로 업데이트한다
(`route.ts:81-103`). 서명 헤더 검증이 전혀 없으므로, URL과 subscription id를
아는 공격자는 위조 POST 한 번으로 Pro를 무료 활성화할 수 있다.

- 현재는 Toss 대시보드에 webhook URL을 아직 등록하지 않아(가맹점 심사 후 예정)
  실질 노출은 낮지만, **엔드포인트 자체는 이미 운영 도메인에 배포되어 있다.**
- 조치: (a) Toss 심사 완료 전까지는 라우트에 임시 shared-secret 헤더 체크라도
  추가하거나, (b) 최소한 webhook URL 등록 전에 서명 검증(Toss 대시보드에서
  시크릿 확인 후)을 반드시 구현. 문서(`next_steps.md`, README)에도 "심사 후"로만
  적혀 있는데 **"URL 등록 전"이 데드라인**임을 명시할 것.
- **2026-07-16 부분 처리 완료:** Toss dashboard에 webhook이 아직 등록되지 않은
  상태라 공식 서명 검증을 추측 구현하지 않고, 임시 shared-secret 게이트를 추가했다.
  `TOSS_WEBHOOK_SECRET`과 요청 헤더 `x-justdo-webhook-secret`이 일치하지 않으면
  `/api/webhook/toss`는 401을 반환한다. Toss dashboard에서 공식 signature
  secret/header가 확인되면 이 임시 게이트를 공식 검증으로 교체해야 한다.

### 1-2. `payment_events` 중복 방지 구멍

`route.ts:38-41` — `eventId`가 없으면 `[eventType, paymentKey, orderId,
createdAt].join(":")`로 합성하는데, 전부 비어 있으면 `providerEventId || null`
→ `provider_event_id = null`. PostgreSQL에서 null끼리는 unique 충돌이 나지
않으므로 `onConflict: "provider,provider_event_id"` 멱등성이 깨진다. 합성
키가 빈 문자열이면 400으로 거절하는 편이 안전.
- **2026-07-16 처리 완료:** `eventId`가 없을 때는 `eventType + paymentKey +
  orderId + createdAt`이 모두 있어야 fallback id를 만들고, 안정적인 id를 만들 수
  없으면 400 `missing_event_id`로 거절하도록 수정했다.

### 1-3. cron 시크릿 비교가 non-constant-time

`apps/web/src/app/api/billing/charge/route.ts:20-24` — `===` 문자열 비교.
실용 위험은 낮지만 `crypto.timingSafeEqual`로 바꾸는 것이 정석. (waitlist
라우트는 입력 검증이 잘 되어 있으나 rate limiting은 전무 — 스팸 upsert 가능.
Amplify/WAF 레벨에서든 코드에서든 최소한의 제한 검토.)
- **2026-07-16 처리 완료:** `BILLING_CRON_SECRET` 비교를
  `crypto.timingSafeEqual` 기반 helper로 교체했다.

---

## 2. 🟠 결제 로직 버그 — live billing 전 수정

### 2-1. 월 단위 날짜 계산 rollover 버그 (2곳)

`webhook/toss/route.ts:88` 과 `billing/charge/route.ts:31` 모두
`next.setMonth(next.getMonth() + 1)` 사용. JS의 `setMonth`는 말일을
넘치게 처리한다: **1/31 + 1개월 → 3/3**, 10/31 → 12/1. 매달 결제일이
밀리는 실사용 버그. "다음 달 같은 날, 없으면 말일" 로직으로 교체 필요.
- **2026-07-16 처리 완료:** 공용 `addBillingInterval()` helper로 교체했다.
  `2026-01-31 + monthly = 2026-02-28`, leap year, yearly Feb 29 케이스를
  테스트로 고정했다.

### 2-2. 결제 anchor 드리프트

`charge/route.ts:26-34` — `nextBillingAt`이 이전 `next_billing_at`이 아니라
**호출 시각(`new Date()`) 기준**으로 다음 결제일을 계산한다. cron이 몇 시간
늦게 돌면 결제일이 매달 뒤로 밀린다. anchor(최초 결제일) 기준으로 계산하도록
수정 권장.
- **2026-07-16 처리 완료:** cron charge 성공 시 다음 결제일은
  `subscription.next_billing_at`을 우선 anchor로 사용해 계산하도록 변경했다.

### 2-3. 문서에 이미 기록된 미완 항목 (재확인)

- Toss 테스트 키 E2E 미실행
- DLQ(결제 실패 이벤트 보관/재처리) 없음 — live billing 직전 필수로 문서에 명시됨
- 가맹점 심사 자체가 외부 대기 (owner 트랙)

---

## 3. 🟠 릴리스 블로커 — TestFlight build 6 검증 대기

`docs/worklog.md` 2026-07-01 마지막 엔트리 기준, 릴리스 판정은 여전히
**FIX REQUIRED**. build 6은 업로드/처리 대기까지 끝났고 아래 4개의
검증만 남아 있다 (2026-07-01 이후 11일간 진행 기록 없음 — 재개 필요):

1. **H-004** — Goal Management 카드가 연관 task 완료 직후 즉시 갱신 안 되던
   문제 (build 6에 데이터 파생 키 방식으로 패치 포함, 검증 필요)
2. **H-005** — 위젯 mutation이 앱 포그라운드 시점에만 서버로 flush되는
   타이밍 (build 6의 pending 3초 재시도와 함께 확인)
3. **pending-sync 3초 재시도** — iOS/web 양쪽 신규 코드 검증
4. **계정 닉네임 편집** — 신규 기능 검증

이후 남은 것: 릴리스 후보 최종 실기기 smoke → App Store 제출.
메타데이터/스크린샷/심사 노트/프라이버시 라벨은 모두 준비 완료 상태
(`app_store_submission_next_steps.md`).

---

## 4. 🟡 코드 구조 — 유지보수성

### 4-1. 초대형 파일 2개

- `apps/ios/JustDoApp/JustDoApp/ContentView.swift` — **7,970줄**. Home, Settings,
  Goal/Habit/Category 관리, 리포트, 프롬프트, 에디터가 전부 한 파일. iOS 전체
  Swift 코드(약 16,000줄)의 절반. 화면 단위 파일 분리가 시급 (기능 변경 없이
  파일만 쪼개는 기계적 리팩터링부터 가능).
- `apps/web/src/features/just-do/app-shell.tsx` — **4,234줄**. 같은 문제.
  사이드바/캘린더/Today 패널/모달들을 컴포넌트 파일로 분리 권장.

App Store 제출 직전이므로 **제출 후 첫 작업으로** 잡는 것을 추천 (제출 전
대규모 이동은 리스크만 추가).

### 4-2. E1 매처 로직 web/iOS 이중 구현

`GoalTextMatcher.swift`(iOS)와 web 셀렉터 내 동일 로직이 "동일하게 포팅"으로
유지되고 있다. 의도된 결정이지만 **드리프트 방지 장치가 없다** — 한쪽만
고치면 진행률이 플랫폼별로 달라진다. 최소한 양쪽 테스트에 동일한 공유
케이스 표(fixture)를 두는 것을 권장.

### 4-3. semantic-matches 캐시의 문서화된 미해결 follow-up

`apps/web/src/features/just-do/semantic-matches.ts` 확인 결과 실제로 없음:

- 항목 mutation 시 해당 period 캐시 invalidate 없음 → 추가/완료 직후 TTL
  30초 동안 stale (H-004의 web 버전에 해당)
- ~~sign-out 시 `cache.clear()` 없음 → **다른 계정으로 재로그인하면 이전 계정의
  매칭 결과가 최대 30초 노출** (멀티계정 데이터 누출성 버그, 우선순위 높음)~~
  **2026-07-16 처리 완료:** web semantic match cache key를
  `userId:periodType:periodKey`로 스코프하고, auth user id 변경 시
  `clearGoalMatchCache()`를 호출하도록 수정. 단위 테스트 추가 및 web
  lint/test/build 통과.
- iOS 쪽 공유 actor 캐시 미구현 (두 화면 중복 fetch)

### 4-4. iOS refresh-token rotation 경쟁 (문서에 기록된 잠재 버그)

`AuthViewModel.reload()`와 `AppSyncCoordinator.validAppSession()`이 같은
sessionStore로 각자 refresh API를 호출할 수 있음 (handoff 2026-05-25 항목).
Supabase는 refresh token rotation을 쓰므로 동시 refresh 시 한쪽이 무효
토큰을 저장하면 강제 로그아웃. 실증상 대기 중이지만, TestFlight 외부
테스터가 늘기 전에 refresh 경로 직렬화(actor 하나로 일원화)를 권장.

---

## 5. 🟡 문서 — 낡음/중복 정리

### 5-1. 오래된 "현재 상태" 서술 (신규 세션이 오독할 위험)

- `README.md` "Current Focus" — 2026-06-01 기준으로 멈춰 있음. "Goal & Pro
  Report가 active track"이라 쓰여 있으나 실제는 TestFlight build 6 검증 단계.
- `docs/next_steps.md` — 헤더가 "Active Track (2026-06-06)"인데 실제 최신
  상태는 상단 인용 블록들에 덧붙여진 형태. 완료 항목(취소선/DONE)과 미완
  항목이 뒤섞여 실질 TODO를 골라내기 어렵다. **완료 블록을 worklog로 옮기고
  미완 항목만 남기는 압축**을 권장.
- `docs/claude_handoff.md` — "Date: 2026-06-16" 이후 갱신 없음 (1,387줄).
  최신 상태는 worklog에만 있음.

### 5-2. 같은 사실의 4중 기록

같은 결정/상태가 README + next_steps + claude_handoff + worklog에 반복
기록되고 있고, 갱신 시점이 제각각이라 서로 모순된 "현재 상태"를 말한다.
제안: **"현재 상태·남은 일"의 single source는 next_steps 하나로 고정**,
README/handoff는 링크만 유지, worklog는 지금처럼 append-only 유지.

### 5-3. 저장소에 CLAUDE.md 없음

빌드/테스트 명령의 함정(예: `swift test`는 `apps/ios`에서, `xcodebuild`는
`apps/ios/JustDoApp`에서, `trial_end_at` NOT NULL 함정 등)이 handoff 문서
깊숙이 흩어져 있다. 이런 "명령 위치 + 함정" 요약만 담은 repo 루트
`CLAUDE.md`(또는 AGENTS.md)를 만들면 Codex/Claude 세션 모두에게 유효.

### 5-4. 기타

- `docs/ios_phase6_plan.md` vs `ios_phase6_status.md` — plan은 이미 status에
  흡수된 상태. plan 쪽에 "superseded" 헤더 한 줄 추가 권장.
- `docs/worklog.md` 5,702줄 — append-only 로그로는 정상. 다만 연도별 분할
  (`worklog_2026H1.md`)을 고려할 시점.

---

## 6. 🟢 인프라·프로세스 개선

### 6-1. CI 없음

`.github/workflows` 부재. 웹 140개 + iOS 69개 테스트가 전부 수동 실행이다.
최소 구성 제안: push/PR 시 `lint:web` + `test:web` + `build:web` (GitHub
Actions ubuntu). iOS `swift test`는 macOS runner 비용이 있으니 선택.
1인 개발이라도 "깜빡하고 테스트 안 돌리고 push"를 막는 가치가 크다.

### 6-2. 운영 캘린더 항목 (잊기 쉬운 것)

- **Apple Sign-In client secret 6개월 만료** — 2026-06-14 발급 기준
  **2026-12-14 전 갱신** 필요. 갱신 절차를 문서에 날짜와 함께 명시할 것.
- **Gemini 선불 잔액** — E3 임베딩이 선불 결제 기반. 잔액 소진 시 신규 항목
  임베딩이 조용히 멈추고 E1 폴백으로만 동작. 잔액 알림 설정 또는 주기 점검
  항목화.
- embed-pending 함수의 Gemini 모델 retire 이력 있음(text-embedding-004) —
  `gemini-embedding-001`도 언젠가 같은 일이 생길 수 있으니 실패 시 알림
  경로가 없다는 점 인지.

### 6-3. 저장소 위생

- 루트에 `tmp-*.png` 14개 (gitignore 되어 있으나 어수선). 삭제하거나
  `tmp/` 폴더로 이동 권장.
- `apps/ios/build/` 116MB 로컬 아카이브 잔재 — 디스크만 차지, 정리 가능.
- `apps/goal-report/` — 프로토타입인데 ground rule("프로토타입은
  `reference/`")과 달리 `apps/` 아래에 있음. `reference/goal-report/`로
  이동하거나 README에 프로토타입임을 명시.

---

## 7. 우선순위 제안 (실행 순서)

| 순위 | 항목 | 근거 |
|---|---|---|
| 1 | build 6 TestFlight 검증 재개 (H-004/H-005/재시도/닉네임) | 유일한 App Store 제출 블로커, 7/1 이후 중단됨 |
| 2 | App Store 제출 | 준비물 전부 완료 상태 |
| 3 | 문서 정리: next_steps 압축 + README 갱신 + CLAUDE.md 신설 (§5) | 세션 온보딩 비용 절감 |
| 4 | GitHub Actions CI (§6-1) | 저비용 고효율 |
| 5 | ContentView.swift / app-shell.tsx 분할 (§4-1) | 제출 후 첫 리팩터링 |
| 6 | E1 매처 공유 fixture, refresh 직렬화, E3 threshold 등 (§4) | 여유 시 |

2026-07-16 update: 기존 3순위였던 "sign-out 시 semantic 캐시 clear"는
처리 완료되어 우선순위 목록에서 제거.
2026-07-16 update: 기존 "Toss webhook 서명 검증 + 날짜 rollover 수정" 중
날짜/anchor/멱등성/임시 webhook gate는 처리 완료. Toss 공식 webhook signature
검증은 dashboard 등록·secret 확인 후 후속 작업으로 유지.

— 검토·작성: Claude Code, 2026-07-12
