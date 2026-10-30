-- External service integration (first client: get_a_job).
--
-- 1) integration_tokens: per-user API tokens for server-to-server calls.
--    Only the SHA-256 hash is stored. RLS is enabled with no policies, so
--    only the service-role key (server routes) can read or write it.
-- 2) tasks.external_source / external_id: which external item a task came
--    from, so repeated syncs update the same task instead of duplicating it.
--
-- Both changes are additive. Existing clients (web, iOS) ignore the new
-- nullable columns.

create table if not exists public.integration_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  source       text not null check (source ~ '^[a-z0-9_-]{1,40}$'),
  token_hash   text not null unique,
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists idx_integration_tokens_user_id
  on public.integration_tokens(user_id);

alter table public.integration_tokens enable row level security;

alter table public.tasks
  add column if not exists external_source text,
  add column if not exists external_id text;

alter table public.tasks
  drop constraint if exists tasks_external_pair_check,
  add constraint tasks_external_pair_check
    check ((external_source is null) = (external_id is null));

create unique index if not exists idx_tasks_user_external
  on public.tasks(user_id, external_source, external_id)
  where external_source is not null;

comment on column public.tasks.external_source is
  'Integration source that owns this task (e.g. get_a_job). Null for user-created tasks.';
comment on column public.tasks.external_id is
  'Item id in the external source. Unique per (user_id, external_source).';
