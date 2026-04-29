-- Enable Postgres change feeds for the v1 realtime surface.
--
-- Realtime remains an implementation detail behind JustDoStorage.subscribe().
-- `replica identity full` gives DELETE payloads enough old-row data for
-- habit_logs/task_tags to remove a specific date/tag entry in other clients.

alter table public.tasks replica identity full;
alter table public.tags replica identity full;
alter table public.task_tags replica identity full;
alter table public.habits replica identity full;
alter table public.habit_logs replica identity full;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.tags;
alter publication supabase_realtime add table public.task_tags;
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_logs;
