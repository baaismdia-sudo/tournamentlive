import { useState } from "react";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { TextField, SelectField, CheckboxField } from "../../features/admin/components/FormField";
import { useAdminTable } from "../../features/admin/hooks/useAdminTable";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

interface Advertisement {
  id: string;
  placement: "header" | "sidebar" | "footer" | "in_feed";
  image_url: string;
  target_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  is_active: boolean;
}

const emptyForm = { placement: "sidebar", image_url: "", target_url: "", starts_at: "", ends_at: "", is_active: true };

/**
 * Platform-wide ad placements (tournament_id = null) shown across the public
 * marketing site and public tournament pages.
 */
export default function AdvertisementsPage() {
  const table = useAdminTable<Advertisement>("advertisements", "target_url");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };
  const openEdit = (a: Advertisement) => {
    setEditing(a);
    setForm({
      placement: a.placement,
      image_url: a.image_url,
      target_url: a.target_url ?? "",
      starts_at: a.starts_at?.slice(0, 10) ?? "",
      ends_at: a.ends_at?.slice(0, 10) ?? "",
      is_active: a.is_active,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const values = {
        placement: form.placement,
        image_url: form.image_url,
        target_url: form.target_url || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active,
        tournament_id: null,
      };
      if (editing) await table.update(editing.id, values);
      else await table.create(values);
      setDrawerOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save advertisement");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<Advertisement>[] = [
    { header: "Preview", render: (a) => <img src={a.image_url} alt="" className="h-10 w-16 rounded object-cover" /> },
    { header: "Placement", render: (a) => <span className="capitalize">{a.placement.replace("_", " ")}</span> },
    { header: "Target URL", render: (a) => a.target_url ?? "—" },
    { header: "Runs", render: (a) => `${a.starts_at ? new Date(a.starts_at).toLocaleDateString() : "Always"} → ${a.ends_at ? new Date(a.ends_at).toLocaleDateString() : "No end"}` },
    { header: "Impressions / Clicks", render: (a) => `${a.impressions.toLocaleString()} / ${a.clicks.toLocaleString()}` },
    {
      header: "Status",
      render: (a) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.is_active ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>
          {a.is_active ? "Active" : "Disabled"}
        </span>
      ),
    },
  ];

  return (
    <>
      <title>Advertisements · TournamentLive Admin</title>
      <AdminDataTable
        title="Advertisements"
        description="Platform-wide ad placements shown on the marketing site and public tournament pages."
        columns={columns}
        rows={table.rows}
        isLoading={table.isLoading}
        error={table.error}
        search={table.search}
        onSearchChange={table.setSearch}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={(a) => table.remove(a.id)}
        page={table.page}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        emptyLabel="No advertisements yet"
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? "Edit advertisement" : "New advertisement"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)] dark:bg-red-900/20">{formError}</p>}
          <SelectField
            label="Placement"
            value={form.placement}
            onChange={(v) => setForm((f) => ({ ...f, placement: v }))}
            options={[
              { value: "header", label: "Header" },
              { value: "sidebar", label: "Sidebar" },
              { value: "footer", label: "Footer" },
              { value: "in_feed", label: "In-feed" },
            ]}
          />
          <TextField label="Image URL" value={form.image_url} onChange={(v) => setForm((f) => ({ ...f, image_url: v }))} />
          <TextField label="Target URL (optional)" value={form.target_url} onChange={(v) => setForm((f) => ({ ...f, target_url: v }))} />
          <TextField label="Starts" type="date" value={form.starts_at} onChange={(v) => setForm((f) => ({ ...f, starts_at: v }))} />
          <TextField label="Ends" type="date" value={form.ends_at} onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))} />
          <CheckboxField label="Active" checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {isSaving && <ButtonSpinner />}
            {editing ? "Save changes" : "Create advertisement"}
          </button>
        </form>
      </Drawer>
    </>
  );
}
