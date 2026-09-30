-- =========================================================================
-- 0044_invite_tournament_staff_rpc.sql
-- Lets an organizer invite an EXISTING TournamentLive account (by email) as
-- staff on one of their tournaments. There is no email-sending
-- infrastructure in this app, so this cannot create a brand-new account —
-- the invitee must already have signed up. What it does:
--   1. Verifies the caller actually owns/runs the target tournament.
--   2. Looks up the invitee's existing profile by email.
--   3. Refuses to hijack an account that already runs its own tournaments,
--      or is already staff for a different organizer, or is a super_admin.
--   4. Links the invitee to this organizer (profiles.organizer_id) and
--      sets their role, so they get real RLS access to this organizer's
--      matches/teams/etc — not just a record in the assignments table.
--   5. Records the per-tournament role in tournament_staff_assignments.
-- =========================================================================

create or replace function public.invite_tournament_staff(
  p_email text,
  p_role text,
  p_tournament_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_organizer_id uuid := public.effective_organizer_id();
  v_target_id uuid;
  v_target_role text;
  v_target_organizer_id uuid;
  v_target_name text;
  v_owns_tournaments boolean;
  v_role_id uuid;
begin
  if p_role not in ('manager', 'scorekeeper', 'commentator') then
    raise exception 'Invalid staff role: %', p_role;
  end if;

  if not public.is_tournament_staff(p_tournament_id) then
    raise exception 'Not authorized to invite staff for this tournament';
  end if;

  select p.id, r.name, p.organizer_id, p.full_name
    into v_target_id, v_target_role, v_target_organizer_id, v_target_name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where lower(p.email) = lower(p_email) and p.deleted_at is null;

  if v_target_id is null then
    raise exception 'No TournamentLive account found for that email — ask them to sign up first, then invite them.';
  end if;

  if v_target_id = v_organizer_id then
    raise exception 'You cannot invite yourself';
  end if;

  if v_target_role = 'super_admin' then
    raise exception 'This account cannot be assigned as tournament staff';
  end if;

  if v_target_organizer_id is not null and v_target_organizer_id != v_organizer_id then
    raise exception 'This account is already staff for a different organizer';
  end if;

  if v_target_organizer_id is null then
    select exists(select 1 from public.tournaments t where t.organizer_id = v_target_id) into v_owns_tournaments;
    if v_owns_tournaments then
      raise exception 'This account already runs its own tournaments — have them create a separate account for staff work instead';
    end if;
  end if;

  select id into v_role_id from public.roles where name = p_role;

  update public.profiles
  set organizer_id = v_organizer_id, role_id = v_role_id
  where id = v_target_id;

  delete from public.tournament_staff_assignments
  where tournament_id = p_tournament_id and profile_id = v_target_id;

  insert into public.tournament_staff_assignments (tournament_id, profile_id, role_in_tournament, assigned_by)
  values (p_tournament_id, v_target_id, p_role, auth.uid());

  return jsonb_build_object('profile_id', v_target_id, 'full_name', v_target_name, 'role', p_role);
end;
$function$;
