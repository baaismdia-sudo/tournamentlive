import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Phone, ThumbsUp } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

interface Enquiry {
  id: string; organization_name: string; tournament_name: string | null; sport: string | null;
  contact_name: string; contact_phone: string; contact_email: string; city: string | null; country: string | null;
  expected_teams: number | null; expected_players: number | null; message: string | null;
  status: "pending" | "contacted" | "payment_pending" | "approved" | "rejected" | "cancelled" | "activated" | "expired" | "declined";
  created_at: string; rental_plans: { name: string } | null;
}

const PAGE_SIZE = 15;
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  contacted: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
  payment_pending: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  approved: "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
  activated: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  rejected: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  declined: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  cancelled: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  expired: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
};

export default function RentalEnquiriesPage() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Enquiry | null>(null);

  const load = async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from("rental_enquiries").select("*, rental_plans(name)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (search) query = query.ilike("organization_name", `%${search}%`);
    const { data, error: fetchError, count } = await query;
    if (fetchError) setError(fetchError.message);
    else {
      setRows((data ?? []) as unknown as Enquiry[]);
      setTotal(count ?? 0);
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const approve = async (e: Enquiry) => {
    setBusyId(e.id);
    await supabase.rpc("admin_approve_enquiry", { p_enquiry_id: e.id });
    await load();
    setBusyId(null);
  };

  const activate = async (e: Enquiry) => {
    setBusyId(e.id);
    try {
      const { error: rpcError } = await supabase.rpc("admin_activate_rental_enquiry", { p_enquiry_id: e.id });
      if (rpcError) throw rpcError;
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (e: Enquiry) => {
    const reason = window.prompt("Reason for rejection (shown to the organizer):");
    if (reason === null) return;
    setBusyId(e.id);
    await supabase.rpc("admin_reject_enquiry", { p_enquiry_id: e.id, p_reason: reason });
    await load();
    setBusyId(null);
  };

  const columns: Column<Enquiry>[] = [
    { header: "Organization", render: (e) => <button onClick={() => setSelected(e)} className="font-medium text-[var(--color-heading)] hover:text-[var(--color-primary)]">{e.organization_name}</button> },
    { header: "Tournament", render: (e) => e.tournament_name ?? "—" },
    { header: "Plan", render: (e) => e.rental_plans?.name ?? "—" },
    { header: "Contact", render: (e) => <a href={`tel:${e.contact_phone}`} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline"><Phone size={12} /> {e.contact_phone}</a> },
    { header: "Status", render: (e) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[e.status]}`}>{e.status.replace("_", " ")}</span> },
    { header: "Received", render: (e) => new Date(e.created_at).toLocaleDateString() },
    {
      header: "Actions",
      render: (e) => {
        if (e.status === "pending" || e.status === "contacted") {
          return (
            <div className="flex items-center gap-3">
              <button onClick={() => approve(e)} disabled={busyId === e.id} className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50">
                {busyId === e.id ? <ButtonSpinner /> : <ThumbsUp size={13} />} Approve
              </button>
              <button onClick={() => activate(e)} disabled={busyId === e.id} className="flex items-center gap-1 text-xs font-medium text-[var(--color-success)] hover:underline disabled:opacity-50">
                <CheckCircle size={13} /> Activate
              </button>
              <button onClick={() => reject(e)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-danger)] hover:underline">
                <XCircle size={13} /> Reject
              </button>
            </div>
          );
        }
        if (e.status === "approved") {
          return (
            <button onClick={() => activate(e)} disabled={busyId === e.id} className="flex items-center gap-1 text-xs font-medium text-[var(--color-success)] hover:underline disabled:opacity-50">
              {busyId === e.id ? <ButtonSpinner /> : <CheckCircle size={13} />} Activate
            </button>
          );
        }
        return <span className="text-xs text-[var(--color-muted)]">—</span>;
      },
    },
  ];

  return (
    <>
      <title>Rental Enquiries · TournamentLive Admin</title>
      <AdminDataTable
        title="Rental Enquiries"
        description="WhatsApp rental requests from organizers. Approve to acknowledge, Activate once payment is confirmed."
        columns={columns} rows={rows} isLoading={isLoading} error={error} search={search}
        onSearchChange={(v) => { setPage(1); setSearch(v); }} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage}
        emptyLabel="No enquiries yet"
      />

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Enquiry details">
        {selected && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Organization" value={selected.organization_name} />
            <DetailRow label="Tournament" value={selected.tournament_name ?? "—"} />
            <DetailRow label="Sport" value={selected.sport ?? "—"} />
            <DetailRow label="Location" value={[selected.city, selected.country].filter(Boolean).join(", ") || "—"} />
            <DetailRow label="Contact" value={`${selected.contact_name} · ${selected.contact_phone} · ${selected.contact_email}`} />
            <DetailRow label="Expected teams / players" value={`${selected.expected_teams ?? "—"} / ${selected.expected_players ?? "—"}`} />
            <DetailRow label="Plan" value={selected.rental_plans?.name ?? "—"} />
            {selected.message && <DetailRow label="Notes" value={selected.message} />}
          </div>
        )}
      </Drawer>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--color-border)] pb-2">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="text-[var(--color-text)]">{value}</p>
    </div>
  );
}
