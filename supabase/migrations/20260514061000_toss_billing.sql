-- Phase 7 Pro checkout: Toss Payments billing foundation.
-- Live billing still requires Toss merchant review and an automatic-billing MID,
-- but this schema supports test-key integration before that external track ends.

alter table public.user_subscriptions
  add column if not exists billing_provider text,
  add column if not exists toss_billing_key text,
  add column if not exists toss_customer_key text,
  add column if not exists toss_last_payment_key text,
  add column if not exists plan_interval text not null default 'monthly',
  add column if not exists amount_krw integer not null default 1900,
  add column if not exists currency text not null default 'KRW',
  add column if not exists next_billing_at timestamptz,
  add column if not exists cancel_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists last_payment_at timestamptz,
  add column if not exists payment_failures integer not null default 0,
  add column if not exists payment_method_label text,
  add column if not exists payment_method_last4 text;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check,
  add constraint user_subscriptions_status_check
    check (status in ('trial', 'active', 'past_due', 'paused', 'expired', 'cancelled')),
  drop constraint if exists user_subscriptions_billing_provider_check,
  add constraint user_subscriptions_billing_provider_check
    check (billing_provider is null or billing_provider in ('toss_payments')),
  drop constraint if exists user_subscriptions_plan_interval_check,
  add constraint user_subscriptions_plan_interval_check
    check (plan_interval in ('monthly', 'yearly')),
  drop constraint if exists user_subscriptions_amount_krw_check,
  add constraint user_subscriptions_amount_krw_check
    check (amount_krw > 0),
  drop constraint if exists user_subscriptions_currency_check,
  add constraint user_subscriptions_currency_check
    check (currency = 'KRW'),
  drop constraint if exists user_subscriptions_payment_failures_check,
  add constraint user_subscriptions_payment_failures_check
    check (payment_failures >= 0);

create unique index if not exists idx_user_subscriptions_toss_customer_key
  on public.user_subscriptions(toss_customer_key)
  where toss_customer_key is not null;

create index if not exists idx_user_subscriptions_next_billing
  on public.user_subscriptions(next_billing_at)
  where next_billing_at is not null
    and status in ('trial', 'active', 'past_due');

create table if not exists public.payment_events (
  id                  uuid primary key default gen_random_uuid(),
  provider            text not null check (provider in ('toss_payments')),
  provider_event_id   text,
  event_type          text not null,
  payment_key         text,
  order_id            text,
  subscription_id     uuid references public.user_subscriptions(id) on delete set null,
  user_id             uuid references public.users(id) on delete set null,
  payload             jsonb not null default '{}'::jsonb,
  processed_at        timestamptz,
  processing_error    text,
  created_at          timestamptz not null default now()
);

create unique index if not exists idx_payment_events_provider_event_id
  on public.payment_events(provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists idx_payment_events_subscription_created
  on public.payment_events(subscription_id, created_at desc);

create index if not exists idx_payment_events_user_created
  on public.payment_events(user_id, created_at desc);

alter table public.payment_events enable row level security;

drop policy if exists payment_events_select_own on public.payment_events;
create policy payment_events_select_own on public.payment_events
  for select using (auth.uid() = user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color, position, is_default)
  values
    (new.id, '나', '#4F6FD8', 0, true),
    (new.id, '외부', '#D36A3A', 1, true)
  on conflict (user_id, name) do nothing;

  insert into public.user_subscriptions (
    user_id,
    plan_name,
    status,
    trial_start_at,
    trial_end_at,
    plan_interval,
    amount_krw,
    currency
  )
  values (
    new.id,
    'pro',
    'trial',
    now(),
    now() + interval '30 days',
    'monthly',
    1900,
    'KRW'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
