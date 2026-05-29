# Just Do

This repository holds the Just Do product documents, design references, web app,
Supabase workspace, and the native iOS implementation track.

**Production:** `https://www.justdo.co.kr` (LIVE 2026-05-17 — AWS Amplify
Hosting + Next.js SSR + Route 53 + ACM TLS, hosted Supabase backend). apex
`https://justdo.co.kr` → www redirect.

## Current Focus

- **Platform Strategy (2026-05-10)**: Web=데스크탑 productivity hub, iOS=모바일
  네이티브, Android=v3. 자세한 내용: `docs/just_do_prd.md` §1.5.
- **Active next product track (2026-05-29)**: Goal & Pro Report MVP. Just Do
  Mode iOS/Web implementation and smoke follow-up are complete enough to move
  on. Next work should start with Supabase schema migration, then Web MVP, then
  iOS MVP. TestFlight/App Store preparation remains next after the team decides
  whether the first TestFlight build includes Goal & Pro Report. 자세한 내용:
  `docs/next_steps.md` Active Next Track.
- **Phase 7 Web Desktop Redesign** is complete except the Pro checkout track.
  데스크탑 reference는 `reference/web_proto/`와
  `reference/Just Do - Web Prototype.html`. 현재 Pro checkout은 Toss
  Payments 빌링 기준으로 schema/API/UI wiring, subscription 상태 표시,
  entitlement gate, 정기결제 cron, route/UI mock 회귀 테스트까지 완료됨.
  남은 항목은 Toss 테스트 키 E2E, 운영 dashboard webhook signature 확인,
  live billing 직전 DLQ 추가. 자세한 punch list:
  `docs/next_steps.md` Phase 7.
- iOS Phase 6 실기기 시각 검증은 iPhone 14 Pro iOS 26.5 기준으로
  Auth landing, Home, Add Sheet, edit-sheet routing, Stats, Settings,
  Widget까지 통과. Task/Habit pushed detail page는 제거했고, Home과 app
  deep link는 기존 add UI와 같은 editor sheet를 연다. 2026-05-29 최종 실기기
  smoke도 통과했으며, 남은 iOS 트랙은 Goal & Pro Report 포함 여부 결정 후
  TestFlight/App Store 준비.
- 현재 `apps/web/` 은 데스크탑 productivity hub shell이며, 도메인/sync 레이어는
  기존 구현을 유지함. 결제 모달은 v1에서 Toss만 활성화하고 네이버페이 /
  카카오페이 / PortOne 경유 다중 PG는 추후 확장 트랙으로 남겨둠.
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
- The signed-in iOS root now renders the native calendar home, stats, and
  settings tabs based on `reference/proto/`, including task/habit add flows,
  habit/category management entry points, Just Do Mode, and task/habit editor
  sheets opened from Home or app deep links.
- The settings tab owns the dark-mode toggle. The home header keeps only the
  add button, matching the current native interaction model.
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
complete. The active product work is Goal & Pro Report MVP; iOS TestFlight/App
Store preparation follows after the inclusion decision for that MVP. 자세한 내용:
`docs/ios_phase6_plan.md`, `docs/ios_phase6_status.md`,
`docs/claude_handoff.md`.
