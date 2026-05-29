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
  Core Data mirror sync, Home/Stats/Settings tabs, add/editor-sheet flows,
  Just Do Mode, and widget snapshot writer.
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
Auth landing, Home, Add Sheet, editor-sheet routing, Stats, Settings, and
Widget. The 2026-05-25 1-hour+ auth session refresh smoke also passed. App
deep links open task/habit editor sheets, while Home selected-day sheet task
taps edit inline and habit row taps no-op except for the check control. The
2026-05-29 final real-device smoke also passed. The remaining iOS track is
TestFlight/App Store preparation.
