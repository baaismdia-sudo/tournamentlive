-- =========================================================================
-- 0018_add_username_to_profiles.sql
-- RECONSTRUCTED from the live database schema.
-- =========================================================================

alter table public.profiles add column if not exists username text;

create unique index if not exists idx_profiles_username
  on public.profiles (lower(username))
  where deleted_at is null;
