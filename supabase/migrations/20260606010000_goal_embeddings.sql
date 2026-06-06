-- E3 semantic goal matching, phase 1: embedding storage + invalidation.
--
-- Adds a pgvector column to the rows we match against a goal. Embeddings are
-- computed server-side (the `embed-pending` Edge Function) once per text, so the
-- vectors live only in the DB and both web and iOS read the same matches through
-- a later RPC. A BEFORE UPDATE trigger nulls the embedding when the embedded text
-- changes, and the sweep re-embeds anything that is null.

create extension if not exists vector with schema extensions;

-- gemini-embedding-001 at outputDimensionality = 768 (L2-normalized by the
-- Edge Function so cosine distance is meaningful).
alter table public.goals add column if not exists embedding extensions.vector(768);
alter table public.tasks add column if not exists embedding extensions.vector(768);
alter table public.habits add column if not exists embedding extensions.vector(768);

-- Goals embed title + note; tasks and habits embed the title only.
create or replace function public.reset_goal_embedding()
returns trigger language plpgsql as $$
begin
  if new.title is distinct from old.title or new.note is distinct from old.note then
    new.embedding := null;
  end if;
  return new;
end;
$$;

create or replace function public.reset_title_embedding()
returns trigger language plpgsql as $$
begin
  if new.title is distinct from old.title then
    new.embedding := null;
  end if;
  return new;
end;
$$;

drop trigger if exists goals_reset_embedding on public.goals;
create trigger goals_reset_embedding
  before update on public.goals
  for each row execute function public.reset_goal_embedding();

drop trigger if exists tasks_reset_embedding on public.tasks;
create trigger tasks_reset_embedding
  before update on public.tasks
  for each row execute function public.reset_title_embedding();

drop trigger if exists habits_reset_embedding on public.habits;
create trigger habits_reset_embedding
  before update on public.habits
  for each row execute function public.reset_title_embedding();
