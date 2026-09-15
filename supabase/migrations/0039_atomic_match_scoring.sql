-- =========================================================================
-- 0039_atomic_match_scoring.sql
-- RECONSTRUCTED from the live database (original file not committed).
-- Logs a match event and updates the live score in one transaction, so a
-- scorekeeper's tap can never record an event without updating the score
-- (or vice versa) if a request fails partway through.
-- =========================================================================

create or replace function public.log_match_event_atomic(
  p_match_id uuid,
  p_team_id uuid,
  p_player_id uuid,
  p_event_type text,
  p_minute integer,
  p_description text,
  p_value numeric,
  p_score_delta integer,
  p_scoring_team text
)
returns match_events
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tournament_id uuid;
  v_event public.match_events;
begin
  select tournament_id into v_tournament_id from public.matches where id = p_match_id;
  if v_tournament_id is null then
    raise exception 'Match not found';
  end if;
  if not public.is_tournament_scorekeeper(v_tournament_id) then
    raise exception 'Only an assigned scorekeeper or manager may log match events';
  end if;

  insert into public.match_events (
    match_id, team_id, player_id, event_type, minute, description, value, score_delta, scoring_team, created_by
  ) values (
    p_match_id, p_team_id, p_player_id, p_event_type, p_minute, p_description,
    coalesce(p_value, 1), p_score_delta, p_scoring_team, auth.uid()
  ) returning * into v_event;

  if p_score_delta is not null and p_scoring_team is not null then
    if p_scoring_team = 'home' then
      update public.live_scores
        set home_score = coalesce(home_score, 0) + p_score_delta
        where match_id = p_match_id;
    elsif p_scoring_team = 'away' then
      update public.live_scores
        set away_score = coalesce(away_score, 0) + p_score_delta
        where match_id = p_match_id;
    end if;

    update public.matches m
      set home_score = ls.home_score, away_score = ls.away_score
      from public.live_scores ls
      where ls.match_id = p_match_id and m.id = p_match_id;
  end if;

  return v_event;
end;
$function$;
