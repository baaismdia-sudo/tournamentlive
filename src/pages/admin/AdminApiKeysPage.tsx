import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Ban } from "lucide-react";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[] | null;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  owner: { full_name: string; email: string } | null;
}

const PAGE_SIZE = 20;

/** Platform-wide API key oversight — every key issued to any organizer, with the ability to revoke one if compromised or abused. */
export default function AdminApiKeysPage() {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
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
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at, owner:profiles(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: "owner" });
    const { data, error: err, count } = await query;
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as unknown as ApiKeyRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const revoke = async (row: ApiKeyRow) => {
    const { error: err } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(`"${row.name}" revoked`);
    load();
  };

  const columns: Column<ApiKeyRow>[] = [
    {
      header: "Key",
      render: (k) => (
        <div>
          <div className="font-medium text-[var(--color-heading)]">{k.name}</div>
          <div className="font-mono text-xs text-[var(--color-muted)]">{k.key_prefix}••••••••</div>
        </div>
      ),
    },
    { header: "Owner", render: (k) => (
      <div>
        <div>{k.owner?.full_name ?? "—"}</div>
        <div className="text-xs text-[var(--color-muted)]">{k.owner?.email ?? ""}</div>
      </div>
    ) },
    { header: "Scopes", render: (k) => (k.scopes?.length ? k.scopes.join(", ") : "—") },
    { header: "Last used", render: (k) => (k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never") },
    {
      header: "Status",
      render: (k) => {
        const expired = k.expires_at && new Date(k.expires_at) < new Date();
        const label = k.revoked_at ? "Revoked" : expired ? "Expired" : "Active";
        const style = k.revoked_at || expired ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" : "bg-[var(--color-success)]/10 text-[var(--color-success)]";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
      },
    },
    {
      header: "Actions",
      render: (k) => !k.revoked_at && (
        <button onClick={() => revoke(k)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-danger)] hover:underline">
          <Ban size={13} /> Revoke
        </button>
      ),
    },
  ];

  return (
    <>
      <title>API Keys · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <AdminDataTable title="API Keys" description="Every API key issued across every organizer account." columns={columns} rows={rows} isLoading={isLoading} error={error} search={search} onSearchChange={(v) => { setPage(1); setSearch(v); }} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} emptyLabel="No API keys found" />
    </>
  );
}
