import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { TextField, TextAreaField, CheckboxField } from "../../features/admin/components/FormField";
import { TournamentSelector } from "../../features/organizer/components/TournamentSelector";
import { useOrganizerTournaments } from "../../features/organizer/hooks/useOrganizerTournaments";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../features/admin/components/EmptyState";
import { FileText } from "lucide-react";

interface CustomPage { id: string; title: string; slug: string; content: string; is_published: boolean }
const emptyForm = { title: "", slug: "", content: "", is_published: false };

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CustomPagesPage() {
  const { tournaments, selectedId, setSelectedId, isLoading: tournamentsLoading } = useOrganizerTournaments();
  const [rows, setRows] = useState<CustomPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomPage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    const { data } = await supabase.from("custom_pages").select("*").eq("tournament_id", selectedId).order("sort_order");
    setRows((data ?? []) as CustomPage[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (p: CustomPage) => { setEditing(p); setForm({ title: p.title, slug: p.slug, content: p.content, is_published: p.is_published }); setDrawerOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const values = { title: form.title, slug: form.slug || slugify(form.title), content: form.content, is_published: form.is_published, tournament_id: selectedId };
      if (editing) await supabase.from("custom_pages").update(values).eq("id", editing.id);
      else await supabase.from("custom_pages").insert(values);
      setDrawerOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (p: CustomPage) => { await supabase.from("custom_pages").delete().eq("id", p.id); load(); };

  const columns: Column<CustomPage>[] = [
    { header: "Title", render: (p) => <span className="font-medium text-[var(--color-heading)]">{p.title}</span> },
    { header: "Slug", render: (p) => <span className="font-mono text-xs text-[var(--color-muted)]">/{p.slug}</span> },
    { header: "Status", render: (p) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_published ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{p.is_published ? "Published" : "Draft"}</span> },
  ];

  if (tournamentsLoading) return null;
  if (tournaments.length === 0) return <EmptyState icon={FileText} title="Create a tournament first" />;

  return (
    <>
      <title>Custom Pages · TournamentLive</title>
      <div className="px-6 pt-6"><TournamentSelector tournaments={tournaments} selectedId={selectedId} onChange={setSelectedId} /></div>
      <AdminDataTable
        title="Custom Pages"
        description="Unlimited extra pages — History, Rules, Committee, Registration, and more."
        columns={columns} rows={rows} isLoading={isLoading} error={null} search="" onSearchChange={() => {}}
        onCreate={openCreate} onEdit={openEdit} onDelete={remove} page={1} totalPages={1} onPageChange={() => {}}
        emptyLabel="No custom pages yet"
      />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? "Edit page" : "New page"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <TextField label="Slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} />
          <TextAreaField label="Content" value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} rows={10} />
          <CheckboxField label="Published" checked={form.is_published} onChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {isSaving && <ButtonSpinner />}
            {editing ? "Save changes" : "Create page"}
          </button>
        </form>
      </Drawer>
    </>
  );
}
