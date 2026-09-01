import type { MatchRow, LiveScoreRow } from "../hooks/useRealtimeMatch";
import { useMatchClock } from "../hooks/useMatchClock";

interface TeamInfo { name: string; logo_url: string | null }

export function Scoreboard({
  match, liveScore, homeTeam, awayTeam,
}: {
  match: MatchRow; liveScore: LiveScoreRow | null; homeTeam: TeamInfo | null; awayTeam: TeamInfo | null;
}) {
  const clock = useMatchClock(liveScore);
  const isLive = match.status === "live" || match.status === "half_time" || match.status === "extra_time";

  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      {isLive && (
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-danger)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-danger)]" />
          LIVE · {clock.formatted}
          {clock.addedTimeFormatted && <span className="text-[var(--color-warning)]">{clock.addedTimeFormatted}</span>}
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <TeamBlock team={homeTeam} />
        <div className="px-1 text-center">
          <p className="whitespace-nowrap text-3xl font-bold text-[var(--color-heading)] sm:text-5xl">
            {liveScore?.home_score ?? match.home_score} – {liveScore?.away_score ?? match.away_score}
          </p>
          <p className="mt-1.5 text-xs capitalize text-[var(--color-muted)]">{liveScore?.period ?? match.status.replace("_", " ")}</p>
        </div>
        <TeamBlock team={awayTeam} align="right" />
      </div>
    </div>
  );
}

function TeamBlock({ team, align = "left" }: { team: TeamInfo | null; align?: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] sm:h-12 sm:w-12">
        {team?.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : "🏳️"}
      </div>
      <p className="min-w-0 truncate text-sm font-medium text-[var(--color-heading)] sm:text-base">{team?.name ?? "TBD"}</p>
    </div>
  );
}
