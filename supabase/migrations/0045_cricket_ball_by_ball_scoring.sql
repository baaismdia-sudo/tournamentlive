-- =========================================================================
-- 0045_cricket_ball_by_ball_scoring.sql
-- Ball-by-ball cricket scoring. Cricket's live state (innings, overs, current
-- batters/bowler, extras, target) is kept in the existing live_scores.sport_state
-- jsonb column rather than new tables — it already exists for exactly this.
-- Each delivery is logged as a match_events row (event_type = 'cricket_delivery')
-- with the full delivery detail AND a snapshot of sport_state from just before
-- the delivery, so undo is a simple, always-correct restore rather than
-- reverse-calculated cricket logic.
--
-- Simplifications (documented, not silently done): no free-hit dismissal
-- restrictions are enforced (free_hit is tracked and shown, not enforced);
-- DRS / retired hurt / retired out / penalty runs are logged as plain
-- timeline notes via the existing log_match_event_atomic, not modeled in
-- sport_state; end-of-match aggregate stats are not written back to
-- player_statistics — the durable record is the match_events delivery log
-- plus the final sport_state snapshot.
-- =========================================================================

alter table public.match_events add column if not exists metadata jsonb not null default '{}';

-- ---------------------------------------------------------------------
-- start_cricket_innings — (re)initializes live cricket state for an
-- innings: openers, opening bowler, overs limit, and (for innings 2)
-- the target to chase.
-- ---------------------------------------------------------------------
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

  v_target := null;
  if p_innings = 2 then
    v_target := coalesce((v_prev_state #>> '{innings_totals,1,runs}')::int, 0) + 1;
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
    -- carry innings 1's totals forward so innings 2 can show the target/comparison
    'innings_totals', coalesce(v_prev_state->'innings_totals', '{}'::jsonb)
  );

  insert into public.live_scores (match_id, home_score, away_score, is_live, sport_state, last_updated_by, updated_at)
  values (p_match_id, 0, 0, true, v_new_state, auth.uid(), now())
  on conflict (match_id) do update
    set sport_state = v_new_state, is_live = true, last_updated_by = auth.uid(), updated_at = now();

  return v_new_state;
end;
$function$;

-- ---------------------------------------------------------------------
-- log_cricket_delivery — records one ball and applies cricket scoring
-- rules automatically (strike rotation, over completion, extras,
-- wickets). p_delivery_type is one of: run, wide, no_ball, bye, leg_bye.
-- p_runs is: runs off the bat for 'run', additional run(s) completed by
-- the batters for 'wide', bat runs for 'no_ball', or extras runs for
-- 'bye'/'leg_bye'.
-- ---------------------------------------------------------------------
create or replace function public.log_cricket_delivery(
  p_match_id uuid,
  p_delivery_type text,
  p_runs integer default 0,
  p_is_wicket boolean default false,
  p_wicket_type text default null,
  p_dismissed_player_id uuid default null,
  p_fielder_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tournament_id uuid;
  v_home_team_id uuid;
  v_prev_state jsonb;
  v_state jsonb;
  v_is_legal boolean;
  v_extra_team_runs integer := 0;
  v_bat_runs integer := 0;
  v_bowler_runs integer := 0;
  v_striker uuid;
  v_non_striker uuid;
  v_bowler uuid;
  v_batting_team uuid;
  v_scoring_team_label text;
  v_total_delivery_runs integer;
  v_rotate boolean := false;
  v_event_id uuid;
  v_ball_label text;
begin
  select tournament_id, home_team_id into v_tournament_id, v_home_team_id from public.matches where id = p_match_id;
  if v_tournament_id is null then
    raise exception 'Match not found';
  end if;
  if not public.is_tournament_scorekeeper(v_tournament_id) then
    raise exception 'Only an assigned scorekeeper or manager may log deliveries';
  end if;
  if p_delivery_type not in ('run', 'wide', 'no_ball', 'bye', 'leg_bye') then
    raise exception 'Invalid delivery type: %', p_delivery_type;
  end if;

  select sport_state into v_prev_state from public.live_scores where match_id = p_match_id for update;
  if v_prev_state is null then
    raise exception 'No innings in progress — start an innings first';
  end if;
  if coalesce((v_prev_state->>'awaiting_new_batter')::boolean, false) then
    raise exception 'Select the new batter before scoring the next delivery';
  end if;
  if coalesce((v_prev_state->>'awaiting_new_bowler')::boolean, false) then
    raise exception 'Select the next bowler before scoring the next delivery';
  end if;

  v_state := v_prev_state;
  v_striker := (v_state->>'striker_id')::uuid;
  v_non_striker := (v_state->>'non_striker_id')::uuid;
  v_bowler := (v_state->>'bowler_id')::uuid;
  v_batting_team := (v_state->>'batting_team_id')::uuid;

  -- ---- apply delivery-type rules ----
  if p_delivery_type = 'run' then
    v_is_legal := true;
    v_bat_runs := coalesce(p_runs, 0);
    v_bowler_runs := v_bat_runs;
    v_rotate := (v_bat_runs % 2) = 1;
    v_state := jsonb_set(v_state, array['batters', v_striker::text, 'runs'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'runs'])::int,0) + v_bat_runs));
    v_state := jsonb_set(v_state, array['batters', v_striker::text, 'balls'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'balls'])::int,0) + 1));
    if v_bat_runs = 4 then
      v_state := jsonb_set(v_state, array['batters', v_striker::text, 'fours'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'fours'])::int,0) + 1));
    elsif v_bat_runs = 6 then
      v_state := jsonb_set(v_state, array['batters', v_striker::text, 'sixes'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'sixes'])::int,0) + 1));
    end if;
    v_state := jsonb_set(v_state, array['bowlers', v_bowler::text, 'balls'], to_jsonb(coalesce((v_state#>>array['bowlers', v_bowler::text, 'balls'])::int,0) + 1));
    v_state := jsonb_set(v_state, array['bowlers', v_bowler::text, 'runs'], to_jsonb(coalesce((v_state#>>array['bowlers', v_bowler::text, 'runs'])::int,0) + v_bowler_runs));

  elsif p_delivery_type = 'wide' then
    v_is_legal := false;
    v_extra_team_runs := 1 + coalesce(p_runs, 0);
    v_bowler_runs := v_extra_team_runs;
    v_rotate := (coalesce(p_runs, 0) % 2) = 1;
    v_state := jsonb_set(v_state, array['extras', 'wide'], to_jsonb(coalesce((v_state#>>array['extras','wide'])::int,0) + v_extra_team_runs));
    v_state := jsonb_set(v_state, array['bowlers', v_bowler::text, 'runs'], to_jsonb(coalesce((v_state#>>array['bowlers', v_bowler::text, 'runs'])::int,0) + v_bowler_runs));

  elsif p_delivery_type = 'no_ball' then
    v_is_legal := false;
    v_bat_runs := coalesce(p_runs, 0);
    v_extra_team_runs := 1;
    v_bowler_runs := 1 + v_bat_runs;
    v_rotate := (v_bat_runs % 2) = 1;
    v_state := jsonb_set(v_state, array['extras', 'no_ball'], to_jsonb(coalesce((v_state#>>array['extras','no_ball'])::int,0) + 1));
    v_state := jsonb_set(v_state, array['batters', v_striker::text, 'runs'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'runs'])::int,0) + v_bat_runs));
    v_state := jsonb_set(v_state, array['batters', v_striker::text, 'balls'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'balls'])::int,0) + 1));
    if v_bat_runs = 4 then
      v_state := jsonb_set(v_state, array['batters', v_striker::text, 'fours'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'fours'])::int,0) + 1));
    elsif v_bat_runs = 6 then
      v_state := jsonb_set(v_state, array['batters', v_striker::text, 'sixes'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'sixes'])::int,0) + 1));
    end if;
    v_state := jsonb_set(v_state, array['bowlers', v_bowler::text, 'runs'], to_jsonb(coalesce((v_state#>>array['bowlers', v_bowler::text, 'runs'])::int,0) + v_bowler_runs));
    v_state := jsonb_set(v_state, '{free_hit}', 'true'::jsonb);

  elsif p_delivery_type in ('bye', 'leg_bye') then
    v_is_legal := true;
    v_extra_team_runs := coalesce(p_runs, 0);
    v_rotate := (v_extra_team_runs % 2) = 1;
    v_state := jsonb_set(v_state, array['extras', p_delivery_type], to_jsonb(coalesce((v_state#>>array['extras', p_delivery_type])::int,0) + v_extra_team_runs));
    v_state := jsonb_set(v_state, array['batters', v_striker::text, 'balls'], to_jsonb(coalesce((v_state#>>array['batters', v_striker::text, 'balls'])::int,0) + 1));
    v_state := jsonb_set(v_state, array['bowlers', v_bowler::text, 'balls'], to_jsonb(coalesce((v_state#>>array['bowlers', v_bowler::text, 'balls'])::int,0) + 1));
    if p_delivery_type = 'run' then null; end if; -- (no-op, kept for clarity of branch list)
  end if;

  if p_delivery_type <> 'no_ball' then
    v_state := jsonb_set(v_state, '{free_hit}', 'false'::jsonb);
  end if;

  v_total_delivery_runs := v_bat_runs + v_extra_team_runs;
  v_state := jsonb_set(v_state, '{runs}', to_jsonb(coalesce((v_state->>'runs')::int,0) + v_total_delivery_runs));

  -- ---- wicket ----
  if p_is_wicket then
    if p_wicket_type is null or p_dismissed_player_id is null then
      raise exception 'Wicket type and dismissed player are required';
    end if;
    v_state := jsonb_set(v_state, '{wickets}', to_jsonb(coalesce((v_state->>'wickets')::int,0) + 1));
    v_state := jsonb_set(v_state, array['batters', p_dismissed_player_id::text, 'out'], 'true'::jsonb);
    if p_wicket_type in ('bowled', 'caught', 'lbw', 'stumped', 'hit_wicket') then
      v_state := jsonb_set(v_state, array['bowlers', v_bowler::text, 'wickets'], to_jsonb(coalesce((v_state#>>array['bowlers', v_bowler::text, 'wickets'])::int,0) + 1));
    end if;
    -- open the striker/non-striker slot the dismissed batter occupied
    if p_dismissed_player_id = v_striker then
      v_state := jsonb_set(v_state, '{striker_id}', 'null'::jsonb);
    else
      v_state := jsonb_set(v_state, '{non_striker_id}', 'null'::jsonb);
    end if;
    v_state := jsonb_set(v_state, '{awaiting_new_batter}', 'true'::jsonb);
  end if;

  -- ---- over / ball tracking + strike rotation (only on legal deliveries) ----
  if v_is_legal then
    v_state := jsonb_set(v_state, '{ball}', to_jsonb(coalesce((v_state->>'ball')::int,0) + 1));
  end if;

  v_ball_label := (v_state->>'over') || '.' || greatest(coalesce((v_state->>'ball')::int,0), 0);

  if v_rotate and not p_is_wicket then
    v_state := jsonb_set(
      jsonb_set(v_state, '{striker_id}', coalesce(v_state->'non_striker_id', 'null'::jsonb)),
      '{non_striker_id}', coalesce(v_prev_state->'striker_id', 'null'::jsonb)
    );
  end if;

  if v_is_legal and coalesce((v_state->>'ball')::int,0) >= 6 then
    v_state := jsonb_set(v_state, '{over}', to_jsonb(coalesce((v_state->>'over')::int,0) + 1));
    v_state := jsonb_set(v_state, '{ball}', '0'::jsonb);
    v_state := jsonb_set(v_state, '{current_over_balls}', '[]'::jsonb);
    v_state := jsonb_set(v_state, '{awaiting_new_bowler}', 'true'::jsonb);
    -- end of over: ends change regardless of the last ball's run parity
    if not p_is_wicket then
      v_state := jsonb_set(
        jsonb_set(v_state, '{striker_id}', coalesce(v_state->'non_striker_id', 'null'::jsonb)),
        '{non_striker_id}', coalesce(v_state->'striker_id', 'null'::jsonb)
      );
    end if;
  else
    v_state := jsonb_set(
      v_state,
      '{current_over_balls}',
      coalesce(v_state->'current_over_balls', '[]'::jsonb) || jsonb_build_object(
        'label', v_ball_label, 'runs', v_total_delivery_runs, 'type', p_delivery_type, 'wicket', p_is_wicket
      )
    );
  end if;

  -- all-out check
  if (select count(*) from jsonb_object_keys(v_state->'batters') k where (v_state#>>array['batters', k, 'out'])::boolean is true) + 1
     >= (select count(distinct player_id) from public.players where team_id = v_batting_team and deleted_at is null) then
    v_state := jsonb_set(v_state, '{innings_complete}', 'true'::jsonb);
  end if;
  if (v_state->>'total_overs') is not null and (v_state->>'over')::numeric >= (v_state->>'total_overs')::numeric then
    v_state := jsonb_set(v_state, '{innings_complete}', 'true'::jsonb);
  end if;

  v_scoring_team_label := case when v_batting_team = v_home_team_id then 'home' else 'away' end;

  update public.live_scores
    set sport_state = v_state, last_updated_by = auth.uid(), updated_at = now(),
        home_score = case when v_scoring_team_label = 'home' then (v_state->>'runs')::int else home_score end,
        away_score = case when v_scoring_team_label = 'away' then (v_state->>'runs')::int else away_score end
  where match_id = p_match_id;

  update public.matches m
    set home_score = ls.home_score, away_score = ls.away_score
    from public.live_scores ls
    where ls.match_id = p_match_id and m.id = p_match_id;

  insert into public.match_events (
    match_id, team_id, player_id, event_type, description, value, score_delta, scoring_team, created_by, metadata
  ) values (
    p_match_id, v_batting_team, v_striker, 'cricket_delivery',
    v_ball_label || ' · ' || p_delivery_type || case when p_is_wicket then ' · WICKET' else '' end,
    v_total_delivery_runs, v_total_delivery_runs, v_scoring_team_label, auth.uid(),
    jsonb_build_object(
      'delivery_type', p_delivery_type, 'runs', p_runs, 'is_wicket', p_is_wicket,
      'wicket_type', p_wicket_type, 'dismissed_player_id', p_dismissed_player_id, 'fielder_id', p_fielder_id,
      'ball_label', v_ball_label, 'previous_state', v_prev_state
    )
  ) returning id into v_event_id;

  return jsonb_build_object('event_id', v_event_id, 'state', v_state);
end;
$function$;

-- ---------------------------------------------------------------------
-- select_cricket_batter / select_cricket_bowler — resolve the
-- "awaiting new batter / bowler" prompts after a wicket or over completes.
-- ---------------------------------------------------------------------
create or replace function public.select_cricket_batter(p_match_id uuid, p_player_id uuid)
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
  if v_state->>'striker_id' is null then
    v_state := jsonb_set(v_state, '{striker_id}', to_jsonb(p_player_id::text));
  else
    v_state := jsonb_set(v_state, '{non_striker_id}', to_jsonb(p_player_id::text));
  end if;
  v_state := jsonb_set(v_state, array['batters', p_player_id::text], '{"runs":0,"balls":0,"fours":0,"sixes":0,"out":false}'::jsonb);
  v_state := jsonb_set(v_state, '{awaiting_new_batter}', 'false'::jsonb);

  update public.live_scores set sport_state = v_state, updated_at = now() where match_id = p_match_id;
  return v_state;
end;
$function$;

create or replace function public.select_cricket_bowler(p_match_id uuid, p_player_id uuid)
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
  v_state := jsonb_set(v_state, '{bowler_id}', to_jsonb(p_player_id::text));
  if v_state#>array['bowlers', p_player_id::text] is null then
    v_state := jsonb_set(v_state, array['bowlers', p_player_id::text], '{"balls":0,"runs":0,"wickets":0,"maidens":0}'::jsonb);
  end if;
  v_state := jsonb_set(v_state, '{awaiting_new_bowler}', 'false'::jsonb);

  update public.live_scores set sport_state = v_state, updated_at = now() where match_id = p_match_id;
  return v_state;
end;
$function$;

-- ---------------------------------------------------------------------
-- undo_cricket_delivery — restores the exact sport_state snapshot from
-- before the last delivery, rather than reverse-calculating cricket
-- logic (which is error-prone for strike rotation / over completion).
-- ---------------------------------------------------------------------
create or replace function public.undo_cricket_delivery(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tournament_id uuid;
  v_home_team_id uuid;
  ev record;
  v_prev_state jsonb;
  v_scoring_team text;
begin
  select tournament_id, home_team_id into v_tournament_id, v_home_team_id from public.matches where id = p_match_id;
  if not public.is_tournament_scorekeeper(v_tournament_id) then
    raise exception 'Not authorized';
  end if;

  select * into ev from public.match_events
  where match_id = p_match_id and event_type = 'cricket_delivery' and undone = false
  order by created_at desc limit 1;

  if not found then
    raise exception 'No delivery to undo';
  end if;

  v_prev_state := ev.metadata->'previous_state';
  v_scoring_team := ev.scoring_team;

  update public.match_events set undone = true, undone_at = now(), undone_by = auth.uid() where id = ev.id;

  update public.live_scores
    set sport_state = v_prev_state, updated_at = now(),
        home_score = case when v_scoring_team = 'home' then (v_prev_state->>'runs')::int else home_score end,
        away_score = case when v_scoring_team = 'away' then (v_prev_state->>'runs')::int else away_score end
  where match_id = p_match_id;

  update public.matches m
    set home_score = ls.home_score, away_score = ls.away_score
    from public.live_scores ls
    where ls.match_id = p_match_id and m.id = p_match_id;

  return v_prev_state;
end;
$function$;
