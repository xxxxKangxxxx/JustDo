-- Goal & Pro Report MVP schema.
--
-- Goals are available to Free / Trial / Pro users. Report detail is gated in
-- application code for Trial / Pro. This migration only stores user-authored
-- goals and per-period prompt dismissals.
--
-- Business data follows the existing backend strategy: FK to public.users(id),
-- not auth.users(id) directly.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  period_type text not null check (period_type in ('monthly', 'yearly')),
  period_key text not null,

  title text not null check (length(btrim(title)) > 0),
  note text,
  sort_order integer not null default 0,

  locked boolean not null default false,
  locked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (period_type = 'monthly' and period_key ~ '^[0-9]{4}-[0-9]{2}$')
    or (period_type = 'yearly' and period_key ~ '^[0-9]{4}$')
  ),
  check ((locked = false and locked_at is null) or (locked = true))
);

create index idx_goals_user_period
  on public.goals(user_id, period_type, period_key, sort_order);

create trigger goals_set_updated_at
  before update on public.goals
  for each row
  execute function public.set_updated_at();

create table public.goal_prompt_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  prompt_type text not null check (prompt_type in ('onboarding', 'monthly', 'yearly')),
  period_key text not null,

  dismissed_permanently_for_period boolean not null default true,
  dismissed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (user_id, prompt_type, period_key),
  check (
    (prompt_type = 'monthly' and period_key ~ '^[0-9]{4}-[0-9]{2}$')
    or (prompt_type = 'yearly' and period_key ~ '^[0-9]{4}$')
    or (prompt_type = 'onboarding' and period_key = 'initial')
  )
);

create index idx_goal_prompt_dismissals_user_prompt
  on public.goal_prompt_dismissals(user_id, prompt_type, period_key);

alter table public.goals enable row level security;
alter table public.goal_prompt_dismissals enable row level security;

-- goals
create policy goals_select_own on public.goals
  for select using (auth.uid() = user_id);
create policy goals_insert_own on public.goals
  for insert with check (auth.uid() = user_id);
create policy goals_update_own on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy goals_delete_own on public.goals
  for delete using (auth.uid() = user_id);

-- goal_prompt_dismissals
create policy goal_prompt_dismissals_select_own on public.goal_prompt_dismissals
  for select using (auth.uid() = user_id);
create policy goal_prompt_dismissals_insert_own on public.goal_prompt_dismissals
  for insert with check (auth.uid() = user_id);
create policy goal_prompt_dismissals_update_own on public.goal_prompt_dismissals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy goal_prompt_dismissals_delete_own on public.goal_prompt_dismissals
  for delete using (auth.uid() = user_id);
