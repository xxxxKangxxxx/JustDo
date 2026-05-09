# Widget Sync Strategy

> Goal: a task/habit change made from an iOS widget must become the same
> account data that the iOS app and web app see. Widget UI feedback is local
> and immediate, but the durable source of truth is the shared backend.

## Decision

For v1, widgets are treated as **short-lived write clients**, not passive views.

- Widget check/uncheck actions write a domain mutation.
- The mutation is persisted to the shared account data source.
- Open web/iOS clients receive the change through Realtime.
- Closed clients pick up the change on next load/sync.

This means widget state must not be a separate source of truth.

## Architecture

```text
Widget tap
  -> App Intent
  -> Shared iOS data layer / sync client
  -> Supabase write (or queued local mutation if offline)
  -> Supabase Postgres
  -> Realtime event
  -> Open web/iOS clients update UI state
  -> Widget timeline reload reads updated cache
```

## Source Of Truth

- Remote source of truth: Supabase Postgres for authenticated users.
- Local source of truth: iOS App Group cache / Core Data mirror for widget reads.
- Web guest source: localStorage until login.
- Future offline source: mutation queue with Last Write Wins conflict policy.

The widget should read from the local iOS cache for speed. It should not need
to fetch a full task list from the network every render.

## Widget Write Path

### Task Complete

Widget action:

```text
toggleTask(taskId)
```

Expected durable write:

- `tasks.is_completed`
- `tasks.completed_at`
- `tasks.updated_at`

Open clients receive:

```text
task_upserted
```

### Habit Check

Widget action:

```text
setHabitLog(habitId, iso, value)
```

Expected durable write:

- `habit_logs(habit_id, log_date, is_completed)`

Open clients receive:

```text
habit_log_set
```

## Offline Behavior

The widget may run when the phone is offline or when the app process is not
alive. V1 should handle this without losing the tap:

1. Optimistically update the App Group cache so the widget can refresh quickly.
2. Enqueue a local mutation with:
   - `id`
   - `updatedAt`
   - mutation type
   - mutation payload
3. Attempt immediate upload if network/session is available.
4. If upload fails, leave the mutation queued.
5. The main iOS app drains the queue on foreground/background refresh.

Conflict policy for v1: Last Write Wins using updated timestamps. This should
be revisited if collaborative/shared tasks ship later.

Web implementation note:

- Logged-in web storage now uses a per-user IndexedDB snapshot and queue.
- Mutations are written locally first, then flushed to Supabase in `updatedAt`
  order.
- If Supabase write fails, the local mutation remains queued for the next flush
  attempt.
- Realtime remote changes are mirrored back into the local snapshot without
  creating new queued mutations.

Shared mutation names:

- `category_upsert`
- `category_delete`
- `preferences_set`
- `task_upsert`
- `task_delete`
- `habit_upsert`
- `habit_delete`
- `habit_log_set`

Web queue entries use this shape:

```ts
type QueuedMutation = {
  id: string;
  updatedAt: string;
  mutation:
    | { type: "category_upsert"; category: Category }
    | { type: "category_delete"; id: string }
    | { type: "preferences_set"; key: "week_start"; value: Settings["weekStart"] }
    | { type: "task_upsert"; task: Task }
    | { type: "task_delete"; id: string }
    | { type: "habit_upsert"; habit: Habit }
    | { type: "habit_delete"; id: string }
    | { type: "habit_log_set"; habitId: string; iso: string; value: 0 | 1 };
};
```

iOS/App Group should mirror the same semantic event names and timestamp field
even if the native payload types differ.

## Widget Refresh

WidgetKit is not a continuously running realtime client.

- After an App Intent mutation, request a widget timeline reload.
- The widget reads its next snapshot from the local App Group cache.
- Realtime is for open app/web clients, not for keeping the widget process
  subscribed in the background.

## Auth And Security

Open question for iOS implementation:

- Whether the widget can safely use the Supabase user session directly.
- Or whether widget actions should always call into shared app code that owns
  auth/session and mutation queue management.

Preferred direction: centralize auth/session handling in the iOS app/shared
data layer. The widget should call a small domain mutation API and should not
spread raw Supabase session handling throughout widget code.

## Web/App Realtime Requirements

The shared Realtime domain events need to cover every mutation that a widget can
produce:

- `tasks`: create/update/delete and completion changes.
- `habit_logs`: check/uncheck.
- `habits`: create/update/delete when main app changes habit definitions.

Tags are not initially widget-critical, but they still matter for consistency
across web/app clients:

- `tags`
- `task_tags`
- later `habit_tags`

## Current Implementation Status

- Web storage interface has `JustDoStorage.subscribe(callback)`.
- Supabase Realtime is enabled for `tasks`, `habits`, `habit_logs`.
- Web store applies `task_upserted`, `task_deleted`, `habit_upserted`,
  `habit_deleted`, `habit_log_set`, `category_upserted`, and
  `category_deleted`.
- Web realtime reloads affected tasks when `task_tags` / `tags` change.
- iOS `apps/ios/JustDoShared` now has Swift domain and mutation queue
  contracts, Core Data model/mappers, App Group widget snapshot storage, and
  shared WidgetKit layouts.
- The Xcode app/widget targets exist, and the WidgetKit extension now hosts
  the shared widget view from the App Group snapshot.
- The main iOS app has a `WidgetSnapshotWriter` and writes
  `widget_snapshot.json` from the Core Data mirror on launch/foreground. The
  mirror is currently seeded locally.
- `JustDoShared/Sync` has a Supabase REST read-sync scaffold that fetches
  categories, tasks, tags/task_tags, habits, and habit logs for a signed-in
  user, maps them to `AppSnapshot`, and replaces the Core Data mirror. It is
  wired into the app lifecycle through `AppSyncCoordinator`. Supabase project
  configuration comes from environment or Info.plist keys, while user sessions
  come from a Keychain-backed session store.
- The iOS app has a minimal `ASWebAuthenticationSession` PKCE OAuth flow for
  Google/Apple. Successful auth stores access token, refresh token, user ID,
  and expiry in Keychain; expired sessions are refreshed before sync.
- Widget App Intents now support task complete/uncomplete and habit
  check/uncheck. They optimistically update `widget_snapshot.json`, append a
  durable mutation to App Group `mutation_queue.jsonl`, and request a timeline
  reload.
- The app drains App Group `mutation_queue.jsonl` during widget snapshot
  refresh. Drained mutations are applied to the Core Data mirror and preserved
  in `CDQueuedMutation`.
- When a valid Supabase session is available, the app flushes `CDQueuedMutation`
  in `updatedAt` order. Successfully written rows are removed from the local
  queue after the remote write succeeds.
- Widget task/habit row text links open `justdo://task/<id>` or
  `justdo://habit/<id>`. The app registers the `justdo` URL scheme and parses
  those links into native deep-link state, then renders task/habit detail from
  the Core Data mirror.

## Next Steps

- Replace the scaffold inline detail panel with NavigationStack push-detail
  routes.
- Run manual hosted Supabase OAuth/offline sync verification.
- Add drift tests for Swift domain JSON and web persisted snapshot samples.
