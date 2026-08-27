import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { TextField, SelectField } from "../../features/admin/components/FormField";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../contexts/AuthContext";

interface Theme { id: string; name: string; primary_color: string; secondary_color: string; accent_color: string; layout_variant: string; is_base_template: boolean }
const emptyForm = { name: "", primary_color: "#4F46E5", secondary_color: "#7C3AED", accent_color: "#06B6D4", layout_variant: "classic" };

export default function ThemeManagerPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Theme | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("custom_themes").select("*").eq("is_base_template", true).order("name");
    setRows((data ?? []) as Theme[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (t: Theme) => { setEditing(t); setForm({ name: t.name, primary_color: t.primary_color, secondary_color: t.secondary_color, accent_color: t.accent_color, layout_variant: t.layout_variant }); setDrawerOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      const values = { ...form, is_base_template: true, organizer_id: profile.id };
      if (editing) await supabase.from("custom_themes").update(values).eq("id", editing.id);
      else await supabase.from("custom_themes").insert(values);
      setDrawerOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (t: Theme) => { await supabase.from("custom_themes").delete().eq("id", t.id); load(); };

  const columns: Column<Theme>[] = [
    { header: "Theme", render: (t) => (
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-full" style={{ background: `linear-gradient(135deg, ${t.primary_color}, ${t.secondary_color})` }} />
        <span className="font-medium text-[var(--color-heading)]">{t.name}</span>
      </div>
    ) },
    { header: "Layout", render: (t) => <span className="capitalize">{t.layout_variant}</span> },
  ];

  return (
    <>
      <title>Theme Manager · TournamentLive Admin</title>
      <AdminDataTable
        title="Theme Manager"
        description="Built-in themes available to every organizer's Website Builder — the same 10 named templates (Classic, Modern, Sports, Minimal, Dark, Light, Professional, Football, Cricket, Esports) are hardcoded as a fallback in the organizer UI, and any rows here extend that list."
        columns={columns} rows={rows} isLoading={isLoading} error={null} search="" onSearchChange={() => {}}
        onCreate={openCreate} onEdit={openEdit} onDelete={remove} page={1} totalPages={1} onPageChange={() => {}}
        emptyLabel="No built-in themes in the database yet"
      />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? "Edit theme" : "New built-in theme"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <div className="grid grid-cols-3 gap-3">
            <div><label className="mb-1.5 block text-sm font-medium">Primary</label><input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="h-10 w-full rounded-lg border border-[var(--color-border)]" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Secondary</label><input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="h-10 w-full rounded-lg border border-[var(--color-border)]" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Accent</label><input type="color" value={form.accent_color} onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))} className="h-10 w-full rounded-lg border border-[var(--color-border)]" /></div>
          </div>
          <SelectField label="Layout" value={form.layout_variant} onChange={(v) => setForm((f) => ({ ...f, layout_variant: v }))} options={[{ value: "classic", label: "Classic" }, { value: "modern", label: "Modern" }, { value: "minimal", label: "Minimal" }]} />
          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {isSaving && <ButtonSpinner />}
            {editing ? "Save changes" : "Create theme"}
          </button>
        </form>
      </Drawer>
    </>
  );
}
