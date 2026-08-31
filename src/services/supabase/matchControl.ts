import { supabase } from "../../lib/supabaseClient";

export async function startMatch(matchId: string) {
  await supabase.from("matches").update({ status: "live", started_at: new Date().toISOString() }).eq("id", matchId);
  await supabase.from("live_scores").upsert(
    { match_id: matchId, is_live: true, clock_status: "running", clock_started_at: new Date().toISOString() },
    { onConflict: "match_id" }
  );
}

export async function pauseClock(matchId: string, currentElapsedSeconds: number) {
  await supabase.from("live_scores").update({ clock_status: "paused", clock_elapsed_seconds: currentElapsedSeconds, clock_started_at: null }).eq("match_id", matchId);
}

export async function resumeClock(matchId: string) {
  await supabase.from("live_scores").update({ clock_status: "running", clock_started_at: new Date().toISOString() }).eq("match_id", matchId);
}

export async function setMatchStatus(matchId: string, status: string) {
  await supabase.from("matches").update({ status }).eq("id", matchId);
  await supabase.from("live_scores").update({ period: status.replace("_", " ") }).eq("match_id", matchId);
}

export async function endMatch(matchId: string, homeScore: number, awayScore: number) {
  const winnerField =
    homeScore > awayScore ? { winner_field: "home" } : awayScore > homeScore ? { winner_field: "away" } : { winner_field: null };
  await supabase.from("matches").update({
    status: "completed",
    ended_at: new Date().toISOString(),
    home_score: homeScore,
    away_score: awayScore,
  }).eq("id", matchId);
  await supabase.from("live_scores").update({ is_live: false, clock_status: "stopped" }).eq("match_id", matchId);
  void winnerField;
}

export async function addAddedTime(matchId: string, seconds: number) {
  const { data } = await supabase.from("live_scores").select("added_time_seconds").eq("match_id", matchId).single();
  await supabase.from("live_scores").update({ added_time_seconds: (data?.added_time_seconds ?? 0) + seconds }).eq("match_id", matchId);
}

export interface LogEventInput {
  matchId: string;
  teamId?: string;
  playerId?: string;
  eventType: string;
  minute?: number;
  description?: string;
  value?: number;
  scoreDelta?: number;
  scoringTeam?: "home" | "away";
}

/**
 * Logs the event, then applies its score delta to both matches (final
 * score of record) and live_scores (what viewers see in realtime) in the
 * same call, so the scoreboard and the event that caused it never drift
 * apart. player_statistics updates itself via the apply_event_statistics
 * trigger — this function doesn't need to know the stat mapping.
 */
/**
 * Logs the event and applies its score delta atomically at the database
 * level (via the log_match_event_atomic RPC), so concurrent/rapid taps
 * can never overwrite each other's score changes. Do not replace this
 * with a client-side read-current-score-then-write pattern — that is
 * what caused scores to get stuck instead of incrementing.
 */
export async function logMatchEvent(input: LogEventInput) {
  const { data, error } = await supabase.rpc("log_match_event_atomic", {
    p_match_id: input.matchId,
    p_team_id: input.teamId ?? null,
    p_player_id: input.playerId ?? null,
    p_event_type: input.eventType,
    p_minute: input.minute ?? null,
    p_description: input.description ?? null,
    p_value: input.value ?? 1,
    p_score_delta: input.scoreDelta ?? null,
    p_scoring_team: input.scoringTeam ?? null,
  });
  if (error) throw error;
  return data;
}

export async function undoEvent(eventId: string) {
  const { error } = await supabase.rpc("undo_match_event", { p_event_id: eventId });
  if (error) throw error;
}

export async function postCommentary(matchId: string, authorId: string, message: string, minute?: number) {
  const { error } = await supabase.from("commentary").insert({ match_id: matchId, author_id: authorId, message, minute: minute ?? null });
  if (error) throw error;
}

export async function updateSportState(matchId: string, sportState: Record<string, unknown>) {
  await supabase.from("live_scores").update({ sport_state: sportState }).eq("match_id", matchId);
}
