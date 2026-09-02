import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { getLiveMatchUrl } from "../../lib/publicUrls";
import { ExternalLink } from "lucide-react";

interface MatchRow {
  id: string;
  status: string;
  scheduled_at: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
  tournament: { name: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  live: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  half_time: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  completed: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  postponed: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  cancelled: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  abandoned: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
};

const PAGE_SIZE = 20;

/** Platform-wide match oversight — every match across every tournament, with a direct link to its public live page. */
export default function AdminMatchesPage() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("matches")
      .select(
        "id, status, scheduled_at, home_score, away_score, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name), tournament:tournaments(name)",
        { count: "exact" }
      )
      .order("scheduled_at", { ascending: false })
      .range(from, to);
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error: err, count } = await query;
    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as MatchRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const columns: Column<MatchRow>[] = [
    {
      header: "Match",
      render: (m) => (
        <div>
          <div className="font-medium text-[var(--color-heading)]">{m.home_team?.name ?? "TBD"} vs {m.away_team?.name ?? "TBD"}</div>
          <div className="text-xs text-[var(--color-muted)]">{m.tournament?.name ?? "—"}</div>
        </div>
      ),
    },
    { header: "Score", render: (m) => (m.home_score != null ? `${m.home_score} – ${m.away_score}` : "—") },
    {
      header: "Status",
      render: (m) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[m.status] ?? ""}`}>{m.status.replace("_", " ")}</span>,
    },
    { header: "Scheduled", render: (m) => (m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "—") },
    {
      header: "Live page",
      render: (m) => (
        <a href={getLiveMatchUrl(m.id)} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline" aria-label="Open live page">
          <ExternalLink size={14} />
        </a>
      ),
    },
  ];

  return (
    <>
      <title>Matches · Scorio Admin</title>

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "scheduled", "live", "completed", "postponed", "cancelled", "abandoned"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setPage(1); setStatusFilter(s); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
              statusFilter === s
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-secondary)]"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <AdminDataTable
        title="Matches"
        description="Every match scheduled or played across every tournament."
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        search=""
        onSearchChange={() => {}}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
        emptyLabel="No matches found"
      />
    </>
  );
}
