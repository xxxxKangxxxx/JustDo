-- E3 phase 2 robustness: de-duplicate the mean corpus (per distinct title).
--
-- mean-centering uses the user's mean embedding, but duplicate/near-duplicate
-- items over-weight the mean and destabilize matching: 3 "클라이밍" tasks pulled
-- the mean toward fitness and dropped 클라이밍↔운동하기 from 0.100 to 0.048 (below
-- the 0.08 threshold), so it stopped counting. Counting each distinct title once
-- makes the mean represent the concept distribution (not activity frequency) and
-- restores stable matching. Same winner-take-all + threshold 0.08 otherwise.

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
    select embedding from (
      select distinct on (title) title, embedding
      from public.goals where user_id = auth.uid() and embedding is not null
      order by title
    ) g
    union all
    select embedding from (
      select distinct on (title) title, embedding
      from public.tasks where user_id = auth.uid() and embedding is not null
      order by title
    ) t
    union all
    select embedding from (
      select distinct on (title) title, embedding
      from public.habits where user_id = auth.uid() and embedding is not null
      order by title
    ) h
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
