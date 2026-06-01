# Just Do iOS

This directory contains the native iOS implementation track.

Current contents:

- `JustDoShared/Domain/JustDoModels.swift` mirrors the web domain model.
- `JustDoShared/Sync/MutationQueueSchema.swift` defines the local mutation
  events that the app and WidgetKit should share.
- `JustDoShared/Storage` defines the first Core Data model, in-memory stack,
  domain mappers, and App Group widget snapshot store.
- `JustDoShared/Widgets` defines WidgetKit-ready small, medium, and large
  SwiftUI layouts plus display models.
- `Tests/JustDoSharedTests` verifies the Swift mirror against JSON fixtures
  shaped like the web persisted snapshot and mutation queue.
- `JustDoApp/JustDoApp.xcodeproj` hosts the SwiftUI app, WidgetKit extension,
  and UI test targets.
- `JustDoApp/JustDoApp` implements the native app shell, auth flow,
  Core Data mirror sync, Home shell, add/editor-sheet flows, Just Do Mode,
  Goal & Pro Report goal management/prompt/report surfaces, Settings-contained
  management screens, and widget snapshot writer. The 2026-06-01 IA pass moved
  Settings to a Home top-right icon, removed the standalone Stats bottom tab,
  kept a single centered Home bottom tab for continuity, and reserved future
  bottom-bar expansion for `함께` friendship/scheduling.
- `JustDoApp/JustDoWidget` hosts the WidgetKit extension that reads the
  App Group snapshot and queues widget mutations.

## Target Layout

Xcode target structure:

```text
JustDoApp                 SwiftUI app target
JustDoWidgetExtension     WidgetKit extension
JustDoShared              Shared domain, storage, sync, and widget code
JustDoSharedTests         Domain/storage/widget drift tests
JustDoAppUITests          Deep-link UI tests
```

Production identifiers:

```text
JustDoApp              kr.justdo.app
JustDoWidgetExtension  kr.justdo.app.widget
JustDoAppUITests       kr.justdo.app.uitests
Keychain service       kr.justdo.app.supabase-session
```

## App Group

Use one shared App Group for the app and widgets:

```text
group.kr.justdo.app
```

The group container should hold:

- widget snapshot JSON for fast timeline reads
- pending mutation queue records
- small sync metadata such as last successful remote sync time

Core Data remains the richer local mirror for the main app. Widgets should read
compact snapshots from the App Group container rather than opening complex app
state directly.

## Verification

```bash
cd apps/ios
swift test
```

The latest full simulator checks are tracked in `docs/claude_handoff.md`.
Real-device visual verification on iPhone 14 Pro / iOS 26.5 has passed for
Auth landing, Home, Add Sheet, editor-sheet routing, the pre-IA Stats/Settings
surfaces, and Widget. The 2026-05-25 1-hour+ auth session refresh smoke also
passed. App deep links open task/habit editor sheets, while Home selected-day
sheet task taps edit inline and habit row taps no-op except for the check
control. The 2026-05-29 final real-device smoke also passed. The 2026-06-01 IA
changes build successfully and need final real-device visual confirmation for
the full-screen Settings/Habit/management flows.

Goal & Pro Report MVP first pass is now mirrored into iOS:

- `Goal` / `GoalPromptDismissal` domain models are in `JustDoShared`.
- Core Data mirror, mutation queue, Supabase REST fetch/mutation, and sync
  status diagnostics support goals and goal prompt dismissals.
- Settings is now opened from the Home top-right gear icon as a full-screen
  surface, not from a bottom tab.
- Settings → 목표 opens a full-screen annual/monthly goal management surface.
- Goal cards show title, note, completed/related/slipped counts, donut progress
  with centered percentage, and a tappable lock badge.
- Card tap keeps the existing edit behavior: locked goals show confirmation,
  unlocked goals open the editor.
- The lock badge toggles locked/unlocked directly and enqueues a sync mutation.
- Goal add/edit uses a centered modal dialog, not a nested bottom sheet; existing
  goals show a destructive delete confirmation before removal.
- Onboarding/monthly/yearly goal prompts are implemented with skip/dismissal
  persistence.
- Settings → 습관 opens the former stats screen under the `습관` title. Its
  `편집` button opens Habit management from inside that Habit screen, so closing
  Habit management returns to `습관`, not directly to Settings or Home.
- Settings → 카테고리 관리 opens full-screen category management inside Settings.

Latest focused checks: Settings → 목표 smoke was user-confirmed. After the
2026-06-01 IA changes, `swift test --package-path apps/ios` passed 46 tests,
generic iOS `xcodebuild` passed, and `git diff --check` passed. TestFlight/App
Store preparation follows the remaining report-entry banner pass:

- Home top report banner when a previous month/year report becomes available.
- Smaller Settings → 목표 supporting report banners near annual/monthly sections.
- Report entry is period-end only, not an always-on menu.
