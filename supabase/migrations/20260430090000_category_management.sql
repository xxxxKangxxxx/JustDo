alter table public.categories
  add column if not exists position int not null default 0,
  add column if not exists is_default boolean not null default false;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by
        case name when '나' then 0 when '외부' then 1 else 2 end,
        created_at,
        id
    ) - 1 as next_position
  from public.categories
)
update public.categories c
set
  position = ranked.next_position,
  is_default = c.name in ('나', '외부')
from ranked
where ranked.id = c.id;

create index if not exists idx_categories_user_position
  on public.categories(user_id, position);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color, position, is_default)
  values
    (new.id, '나', '#4F6FD8', 0, true),
    (new.id, '외부', '#D36A3A', 1, true)
  on conflict (user_id, name) do nothing;

  insert into public.user_subscriptions (user_id, plan, status, started_at, expires_at)
  values (new.id, 'trial', 'active', now(), now() + interval '14 days')
  on conflict do nothing;

  return new;
end;
$$;

alter table public.categories replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;
