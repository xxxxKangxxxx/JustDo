# Handoff (next session — Codex or Claude Code)

Date: 2026-04-30
Branch: `main`
Remote: `origin` -> `https://github.com/xxxxKangxxxx/JustDo.git`

This handoff is written so the next session can continue without replaying the
chat. Chronological detail lives in `docs/worklog.md`; planned work lives in
`docs/next_steps.md`.

## Resume Work — cold-start checklist

The current local Supabase stack and web dev server may already be running
from the latest Codex session. To pick up "let's start working":

### 0. Tooling sanity (versions known to work as of 2026-04-29)

- Node `v24.6.0`
- npm `11.5.1`
- Supabase CLI `2.95.4`
- Docker Desktop running (only required if you choose the local stack
  in step 2).

### 1. Repo state

```bash
cd /Users/kang-yeongmo/justdo
git pull --ff-only origin main
npm install                    # safe to rerun; idempotent
```

`apps/web/.env.local` is gitignored. If missing, copy from the template
and fill values:

```bash
cp apps/web/.env.local.example apps/web/.env.local
# then edit:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

For hosted (cloud) Supabase the values come from
`https://supabase.com/dashboard/project/cohkxnwsbhrsfmsjqdpa/settings/api`.
For local Supabase the values come from `supabase status -o env` after
step 2.

### 2. Choose cloud OR local Supabase

**Cloud (default for this project)** — no extra startup. `apps/web/.env.local`
points at the hosted project (`cohkxnwsbhrsfmsjqdpa.supabase.co`). Skip to
step 3.

**Local stack** — starts a Docker-backed Postgres / Studio / Realtime stack.
Use this only when you need to run un-pushed migrations or test offline.

```bash
supabase start                 # spawns supabase_*_justdo containers
supabase status -o env         # copy API_URL/ANON_KEY into apps/web/.env.local
```

Latest known local stack state: started and migrated through
`20260430103000_user_preferences.sql`. Local Postgres data is preserved in a
docker volume (`docker volume ls --filter label=com.supabase.cli.project=justdo`).

### 3. Run the web dev server

```bash
npm run dev:web                # → http://localhost:3000
```

Sign-in flow uses Google OAuth. Hosted callback is already configured at
`https://cohkxnwsbhrsfmsjqdpa.supabase.co/auth/v1/callback`. Local
callback is `http://127.0.0.1:3000/callback`.

### 4. Verify before changing anything

```bash
npm --prefix apps/web run lint     # expect: pass
npm --prefix apps/web test         # expect: 76 tests pass
npm --prefix apps/web run build    # expect: pass
git diff --check                   # expect: clean
```

For iOS shared-code verification:

```bash
cd apps/ios
swift test                         # expect: 15 tests pass
```

If any step fails, stop and investigate before starting new work. The latest
pushed iOS infrastructure commits were green before this handoff.

### 5. End-of-session cleanup

When wrapping up, mirror what this session did:

```bash
# stop local supabase if you started it
supabase stop --workdir /Users/kang-yeongmo/justdo

# kill any dev servers you started (npm run dev:web, vitest --watch, etc.)
# one-shot commands (lint, test, build) leave nothing behind.

# verify ports are released
lsof -i -P -n | grep -E "5432[1-7]|3000" || echo "(clean)"

# verify only this project's containers are gone (others stay up)
docker ps --format '{{.Names}}'
```

Do not stop the unrelated containers (`freshbox-*`, `field-*`, etc.) —
they belong to other projects on this machine.

## Working Tree State

At handoff, the intent is to leave `main` clean and pushed. If `git status -sb`
shows local changes, they should be reviewed against the latest worklog entry
before continuing.

Latest pushed commits in this session (Claude Code, 2026-04-30):

```text
090815a feat(ios): scaffold xcode app and widget targets
f3e1b05 feat(ios): add widget layouts
e5f0144 feat(ios): add widget snapshot store
da793b2 feat(ios): add core data mappers
21a093c test(ios): add drift fixtures
cdd5b1f docs(ios): start phase 6 planning
```

## Current Status

- Phase 1 Repository Baseline — done.
- Phase 2 Web App Bootstrap — done.
- Phase 3 Local Data Layer — done.
- Phase 4 Supabase Integration — done.
- Phase 5 Offline Sync — done.
  - Plus follow-up: Task tag chip UI in Add/Edit sheet, automated
    offline→online sync regression tests, manual cloud verification
    checklist in `docs/local_dev.md`.
- Phase 5.5 Category Management — done. Button reorder and drag reorder are
  both supported, and PRD/planning category prose now reflects custom
  categories.
- Phase 5.6 User Preferences Sync — done.
- Phase 5.7 Habit Recurrence (daily + weekly) — done for new habit creation,
  storage/sync, selectors, Habit screen, Stats screen, and Habit detail/edit.
- Phase 6 iOS / Widget — SwiftPM shared-code track is underway:
  - Swift domain and mutation queue contracts.
  - Drift JSON fixtures.
  - Initial Core Data model/mappers.
  - App Group `WidgetSnapshot` read/write store.
  - Initial small/medium/large SwiftUI widget layouts.
- Phase 6 iOS / Widget — Xcode track started (2026-04-30):
  - `apps/ios/JustDoApp/JustDoApp.xcodeproj` created via Xcode GUI.
  - Targets: `JustDoApp` (iOS app), `JustDoWidgetExtension` (WidgetKit).
  - Bundle IDs: `com.justdo.app` / `com.justdo.app.widget`.
  - Both targets depend on local `JustDoShared` SwiftPM package.
  - Both targets share App Group `group.com.justdo.app`.
  - Auto-generated `JustDoWidgetControl` (iOS 18-only) removed.
  - `JustDoWidget.swift` now reads `widget_snapshot.json` from the App Group,
    converts it with `JustDoWidgetDisplayModelFactory`, and renders
    `JustDoWidgetView` for small / medium / large widget families.
  - The main app has `WidgetSnapshotWriter` and writes
    `widget_snapshot.json` on launch/foreground from the Core Data mirror.
    The mirror is currently seeded locally until the app wires Supabase Auth
    credentials into sync.
  - `JustDoShared/Sync/SupabaseRestSync.swift` contains the first Supabase REST
    read-sync client for categories, tasks, tags/task_tags, habits, and habit
    logs. It maps account rows into `AppSnapshot` and replaces the Core Data
    mirror through `CoreDataAppSnapshotStore`.
  - `JustDoApp/AppSyncCoordinator.swift` now triggers that read sync from app
    launch/foreground. Project URL/anon key come from environment or Info.plist
    keys, while user access token/user ID come from a Keychain-backed session
    store. Without a valid stored session, it keeps the seeded local Core Data
    mirror fallback.
  - `JustDoApp/SupabaseAuthClient.swift` implements a minimal REST/PKCE OAuth
    flow using `ASWebAuthenticationSession`, plus refresh-token exchange.
  - `JustDoApp/AuthViewModel.swift` and `ContentView.swift` expose minimal
    Google/Apple sign-in and sign-out controls. Successful sign-in writes the
    Keychain session and triggers the existing widget snapshot refresh path.

## v1 Open Decisions — all closed

See `docs/worklog.md` 2026-04-29 entries for full rationale.

| # | Topic | Decision |
|---|-------|----------|
| 1 | Subscription pricing | 월 ₩1,900 / 연 ₩9,900. Apple Tier 2. |
| 2 | Web ↔ iOS type sharing | Each platform mirrors locally. Web auto via `supabase gen types typescript`; iOS hand-written Swift Codable + drift unit test. Auto codegen deferred until 10+ migrations or 2+ drift bugs. |
| 3 | Task Dependency visualization | v2. `task_dependencies` table stays idle in v1. |
| 4 | User-customizable categories | v1 full CRUD, no Pro gating (Phase 5.5). Replace `me`/`ext` enum with `Task.categoryId: string \| null`. Custom hex picker + 8-color preset palette in v1. Habit category stays separate. |
| 5 | settings/view remote persistence | `public.users.preferences jsonb` column (Phase 5.6). Sync `weekStart` only. `notify` / `notifyTime` / `dark` / `view.*` stay device-local permanently. `plan` keeps using `user_subscriptions`. |
| 6 | `Habit.recur_type` | v1 = daily + weekly (Phase 5.7). monthly + `recur_end_date` go to v2. Domain gains `Habit.recurType: 'daily' \| 'weekly'`, `Habit.recurDays?: number[]`. |

## Latest Implementation Commit Trail

```text
090815a feat(ios): scaffold xcode app and widget targets
f3e1b05 feat(ios): add widget layouts
e5f0144 feat(ios): add widget snapshot store
da793b2 feat(ios): add core data mappers
21a093c test(ios): add drift fixtures
cdd5b1f docs(ios): start phase 6 planning
18af974 feat(web): finalize category and habit workflows
```

## App Shape Now

- Bottom tabs are `홈 / 습관 / 설정`.
- Home/calendar is Task-focused only.
  - Calendar dots show Task categories only.
  - Habit dots/lists were intentionally removed from Home.
- Habit has its own tab:
  - daily completion summary,
  - habit checklist for selected date,
  - recent 7-day completion grid.
- Stats is no longer a bottom tab.
  - It is now Settings -> `리포트` -> `활동 요약`.
- Add/Edit Task date range guard is implemented:
  - if start date moves after end date, end date is clamped to start date.
- Add/Edit Task sheet has a tag chip input:
  - Enter / comma / blur commits the draft tag.
  - Backspace on empty input removes the trailing chip.
  - Clicking a chip removes it.
  - Chip color follows the selected category (`me` / `ext`).

## Supabase / Cloud State

Hosted Supabase project:

- name: `JustDo`
- ref: `cohkxnwsbhrsfmsjqdpa`
- URL: `https://cohkxnwsbhrsfmsjqdpa.supabase.co`
- region: Northeast Asia (Seoul)

Applied migrations:

- `20260429014750_init_schema.sql`
- `20260429021447_add_habit_emoji.sql`
- `20260429052000_enable_realtime.sql`
- `20260430090000_category_management.sql`
- `20260430103000_user_preferences.sql`

Realtime publication includes:

- `categories`
- `tasks`
- `tags`
- `task_tags`
- `habits`
- `habit_logs`

Google OAuth was configured in Supabase Console and Google Cloud Console.
Hosted redirect URI:

```text
https://cohkxnwsbhrsfmsjqdpa.supabase.co/auth/v1/callback
```

`apps/web/.env.local` is gitignored and currently expected to point to the
cloud project for browser testing. Do not print or commit real key values.

## Important Storage Architecture

Core interface:

```text
apps/web/src/features/just-do/persistence.ts
```

Adapters / helpers now include:

- `createMemoryStorage`
- `createLocalStorageStorage`
- `createIndexedDBStorage`
- `createSnapshotStorage`
- `createSyncedStorage`
- `flushQueuedMutations`

Guest/local storage:

- IndexedDB first.
- DB: `just-do-web`
- store: `snapshots`
- record key: `state`
- fallback: `localStorage` key `just-do/web/v1`

Logged-in storage:

- per-user IndexedDB first.
- DB: `just-do-web-${userId}`
- fallback: `localStorage` key `just-do/web/v1/${userId}`
- wrapped with Supabase remote storage by `createSyncedStorage`.

Mutation queue:

- IndexedDB schema version: `2`
- queue store: `mutations`
- queue item shape:

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

Flush behavior:

- writes are local-first,
- queue flushes to Supabase in `updatedAt` order,
- successful remote write removes the queue item,
- failed remote write leaves local snapshot and queue intact,
- online event triggers a load/flush retry,
- realtime remote changes mirror into local snapshot through `replaceSnapshot`
  without creating new queued mutations.

## Sync UI

Settings -> `동기화` now shows:

- `연결 상태`: `온라인` / `오프라인`
- `저장 상태`: `정상` / `동기화 중` / `대기 중` / `오프라인` / `확인 필요`
- `대기 중인 변경`: pending queue count
- error message and `오류 지우기` when `syncError` exists

## Important Files

```text
docs/next_steps.md
docs/worklog.md
docs/local_dev.md
docs/supabase_cloud_setup.md
docs/widget_sync_strategy.md

apps/web/src/features/just-do/store.tsx
apps/web/src/features/just-do/persistence.ts
apps/web/src/features/just-do/supabase-storage.ts
apps/web/src/features/just-do/supabase-mapping.ts
apps/web/src/features/just-do/home-screen.tsx
apps/web/src/features/just-do/habit-screen.tsx
apps/web/src/features/just-do/settings-screen.tsx
apps/web/src/features/just-do/stats-screen.tsx
apps/web/src/features/just-do/add-sheet.tsx
apps/web/src/features/just-do/tags.ts
apps/web/src/features/just-do/tags.test.ts
apps/web/src/features/just-do/persistence.test.ts

apps/ios/Package.swift
apps/ios/JustDoShared/Domain/JustDoModels.swift
apps/ios/JustDoShared/Sync/MutationQueueSchema.swift
apps/ios/JustDoShared/Storage/CoreDataModel.swift
apps/ios/JustDoShared/Storage/CoreDataStack.swift
apps/ios/JustDoShared/Storage/CoreDataMappers.swift
apps/ios/JustDoShared/Storage/AppGroupWidgetSnapshotStore.swift
apps/ios/JustDoShared/Widgets/JustDoWidgetDisplayModel.swift
apps/ios/JustDoShared/Widgets/JustDoWidgetViews.swift
apps/ios/Tests/JustDoSharedTests/

apps/web/src/lib/auth/useAuth.tsx
apps/web/src/lib/auth/providers.ts
apps/web/src/lib/supabase/client.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/lib/supabase/service-role.ts
apps/web/src/lib/supabase/database.types.ts

supabase/config.toml
supabase/migrations/20260429014750_init_schema.sql
supabase/migrations/20260429021447_add_habit_emoji.sql
supabase/migrations/20260429052000_enable_realtime.sql
supabase/migrations/20260430090000_category_management.sql
supabase/migrations/20260430103000_user_preferences.sql
supabase/scripts/reset_local_app_data.sql
```

## Verification Status

Latest web checks:

```bash
npm --prefix apps/web run lint     # pass
npm --prefix apps/web test         # 76 tests pass
npm --prefix apps/web run build    # pass
git diff --check                   # pass
```

Latest iOS shared-code checks:

```bash
cd apps/ios
swift test                         # 15 tests pass
```

Cloud manual checks already performed by the user/Codex:

- Google login works against hosted Supabase.
- User created a Task and Habit.
- Task completion persisted.
- Habit check persisted to `habit_logs`.
- Realtime-oriented flows were manually checked before Phase 5 work.

## Known Notes / Risks

- `apps/web/.env.local` is gitignored. It contains local machine/cloud keys.
  Never commit it or print secret values.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
  - Allowed helper: `apps/web/src/lib/supabase/service-role.ts`
  - Browser code must use anon key via `apps/web/src/lib/supabase/client.ts`.
- Supabase CLI warnings about local OAuth env refs can appear if
  `apps/web/.env.local` is not sourced before local `supabase start`; hosted
  Console OAuth is separate and already configured.
- `settings` / `view` remain device-local except `settings.weekStart`, which
  syncs through `public.users.preferences.week_start`.
- Habit recurrence is now domain-backed. v1 supports `daily` and `weekly`;
  remote `monthly` is treated defensively as `daily` until v2.
- Task tags are supported in adapter/realtime and the Add/Edit Task sheet has
  a chip input surface.
- Phase 5 queue has the LWW timestamp field and ordered flush path, but it does
  not yet perform remote row `updated_at` conflict comparison. Current practical
  behavior is local-first sequential flush.
- `npm audit` previously reported moderate findings from framework-related deps;
  no forced downgrade was applied.
- Tag UI commits draft tags on Enter / comma / blur. Submit also harvests any
  uncommitted draft so the user does not lose a half-typed tag — keep this
  behavior in mind when iterating on the picker.
- Phase 5.5 domain migration is complete. App code uses
  `Task.categoryId: string | null` and `AppState.categories`; legacy local
  snapshots with `category: "me" | "ext"` are mapped on hydration.
- IndexedDB schema is still at version `2`; categories live inside the
  existing snapshot and queue stores. The queue now supports
  category, preferences, task, habit, and habit log mutations.

## Recommended Next Work

Phase 6 Xcode scaffolding, WidgetKit hosting, Core Data-backed widget snapshot
writer path, Supabase REST read/write sync, app lifecycle sync, Keychain-backed
session storage, native OAuth, widget App Intents, widget queue drain/flush,
deep-link routing, and `NavigationStack` task/habit detail routing are done.
The signed-in native root now has Home / Stats / Settings tabs, a proto-based
calendar home, task/habit add sheet, settings-owned dark mode, and habit/category
management entry points. A launch crash caused by overlapping Core Data sync
writes was fixed by serializing store access through the managed object context
and updating existing mirror rows in place. Current status, test checklist,
deployment notes, and remaining UX gaps are summarized in
`docs/ios_phase6_status.md`.

1. **Manual Offline Sync Verification (cloud, one-time)** ← start here
   - Steps live in `docs/local_dev.md` → "Manual Offline Sync
     Verification". Run once on hosted Supabase before declaring v1
     ready. Independent of the Xcode work above, so it can be done in
     parallel.

2. **Native detail editing**
   - Add edit/delete actions from pushed task/habit detail screens.
   - Reuse the add sheet structure for task edit where practical.

3. **Sync status UI**
   - Add app-facing sync state and queued-write error visibility in Settings or
     a compact root status surface.

4. **Xcode polish (defer until needed)**
   - Trim `JustDoApp` Supported Destinations to iPhone-only for v1.
   - Decide whether to consolidate `JustDoApp.swift` placeholder file
     with `JustDoAppApp.swift` entry point.
   - Configure real iPhone for device testing (resolves the Personal
     Team provisioning warnings).
