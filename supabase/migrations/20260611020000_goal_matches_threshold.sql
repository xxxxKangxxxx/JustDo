-- E3 phase 2 tuning: raise the default match threshold to 0.08.
--
-- threshold 0 (above the user's mean) let weak false positives through
-- (월세→책읽기 0.022, 2주년→체력 0.063). On the real data there is a clean gap
-- between the strong-match cluster (>=0.10) and the weak noise (<=0.063), so 0.08
-- drops the false positives. It also drops a couple of weak real matches
-- (산책 0.032, 코엑스 0.060) — precision over recall, per the user's preference.
-- Same winner-take-all body as 20260611010000; only the default changes.

create or replace function public.goal_semantic_matches(
  p_period_type text,
  p_period_key text,
  p_threshold double precision default 0.08
)
returns table (goal_id uuid, item_type text, item_id uuid)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with corpus as (
    select embedding from public.goals  where user_id = auth.uid() and embedding is not null
    union all
    select embedding from public.tasks  where user_id = auth.uid() and embedding is not null
    union all
    select embedding from public.habits where user_id = auth.uid() and embedding is not null
  ),
  m as (select avg(embedding) as mean from corpus),
  period_goals as (
    select id, embedding
    from public.goals
    where user_id = auth.uid()
      and period_type = p_period_type
      and period_key = p_period_key
      and embedding is not null
  ),
  items as (
    select 'task'::text as item_type, id as item_id, embedding
    from public.tasks where user_id = auth.uid() and embedding is not null
    union all
    select 'habit'::text as item_type, id as item_id, embedding
    from public.habits where user_id = auth.uid() and embedding is not null
  ),
  scored as (
    select
      i.item_type,
      i.item_id,
      g.id as goal_id,
      row_number() over (
        partition by i.item_type, i.item_id
        order by (1 - ((g.embedding - m.mean) <=> (i.embedding - m.mean))) desc
      ) as rnk,
      (1 - ((g.embedding - m.mean) <=> (i.embedding - m.mean))) as sim
    from items i
    cross join m
    cross join period_goals g
    where m.mean is not null
  )
  select goal_id, item_type, item_id
  from scored
  where rnk = 1 and sim >= p_threshold
  union all
  select id as goal_id, null::text as item_type, null::uuid as item_id
  from period_goals;
$$;

grant execute on function public.goal_semantic_matches(text, text, double precision) to authenticated;
