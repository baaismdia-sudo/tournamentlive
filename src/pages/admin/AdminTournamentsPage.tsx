import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { SelectField, TextField } from "../../features/admin/components/FormField";
import { getTournamentUrl } from "../../lib/publicUrls";
import { Copy, ExternalLink, Pause, Play, Ban, CheckCircle2, Archive, RotateCcw } from "lucide-react";

interface OrganizerOption {
  id: string;
  full_name: string;
  email: string;
}

interface TournamentRow {
  id: string;
  name: string;
  slug: string;
  sport: string;
  status: string;
  organizer_id: string;
  is_public: boolean;
  created_at: string;
  deleted_at: string | null;
  organizer?: { full_name: string; email: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  pending_payment: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  active: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  paused: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  completed: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  expiring: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  archived: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  suspended: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
};

const PAGE_SIZE = 15;

/**
 * Super Admin's platform-wide tournament control. Unlike the Organizer's
 * "My Tournaments" (scoped to their own rows via RLS), this sees every
 * tournament across every organizer and can act on any of them: reassign
 * ownership, pause/resume, suspend (policy violation), mark complete, and
 * archive. Archive/suspend are soft — they flip `status` and/or
 * `deleted_at`, never DELETE — so an organizer's data is never destroyed by
 * an admin action.
 */
export default function AdminTournamentsPage() {
  const [rows, setRows] = useState<TournamentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState<TournamentRow | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [reassignTo, setReassignTo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("tournaments")
      .select("id, name, slug, sport, status, organizer_id, is_public, created_at, deleted_at, organizer:profiles(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.ilike("name", `%${search}%`);
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error: err, count } = await query;
    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as TournamentRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email, roles!inner(name)")
      .eq("roles.name", "organizer")
      .order("full_name")
      .then(({ data }) => setOrganizers((data ?? []) as unknown as OrganizerOption[]));
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (row: TournamentRow, status: string, extra?: Record<string, unknown>) => {
    const { error: err } = await supabase.from("tournaments").update({ status, ...extra }).eq("id", row.id);
    if (err) {
      notify(`Failed: ${err.message}`);
      return;
    }
    notify(`"${row.name}" is now ${status.replace("_", " ")}`);
    load();
  };

  const pause = (row: TournamentRow) => updateStatus(row, "paused", { is_public: false });
  const resume = (row: TournamentRow) => updateStatus(row, "active", { is_public: true });
  const suspend = (row: TournamentRow) => updateStatus(row, "suspended", { is_public: false });
  const complete = (row: TournamentRow) => updateStatus(row, "completed");
  const archive = (row: TournamentRow) => updateStatus(row, "archived", { is_public: false, deleted_at: new Date().toISOString() });
  const restore = (row: TournamentRow) => updateStatus(row, "active", { deleted_at: null, is_public: true });

  const openReassign = (row: TournamentRow) => {
    setEditing(row);
    setReassignTo(row.organizer_id);
  };

  const saveReassign = async () => {
    if (!editing || !reassignTo) return;
    setIsSaving(true);
    const { error: err } = await supabase.from("tournaments").update({ organizer_id: reassignTo }).eq("id", editing.id);
    setIsSaving(false);
    if (err) {
      notify(`Failed: ${err.message}`);
      return;
    }
    notify(`"${editing.name}" reassigned`);
    setEditing(null);
    load();
  };

  const copyLink = (row: TournamentRow) => {
    const url = getTournamentUrl(row.slug);
    navigator.clipboard.writeText(url);
    notify(`Link copied: ${url}`);
  };

  const columns: Column<TournamentRow>[] = [
    {
      header: "Tournament",
      render: (t) => (
        <div>
          <div className="font-medium text-[var(--color-heading)]">{t.name}</div>
          <div className="text-xs text-[var(--color-muted)] capitalize">{t.sport}</div>
        </div>
      ),
    },
    {
      header: "Organizer",
      render: (t) => (
        <div>
          <div>{t.organizer?.full_name ?? "—"}</div>
          <div className="text-xs text-[var(--color-muted)]">{t.organizer?.email ?? ""}</div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (t) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[t.status] ?? ""}`}>
          {t.status.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Public Website",
      render: (t) => (
        <div className="flex items-center gap-2">
          <a href={getTournamentUrl(t.slug)} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline" aria-label="Open public website">
            <ExternalLink size={14} />
          </a>
          <button onClick={() => copyLink(t)} aria-label="Copy link" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
            <Copy size={14} />
          </button>
        </div>
      ),
    },
    { header: "Created", render: (t) => new Date(t.created_at).toLocaleDateString() },
    {
      header: "Actions",
      render: (t) => (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => openReassign(t)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
            Reassign
          </button>
          {t.status === "active" && (
            <button onClick={() => pause(t)} aria-label="Pause" title="Pause" className="text-[var(--color-warning)] hover:opacity-75"><Pause size={15} /></button>
          )}
          {(t.status === "paused" || t.status === "suspended") && (
            <button onClick={() => resume(t)} aria-label="Resume" title="Resume" className="text-[var(--color-success)] hover:opacity-75"><Play size={15} /></button>
          )}
          {t.status !== "suspended" && (
            <button onClick={() => suspend(t)} aria-label="Suspend" title="Suspend" className="text-[var(--color-danger)] hover:opacity-75"><Ban size={15} /></button>
          )}
          {t.status !== "completed" && t.status !== "archived" && (
            <button onClick={() => complete(t)} aria-label="Mark complete" title="Mark complete" className="text-[var(--color-primary)] hover:opacity-75"><CheckCircle2 size={15} /></button>
          )}
          {!t.deleted_at ? (
            <button onClick={() => archive(t)} aria-label="Archive" title="Archive" className="text-[var(--color-muted)] hover:opacity-75"><Archive size={15} /></button>
          ) : (
            <button onClick={() => restore(t)} aria-label="Restore" title="Restore" className="text-[var(--color-success)] hover:opacity-75"><RotateCcw size={15} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <title>Tournaments · TournamentLive Admin</title>
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SelectField
          label="Filter by status"
          value={statusFilter}
          onChange={(v) => { setPage(1); setStatusFilter(v); }}
          options={[
            { value: "", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "pending_payment", label: "Pending payment" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
            { value: "expiring", label: "Expiring" },
            { value: "suspended", label: "Suspended" },
            { value: "archived", label: "Archived" },
          ]}
        />
      </div>

      <AdminDataTable
        title="Tournaments"
        description="Every tournament across every organizer on the platform."
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={(v) => { setPage(1); setSearch(v); }}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
        emptyLabel="No tournaments found"
      />

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={`Reassign "${editing?.name ?? ""}"`}>
        <div className="space-y-4">
          <SelectField
            label="New organizer"
            value={reassignTo}
            onChange={setReassignTo}
            options={organizers.map((o) => ({ value: o.id, label: `${o.full_name} (${o.email})` }))}
          />
          {editing && (
            <TextField label="Public URL" value={getTournamentUrl(editing.slug)} onChange={() => {}} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditing(null)} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">Cancel</button>
            <button onClick={saveReassign} disabled={isSaving || !reassignTo} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-50">
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
