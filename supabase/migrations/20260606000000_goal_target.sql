-- Optional numeric target for quantitative goals (e.g. 책 3권).
-- The progress numerator stays auto-derived from matched completed items; the
-- target only replaces the denominator, so it defines the goal rather than the
-- progress value and does not reintroduce a manipulation lever.

alter table public.goals
  add column target integer;

alter table public.goals
  add constraint goals_target_positive check (target is null or target > 0);
