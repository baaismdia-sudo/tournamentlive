import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import type { LiveScoreRow } from "../hooks/useRealtimeMatch";
import { type CricketState, ballDot, oversDisplay, runRate } from "../cricket/cricketState";

interface TeamInfo { id: string; name: string; logo_url: string | null }
interface PlayerName { id: string; full_name: string }

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function CricketUmpireView({
  liveScore, homeTeam, awayTeam, players,
}: {
  liveScore: LiveScoreRow | null;
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
  players: PlayerName[];
}) {
  const state = (liveScore?.sport_state ?? null) as unknown as CricketState | null;
  const [, forceTick] = useState(0);

  // Re-render every few seconds so "Updated Xs ago" stays current without needing new data.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const nameOf = (id: string | null) => (id ? players.find((p) => p.id === id)?.full_name ?? "—" : "—");

  if (!state || state.phase === "toss_done") {
    const toss = state?.toss;
    const winnerTeam = toss?.winner_team_id === homeTeam?.id ? homeTeam : awayTeam;
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <p className="font-heading text-lg font-bold text-[var(--color-heading)]">
          {homeTeam?.name} <span className="text-[var(--color-muted)]">vs</span> {awayTeam?.name}
        </p>
        {toss ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {winnerTeam?.name} won the toss and chose to {toss.decision} first
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-muted)]">Match hasn't started yet</p>
        )}
      </div>
    );
  }

  const battingTeam = state.batting_team_id === homeTeam?.id ? homeTeam : awayTeam;
  const bowlingTeam = state.batting_team_id === homeTeam?.id ? awayTeam : homeTeam;
  const required = state.target != null ? state.target - state.runs : null;
  const ballsRemaining = state.total_overs ? state.total_overs * 6 - (state.over * 6 + state.ball) : null;

  if (state.innings_complete && state.innings === 2) {
    const result = state.target != null
      ? state.runs >= state.target ? `${battingTeam?.name} won` : `${bowlingTeam?.name} won by ${state.target - state.runs - 1} runs`
      : "Match complete";
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-secondary)] p-6 text-center">
        <p className="font-heading text-xl font-bold text-[var(--color-heading)]">{result}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{battingTeam?.name} {state.runs}/{state.wickets} ({oversDisplay(state)})</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-secondary)]">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-danger)]">
          <Radio size={12} className="animate-pulse" /> LIVE
        </span>
        <span className="text-[11px] text-[var(--color-muted)]">Updated {timeAgo(liveScore?.updated_at)}</span>
      </div>

      <div className="px-4 pb-3 pt-2 text-center">
        <p className="text-sm font-semibold text-[var(--color-heading)]">
          <span style={{ color: "var(--color-primary)" }}>{battingTeam?.name}</span>
          <span className="mx-1.5 text-[var(--color-muted)]">|</span>
          {nameOf(state.bowler_id)} <span className="text-[var(--color-success)]">bowling</span>
          <span className="mx-1.5 text-[var(--color-muted)]">·</span>
          {bowlingTeam?.name}
        </p>
      </div>

      <div className="mx-4 mb-3 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <p className="font-heading text-3xl font-black">
            <span className="text-[var(--color-success)]">{state.runs}</span>
            <span className="text-[var(--color-danger)]">/{state.wickets}</span>
          </p>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Score / Wickets ({state.innings === 2 ? "chasing" : "1st innings"})</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-2xl font-black text-[var(--color-heading)]">{oversDisplay(state)}</p>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Overs {state.total_overs ? `(${state.total_overs})` : ""}</p>
        </div>
      </div>

      {state.target != null && required != null && ballsRemaining != null && (
        <div className="mx-4 mb-3 rounded-lg bg-[var(--color-primary)]/10 px-3 py-2 text-center text-sm font-medium text-[var(--color-primary)]">
          Need {Math.max(required, 0)} run{required === 1 ? "" : "s"} from {Math.max(ballsRemaining, 0)} ball{ballsRemaining === 1 ? "" : "s"} · Target {state.target}
        </div>
      )}

      <div className="mx-4 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>{state.current_over_balls.length} of 6 balls</span>
          <span className="font-semibold text-[var(--color-heading)]">Over {state.over + 1}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {state.current_over_balls.length === 0 && <span className="text-xs text-[var(--color-muted)]">Over starting...</span>}
          {state.current_over_balls.map((b, i) => {
            const d = ballDot(b);
            return <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${d.cls}`}>{d.text}</span>;
          })}
        </div>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">CRR {runRate(state)}</p>
      </div>
    </div>
  );
}
