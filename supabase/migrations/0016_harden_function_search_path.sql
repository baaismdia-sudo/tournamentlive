-- =========================================================================
-- 0016_harden_function_search_path.sql
-- RECONSTRUCTED from the live database — the original migration file was
-- never committed to this repo, only applied directly. Every SECURITY
-- DEFINER function in this codebase already declares `SET search_path TO
-- 'public'` in the CREATE FUNCTION statement, which is exactly what this
-- migration hardened against search_path hijacking. This file is an
-- idempotent no-op safety net: it re-applies `search_path = public` to any
-- function that might somehow be missing it, so re-running the full
-- migration history from scratch reaches the same secure end state.
-- =========================================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true -- SECURITY DEFINER functions only
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;
