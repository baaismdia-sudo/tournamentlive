import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { RotateCcw, Trash2, Eye, EyeOff } from "lucide-react";

interface NewsRow {
  id: string;
  title: string;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  deleted_at: string | null;
  tournament: { name: string } | null;
}

const PAGE_SIZE = 20;

/** Platform-wide news moderation — every article across every tournament. */
export default function AdminNewsPage() {
  const [rows, setRows] = useState<NewsRow[]>([]);
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
      .from("news")
      .select("id, title, is_published, is_featured, published_at, deleted_at, tournament:tournaments(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error: err, count } = await query;
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as unknown as NewsRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const togglePublish = async (row: NewsRow) => {
    const { error: err } = await supabase.from("news").update({ is_published: !row.is_published }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(row.is_published ? "Unpublished" : "Published");
    load();
  };

  const softDelete = async (row: NewsRow) => {
    const { error: err } = await supabase.from("news").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify("Removed");
    load();
  };

  const restore = async (row: NewsRow) => {
    const { error: err } = await supabase.from("news").update({ deleted_at: null }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify("Restored");
    load();
  };

  const columns: Column<NewsRow>[] = [
    { header: "Title", render: (r) => <div className="font-medium text-[var(--color-heading)]">{r.title}{r.is_featured && <span className="ml-2 rounded-full bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-warning)]">FEATURED</span>}</div> },
    { header: "Tournament", render: (r) => r.tournament?.name ?? "—" },
    { header: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.is_published ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{r.is_published ? "Published" : "Draft"}</span> },
    { header: "Published", render: (r) => (r.published_at ? new Date(r.published_at).toLocaleDateString() : "—") },
    {
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2 text-xs font-medium">
          <button onClick={() => togglePublish(r)} aria-label="Toggle publish" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
            {r.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {!r.deleted_at ? (
            <button onClick={() => softDelete(r)} aria-label="Remove" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
          ) : (
            <button onClick={() => restore(r)} aria-label="Restore" className="text-[var(--color-success)] hover:opacity-75"><RotateCcw size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <title>News · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <AdminDataTable title="News" description="Every article published across every tournament." columns={columns} rows={rows} isLoading={isLoading} error={error} search={search} onSearchChange={(v) => { setPage(1); setSearch(v); }} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} emptyLabel="No articles found" />
    </>
  );
}
