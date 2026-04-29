# Handoff (Codex -> Claude Code)

Date: 2026-04-29
Branch: `main`
Remote: `origin` -> `https://github.com/xxxxKangxxxx/JustDo.git`
Current app implementation commit before this documentation handoff:
`6ca542e feat(web): show sync status`

This handoff is written so Claude Code can continue without replaying the chat.
Chronological detail lives in `docs/worklog.md`; planned work lives in
`docs/next_steps.md`.

## Current Status

- Phase 1 Repository Baseline — done.
- Phase 2 Web App Bootstrap — done.
- Phase 3 Local Data Layer — done.
- Phase 4 Supabase Integration — done.
  - Schema/migrations, RLS, hosted cloud link, auth, storage adapter, realtime,
    service-role boundary, and production bundle key scan are complete.
- Phase 5 Offline Sync — done.
  - IndexedDB local cache, mutation queue, Supabase queue flush, and sync status
    UI are complete.
- Phase 6 iOS / Widget Planning — strategy docs exist; implementation has not
  started.

## Latest Implementation Commit Trail

```text
6ca542e feat(web): show sync status
6f2a24c feat(web): flush offline queue to supabase
8b993c5 feat(web): add local mutation queue
c35e409 feat(web): add indexeddb storage adapter
45416e5 refactor(web): move stats into settings
ad09afd feat(web): split habits into dedicated tab
ade38a1 fix(web): polish habit calendar and date range
83f41cb chore(web): guard Supabase service role usage
e879ce6 docs: add Supabase cloud setup notes
90a1aed feat(web): add auth and realtime sync
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

Realtime publication includes:

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
    | { type: "task_upsert"; task: Task }
    | { type: "task_delete"; id: string }
    | { type: "habit_upsert"; habit: Habit }
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
supabase/scripts/reset_local_app_data.sql
```

## Verification Status

Latest checks run by Codex:

```bash
npm --prefix apps/web run lint     # pass
npm --prefix apps/web test         # 62 tests pass
npm --prefix apps/web run build    # pass
git diff --check                   # pass
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
- `settings` / `view` remain device-local. Supabase remote storage intentionally
  treats them as no-op/defaults.
- `Habit.recur_type` is fixed as `'daily'` in adapter inserts.
- Task tags are supported in adapter/realtime, but the UI still has no tag
  input/editing surface.
- Phase 5 queue has the LWW timestamp field and ordered flush path, but it does
  not yet perform remote row `updated_at` conflict comparison. Current practical
  behavior is local-first sequential flush.
- `npm audit` previously reported moderate findings from framework-related deps;
  no forced downgrade was applied.

## Recommended Next Work

1. **Manual Offline Sync Verification**
   - In Chrome DevTools, set Network to Offline.
   - While signed in, create/complete a Task and check a Habit.
   - Confirm Settings -> 동기화 shows offline / pending changes.
   - Restore network.
   - Confirm pending count returns to 0 and Supabase Console shows rows.

2. **Task Tag UI**
   - Add tag input/editing to Add/Edit Task sheet.
   - Verify tags round-trip through `tags` / `task_tags`.
   - Verify two-tab realtime for tag name/removal behavior.

3. **Date / Time Input Polish**
   - Current MVP still uses browser-native `input type="date"` and
     `input type="time"`.
   - If product direction wants a branded mobile picker, design it as a
     focused UX task.

4. **Phase 6 iOS / Widget**
   - Create `apps/ios/` when ready.
   - Mirror queue event names from `docs/widget_sync_strategy.md`.
   - Decide App Group cache shape and Core Data/App Group split.
   - Implement WidgetKit small/medium/large widgets from
     `reference/screens/widgets.jsx`.
