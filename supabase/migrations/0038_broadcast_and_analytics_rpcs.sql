-- =========================================================================
-- 0038_broadcast_and_analytics_rpcs.sql
-- RECONSTRUCTED from the live database (original file not committed).
-- =========================================================================

create or replace function public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_link_url text default null,
  p_segment text default 'all'
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  recipient_count int;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may broadcast notifications';
  end if;

  insert into notifications (profile_id, type, title, body, link_url)
  select p.id, 'info', p_title, p_body, p_link_url
  from profiles p
  join roles r on r.id = p.role_id
  where r.name = 'organizer'
    and p.deleted_at is null
    and (
      p_segment = 'all'
      or (p_segment = 'active' and exists (select 1 from subscriptions s where s.organizer_id = p.id and s.status = 'active'))
      or (p_segment = 'inactive' and not exists (select 1 from subscriptions s where s.organizer_id = p.id and s.status = 'active'))
    );

  get diagnostics recipient_count = row_count;
  return recipient_count;
end;
$function$;

create or replace function public.get_page_view_stats(
  p_tournament_id uuid default null,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  result jsonb;
  is_authorized boolean;
begin
  is_authorized := public.is_super_admin() or (p_tournament_id is not null and public.is_tournament_staff(p_tournament_id));
  if not is_authorized then
    raise exception 'Not authorized to view these analytics';
  end if;

  select jsonb_build_object(
    'total_views', (select count(*) from page_views where (p_tournament_id is null or tournament_id = p_tournament_id) and created_at >= now() - (p_days || ' days')::interval),
    'unique_sessions', (select count(distinct session_id) from page_views where (p_tournament_id is null or tournament_id = p_tournament_id) and created_at >= now() - (p_days || ' days')::interval),
    'by_device', (select coalesce(jsonb_object_agg(device, cnt), '{}'::jsonb) from (select device, count(*) cnt from page_views where (p_tournament_id is null or tournament_id = p_tournament_id) and created_at >= now() - (p_days || ' days')::interval and device is not null group by device) t),
    'by_browser', (select coalesce(jsonb_object_agg(browser, cnt), '{}'::jsonb) from (select browser, count(*) cnt from page_views where (p_tournament_id is null or tournament_id = p_tournament_id) and created_at >= now() - (p_days || ' days')::interval and browser is not null group by browser) t),
    'by_country', (select coalesce(jsonb_object_agg(country, cnt), '{}'::jsonb) from (select country, count(*) cnt from page_views where (p_tournament_id is null or tournament_id = p_tournament_id) and created_at >= now() - (p_days || ' days')::interval and country is not null group by country) t),
    'top_pages', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (select path, count(*) cnt from page_views where (p_tournament_id is null or tournament_id = p_tournament_id) and created_at >= now() - (p_days || ' days')::interval group by path order by cnt desc limit 10) t)
  ) into result;

  return result;
end;
$function$;
