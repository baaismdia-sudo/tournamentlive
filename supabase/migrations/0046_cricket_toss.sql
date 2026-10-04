-- =========================================================================
-- 0046_cricket_toss.sql
-- Adds a toss step before the first innings. Stored in live_scores.sport_state
-- (same pattern as the rest of cricket's live state) rather than new matches
-- columns, since it's cricket-specific and sport_state already exists for
-- exactly this. The coin flip itself happens client-side; this just persists
-- the result so it survives a reload and the scorekeeper isn't forced to
-- redo it, and so the chosen batting team carries into start_cricket_innings.
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

  insert into public.live_scores (match_id, home_score, away_score, is_live, sport_state, last_updated_by, updated_at)
  values (p_match_id, 0, 0, false, v_state, auth.uid(), now())
  on conflict (match_id) do update
    set sport_state = v_state, last_updated_by = auth.uid(), updated_at = now();

  return v_state;
end;
$function$;

-- Carry the toss result forward when the first innings actually starts, so
-- it stays on record (visible to the public Umpire View etc) alongside the
-- live scoring state rather than being overwritten.
create or replace function public.start_cricket_innings(
  p_match_id uuid,
  p_innings integer,
  p_batting_team_id uuid,
  p_bowling_team_id uuid,
  p_striker_id uuid,
  p_non_striker_id uuid,
  p_bowler_id uuid,
  p_total_overs numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tournament_id uuid;
  v_prev_state jsonb;
  v_target integer;
  v_new_state jsonb;
  v_innings_totals jsonb;
begin
  select tournament_id into v_tournament_id from public.matches where id = p_match_id;
  if v_tournament_id is null then
    raise exception 'Match not found';
  end if;
  if not public.is_tournament_scorekeeper(v_tournament_id) then
    raise exception 'Only an assigned scorekeeper or manager may start an innings';
  end if;

  select sport_state into v_prev_state from public.live_scores where match_id = p_match_id;
  v_prev_state := coalesce(v_prev_state, '{}'::jsonb);
  v_innings_totals := coalesce(v_prev_state->'innings_totals', '{}'::jsonb);

  v_target := null;
  if p_innings = 2 then
    -- v_prev_state here is innings 1's final live state (this function is
    -- called right after innings 1 completes, before anything else writes
    -- to live_scores) — read the target straight from it rather than a
    -- separately-tracked total, which is simpler and can't drift out of sync.
    v_target := coalesce((v_prev_state->>'runs')::int, 0) + 1;
    v_innings_totals := jsonb_set(v_innings_totals, array['1'], jsonb_build_object(
      'runs', coalesce((v_prev_state->>'runs')::int, 0),
      'wickets', coalesce((v_prev_state->>'wickets')::int, 0),
      'overs', coalesce(v_prev_state->>'over', '0') || '.' || coalesce(v_prev_state->>'ball', '0'),
      'team_id', v_prev_state->>'batting_team_id'
    ));
  end if;

  v_new_state := jsonb_build_object(
    'innings', p_innings,
    'batting_team_id', p_batting_team_id,
    'bowling_team_id', p_bowling_team_id,
    'striker_id', p_striker_id,
    'non_striker_id', p_non_striker_id,
    'bowler_id', p_bowler_id,
    'total_overs', p_total_overs,
    'over', 0,
    'ball', 0,
    'runs', 0,
    'wickets', 0,
    'extras', jsonb_build_object('wide', 0, 'no_ball', 0, 'bye', 0, 'leg_bye', 0),
    'target', v_target,
    'free_hit', false,
    'awaiting_new_batter', false,
    'awaiting_new_bowler', false,
    'innings_complete', false,
    'current_over_balls', '[]'::jsonb,
    'batters', jsonb_build_object(
      p_striker_id, jsonb_build_object('runs', 0, 'balls', 0, 'fours', 0, 'sixes', 0, 'out', false),
      p_non_striker_id, jsonb_build_object('runs', 0, 'balls', 0, 'fours', 0, 'sixes', 0, 'out', false)
    ),
    'bowlers', jsonb_build_object(
      p_bowler_id, jsonb_build_object('balls', 0, 'runs', 0, 'wickets', 0, 'maidens', 0)
    ),
    'innings_totals', v_innings_totals,
    'toss', coalesce(v_prev_state->'toss', 'null'::jsonb)
  );

  insert into public.live_scores (match_id, home_score, away_score, is_live, sport_state, last_updated_by, updated_at)
  values (p_match_id, 0, 0, true, v_new_state, auth.uid(), now())
  on conflict (match_id) do update
    set sport_state = v_new_state, is_live = true, last_updated_by = auth.uid(), updated_at = now();

  return v_new_state;
end;
$function$;
