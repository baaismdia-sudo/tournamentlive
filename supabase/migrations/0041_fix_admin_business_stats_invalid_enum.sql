-- =========================================================================
-- 0041_fix_admin_business_stats_invalid_enum.sql
-- admin_business_stats() compared invoices.status against 'paid', which is
-- not a valid payment_status enum value (valid values: pending, succeeded,
-- failed, refunded, partially_refunded, cancelled, manual). This made the
-- function raise an error on every call, breaking the Business Dashboard
-- page entirely. Fixed to compare against 'succeeded'.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.admin_business_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may view business statistics';
  end if;

  select jsonb_build_object(
    'total_customers', (select count(*) from profiles p join roles r on r.id = p.role_id where r.name = 'organizer' and p.deleted_at is null),
    'active_customers', (select count(distinct organizer_id) from subscriptions where status = 'active'),
    'inactive_customers', (
      select count(*) from profiles p join roles r on r.id = p.role_id
      where r.name = 'organizer' and p.deleted_at is null
      and p.id not in (select organizer_id from subscriptions where status = 'active')
    ),
    'pending_rental_requests', (select count(*) from rental_enquiries where status in ('pending','contacted','payment_pending')),
    'active_rentals', (select count(*) from subscriptions where status = 'active'),
    'expired_rentals', (select count(*) from subscriptions where status = 'expired'),
    'expiring_7_days', (select count(*) from subscriptions where status = 'active' and ends_at <= now() + interval '7 days'),
    'monthly_revenue', (select coalesce(sum(total_cents), 0) from invoices where status = 'succeeded' and issue_date >= date_trunc('month', current_date)),
    'pending_renewals', (select count(*) from rental_enquiries where status = 'pending' and tournament_id is not null),
    'total_invoices', (select count(*) from invoices)
  ) into result;

  return result;
end;
$function$;
