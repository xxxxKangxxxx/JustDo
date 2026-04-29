# Handoff (Codex -> Claude Code)

Date: 2026-04-29
Direction: 다음 작업을 Claude Code가 이어받는다.

## Repository State

- Branch: `main`
- Remote: `origin` -> `https://github.com/xxxxKangxxxx/JustDo.git`
- Last known remote commit before this handoff work: `565d6f3 docs: prep Codex handoff with updated Phase 4 plan and schema notes`
- This handoff includes a large Phase 4-3 / 4-4 implementation set. See `docs/worklog.md` for chronological details.

## Phase Progress

- Phase 1 Repository Baseline — done
- Phase 2 Web App Bootstrap — done
- Phase 3 Local Data Layer — done
- Phase 4-1 Schema / Migrations — done
- Phase 4-2 Client / Adapter — done
- Phase 4-3 Auth — done
- Phase 4-4 Realtime — done
- Phase 4-5 Env / Security — partially done
  - `.env.local.example` exists and separates public/client env from server-only service role.
  - Service-role client bundle audit is still pending.
- Phase 5 Offline Sync — pending
- Phase 6 iOS / Widget Planning — started as strategy docs, implementation pending

## What Codex Completed

### Phase 4-3 Auth

- Added `@supabase/ssr`.
- Changed `apps/web/src/lib/supabase/client.ts` to use `createBrowserClient`.
- Added `apps/web/src/lib/supabase/server.ts` for cookie-aware server client usage.
- Added `apps/web/src/lib/auth/useAuth.tsx`.
  - Exposes only domain auth state: `user`, `status`, `error`, `signInWithProvider`, `signOut`.
  - Keeps Supabase session/token objects inside the auth layer.
- Added OAuth callback route:
  - Source: `apps/web/src/app/(auth)/callback/route.ts`
  - Actual URL: `/callback` because `(auth)` is a route group.
- Added `apps/web/src/lib/auth/providers.ts`.
  - Google enabled by default.
  - Apple disabled unless `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true`.
- Updated Settings account UI:
  - Auth status: `확인 중` / `로그인됨` / `게스트`.
  - Real profile name/email from auth metadata.
  - Auth error message display.
  - Google login active; Apple shown as disabled/준비 중 by default.
- Updated `supabase/config.toml` for Google/Apple OAuth env references and callback redirect URLs.
- Updated `apps/web/.env.local.example` with OAuth provider credentials and client-visible provider switches.

### Storage Selection / Persistence Stability

- `JustDoProvider` now accepts `userId`.
  - Signed-in: `createSupabaseStorage(getSupabaseClient(), userId)`.
  - Guest: localStorage adapter.
- New task/habit IDs now use full `crypto.randomUUID()` for Supabase UUID compatibility.
- Store mutation handlers no longer call persistence inside `setState` updater functions.
  - This fixes React dev/StrictMode duplicate remote writes.
- Added store-level `syncError` and `clearSyncError`.
  - Hydrate and persistence failures are surfaced in Settings -> 동기화.
  - Dev mode logs storage failures with `console.error`.

### Task Tags

- Supabase load now selects `tasks` with `categories(name), task_tags(tags(name))`.
- `taskRowToDomain` accepts joined tags.
- `upsertTask` now:
  - normalizes tag names,
  - lookup-or-creates rows in `tags`,
  - replaces `task_tags` mappings by adding missing links and deleting stale ones.

### Local OAuth Verification

- User created a JustDo Google OAuth client in Google Cloud Console.
- `.env.local` contains local Google OAuth credentials.
- Local Supabase must be restarted with env loaded for Auth to see those values:

```bash
set -a
source apps/web/.env.local
set +a
supabase stop
supabase start
```

- Google login was verified locally.
- Signup fanout verified in local DB:
  - `auth.users`
  - `public.users`
  - default categories `나` / `외부`
  - `user_subscriptions` trial row

### Local Dev Reset Procedure

- Added `supabase/scripts/reset_local_app_data.sql`.
  - Deletes local `auth.users`.
  - Cascades through `public.users`, categories, tags, tasks, habits, logs, subscriptions.
  - Prints before/after counts.
- Added root script:

```bash
npm run db:reset-local-app-data
```

- Added `docs/local_dev.md`.
- Updated `README.md` with local Supabase and reset notes.
- The reset script is local-dev only. Do not run it against hosted/shared DBs.

### Phase 4-4 Realtime

- Added migration `supabase/migrations/20260429052000_enable_realtime.sql`.
  - `replica identity full` for `tasks`, `tags`, `task_tags`, `habits`, `habit_logs`.
  - Adds those tables to `supabase_realtime` publication.
- Extended `JustDoStorage` with optional `subscribe(callback)`.
- Added `RemoteChange` domain event type:
  - `task_upserted`
  - `task_deleted`
  - `habit_upserted`
  - `habit_deleted`
  - `habit_log_set`
  - `error`
- Memory/localStorage adapters return no-op unsubscribe.
- Supabase adapter subscribes to:
  - `tasks`
  - `tags`
  - `task_tags`
  - `habits`
  - `habit_logs`
- Store applies remote events to local React state.
- Realtime subscription errors flow into `syncError`.
- For tag-related changes:
  - `task_tags` change reloads the affected task with joined tags.
  - `tags` update/delete reloads connected tasks.
  - task INSERT/UPDATE also reloads joined task data, avoiding tag loss.

### Widget Sync Strategy

- Added `docs/widget_sync_strategy.md`.
- Key decision:
  - iOS widgets are short-lived write clients, not passive views.
  - Widget tap -> App Intent -> shared iOS data layer / sync client -> Supabase write.
  - Open web/iOS clients receive Realtime updates.
  - Closed clients catch up on next load/sync.
- WidgetKit is not treated as a long-running Realtime subscriber.
- Strategy calls for App Group cache + mutation queue.
- Updated:
  - `docs/just_do_planning.md`
  - `docs/just_do_prd.md`
  - `docs/next_steps.md`
  - `docs/worklog.md`

## Important Files

```text
docs/backend_strategy.md
docs/next_steps.md
docs/worklog.md
docs/local_dev.md
docs/widget_sync_strategy.md
docs/just_do_prd.md
docs/just_do_planning.md

supabase/config.toml
supabase/migrations/20260429014750_init_schema.sql
supabase/migrations/20260429021447_add_habit_emoji.sql
supabase/migrations/20260429052000_enable_realtime.sql
supabase/scripts/reset_local_app_data.sql

apps/web/src/lib/auth/useAuth.tsx
apps/web/src/lib/auth/providers.ts
apps/web/src/lib/supabase/client.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/features/just-do/persistence.ts
apps/web/src/features/just-do/store.tsx
apps/web/src/features/just-do/supabase-mapping.ts
apps/web/src/features/just-do/supabase-storage.ts
apps/web/src/features/just-do/settings-screen.tsx
apps/web/.env.local.example
```

## Verification Status

Latest local checks run by Codex:

```bash
npm --prefix apps/web run lint     # pass
npm --prefix apps/web test         # 55 tests pass
npm --prefix apps/web run build    # pass
git diff --check                   # pass
```

Supabase local verification:

- `supabase migration up` applied the Realtime migration.
- `pg_publication_tables` confirmed:
  - `tasks`
  - `tags`
  - `task_tags`
  - `habits`
  - `habit_logs`

Note: because `20260429052000_enable_realtime.sql` was edited after its first local application, Codex manually applied the `tags` / `task_tags` publication additions to the currently running local DB with `supabase db query`. A fresh `supabase db reset` should replay the final migration file cleanly.

## Known Notes

- `apps/web/.env.local` is gitignored and contains machine-local Supabase/Google OAuth values.
- Supabase CLI does not automatically read `apps/web/.env.local`; source it before `supabase start` when OAuth provider env needs to be loaded.
- Apple OAuth is intentionally disabled in client UI unless `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true`.
- `settings` / `view` remote persistence is still unresolved. Supabase adapter keeps those as no-op/defaults.
- `Habit.recur_type` is still fixed to `'daily'` in adapter inserts.
- `Task.tags` has adapter/realtime support, but the current add/edit UI still does not expose tag entry.
- `npm audit` still reports the previous moderate findings from Next/PostCSS-related deps; no forced downgrade was applied.

## Recommended Next Work

1. **Phase 4-5 Env / Security**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is not reachable from the client bundle/import graph.
   - Consider adding explicit server-only module boundaries before any service-role use.
2. **Realtime manual browser test**
   - Open two tabs logged into the same account.
   - Create/update/delete task in one tab and confirm the other tab updates.
   - Check habit log toggle across tabs.
   - Once tag UI exists, confirm tag mapping realtime.
3. **Tag UI**
   - Add tag input/editing to add/edit task sheet.
   - Then verify `tags` / `task_tags` realtime in real UI.
4. **iOS / Widget planning**
   - Decide App Group cache shape.
   - Define mutation queue schema for WidgetKit/offline writes.
   - Decide whether App Intent directly attempts network writes or queue-first.
5. **Phase 5 Offline Sync**
   - IndexedDB adapter for web.
   - Local mutation queue.
   - Last Write Wins sync policy based on timestamps.
