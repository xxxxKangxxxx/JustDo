-- The web/iOS UI shows an emoji on every habit row. The init schema didn't
-- carry it, so add an optional column with a sensible default.

alter table public.habits
  add column emoji text not null default '🌱';
