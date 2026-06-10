-- E3 phase 2 tuning: mean-centered cosine to remove embedding anisotropy.
--
-- Raw cosine on short titles is compressed into a high band (~0.72-0.91), so a
-- global threshold can't separate related from unrelated. Subtracting the user's
-- mean embedding (whitening) drops unrelated items to ~0/negative while real
-- matches stay clearly positive. threshold 0 = "more similar than this user's
-- average" (recall-leaning, per the 2026-06-11 decision).

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
