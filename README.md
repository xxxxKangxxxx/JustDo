# Just Do

This repository holds the Just Do product documents, design references, web app,
Supabase workspace, and the native iOS implementation track.

## Current Focus

- Web v1 is implemented in `apps/web/`.
- Phase 6 iOS work is active in `apps/ios/`.
- Product and handoff documents live in `docs/`.
- Original UI references remain in `reference/`.

## Project Layout

Use `reference/proto/` as the main behavior and UI reference. Use
`reference/screens/` and `reference/design-board.html` as visual support only.
Do not build production code inside `reference/`.

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
panels from the Core Data mirror. The next iOS work is manual OAuth/offline
sync verification and NavigationStack-based detail routing. See
`docs/ios_phase6_plan.md`, `docs/ios_phase6_status.md`, and
`docs/claude_handoff.md`.
