import { ballDot } from "../../features/live/cricket/cricketState";

interface LiveScoreCardProps {
  className?: string;
  tournament?: string;
  batting?: string;
  bowling?: string;
  score?: string;
  overs?: string;
  target?: number;
  need?: string;
  thisOver?: { label: string; runs: number; type: string; wicket: boolean }[];
}

const DEFAULT_OVER = [
  { label: "17.1", runs: 1, type: "run", wicket: false },
  { label: "17.2", runs: 0, type: "run", wicket: false },
  { label: "17.3", runs: 4, type: "run", wicket: false },
  { label: "17.3", runs: 1, type: "wide", wicket: false },
];

/**
 * A static, decorative scoreboard in the Scorio style: Blaze "LIVE" pill,
 * tabular monospaced score, volt ball indicators. It mirrors the real
 * public Umpire View so marketing shows what the product actually looks like.
 */
export function LiveScoreCard({
  className = "",
  tournament = "Kodungallur Premier Cup · T20",
  batting = "Thrissur Titans",
  bowling = "Cochin Crusaders",
  score = "145/4",
  overs = "17.3",
  target = 146,
  need = "Need 1 run from 15 balls",
  thisOver = DEFAULT_OVER,
}: LiveScoreCardProps) {
  const [runs, wkts] = score.split("/");
  return (
    <div
      className={`overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-lg ${className}`}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-danger)] px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-white">
          <span className="h-1.5 w-1.5 animate-[livePulse_1.4s_ease-in-out_infinite] rounded-full bg-white" />
          Live
        </span>
        <span className="truncate pl-3 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">{tournament}</span>
      </div>

      <div className="px-5 pb-1 pt-4">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-heading)]">{batting}</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="score text-6xl font-bold leading-none text-[var(--color-heading)] sm:text-7xl">
            <span style={{ color: "var(--color-primary-ink)" }}>{runs}</span>
            <span className="text-[var(--color-danger)]">/{wkts}</span>
          </p>
          <div className="pb-1 text-right">
            <p className="score text-2xl font-bold text-[var(--color-heading)]">{overs}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">Overs (20)</p>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-[var(--color-on-primary)]">
        <p className="text-sm font-semibold">{need}</p>
        <p className="score text-xs font-bold">TARGET {target}</p>
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
          <span>This over</span>
          <span>vs {bowling}</span>
        </div>
        <div className="flex gap-1.5">
          {thisOver.map((b, i) => {
            const d = ballDot(b);
            return (
              <span key={i} className={`score flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-xs ${d.cls}`}>
                {d.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
