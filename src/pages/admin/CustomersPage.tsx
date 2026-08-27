import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { AccountStatusBadge } from "../../components/ui/Badge";

interface Customer { id: string; full_name: string; email: string; status: string; created_at: string; subscription_status: string | null }
const PAGE_SIZE = 15;

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, status, created_at, roles!inner(name)", { count: "exact" })
        .eq("roles.name", "organizer")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (search) query = query.ilike("full_name", `%${search}%`);
      const { data, count } = await query;

      const withSub = await Promise.all(
        ((data ?? []) as unknown as Customer[]).map(async (c) => {
          const { data: sub } = await supabase.from("subscriptions").select("status").eq("organizer_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          return { ...c, subscription_status: sub?.status ?? null };
        })
      );
      setRows(withSub);
      setTotal(count ?? 0);
      setIsLoading(false);
    };
    load();
  }, [page, search]);

  const columns: Column<Customer>[] = [
    { header: "Customer", render: (c) => <Link to={`/admin/customers/${c.id}`} className="font-medium text-[var(--color-heading)] hover:text-[var(--color-primary)]">{c.full_name}</Link> },
    { header: "Email", render: (c) => c.email },
    { header: "Account Status", render: (c) => <AccountStatusBadge status={c.status as "active" | "suspended" | "pending"} /> },
    { header: "Subscription", render: (c) => c.subscription_status ? <span className="capitalize">{c.subscription_status.replace("_", " ")}</span> : <span className="text-[var(--color-muted)]">None</span> },
    { header: "Joined", render: (c) => new Date(c.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <title>Customers · TournamentLive Admin</title>
      <AdminDataTable title="Customers" description="Every organizer account and their subscription status." columns={columns} rows={rows} isLoading={isLoading} error={null} search={search} onSearchChange={(v) => { setPage(1); setSearch(v); }} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} emptyLabel="No customers yet" />
    </>
  );
}
