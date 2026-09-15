import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Phone, ThumbsUp, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { TextField, TextAreaField, SelectField } from "../../features/admin/components/FormField";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { SuccessBanner } from "../../components/ui/ErrorState";

interface Enquiry {
  id: string; organization_name: string; tournament_name: string | null; sport: string | null;
  contact_name: string; contact_phone: string; contact_email: string; city: string | null; country: string | null;
  expected_teams: number | null; expected_players: number | null; message: string | null;
  rental_plan_id: string;
  status: "pending" | "contacted" | "payment_pending" | "approved" | "rejected" | "cancelled" | "activated" | "expired" | "declined";
  created_at: string; rental_plans: { name: string } | null;
}

interface PlanOption { id: string; name: string }

const emptyEditForm = {
  organization_name: "", tournament_name: "", sport: "", contact_name: "", contact_phone: "",
  contact_email: "", city: "", country: "", expected_teams: "", expected_players: "", message: "", rental_plan_id: "",
};

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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    supabase.from("rental_plans").select("id, name").order("name").then(({ data }) => setPlans((data ?? []) as PlanOption[]));
  }, []);

  const openEdit = (e: Enquiry) => {
    setSelected(e);
    setSaveError(null);
    setSaved(false);
    setEditForm({
      organization_name: e.organization_name ?? "",
      tournament_name: e.tournament_name ?? "",
      sport: e.sport ?? "",
      contact_name: e.contact_name ?? "",
      contact_phone: e.contact_phone ?? "",
      contact_email: e.contact_email ?? "",
      city: e.city ?? "",
      country: e.country ?? "",
      expected_teams: e.expected_teams != null ? String(e.expected_teams) : "",
      expected_players: e.expected_players != null ? String(e.expected_players) : "",
      message: e.message ?? "",
      rental_plan_id: e.rental_plan_id ?? "",
    });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setIsSaving(true);
    setSaveError(null);
    const { error: updateError } = await supabase
      .from("rental_enquiries")
      .update({
        organization_name: editForm.organization_name,
        tournament_name: editForm.tournament_name || null,
        sport: editForm.sport || null,
        contact_name: editForm.contact_name,
        contact_phone: editForm.contact_phone,
        contact_email: editForm.contact_email,
        city: editForm.city || null,
        country: editForm.country || null,
        expected_teams: editForm.expected_teams ? Number(editForm.expected_teams) : null,
        expected_players: editForm.expected_players ? Number(editForm.expected_players) : null,
        message: editForm.message || null,
        rental_plan_id: editForm.rental_plan_id,
      })
      .eq("id", selected.id);
    setIsSaving(false);
    if (updateError) { setSaveError(updateError.message); return; }
    setSaved(true);
    await load();
  };

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
      header: "Edit",
      render: (e) => (
        <button onClick={() => openEdit(e)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
          <Pencil size={13} /> Edit
        </button>
      ),
    },
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

      <Drawer open={Boolean(selected)} onClose={() => { setSelected(null); setIsEditing(false); }} title={isEditing ? "Edit enquiry" : "Enquiry details"}>
        {selected && !isEditing && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-end">
              <button onClick={() => openEdit(selected)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
                <Pencil size={13} /> Edit
              </button>
            </div>
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
        {selected && isEditing && (
          <div className="space-y-4">
            <TextField label="Organization name" value={editForm.organization_name} onChange={(v) => setEditForm((f) => ({ ...f, organization_name: v }))} />
            <TextField label="Tournament name" value={editForm.tournament_name} onChange={(v) => setEditForm((f) => ({ ...f, tournament_name: v }))} />
            <TextField label="Sport" value={editForm.sport} onChange={(v) => setEditForm((f) => ({ ...f, sport: v }))} />
            <TextField label="Contact name" value={editForm.contact_name} onChange={(v) => setEditForm((f) => ({ ...f, contact_name: v }))} />
            <TextField label="Contact phone" value={editForm.contact_phone} onChange={(v) => setEditForm((f) => ({ ...f, contact_phone: v }))} />
            <TextField label="Contact email" value={editForm.contact_email} onChange={(v) => setEditForm((f) => ({ ...f, contact_email: v }))} type="email" />
            <TextField label="City" value={editForm.city} onChange={(v) => setEditForm((f) => ({ ...f, city: v }))} />
            <TextField label="Country" value={editForm.country} onChange={(v) => setEditForm((f) => ({ ...f, country: v }))} />
            <TextField label="Expected teams" value={editForm.expected_teams} onChange={(v) => setEditForm((f) => ({ ...f, expected_teams: v }))} type="number" />
            <TextField label="Expected players" value={editForm.expected_players} onChange={(v) => setEditForm((f) => ({ ...f, expected_players: v }))} type="number" />
            <SelectField
              label="Rental plan"
              value={editForm.rental_plan_id}
              onChange={(v) => setEditForm((f) => ({ ...f, rental_plan_id: v }))}
              options={plans.map((p) => ({ value: p.id, label: p.name }))}
            />
            <TextAreaField label="Notes" value={editForm.message} onChange={(v) => setEditForm((f) => ({ ...f, message: v }))} />

            {saveError && <p className="text-sm text-[var(--color-danger)]">{saveError}</p>}
            {saved && <SuccessBanner message="Enquiry updated" />}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveEdit}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
              >
                {isSaving && <ButtonSpinner />} Save changes
              </button>
              <button onClick={() => setIsEditing(false)} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
                Cancel
              </button>
            </div>
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
