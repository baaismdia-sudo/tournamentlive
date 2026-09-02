import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { RotateCcw, Trash2 } from "lucide-react";

interface TeamRow {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  status: "active" | "withdrawn" | "disqualified";
  deleted_at: string | null;
  tournament: { name: string; slug: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  withdrawn: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  disqualified: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
};

const PAGE_SIZE = 20;

/**
 * Platform-wide team oversight — every team across every tournament, for
 * moderation (disqualify, remove). Organizers already manage their own
 * teams in depth from their own dashboard; this is the cross-tournament
 * admin view, so it stays intentionally read-heavy with light moderation
 * actions rather than duplicating the organizer's full team-editing form.
 */
export default function AdminTeamsPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("teams")
      .select("id, name, short_name, logo_url, status, deleted_at, tournament:tournaments(name, slug)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error: err, count } = await query;
    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as TeamRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const setStatus = async (row: TeamRow, status: TeamRow["status"]) => {
    const { error: err } = await supabase.from("teams").update({ status }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.name}" marked ${status}`);
    load();
  };

  const softDelete = async (row: TeamRow) => {
    const { error: err } = await supabase.from("teams").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.name}" removed`);
    load();
  };

  const restore = async (row: TeamRow) => {
    const { error: err } = await supabase.from("teams").update({ deleted_at: null }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.name}" restored`);
    load();
  };

  const columns: Column<TeamRow>[] = [
    {
      header: "Team",
      render: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]">
            {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-cover" /> : "🏳️"}
          </div>
          <div>
            <div className="font-medium text-[var(--color-heading)]">{t.name}</div>
            {t.deleted_at && <div className="text-xs text-[var(--color-danger)]">Removed</div>}
          </div>
        </div>
      ),
    },
    { header: "Tournament", render: (t) => t.tournament?.name ?? "—" },
    {
      header: "Status",
      render: (t) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
      ),
    },
    {
      header: "Actions",
      render: (t) => (
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {t.status !== "active" && <button onClick={() => setStatus(t, "active")} className="text-[var(--color-success)] hover:underline">Reinstate</button>}
          {t.status !== "disqualified" && <button onClick={() => setStatus(t, "disqualified")} className="text-[var(--color-danger)] hover:underline">Disqualify</button>}
          {!t.deleted_at ? (
            <button onClick={() => softDelete(t)} aria-label="Remove" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
          ) : (
            <button onClick={() => restore(t)} aria-label="Restore" className="text-[var(--color-success)] hover:opacity-75"><RotateCcw size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <title>Teams · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <AdminDataTable
        title="Teams"
        description="Every team registered across every tournament on the platform."
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={(v) => { setPage(1); setSearch(v); }}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
        emptyLabel="No teams found"
      />
    </>
  );
}
