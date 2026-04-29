# Supabase Cloud Setup

This document tracks the hosted Supabase project used for Just Do development.

## Project

- Supabase project name: `JustDo`
- Project ref: `cohkxnwsbhrsfmsjqdpa`
- Project URL: `https://cohkxnwsbhrsfmsjqdpa.supabase.co`
- Region: Northeast Asia (Seoul)

## Completed

The local workspace has been linked to the hosted project:

```bash
supabase link --project-ref cohkxnwsbhrsfmsjqdpa
```

Migrations have been pushed to the hosted database:

```bash
supabase db push
```

Applied migrations:

- `20260429014750_init_schema.sql`
- `20260429021447_add_habit_emoji.sql`
- `20260429052000_enable_realtime.sql`

Hosted DB checks passed:

- Public tables exist: `users`, `categories`, `tags`, `tasks`, `subtasks`,
  `task_dependencies`, `task_tags`, `habits`, `habit_logs`, `habit_tags`,
  `plans`, `user_subscriptions`.
- Realtime publication includes: `tasks`, `tags`, `task_tags`, `habits`,
  `habit_logs`.
- `apps/web/src/lib/supabase/database.types.ts` was regenerated from the linked
  hosted project.

## Local Vs Cloud Environment

`apps/web/.env.local` is intentionally gitignored. It can point either to local
Supabase or the hosted project.

Local Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase status -o env>
```

Cloud Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://cohkxnwsbhrsfmsjqdpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/public key from Supabase Console -> Project Settings -> API>
```

Do not commit real keys. If switching between local and cloud often, keep
private copies such as:

- `apps/web/.env.local.local`
- `apps/web/.env.local.cloud`

and copy the desired one to `apps/web/.env.local`.

## Google OAuth Console Setup

The hosted Supabase project needs Google provider settings in the Supabase
Dashboard:

1. Open Supabase Console -> JustDo -> Authentication -> Providers -> Google.
2. Enable Google.
3. Set the JustDo Google OAuth Client ID / Secret.
4. In Google Cloud Console, ensure Authorized redirect URIs include:

```text
https://cohkxnwsbhrsfmsjqdpa.supabase.co/auth/v1/callback
```

Keep local redirect URIs too if local Supabase is still used:

```text
http://127.0.0.1:54321/auth/v1/callback
http://localhost:54321/auth/v1/callback
```

For local app callback redirects, `supabase/config.toml` already includes:

```text
http://127.0.0.1:3000/callback
http://localhost:3000/callback
```

For hosted deployments, add the production app callback URL in Supabase Auth URL
Configuration once the web app has a deployed domain.

## Verifying Hosted Auth Fanout

After `.env.local` points to cloud and Google provider is configured:

1. Restart the web dev server.
2. Sign in with Google from `http://localhost:3000`.
3. Confirm in Supabase Console:
   - Authentication -> Users contains the new account.
   - Table Editor -> `public.users` has a matching row.
   - `public.categories` has default `나` / `외부` rows.
   - `public.user_subscriptions` has a `trial` row.

Useful SQL in Supabase SQL Editor:

```sql
select u.id, u.email, p.display_name, p.avatar_url, p.created_at
from auth.users u
left join public.users p on p.id = u.id
order by u.created_at desc
limit 5;

select c.user_id, u.email, c.name, c.color, c.created_at
from public.categories c
left join auth.users u on u.id = c.user_id
order by c.created_at desc, c.name;

select s.user_id, u.email, s.plan_name, s.status, s.trial_start_at, s.trial_end_at
from public.user_subscriptions s
left join auth.users u on u.id = s.user_id
order by s.created_at desc;
```

## CLI Notes

Supabase link metadata lives under `supabase/.temp/` and is gitignored. A new
machine should run:

```bash
supabase login
supabase link --project-ref cohkxnwsbhrsfmsjqdpa
```

To compare migration state:

```bash
supabase migration list
```

To regenerate types from hosted Supabase:

```bash
supabase gen types typescript --linked > apps/web/src/lib/supabase/database.types.ts
```

## Remaining

- Configure Google provider in the hosted Supabase Console.
- Switch `apps/web/.env.local` to hosted URL/key when testing against cloud.
- Run hosted Google login and signup fanout verification.
- Decide whether to add separate npm scripts or documentation helpers for
  switching local/cloud env files.
