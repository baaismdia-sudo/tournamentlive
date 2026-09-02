import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { RotateCcw, Trash2 } from "lucide-react";

interface PlayerRow {
  id: string;
  full_name: string;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
  status: "active" | "injured" | "suspended";
  deleted_at: string | null;
  team: { name: string; tournament: { name: string } | null } | null;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  injured: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  suspended: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
};

const PAGE_SIZE = 20;

/** Platform-wide player oversight, mirroring AdminTeamsPage's scope and pattern. */
export default function AdminPlayersPage() {
  const [rows, setRows] = useState<PlayerRow[]>([]);
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
      .from("players")
      .select("id, full_name, jersey_number, position, photo_url, status, deleted_at, team:teams(name, tournament:tournaments(name))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.ilike("full_name", `%${search}%`);
    const { data, error: err, count } = await query;
    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as PlayerRow[]);
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

  const setStatus = async (row: PlayerRow, status: PlayerRow["status"]) => {
    const { error: err } = await supabase.from("players").update({ status }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.full_name}" marked ${status}`);
    load();
  };

  const softDelete = async (row: PlayerRow) => {
    const { error: err } = await supabase.from("players").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.full_name}" removed`);
    load();
  };

  const restore = async (row: PlayerRow) => {
    const { error: err } = await supabase.from("players").update({ deleted_at: null }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.full_name}" restored`);
    load();
  };

  const columns: Column<PlayerRow>[] = [
    {
      header: "Player",
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : "🧑"}
          </div>
          <div>
            <div className="font-medium text-[var(--color-heading)]">{p.full_name}</div>
            <div className="text-xs text-[var(--color-muted)]">{p.position ?? "—"}{p.jersey_number != null && ` · #${p.jersey_number}`}</div>
          </div>
        </div>
      ),
    },
    { header: "Team", render: (p) => p.team?.name ?? "—" },
    { header: "Tournament", render: (p) => p.team?.tournament?.name ?? "—" },
    {
      header: "Status",
      render: (p) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</span>,
    },
    {
      header: "Actions",
      render: (p) => (
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {p.status !== "active" && <button onClick={() => setStatus(p, "active")} className="text-[var(--color-success)] hover:underline">Reinstate</button>}
          {p.status !== "suspended" && <button onClick={() => setStatus(p, "suspended")} className="text-[var(--color-danger)] hover:underline">Suspend</button>}
          {!p.deleted_at ? (
            <button onClick={() => softDelete(p)} aria-label="Remove" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
          ) : (
            <button onClick={() => restore(p)} aria-label="Restore" className="text-[var(--color-success)] hover:opacity-75"><RotateCcw size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <title>Players · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <AdminDataTable
        title="Players"
        description="Every player registered across every team and tournament."
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={(v) => { setPage(1); setSearch(v); }}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
        emptyLabel="No players found"
      />
    </>
  );
}
