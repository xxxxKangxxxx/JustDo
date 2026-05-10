# Just Do

This repository holds the Just Do product documents, design references, web app,
Supabase workspace, and the native iOS implementation track.

## Current Focus

- **Platform Strategy (2026-05-10)**: Web=데스크탑 productivity hub, iOS=모바일
  네이티브, Android=v3. 자세한 내용: `docs/just_do_prd.md` §1.5.
- **Phase 7 Web Desktop Redesign** is the v1 출시 차단 항목. 데스크탑
  reference는 `reference/web_proto/`와 `reference/Just Do - Web Prototype.html`.
  첫 구현 패스가 `apps/web/`에 반영됨. 자세한 punch list:
  `docs/next_steps.md` Phase 7.
- iOS Phase 6 잔여 작업 (detail edit/delete, sync status UI) 은 Phase 7과
  독립적으로 병렬 진행.
- 현재 `apps/web/` 은 데스크탑 productivity hub shell로 재작성 중이며,
  도메인/sync 레이어는 기존 구현을 유지함.
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
  habit/category management entry points, and pushed task/habit detail routes.
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

Widget App Intents now support task complete/uncomplete and habit
check/uncheck through an App Group mutation queue, and the app drains that
queue into Core Data on refresh. Queued Core Data mutations now flush to
Supabase when a valid session is available. Widget rows deep-link back into the
iOS app through the `justdo` URL scheme and render native task/habit detail
screens from the Core Data mirror. The next iOS work is detail edit/delete and
app-facing sync status/error UI; visual polish against `reference/proto/` and
hosted OAuth/offline sync verification 은 Phase 7 (`docs/next_steps.md`)
일정과 함께 정리됨. 자세한 내용: `docs/ios_phase6_plan.md`,
`docs/ios_phase6_status.md`, `docs/claude_handoff.md`.
