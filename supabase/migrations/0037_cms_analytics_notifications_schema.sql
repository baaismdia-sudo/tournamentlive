-- =========================================================================
-- 0037_cms_analytics_notifications_schema.sql
-- RECONSTRUCTED from the live database — the original migration file was
-- never committed to this repo, only applied directly against the
-- Supabase project. Adds: announcements (site-wide banner/countdown bar),
-- forms + form_fields + form_submissions (public-facing custom forms per
-- tournament, e.g. registration/contact forms), error_logs (client-side
-- error reporting), page_views (analytics tracking).
-- =========================================================================

-- ---------------------------------------------------------------------
-- announcements — a dismissible banner/countdown shown on the public
-- site or a specific tournament's public pages
-- ---------------------------------------------------------------------
create table public.announcements (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid references public.tournaments(id) on delete cascade,
  placement        text not null default 'top_bar',
  message          text not null,
  link_url         text,
  countdown_target timestamptz,
  is_enabled       boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy announcements_public_read on public.announcements
  for select using (
    is_enabled = true and (tournament_id is null or public.is_publicly_visible_tournament(tournament_id))
  );
create policy announcements_staff_write on public.announcements
  for all using (tournament_id is not null and public.is_tournament_staff(tournament_id))
  with check (tournament_id is not null and public.is_tournament_staff(tournament_id));
create policy announcements_super_admin_all on public.announcements
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------
-- forms / form_fields / form_submissions — custom public-facing forms
-- (e.g. team registration, contact, feedback) per tournament
-- ---------------------------------------------------------------------
create table public.forms (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_forms_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

create table public.form_fields (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.forms(id) on delete cascade,
  label       text not null,
  field_type  text not null,
  options     text[] not null default '{}',
  is_required boolean not null default false,
  sort_order  int not null default 0
);

create table public.form_submissions (
  id                  uuid primary key default gen_random_uuid(),
  form_id             uuid not null references public.forms(id) on delete cascade,
  data                jsonb not null default '{}',
  submitted_by_email  text,
  created_at          timestamptz not null default now()
);

alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;

create policy forms_public_read on public.forms
  for select using (is_active = true and public.is_publicly_visible_tournament(tournament_id));
create policy forms_staff_write on public.forms
  for all using (public.is_tournament_staff(tournament_id)) with check (public.is_tournament_staff(tournament_id));
create policy forms_super_admin_all on public.forms
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy form_fields_public_read on public.form_fields
  for select using (exists (select 1 from public.forms f where f.id = form_fields.form_id and public.is_publicly_visible_tournament(f.tournament_id)));
create policy form_fields_staff_write on public.form_fields
  for all using (exists (select 1 from public.forms f where f.id = form_fields.form_id and public.is_tournament_staff(f.tournament_id)))
  with check (exists (select 1 from public.forms f where f.id = form_fields.form_id and public.is_tournament_staff(f.tournament_id)));
create policy form_fields_super_admin_all on public.form_fields
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy form_submissions_public_insert on public.form_submissions
  for insert with check (true);
create policy form_submissions_staff_read on public.form_submissions
  for select using (exists (select 1 from public.forms f where f.id = form_submissions.form_id and public.is_tournament_staff(f.tournament_id)));
create policy form_submissions_super_admin_all on public.form_submissions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------
-- error_logs — client-side error reporting
-- ---------------------------------------------------------------------
create table public.error_logs (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  source     text not null,
  message    text not null,
  stack      text,
  path       text,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

create policy error_logs_insert_authenticated on public.error_logs
  for insert with check (true);
create policy error_logs_super_admin_all on public.error_logs
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------
-- page_views — analytics tracking
-- ---------------------------------------------------------------------
create table public.page_views (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  path          text not null,
  session_id    text not null,
  country       text,
  device        text,
  browser       text,
  os            text,
  referrer      text,
  created_at    timestamptz not null default now()
);

create index idx_page_views_tournament_id on public.page_views(tournament_id);
create index idx_page_views_created_at on public.page_views(created_at desc);

alter table public.page_views enable row level security;

create policy page_views_public_insert on public.page_views
  for insert with check (true);
create policy page_views_staff_read on public.page_views
  for select using (tournament_id is not null and public.is_tournament_staff(tournament_id));
create policy page_views_super_admin_all on public.page_views
  for all using (public.is_super_admin()) with check (public.is_super_admin());
