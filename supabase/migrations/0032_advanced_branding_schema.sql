-- =========================================================================
-- 0032_advanced_branding_schema.sql
-- =========================================================================
alter table public.website_themes add column advanced_colors jsonb not null default '{}';
alter table public.website_themes add column typography jsonb not null default '{"font_size_base":"16px","line_height":"1.5","letter_spacing":"normal","font_weight":"400","button_font":"Inter"}';
alter table public.website_themes add column button_style text not null default 'rounded' check (button_style in ('rounded','pill','square'));
alter table public.website_themes add column card_style text not null default 'elevated' check (card_style in ('elevated','flat','bordered'));
alter table public.website_themes add column border_radius text not null default '12px';
alter table public.website_themes add column theme_mode text not null default 'auto' check (theme_mode in ('light','dark','auto'));
alter table public.website_themes add column header_config jsonb not null default '{"logo_position":"left","sticky":true,"transparent":false,"show_search":true,"show_login":true,"show_register":true,"show_theme_switch":true,"announcement_text":null}';
alter table public.website_themes add column footer_config jsonb not null default '{"show_sponsors":true,"show_social_links":true,"quick_links":[]}';
alter table public.website_themes add column newsletter_enabled boolean not null default false;

create table public.custom_pages (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  title         text not null,
  slug          text not null,
  content       text not null default '',
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, slug)
);

create trigger trg_custom_pages_updated_at
  before update on public.custom_pages
  for each row execute function public.set_updated_at();

alter table public.custom_pages enable row level security;

create policy custom_pages_public_read on public.custom_pages
  for select using (is_published = true and public.is_publicly_visible_tournament(tournament_id));
create policy custom_pages_staff_write on public.custom_pages
  for all using (public.is_tournament_staff(tournament_id))
  with check (public.is_tournament_staff(tournament_id));
create policy custom_pages_super_admin_all on public.custom_pages
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create table public.navigation_menus (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null default 'Main Menu',
  created_at    timestamptz not null default now()
);

create table public.navigation_items (
  id              uuid primary key default gen_random_uuid(),
  menu_id         uuid not null references public.navigation_menus(id) on delete cascade,
  parent_item_id  uuid references public.navigation_items(id) on delete cascade,
  label           text not null,
  link_type       text not null default 'internal' check (link_type in ('internal','external','custom_page')),
  url             text,
  custom_page_id  uuid references public.custom_pages(id) on delete set null,
  icon            text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_navigation_items_menu on public.navigation_items(menu_id);

alter table public.navigation_menus enable row level security;
alter table public.navigation_items enable row level security;

create policy navigation_menus_public_read on public.navigation_menus
  for select using (public.is_publicly_visible_tournament(tournament_id));
create policy navigation_menus_staff_write on public.navigation_menus
  for all using (public.is_tournament_staff(tournament_id)) with check (public.is_tournament_staff(tournament_id));
create policy navigation_menus_super_admin_all on public.navigation_menus
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy navigation_items_public_read on public.navigation_items
  for select using (exists (select 1 from navigation_menus m where m.id = menu_id and public.is_publicly_visible_tournament(m.tournament_id)));
create policy navigation_items_staff_write on public.navigation_items
  for all using (exists (select 1 from navigation_menus m where m.id = menu_id and public.is_tournament_staff(m.tournament_id)))
  with check (exists (select 1 from navigation_menus m where m.id = menu_id and public.is_tournament_staff(m.tournament_id)));
create policy navigation_items_super_admin_all on public.navigation_items
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create table public.tournament_downloads (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  title         text not null,
  file_url      text not null,
  category      text not null default 'other' check (category in ('rule_book','schedule','brochure','registration_form','media_kit','other')),
  created_at    timestamptz not null default now()
);

alter table public.tournament_downloads enable row level security;

create policy tournament_downloads_public_read on public.tournament_downloads
  for select using (public.is_publicly_visible_tournament(tournament_id));
create policy tournament_downloads_staff_write on public.tournament_downloads
  for all using (public.is_tournament_staff(tournament_id)) with check (public.is_tournament_staff(tournament_id));
create policy tournament_downloads_super_admin_all on public.tournament_downloads
  for all using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.profiles add column white_label_enabled boolean not null default false;
alter table public.profiles add column custom_css_enabled boolean not null default false;

alter table public.media_library add column folder text not null default 'General';

alter table public.custom_domains add column approved_by uuid references public.profiles(id);
alter table public.custom_domains add column approved_at timestamptz;
alter table public.custom_domains add column rejection_reason text;
