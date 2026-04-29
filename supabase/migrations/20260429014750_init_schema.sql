-- Just Do — Initial schema
-- Source of truth: docs/just_do_db_schema.md
-- Strategy: docs/backend_strategy.md (Supabase first, self-host later)
--
-- Notes:
-- * Business tables FK to `public.users(id)` only. `auth.users` is referenced
--   solely from `public.users` so a future migration can swap auth providers
--   without rewriting every FK.
-- * RLS is the defense-in-depth layer; the app must still go through the
--   data adapter and never call Supabase directly from components.
-- * `updated_at` is maintained by a trigger so Last-Write-Wins sync stays
--   honest even if a client forgets to bump the column.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Users
-- ---------------------------------------------------------------------------

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Categories / Tags
-- ---------------------------------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  color      text not null,
  created_at timestamptz not null default now()
);

create index idx_categories_user_id on public.categories(user_id);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_tags_user_id on public.tags(user_id);

-- ---------------------------------------------------------------------------
-- 4. Tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,

  title           text not null,
  memo            text,
  priority        text check (priority in ('high', 'medium', 'low')),

  start_date      date,
  end_date        date,
  scheduled_time  time,

  is_completed    boolean not null default false,
  completed_at    timestamptz,

  is_recurring    boolean not null default false,
  recur_type      text check (recur_type in ('daily', 'weekly', 'monthly')),
  recur_days      int[],
  recur_end_date  date,

  reminder_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (
    (start_date is null and end_date is null)
    or (start_date is not null and end_date is not null and end_date >= start_date)
  )
);

create index idx_tasks_user_id    on public.tasks(user_id);
create index idx_tasks_start_date on public.tasks(start_date);
create index idx_tasks_end_date   on public.tasks(end_date);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Subtasks / Task dependencies / Task tags
-- ---------------------------------------------------------------------------

create table public.subtasks (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  title        text not null,
  is_completed boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_subtasks_task_id on public.subtasks(task_id);

create trigger subtasks_set_updated_at
  before update on public.subtasks
  for each row
  execute function public.set_updated_at();

create table public.task_dependencies (
  id           uuid primary key default gen_random_uuid(),
  prev_task_id uuid not null references public.tasks(id) on delete cascade,
  next_task_id uuid not null references public.tasks(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (prev_task_id, next_task_id),
  check (prev_task_id != next_task_id)
);

create index idx_task_dependencies_prev on public.task_dependencies(prev_task_id);
create index idx_task_dependencies_next on public.task_dependencies(next_task_id);

create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create index idx_task_tags_tag_id on public.task_tags(tag_id);

-- ---------------------------------------------------------------------------
-- 6. Habits / Habit logs / Habit tags
-- ---------------------------------------------------------------------------

create table public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete set null,

  title        text not null,
  goal         text,

  recur_type   text not null check (recur_type in ('daily', 'weekly', 'monthly')),
  recur_days   int[],

  reminder_at  time,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_habits_user_id on public.habits(user_id);

create trigger habits_set_updated_at
  before update on public.habits
  for each row
  execute function public.set_updated_at();

create table public.habit_logs (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid not null references public.habits(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  log_date     date not null,
  is_completed boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index idx_habit_logs_user_id  on public.habit_logs(user_id);
create index idx_habit_logs_habit_id on public.habit_logs(habit_id);
create index idx_habit_logs_date     on public.habit_logs(log_date);

create trigger habit_logs_set_updated_at
  before update on public.habit_logs
  for each row
  execute function public.set_updated_at();

create table public.habit_tags (
  habit_id uuid not null references public.habits(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (habit_id, tag_id)
);

create index idx_habit_tags_tag_id on public.habit_tags(tag_id);

-- ---------------------------------------------------------------------------
-- 7. Subscription plans
-- ---------------------------------------------------------------------------

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.plans (name, description) values
  ('free', '기본 무료 플랜'),
  ('pro',  '전체 기능 이용 가능');

create table public.user_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.users(id) on delete cascade,
  plan_name       text not null default 'free',
  status          text not null default 'trial'
                  check (status in ('trial', 'active', 'expired', 'cancelled')),

  trial_start_at  timestamptz not null default now(),
  trial_end_at    timestamptz not null default (now() + interval '30 days'),

  subscribed_at   timestamptz,
  expires_at      timestamptz,

  reminded_7d     boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_user_subscriptions_status on public.user_subscriptions(status);

create trigger user_subscriptions_set_updated_at
  before update on public.user_subscriptions
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Auth handoff: provision public.users / categories / subscription on signup
-- ---------------------------------------------------------------------------

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
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color)
  values
    (new.id, '나',  '#4A90E2'),
    (new.id, '외부', '#E2574A');

  insert into public.user_subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users               enable row level security;
alter table public.categories          enable row level security;
alter table public.tags                enable row level security;
alter table public.tasks               enable row level security;
alter table public.subtasks            enable row level security;
alter table public.task_dependencies   enable row level security;
alter table public.task_tags           enable row level security;
alter table public.habits              enable row level security;
alter table public.habit_logs          enable row level security;
alter table public.habit_tags          enable row level security;
alter table public.user_subscriptions  enable row level security;
alter table public.plans               enable row level security;

-- users
create policy users_select_self on public.users
  for select using (auth.uid() = id);
create policy users_update_self on public.users
  for update using (auth.uid() = id);

-- categories
create policy categories_select_own on public.categories
  for select using (auth.uid() = user_id);
create policy categories_insert_own on public.categories
  for insert with check (auth.uid() = user_id);
create policy categories_update_own on public.categories
  for update using (auth.uid() = user_id);
create policy categories_delete_own on public.categories
  for delete using (auth.uid() = user_id);

-- tags
create policy tags_select_own on public.tags
  for select using (auth.uid() = user_id);
create policy tags_insert_own on public.tags
  for insert with check (auth.uid() = user_id);
create policy tags_update_own on public.tags
  for update using (auth.uid() = user_id);
create policy tags_delete_own on public.tags
  for delete using (auth.uid() = user_id);

-- tasks
create policy tasks_select_own on public.tasks
  for select using (auth.uid() = user_id);
create policy tasks_insert_own on public.tasks
  for insert with check (auth.uid() = user_id);
create policy tasks_update_own on public.tasks
  for update using (auth.uid() = user_id);
create policy tasks_delete_own on public.tasks
  for delete using (auth.uid() = user_id);

-- subtasks (own through tasks)
create policy subtasks_select_own on public.subtasks
  for select using (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid())
  );
create policy subtasks_insert_own on public.subtasks
  for insert with check (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid())
  );
create policy subtasks_update_own on public.subtasks
  for update using (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid())
  );
create policy subtasks_delete_own on public.subtasks
  for delete using (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid())
  );

-- task_dependencies (both endpoints must belong to caller)
create policy task_dependencies_select_own on public.task_dependencies
  for select using (
    exists (select 1 from public.tasks t where t.id = task_dependencies.prev_task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_dependencies.next_task_id and t.user_id = auth.uid())
  );
create policy task_dependencies_insert_own on public.task_dependencies
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_dependencies.prev_task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_dependencies.next_task_id and t.user_id = auth.uid())
  );
create policy task_dependencies_delete_own on public.task_dependencies
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_dependencies.prev_task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_dependencies.next_task_id and t.user_id = auth.uid())
  );

-- task_tags (own through tasks AND tags)
create policy task_tags_select_own on public.task_tags
  for select using (
    exists (select 1 from public.tasks t where t.id = task_tags.task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = task_tags.tag_id and g.user_id = auth.uid())
  );
create policy task_tags_insert_own on public.task_tags
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_tags.task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = task_tags.tag_id and g.user_id = auth.uid())
  );
create policy task_tags_delete_own on public.task_tags
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_tags.task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = task_tags.tag_id and g.user_id = auth.uid())
  );

-- habits
create policy habits_select_own on public.habits
  for select using (auth.uid() = user_id);
create policy habits_insert_own on public.habits
  for insert with check (auth.uid() = user_id);
create policy habits_update_own on public.habits
  for update using (auth.uid() = user_id);
create policy habits_delete_own on public.habits
  for delete using (auth.uid() = user_id);

-- habit_logs (user_id is denormalized so the policy is direct)
create policy habit_logs_select_own on public.habit_logs
  for select using (auth.uid() = user_id);
create policy habit_logs_insert_own on public.habit_logs
  for insert with check (auth.uid() = user_id);
create policy habit_logs_update_own on public.habit_logs
  for update using (auth.uid() = user_id);
create policy habit_logs_delete_own on public.habit_logs
  for delete using (auth.uid() = user_id);

-- habit_tags
create policy habit_tags_select_own on public.habit_tags
  for select using (
    exists (select 1 from public.habits h where h.id = habit_tags.habit_id and h.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = habit_tags.tag_id and g.user_id = auth.uid())
  );
create policy habit_tags_insert_own on public.habit_tags
  for insert with check (
    exists (select 1 from public.habits h where h.id = habit_tags.habit_id and h.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = habit_tags.tag_id and g.user_id = auth.uid())
  );
create policy habit_tags_delete_own on public.habit_tags
  for delete using (
    exists (select 1 from public.habits h where h.id = habit_tags.habit_id and h.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = habit_tags.tag_id and g.user_id = auth.uid())
  );

-- user_subscriptions (read own; writes happen via service role / Edge Function)
create policy user_subscriptions_select_own on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- plans (read-only catalog visible to authenticated users)
create policy plans_select_all on public.plans
  for select using (auth.role() = 'authenticated');
