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
- The signed-in root shell now renders native Home / Stats / Settings tabs
  based on `reference/proto/`.
- The Home tab includes the month calendar, selected-day panel, task/habit
  rows, add button, and bottom tab bar.
- The add flow uses a partial-height bottom sheet with Task/Habit modes,
  task date/time/category/priority fields, and habit emoji entry.
- Settings owns dark-mode control. The home header no longer has a separate
  dark/light button.
- Settings exposes habit and category management entry points.
- Core Data mirror operations are serialized on the context queue, and
  snapshot/upsert paths update existing rows in place where possible.

## Resolved Issues

- **Launch crash after signed-in sync.** The app could terminate on launch with
  Core Data exceptions such as `Collection <__NSCFSet> was mutated while being
  enumerated`, followed by an `EXC_BAD_ACCESS` in habit updates. Root cause:
  overlapping app lifecycle sync tasks used the same `viewContext` while the
  store was deleting and re-inserting objects during snapshot replacement and
  upsert. Fix: public Core Data store methods now run through
  `context.performAndWait`, snapshot replacement reconciles existing rows, and
  category/task/habit/queued mutation upserts update existing managed objects.
- **Dark mode split control.** The home header toggle and settings toggle had
  separate local states. Fix: settings owns the single `isDarkMode` binding,
  and the home header button was removed.
- **Add sheet height.** The add sheet previously used a full-height `.large`
  detent. Fix: it now uses a partial-height detent and proto-like bottom-sheet
  layout.

## Remaining App Gaps

- Detail screens currently display read-only fields from the Core Data mirror.
- Later edit actions should live on the pushed detail screens.
- App-facing sync status/error UI is still minimal; failed queue flushes should
  be visible to the user.
- Native UI still needs another visual pass against `reference/proto/` after
  task/habit CRUD coverage settles.

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

- Signed-out root shell:
  - Expected: auth landing matches `reference/proto/auth.jsx`.
  - Expected: Apple, Google, Kakao, and email buttons match
    `reference/proto/auth-button.jsx` styling and icons.
- Sign in with Google.
- Signed-in root shell:
  - Expected: app switches to the calendar home screen based on
    `reference/proto/home.jsx`.
  - Expected: month header, calendar grid, selected-day panel, task/habit rows,
    and bottom tab bar render without overlap.
  - Expected: home header has a `+` add button only; dark mode is controlled
    from Settings.
  - Expected: `+` opens a partial-height bottom sheet, not a full-screen sheet.
  - Expected: Settings > 다크모드 changes the whole app color scheme.
- Manage data from Settings:
  - Expected: Settings > 습관 관리 supports add/delete.
  - Expected: Settings > 카테고리 관리 supports add/delete.
- Launch app on simulator.
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
- For web deployment and custom domain work, follow
  `docs/deployment_domain_aws_plan.md`.
- Run hosted OAuth/offline sync verification once before declaring v1 sync
  stable.

## Next Work

> 2026-05-10 Platform Strategy 결정으로 web 측은 Phase 7 (Web Desktop Redesign)이
> v1 출시 차단 항목이지만, iOS 잔여 작업은 Phase 7과 독립적으로 병렬 진행 가능.
> Hosted offline sync verification 은 Phase 7 완료 후 새 web UI 위에서 한 번에
> 회귀 검증하는 게 효율적이라 지금은 우선순위가 낮음.

- Verify signed-in iOS root home, add sheet, stats, and settings visually
  against `reference/proto/`.
- Add app-facing sync status/error UI so failed queue flushes are visible.
- Implement edit/delete from pushed task/habit detail screens.
- Add UI tests for deep-link opening once the app shell is more complete.
- Consider a narrower Supabase task completion patch endpoint in iOS if full
  task upsert starts carrying fields that should remain remote-owned.
- (Phase 7 완료 후) Run hosted OAuth/offline sync verification on the new web
  UI; iOS-specific Manual Test Checklist 는 위에서 그대로 적용.
