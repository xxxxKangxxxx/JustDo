# Supabase timeout investigation — 2026-09-25

Project: `cohkxnwsbhrsfmsjqdpa` (JustDo). All timestamps below are UTC;
add nine hours for Korea time. Production mitigation applied at approximately
13:28 (22:28 KST). No application rows or retained log rows were deleted.

## Evidence before mitigation

- All 19 pre-existing repository migrations matched production.
- At 13:21, the preceding 24 hours contained 405 failed `embed-pending` cron
  runs, all `job startup timeout`. Their interval was September 24 20:36 through
  September 25 03:48. The last startup failure therefore preceded this repair;
  a successful run immediately after repair alone cannot prove it is resolved.
- The six-hour pg_net response window contained 346 HTTP 200 responses and
  14 client timeouts at the default 5,000 ms. A cron `succeeded` record only
  means the HTTP request was enqueued, not that the function succeeded.
- Management API logs also showed repeated PostgREST `Warp server error:
  Thread killed by timeout manager`, 34 Postgres statement timeouts, and Auth
  refresh failures (504 and a 500 with a localhost database connection timeout).
  Of the 34 statements, 31 were monitoring queries, not application queries.
  Edge Function responses included 500, 504, and 546. These observations show
  service-wide symptoms, not just a failing application SQL statement.
- Database size was 213 MB. `net._http_response` used 91 MB for just 360 live
  records; its last autovacuum was August 5. `cron.job_run_details` occupied
  105 MB for 153,954 records and had no vacuum/analyze statistics.
- The HTTP expiry query's index returned 71,747 dead entries and touched
  10,381 shared buffers to return zero expired live rows. Cumulative statement
  statistics attributed 205,212,203.6 ms to this cleanup query, far above the
  next query. These statistics span a long period, not only the incident day.
- No deadlocks were recorded. The current connection count was below the
  configured limit (60); this does not rule out historical connection pressure.

## Diagnosis and limits

The missing vacuum of pg_net's response table is a demonstrated database
maintenance problem and a plausible contributor to the service-wide timeouts.
The installed pg_net version is 0.20.0. The upstream fix for worker statistics
not reaching autovacuum shipped in 0.20.3:

- [pg_net fix #254](https://github.com/supabase/pg_net/pull/254)
- [pg_net 0.20.3 release](https://github.com/supabase/pg_net/releases/tag/v0.20.3)
- [Supabase cron debugging](https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz)

The current hosted server offers extension versions only through 0.20.0, so
`ALTER EXTENSION UPDATE` cannot install this fix on the existing image. A
supported platform upgrade or Supabase support is needed for that change.
No restart, project upgrade, compute-plan change, or extension drop occurred.
Historical CPU/memory/IO metrics were not collected; attributing every timeout
to this single issue would be premature.

## Production changes

1. Ran ordinary `VACUUM (ANALYZE)` on `net._http_response` (13:26:35) and
   `cron.job_run_details` (13:27:53). This reclaims dead tuples and refreshes
   statistics without deleting live records or requiring `VACUUM FULL`.
2. Applied `20260925133000_reduce_embedding_cron_load.sql`:
   - Hourly response-table vacuum at minute 17.
   - Daily cron-history vacuum at 18:43 UTC (03:43 KST).
   - Preserve the embedding job ID, active state, one-minute schedule, URL,
     and credentials, but invoke HTTP only if an embedding is pending.
   - Explicitly allow 30 seconds for HTTP instead of the 5-second default.

The maintenance jobs are a workaround until the fixed pg_net binary is
available. Ordinary VACUUM makes space reusable; allocated file size alone is
not an indication that vacuum failed. Cron history is still retained in full;
these jobs do not implement a deletion/retention policy.

## Verification

- Repeated the same expiry SELECT with `EXPLAIN (ANALYZE, BUFFERS)`: buffer
  accesses fell from 10,381 to 6. The index returned one live expired row
  instead of 71,747 dead entries. Measured execution fell from 27.542 to
  5.893 ms, although timing varies with cache and system load.
- Tested the migration inside a transaction and rolled it back. Assertions
  verified unchanged job identity/schedule/credentials, both maintenance jobs,
  and zero HTTP requests enqueued when no embeddings were pending.
- `supabase db push --linked --dry-run` showed only the intended migration;
  the subsequent push succeeded.
- The first actual scheduled run at 13:29 succeeded in approximately 3 ms
  with `0 rows`, confirming the idle-work gate in production. All three
  embedding queues were empty.
- Through 13:31, three scheduled idle runs succeeded. A log query from 13:30
  through the check returned no new Postgres errors, PostgREST timeout errors,
  or API/Edge Function 5xx responses. This is only a short observation window,
  subject to log-ingestion delay, not proof of full incident resolution.
- The reusable diagnostic SQL executed successfully, and all 20 local/remote
  migration versions matched. The new hourly/daily maintenance schedules were
  confirmed active; their first scheduled executions were still in the future.

## Interim follow-up — September 26, 12:35 KST

Read-only recheck of the interval starting September 25 13:29 UTC. The cron
snapshot ended at September 26 03:34:52 UTC, about 14 hours after mitigation;
Management API log queries ran around 03:33–03:35 UTC. No production settings
or data were changed during this check.

- Embedding cron: **846 successful runs, zero failed runs**. Of these, 844
  skipped HTTP because no embedding was pending; two enqueued real work.
  Idle executions averaged 7.53 ms, with a maximum of 85.89 ms.
- Hourly HTTP-log vacuum: **14/14 succeeded**. Daily cron-history vacuum:
  **1/1 succeeded**, including the scheduled 03:43 KST execution.
- Both actual Edge Function invocations returned HTTP 200 with `ok: true`,
  each reporting one task embedding completed. No post-change
  HTTP timeout was present. The 16 timeout rows still visible in the retained
  pg_net table were all from before mitigation, most recently 13:26 UTC.
- HTTP queue and all three pending-embedding counts were zero. The default
  rolling-24-hour cron report still included 19 failures from before the fix;
  filtering by the mitigation timestamp excluded all of them.
- API Gateway logs contained 310 recorded requests, all HTTP 2xx or WebSocket
  101; 12 Auth token requests all returned 200. No post-change Postgres
  ERROR/FATAL/PANIC, Auth error, or API/Edge Function HTTP 4xx/5xx was found.
- PostgREST still recorded **47 log events** containing `Warp server error:
  Thread killed by timeout manager` (some events contain repeated messages).
  These are not 47 confirmed failed requests. PostgREST maintainers document
  this exact message being emitted during normal operation in
  [upstream issue #4799](https://github.com/PostgREST/postgrest/issues/4799).
  With no corresponding HTTP/DB failures in this interval, the remaining
  messages are consistent with that logging issue; this is an inference,
  not proof that every individual event is harmless.
- The two Realtime keyword matches were connection-initialization messages
  containing a `query_timeout` setting, not reported timeout failures.

The scheduled maintenance and both idle/active embedding paths are working.
Most of the prior morning failure interval has now passed without a new cron
failure. This remains an interim result: the full 24-hour observation window
ends around September 26 22:30 KST, and logs can have ingestion delay.

## Follow-up checks

Run the credential-safe, read-only report:

```sh
supabase db query --linked --file supabase/scripts/check_background_jobs.sql
```

Check a full 24-hour window, especially the previous failure period
(05:36–12:48 KST). Check cron **and** HTTP response/Edge Function logs; old
errors remain visible until they leave the dashboard's selected time range.
New user edits should produce embeddings within the usual one-minute pickup
interval. An empty HTTP response window is now normal when no work is pending.

If fresh Auth, database connection, or startup timeouts recur despite healthy
vacuum statistics, inspect resource metrics for the exact interval and provide
this evidence to Supabase support. Do not conceal failures by increasing all
database statement timeouts. Once the server supports pg_net >= 0.20.3,
verify the running worker version and advancing autovacuum statistics before
retiring the hourly workaround.

For rollback, remove only the named maintenance jobs via `cron.unschedule`,
and use `cron.alter_job` to remove the pending-work WHERE clause and explicit
timeout from the existing embedding command. Preserve its embedded credentials
in the database; never paste them into committed SQL or incident notes.
