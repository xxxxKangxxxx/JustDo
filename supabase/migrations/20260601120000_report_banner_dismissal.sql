-- Allow period-end report banner dismissals in goal_prompt_dismissals.
--
-- The period-end report Home banner is dismissible per period and the dismissal
-- must sync cross-device, so it reuses goal_prompt_dismissals. This adds two new
-- prompt types, 'report_monthly' and 'report_yearly', and extends the period_key
-- format check to accept them (report_monthly -> YYYY-MM, report_yearly -> YYYY).
--
-- The original constraints from 20260529120000_goal_report.sql were created
-- inline (unnamed), so PostgreSQL auto-named them. Drop those auto-named
-- constraints and re-add explicitly named ones that include the new types.

alter table public.goal_prompt_dismissals
  drop constraint if exists goal_prompt_dismissals_prompt_type_check;

alter table public.goal_prompt_dismissals
  drop constraint if exists goal_prompt_dismissals_check;

alter table public.goal_prompt_dismissals
  add constraint goal_prompt_dismissals_prompt_type_check
  check (prompt_type in ('onboarding', 'monthly', 'yearly', 'report_monthly', 'report_yearly'));

alter table public.goal_prompt_dismissals
  add constraint goal_prompt_dismissals_period_key_check
  check (
    (prompt_type in ('monthly', 'report_monthly') and period_key ~ '^[0-9]{4}-[0-9]{2}$')
    or (prompt_type in ('yearly', 'report_yearly') and period_key ~ '^[0-9]{4}$')
    or (prompt_type = 'onboarding' and period_key = 'initial')
  );
