// Shared between CricketScorerPanel (scorekeeper) and CricketUmpireView
// (public live page) so the two can never drift out of sync on what the
// live_scores.sport_state shape means.

export interface CricketState {
  phase?: "toss_done";
  toss?: { winner_team_id: string; call: string; result: string; decision: "bat" | "bowl" } | null;
  innings?: number;
  batting_team_id: string;
  bowling_team_id: string;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  total_overs: number | null;
  over: number;
  ball: number;
  runs: number;
  wickets: number;
  extras: { wide: number; no_ball: number; bye: number; leg_bye: number };
  target: number | null;
  free_hit: boolean;
  awaiting_new_batter: boolean;
  awaiting_new_bowler: boolean;
  innings_complete: boolean;
  current_over_balls: { label: string; runs: number; type: string; wicket: boolean }[];
  batters: Record<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean }>;
  bowlers: Record<string, { balls: number; runs: number; wickets: number; maidens: number }>;
  innings_totals?: Record<string, { runs: number; wickets: number; overs: string; team_id: string }>;
}

export function ballDot(b: { type: string; runs: number; wicket: boolean }) {
  if (b.wicket) return { text: "W", cls: "bg-[var(--color-danger)] text-white" };
  if (b.type === "wide") return { text: "wd" + (b.runs > 1 ? `+${b.runs - 1}` : ""), cls: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]" };
  if (b.type === "no_ball") return { text: "nb" + (b.runs > 1 ? `+${b.runs - 1}` : ""), cls: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]" };
  if (b.type === "bye" || b.type === "leg_bye") return { text: String(b.runs), cls: "bg-[var(--color-info)]/15 text-[var(--color-info)]" };
  if (b.runs === 4) return { text: "4", cls: "bg-[var(--color-success)]/15 text-[var(--color-success)] font-bold" };
  if (b.runs === 6) return { text: "6", cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold" };
  return { text: String(b.runs), cls: "bg-[var(--color-surface-secondary)] text-[var(--color-text)]" };
}

export function oversDisplay(state: Pick<CricketState, "over" | "ball">) {
  return `${state.over}.${state.ball}`;
}

export function runRate(state: Pick<CricketState, "runs" | "over" | "ball">) {
  const legalBalls = state.over * 6 + state.ball;
  return legalBalls > 0 ? (state.runs / (legalBalls / 6)).toFixed(2) : "0.00";
}
