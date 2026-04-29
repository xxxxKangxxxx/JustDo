# Local Development

## Reset Local App Data

Use this only for the local Supabase stack. It deletes local `auth.users`; the
schema cascades that delete to `public.users`, categories, tags, tasks, habits,
habit logs, and subscriptions.

```bash
npm run db:reset-local-app-data
```

After running it:

1. Refresh `http://localhost:3000`.
2. Sign in with Google again.
3. If the browser still shows stale guest/sample data, clear site data for
   `localhost:3000` or run this in the browser console:

```js
localStorage.removeItem("just-do/web/v1");
indexedDB.deleteDatabase("just-do-web");
```

Logged-in cloud/local accounts use a user-scoped IndexedDB database:

```js
indexedDB.deleteDatabase("just-do-web-<user-id>");
localStorage.removeItem("just-do/web/v1/<user-id>");
```

Do not run `supabase/scripts/reset_local_app_data.sql` against hosted Supabase
or any shared database.

## Manual Offline Sync Verification

Use this to confirm the IndexedDB queue → Supabase flush flow on a real
browser. Automated coverage lives in
`apps/web/src/features/just-do/persistence.test.ts`, but this script verifies
that the browser/realtime/Supabase pipeline still behaves end-to-end.

Setup:

1. `npm --prefix apps/web run dev`
2. Open `http://localhost:3000` in Chrome.
3. Sign in with Google so the app uses
   `createSyncedStorage(local, supabase)` instead of guest storage.
4. Open Settings → 동기화. Pending should read `없음`, 저장 상태 `정상`.
5. Open DevTools → Application → IndexedDB → `just-do-web-<user-id>`.
   `mutations` store should be empty.

Offline phase:

6. DevTools → Network → set throttling to `Offline`.
7. Confirm Settings → 동기화 shows `오프라인` and 저장 상태 `오프라인` /
   `확인 필요`.
8. Create one Task on Home. Check one Habit on Habit tab. Toggle Task
   completion.
9. Settings → 동기화 should now show `대기 중인 변경: 3개`. The
   IndexedDB `mutations` store should contain three rows. Supabase
   Console → Table Editor → `tasks` / `habit_logs` should NOT show the
   new rows yet.

Recovery phase:

10. DevTools → Network → restore to `No throttling`.
11. Within ~1s, Settings → 동기화 should return to `온라인` and pending
    drops to `없음`. The IndexedDB `mutations` store empties.
12. Supabase Console refreshes show the new rows. Refresh the browser tab
    and confirm the rows survive (i.e., they came from the cloud, not just
    from local IndexedDB).

If pending stays >0 after recovery:

- Open DevTools → Console. `JustDo storage error:` lines describe the
  remote rejection.
- Most common cause is a failed Supabase RLS check or schema drift; rerun
  `supabase db push` against the hosted project and verify schema matches
  `apps/web/src/lib/supabase/database.types.ts`.
