-- =========================================================================
-- 0047_cricket_swap_strike.sql
-- Manual striker/non-striker swap, for when the scorekeeper needs to
-- correct the ends outside of the automatic odd-run/end-of-over rotation
-- (e.g. a mid-over correction). Separate from log_cricket_delivery's
-- automatic rotation — this is an explicit manual override.
-- =========================================================================

create or replace function public.swap_cricket_strike(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tournament_id uuid;
  v_state jsonb;
begin
  select tournament_id into v_tournament_id from public.matches where id = p_match_id;
  if not public.is_tournament_scorekeeper(v_tournament_id) then
    raise exception 'Not authorized';
  end if;

  select sport_state into v_state from public.live_scores where match_id = p_match_id for update;
  if v_state is null or v_state->>'striker_id' is null or v_state->>'non_striker_id' is null then
    raise exception 'Both ends must have a batter before swapping';
  end if;

  v_state := jsonb_set(
    jsonb_set(v_state, '{striker_id}', v_state->'non_striker_id'),
    '{non_striker_id}', v_state->'striker_id'
  );

  update public.live_scores set sport_state = v_state, updated_at = now() where match_id = p_match_id;
  return v_state;
end;
$function$;
