-- =========================================================================
-- 0033_domain_approval_and_white_label_rpcs.sql
-- =========================================================================
create or replace function public.admin_approve_domain(p_domain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may approve domains';
  end if;
  update custom_domains
  set verification_status = 'verified', ssl_status = 'active', approved_by = auth.uid(), approved_at = now(), rejection_reason = null
  where id = p_domain_id;
end;
$$;

create or replace function public.admin_reject_domain(p_domain_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may reject domains';
  end if;
  update custom_domains
  set verification_status = 'failed', approved_by = auth.uid(), approved_at = now(), rejection_reason = p_reason
  where id = p_domain_id;
end;
$$;

create or replace function public.admin_set_white_label(p_organizer_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may toggle white label';
  end if;
  update profiles set white_label_enabled = p_enabled where id = p_organizer_id;
end;
$$;

create or replace function public.admin_set_custom_css_access(p_organizer_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins may toggle custom CSS access';
  end if;
  update profiles set custom_css_enabled = p_enabled where id = p_organizer_id;
end;
$$;
