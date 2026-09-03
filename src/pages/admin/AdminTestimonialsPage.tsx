import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";
import { Star, Trash2, Eye, EyeOff } from "lucide-react";

interface TestimonialRow {
  id: string;
  author_name: string;
  author_role: string | null;
  message: string;
  rating: number | null;
  is_published: boolean;
  photo_url: string | null;
  tournament: { name: string } | null;
}

const PAGE_SIZE = 20;

/** Platform-wide testimonial moderation — fan/participant testimonials submitted across every tournament. */
export default function AdminTestimonialsPage() {
  const [rows, setRows] = useState<TestimonialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error: err, count } = await supabase
      .from("testimonials")
      .select("id, author_name, author_role, message, rating, is_published, photo_url, tournament:tournaments(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as unknown as TestimonialRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const togglePublish = async (row: TestimonialRow) => {
    const { error: err } = await supabase.from("testimonials").update({ is_published: !row.is_published }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify(row.is_published ? "Hidden" : "Published");
    load();
  };

  const remove = async (row: TestimonialRow) => {
    const { error: err } = await supabase.from("testimonials").delete().eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify("Testimonial removed");
    load();
  };

  const columns: Column<TestimonialRow>[] = [
    {
      header: "Testimonial",
      render: (t) => (
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            {t.photo_url ? <img src={t.photo_url} alt="" className="h-full w-full object-cover" /> : "🙂"}
          </div>
          <div>
            <div className="font-medium text-[var(--color-heading)]">{t.author_name}{t.author_role && <span className="font-normal text-[var(--color-muted)]"> · {t.author_role}</span>}</div>
            <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-[var(--color-muted)]">{t.message}</p>
          </div>
        </div>
      ),
    },
    { header: "Tournament", render: (t) => t.tournament?.name ?? "—" },
    { header: "Rating", render: (t) => t.rating ? <span className="flex items-center gap-0.5 text-[var(--color-warning)]">{t.rating} <Star size={12} fill="currentColor" /></span> : "—" },
    {
      header: "Actions",
      render: (t) => (
        <div className="flex items-center gap-2">
          <button onClick={() => togglePublish(t)} aria-label="Toggle publish" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
            {t.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={() => remove(t)} aria-label="Remove" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <title>Testimonials · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <AdminDataTable title="Testimonials" description="Fan and participant testimonials submitted across every tournament." columns={columns} rows={rows} isLoading={isLoading} error={error} search="" onSearchChange={() => {}} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} emptyLabel="No testimonials found" />
    </>
  );
}
