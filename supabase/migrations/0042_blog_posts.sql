-- =========================================================================
-- 0042_blog_posts.sql
-- Platform blog. tournament_id is nullable: null rows are the platform's
-- own blog (superadmin-managed), non-null rows are a tournament's own
-- blog/news-style posts (organizer-managed), mirroring the faq/advertisements
-- pattern already used for platform-wide vs tournament-scoped content.
-- =========================================================================

create table public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid references public.tournaments(id) on delete cascade,
  author_id        uuid references public.profiles(id) on delete set null,
  title            text not null,
  slug             text not null,
  excerpt          text,
  content          text not null,
  cover_image_url  text,
  tags             text[] not null default '{}',
  is_published     boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index idx_blog_posts_tournament_id on public.blog_posts(tournament_id);
create index idx_blog_posts_published on public.blog_posts(is_published, published_at desc);

create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

create policy blog_posts_public_read on public.blog_posts
  for select using (
    is_published = true
    and deleted_at is null
    and (tournament_id is null or public.is_publicly_visible_tournament(tournament_id))
  );

create policy blog_posts_staff_write on public.blog_posts
  for all using (tournament_id is not null and public.is_tournament_staff(tournament_id))
  with check (tournament_id is not null and public.is_tournament_staff(tournament_id));

create policy blog_posts_super_admin_all on public.blog_posts
  for all using (public.is_super_admin()) with check (public.is_super_admin());
