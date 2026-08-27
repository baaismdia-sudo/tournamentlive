-- =========================================================================
-- 0035_business_management_schema.sql
-- =========================================================================
alter table public.rental_plans add column storage_limit_mb int;
alter table public.rental_plans add column max_tournaments int;
alter table public.rental_plans add column max_teams_per_tournament int;
alter table public.rental_plans add column max_players_per_team int;
alter table public.rental_plans add column max_officials int;
alter table public.rental_plans add column max_gallery_items int;
alter table public.rental_plans add column max_sponsors int;
alter table public.rental_plans add column max_news_articles int;
alter table public.rental_plans add column has_public_website boolean not null default true;
alter table public.rental_plans add column has_custom_domain boolean not null default false;
alter table public.rental_plans add column has_white_label boolean not null default false;
alter table public.rental_plans add column has_priority_support boolean not null default false;
alter table public.rental_plans add column is_recommended boolean not null default false;
alter table public.rental_plans add column custom_duration_days int;
alter table public.rental_plans add column archived_at timestamptz;

alter table public.rental_enquiries add column tournament_name text;
alter table public.rental_enquiries add column sport text;
alter table public.rental_enquiries add column country text;
alter table public.rental_enquiries add column state text;
alter table public.rental_enquiries add column city text;
alter table public.rental_enquiries add column tournament_starts_at date;
alter table public.rental_enquiries add column tournament_ends_at date;
alter table public.rental_enquiries add column expected_teams int;
alter table public.rental_enquiries add column expected_players int;
alter table public.rental_enquiries add column whatsapp_number text;

create table public.login_history (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  ip_address   text,
  browser      text,
  device       text,
  os           text,
  location     text,
  created_at   timestamptz not null default now()
);

create index idx_login_history_profile on public.login_history(profile_id);

alter table public.login_history enable row level security;

create policy login_history_owner_read on public.login_history
  for select using (profile_id = auth.uid());
create policy login_history_owner_insert on public.login_history
  for insert with check (profile_id = auth.uid());
create policy login_history_super_admin_all on public.login_history
  for all using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.contact_messages add column category text not null default 'general'
  check (category in ('general','support','sales','feedback','feature_request','bug_report'));
alter table public.contact_messages add column attachment_url text;
alter table public.contact_messages add column organizer_id uuid references public.profiles(id);

create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  invoice_number   text not null unique,
  organizer_id     uuid not null references public.profiles(id) on delete cascade,
  payment_id       uuid references public.payments(id) on delete set null,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  plan_name        text not null,
  amount_cents     bigint not null,
  discount_cents   bigint not null default 0,
  gst_cents        bigint not null default 0,
  total_cents      bigint not null,
  currency         text not null default 'INR',
  status           payment_status not null default 'pending',
  issue_date       date not null default current_date,
  due_date         date,
  created_at       timestamptz not null default now()
);

create index idx_invoices_organizer on public.invoices(organizer_id);

alter table public.invoices enable row level security;

create policy invoices_owner_read on public.invoices
  for select using (organizer_id = auth.uid());
create policy invoices_super_admin_all on public.invoices
  for all using (public.is_super_admin()) with check (public.is_super_admin());
