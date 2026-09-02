import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";

interface SubscriptionRow {
  id: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  starts_at: string;
  ends_at: string | null;
  auto_renew: boolean;
  organizer: { full_name: string; email: string } | null;
  plan: { name: string; price_cents: number; currency: string; duration: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  trialing: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  active: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  past_due: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  cancelled: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  expired: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
};

const PAGE_SIZE = 15;

/**
 * Platform-wide subscription oversight — every organizer's plan, status, and
 * renewal date in one place. This is distinct from Rental Plans (which
 * defines what plans exist) and from an organizer's own Billing page (which
 * only shows their own subscription).
 */
export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("subscriptions")
      .select(
        "id, status, starts_at, ends_at, auto_renew, organizer:profiles(full_name, email), plan:rental_plans(name, price_cents, currency, duration)",
        { count: "exact" }
      )
      .order("starts_at", { ascending: false })
      .range(from, to);
    if (statusFilter) query = query.eq("status", statusFilter);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: "organizer" });
    const { data, error: err, count } = await query;
    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as SubscriptionRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (row: SubscriptionRow, status: SubscriptionRow["status"]) => {
    const extra: Record<string, unknown> = { status };
    if (status === "cancelled") extra.cancelled_at = new Date().toISOString();
    const { error: err } = await supabase.from("subscriptions").update(extra).eq("id", row.id);
    if (err) {
      notify(`Failed: ${err.message}`);
      return;
    }
    notify(`Subscription marked ${status}`);
    load();
  };

  const formatPrice = (cents: number, currency: string) => `${currency === "INR" ? "₹" : currency} ${(cents / 100).toLocaleString()}`;

  const columns: Column<SubscriptionRow>[] = [
    {
      header: "Organizer",
      render: (r) => (
        <div>
          <div className="font-medium text-[var(--color-heading)]">{r.organizer?.full_name ?? "—"}</div>
          <div className="text-xs text-[var(--color-muted)]">{r.organizer?.email ?? ""}</div>
        </div>
      ),
    },
    {
      header: "Plan",
      render: (r) => (
        <div>
          <div>{r.plan?.name ?? "—"}</div>
          {r.plan && <div className="text-xs text-[var(--color-muted)]">{formatPrice(r.plan.price_cents, r.plan.currency)} / {r.plan.duration}</div>}
        </div>
      ),
    },
    {
      header: "Status",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status]}`}>
          {r.status.replace("_", " ")}
        </span>
      ),
    },
    { header: "Started", render: (r) => new Date(r.starts_at).toLocaleDateString() },
    { header: "Renews / Ends", render: (r) => (r.ends_at ? new Date(r.ends_at).toLocaleDateString() : "—") },
    { header: "Auto-renew", render: (r) => (r.auto_renew ? "Yes" : "No") },
    {
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {r.status !== "active" && (
            <button onClick={() => updateStatus(r, "active")} className="text-[var(--color-success)] hover:underline">Mark active</button>
          )}
          {r.status !== "cancelled" && (
            <button onClick={() => updateStatus(r, "cancelled")} className="text-[var(--color-danger)] hover:underline">Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <title>Subscriptions · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["", "trialing", "active", "past_due", "cancelled", "expired"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setPage(1); setStatusFilter(s); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
              statusFilter === s
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-secondary)]"
            }`}
          >
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>

      <AdminDataTable
        title="Subscriptions"
        description="Every organizer's plan and billing status across the platform."
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={(v) => { setPage(1); setSearch(v); }}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
        emptyLabel="No subscriptions found"
      />
    </>
  );
}
