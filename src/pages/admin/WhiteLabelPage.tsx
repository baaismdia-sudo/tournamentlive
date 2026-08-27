import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";

interface Organizer { id: string; full_name: string; email: string; white_label_enabled: boolean; custom_css_enabled: boolean }
const PAGE_SIZE = 15;

export default function WhiteLabelPage() {
  const [rows, setRows] = useState<Organizer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, white_label_enabled, custom_css_enabled, roles!inner(name)", { count: "exact" })
      .eq("roles.name", "organizer")
      .range(from, to);
    if (search) query = query.ilike("full_name", `%${search}%`);
    const { data, error, count } = await query;
    if (!error) {
      setRows((data ?? []) as unknown as Organizer[]);
      setTotal(count ?? 0);
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const toggleWhiteLabel = async (o: Organizer) => {
    await supabase.rpc("admin_set_white_label", { p_organizer_id: o.id, p_enabled: !o.white_label_enabled });
    load();
  };
  const toggleCustomCss = async (o: Organizer) => {
    await supabase.rpc("admin_set_custom_css_access", { p_organizer_id: o.id, p_enabled: !o.custom_css_enabled });
    load();
  };

  const columns: Column<Organizer>[] = [
    { header: "Organizer", render: (o) => <span className="font-medium text-[var(--color-heading)]">{o.full_name}</span> },
    { header: "Email", render: (o) => o.email },
    {
      header: "White Label",
      render: (o) => (
        <button onClick={() => toggleWhiteLabel(o)} role="switch" aria-checked={o.white_label_enabled} className={`relative h-6 w-11 rounded-full transition-colors ${o.white_label_enabled ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${o.white_label_enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      ),
    },
    {
      header: "Custom CSS",
      render: (o) => (
        <button onClick={() => toggleCustomCss(o)} role="switch" aria-checked={o.custom_css_enabled} className={`relative h-6 w-11 rounded-full transition-colors ${o.custom_css_enabled ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${o.custom_css_enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      ),
    },
  ];

  return (
    <>
      <title>White Label · TournamentLive Admin</title>
      <AdminDataTable
        title="White Label & Custom CSS Access"
        description="Per-organizer feature gates. Both are off by default and must be explicitly enabled here."
        columns={columns} rows={rows} isLoading={isLoading} error={null} search={search} onSearchChange={(v) => { setPage(1); setSearch(v); }}
        page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage}
        emptyLabel="No organizers yet"
      />
    </>
  );
}
