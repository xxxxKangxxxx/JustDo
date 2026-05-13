-- Public-facing waitlist for unreleased platforms (Android v3, future iOS gating).
-- Writes only happen through service-role API routes; no end-user has direct
-- insert/select access via RLS. Existing rows can be exported manually for
-- launch announcement campaigns.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  platform    text not null check (platform in ('android', 'ios', 'web')),
  source      text,
  created_at  timestamptz not null default now(),
  unique (email, platform)
);

create index if not exists idx_waitlist_platform_created_at
  on public.waitlist (platform, created_at desc);

alter table public.waitlist enable row level security;

-- No RLS policies are added intentionally. RLS-enabled tables with no policies
-- reject all access from anon/authenticated roles. The service-role key bypasses
-- RLS, so server-only code in apps/web/src/app/api/waitlist/route.ts is the only
-- write path.
