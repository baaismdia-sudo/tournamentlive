-- =========================================================================
-- 0036_business_management_rpcs.sql
-- =========================================================================
create or replace function public.admin_approve_enquiry(p_enquiry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may approve enquiries';
  end if;
  update rental_enquiries set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_enquiry_id;

  insert into notifications (profile_id, type, title, body, link_url)
  select organizer_id, 'info', 'Your rental request was approved',
    'Your rental request has been approved. We will activate it shortly.', '/dashboard/subscription'
  from rental_enquiries where id = p_enquiry_id;
end;
$$;

create or replace function public.admin_reject_enquiry(p_enquiry_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may reject enquiries';
  end if;
  update rental_enquiries set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), message = coalesce(message, '') || E'\n\n[Rejected: ' || p_reason || ']' where id = p_enquiry_id;

  insert into notifications (profile_id, type, title, body, link_url)
  select organizer_id, 'error', 'Your rental request was declined',
    format('Reason: %s. Contact support if you have questions.', p_reason), '/dashboard/subscription'
  from rental_enquiries where id = p_enquiry_id;
end;
$$;

create or replace function public.admin_suspend_subscription(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may suspend subscriptions';
  end if;
  update subscriptions set status = 'past_due' where id = p_subscription_id;
  update tournaments set status = 'suspended' where subscription_id = p_subscription_id;
end;
$$;

create or replace function public.admin_extend_subscription(p_subscription_id uuid, p_days int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_end timestamptz;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may extend subscriptions';
  end if;
  update subscriptions set ends_at = ends_at + (p_days || ' days')::interval, status = 'active'
  where id = p_subscription_id
  returning ends_at into new_end;

  update tournaments set rental_ends_at = new_end, status = 'active' where subscription_id = p_subscription_id;

  insert into notifications (profile_id, type, title, body, link_url)
  select organizer_id, 'success', 'Your rental was extended', format('Your rental now runs until %s.', new_end::date), '/dashboard/subscription'
  from subscriptions where id = p_subscription_id;
end;
$$;

create sequence if not exists invoice_number_seq start 1;

create or replace function public.admin_generate_invoice(
  p_organizer_id uuid, p_subscription_id uuid, p_plan_name text,
  p_amount_cents bigint, p_discount_cents bigint, p_gst_cents bigint, p_status payment_status default 'pending'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_invoice_id uuid;
  invoice_num text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may generate invoices';
  end if;

  invoice_num := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('invoice_number_seq')::text, 5, '0');

  insert into invoices (invoice_number, organizer_id, subscription_id, plan_name, amount_cents, discount_cents, gst_cents, total_cents, status, due_date)
  values (invoice_num, p_organizer_id, p_subscription_id, p_plan_name, p_amount_cents, p_discount_cents, p_gst_cents,
          p_amount_cents - p_discount_cents + p_gst_cents, p_status, current_date + 7)
  returning id into new_invoice_id;

  insert into notifications (profile_id, type, title, body, link_url)
  values (p_organizer_id, 'info', 'New invoice generated', format('Invoice %s is ready.', invoice_num), '/dashboard/invoices');

  return new_invoice_id;
end;
$$;

create or replace function public.admin_expiring_subscriptions(p_within_days int default 30)
returns table (
  subscription_id uuid, organizer_name text, plan_name text, ends_at timestamptz, days_remaining int
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, p.full_name, rp.name, s.ends_at, extract(day from s.ends_at - now())::int
  from subscriptions s
  join profiles p on p.id = s.organizer_id
  join rental_plans rp on rp.id = s.plan_id
  where public.is_super_admin()
    and s.status = 'active'
    and s.ends_at <= now() + (p_within_days || ' days')::interval
  order by s.ends_at asc;
$$;

create or replace function public.admin_business_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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
    'monthly_revenue', (select coalesce(sum(total_cents), 0) from invoices where status in ('succeeded','paid') and issue_date >= date_trunc('month', current_date)),
    'pending_renewals', (select count(*) from rental_enquiries where status = 'pending' and tournament_id is not null),
    'total_invoices', (select count(*) from invoices)
  ) into result;

  return result;
end;
$$;
