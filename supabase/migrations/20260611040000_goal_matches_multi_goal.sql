-- E3 phase 2 correction: match every related goal (drop winner-take-all).
--
-- Winner-take-all was an over-correction for what was actually the old
-- all-tasks fallback bug (now removed on the deployed client). With proper
-- semantic matching, unrelated goals already have negative similarity, so an
-- item only attaches to genuinely related goals. Forcing a single goal wrongly
-- hid items from similar goals (e.g. 축구/클라이밍 counting toward 운동하기 but not
-- 체력 키우기). Restore "match every goal above the threshold" so a task counts
-- toward all related goals. Threshold lowered to 0.04 (recall-leaning, per the
-- user) to catch weak-but-real fitness matches; dedup mean kept for stability.

create or replace function public.goal_semantic_matches(
  p_period_type text,
  p_period_key text,
  p_threshold double precision default 0.04
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
      from public.goals where user_id = auth.uid() and embedding is not null order by title
    ) g
    union all
    select embedding from (
      select distinct on (title) title, embedding
      from public.tasks where user_id = auth.uid() and embedding is not null order by title
    ) t
    union all
    select embedding from (
      select distinct on (title) title, embedding
      from public.habits where user_id = auth.uid() and embedding is not null order by title
    ) h
  ),
  m as (select avg(embedding) as mean from corpus)
  select g.id as goal_id, x.item_type, x.item_id
  from public.goals g
  cross join m
  left join lateral (
    select 'task'::text as item_type, t.id as item_id
    from public.tasks t
    where t.user_id = g.user_id
      and t.embedding is not null
      and m.mean is not null
      and (1 - ((g.embedding - m.mean) <=> (t.embedding - m.mean))) >= p_threshold
    union all
    select 'habit'::text as item_type, h.id as item_id
    from public.habits h
    where h.user_id = g.user_id
      and h.embedding is not null
      and m.mean is not null
      and (1 - ((g.embedding - m.mean) <=> (h.embedding - m.mean))) >= p_threshold
  ) x on true
  where g.user_id = auth.uid()
    and g.period_type = p_period_type
    and g.period_key = p_period_key
    and g.embedding is not null;
$$;

grant execute on function public.goal_semantic_matches(text, text, double precision) to authenticated;
