# Just Do iOS

This directory starts the native iOS implementation track.

The current contents are intentionally project-light:

- `JustDoShared/Domain/JustDoModels.swift` mirrors the web domain model.
- `JustDoShared/Sync/MutationQueueSchema.swift` defines the local mutation
  events that the app and WidgetKit should share.
- `JustDoShared/Storage` defines the first Core Data model, in-memory stack,
  domain mappers, and App Group widget snapshot store.
- `JustDoShared/Widgets` defines WidgetKit-ready small, medium, and large
  SwiftUI layouts plus display models.
- `Tests/JustDoSharedTests` verifies the Swift mirror against JSON fixtures
  shaped like the web persisted snapshot and mutation queue.

Do not treat this as an Xcode project yet. The next implementation step is to
create the app, widget, and shared framework targets around these contracts.

## Target Layout

Planned Xcode target structure:

```text
JustDoApp        SwiftUI app target
JustDoWidget     WidgetKit extension
JustDoShared     Shared domain, storage, sync, and App Group cache code
JustDoTests      Domain/storage drift tests
```

## App Group

Use one shared App Group for the app and widgets:

```text
group.com.justdo.app
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
