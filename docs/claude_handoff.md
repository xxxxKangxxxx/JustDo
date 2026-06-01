# Handoff (next session — Codex or Claude Code)

Date: 2026-06-01
Branch: `main`
Remote: `origin` -> `https://github.com/xxxxKangxxxx/JustDo.git`

This handoff is written so the next session can continue without replaying the
chat. Chronological detail lives in `docs/worklog.md`; planned work lives in
`docs/next_steps.md`.

> **2026-05-10 Platform Strategy 결정** — Web과 iOS의 UI/UX는 의도적으로 분기.
> Web=데스크탑 productivity hub, iOS=모바일 네이티브, Android=v3.
> **Phase 7 Web Desktop Redesign**이 v1 출시 차단 항목으로 신설됨.
> 자세한 내용: `just_do_prd.md` §1.5 / `next_steps.md` Phase 7 / 본 문서
> "App Shape Now" 섹션 / `worklog.md` 2026-05-10 엔트리.

> **2026-05-17 운영 도메인 LIVE** — `https://www.justdo.co.kr` (apex →
> www redirect). Amplify Hosting Compute (`dcsdzu0ew3l2m`, 리전
> `ap-northeast-2`), Route 53 위임, ACM TLS, Next.js SSR (`Next.js - SSR`
> framework + `WEB_COMPUTE` platform + `AMPLIFY_MONOREPO_APP_ROOT=apps/web`).
> Production smoke test 통과 — Google 로그인 / Task·Habit 생성·persist /
> Settings 구독 패널 Trial 상태 노출 / 모바일 안내 페이지 (768px 기준).
> Supabase Redirect URLs도 5개(운영 2 + 로컬 3)로 정리됨. 남은 Deployment
> 항목은 **Toss webhook URL 등록 (`https://www.justdo.co.kr/api/webhook/toss`)
> — Toss 가맹점 심사 후**.

> **2026-05-25 운영 신규 가입 차단 버그 fix LIVE** — 운영 도메인에서 처음
> 가입하는 Google 계정이 callback URL의 `server_error` / "Database error"로
> 로그인 루트 페이지로 되돌아오던 증상을 fix. 원인은
> `handle_new_auth_user()` 트리거가 시드 카테고리 insert에 사용하는
> `on conflict (user_id, name) do nothing` 구문이 매칭 unique index 부재로
> PostgreSQL `there is no unique or exclusion constraint matching the ON
> CONFLICT specification` 에러를 던지고 그게 Supabase auth로 전파된 것.
> 신규 마이그레이션 `supabase/migrations/20260525090000_categories_user_name_unique.sql`
> 로 `(user_id, name)` unique index를 추가하고 hosted Supabase에 `supabase
> db push` 적용 완료. 새 Google 계정 가입 → 홈 진입 정상 확인. 진단/경위:
> `worklog.md` 2026-05-25 "Production signup DB error fix" 엔트리. Toss billing
> 마이그레이션(`20260514061000_toss_billing.sql`)도 같은 ON CONFLICT 구문을
> 그대로 들고 있던 latent bug였으므로 향후 트리거 본문에 ON CONFLICT를 추가할
> 때는 매칭 unique index를 같은 마이그레이션에서 함께 보장할 것.

> **2026-05-25 iOS 세션 자동 refresh fix LIVE** — iOS 앱을 1시간 이상
> 종료/백그라운드 상태에 두고 다시 열면, refresh token이 살아있어도
> `AuthViewModel.reload()`가 expired 세션을 만나는 즉시 `.signedOut`으로
> 떨어뜨려 로그인 루트 화면이 다시 표시되던 증상을 fix. iPhone 14 Pro / iOS
> 26.5 실기기에서 1시간+ 종료 후 재진입 시 로그인 유지 확인 완료. 변경:
> `apps/ios/JustDoApp/JustDoApp/AuthViewModel.swift`에서 `reload()`를 async로
> 바꿔 expired 세션을 만나면 `authClient.refreshSession(...)`으로 자동 갱신
> (HTTP 400/401만 sign-out, 그 외 transient는 stored profile로 `.signedIn`
> 유지). `apps/ios/JustDoApp/JustDoApp/ContentView.swift`에 `@Environment(\.scenePhase)`
> 구독을 추가해 `.active` 진입 시 `auth.reload()`를 재호출 — 백그라운드 →
> 포그라운드 복귀에서도 토큰을 자동 refresh. `swift test` 40개 + simulator
> build 통과. 실기기 1시간+ 종료 후 재진입 시나리오 smoke는 사용자 트랙에서
> 진행 예정. 잠재 follow-up은 `AuthViewModel.reload()`와
> `AppSyncCoordinator.validAppSession()`이 같은 sessionStore를 통해 각자 refresh
> API를 호출할 수 있어 포그라운드 진입 시 refresh-token rotation 충돌 가능성 —
> 실사용 증상이 나오면 sessionStore 접근 직렬화 또는 한쪽 경로 일원화 follow-up.

> **2026-05-29 iOS Just Do Mode / Pro sync / edit sheet cleanup** — Just Do
> Mode와 iOS 편집 흐름의 후속 피드백을 반영. iOS Supabase read-sync가
> `user_subscriptions`를 읽지 않아 Web에서는 Pro인데 앱 Settings는 Free로
> 남던 문제를 fix했다. `plan_name='pro'` + `status in ('trial','active')`를
> local `settings.plan = "pro"`로 매핑하고 Core Data mirror에도 raw `plan`을
> 저장한다. Home selected-day sheet는 Task row tap 시 같은 sheet 안에서
> `TaskDetailEditor`를 열고 Task 삭제도 지원한다. Habit row tap은 아무 동작도
> 하지 않고 check control만 유지한다. `TaskDetailScreen` /
> `HabitDetailScreen` 등 pushed detail page 코드는 제거했지만,
> `justdo://task/<id>` / `justdo://habit/<id>`는 Home으로 들어와 editor sheet를
> 여는 방식으로 유지된다. Just Do Mode 설정은 availability만 결정하고, sheet의
> `오늘만` / `이 날까지` 선택은 local state로 분리했다. 설정 ON인 Pro 사용자는
> 두 모드를 모두 사용할 수 있고, 설정 OFF면 `이 날까지`가 lock icon과 함께
> disabled 된다. 검증: `swift test` 43개, simulator `xcodebuild` build,
> `git diff --check` 통과. 자세한 경위는 `worklog.md` 2026-05-29 엔트리.
>
> **주의: hosted DB에서 수동 Pro 전환** — `user_subscriptions.trial_end_at`은
> NOT NULL이다. `trial_end_at = null`을 넣는 upsert는 PostgreSQL `ERROR 23502`
> 로 실패한다. 테스트 계정을 Pro로 만들 때는 기존 non-null `trial_end_at`을
> 유지하거나 far-future 값을 넣는다.
>
> **주의: iOS 명령 위치** — `swift test`는 `apps/ios`에서 실행. 앱 빌드는
> `.xcodeproj`가 있는 `apps/ios/JustDoApp`에서
> `xcodebuild -project JustDoApp.xcodeproj ...`로 실행한다.

> **2026-05-30 Goal & Pro Report first pass + iOS device iteration** — Goal &
> Pro Report MVP is no longer only a planned track. The migration
> `20260529120000_goal_report.sql` exists and hosted Supabase reports it as
> applied. Web first pass includes Settings → 목표 management, goal CRUD,
> prompts, Free preview, and Trial/Pro report modal. iOS first pass includes
> shared `Goal` / `GoalPromptDismissal` models, Core Data mirror, mutation
> queue, Supabase REST sync, Settings → 목표 sheet, goal cards, centered
> add/edit dialog, onboarding/monthly/yearly prompts, and report preview/detail
> scaffolding. Real-device UI feedback was reflected: title spacing tightened,
> sheet back chevron removed, memo restored, guide previews added, one initial
> goal row, swipe-delete rows, keyboard dismissal, larger donut progress, and
> card lock badge direct toggle. Sync issue `HTTP 400` / PostgreSQL `23514` /
> `goals_check1` was fixed by explicitly encoding `locked_at: null` on unlocked
> goal upsert. Settings → 목표 focused smoke is user-confirmed, and the centered
> goal editor now asks `목표를 삭제할까요?` before destructive deletion.
> Verification: `swift test --package-path apps/ios` passed 46 tests, generic
> iOS `xcodebuild` passed, `git diff --check` passed, and user confirmed the
> sync error was resolved.

> **2026-06-01 product IA decision** — Settings should move from the iOS bottom
> tab bar to a Home top-right icon. The standalone Stats tab should be removed
> and folded into Goal & Pro Report's report/activity-summary experience. Keep
> the bottom bar for continuity with a single centered `홈` tab until the future
> `함께` friendship/scheduling track is ready. Reports are period-end retrospectives,
> not always-on menus: monthly reports activate on the first day of the next
> month, yearly reports activate on January 1 of the next year, Home top banner
> is the primary entry, and Settings → 목표 gets smaller supporting banners near
> annual/monthly sections.

> **다음 작업자가 픽업할 우선순위 (2026-06-01 갱신)**:
> 1. **iOS IA/report-entry 반영**. Settings를 Home 우측 상단으로 옮기고,
>    Stats 독립 탭을 제거해 리포트/활동 요약으로 흡수한다. 하단 바는 Home 단일
>    탭 중앙 배치로 유지한다. 기간 종료 리포트는 Home 상단 배너를 기본 진입으로,
>    Settings → 목표 보조 배너를 fallback으로 구현한다.
> 2. **Web tag UX 수정**. 좌측 Tag 클릭은 검색이 아니라 category/priority와
>    같은 Task 필터로 동작해야 한다. Task 입력 태그는 Space/Enter로 commit하고
>    `#태그`와 `태그`를 같은 저장값(`태그`)으로 정규화한다.
> 3. **Toss 가맹점 심사 준비 병행** (사용자 외부 트랙, 가장 긴 차단 항목
>    ~2–3주). 사업자등록 → 통신판매업 신고 → Toss Payments 가맹점 신청 순서.
>    체크리스트: `docs/toss_merchant_review_plan.md`.
> 4. **iOS TestFlight/App Store 준비**. Goal & Pro Report first pass가 포함된
>    상태로 archive/TestFlight 작업으로 이동. 현재 Auth landing,
>    Home, Add Sheet, editor-sheet routing, Just Do Mode, Stats, Settings,
>    Widget 보정은 iPhone 14 Pro iOS 26.5 실기기 최종 smoke까지 통과. 세션
>    자동 refresh도 1시간+ 종료 후 재진입 smoke 통과.
> 5. **Pro Checkout B6 외부 의존 검증 / DLQ**. route 단위 테스트, Toss SDK
>    client mock, cancel edge cases, webhook fixture/idempotency는 보강 완료.
>    남은 항목은 Toss test-key E2E smoke, Toss 공식 dashboard secret/header 확인
>    후 webhook signature 검증, live billing 직전 `justdo-prod-billing-cron`
>    Lambda async invocation SQS DLQ 연결.
>
> **유지 상태 (참고)**:
> - **iOS Bundle ID 확정**: `kr.justdo.app` (앱) / `kr.justdo.app.widget`
>   (위젯) / `kr.justdo.app.uitests` (UI 테스트). App Group `group.kr.justdo.app`,
>   Keychain service `kr.justdo.app.supabase-session`. 운영 도메인 `justdo.co.kr`
>   기반 reverse-DNS. `com.justdo.app`은 Apple 글로벌 namespace에서 다른 팀
>   선점 중이라 회수 불가.
> - **iOS 실기기 검증 환경**: iPhone 14 Pro iOS 26.5, Xcode 26.3, macOS
>   Tahoe 26.3.1. Developer Team 활성. Wireless debugging 자동 (USB 분리 시
>   🌐 아이콘으로 전환).
> - **iOS 홈 화면 디자인 변경 (2026-05-29 갱신)**: Bottom sheet 모달 패턴
>   (`.height(500)` + `.large` detent). Inline drag-resize 패턴 폐기. Sheet 안
>   좌우 swipe로 ±1 day, calendar 좌우 swipe로 ±1 month. Cell tap area는
>   row 전체. Task bar는 `.allowsHitTesting(false)`로 tap pass-through.
>   실기기 피드백 후 home header와 calendar를 함께 아래로 내려 중앙감 보정.
> - **iOS Add Sheet 검증 완료 (2026-05-22)**: 입력 영역 상단 고정,
>   시작/종료 날짜 wheel `DatePicker` sheet, `시간 포함` 소형 토글,
>   날짜-only 저장 지원, selected-day sheet의 `+`에서도 task/habit 추가 가능.
> - **iOS Edit Sheet / Stats 검증 완료 (2026-05-29 갱신)**: Task edit UI를
>   Add Sheet 스타일로 정렬하고 완료 토글 제거. pushed detail page는 제거했고
>   Home/deep link는 editor sheet로 연결. Home selected-day sheet에서 다른 날짜
>   항목을 체크해도 날짜 유지. Stats 연월 포맷, 카테고리 0-count, 최근 7일
>   Habit 셀 요일 표시 수정.
> - **iOS Settings / Widget 보정 완료 (2026-05-22)**: Settings 계정 프로필,
>   계정 상세, 알림/표시 picker, Pro-gated CSV export, reset, legal sheets
>   보정. Home-screen widget은 row 전체 탭으로 완료 토글, Task/Habit mode별
>   progress count, compact layout/font/check-dot polish 적용. Lock-screen
>   widget은 Task-only accessory로 분리하고 rectangular layout 보정.
> - **iOS 다크모드 처리**: Auth landing은 항상 light 고정
>   (`.preferredColorScheme(.light)`). Home/Stats/Settings는 Settings의
>   다크모드 토글 사용.
> - **App icon / Web favicon**: iOS는 single 1024 PNG (dark/tinted 추후).
>   Web은 `apps/web/public/`에 SVG primary + PNG fallback + apple-touch-icon.
> - **B3 cron**: AWS EventBridge Scheduler -> Lambda -> `/api/billing/charge`,
>   매일 05:30 KST. Lambda + schedule 생성, 수동 테스트, 첫 자동 실행 두 번
>   (2026-05-20 / 2026-05-21 05:30 KST) CloudWatch 확인 완료(2026-05-21).
>   Errors 0 / 성공률 100%, `payment_events` 0건(예상대로).
> - **B4-c / B5 정책**: Web 앱 로그인 필수, Trial 동안 Pro 사용 가능,
>   결제수단 등록은 Trial 종료 후 Pro 지속 사용 조건. Stats dashboard에
>   Pro gate 적용.

## Resume Work — cold-start checklist

The current local Supabase stack and web dev server may already be running
from the latest Codex session. To pick up "let's start working":

### 0. Tooling sanity (versions known to work as of 2026-04-29)

- Node `v24.6.0`
- npm `11.5.1`
- Supabase CLI `2.95.4`
- Docker Desktop running (only required if you choose the local stack
  in step 2).

### 1. Repo state

```bash
cd /Users/kang-yeongmo/justdo
git pull --ff-only origin main
npm install                    # safe to rerun; idempotent
```

`apps/web/.env.local` is gitignored. If missing, copy from the template
and fill values:

```bash
cp apps/web/.env.local.example apps/web/.env.local
# then edit:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY
# - TOSS_PAYMENTS_SECRET_KEY
# - BILLING_CRON_SECRET
```

For hosted (cloud) Supabase the values come from
`https://supabase.com/dashboard/project/cohkxnwsbhrsfmsjqdpa/settings/api`.
For local Supabase the values come from `supabase status -o env` after
step 2.

### 2. Choose cloud OR local Supabase

**Cloud (default for this project)** — no extra startup. `apps/web/.env.local`
points at the hosted project (`cohkxnwsbhrsfmsjqdpa.supabase.co`). Skip to
step 3.

**Local stack** — starts a Docker-backed Postgres / Studio / Realtime stack.
Use this only when you need to run un-pushed migrations or test offline.

```bash
supabase start                 # spawns supabase_*_justdo containers
supabase status -o env         # copy API_URL/ANON_KEY into apps/web/.env.local
```

Latest known local stack state: started and migrated through
`20260430103000_user_preferences.sql`. Local Postgres data is preserved in a
docker volume (`docker volume ls --filter label=com.supabase.cli.project=justdo`).

### 3. Run the web dev server

```bash
npm run dev:web                # → http://localhost:3000
```

Sign-in flow uses Google OAuth. Hosted callback is already configured at
`https://cohkxnwsbhrsfmsjqdpa.supabase.co/auth/v1/callback`. Local
callback is `http://127.0.0.1:3000/callback`.

### 4. Verify before changing anything

```bash
npm --prefix apps/web run lint     # expect: pass
npm --prefix apps/web test         # expect: 86 tests pass
npm --prefix apps/web run build    # expect: pass
git diff --check                   # expect: clean
```

For iOS shared-code verification:

```bash
cd apps/ios
swift test                         # expect: 40 tests pass
```

For iOS simulator build smoke:

```bash
cd apps/ios && xcodebuild -project JustDoApp/JustDoApp.xcodeproj \
  -scheme JustDoApp \
  -destination 'generic/platform=iOS Simulator' build
```

For real-device verification (iPhone 14 Pro / iOS 26.5 is the configured
target as of 2026-05-22):

1. Pair the iPhone over USB once. Xcode 26 enables wireless debugging
   automatically; the device gains a 🌐 icon under `Window > Devices and
   Simulators` and remains under `Connected` after the cable is unplugged.
2. `Settings > Privacy & Security > Developer Mode` must be on (this
   menu only appears on the iPhone after the first Xcode pairing).
3. Confirm `Xcode > Settings > Accounts` shows the Developer Team
   (not the Personal Team) for `dudah0719@naver.com`. If only the
   Personal Team variant is offered, Sign Out / Sign In once.
4. All three targets (`JustDoApp`, `JustDoWidgetExtension`,
   `JustDoAppUITests`) must stay on the `kr.justdo.app` namespace with
   automatic signing.
5. Press ⌘R in Xcode with the device selected as the destination.

If any step fails, stop and investigate before starting new work. The latest
pushed iOS infrastructure commits were green before this handoff.

### 5. End-of-session cleanup

When wrapping up, mirror what this session did:

```bash
# stop local supabase if you started it
supabase stop --workdir /Users/kang-yeongmo/justdo

# kill any dev servers you started (npm run dev:web, vitest --watch, etc.)
# one-shot commands (lint, test, build) leave nothing behind.

# verify ports are released
lsof -i -P -n | grep -E "5432[1-7]|3000" || echo "(clean)"

# verify only this project's containers are gone (others stay up)
docker ps --format '{{.Names}}'
```

Do not stop the unrelated containers (`freshbox-*`, `field-*`, etc.) —
they belong to other projects on this machine.

## Working Tree State

After the 2026-05-30 Goal & Pro Report docs/code commit lands and is pushed,
the working tree should be clean. Hosted Supabase has migrations through
`20260529120000_goal_report.sql`. The iOS auth refresh change passed the
real-device 1-hour close-and-relaunch smoke on iPhone 14 Pro / iOS 26.5; the
sessionStore concurrent-refresh race documented as a follow-up did not surface
during the smoke, so it stays as a watch item rather than an active task.

Latest known commits before the Goal & Pro Report commit (2026-05-30):

```text
8eb8e5a docs: plan goal report next track
ed714aa fix: polish web calendar smoke issues
2b262d6 fix: align web just do mode behavior
5d395b9 docs: record ios final smoke pass
bc71799 fix: refine ios just do mode and pro sync
80381c7 feat(ios): auto-refresh auth session on foreground
21ee0cd feat(supabase): add categories user-name unique index for signup trigger
```

For Claude Code/Codex handoff, do not replay the chat. Start from this file,
`docs/worklog.md` latest 2026-05-30 entries, and `docs/next_steps.md` current
priority. Then run `git pull --ff-only origin main`, `git status -sb`, and the
iOS build/test commands below before doing the next real-device smoke pass.

## Current Status

- Phase 1 Repository Baseline — done.
- Phase 2 Web App Bootstrap — done.
- Phase 3 Local Data Layer — done.
- Phase 4 Supabase Integration — done.
- Phase 5 Offline Sync — done.
  - Plus follow-up: Task tag chip UI in Add/Edit sheet, automated
    offline→online sync regression tests, manual cloud verification
    checklist in `docs/local_dev.md`.
- Phase 5.5 Category Management — done. Button reorder and drag reorder are
  both supported, and PRD/planning category prose now reflects custom
  categories.
- Phase 5.6 User Preferences Sync — done.
- Phase 5.7 Habit Recurrence (daily + weekly) — done for new habit creation,
  storage/sync, selectors, Habit screen, Stats screen, and Habit detail/edit.
- **Phase 7 Web Desktop Redesign — 결제 외 완료; Pro checkout 잔여 진행 중**.
  - 사용자가 `reference/web_proto/`와 `reference/Just Do - Web Prototype.html`에
    데스크탑 web prototype을 제공함.
  - First implementation pass shipped in `apps/web/src/features/just-do/app-shell.tsx`:
    sidebar/header desktop shell, month/week/list calendar, Today side panel,
    Task/Habit add modal, Task detail modal, command palette, bulk actions,
    Stats dashboard, Settings split layout, category/habit management, task tag
    input, and Pro upgrade entry surface.
  - Mobile web 안내 page is implemented as a viewport-based fallback for
    `< lg` screens, before and after sign-in. iOS App Store URL is wired by
    `NEXT_PUBLIC_IOS_APP_STORE_URL`; Android waitlist is wired through
    `public.waitlist` + `POST /api/waitlist`.
  - Desktop UI interaction tests now cover Task/Habit add modal, calendar date
    selection vs `+` add, Today Task/Habit check toggles, and Settings selected
    section rendering.
  - Task detail modal tag editing is implemented: add/delete tags from the
    desktop detail modal and persist through `updateTask`.
  - Desktop Habit edit is implemented from Settings → 습관 관리: title, emoji,
    daily/weekly recurrence, weekday picker, and reminder time.
  - Category reorder is restored in Settings → 카테고리 관리 with up/down
    controls backed by `position` swaps.
  - Manual offline sync verification and 1024 / 1280 / 1440 / 1920 visual
    verification passed on 2026-05-13.
  - Pro checkout track is the remaining v1 blocker:
    - B1 schema migration done: `20260514061000_toss_billing.sql`.
    - B2 API route skeleton done:
      `POST /api/billing/issue-key`, `POST /api/billing/charge`,
      `POST /api/billing/cancel`, `POST /api/webhook/toss`,
      `GET /api/billing/subscription`.
    - B4-a UI wiring done: Toss JS SDK v2 `requestBillingAuth()` from
      Settings -> 구독 -> Pro plan -> Toss payment method button.
    - B4-b subscription panel status/cancel done: reads
      `user_subscriptions`, shows status / next billing / payment method /
      trial end, and calls `/api/billing/cancel`.
    - Hosted Supabase migration was pushed by the user on 2026-05-14.
      `/api/billing/subscription` returned 200 afterward. Before the push it
      failed because hosted `user_subscriptions.billing_provider` did not exist.
    - B6 regression coverage was expanded on 2026-05-21:
      - route tests cover `issue-key`, `charge` success/failure retry-pause,
        Toss webhook fixture/idempotent upsert, and cancel route edge cases.
      - app-shell tests mock the Toss SDK client and verify Settings -> 구독
        -> `Toss 결제 연결` -> upgrade modal -> Toss billing auth request.
      - Current web suite: `npm run test` passes 100 tests.
    - B3 cron is complete: Lambda + EventBridge schedule + manual test + first
      two scheduled invocations confirmed. Remaining billing items are Toss
      test-key E2E smoke, Toss webhook signature verification once official
      dashboard secret/header details are available, and live-billing DLQ.
    - v1 keeps Toss Payments billing. Naver Pay recurring, Kakao Pay recurring,
      and PortOne multi-PG are documented as future payment-method expansion.
  - Amplify/Route 53 production deployment is live at
    `https://www.justdo.co.kr`. v3까지 Android 사용자는 데스크탑 web 으로 우회.
  - 자세한 punch list: `next_steps.md` Phase 7.
  - 도메인/sync 레이어 (IndexedDB queue, Supabase adapter, auth)는 그대로 유지.
- Phase 6 iOS / Widget — current state (2026-05-30):
  - `JustDoShared` includes Swift domain models, mutation queue schema, drift
    fixtures, Core Data model/mappers, App Group snapshot/mutation stores,
    Supabase REST read/flush sync, and WidgetKit display models.
  - Real-device verification ran on iPhone 14 Pro / iOS 26.5 against Xcode
    26.3 / macOS Tahoe 26.3.1.
  - Xcode project targets (Bundle ID 2026-05-22 갱신):
    - `JustDoApp` (`kr.justdo.app`)
    - `JustDoWidgetExtension` (`kr.justdo.app.widget`)
    - `JustDoAppUITests` (`kr.justdo.app.uitests`)
    - App Group: `group.kr.justdo.app`
    - Keychain service: `kr.justdo.app.supabase-session`
  - Native signed-in shell currently includes Home / Stats / Settings based on
    `reference/proto/`; 2026-06-01 IA decision changes the next target to a Home
    top-right Settings icon, no standalone Stats tab, and a single centered Home
    bottom tab.
  - Settings includes sync status/error UI.
  - Home calendar task bars/no-dot rendering and the selected-day bottom sheet
    modal were implemented and verified.
  - Pushed task/habit detail screens were removed. Home and app deep links open
    editor sheets instead. Task rows in the selected-day sheet edit inline and
    support delete; Habit rows in that sheet no-op except for the check control.
  - iOS Supabase read-sync now reads `user_subscriptions` and maps Pro
    entitlement into local `settings.plan`, so hosted Pro state can unlock
    native Pro-gated features after sync.
  - Goal & Pro Report iOS first pass is implemented:
    - shared `Goal` / `GoalPromptDismissal` domain models.
    - Core Data `CDGoal` / `CDGoalPromptDismissal` mirror entities and mappers.
    - mutation queue cases `goal_upsert`, `goal_delete`,
      `goal_prompt_dismissal_upsert`.
    - Supabase REST fetch/mutation support for `goals` and
      `goal_prompt_dismissals`.
    - Settings → 목표 sheet with annual/monthly card stacks and max 5 goals per
      period.
    - goal cards with note, progress donut, percentage text,
      completed/related/slipped counts, and direct lock badge toggle.
    - centered goal add/edit dialog; delete button is immediately left of Save
      and now shows destructive confirmation before removal.
    - locked card tap confirmation; unlocked card tap opens editor.
    - onboarding/monthly/yearly goal prompt surfaces and dismissal persistence.
  - 2026-05-30 sync diagnostic/fix:
    - `JustDo sync failed` now prints the underlying REST error.
    - goal upsert now explicitly sends `locked_at: null` and `note: null` for
      nil values to satisfy `goals_check1` when unlocking.
  - Just Do Mode is implemented with local sheet selection state: Settings
    enables availability, while `오늘만` / `이 날까지` remains switchable in the
    selected-day sheet for eligible users.
  - Widget Task/Habit mode toggle is implemented for small/medium/large widgets.
  - Home-screen widget row text no longer deep-links; tapping the row toggles
    completion/check state. App deep links still support `justdo://task/<id>`
    and `justdo://habit/<id>` for launched editor sheets/tests.
  - UI automation covers app deep-link editor-sheet opening with DEBUG-only
    seeded Core Data data.
  - App and widget task completion toggles now use compact
    `task_completion_set` mutations instead of full task upsert.
  - Last verified:
    - `swift test --package-path apps/ios` -> pass, 46 tests.
    - `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS' build` -> pass.
    - `git diff --check` -> pass.
  - Auth landing, Home, Add Sheet, editor-sheet routing, Just Do Mode, Stats,
    Settings, Widget, 1-hour+ auth session refresh smoke, and final real-device
    smoke passed on the configured real device. Goal & Pro Report first pass is
    also in the local iOS build; Settings → 목표 focused smoke is user-confirmed,
    and delete confirmation is implemented. TestFlight/App Store preparation
    follows the 2026-06-01 IA/report-entry pass.
    Because this is a native SwiftUI/Xcode app, do **not** use Expo Go; install
    directly from Xcode to a real iPhone or use TestFlight later.
  - Both targets share App Group `group.kr.justdo.app`.
  - Auto-generated `JustDoWidgetControl` (iOS 18-only) removed.
  - `JustDoWidget.swift` now reads `widget_snapshot.json` from the App Group,
    converts it with `JustDoWidgetDisplayModelFactory`, and renders
    `JustDoWidgetView` for small / medium / large widget families.
  - The main app has `WidgetSnapshotWriter` and writes
    `widget_snapshot.json` on launch/foreground from the Core Data mirror.
  - `JustDoShared/Sync/SupabaseRestSync.swift` contains the first Supabase REST
    read-sync client for categories, tasks, tags/task_tags, habits, and habit
    logs. It maps account rows into `AppSnapshot` and replaces the Core Data
    mirror through `CoreDataAppSnapshotStore`.
  - `JustDoApp/AppSyncCoordinator.swift` now triggers that read sync from app
    launch/foreground. Project URL/anon key come from environment or Info.plist
    keys, while user access token/user ID come from a Keychain-backed session
    store. Without a valid stored session, it keeps the seeded local Core Data
    mirror fallback.
  - `JustDoApp/SupabaseAuthClient.swift` implements a minimal REST/PKCE OAuth
    flow using `ASWebAuthenticationSession`, plus refresh-token exchange.
  - `JustDoApp/AuthViewModel.swift` and `ContentView.swift` expose Google/Apple
    sign-in and sign-out controls. Successful sign-in writes the Keychain
    session and triggers the existing widget snapshot refresh path. Expired
    access tokens are refreshed on reload/foreground; HTTP 400/401 refresh
    failures sign out, transient failures keep the stored profile signed in.

## v1 Open Decisions — all closed

See `docs/worklog.md` 2026-04-29 entries for full rationale.

| # | Topic | Decision |
|---|-------|----------|
| 1 | Subscription pricing | 월 ₩1,900 / 연 ₩9,900. Apple Tier 2. |
| 2 | Web ↔ iOS type sharing | Each platform mirrors locally. Web auto via `supabase gen types typescript`; iOS hand-written Swift Codable + drift unit test. Auto codegen deferred until 10+ migrations or 2+ drift bugs. |
| 3 | Task Dependency visualization | v2. `task_dependencies` table stays idle in v1. |
| 4 | User-customizable categories | v1 full CRUD, no Pro gating (Phase 5.5). Replace `me`/`ext` enum with `Task.categoryId: string \| null`. Custom hex picker + 8-color preset palette in v1. Habit category stays separate. |
| 5 | settings/view remote persistence | `public.users.preferences jsonb` column (Phase 5.6). Sync `weekStart` only. `notify` / `notifyTime` / `dark` / `view.*` stay device-local permanently. `plan` keeps using `user_subscriptions`. |
| 6 | `Habit.recur_type` | v1 = daily + weekly (Phase 5.7). monthly + `recur_end_date` go to v2. Domain gains `Habit.recurType: 'daily' \| 'weekly'`, `Habit.recurDays?: number[]`. |

## Latest Implementation Commit Trail

```text
230a979 docs: capture ios session refresh real-device smoke pass
63db17a docs: capture 2026-05-25 signup fix and ios session refresh
80381c7 feat(ios): auto-refresh auth session on foreground
21ee0cd feat(supabase): add categories user-name unique index for signup trigger
83a0e61 docs: clarify claude handoff state
3e2e234 feat(ios): polish settings and widgets
e54423f feat(ios): polish add detail and stats verification
765a321 docs: capture 2026-05-22 iOS real-device session
e65a405 feat: add app icon and web favicon
3081ae4 feat(ios): redesign home calendar and fix auth dark mode
551f302 chore(ios): rename bundle id to kr.justdo.app
32d619a docs: confirm B3 first scheduled invocation
```

Watch items (not active tasks):

- `AuthViewModel.reload()` and `AppSyncCoordinator.validAppSession()` both
  refresh through the same `KeychainSupabaseSessionStore`, so a foreground
  entry can fire two refresh calls back-to-back. The 2026-05-25 real-device
  smoke did not show a Supabase refresh-token rotation conflict, but if a
  future smoke surfaces one (e.g. unexpected sign-outs after a foreground
  return), serialize the store access or unify the refresh path.

## App Shape Now

> 2026-05-10 Platform Strategy 결정 이후 web과 iOS의 UI는 의도적으로 분기. `just_do_prd.md` §1.5 참고. 아래는 플랫폼별 현재 상태.

### App Shape — iOS (current native root, proto-aligned)

- Current bottom tabs are `홈 / 통계 / 설정`, but this is now a pre-IA-change
  state. 2026-06-01 target: Settings moves to the Home top-right icon, Stats is
  folded into report/activity summary, and the bottom bar keeps a single centered
  `홈` tab for continuity. Future expansion is `홈 / 함께`.
- Home (2026-05-29 갱신):
  - Header에 `Just Do` wordmark (24pt) + 년/월 + nav 화살표 + 우상단 add (+) 버튼.
  - Calendar (월간 6 weeks) full-bleed, task bar overlay 유지. 빈 날짜
    셀도 row height 일관성 위해 lane 2개 강제.
  - 날짜 셀의 tap area는 row 전체 (date pill + 아래 빈 영역 포함).
  - Calendar 좌우 swipe → 이전/다음 달, cell tap → 해당 날짜 sheet 자동
    open.
  - Selected-day 정보는 inline panel이 아니라 **bottom sheet modal**
    (`.height(500)` + `.large` detent). Sheet 안 좌우 swipe → ±1 day.
    background tap / drag-down → dismiss.
  - Selected-day sheet는 `오늘만` / `이 날까지` 전환을 제공한다. Pro +
    Settings ON이면 둘 다 사용 가능하고, Settings OFF면 `이 날까지`는 lock.
  - Task row tap은 같은 sheet 안에서 editor로 전환하고 삭제도 가능. Habit row
    tap은 no-op이며 check control만 동작.
- Stats currently has its own tab; target is no standalone Stats tab.
- Settings owns dark mode and habit/category management entry points; target is
  Home top-right icon entry instead of bottom tab entry.
- Add 플로우는 partial-height bottom sheet (`.height(500)` detent).
- Auth 랜딩은 Apple/Google/Kakao/Email 4 버튼 + "Just Do" 워드마크
  (`reference/proto/auth.jsx`, `auth-button.jsx`). 시스템 다크모드와
  무관하게 항상 light로 고정.

### App Shape — Web (Phase 7 desktop shell + Pro checkout wiring)

> 현재 web은 `reference/web_proto/`와 `Just Do - Web Prototype.html`의 desktop
> reference를 기준으로 재작성됨. iOS `reference/proto/`와 UI/UX는 의도적으로 분기.

- Left sidebar: Calendar / Stats / Settings, filters, priority filter, tags, quick search.
- Header: date navigation, view switcher (month/week/list), search, command palette, Today panel toggle, `새 Task` entry.
- Calendar workspace: month/week/list views, selected date, Task drag date 이동.
- Today panel: selected-date Task list and active Habit list; Task/Habit check toggles live on the right side. Task completion stays in the same list with checkbox/strikethrough, not a separate completed section. Just Do Mode uses panel-local `오늘만` / `이 날까지` state; date changes reset the panel to `오늘만`.
- Desktop Web task time polish: month calendar task bars and Today panel task cards show task time as `HH:mm` only. Calendar bars keep title left / time right. Today panel cards keep title left / time near the right, aligned vertically with the checkbox.
- Add modal: Task/Habit tabs. Task supports title, date range, time, category, priority, tag chips. Habit supports title, emoji, daily/weekly recurrence, weekday picker, reminder time.
- Settings: left settings menu with one selected section rendered at a time. Sections include account, notifications, display, categories, habits, subscription, sync, and data.
- Category management: add, rename, color edit, delete, up/down reorder.
- Habit management: add from global add modal; edit/delete from Settings.
- Subscription:
  - Plan cards for monthly (`₩1,900 / 월`) and yearly (`₩9,900 / 년`).
  - Upgrade modal has payment-method buttons. Toss is enabled and opens Toss
    billing auth; card/bank/Naver Pay/Kakao Pay/other are disabled future
    surfaces with provider colors.
  - `/billing/success` receives Toss `authKey/customerKey/planInterval` and
    calls `/api/billing/issue-key`.
  - `/billing/fail` displays Toss error code/message.
  - Subscription panel reads server state through `/api/billing/subscription`
    and can call `/api/billing/cancel`.

> Data layer remains the same: custom categories, task tags, habit recurrence,
> IndexedDB local-first queue, Supabase sync/realtime, and auth still use the
> existing web domain/storage modules.

## Supabase / Cloud State

Hosted Supabase project:

- name: `JustDo`
- ref: `cohkxnwsbhrsfmsjqdpa`
- URL: `https://cohkxnwsbhrsfmsjqdpa.supabase.co`
- region: Northeast Asia (Seoul)

Applied migrations:

- `20260429014750_init_schema.sql`
- `20260429021447_add_habit_emoji.sql`
- `20260429052000_enable_realtime.sql`
- `20260430090000_category_management.sql`
- `20260430103000_user_preferences.sql`
- `20260511064305_waitlist.sql`
- `20260514061000_toss_billing.sql`
- `20260525090000_categories_user_name_unique.sql` (2026-05-25;
  fixes `handle_new_auth_user()` ON CONFLICT mismatch that blocked all
  brand-new Google signups in production)
- `20260529120000_goal_report.sql` (2026-05-30 hosted state confirmed;
  adds `goals` and `goal_prompt_dismissals` for Goal & Pro Report MVP)

Realtime publication includes:

- `categories`
- `tasks`
- `tags`
- `task_tags`
- `habits`
- `habit_logs`

Google OAuth was configured in Supabase Console and Google Cloud Console.
Hosted redirect URI:

```text
https://cohkxnwsbhrsfmsjqdpa.supabase.co/auth/v1/callback
```

`apps/web/.env.local` is gitignored and currently expected to point to the
cloud project for browser testing. Do not print or commit real key values.

Current expected hosted env keys for Pro checkout testing:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY
TOSS_PAYMENTS_SECRET_KEY
BILLING_CRON_SECRET
```

The Toss keys are test API individual integration keys from Toss Payments
Developer Center. The payment widget keys are not used for this billing flow.
`BILLING_CRON_SECRET` is internal and is not issued by Toss.

## Important Storage Architecture

Core interface:

```text
apps/web/src/features/just-do/persistence.ts
```

Adapters / helpers now include:

- `createMemoryStorage`
- `createLocalStorageStorage`
- `createIndexedDBStorage`
- `createSnapshotStorage`
- `createSyncedStorage`
- `flushQueuedMutations`

Guest/local storage:

- IndexedDB first.
- DB: `just-do-web`
- store: `snapshots`
- record key: `state`
- fallback: `localStorage` key `just-do/web/v1`

Logged-in storage:

- per-user IndexedDB first.
- DB: `just-do-web-${userId}`
- fallback: `localStorage` key `just-do/web/v1/${userId}`
- wrapped with Supabase remote storage by `createSyncedStorage`.

Mutation queue:

- IndexedDB schema version: `2`
- queue store: `mutations`
- queue item shape:

```ts
type QueuedMutation = {
  id: string;
  updatedAt: string;
  mutation:
    | { type: "category_upsert"; category: Category }
    | { type: "category_delete"; id: string }
    | { type: "preferences_set"; key: "week_start"; value: Settings["weekStart"] }
    | { type: "task_upsert"; task: Task }
    | { type: "task_delete"; id: string }
    | { type: "habit_upsert"; habit: Habit }
    | { type: "habit_delete"; id: string }
    | { type: "habit_log_set"; habitId: string; iso: string; value: 0 | 1 };
};
```

Flush behavior:

- writes are local-first,
- queue flushes to Supabase in `updatedAt` order,
- successful remote write removes the queue item,
- failed remote write leaves local snapshot and queue intact,
- online event triggers a load/flush retry,
- realtime remote changes mirror into local snapshot through `replaceSnapshot`
  without creating new queued mutations.

## Sync UI

Settings -> `동기화` now shows:

- `연결 상태`: `온라인` / `오프라인`
- `저장 상태`: `정상` / `동기화 중` / `대기 중` / `오프라인` / `확인 필요`
- `대기 중인 변경`: pending queue count
- error message and `오류 지우기` when `syncError` exists

## Important Files

```text
docs/next_steps.md
docs/worklog.md
docs/local_dev.md
docs/supabase_cloud_setup.md
docs/widget_sync_strategy.md

apps/web/src/features/just-do/store.tsx
apps/web/src/features/just-do/persistence.ts
apps/web/src/features/just-do/supabase-storage.ts
apps/web/src/features/just-do/supabase-mapping.ts
apps/web/src/features/just-do/habit-screen.tsx
apps/web/src/features/just-do/settings-screen.tsx
apps/web/src/features/just-do/stats-screen.tsx
apps/web/src/features/just-do/add-sheet.tsx
apps/web/src/features/just-do/tags.ts
apps/web/src/features/just-do/tags.test.ts
apps/web/src/features/just-do/persistence.test.ts

apps/web/src/lib/billing/toss.ts
apps/web/src/lib/billing/toss-client.ts
apps/web/src/app/api/billing/issue-key/route.ts
apps/web/src/app/api/billing/charge/route.ts
apps/web/src/app/api/billing/cancel/route.ts
apps/web/src/app/api/billing/subscription/route.ts
apps/web/src/app/api/webhook/toss/route.ts
apps/web/src/app/billing/success/page.tsx
apps/web/src/app/billing/success/BillingSuccessClient.tsx
apps/web/src/app/billing/fail/page.tsx

apps/ios/Package.swift
apps/ios/JustDoShared/Domain/JustDoModels.swift
apps/ios/JustDoShared/Sync/MutationQueueSchema.swift
apps/ios/JustDoShared/Storage/CoreDataModel.swift
apps/ios/JustDoShared/Storage/CoreDataStack.swift
apps/ios/JustDoShared/Storage/CoreDataMappers.swift
apps/ios/JustDoShared/Storage/AppGroupWidgetSnapshotStore.swift
apps/ios/JustDoShared/Widgets/JustDoWidgetDisplayModel.swift
apps/ios/JustDoShared/Widgets/JustDoWidgetViews.swift
apps/ios/Tests/JustDoSharedTests/

apps/web/src/lib/auth/useAuth.tsx
apps/web/src/lib/auth/providers.ts
apps/web/src/lib/supabase/client.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/lib/supabase/service-role.ts
apps/web/src/lib/supabase/database.types.ts

supabase/config.toml
supabase/migrations/20260429014750_init_schema.sql
supabase/migrations/20260429021447_add_habit_emoji.sql
supabase/migrations/20260429052000_enable_realtime.sql
supabase/migrations/20260430090000_category_management.sql
supabase/migrations/20260430103000_user_preferences.sql
supabase/migrations/20260511064305_waitlist.sql
supabase/migrations/20260514061000_toss_billing.sql
supabase/scripts/reset_local_app_data.sql
```

## Verification Status

Latest web checks:

```bash
npm --prefix apps/web run lint     # pass
npm --prefix apps/web test         # 100 tests pass
npm --prefix apps/web run build    # pass
git diff --check                   # pass
```

Latest iOS shared-code checks:

```bash
cd apps/ios
swift test                         # 40 tests pass
```

Latest iOS device install (2026-05-22):

- Real iPhone 14 Pro on iOS 26.5 with `kr.justdo.app` build (post bundle-id
  rename + home redesign + app icon). App launches into the auth landing
  in light mode regardless of system theme; signed-in shell honors the
  Settings dark mode toggle.

Cloud manual checks already performed by the user/Codex:

- Google login works against hosted Supabase.
- User created a Task and Habit.
- Task completion persisted.
- Habit check persisted to `habit_logs`.
- Realtime-oriented flows were manually checked before Phase 5 work.
- Phase 7 desktop visual verification passed at 1024 / 1280 / 1440 / 1920.
- Phase 7 manual hosted offline sync verification passed.
- User pushed hosted Supabase billing migration on 2026-05-14; after that,
  `/api/billing/subscription` returned 200 from the running dev server.

## Pro Checkout Details For Claude

Provider decision:

- v1 uses Toss Payments billing / automatic payment.
- UX should avoid saying "card registration" in the app. The user-facing flow
  says "Toss 결제" and the active payment method button itself opens the Toss
  flow.
- Naver Pay recurring, Kakao Pay recurring, and PortOne multi-PG are planned
  future expansion tracks. Do not start those unless explicitly asked.

Implemented files:

- `supabase/migrations/20260514061000_toss_billing.sql`
  - Adds billing columns to `public.user_subscriptions`.
  - Adds `public.payment_events`.
  - Rewrites `handle_new_auth_user()` to create a 30-day Pro trial row using
    the current column names (`plan_name`, `trial_start_at`, `trial_end_at`).
- `apps/web/src/lib/billing/toss.ts`
  - Server-only Toss REST wrapper:
    `issueTossBillingKey`, `chargeTossBillingKey`, `deleteTossBillingKey`.
- `apps/web/src/lib/billing/toss-client.ts`
  - Client Toss SDK v2 loader for `https://js.tosspayments.com/v2/standard`.
- `apps/web/src/app/api/billing/issue-key/route.ts`
  - Authenticated route. Takes Toss `authKey/customerKey/planInterval`, issues
    billing key, upserts `user_subscriptions`.
- `apps/web/src/app/api/billing/charge/route.ts`
  - Cron-protected route. Requires `Authorization: Bearer $BILLING_CRON_SECRET`.
  - Charges due subscriptions and updates payment failure counters.
- `apps/web/src/app/api/billing/cancel/route.ts`
  - Authenticated route. Deletes Toss billing key if present and marks
    subscription cancelled.
- `apps/web/src/app/api/billing/subscription/route.ts`
  - Authenticated route. Reads current subscription state for Settings -> 구독.
  - Includes a legacy fallback for environments where the billing migration is
    not yet applied; hosted has now been migrated, but keep the fallback.
- `apps/web/src/app/api/webhook/toss/route.ts`
  - Skeleton webhook receiver. Stores events with idempotency via
    `payment_events`. Signature verification is still TODO.
- `apps/web/src/app/billing/success/*`
  - Handles Toss success redirect and calls `/api/billing/issue-key`.
- `apps/web/src/app/billing/fail/page.tsx`
  - Displays Toss fail code/message.
- `apps/web/src/features/just-do/app-shell.tsx`
  - SubscriptionPanel now reads `/api/billing/subscription`.
  - UpgradeModal now shows payment-method buttons; Toss button opens billing
    auth; other buttons are disabled future surfaces.

Important current limitations:

- B3 cron direction and resources:
  - Direction: EventBridge Scheduler -> Lambda ->
    `POST https://www.justdo.co.kr/api/billing/charge`, daily 05:30 KST.
  - Lambda wrapper: `infra/aws/billing-cron-lambda.mjs`.
  - Runbook: `docs/aws_eventbridge_billing_cron.md`.
  - User created Lambda `justdo-prod-billing-cron` and EventBridge schedule
    `justdo-prod-billing-charge-daily` in AWS console.
  - First automated firings confirmed in CloudWatch on 2026-05-21:
    2026-05-20 05:30 KST and 2026-05-21 05:30 KST both completed with no
    error/throw, Lambda metrics show Errors 0 / Success rate 100%, and
    Supabase `payment_events` remains empty as expected pre-merchant-approval.
  - Only remaining B3 follow-up is adding a DLQ before Toss live billing
    is enabled.
- B4-c/B5 are implemented for the current Web surface. Do not force billing
  setup immediately after login. Signed-in users can use the app, Trial users
  can use Pro features, and billing setup is required only to keep Pro access
  after Trial. Stats dashboard is currently gated as a Pro feature.
- Toss webhook signature verification is not implemented. Add it after
  confirming the official dashboard secret/header behavior for this account.
- B6 test status (2026-05-21):
  - Covered: `issue-key`, `charge` success/failure retry-pause, Toss webhook
    fixture/idempotent upsert, cancel route edge cases, and Toss SDK client mock
    for the upgrade modal billing-auth flow.
  - Remaining: Toss test-key E2E smoke and webhook signature verification after
    official dashboard secret/header details are available.
  - Latest verification:
    - `cd apps/web && npm run test` -> pass, 100 tests.
    - `cd apps/web && npm run lint` -> pass.
    - `cd apps/web && npm run build` -> pass after rerunning with elevated
      permissions. First sandboxed run failed because Turbopack attempted to
      spawn/bind a helper process and hit `Operation not permitted`.
- `SubscriptionPanel` does not auto-refresh after `/billing/success` redirect
  unless the user returns/reloads or clicks refresh; this is acceptable for now
  but can be improved.

Recommended immediate next steps:

1. Run a manual Toss test flow from `http://localhost:3000`:
   Settings -> 구독 -> Pro plan -> Toss button -> Toss auth -> `/billing/success`.
2. Confirm `user_subscriptions` row has `billing_provider='toss_payments'`,
   `toss_billing_key`, `toss_customer_key`, `next_billing_at`, and payment
   method metadata.
3. Confirm Settings -> 구독 shows Trial/next billing/payment method after refresh.
4. Confirm the B3 scheduled invocation in CloudWatch/Lambda logs.
5. When Toss test keys/merchant flow are ready, run manual Toss test-key E2E.

## Known Notes / Risks

- `apps/web/.env.local` is gitignored. It contains local machine/cloud keys.
  Never commit it or print secret values.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
  - Allowed helper: `apps/web/src/lib/supabase/service-role.ts`
  - Browser code must use anon key via `apps/web/src/lib/supabase/client.ts`.
- Supabase CLI warnings about local OAuth env refs can appear if
  `apps/web/.env.local` is not sourced before local `supabase start`; hosted
  Console OAuth is separate and already configured.
- `settings` / `view` remain device-local except `settings.weekStart`, which
  syncs through `public.users.preferences.week_start`.
- Habit recurrence is now domain-backed. v1 supports `daily` and `weekly`;
  remote `monthly` is treated defensively as `daily` until v2.
- Task tags are supported in adapter/realtime and the Add/Edit Task sheet has
  a chip input surface.
- Phase 5 queue has the LWW timestamp field and ordered flush path, but it does
  not yet perform remote row `updated_at` conflict comparison. Current practical
  behavior is local-first sequential flush.
- `npm audit` previously reported moderate findings from framework-related deps;
  no forced downgrade was applied.
- Tag UI commits draft tags on Enter / comma / blur. Submit also harvests any
  uncommitted draft so the user does not lose a half-typed tag — keep this
  behavior in mind when iterating on the picker.
- Phase 5.5 domain migration is complete. App code uses
  `Task.categoryId: string | null` and `AppState.categories`; legacy local
  snapshots with `category: "me" | "ext"` are mapped on hydration.
- IndexedDB schema is still at version `2`; categories live inside the
  existing snapshot and queue stores. The queue now supports
  category, preferences, task, habit, and habit log mutations.

## Recommended Next Work

> 2026-05-25 기준 — 배포 트랙은 운영 LIVE로 종료됨. Phase 7 Web Desktop
> Redesign은 Pro checkout 운영 확인/외부 의존만 남아 있고, iOS 잔여 작업은
> 실기기 시각 검증 중심. Toss 가맹점 심사는 가장 긴 차단 항목 (~2–3주)이라
> 사용자 외부 트랙으로 먼저 시작하는 것이 유리. 운영 신규 가입 차단 버그
> 및 iOS 세션 자동 refresh fix는 모두 2026-05-25 LIVE 검증 완료.

1. **Toss 가맹점 심사 준비 (사용자 외부 트랙, 가장 긴 차단 항목)**
   - 순서: 사업자등록 (개인사업자) → 통신판매업 신고 → Toss Payments 가맹점
     신청 (~2–3주).
   - 통과 후 운영 API/Webhook 키 발급 → Amplify 환경변수에서 Toss 키를 테스트
     키 → 운영 키로 교체.
   - Toss 대시보드에 webhook URL `https://www.justdo.co.kr/api/webhook/toss`
     등록 (signature secret 발급 후 `route.ts`에서 signature 검증 보강).
   - 코드 트랙(아래 2·3·4)은 Toss 테스트 키로 병렬 가능.

2. **Phase 7 Pro Checkout 남은 코드 작업** (Toss 테스트 키로 검증 가능)
   - **B3 정기결제 cron** — 완료. AWS EventBridge Scheduler -> Lambda ->
     `/api/billing/charge`, 매일 05:30 KST. Lambda + schedule + 수동 테스트 +
     첫 자동 실행 두 번(2026-05-20 / 2026-05-21 05:30 KST) CloudWatch 확인
     완료(2026-05-21). Lambda Errors 0 / Success 100%, `payment_events` 0건.
     남은 follow-up은 Toss live 직전 DLQ 추가. 자세한 운영 설정:
     `docs/aws_eventbridge_billing_cron.md`.
   - **B4-c Pro entitlement / upgrade gate** — 완료. `trial` / `active`는 Pro
     기능 사용 가능, `past_due` / `paused` / `cancelled` / `expired` / `free`는
     Pro 기능 gate에서 구독/결제 CTA로 유도. 현재 Pro 대상인 Stats dashboard에
     gate 적용.
   - **B5 로그인 필수 정책 정리** — 완료. 비로그인 사용자는 로그인 화면에서
     앱 shell로 진입하지 못한다. Trial + 결제수단 미등록 상태는 Pro 사용 가능,
     구독 패널에서 Toss 결제 연결 CTA 표시.
   - **B6 회귀 테스트** — route + UI mock 테스트 보강 완료. 남은 항목은 Toss
     테스트 키 E2E와 webhook signature 보강(운영 dashboard secret/header 확인
     후).

3. **iOS Phase 6 잔여 작업** (Phase 7과 독립 트랙, 병렬 가능)
   - 2026-05-22 갱신:
     - 실기기 검증 환경 셋업 완료. iPhone 14 Pro iOS 26.5에 `kr.justdo.app`
       설치 동작 확인. Developer Team 활성, wireless debug 자동.
     - Auth landing 검증 통과 (다크모드 fix 후).
     - Home calendar/panel 검증 통과 (bottom sheet 모달 재디자인 + swipe
       gesture + cell tap area 확장 후).
     - Add Sheet 검증 통과 (wheel DatePicker, optional time toggle,
       top-aligned input layout, selected-day sheet dismiss fix 후).
     - Edit Sheet / Stats 검증 통과 (Add Sheet-style editor,
       selected-date preserve, Stats formatting/count fixes 후). 2026-05-29
       follow-up에서 pushed detail page는 제거되고 Home/deep link가 editor
       sheet로 연결됨.
     - Settings / Widget 보정 통과 (계정/profile, 알림/표시 picker,
       data/legal, home/lock widget layout, row tap completion, mode-scoped
       counts 후).
  - 2026-06-01 갱신: Goal & Pro Report iOS first pass도 반영됨. Settings → 목표
    focused smoke는 사용자 확인 완료이고 삭제 확인 alert도 구현됨. 남은 iOS
    작업은 IA/report-entry banner 반영과 TestFlight/App Store 준비. 상세
    체크리스트는 `docs/ios_phase6_status.md` 참고.
   - Widget은 home-screen small/medium/large와 lock-screen accessory로 분리.
     Home-screen row text deep link는 제거했고 row 전체 탭이 완료 토글이다.
   - 검증 방식: Expo Go가 아니라 Xcode 직접 설치 (wireless 활성 시 USB
     불필요). TestFlight 트랙은 추후.

4. **Xcode polish (defer until needed)**
   - Trim `JustDoApp` Supported Destinations to iPhone-only for v1.
   - Decide whether to consolidate `JustDoApp.swift` placeholder file
     with `JustDoAppApp.swift` entry point.
   - Configure real iPhone for device testing (resolves the Personal
     Team provisioning warnings).

### Amplify SSR 함정 — 신규 SSR route 추가 시 주의

배포 트랙에서 발견하고 fix한 함정 3개. 새 SSR route를 추가할 때 같은 함정에
다시 빠지지 않도록 주의:

1. **Forwarded host header** — Amplify SSR Lambda의 `request.url`은 호스트가
   `localhost`로 들어옴. 외부 호스트는 `x-forwarded-host` / `x-forwarded-proto`
   헤더에 들어 있음. `app/(auth)/callback/route.ts`에 가이드 패턴 적용됨
   (`requestOrigin` 헬퍼). redirect를 만들거나 absolute URL이 필요하면 같은
   패턴 사용할 것.
2. **Server-only env injection** — Amplify 환경변수는 빌드 shell에는 노출되
   지만 SSR Lambda runtime에는 자동 전달되지 않음. `NEXT_PUBLIC_*`은 Next.js
   가 server bundle에도 inline해서 영향 없음. server-only secret을 새로 추가
   하면 `amplify.yml` build 단계의 `printenv | grep -E "^(...)="` 패턴에 변수
   이름을 추가해서 `.env.production` 파일에 같이 박아야 SSR runtime에서 읽힘.
3. **Monorepo + Next.js SSR auto-detect** — 이미 fix됨 (`AMPLIFY_MONOREPO_APP_ROOT=apps/web`
   환경변수 + CLI로 platform `WEB_COMPUTE` + framework `Next.js - SSR` 명시).
   새 Amplify 앱을 다시 만들 일이 생기면 이 세 가지 모두 적용해야 SSR로 배포됨.

### Codex 또는 Claude Code 세션 재개 가이드 (2026-06-01 갱신)

- **2026-05-25 신규 fix 인지부터**: 운영 도메인의 신규 가입자가 로그인 루트로
  되돌아오던 DB 에러는 categories `(user_id, name)` unique index 부재로
  발생한 트리거 에러였고, 마이그레이션
  `supabase/migrations/20260525090000_categories_user_name_unique.sql`로 hosted
  적용 완료. 같은 날 iOS 세션이 1시간+ 종료 후 재진입 시 로그인 루트로
  떨어지던 문제는 `AuthViewModel.reload()` async 변환 + scenePhase reload로
  fix됨 (`apps/ios/JustDoApp/JustDoApp/AuthViewModel.swift`,
  `apps/ios/JustDoApp/JustDoApp/ContentView.swift`). 두 변경 모두 커밋 완료,
  iOS 세션 fix는 iPhone 14 Pro / iOS 26.5 실기기에서 1시간+ 종료 후 재진입
  smoke 통과. `worklog.md` 2026-05-25 두 엔트리를 먼저 읽기.
- **2026-05-29 iOS follow-up 인지**: iOS Pro entitlement sync, selected-day
  task inline edit/delete, Habit date-sheet no-op, pushed detail page 제거,
  Just Do Mode local mode 분리까지 반영됨. 이어받는 세션은 `worklog.md`
  2026-05-29 엔트리와 `next_steps.md` 상단 Where We Are를 먼저 읽기.
- **2026-05-30 Goal & Pro Report 인지**: schema/Web/iOS first pass가 모두
  반영됨. Hosted migration은 remote에 적용됐고, iOS `goals_check1` sync 오류는
  `locked_at: null` 명시 encoding으로 해결됨. 이어받는 세션은 `worklog.md`
  2026-05-30 엔트리와 `next_steps.md` 상단 Immediate Goal follow-up을 먼저
  읽기.
- **2026-06-01 IA/report-entry 결정 인지**: Settings는 Home 우측 상단으로
  이동, Stats 독립 탭은 report/activity summary로 흡수, 하단 바는 Home 단일
  중앙 탭으로 유지, 미래 확장은 `함께` 탭으로 예약. 리포트는 월말/연말 이후
  Home top banner + Settings → 목표 보조 배너로 진입한다.


- 가장 먼저: `docs/just_do_prd.md` §1.5, `next_steps.md` Phase 7 + Deployment
  Backlog, 그리고 본 문서의 운영 LIVE banner 읽기.
- 운영 도메인은 `https://www.justdo.co.kr` LIVE (Amplify SSR + Route 53).
  앱 ID `dcsdzu0ew3l2m`, 리전 `ap-northeast-2`. 운영 검증/모니터링은 Amplify
  콘솔 또는 CloudShell에서 `aws amplify ...` 명령으로.
- Web 작업은 `reference/web_proto/`와 `reference/Just Do - Web Prototype.html`을
  desktop reference로 삼고, iOS `reference/proto/`와 분리해서 진행.
- `apps/web/src/features/just-do/app-shell.tsx`에 Phase 7 desktop shell과 후속
  편집/관리 흐름이 들어가 있음. **완료된 항목 (2026-05-21 기준)**:
  desktop shell, mobile 안내 페이지(iOS App Store CTA + Android waitlist 폼,
  breakpoint 768px), desktop interaction tests, Task tag edit, Habit edit,
  Category reorder, 1024–1920 시각 검증, manual offline sync 5-stage 검증,
  Toss Pro checkout B1·B2·B4-a·B4-b·B4-c·B5, B6 route/UI mock regression
  tests, 운영 배포 + smoke test.
- **남은 v1 ship 차단 항목은 Toss 가맹점 심사와 Pro checkout 외부 의존 확인**.
  B3 cron은 첫 자동 실행 두 번 확인까지 완료됐고, live billing 직전 DLQ만
  남음. B6은 Toss test-key E2E smoke와 webhook signature 검증만 남음.
  자세한 단계 / Track A·B 분리는 `next_steps.md` Phase 7-3.
- iOS는 Phase 7과 독립 트랙. Auth landing, Home, Add Sheet, editor-sheet
  routing, Just Do Mode, Stats, Settings, Widget 보정은 iPhone 14 Pro iOS 26.5
  최종 smoke까지 통과. Goal & Pro Report first pass도 iOS에 포함됨. Settings →
  목표 focused smoke와 삭제 확인 alert까지 완료됐고, 현재 남은 것은 리포트 진입 UX
  결정과 TestFlight 준비이며, Expo Go로 검증하지 않음.
- **새 SSR route를 만들 때** 위의 "Amplify SSR 함정" 섹션의 세 가지 함정에
  주의 — forwarded host 헤더 사용, server-only secret을 `amplify.yml`에 등록,
  monorepo platform/framework 설정 유지.
- 도메인/sync 레이어 (persistence, supabase-mapping, store)는 기존 구현을 유지.
- 태그 입력은 `#운동` → `운동`으로 정규화하고, Korean IME composition 중 Enter
  커밋을 막도록 보정됨. Supabase `task_tags` join write는 `upsert` 대신 신규 row
  `insert`를 사용해 RLS update-policy 의존을 피함.
- **Sync UX 가드 (2026-05-13)**: realtime CHANNEL_ERROR (`supabase-storage.ts`
  `onChannelStatus`) 와 `reportSyncError` (`store.tsx`) 둘 다 오프라인일 때는
  syncError emit/표시를 silent. 큐는 source of truth, reconnect 시 자동 flush.
  새 mutation handler 추가 시 같은 가드 패턴 유지 권장.
- **Mobile guide CTA (2026-05-13)**: 환경변수
  `NEXT_PUBLIC_IOS_APP_STORE_URL` 채우면 안내 페이지 iOS 버튼 활성 + iOS UA
  자동 리다이렉트 (sessionStorage 1회 가드). Android waitlist 는
  `public.waitlist` (마이그레이션 `20260511064305_waitlist.sql`) +
  `POST /api/waitlist` (service-role, `onConflict: email,platform`).
- **1024 헤더 squeeze fix (2026-05-13)**: Header 의 텍스트 노드들에
  `whitespace-nowrap`, 검색 input 은 `xl` (1280+) 에서만 노출. 좁은 폭에서는
  `IconCommand` (Cmd+K) 와 사이드바 "빠른 검색" 으로 검색 진입.
