# Scorio rebrand — what changed

Unzip over your project root (paths are relative to it), then run `npm install` (adds the 3 self-hosted font packages), then `npm run build`.

Also delete the old folder `public/branding/` (its files are replaced by `public/brand/` and the favicon set).

One manual step in Supabase (your data, not code): run `supabase/scripts/rebrand-data.sql` — audit first, then update.
See `docs/BRAND.md` for the design-system rules.
