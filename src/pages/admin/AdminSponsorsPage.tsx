import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Trash2 } from "lucide-react";

interface SponsorRow {
  id: string;
  name: string;
  logo_url: string | null;
  tier: string | null;
  website_url: string | null;
  homepage_visible: boolean;
  tournament: { name: string } | null;
}

const TIER_STYLE: Record<string, string> = {
  platinum: "bg-[var(--color-muted)]/10 text-[var(--color-heading)]",
  gold: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  silver: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  bronze: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
};

const PAGE_SIZE = 20;

/** Platform-wide sponsor oversight — every sponsor across every tournament. */
export default function AdminSponsorsPage() {
  const [rows, setRows] = useState<SponsorRow[]>([]);
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
      .from("sponsors")
      .select("id, name, logo_url, tier, website_url, homepage_visible, tournament:tournaments(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error: err, count } = await query;
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as unknown as SponsorRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const toggleVisible = async (row: SponsorRow) => {
    const { error: err } = await supabase.from("sponsors").update({ homepage_visible: !row.homepage_visible }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(row.homepage_visible ? "Hidden from homepage" : "Shown on homepage");
    load();
  };

  const remove = async (row: SponsorRow) => {
    const { error: err } = await supabase.from("sponsors").delete().eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.name}" removed`);
    load();
  };

  const columns: Column<SponsorRow>[] = [
    {
      header: "Sponsor",
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]">
            {s.logo_url ? <img src={s.logo_url} alt="" className="h-full w-full object-cover" /> : "🏢"}
          </div>
          <span className="font-medium text-[var(--color-heading)]">{s.name}</span>
        </div>
      ),
    },
    { header: "Tournament", render: (s) => s.tournament?.name ?? "—" },
    { header: "Tier", render: (s) => (s.tier ? <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_STYLE[s.tier] ?? ""}`}>{s.tier}</span> : "—") },
    { header: "On homepage", render: (s) => (
      <button onClick={() => toggleVisible(s)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.homepage_visible ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>
        {s.homepage_visible ? "Visible" : "Hidden"}
      </button>
    ) },
    { header: "Actions", render: (s) => (
      <button onClick={() => remove(s)} aria-label="Remove" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
    ) },
  ];

  return (
    <>
      <title>Sponsors · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <AdminDataTable title="Sponsors" description="Every sponsor across every tournament." columns={columns} rows={rows} isLoading={isLoading} error={error} search={search} onSearchChange={(v) => { setPage(1); setSearch(v); }} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} emptyLabel="No sponsors found" />
    </>
  );
}
