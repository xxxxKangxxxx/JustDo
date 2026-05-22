# Handoff (next session — Codex or Claude Code)

Date: 2026-05-22
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

> **다음 작업자가 픽업할 우선순위 (2026-05-22 갱신)**:
> 1. **iOS Settings / Widget 시각 검증**. Auth landing, Home, Add Sheet,
>    Task Detail edit, Stats는 iPhone 14 Pro iOS 26.5 실기기 검증을 통과함.
>    Reference: `reference/proto/stats-settings.jsx`,
>    `reference/proto/tabbar.jsx`. Widget은 deep link / mode toggle / Supabase
>    flush까지 같이 검증.
> 2. **Toss 가맹점 심사 준비** (사용자 외부 트랙, 가장 긴 차단 항목 ~2–3주).
>    사업자등록 → 통신판매업 신고 → Toss Payments 가맹점 신청 순서. 코드
>    트랙은 이와 병렬로 진행 가능. 체크리스트:
>    `docs/toss_merchant_review_plan.md`.
> 3. **Pro Checkout B6 외부 의존 검증** — route 단위 테스트, Toss SDK
>    client mock, cancel edge cases, webhook fixture/idempotency는 보강 완료.
>    남은 항목은 운영/테스트 Toss 키를 이용한 E2E smoke와 Toss 공식 dashboard
>    secret/header 확인 후 webhook signature 검증.
> 4. **(라이브 직전) DLQ 추가** — `justdo-prod-billing-cron` Lambda async
>    invocation에 SQS DLQ 연결. Toss 가맹점 심사 통과 + live billing 활성화
>    직전에 진행.
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
> - **iOS 홈 화면 디자인 변경 (2026-05-22)**: Bottom sheet 모달 패턴
>   (`.height(420)` 단일 detent). Inline drag-resize 패턴 폐기. Sheet 안
>   좌우 swipe로 ±1 day, calendar 좌우 swipe로 ±1 month. Cell tap area는
>   row 전체. Task bar는 `.allowsHitTesting(false)`로 tap pass-through.
>   실기기 피드백 후 home header와 calendar를 함께 아래로 내려 중앙감 보정.
> - **iOS Add Sheet 검증 완료 (2026-05-22)**: 입력 영역 상단 고정,
>   시작/종료 날짜 wheel `DatePicker` sheet, `시간 포함` 소형 토글,
>   날짜-only 저장 지원, selected-day sheet에서 Detail 진입 시 dismiss 처리.
> - **iOS Detail / Stats 검증 완료 (2026-05-22)**: Task Detail 편집 UI를
>   Add Sheet 스타일로 정렬하고 완료 토글 제거. Home selected-day sheet에서
>   다른 날짜 항목을 체크해도 날짜 유지. Stats 연월 포맷, 카테고리 0-count,
>   최근 7일 Habit 셀 요일 표시 수정.
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

At this handoff, Codex intentionally leaves local changes in the worktree for
Claude to review/continue. They are not yet committed in this workspace. If
`git status -sb` shows the files below, they are expected Pro checkout work:

```text
README.md
apps/web/.env.local.example
apps/web/src/app/api/billing/
apps/web/src/app/api/webhook/
apps/web/src/app/billing/
apps/web/src/features/just-do/app-shell.tsx
apps/web/src/lib/billing/
apps/web/src/lib/supabase/database.types.ts
docs/claude_handoff.md
docs/just_do_db_schema.md
docs/next_steps.md
docs/worklog.md
supabase/migrations/20260514061000_toss_billing.sql
```

Do not discard these changes. They include the Toss Payments schema/API/UI
track and documentation updates.

Latest pushed commits in this session (Claude Code, 2026-04-30):

```text
090815a feat(ios): scaffold xcode app and widget targets
f3e1b05 feat(ios): add widget layouts
e5f0144 feat(ios): add widget snapshot store
da793b2 feat(ios): add core data mappers
21a093c test(ios): add drift fixtures
cdd5b1f docs(ios): start phase 6 planning
```

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
    - Remaining: B3 first scheduled invocation confirmation, Toss test-key E2E
      smoke, and Toss webhook signature verification once official dashboard
      secret/header details are available.
    - v1 keeps Toss Payments billing. Naver Pay recurring, Kakao Pay recurring,
      and PortOne multi-PG are documented as future payment-method expansion.
  - Amplify 배포는 Phase 7 완료 후. v3까지 Android 사용자는 데스크탑 web 으로 우회.
  - 자세한 punch list: `next_steps.md` Phase 7.
  - 도메인/sync 레이어 (IndexedDB queue, Supabase adapter, auth)는 그대로 유지.
- Phase 6 iOS / Widget — current state (2026-05-22):
  - `JustDoShared` includes Swift domain models, mutation queue schema, drift
    fixtures, Core Data model/mappers, App Group snapshot/mutation stores,
    Supabase REST read/flush sync, and WidgetKit display models.
  - Real-device verification track is active on iPhone 14 Pro / iOS 26.5
    against Xcode 26.3 / macOS Tahoe 26.3.1.
  - Xcode project targets (Bundle ID 2026-05-22 갱신):
    - `JustDoApp` (`kr.justdo.app`)
    - `JustDoWidgetExtension` (`kr.justdo.app.widget`)
    - `JustDoAppUITests` (`kr.justdo.app.uitests`)
    - App Group: `group.kr.justdo.app`
    - Keychain service: `kr.justdo.app.supabase-session`
  - Native signed-in shell includes Home / Stats / Settings based on
    `reference/proto/`.
  - Settings includes sync status/error UI.
  - Home calendar task bars/no-dot rendering and resizable selected-day panel
    were implemented.
  - Detail edit/delete from pushed task/habit detail screens is implemented.
  - Widget Task/Habit mode toggle is implemented for small/medium/large widgets.
  - Widget row text deep-links through `justdo://task/<id>` and
    `justdo://habit/<id>`.
  - UI automation covers app deep-link detail opening with DEBUG-only seeded
    Core Data data.
  - App and widget task completion toggles now use compact
    `task_completion_set` mutations instead of full task upsert.
  - Last verified:
    - `cd apps/ios && swift test` -> pass, 40 tests.
    - `cd apps/ios && xcodebuild -project JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test` -> pass, 2 UI tests.
    - `cd apps/ios && xcodebuild -project JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.
  - Remaining iOS work is mostly real-device visual verification. Because this
    is a native SwiftUI/Xcode app, do **not** use Expo Go; install directly from
    Xcode to a real iPhone or use TestFlight later.
  - Both targets share App Group `group.kr.justdo.app`.
  - Auto-generated `JustDoWidgetControl` (iOS 18-only) removed.
  - `JustDoWidget.swift` now reads `widget_snapshot.json` from the App Group,
    converts it with `JustDoWidgetDisplayModelFactory`, and renders
    `JustDoWidgetView` for small / medium / large widget families.
  - The main app has `WidgetSnapshotWriter` and writes
    `widget_snapshot.json` on launch/foreground from the Core Data mirror.
    The mirror is currently seeded locally until the app wires Supabase Auth
    credentials into sync.
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
  - `JustDoApp/AuthViewModel.swift` and `ContentView.swift` expose minimal
    Google/Apple sign-in and sign-out controls. Successful sign-in writes the
    Keychain session and triggers the existing widget snapshot refresh path.

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
e65a405 feat: add app icon and web favicon
3081ae4 feat(ios): redesign home calendar and fix auth dark mode
551f302 chore(ios): rename bundle id to kr.justdo.app
32d619a docs: confirm B3 first scheduled invocation
c04371e test(web): expand pro checkout regression coverage
5f23eed test(ios): add deep link UI coverage
d7fa498 feat(ios): patch task completion mutations
177e07c test(ios): cover widget deep link routes
e44b925 docs: refresh ios next steps
2d8530e feat(ios): add widget task habit modes
```

## App Shape Now

> 2026-05-10 Platform Strategy 결정 이후 web과 iOS의 UI는 의도적으로 분기. `just_do_prd.md` §1.5 참고. 아래는 플랫폼별 현재 상태.

### App Shape — iOS (current native root, proto-aligned)

- Bottom tabs are `홈 / 통계 / 설정` (proto = `reference/proto/tabbar.jsx` 기준).
- Home (2026-05-22 갱신):
  - Header에 `Just Do` wordmark (24pt) + 년/월 + nav 화살표 + 우상단 add (+) 버튼.
  - Calendar (월간 6 weeks) full-bleed, task bar overlay 유지. 빈 날짜
    셀도 row height 일관성 위해 lane 2개 강제.
  - 날짜 셀의 tap area는 row 전체 (date pill + 아래 빈 영역 포함).
  - Calendar 좌우 swipe → 이전/다음 달, cell tap → 해당 날짜 sheet 자동
    open.
  - Selected-day 정보는 inline panel이 아니라 **bottom sheet modal**
    (`.height(420)` 단일 detent). Sheet 안 좌우 swipe → ±1 day.
    background tap / drag-down → dismiss.
- Stats has its own tab.
- Settings owns dark mode and habit/category management entry points.
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
- Today panel: selected-date Task list and active Habit list; Task/Habit check toggles live on the right side. Task completion stays in the same list with checkbox/strikethrough, not a separate completed section.
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
apps/web/src/features/just-do/home-screen.tsx
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

> 2026-05-21 기준 — 배포 트랙은 운영 LIVE로 종료됨. Phase 7 Web Desktop
> Redesign은 Pro checkout 운영 확인/외부 의존만 남아 있고, iOS 잔여 작업은
> 실기기 시각 검증 중심. Toss 가맹점 심사는 가장 긴 차단 항목 (~2–3주)이라
> 사용자 외부 트랙으로 먼저 시작하는 것이 유리.

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
     - Task Detail edit / Stats 검증 통과 (Add Sheet-style editor,
       selected-date preserve, Stats formatting/count fixes 후).
   - 남은 시각 검증 순서: **Settings → Widget**.
     각 단계의 reference 파일과 체크리스트는
     `docs/ios_phase6_status.md` "Next Work" 섹션 참고.
   - Widget 검증은 실기기에 위젯을 직접 추가 후 small/medium/large 3가지,
     Task/Habit toggle, deep link (`justdo://task/<id>` /
     `justdo://habit/<id>`), foreground flush까지 검증.
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

### Codex 또는 Claude Code 세션 재개 가이드 (2026-05-21 갱신)

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
- iOS는 Phase 7과 독립 트랙. 현재 남은 것은 Xcode 직접 설치 또는 TestFlight
  기반 실기기 시각 검증이며, Expo Go로 검증하지 않음.
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
