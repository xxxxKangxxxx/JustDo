# Just Do

This repository holds the Just Do product documents, design references, web app,
Supabase workspace, and the native iOS implementation track.

**Production:** `https://www.justdo.co.kr` (LIVE 2026-05-17 — AWS Amplify
Hosting + Next.js SSR + Route 53 + ACM TLS, hosted Supabase backend). apex
`https://justdo.co.kr` → www redirect.

## Current Focus

- **Platform Strategy (2026-05-10)**: Web=데스크탑 productivity hub, iOS=모바일
  네이티브, Android=v3. 자세한 내용: `docs/just_do_prd.md` §1.5.
- **Active release track (2026-09-07)**: iOS/Web v1 will launch with all current
  product features free. Web/iOS feature gates and purchase surfaces have been
  removed, Web billing mutation routes are hard-disabled, and both Terms
  surfaces use the all-free policy. TestFlight build 15 is installed and its
  targeted Korean public-holiday/Sunday calendar and detail-sheet behavior
  passed real-device verification. 자세한 내용:
  `docs/full_free_launch_plan.md`, `docs/next_steps.md` Active Release Track,
  and `docs/testflight_smoke_checklist.md`.
- **Current verification (2026-09-07)**: `swift test` passed 98 tests, Web
  Vitest passed 152 tests, Web ESLint passed, and the signed iOS 1.0 (15)
  app/widget archive uploaded successfully. Build 15 then passed its targeted
  real-device TestFlight verification.
- **App Store preparation**: listing metadata, privacy/support URLs, 6.9-inch
  screenshots, review notes, age rating, pricing, and privacy declarations are
  recorded as ready. Public App Review submission waits for the consolidated
  next TestFlight build and its real-device smoke.
- **Phase 7 Web Desktop Redesign** is complete. The previous checkout track is
  retained only as compatibility/history and is disabled for the full-free v1
  launch.
  데스크탑 reference는 `reference/web_proto/`와
  `reference/Just Do - Web Prototype.html`. 결제 스키마와 격리된 Toss helper는
  호환성/이력 보존 대상으로 남아 있지만 활성 UI 호출자는 없고 변경 API는
  `410 billing_disabled`로 고정됐다. 운영 스케줄 비활성화는 출시 전 남은
  방어선이다. 자세한 계획: `docs/full_free_launch_plan.md`.
- iOS는 Home 중심 IA, Settings 내부 관리 화면, Goal & Report, 로컬 알림,
  한국 공휴일 캘린더, 월간 Task List, Home/Lock Screen widget까지 구현·실기기
  검증을 진행했다. 현재 App Store 프로젝트 버전은 `1.0 (15)`이다.
- 현재 `apps/web/` 은 데스크탑 productivity hub shell이며, 도메인/sync 레이어는
  기존 구현을 유지한다. 결제 모달과 구독 UI의 사용자 진입 및 서버 결제 경로는
  이미 제거/비활성화됐으며, AWS 스케줄러 비활성화만 운영 단계에 남아 있다.
- Product and handoff documents live in `docs/`.
- Original UI references remain in `reference/`.

## Project Layout

UI reference는 플랫폼별로 다름:

- `reference/proto/` — 모바일 / iOS reference (또한 v3 Android).
- `reference/web_proto/` 및 `reference/Just Do - Web Prototype.html` —
  데스크탑 web reference.

`reference/screens/` 와 `reference/design-board.html` 은 시각 지원용. Production
code는 `reference/` 안에 작성하지 않음.

```text
apps/
  web/
  ios/
docs/
reference/
supabase/
```

## Web App

The web app is a Next.js app with Supabase auth, Realtime, IndexedDB
local-first storage, offline mutation queue, category management, task tags,
and daily/weekly habit recurrence.

```bash
npm install
npm run dev:web
```

Useful checks:

```bash
npm --prefix apps/web run lint
npm --prefix apps/web test
npm --prefix apps/web run build
```

## Local Supabase

Local development uses the Supabase CLI stack under `supabase/`.

```bash
supabase start
```

To clear local test accounts and app data without resetting migrations:

```bash
npm run db:reset-local-app-data
```

See `docs/local_dev.md` for the local reset procedure and browser data notes.

## iOS App

The iOS track lives in `apps/ios/`.

Current status:

- `JustDoShared` SwiftPM library mirrors the web domain model.
- Shared mutation queue schema matches the web queue event names.
- Core Data model/mappers and App Group widget snapshot store are implemented.
- SwiftUI small/medium/large widget layouts are implemented in shared code.
- Xcode app and WidgetKit extension targets exist under
  `apps/ios/JustDoApp/`.
- Production bundle identifiers are `kr.justdo.app`,
  `kr.justdo.app.widget`, and `kr.justdo.app.uitests`; the shared App Group is
  `group.kr.justdo.app`; Keychain service is
  `kr.justdo.app.supabase-session`.
- The WidgetKit extension hosts the shared widget layouts and reads
  `widget_snapshot.json` from the App Group, with a fallback placeholder until
  the main app writes real snapshots.
- The main app seeds Core Data once, then writes `widget_snapshot.json` from
  the native Core Data mirror on launch/foreground.
- `JustDoShared` includes a Supabase REST read-sync client that can fetch
  categories, tasks, tags, habits, and habit logs for an authenticated user and
  replace the Core Data mirror.
- The iOS app has an app lifecycle sync coordinator. It reads Supabase project
  configuration from environment or Info.plist keys, reads the user session
  from Keychain, syncs the Core Data mirror when a valid session exists, and
  otherwise falls back to seeded local mirror data.
- The iOS app has a minimal PKCE OAuth sign-in flow for Google/Apple using
  `ASWebAuthenticationSession`. Successful sign-in writes access token, refresh
  token, user ID, and expiry into Keychain; expired sessions are refreshed
  before read-sync.
- The signed-in iOS root uses a Home-centered IA based on `reference/proto/`.
  Settings opens from the Home top-right icon; the former Stats surface lives
  under `설정 → 습관`, and goal/category/habit management stays contained in
  Settings. Task/habit editors open from Home or app deep links.
- Core Data mirror writes are serialized through the managed object context,
  and Supabase snapshot replacement updates existing rows in place to avoid
  launch-time Core Data observer crashes.

Useful checks:

```bash
cd apps/ios
swift test
```

Local iOS Supabase client config belongs in the gitignored file:

```text
apps/ios/JustDoApp/Config/Local.xcconfig
```

Widget App Intents support task complete/uncomplete and habit check/uncheck
through an App Group mutation queue, and the app drains that queue into Core
Data on refresh. Queued Core Data mutations flush to Supabase when a valid
session is available. Home-screen widget rows toggle completion from the whole
row; app deep links route `justdo://task/<id>` and `justdo://habit/<id>` into
native editor sheets rather than pushed detail pages. Detail edit/delete,
app-facing sync status UI, hosted OAuth/offline sync, Supabase subscription
plan read-sync, Home/Add/Stats/Settings/Widget visual checks, deep-link UI
tests, 1-hour+ auth session refresh smoke, and final real-device smoke are
complete. Goal & Report MVP first pass is now included in native iOS:
Settings → 목표, annual/monthly goal cards, onboarding/monthly/yearly prompt
flows, centered add/edit dialog with delete confirmation, lock toggle, and
Supabase goal sync, period-end report banners, local notification planning,
Korean public-holiday calendars, and the monthly Home Task List are included.
The next native milestone is the consolidated TestFlight Release Candidate and
public App Review submission, not another IA pass.
자세한 내용:
`docs/ios_phase6_plan.md`, `docs/ios_phase6_status.md`,
`docs/claude_handoff.md`.
