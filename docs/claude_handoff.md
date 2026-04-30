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

If any step fails, stop and investigate before starting new work — the
last commit (`fbb8589`) was green.

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

## Working Tree State (uncommitted)

Last upstream commit: `e33c907 docs: refresh Claude handoff`.

Today's session left a broad uncommitted feature set in the working tree:

- Phase 5.5 Category Management.
- Phase 5.6 User Preferences Sync.
- Phase 5.7 Habit Recurrence (daily + weekly).
- Supabase migrations:
  - `20260430090000_category_management.sql`
  - `20260430103000_user_preferences.sql`

Suggested commit grouping (next session may split or combine):

1. `feat(web): add dynamic task categories`
2. `feat(web): sync week start preference`
3. `feat(web): add weekly habit recurrence`
4. `docs: refresh schema and implementation handoff`

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
- Phase 6 iOS / Widget — planning kickoff done. `apps/ios/` now contains
  Swift shared domain and mutation queue contracts; `docs/ios_phase6_plan.md`
  defines Core Data, App Group cache, and WidgetKit next steps.

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

## Latest Implementation Commit Trail (pre-uncommitted work)

```text
e33c907 docs: refresh Claude handoff
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
apps/web/src/features/just-do/tags.ts
apps/web/src/features/just-do/tags.test.ts
apps/web/src/features/just-do/persistence.test.ts

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

Latest checks (post Tag UI + offline regression tests):

```bash
npm --prefix apps/web run lint     # pass
npm --prefix apps/web test         # 70 tests pass
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
- `settings` / `view` remain device-local except `settings.weekStart`, which
  syncs through `public.users.preferences.week_start`.
- `Habit.recur_type` is fixed as `'daily'` in adapter inserts.
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
- Phase 5.5 domain migration has started. App code now uses
  `Task.categoryId: string | null` and `AppState.categories`; legacy
  local snapshots with `category: "me" | "ext"` are mapped on hydration.
- `Habit.recur_type` is still `'daily'` hardcoded in the adapter until 5.7
  lands. Do not introduce new code paths that depend on weekly behavior
  before the Phase 5.7 domain change ships.
- IndexedDB schema is still at version `2`; categories live inside the
  existing snapshot and queue stores. The queue now supports
  `category_upsert` / `category_delete` / `preferences_set`.

## Recommended Next Work

The v1 sequence is fixed: 5.5 → 5.6 → 5.7 → Phase 6. Each phase has its
own checklist in `docs/next_steps.md`. Highlights below.

1. **Finish Phase 5.5 — Category Management polish**
   - Hosted and local Supabase both have
     `20260430090000_category_management.sql` applied. Schema checks confirmed
     `categories.position` and `categories.is_default` in both databases.
   - Settings category reorder supports both up/down buttons and drag reorder.
   - `just_do_prd.md` / `just_do_planning.md` fixed me/ext language has been
     updated to custom categories.
   - Manually verify category CRUD + offline queue against hosted Supabase.

2. **Phase 5.7 — Habit Recurrence (daily + weekly, ~2-3d)**
   - Domain: `Habit.recurType: 'daily' | 'weekly'`,
     `Habit.recurDays?: number[]` (0=Sun … 6=Sat).
   - Adapter: drop the hardcoded `'daily'` insert. Persist
     `recur_type` + `recur_days`. Defensive fallback if `'monthly'`
     ever shows up (shouldn't in v1).
   - Add Sheet (habit mode): `매일` / `매주` segment, plus a 7-day
     toggle row when weekly. Require ≥1 day selected.
   - Selectors: `isActiveOn(habit, iso)`. `habitStreak` skips inactive
     weekdays (skip, not break).
   - Habit Screen: `LAST 7 DAYS` grid disables inactive weekday cells.
     `DAILY CHECK` denominator counts only habits active on the
     selected date.
   - Decide whether Add Sheet supports habit *edit* mode (currently
     only task edit). Treat that as a sub-task here.
   - Update PRD / planning to mark monthly + `recur_end_date` as v2.

4. **Manual Offline Sync Verification (cloud, one-time)**
   - Steps live in `docs/local_dev.md` → "Manual Offline Sync
     Verification". Run once on hosted Supabase before declaring v1
     ready.

5. **Phase 6 — iOS / Widget (after 5.5/5.6/5.7)**
   - `apps/ios/` exists.
   - Swift Codable mirrors live in
     `apps/ios/JustDoShared/Domain/JustDoModels.swift`.
   - Drift fixture tests live in `apps/ios/Tests/JustDoSharedTests` and verify
     web-shaped snapshot, queue, and widget JSON.
   - Queue event names are mirrored in
     `apps/ios/JustDoShared/Sync/MutationQueueSchema.swift`.
   - Initial Core Data model and mappers live in
     `apps/ios/JustDoShared/Storage`.
   - App Group widget snapshot read/write store lives in
     `AppGroupWidgetSnapshotStore`.
   - Core Data / App Group split is documented in `docs/ios_phase6_plan.md`.
   - Implement WidgetKit small / medium / large widgets from
     `reference/screens/widgets.jsx`.
