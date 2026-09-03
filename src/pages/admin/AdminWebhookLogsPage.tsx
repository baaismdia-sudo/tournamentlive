import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";

interface WebhookLogRow {
  id: string;
  source: string;
  event_type: string;
  status: "received" | "processed" | "failed";
  error_message: string | null;
  payload: unknown;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  received: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  processed: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  failed: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
};

const PAGE_SIZE = 25;

/** Read-only diagnostic log of every incoming webhook (payments, integrations, etc.) — for debugging failed integrations. */
export default function AdminWebhookLogsPage() {
  const [rows, setRows] = useState<WebhookLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WebhookLogRow | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("webhook_logs")
      .select("id, source, event_type, status, error_message, payload, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error: err, count } = await query;
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as WebhookLogRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: Column<WebhookLogRow>[] = [
    { header: "Source", render: (r) => <span className="font-medium text-[var(--color-heading)]">{r.source}</span> },
    { header: "Event", render: (r) => r.event_type },
    { header: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span> },
    { header: "Received", render: (r) => new Date(r.created_at).toLocaleString() },
    { header: "", render: (r) => <button onClick={() => setSelected(r)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">View payload</button> },
  ];

  return (
    <>
      <title>Webhook Logs · Scorio Admin</title>

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "received", "processed", "failed"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setPage(1); setStatusFilter(s); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${statusFilter === s ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-secondary)]"}`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <AdminDataTable title="Webhook Logs" description="Every incoming webhook event, for diagnosing failed integrations." columns={columns} rows={rows} isLoading={isLoading} error={error} search="" onSearchChange={() => {}} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} emptyLabel="No webhook events found" />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={`${selected?.source ?? ""} — ${selected?.event_type ?? ""}`}>
        {selected?.error_message && (
          <p className="mb-3 rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{selected.error_message}</p>
        )}
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-[var(--color-surface-secondary)] p-3 text-xs">
          {JSON.stringify(selected?.payload, null, 2)}
        </pre>
      </Drawer>
    </>
  );
}
