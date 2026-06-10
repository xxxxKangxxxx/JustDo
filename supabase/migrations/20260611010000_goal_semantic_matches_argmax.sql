-- E3 phase 2 fix: attribute each item to its single best-matching goal.
--
-- The previous version credited an item to every goal above the threshold, so one
-- task could raise multiple goals' progress at once (e.g. 클라이밍 counting toward
-- both 체력 키우기 and 취업하기). Now each task/habit is credited only to the goal
-- it is MOST similar to in the period (winner-take-all), still gated by the
-- mean-centered threshold. Embedded goals with no item still return a null row so
-- the client distinguishes "matched nothing" from "not embedded yet".

create or replace function public.goal_semantic_matches(
  p_period_type text,
  p_period_key text,
  p_threshold double precision default 0.0
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
  -- each item credited only to its single best-matching goal, above threshold
  select goal_id, item_type, item_id
  from scored
  where rnk = 1 and sim >= p_threshold
  union all
  -- ensure every embedded goal is present (null item) for the no-match vs
  -- not-embedded distinction on the client
  select id as goal_id, null::text as item_type, null::uuid as item_id
  from period_goals;
$$;

grant execute on function public.goal_semantic_matches(text, text, double precision) to authenticated;
