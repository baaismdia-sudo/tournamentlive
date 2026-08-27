import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

interface Domain {
  id: string; domain_name: string; verification_status: string; ssl_status: string; rejection_reason: string | null;
  tournaments: { name: string } | null;
}

export default function CustomDomainsPage() {
  const [rows, setRows] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await supabase.from("custom_domains").select("*, tournaments(name)").order("created_at", { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setRows((data ?? []) as unknown as Domain[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (d: Domain) => {
    setBusyId(d.id);
    await supabase.rpc("admin_approve_domain", { p_domain_id: d.id });
    await load();
    setBusyId(null);
  };

  const reject = async (d: Domain) => {
    const reason = window.prompt("Reason for rejection (shown to the organizer):");
    if (reason === null) return;
    setBusyId(d.id);
    await supabase.rpc("admin_reject_domain", { p_domain_id: d.id, p_reason: reason });
    await load();
    setBusyId(null);
  };

  const statusColor: Record<string, string> = { verified: "bg-[var(--color-success)]/10 text-[var(--color-success)]", pending: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]", failed: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" };

  const columns: Column<Domain>[] = [
    { header: "Domain", render: (d) => <span className="font-mono text-sm font-medium text-[var(--color-heading)]">{d.domain_name}</span> },
    { header: "Tournament", render: (d) => d.tournaments?.name ?? "—" },
    { header: "DNS Status", render: (d) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[d.verification_status]}`}>{d.verification_status}</span> },
    { header: "SSL", render: (d) => <span className="capitalize">{d.ssl_status}</span> },
    {
      header: "Actions",
      render: (d) => d.verification_status === "pending" ? (
        <div className="flex gap-3">
          <button onClick={() => approve(d)} disabled={busyId === d.id} className="flex items-center gap-1 text-xs font-medium text-[var(--color-success)] hover:underline disabled:opacity-50">
            {busyId === d.id ? <ButtonSpinner /> : <CheckCircle size={13} />} Approve
          </button>
          <button onClick={() => reject(d)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-danger)] hover:underline"><XCircle size={13} /> Reject</button>
        </div>
      ) : <span className="text-xs text-[var(--color-muted)]">{d.rejection_reason || "—"}</span>,
    },
  ];

  return (
    <>
      <title>Custom Domains · TournamentLive Admin</title>
      <AdminDataTable title="Custom Domains" description="Review and approve organizer-connected custom domains." columns={columns} rows={rows} isLoading={isLoading} error={error} search="" onSearchChange={() => {}} page={1} totalPages={1} onPageChange={() => {}} emptyLabel="No custom domain requests yet" />
    </>
  );
}
