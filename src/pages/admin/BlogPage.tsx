import { useState } from "react";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Drawer } from "../../features/admin/components/Drawer";
import { TextField, TextAreaField, CheckboxField } from "../../features/admin/components/FormField";
import { useAdminTable } from "../../features/admin/hooks/useAdminTable";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
}

const emptyForm = { title: "", slug: "", excerpt: "", content: "", cover_image_url: "", tags: "", is_published: false };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Platform blog (tournament_id = null rows). Tournament-level blog/news
 * posts are managed by organizers from their own dashboard.
 */
export default function BlogPage() {
  const table = useAdminTable<BlogPost>("blog_posts", "title");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };
  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      content: p.content,
      cover_image_url: p.cover_image_url ?? "",
      tags: (p.tags ?? []).join(", "),
      is_published: p.is_published,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const wasPublished = editing?.is_published ?? false;
      const values = {
        title: form.title,
        slug: form.slug ? slugify(form.slug) : slugify(form.title),
        excerpt: form.excerpt || null,
        content: form.content,
        cover_image_url: form.cover_image_url || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        is_published: form.is_published,
        published_at: form.is_published && !wasPublished ? new Date().toISOString() : editing?.published_at,
        tournament_id: null,
      };
      if (editing) await table.update(editing.id, values);
      else await table.create(values);
      setDrawerOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save blog post");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<BlogPost>[] = [
    { header: "Title", render: (p) => <span className="font-medium text-[var(--color-heading)]">{p.title}</span> },
    { header: "Slug", render: (p) => <span className="font-mono text-xs text-[var(--color-muted)]">/{p.slug}</span> },
    { header: "Tags", render: (p) => (p.tags?.length ? p.tags.join(", ") : "—") },
    {
      header: "Status",
      render: (p) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_published ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>
          {p.is_published ? "Published" : "Draft"}
        </span>
      ),
    },
    { header: "Published", render: (p) => (p.published_at ? new Date(p.published_at).toLocaleDateString() : "—") },
  ];

  return (
    <>
      <title>Blog · TournamentLive Admin</title>
      <AdminDataTable
        title="Blog"
        description="Platform blog posts shown on the public marketing site."
        columns={columns}
        rows={table.rows}
        isLoading={table.isLoading}
        error={table.error}
        search={table.search}
        onSearchChange={table.setSearch}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={(p) => table.remove(p.id)}
        page={table.page}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        emptyLabel="No blog posts yet"
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? "Edit blog post" : "New blog post"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)] dark:bg-red-900/20">{formError}</p>}
          <TextField label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <TextField label="Slug (auto-generated if blank)" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} />
          <TextAreaField label="Excerpt" value={form.excerpt} onChange={(v) => setForm((f) => ({ ...f, excerpt: v }))} rows={2} />
          <TextAreaField label="Content" value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} rows={8} />
          <TextField label="Cover image URL" value={form.cover_image_url} onChange={(v) => setForm((f) => ({ ...f, cover_image_url: v }))} />
          <TextField label="Tags (comma-separated)" value={form.tags} onChange={(v) => setForm((f) => ({ ...f, tags: v }))} />
          <CheckboxField label="Published" checked={form.is_published} onChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {isSaving && <ButtonSpinner />}
            {editing ? "Save changes" : "Create post"}
          </button>
        </form>
      </Drawer>
    </>
  );
}
