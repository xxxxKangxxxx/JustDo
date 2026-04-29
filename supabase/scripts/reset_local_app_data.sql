-- Local development helper.
--
-- This removes local test accounts and cascades their app data through the
-- schema's FK rules. It is intentionally NOT a migration and should not be run
-- against production or a shared remote database.

begin;

select 'before_auth_users' as metric, count(*)::int as count from auth.users
union all
select 'before_public_users', count(*)::int from public.users
union all
select 'before_tasks', count(*)::int from public.tasks
union all
select 'before_habits', count(*)::int from public.habits
union all
select 'before_habit_logs', count(*)::int from public.habit_logs
union all
select 'before_tags', count(*)::int from public.tags;

delete from auth.users;

select 'after_auth_users' as metric, count(*)::int as count from auth.users
union all
select 'after_public_users', count(*)::int from public.users
union all
select 'after_tasks', count(*)::int from public.tasks
union all
select 'after_habits', count(*)::int from public.habits
union all
select 'after_habit_logs', count(*)::int from public.habit_logs
union all
select 'after_tags', count(*)::int from public.tags;

commit;
