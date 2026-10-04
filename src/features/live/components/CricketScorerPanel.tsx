import { useMemo, useState } from "react";
import { Undo2, Zap, ChevronDown, X } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { getErrorMessage } from "../../../lib/errors";
import type { MatchRow, LiveScoreRow, MatchEventRow } from "../hooks/useRealtimeMatch";
import { type CricketState, ballDot } from "../cricket/cricketState";

interface TeamInfo { id: string; name: string; logo_url: string | null }
interface PlayerOption { id: string; full_name: string }

const WICKET_TYPES = [
  { value: "bowled", label: "Bowled" },
  { value: "caught", label: "Caught" },
  { value: "lbw", label: "LBW" },
  { value: "run_out", label: "Run Out" },
  { value: "stumped", label: "Stumped" },
  { value: "hit_wicket", label: "Hit Wicket" },
  { value: "obstructing", label: "Obstructing the Field" },
  { value: "hit_twice", label: "Hit the Ball Twice" },
];

const MORE_ACTIONS = ["DRS Review", "Retired Hurt", "Retired Out", "Injury", "Penalty Runs", "Overthrow", "Other"];

export function CricketScorerPanel({
  match, liveScore, events, homeTeam, awayTeam, homePlayers, awayPlayers, notify, refetch,
}: {
  match: MatchRow;
  liveScore: LiveScoreRow | null;
  events: MatchEventRow[];
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
  homePlayers: PlayerOption[];
  awayPlayers: PlayerOption[];
  notify: (message: string, isError?: boolean) => void;
  refetch: () => void;
}) {
  const state = (liveScore?.sport_state ?? null) as unknown as CricketState | null;
  const [isBusy, setIsBusy] = useState(false);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState<"wide" | "no_ball" | "bye" | "leg_bye" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const allPlayers = useMemo(() => [...homePlayers, ...awayPlayers], [homePlayers, awayPlayers]);
  const nameOf = (id: string | null) => (id ? allPlayers.find((p) => p.id === id)?.full_name ?? "—" : "—");

  const battingTeam = state?.batting_team_id === homeTeam?.id ? homeTeam : awayTeam;
  const bowlingTeam = state?.batting_team_id === homeTeam?.id ? awayTeam : homeTeam;
  const battingSquad = state?.batting_team_id === homeTeam?.id ? homePlayers : awayPlayers;
  const bowlingSquad = state?.batting_team_id === homeTeam?.id ? awayPlayers : homePlayers;

  const run = async (label: string, fn: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await fn();
    } catch (err) {
      notify(`${label} failed: ${getErrorMessage(err)}`, true);
    } finally {
      setIsBusy(false);
    }
  };

  const flashCard = (text: string) => {
    setFlash(text);
    setTimeout(() => setFlash(null), 1200);
  };

  const deliver = (type: "run" | "wide" | "no_ball" | "bye" | "leg_bye", runs: number, wicket?: { type: string; dismissedId: string; fielderId?: string }) =>
    run(wicket ? "Wicket" : type === "run" ? "Delivery" : type.replace("_", " "), async () => {
      const { error } = await supabase.rpc("log_cricket_delivery", {
        p_match_id: match.id,
        p_delivery_type: type,
        p_runs: runs,
        p_is_wicket: Boolean(wicket),
        p_wicket_type: wicket?.type ?? null,
        p_dismissed_player_id: wicket?.dismissedId ?? null,
        p_fielder_id: wicket?.fielderId ?? null,
      });
      if (error) throw error;
      if (runs === 4 && type === "run") flashCard("FOUR! 🏏");
      if (runs === 6 && type === "run") flashCard("SIX! 🚀");
      refetch();
    });

  const undo = () => run("Undo", async () => {
    const { error } = await supabase.rpc("undo_cricket_delivery", { p_match_id: match.id });
    if (error) throw error;
    refetch();
  });

  const pickBatter = (playerId: string) => run("Select batter", async () => {
    const { error } = await supabase.rpc("select_cricket_batter", { p_match_id: match.id, p_player_id: playerId });
    if (error) throw error;
    refetch();
  });

  const pickBowler = (playerId: string) => run("Select bowler", async () => {
    const { error } = await supabase.rpc("select_cricket_bowler", { p_match_id: match.id, p_player_id: playerId });
    if (error) throw error;
    refetch();
  });

  const logNote = (label: string) => run(label, async () => {
    const { error } = await supabase.rpc("log_match_event_atomic", {
      p_match_id: match.id, p_team_id: null, p_player_id: null, p_event_type: "note",
      p_minute: null, p_description: label, p_value: 1, p_score_delta: null, p_scoring_team: null,
    });
    if (error) throw error;
    refetch();
    setMoreOpen(false);
  });

  // ---- No toss recorded yet ----
  if (!state) {
    return (
      <TossStep
        homeTeam={homeTeam} awayTeam={awayTeam} isBusy={isBusy}
        onConfirm={(form) => run("Record toss", async () => {
          const { error } = await supabase.rpc("record_cricket_toss", {
            p_match_id: match.id,
            p_toss_winner_team_id: form.winnerTeamId,
            p_toss_call: form.call,
            p_toss_result: form.result,
            p_decision: form.decision,
            p_home_team_id: homeTeam?.id, p_away_team_id: awayTeam?.id,
          });
          if (error) throw error;
          refetch();
        })}
      />
    );
  }

  // ---- Toss done, innings 1 not started yet ----
  if (state.phase === "toss_done" && !state.innings) {
    const tossBattingTeam = state.batting_team_id === homeTeam?.id ? homeTeam : awayTeam;
    return (
      <div className="space-y-4">
        <TossSummary state={state} homeTeam={homeTeam} awayTeam={awayTeam}
          onRedo={() => run("Redo toss", async () => {
            const { error } = await supabase.from("live_scores").delete().eq("match_id", match.id);
            if (error) throw error;
            refetch();
          })}
        />
        <InningsSetup
          homeTeam={homeTeam} awayTeam={awayTeam} homePlayers={homePlayers} awayPlayers={awayPlayers}
          innings={1} isBusy={isBusy}
          forcedBattingTeamId={state.batting_team_id} forcedBowlingTeamId={state.bowling_team_id}
          battingTeamLabel={tossBattingTeam?.name}
          onStart={(form) => run("Start innings", async () => {
            const { error } = await supabase.rpc("start_cricket_innings", {
              p_match_id: match.id, p_innings: 1,
              p_batting_team_id: form.battingTeamId, p_bowling_team_id: form.bowlingTeamId,
              p_striker_id: form.strikerId, p_non_striker_id: form.nonStrikerId, p_bowler_id: form.bowlerId,
              p_total_overs: form.totalOvers,
            });
            if (error) throw error;
            refetch();
          })}
        />
      </div>
    );
  }

  // ---- Innings complete — prompt for next innings ----
  if (state.innings_complete && state.innings === 1) {
    return (
      <div className="space-y-4">
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
          <p className="font-heading text-lg font-bold text-[var(--color-heading)]">Innings 1 complete</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {battingTeam?.name}: {state.runs}/{state.wickets} ({state.over}.{state.ball} overs)
          </p>
        </div>
        <InningsSetup
          homeTeam={homeTeam} awayTeam={awayTeam} homePlayers={homePlayers} awayPlayers={awayPlayers}
          innings={2} forcedBattingTeamId={bowlingTeam?.id} forcedBowlingTeamId={battingTeam?.id}
          totalOvers={state.total_overs} isBusy={isBusy}
          onStart={(form) => run("Start innings", async () => {
            const { error } = await supabase.rpc("start_cricket_innings", {
              p_match_id: match.id, p_innings: 2,
              p_batting_team_id: form.battingTeamId, p_bowling_team_id: form.bowlingTeamId,
              p_striker_id: form.strikerId, p_non_striker_id: form.nonStrikerId, p_bowler_id: form.bowlerId,
              p_total_overs: form.totalOvers,
            });
            if (error) throw error;
            refetch();
          })}
        />
      </div>
    );
  }

  if (state.innings_complete && state.innings === 2) {
    const result = state.target != null
      ? state.runs >= state.target
        ? `${battingTeam?.name} won`
        : `${bowlingTeam?.name} won by ${state.target - state.runs - 1} runs`
      : "Match complete";
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <p className="font-heading text-xl font-bold text-[var(--color-heading)]">{result}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {battingTeam?.name} {state.runs}/{state.wickets} ({state.over}.{state.ball})
        </p>
      </div>
    );
  }

  const striker = state.striker_id ? state.batters[state.striker_id] : null;
  const nonStriker = state.non_striker_id ? state.batters[state.non_striker_id] : null;
  const bowler = state.bowler_id ? state.bowlers[state.bowler_id] : null;
  const ballsFaced = bowler ? bowler.balls : 0;
  const economy = bowler && ballsFaced > 0 ? (bowler.runs / (ballsFaced / 6)).toFixed(2) : "0.00";
  const oversStr = `${state.over}.${state.ball}`;
  const crr = state.over * 6 + state.ball > 0 ? (state.runs / ((state.over * 6 + state.ball) / 6)).toFixed(2) : "0.00";
  const ballsRemaining = state.total_overs ? state.total_overs * 6 - (state.over * 6 + state.ball) : null;
  const required = state.target != null ? state.target - state.runs : null;
  const reqRunRate = required != null && ballsRemaining ? ((required / ballsRemaining) * 6).toFixed(2) : null;

  return (
    <div className="space-y-5">
      {/* TOP MATCH STATUS */}
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-danger)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-danger)]" /> LIVE
          </span>
          <span className="text-xs text-[var(--color-muted)]">Innings {state.innings}</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-heading text-2xl font-bold text-[var(--color-heading)]">{battingTeam?.name}</p>
            <p className="font-heading text-3xl font-black text-[var(--color-primary)]">
              {state.runs}/{state.wickets} <span className="text-base font-medium text-[var(--color-muted)]">({oversStr}{state.total_overs ? ` / ${state.total_overs}` : ""})</span>
            </p>
          </div>
          <div className="text-right text-xs text-[var(--color-muted)]">
            <p>CRR: {crr}</p>
            {state.target != null && <p className="mt-0.5">Target: {state.target}</p>}
          </div>
        </div>
        {state.target != null && required != null && ballsRemaining != null && (
          <p className="mt-2 rounded-lg bg-[var(--color-primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]">
            Need {Math.max(required, 0)} run{required === 1 ? "" : "s"} from {Math.max(ballsRemaining, 0)} ball{ballsRemaining === 1 ? "" : "s"}
            {reqRunRate && <span className="ml-2 text-xs font-normal">(RRR {reqRunRate})</span>}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {battingTeam?.name} batting · {bowlingTeam?.name} bowling
          {state.free_hit && <span className="ml-2 font-semibold text-[var(--color-warning)]">FREE HIT</span>}
        </p>
      </div>

      {flash && (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-[var(--color-heading)] px-6 py-3 text-xl font-black text-white shadow-lg">
          {flash}
        </div>
      )}

      {/* AWAITING NEW BATTER / BOWLER */}
      {state.awaiting_new_batter && (
        <SelectPrompt title="Select next batter" players={battingSquad.filter((p) => !state.batters[p.id]?.out && p.id !== state.non_striker_id)} onSelect={pickBatter} isBusy={isBusy} />
      )}
      {state.awaiting_new_bowler && !state.awaiting_new_batter && (
        <SelectPrompt title="Over complete — select next bowler" players={bowlingSquad} onSelect={pickBowler} isBusy={isBusy} />
      )}

      {!state.awaiting_new_batter && !state.awaiting_new_bowler && (
        <>
          {/* OUT / BYE / UNDO — the three most-reached-for controls, together up top */}
          <div className="grid grid-cols-3 gap-2">
            <button disabled={isBusy} onClick={() => setWicketOpen(true)} className="rounded-card bg-[var(--color-danger)] py-3 text-sm font-bold text-white disabled:opacity-50">
              OUT
            </button>
            <button disabled={isBusy} onClick={() => setExtraOpen("bye")} className="rounded-card bg-[var(--color-warning)] py-3 text-sm font-bold text-white disabled:opacity-50">
              BYE
            </button>
            <button disabled={isBusy || events.filter((e) => e.event_type === "cricket_delivery" && !e.undone).length === 0} onClick={undo} className="flex items-center justify-center gap-1.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] py-3 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40">
              <Undo2 size={15} /> UNDO
            </button>
          </div>

          {/* CHOOSE BATTERS & BOWLER — compact tap-switcher */}
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Batter · Non-striker · Bowler</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-2 text-center">
                <p className="text-[9px] font-bold uppercase text-[var(--color-primary)]">Striker ⭐</p>
                <p className="truncate text-xs font-bold text-[var(--color-heading)]">{nameOf(state.striker_id)}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{striker?.runs ?? 0} ({striker?.balls ?? 0})</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] p-2 text-center">
                <p className="text-[9px] font-bold uppercase text-[var(--color-muted)]">Non-striker</p>
                <p className="truncate text-xs font-bold text-[var(--color-heading)]">{nameOf(state.non_striker_id)}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{nonStriker?.runs ?? 0} ({nonStriker?.balls ?? 0})</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] p-2 text-center">
                <p className="text-[9px] font-bold uppercase text-[var(--color-muted)]">Bowler</p>
                <p className="truncate text-xs font-bold text-[var(--color-heading)]">{nameOf(state.bowler_id)}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{bowler?.wickets ?? 0}-{bowler?.runs ?? 0} ({Math.floor(ballsFaced / 6)}.{ballsFaced % 6})</p>
              </div>
            </div>
            <button
              disabled={isBusy}
              onClick={() => run("Swap ends", async () => {
                const { error } = await supabase.rpc("swap_cricket_strike", { p_match_id: match.id });
                if (error) throw error;
                refetch();
              })}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
            >
              ⇄ Swap striker / non-striker
            </button>
            <p className="mt-1.5 text-center text-[10px] text-[var(--color-muted)]">Economy {economy} · auto-swaps on 1 or 3 runs</p>
          </div>

          {/* MAIN KEYPAD */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <button
                key={r}
                disabled={isBusy}
                onClick={() => deliver("run", r)}
                className={`rounded-card py-6 font-heading text-2xl font-black shadow-sm transition active:scale-95 disabled:opacity-50 ${
                  r === 4 ? "bg-[var(--color-success)] text-white" : r === 6 ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-heading)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* REMAINING EXTRAS */}
          <div className="grid grid-cols-3 gap-2">
            {(["wide", "no_ball", "leg_bye"] as const).map((t) => (
              <button
                key={t}
                disabled={isBusy}
                onClick={() => setExtraOpen(t)}
                className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 py-2.5 text-xs font-semibold capitalize text-[var(--color-warning)] disabled:opacity-50"
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* MORE ACTIONS */}
          <div>
            <button onClick={() => setMoreOpen((v) => !v)} className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
              <span className="flex items-center gap-1.5"><Zap size={14} /> More actions</span>
              <ChevronDown size={14} className={moreOpen ? "rotate-180" : ""} />
            </button>
            {moreOpen && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {MORE_ACTIONS.map((a) => (
                  <button key={a} onClick={() => logNote(a)} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)]">
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* OVER CONTROL */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">This over</p>
            <div className="flex flex-wrap gap-1.5">
              {state.current_over_balls.length === 0 && <span className="text-xs text-[var(--color-muted)]">No balls yet</span>}
              {state.current_over_balls.map((b, i) => {
                const d = ballDot(b);
                return <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${d.cls}`}>{d.text}</span>;
              })}
            </div>
          </div>
        </>
      )}

      {/* TIMELINE */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Ball-by-ball</p>
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
          {[...events].filter((e) => e.event_type === "cricket_delivery").reverse().slice(0, 30).map((e) => {
            const meta = (e.metadata ?? {}) as { ball_label?: string; delivery_type?: string; is_wicket?: boolean };
            return (
              <li key={e.id} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${e.undone ? "opacity-40 line-through" : ""}`}>
                <span className="font-mono text-[var(--color-muted)]">{meta.ball_label}</span>
                <span className="text-[var(--color-text)]">{e.description}</span>
              </li>
            );
          })}
          {events.filter((e) => e.event_type === "cricket_delivery").length === 0 && <li className="p-2 text-xs text-[var(--color-muted)]">No deliveries yet</li>}
        </ul>
      </div>

      {/* WICKET DIALOG */}
      {wicketOpen && (
        <WicketDialog
          strikerId={state.striker_id} nonStrikerId={state.non_striker_id} nameOf={nameOf}
          fielders={bowlingSquad} isBusy={isBusy}
          onClose={() => setWicketOpen(false)}
          onConfirm={(wicketType, dismissedId, fielderId, runsBeforeDismissal) => {
            deliver("run", runsBeforeDismissal, { type: wicketType, dismissedId, fielderId });
            setWicketOpen(false);
          }}
        />
      )}

      {/* EXTRA RUNS DIALOG */}
      {extraOpen && (
        <ExtraRunsDialog
          kind={extraOpen}
          isBusy={isBusy}
          onClose={() => setExtraOpen(null)}
          onConfirm={(runs) => {
            deliver(extraOpen, runs);
            setExtraOpen(null);
          }}
        />
      )}
    </div>
  );
}

function SelectPrompt({ title, players, onSelect, isBusy }: { title: string; players: PlayerOption[]; onSelect: (id: string) => void; isBusy: boolean }) {
  return (
    <div className="rounded-card border border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-4">
      <p className="mb-2 text-sm font-semibold text-[var(--color-heading)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <button key={p.id} disabled={isBusy} onClick={() => onSelect(p.id)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-50">
            {p.full_name}
          </button>
        ))}
        {players.length === 0 && <p className="text-xs text-[var(--color-muted)]">No available players found for this team.</p>}
      </div>
    </div>
  );
}

function WicketDialog({
  strikerId, nonStrikerId, nameOf, fielders, isBusy, onClose, onConfirm,
}: {
  strikerId: string | null; nonStrikerId: string | null; nameOf: (id: string | null) => string;
  fielders: PlayerOption[]; isBusy: boolean; onClose: () => void;
  onConfirm: (wicketType: string, dismissedId: string, fielderId: string | undefined, runsBeforeDismissal: number) => void;
}) {
  const [wicketType, setWicketType] = useState("bowled");
  const [dismissedId, setDismissedId] = useState(strikerId ?? "");
  const [fielderId, setFielderId] = useState("");
  const [runs, setRuns] = useState(0);
  const needsFielder = wicketType === "caught" || wicketType === "run_out" || wicketType === "stumped";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--color-surface)] p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-[var(--color-heading)]">Wicket</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Dismissal type</label>
        <select value={wicketType} onChange={(e) => setWicketType(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {WICKET_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>

        <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Dismissed batter</label>
        <select value={dismissedId} onChange={(e) => setDismissedId(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {strikerId && <option value={strikerId}>{nameOf(strikerId)} (striker)</option>}
          {nonStrikerId && <option value={nonStrikerId}>{nameOf(nonStrikerId)} (non-striker)</option>}
        </select>

        {needsFielder && (
          <>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Fielder</label>
            <select value={fielderId} onChange={(e) => setFielderId(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
              <option value="">Select fielder</option>
              {fielders.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </>
        )}

        {wicketType === "run_out" && (
          <>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Runs completed before the throw</label>
            <input type="number" min={0} max={6} value={runs} onChange={(e) => setRuns(Number(e.target.value))} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm" />
          </>
        )}

        <button
          disabled={isBusy || !dismissedId}
          onClick={() => onConfirm(wicketType, dismissedId, fielderId || undefined, runs)}
          className="w-full rounded-lg bg-[var(--color-danger)] py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          CONFIRM WICKET
        </button>
      </div>
    </div>
  );
}

function ExtraRunsDialog({ kind, isBusy, onClose, onConfirm }: { kind: "wide" | "no_ball" | "bye" | "leg_bye"; isBusy: boolean; onClose: () => void; onConfirm: (runs: number) => void }) {
  const label = kind === "wide" ? "Wide — additional runs run" : kind === "no_ball" ? "No Ball — runs off the bat" : kind.replace("_", " ") + " runs";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--color-surface)] p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold capitalize text-[var(--color-heading)]">{kind.replace("_", " ")}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="mb-2 text-xs text-[var(--color-muted)]">{label}</p>
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((r) => (
            <button key={r} disabled={isBusy} onClick={() => onConfirm(r)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-3 text-sm font-bold text-[var(--color-heading)] disabled:opacity-50">
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TossStep({
  homeTeam, awayTeam, isBusy, onConfirm,
}: {
  homeTeam: TeamInfo | null; awayTeam: TeamInfo | null; isBusy: boolean;
  onConfirm: (form: { winnerTeamId: string; call: string; result: string; decision: "bat" | "bowl" }) => void;
}) {
  const [callingTeamId, setCallingTeamId] = useState(homeTeam?.id ?? "");
  const [call, setCall] = useState<"heads" | "tails">("heads");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);

  const otherTeam = callingTeamId === homeTeam?.id ? awayTeam : homeTeam;
  const callingTeam = callingTeamId === homeTeam?.id ? homeTeam : awayTeam;
  const winnerTeam = result ? (result === call ? callingTeam : otherTeam) : null;

  const flip = () => {
    setFlipping(true);
    setTimeout(() => {
      setResult(Math.random() < 0.5 ? "heads" : "tails");
      setFlipping(false);
    }, 800);
  };

  if (!result) {
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
        <h3 className="mb-4 font-heading text-lg font-bold text-[var(--color-heading)]">Match Toss</h3>
        <label className="mb-1 block text-left text-xs font-medium text-[var(--color-muted)]">Calling team</label>
        <select value={callingTeamId} onChange={(e) => setCallingTeamId(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
          {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
        </select>
        <label className="mb-1 block text-left text-xs font-medium text-[var(--color-muted)]">Call</label>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <button onClick={() => setCall("heads")} className={`rounded-lg border py-2 text-sm font-semibold capitalize ${call === "heads" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text)]"}`}>Heads</button>
          <button onClick={() => setCall("tails")} className={`rounded-lg border py-2 text-sm font-semibold capitalize ${call === "tails" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text)]"}`}>Tails</button>
        </div>
        <button
          disabled={flipping || !callingTeamId}
          onClick={flip}
          className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 font-heading text-sm font-black uppercase text-yellow-900 shadow-lg transition disabled:opacity-60 ${flipping ? "animate-spin" : ""}`}
        >
          {flipping ? "" : "Flip coin"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
      <div className="mb-3 flex justify-end">
        <button onClick={() => setResult(null)} className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">↻ Redo</button>
      </div>
      <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 font-heading text-base font-black uppercase text-yellow-900 shadow-lg">
        {result}
      </div>
      <p className="font-heading text-lg font-bold text-[var(--color-heading)]">{winnerTeam?.name} won the toss</p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">Landed on {result} · Called {call}</p>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Choose</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isBusy || !winnerTeam}
          onClick={() => winnerTeam && onConfirm({ winnerTeamId: winnerTeam.id, call, result, decision: "bat" })}
          className="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 py-3 text-sm font-bold text-[var(--color-primary)] disabled:opacity-50"
        >
          Bat first
        </button>
        <button
          disabled={isBusy || !winnerTeam}
          onClick={() => winnerTeam && onConfirm({ winnerTeamId: winnerTeam.id, call, result, decision: "bowl" })}
          className="rounded-lg border border-[var(--color-border)] py-3 text-sm font-bold text-[var(--color-text)] disabled:opacity-50"
        >
          Bowl first
        </button>
      </div>
    </div>
  );
}

function TossSummary({ state, homeTeam, awayTeam, onRedo }: { state: CricketState; homeTeam: TeamInfo | null; awayTeam: TeamInfo | null; onRedo: () => void }) {
  const winnerTeam = state.toss?.winner_team_id === homeTeam?.id ? homeTeam : awayTeam;
  return (
    <div className="flex items-center justify-between rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-sm text-[var(--color-text)]">
        <b>{winnerTeam?.name}</b> won the toss and chose to <b>{state.toss?.decision}</b> first
      </p>
      <button onClick={onRedo} className="whitespace-nowrap text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">↻ Redo toss</button>
    </div>
  );
}

function InningsSetup({
  homeTeam, awayTeam, homePlayers, awayPlayers, innings, forcedBattingTeamId, forcedBowlingTeamId, battingTeamLabel, totalOvers, isBusy, onStart,
}: {
  homeTeam: TeamInfo | null; awayTeam: TeamInfo | null; homePlayers: PlayerOption[]; awayPlayers: PlayerOption[];
  innings: number; forcedBattingTeamId?: string; forcedBowlingTeamId?: string; battingTeamLabel?: string; totalOvers?: number | null; isBusy: boolean;
  onStart: (form: { battingTeamId: string; bowlingTeamId: string; strikerId: string; nonStrikerId: string; bowlerId: string; totalOvers: number | null }) => void;
}) {
  const [battingTeamId, setBattingTeamId] = useState(forcedBattingTeamId ?? homeTeam?.id ?? "");
  const [overs, setOvers] = useState(totalOvers != null ? String(totalOvers) : "20");
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const bowlingTeamId = forcedBowlingTeamId ?? (battingTeamId === homeTeam?.id ? awayTeam?.id ?? "" : homeTeam?.id ?? "");
  const battingSquad = battingTeamId === homeTeam?.id ? homePlayers : awayPlayers;
  const bowlingSquad = bowlingTeamId === homeTeam?.id ? homePlayers : awayPlayers;

  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 font-heading text-base font-bold text-[var(--color-heading)]">Start innings {innings}</h3>

      {forcedBattingTeamId && battingTeamLabel && (
        <p className="mb-3 rounded-lg bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">
          <b>{battingTeamLabel}</b> bats first
        </p>
      )}

      {!forcedBattingTeamId && (
        <>
          <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Batting team</label>
          <select value={battingTeamId} onChange={(e) => setBattingTeamId(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
            {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
            {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
          </select>
        </>
      )}

      {totalOvers == null && (
        <>
          <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Overs</label>
          <input type="number" min={1} value={overs} onChange={(e) => setOvers(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm" />
        </>
      )}

      <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Striker</label>
      <select value={strikerId} onChange={(e) => setStrikerId(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
        <option value="">Select</option>
        {battingSquad.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>

      <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Non-striker</label>
      <select value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
        <option value="">Select</option>
        {battingSquad.filter((p) => p.id !== strikerId).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>

      <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Opening bowler</label>
      <select value={bowlerId} onChange={(e) => setBowlerId(e.target.value)} className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
        <option value="">Select</option>
        {bowlingSquad.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>

      <button
        disabled={isBusy || !strikerId || !nonStrikerId || !bowlerId || !battingTeamId}
        onClick={() => onStart({ battingTeamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId, totalOvers: totalOvers ?? (overs ? Number(overs) : null) })}
        className="w-full rounded-lg bg-[var(--color-primary)] py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        Start innings {innings}
      </button>
    </div>
  );
}
