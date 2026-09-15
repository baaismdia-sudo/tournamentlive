-- =========================================================================
-- 0040_public_site_realtime.sql
-- RECONSTRUCTED from the live database (original file not committed).
-- Adds site-customization tables to the realtime publication so a public
-- tournament site updates its branding/theme/SEO live without a page
-- reload when an organizer changes it in their dashboard.
-- =========================================================================

alter publication supabase_realtime add table public.site_settings;
alter publication supabase_realtime add table public.seo_settings;
alter publication supabase_realtime add table public.website_themes;
