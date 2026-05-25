-- Fix new-user signup failure caused by `handle_new_auth_user()` trigger.
--
-- The trigger seeds two default categories with
--   `on conflict (user_id, name) do nothing`
-- but `public.categories` never had a matching unique index on
-- `(user_id, name)`. PostgreSQL rejects the ON CONFLICT inference with
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- which propagates as Supabase "Database error saving new user" and bounces
-- the OAuth callback back to the login page with `error=server_error`.
--
-- Adding the missing unique index restores ON CONFLICT semantics and makes
-- the seed insert idempotent on retried signups.
--
-- Pre-flight on hosted Supabase before applying:
--   select user_id, name, count(*)
--   from public.categories
--   group by 1, 2
--   having count(*) > 1;
-- If the query returns any rows, resolve duplicates first; otherwise the
-- index creation below will fail.

create unique index if not exists idx_categories_user_id_name
  on public.categories(user_id, name);
