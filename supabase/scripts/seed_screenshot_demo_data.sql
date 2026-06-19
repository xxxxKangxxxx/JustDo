-- App Store screenshot / review demo data seed.
--
-- Usage:
-- 1. Create and sign in once with a dedicated demo account so auth.users,
--    public.users, default categories, and subscription rows are provisioned.
-- 2. In the hosted Supabase SQL editor, set target_email below.
-- 3. Run the whole script. It deletes only app data for that one account and
--    reseeds screenshot-friendly tasks, habits, goals, logs, and Pro entitlement.
--
-- Do not point this at a personal account unless you intend to replace that
-- account's app data.

begin;

do $$
declare
  target_email text := 'kangym071900@gmail.com';
  demo_user_id uuid;
  cat_me uuid;
  cat_work uuid;
  cat_life uuid;
  tag_focus uuid;
  tag_health uuid;
  tag_interview uuid;
  task_interview uuid := gen_random_uuid();
  task_portfolio uuid := gen_random_uuid();
  task_meeting uuid := gen_random_uuid();
  task_report uuid := gen_random_uuid();
  task_read uuid := gen_random_uuid();
  habit_workout uuid := gen_random_uuid();
  habit_water uuid := gen_random_uuid();
  habit_stretch uuid := gen_random_uuid();
  today date := current_date;
  month_key text := to_char(current_date, 'YYYY-MM');
  previous_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  previous_month_key text := to_char((date_trunc('month', current_date) - interval '1 month')::date, 'YYYY-MM');
  year_key text := to_char(current_date, 'YYYY');
begin
  select u.id
    into demo_user_id
  from auth.users u
  where lower(u.email) = lower(target_email)
  limit 1;

  if demo_user_id is null then
    raise exception 'No auth.users row found for email %. Sign in with the demo account first.', target_email;
  end if;

  delete from public.goal_prompt_dismissals where user_id = demo_user_id;
  delete from public.goals where user_id = demo_user_id;
  delete from public.habit_logs where user_id = demo_user_id;
  delete from public.habits where user_id = demo_user_id;
  delete from public.tasks where user_id = demo_user_id;
  delete from public.tags where user_id = demo_user_id;
  delete from public.categories where user_id = demo_user_id and is_default = false;

  insert into public.categories (user_id, name, color, position, is_default)
  values
    (demo_user_id, '나', '#4F6FD8', 0, true),
    (demo_user_id, '외부', '#D36A3A', 1, true)
  on conflict (user_id, name) do update set
    color = excluded.color,
    position = excluded.position,
    is_default = excluded.is_default;

  insert into public.categories (user_id, name, color, position, is_default)
  values
    (demo_user_id, '건강', '#70A684', 2, false)
  on conflict (user_id, name) do update set
    color = excluded.color,
    position = excluded.position,
    is_default = excluded.is_default;

  select id into cat_me from public.categories where user_id = demo_user_id and name = '나';
  select id into cat_work from public.categories where user_id = demo_user_id and name = '외부';
  select id into cat_life from public.categories where user_id = demo_user_id and name = '건강';

  insert into public.tags (user_id, name)
  values
    (demo_user_id, '#집중'),
    (demo_user_id, '#건강'),
    (demo_user_id, '#면접')
  on conflict (user_id, name) do update set name = excluded.name;

  select id into tag_focus from public.tags where user_id = demo_user_id and name = '#집중';
  select id into tag_health from public.tags where user_id = demo_user_id and name = '#건강';
  select id into tag_interview from public.tags where user_id = demo_user_id and name = '#면접';

  insert into public.tasks (
    id, user_id, category_id, title, memo, priority, start_date, end_date,
    scheduled_time, is_completed, completed_at
  )
  values
    (
      task_interview,
      demo_user_id,
      cat_me,
      '면접 준비 자료 정리',
      '예상 질문과 포트폴리오 설명을 한 번 더 다듬기',
      'high',
      today,
      today + 4,
      '19:00',
      false,
      null
    ),
    (
      task_portfolio,
      demo_user_id,
      cat_me,
      '포트폴리오 최종 점검',
      '핵심 프로젝트 3개만 선명하게 정리',
      'medium',
      today - 3,
      today + 2,
      null,
      false,
      null
    ),
    (
      task_meeting,
      demo_user_id,
      cat_work,
      '협업 미팅',
      '다음 주 일정과 역할 확정',
      'high',
      today,
      today,
      '14:00',
      false,
      null
    ),
    (
      task_report,
      demo_user_id,
      cat_work,
      '주간 회고 작성',
      '완료한 일과 미룬 일을 짧게 정리',
      'medium',
      today - 6,
      today,
      null,
      false,
      null
    ),
    (
      task_read,
      demo_user_id,
      cat_life,
      '독서 30분',
      '잠들기 전 화면 대신 책 보기',
      'low',
      today,
      today,
      null,
      true,
      now() - interval '2 hours'
    )
  on conflict (id) do nothing;

  insert into public.tasks (
    id, user_id, category_id, title, memo, priority, start_date, end_date,
    scheduled_time, is_completed, completed_at
  )
  values
    (
      gen_random_uuid(),
      demo_user_id,
      cat_me,
      '면접 답변 1차 정리',
      '지난달 리포트에 반영될 완료 작업',
      'high',
      previous_month_start + 4,
      previous_month_start + 4,
      '20:00',
      true,
      (previous_month_start + 4)::timestamptz + interval '20 hours'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      cat_me,
      '포트폴리오 사례 보강',
      '핵심 프로젝트 설명을 보강',
      'medium',
      previous_month_start + 8,
      previous_month_start + 10,
      null,
      true,
      (previous_month_start + 10)::timestamptz + interval '18 hours'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      cat_life,
      '운동 루틴 점검',
      '꾸준히 지킨 습관 돌아보기',
      'medium',
      previous_month_start + 15,
      previous_month_start + 15,
      null,
      true,
      (previous_month_start + 15)::timestamptz + interval '9 hours'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      cat_work,
      '미룬 일정 정리',
      '리포트의 미룬 작업 예시',
      'low',
      previous_month_start + 2,
      previous_month_start + 18,
      null,
      false,
      null
    )
  on conflict (id) do nothing;

  insert into public.task_tags (task_id, tag_id)
  values
    (task_interview, tag_interview),
    (task_interview, tag_focus),
    (task_portfolio, tag_focus),
    (task_read, tag_health)
  on conflict do nothing;

  insert into public.habits (
    id, user_id, category_id, title, goal, recur_type, recur_days,
    reminder_at, emoji
  )
  values
    (
      habit_workout,
      demo_user_id,
      cat_life,
      '운동 30분',
      '주 3회 이상 움직이기',
      'daily',
      null,
      '08:00',
      '🏃'
    ),
    (
      habit_water,
      demo_user_id,
      cat_life,
      '물 2L',
      '오후까지 절반 이상 마시기',
      'daily',
      null,
      '09:00',
      '💧'
    ),
    (
      habit_stretch,
      demo_user_id,
      cat_life,
      '아침 스트레칭',
      '평일 아침 10분',
      'weekly',
      array[1,2,3,4,5],
      '07:30',
      '🧘'
    )
  on conflict (id) do nothing;

  insert into public.habit_logs (habit_id, user_id, log_date, is_completed)
  select habit_workout, demo_user_id, today - day_offset, true
  from generate_series(0, 8) as day_offset
  on conflict (habit_id, log_date) do update set is_completed = excluded.is_completed;

  insert into public.habit_logs (habit_id, user_id, log_date, is_completed)
  select habit_water, demo_user_id, today - day_offset, true
  from generate_series(0, 27) as day_offset
  on conflict (habit_id, log_date) do update set is_completed = excluded.is_completed;

  insert into public.habit_logs (habit_id, user_id, log_date, is_completed)
  values
    (habit_stretch, demo_user_id, today - 5, true),
    (habit_stretch, demo_user_id, today - 4, true),
    (habit_stretch, demo_user_id, today - 3, true),
    (habit_stretch, demo_user_id, today - 1, true)
  on conflict (habit_id, log_date) do update set is_completed = excluded.is_completed;

  insert into public.habit_logs (habit_id, user_id, log_date, is_completed)
  select habit_workout, demo_user_id, previous_month_start + day_offset, true
  from generate_series(1, 20, 3) as day_offset
  on conflict (habit_id, log_date) do update set is_completed = excluded.is_completed;

  insert into public.habit_logs (habit_id, user_id, log_date, is_completed)
  select habit_water, demo_user_id, previous_month_start + day_offset, true
  from generate_series(0, 24, 2) as day_offset
  on conflict (habit_id, log_date) do update set is_completed = excluded.is_completed;

  insert into public.habit_logs (habit_id, user_id, log_date, is_completed)
  values
    (habit_stretch, demo_user_id, previous_month_start + 3, true),
    (habit_stretch, demo_user_id, previous_month_start + 4, true),
    (habit_stretch, demo_user_id, previous_month_start + 10, true),
    (habit_stretch, demo_user_id, previous_month_start + 11, true),
    (habit_stretch, demo_user_id, previous_month_start + 17, true)
  on conflict (habit_id, log_date) do update set is_completed = excluded.is_completed;

  insert into public.goals (
    id, user_id, period_type, period_key, title, note, sort_order,
    locked, locked_at, target
  )
  values
    (
      gen_random_uuid(),
      demo_user_id,
      'yearly',
      year_key,
      '체력 만들기',
      '운동과 스트레칭을 생활 루틴으로 고정',
      0,
      true,
      date_trunc('year', now()),
      120
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'yearly',
      year_key,
      '직무 전환 준비',
      '포트폴리오와 면접 루틴 만들기',
      1,
      true,
      date_trunc('year', now()),
      40
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'monthly',
      month_key,
      '면접 준비 마무리',
      '자료 정리와 예상 질문 연습',
      0,
      true,
      date_trunc('month', now()),
      8
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'monthly',
      month_key,
      '생활 리듬 회복',
      '운동, 물 마시기, 독서 루틴 유지',
      1,
      false,
      null,
      20
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'monthly',
      previous_month_key,
      '면접 준비 흐름 만들기',
      '지난달 완료한 자료 정리와 루틴 회고',
      0,
      true,
      previous_month_start::timestamptz,
      6
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'monthly',
      previous_month_key,
      '운동 루틴 유지',
      '운동과 물 마시기를 꾸준히 이어가기',
      1,
      true,
      previous_month_start::timestamptz,
      12
    )
  on conflict (id) do nothing;

  insert into public.goal_prompt_dismissals (
    user_id, prompt_type, period_key, dismissed_permanently_for_period
  )
  values
    (demo_user_id, 'onboarding', 'initial', true),
    (demo_user_id, 'monthly', month_key, true),
    (demo_user_id, 'yearly', year_key, true)
  on conflict (user_id, prompt_type, period_key) do update set
    dismissed_permanently_for_period = excluded.dismissed_permanently_for_period,
    dismissed_at = now();

  insert into public.user_subscriptions (
    user_id, plan_name, status, trial_start_at, trial_end_at,
    subscribed_at, plan_interval, amount_krw, currency
  )
  values (
    demo_user_id,
    'pro',
    'active',
    now() - interval '7 days',
    now() + interval '365 days',
    now() - interval '7 days',
    'monthly',
    1900,
    'KRW'
  )
  on conflict (user_id) do update set
    plan_name = excluded.plan_name,
    status = excluded.status,
    trial_start_at = excluded.trial_start_at,
    trial_end_at = excluded.trial_end_at,
    subscribed_at = excluded.subscribed_at,
    plan_interval = excluded.plan_interval,
    amount_krw = excluded.amount_krw,
    currency = excluded.currency,
    expires_at = null,
    cancel_at = null,
    cancelled_at = null,
    payment_failures = 0;

  raise notice 'Seeded screenshot demo data for % (%)', target_email, demo_user_id;
end $$;

commit;
