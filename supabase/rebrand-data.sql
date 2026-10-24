-- =========================================================================
-- Scorio rebrand — DATA cleanup (run manually in the Supabase SQL editor)
--
-- This is deliberately NOT in supabase/migrations: it edits content rows that
-- belong to your live data, not schema, and should be reviewed before running.
-- The app code already says "Scorio" everywhere; this catches any copy that was
-- stored in the database (settings, email templates, FAQ) under the old name.
--
-- STEP 1 — AUDIT. Run this first. If it returns no rows, you are done.
-- =========================================================================
select 'system_settings' as source, key as ref, left(value::text, 140) as current_value
  from public.system_settings
  where value::text ilike '%tournamentlive%' or key in ('platform_name', 'website_name', 'logo_url', 'favicon_url')
union all
select 'email_templates', key, left(subject || ' | ' || html_body, 140)
  from public.email_templates
  where subject ilike '%tournamentlive%' or html_body ilike '%tournamentlive%'
union all
select 'faq', left(question, 60), left(answer, 140)
  from public.faq
  where question ilike '%tournamentlive%' or answer ilike '%tournamentlive%';

-- =========================================================================
-- STEP 2 — UPDATE. Review the audit output, then run this block.
-- Replaces the text "TournamentLive" with "Scorio" (case-sensitive; it does not
-- touch URLs/domains written in lowercase such as tournamentlive.app).
-- =========================================================================
begin;

update public.system_settings
   set value = replace(value::text, 'TournamentLive', 'Scorio')::jsonb
 where value::text like '%TournamentLive%';

update public.email_templates
   set subject = replace(subject, 'TournamentLive', 'Scorio'),
       html_body = replace(html_body, 'TournamentLive', 'Scorio')
 where subject like '%TournamentLive%' or html_body like '%TournamentLive%';

update public.faq
   set question = replace(question, 'TournamentLive', 'Scorio'),
       answer = replace(answer, 'TournamentLive', 'Scorio')
 where question like '%TournamentLive%' or answer like '%TournamentLive%';

commit;

-- If the audit showed a logo_url / favicon_url setting pointing at an old logo
-- file, update it from Super Admin -> System Settings (or White Label).
