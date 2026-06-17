# Phase 6 iOS Planning

This document defines the starting contract for the native iOS app and
WidgetKit implementation.

## Scope

Phase 6 begins after the web domain model has stabilized around:

- dynamic task categories
- task tags
- user preference sync for `week_start`
- habit recurrence: daily and weekly
- habit reminder time and habit detail/edit
- local mutation queue with Supabase sync

## Target Structure

```text
apps/ios/
  README.md
  JustDoShared/
    Domain/
      JustDoModels.swift
    Sync/
      MutationQueueSchema.swift
```

Current Xcode targets:

```text
JustDoApp                 SwiftUI application
JustDoWidgetExtension     WidgetKit extension
JustDoShared              Shared domain/storage/sync module
JustDoSharedTests         Domain/storage/widget drift tests
JustDoAppUITests          Deep-link UI tests
```

## Domain Mapping

| Web Type | Swift Type | Notes |
|----------|------------|-------|
| `Category` | `Category` | `id`, `name`, `color`, `isDefault`, `position` |
| `Task` | `Task` | `categoryId` maps to `categoryID: UUID?` |
| `Habit` | `Habit` | `recurType`, `recurDays`, `reminderTime`, `log` |
| `Goal` | `Goal` | `periodType`, `periodKey`, `title`, optional `note`, `sortOrder`, `locked`, `lockedAt` |
| `GoalPromptDismissal` | `GoalPromptDismissal` | onboarding/monthly/yearly prompt dismissal state |
| `Settings` | `Settings` | `weekStart` is the only synced preference in v1 |
| `AppState` persisted shape | `AppSnapshot` | session-only UI state is excluded |

Dates and times remain ISO strings in the shared Codable layer:

- date: `YYYY-MM-DD`
- time: `HH:mm`

SwiftUI views may convert them to `Date` / `DateComponents` at the edge.

## Core Data Plan

Main app local mirror entities:

| Entity | Important Fields |
|--------|------------------|
| `CDCategory` | `id`, `name`, `color`, `isDefault`, `position`, `createdAt` |
| `CDTask` | `id`, `categoryID`, `title`, `priority`, `startDate`, `endDate`, `scheduledTime`, `isCompleted`, `updatedAt`, `createdAt` |
| `CDTag` | `id`, `name`, `createdAt` |
| `CDTaskTag` | `taskID`, `tagID` |
| `CDHabit` | `id`, `title`, `emoji`, `recurType`, `recurDays`, `reminderTime`, `updatedAt`, `createdAt` |
| `CDHabitLog` | `id`, `habitID`, `logDate`, `isCompleted`, `updatedAt`, `createdAt` |
| `CDGoal` | `id`, `periodType`, `periodKey`, `title`, `note`, `sortOrder`, `locked`, `lockedAt` |
| `CDGoalPromptDismissal` | `id`, `promptType`, `periodKey`, `dismissedPermanentlyForPeriod`, `dismissedAt` |
| `CDQueuedMutation` | `id`, `updatedAt`, `type`, `payloadJSON` |
| `CDUserPreference` | `key`, `valueJSON`, `updatedAt` |

Relationships can be represented by UUID fields first. Core Data relationship
objects may be added later if SwiftUI fetch ergonomics require them.

## App Group Cache

Use App Group:

```text
group.kr.justdo.app
```

Files:

| File | Purpose |
|------|---------|
| `widget_snapshot.json` | Compact `WidgetSnapshot` for WidgetKit timelines |
| `mutation_queue.jsonl` | Append-friendly fallback queue for widget writes |
| `sync_meta.json` | Last sync timestamps and lightweight status |

The main app remains responsible for reconciling Core Data and Supabase. The
widget reads the App Group snapshot and writes a domain mutation through the
shared mutation queue API.

## Mutation Queue

Shared mutation names mirror the web queue:

- `category_upsert`
- `category_delete`
- `preferences_set`
- `task_upsert`
- `task_delete`
- `habit_upsert`
- `habit_delete`
- `habit_log_set`
- `goal_upsert`
- `goal_delete`
- `goal_prompt_dismissal_upsert`

For Swift, the semantic cases are defined in
`apps/ios/JustDoShared/Sync/MutationQueueSchema.swift`.

Conflict policy for v1:

- local writes are optimistic
- failed remote writes remain queued
- queue drains in `updatedAt` order
- Last Write Wins when remote and local records conflict

## Widget Plan

Widget sizes:

- small: today count + up to 3 items
- medium: week strip + today items
- large: month grid + today items

Initial widget actions:

- [x] task complete/uncomplete
- [x] habit check/uncheck for the displayed date
- [x] open app route for task/habit deep links
- [x] native task/habit detail panels for deep-link targets

The widget should not maintain a Supabase Realtime subscription. It writes
mutations, requests a timeline reload, and lets the app drain App Group
`mutation_queue.jsonl` into Core Data on app refresh.

## Next Implementation Steps

1. Create Xcode project/targets around `JustDoShared`. (Done under
   `apps/ios/JustDoApp`.)
2. Add drift tests that encode/decode sample JSON matching the web persisted
   snapshot and mutation queue. (Done in `apps/ios/Tests/JustDoSharedTests`.)
3. Implement Core Data model and mappers from Swift domain structs. (Initial
   implementation done in `JustDoShared/Storage`.)
4. Implement App Group `WidgetSnapshot` read/write. (Done in
   `AppGroupWidgetSnapshotStore`.)
5. Build WidgetKit small/medium/large layouts from `reference/screens/widgets.jsx`.
   (Initial SwiftUI layouts done in `JustDoShared/Widgets`; Xcode widget
   extension now hosts them through `AppGroupWidgetSnapshotStore` and
   `JustDoWidgetDisplayModelFactory`.)
6. Add app-side `widget_snapshot.json` writer. (Done. The app writes snapshots
   from the Core Data mirror on launch/foreground.)
7. Complete native Home / Stats / Settings, Add Sheet, detail edit/delete,
   sync status UI, hosted OAuth/offline sync, widget interactions, and
   real-device visual verification. (Done through the 2026-05-22 iPhone 14 Pro
   pass.)
8. Fix auth session persistence after access-token expiry and verify a 1-hour+
   close/reopen smoke. (Done on 2026-05-25.)
9. Implement Goal & Pro Report iOS first pass after Web behavior stabilized.
   (Done 2026-05-29/30: shared models, Core Data mirror, Supabase sync,
   Settings → 목표, prompt UI, centered goal editor dialog, lock toggle, and
   report scaffolding.)
10. Focused Goal smoke, report-entry UX, and delete-confirm UX are done.
    Remaining v1 work is TestFlight/App Store submission preparation.
