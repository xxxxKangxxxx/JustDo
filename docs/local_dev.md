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
```

Do not run `supabase/scripts/reset_local_app_data.sql` against hosted Supabase
or any shared database.
