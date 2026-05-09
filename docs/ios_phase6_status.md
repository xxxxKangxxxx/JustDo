# iOS Phase 6 Status

This document summarizes the current native iOS Phase 6 state, remaining
implementation gaps, and checks to run before testing or shipping.

## Current Implementation

- `JustDoShared` mirrors the web domain model and local mutation queue schema.
- Core Data mirror is implemented for categories, tasks, habits, and queued
  mutations.
- App Group storage is implemented for:
  - `widget_snapshot.json`
  - `mutation_queue.jsonl`
- WidgetKit small, medium, and large layouts are implemented.
- Widget task/habit actions are interactive:
  - task complete/uncomplete
  - habit check/uncheck for the selected date
- Widget actions optimistically update `widget_snapshot.json`, append App Group
  mutations, and request a timeline reload.
- The app drains App Group widget mutations into Core Data and preserves them in
  `CDQueuedMutation`.
- When a valid Supabase session exists, the app flushes `CDQueuedMutation` to
  Supabase and removes rows only after successful remote writes.
- Supabase read-sync refreshes the Core Data mirror from categories, tasks,
  tags/task_tags, habits, and habit logs.
- Native Supabase PKCE OAuth is implemented with Keychain-backed session
  storage and refresh-token handling.
- Widget row text deep-links to:
  - `justdo://task/<task-id>`
  - `justdo://habit/<habit-id>`
- The app registers the `justdo` URL scheme and renders native task/habit detail
  screens from the Core Data mirror.
- Deep-linked task/habit screens are pushed with a SwiftUI `NavigationStack`
  route instead of being rendered inline on the root scaffold.

## App Shell Gap

The root app shell is still a scaffold. Deep-linked task/habit detail now uses
`NavigationStack`, but the root screen should still grow into the real app shell:

- Root screen: signed-in status, sync state, today summary, and entry points.
- Detail screens currently display read-only fields from the Core Data mirror.
- Later edit actions should live on those pushed detail screens.
- The existing `JustDoDeepLink`, `DetailRoute`, and
  `CoreDataAppSnapshotStore.task(id:)` / `habit(id:)` helpers are the current
  routing/data boundary.

## Before Manual Testing

- Confirm `apps/ios/JustDoApp/Config/Local.xcconfig` exists locally and contains:
  - `JUSTDO_SUPABASE_URL`
  - `JUSTDO_SUPABASE_ANON_KEY`
- Confirm Supabase Auth URL Configuration includes:
  - `justdo://auth-callback`
- Build the app target:

```bash
xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build
```

- Run shared tests:

```bash
cd apps/ios
swift test
```

## Manual Test Checklist

- Launch app on simulator.
- Sign in with Google.
- Confirm the app writes a Keychain session and refreshes the widget snapshot.
- Add the widget to the simulator home screen.
- Tap a task check dot in the widget.
  - Expected: widget updates optimistically.
  - Expected: app foreground drains App Group queue.
  - Expected: Supabase `tasks.is_completed` updates after queue flush.
- Tap a habit check dot in the widget.
  - Expected: widget updates optimistically.
  - Expected: Supabase `habit_logs` row is inserted for value `1`.
  - Expected: Supabase `habit_logs` row is deleted for value `0`.
- Tap task/habit row text in the widget.
  - Expected: app opens through `justdo://task/<id>` or `justdo://habit/<id>`.
  - Expected: matching local detail data is displayed.
- Relaunch app and widget.
  - Expected: remote read-sync preserves flushed changes.

## Before Deployment

- Move real production Supabase values into deployment/build settings, not
  `Local.xcconfig`.
- Confirm `Local.xcconfig` remains gitignored and is not staged.
- Confirm release build has non-empty `JUSTDO_SUPABASE_URL` and
  `JUSTDO_SUPABASE_ANON_KEY` in the generated app Info.plist.
- Confirm Associated Domains are not needed for the current custom-scheme
  deep-link approach. If universal links are added later, add associated domains
  and hosted apple-app-site-association configuration.
- Confirm App Group entitlement `group.com.justdo.app` exists for both app and
  widget extension in the Apple Developer portal for the release bundle IDs.
- Run hosted OAuth/offline sync verification once before declaring v1 sync
  stable.

## Next Work

- Run hosted OAuth/offline sync verification.
- Add app-facing sync status/error UI so failed queue flushes are visible.
- Add UI tests for deep-link opening once the app shell is more complete.
- Consider a narrower Supabase task completion patch endpoint in iOS if full
  task upsert starts carrying fields that should remain remote-owned.
