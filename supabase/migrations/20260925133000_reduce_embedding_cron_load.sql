-- pg_net 0.20.0 does not flush worker statistics for autovacuum (upstream #254).
-- Keep ordinary VACUUM jobs until the hosted binary includes that fix. These
-- reclaim dead tuples only; they do not delete live HTTP or cron history rows.
-- Skip on local installations where these optional extensions are absent.
do $migration$
declare
  embedding_job record;
  next_command text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;

  if to_regclass('net._http_response') is not null then
    perform cron.schedule(
      'justdo-vacuum-http-responses', '17 * * * *',
      'VACUUM (ANALYZE) net._http_response'
    );
  end if;
  perform cron.schedule(
    'justdo-vacuum-cron-history', '43 18 * * *',
    'VACUUM (ANALYZE) cron.job_run_details'
  );

  select jobid, command into embedding_job
  from cron.job where jobname = 'embed-pending';
  if not found then
    return;
  end if;

  -- Preserve the hosted URL and credentials without copying them into source.
  -- Fail closed if the dashboard-managed job no longer has the audited shape.
  if embedding_job.command !~* '^\s*select\s+net\.http_post\s*\('
     or embedding_job.command !~* '\)\s+as\s+request_id\s*;?\s*$'
     or embedding_job.command ~* 'timeout_milliseconds' then
    raise exception 'Unexpected embed-pending command; review before modifying';
  end if;

  next_command := regexp_replace(
    embedding_job.command,
    'net\.http_post\s*\(',
    'net.http_post(timeout_milliseconds := 30000,',
    'i'
  );
  next_command := regexp_replace(next_command, ';\s*$', '');
  -- Keep the one-minute pickup interval, but avoid three REST reads and an Edge
  -- Function invocation when every row already has its embedding.
  next_command := next_command || $condition$
  where exists (select 1 from public.goals where embedding is null)
     or exists (select 1 from public.tasks where embedding is null)
     or exists (select 1 from public.habits where embedding is null);
  $condition$;

  perform cron.alter_job(embedding_job.jobid, command := next_command);
end;
$migration$;
