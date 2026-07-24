-- Task notification preferences.
--
-- Keep reminder_at for backwards compatibility with any older client or data
-- export that still references the original single absolute reminder.

alter table public.tasks
  add column if not exists reminder_mode text not null default 'default',
  add column if not exists reminder_offsets_minutes int[] not null default '{}'::int[];

alter table public.tasks
  drop constraint if exists tasks_reminder_mode_check,
  add constraint tasks_reminder_mode_check
    check (reminder_mode in ('default', 'custom', 'none')),
  drop constraint if exists tasks_reminder_offsets_minutes_check,
  add constraint tasks_reminder_offsets_minutes_check
    check (
      cardinality(reminder_offsets_minutes) <= 3
      and 0 <= all(reminder_offsets_minutes)
      and 10080 >= all(reminder_offsets_minutes)
    );

comment on column public.tasks.reminder_mode is
  'Task reminder behavior: default inherits the user setting, custom uses reminder_offsets_minutes, none disables reminders.';

comment on column public.tasks.reminder_offsets_minutes is
  'Up to three minute offsets before the task schedule, from 0 (on time) through 10080 (one week).';
