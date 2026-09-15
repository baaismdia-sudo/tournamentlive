import { useState } from "react";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { TextField, TextAreaField } from "../../features/admin/components/FormField";
import { useAdminTable } from "../../features/admin/hooks/useAdminTable";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
}

const emptyForm = { question: "", answer: "", category: "", sort_order: "0" };

/**
 * Platform-wide FAQ entries (tournament_id = null). Tournament-specific FAQs
 * are managed by organizers from within their own tournament dashboard and
 * are not shown here.
 */
export default function FaqPage() {
  const table = useAdminTable<Faq>("faq", "question");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };
  const openEdit = (f: Faq) => {
    setEditing(f);
    setForm({
      question: f.question,
      answer: f.answer,
      category: f.category ?? "",
      sort_order: String(f.sort_order ?? 0),
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const values = {
        question: form.question,
        answer: form.answer,
        category: form.category || null,
        sort_order: Number(form.sort_order) || 0,
        tournament_id: null,
      };
      if (editing) await table.update(editing.id, values);
      else await table.create(values);
      setDrawerOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save FAQ entry");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<Faq>[] = [
    { header: "Question", render: (f) => <span className="font-medium text-[var(--color-heading)]">{f.question}</span> },
    { header: "Category", render: (f) => f.category ?? "—" },
    { header: "Order", render: (f) => f.sort_order },
  ];

  return (
    <>
      <title>FAQ · TournamentLive Admin</title>
      <AdminDataTable
        title="FAQ"
        description="Platform-wide frequently asked questions shown on the public marketing site."
        columns={columns}
        rows={table.rows}
        isLoading={table.isLoading}
        error={table.error}
        search={table.search}
        onSearchChange={table.setSearch}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={(f) => table.remove(f.id)}
        page={table.page}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        emptyLabel="No FAQ entries yet"
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? "Edit FAQ entry" : "New FAQ entry"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)] dark:bg-red-900/20">{formError}</p>}
          <TextField label="Question" value={form.question} onChange={(v) => setForm((f) => ({ ...f, question: v }))} />
          <TextAreaField label="Answer" value={form.answer} onChange={(v) => setForm((f) => ({ ...f, answer: v }))} rows={5} />
          <TextField label="Category (optional)" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
          <TextField label="Sort order" type="number" value={form.sort_order} onChange={(v) => setForm((f) => ({ ...f, sort_order: v }))} />
          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {isSaving && <ButtonSpinner />}
            {editing ? "Save changes" : "Create FAQ entry"}
          </button>
        </form>
      </Drawer>
    </>
  );
}
