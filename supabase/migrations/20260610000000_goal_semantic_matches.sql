-- E3 phase 2: semantic goal-to-item matching via cosine similarity.
--
-- Returns, for each embedded goal in a period, the task/habit ids whose embedding
-- is within the cosine threshold. Embedded goals with no match still appear once
-- (item columns null) so the client can tell "matched nothing semantically" from
-- "goal not embedded yet" (the latter falls back to the E1 token matcher).
--
-- Vectors are L2-normalized, so cosine similarity = 1 - (a <=> b).
-- security invoker + auth.uid() so a user only ever sees their own rows.

create or replace function public.goal_semantic_matches(
  p_period_type text,
  p_period_key text,
  p_threshold double precision default 0.6
)
returns table (goal_id uuid, item_type text, item_id uuid)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select g.id as goal_id, x.item_type, x.item_id
  from public.goals g
  left join lateral (
    select 'task'::text as item_type, t.id as item_id
    from public.tasks t
    where t.user_id = g.user_id
      and t.embedding is not null
      and (1 - (g.embedding <=> t.embedding)) >= p_threshold
    union all
    select 'habit'::text as item_type, h.id as item_id
    from public.habits h
    where h.user_id = g.user_id
      and h.embedding is not null
      and (1 - (g.embedding <=> h.embedding)) >= p_threshold
  ) x on true
  where g.user_id = auth.uid()
    and g.period_type = p_period_type
    and g.period_key = p_period_key
    and g.embedding is not null;
$$;

grant execute on function public.goal_semantic_matches(text, text, double precision) to authenticated;
