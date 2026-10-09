-- =========================================================================
-- 0048_cricket_toss_starts_match.sql
-- Root-cause fix for a crash: a "Start match" button called the generic
-- startMatch() service for cricket matches too, which upserts live_scores
-- WITHOUT setting sport_state — so it silently took the column default
-- ('{}'::jsonb) instead of null. The scorer panel's "has an innings
-- started?" check only handled null, not {}, so it fell through every
-- guard and crashed on state.current_over_balls.length (undefined on {}).
--
-- Fix: record_cricket_toss is the true first action for a cricket match
-- now (it already builds a complete, well-formed state object) — it also
-- transitions matches.status to 'live', so the separate generic "Start
-- match" button is no longer shown or needed for cricket at all.
-- =========================================================================

create or replace function public.record_cricket_toss(
  p_match_id uuid,
  p_toss_winner_team_id uuid,
  p_toss_call text,
  p_toss_result text,
  p_decision text,
  p_home_team_id uuid,
  p_away_team_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tournament_id uuid;
  v_batting_team_id uuid;
  v_bowling_team_id uuid;
  v_state jsonb;
begin
  select tournament_id into v_tournament_id from public.matches where id = p_match_id;
  if v_tournament_id is null then
    raise exception 'Match not found';
  end if;
  if not public.is_tournament_scorekeeper(v_tournament_id) then
    raise exception 'Only an assigned scorekeeper or manager may record the toss';
  end if;
  if p_decision not in ('bat', 'bowl') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  if p_decision = 'bat' then
    v_batting_team_id := p_toss_winner_team_id;
  else
    v_batting_team_id := case when p_toss_winner_team_id = p_home_team_id then p_away_team_id else p_home_team_id end;
  end if;
  v_bowling_team_id := case when v_batting_team_id = p_home_team_id then p_away_team_id else p_home_team_id end;

  v_state := jsonb_build_object(
    'phase', 'toss_done',
    'toss', jsonb_build_object(
      'winner_team_id', p_toss_winner_team_id, 'call', p_toss_call, 'result', p_toss_result, 'decision', p_decision
    ),
    'batting_team_id', v_batting_team_id,
    'bowling_team_id', v_bowling_team_id
  );

  update public.matches
    set status = 'live', started_at = coalesce(started_at, now())
    where id = p_match_id and status = 'scheduled';

  insert into public.live_scores (match_id, home_score, away_score, is_live, sport_state, last_updated_by, updated_at)
  values (p_match_id, 0, 0, false, v_state, auth.uid(), now())
  on conflict (match_id) do update
    set sport_state = v_state, last_updated_by = auth.uid(), updated_at = now();

  return v_state;
end;
$function$;
