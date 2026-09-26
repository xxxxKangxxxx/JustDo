-- Read-only production diagnostics. Never select cron.job.command: it may
-- contain the existing invocation credential.
-- Run: supabase db query --linked --file supabase/scripts/check_background_jobs.sql
select jsonb_build_object(
  'checked_at', now(),
  'jobs', (
    select jsonb_agg(jsonb_build_object(
      'name', jobname, 'schedule', schedule, 'active', active,
      'timeout_30s', position('timeout_milliseconds := 30000' in command) > 0,
      'pending_gate', position('where exists' in command) > 0
    )) from cron.job
  ),
  'runs_24h', (
    select jsonb_agg(summary) from (
      select j.jobname, r.status, count(*) as runs,
        min(r.start_time) as first_run, max(r.start_time) as last_run
      from cron.job_run_details r join cron.job j using (jobid)
      where r.start_time > now() - interval '24 hours'
      group by j.jobname, r.status
    ) summary
  ),
  'http_responses_retained', (
    select jsonb_agg(summary) from (
      select status_code, timed_out, count(*) as responses,
        min(created) as first_response, max(created) as last_response
      from net._http_response group by status_code, timed_out
    ) summary
  ),
  'vacuum', (
    select jsonb_agg(summary) from (
      select schemaname, relname, n_live_tup, n_dead_tup,
        last_vacuum, last_autovacuum, last_analyze,
        pg_size_pretty(pg_total_relation_size(relid)) as allocated_size
      from pg_stat_user_tables
      where (schemaname = 'net' and relname = '_http_response')
         or (schemaname = 'cron' and relname = 'job_run_details')
    ) summary
  ),
  'pending_embeddings', jsonb_build_object(
    'goals', (select count(*) from public.goals where embedding is null),
    'tasks', (select count(*) from public.tasks where embedding is null),
    'habits', (select count(*) from public.habits where embedding is null)
  )
);
