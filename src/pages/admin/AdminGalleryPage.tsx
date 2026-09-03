import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Trash2 } from "lucide-react";

interface GalleryRow {
  id: string;
  caption: string | null;
  created_at: string;
  media: { file_url: string } | null;
  tournament: { name: string } | null;
}

/** Platform-wide gallery moderation — image grid across every tournament, with per-image removal. */
export default function AdminGalleryPage() {
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("gallery")
      .select("id, caption, created_at, media:media_library(file_url), tournament:tournaments(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as unknown as GalleryRow[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const remove = async (row: GalleryRow) => {
    const { error: err } = await supabase.from("gallery").delete().eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify("Image removed");
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return (
    <>
      <title>Gallery · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <p className="mb-4 text-sm text-[var(--color-muted)]">Most recent 100 images across every tournament's gallery.</p>
      {error && <p className="mb-4 rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No gallery images found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <div key={r.id} className="group relative overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
              {r.media?.file_url ? (
                <img src={r.media.file_url} alt={r.caption ?? ""} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-[var(--color-surface-secondary)] text-[var(--color-muted)]">No image</div>
              )}
              <div className="p-3">
                <p className="truncate text-xs font-medium text-[var(--color-heading)]">{r.tournament?.name ?? "—"}</p>
                {r.caption && <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{r.caption}</p>}
              </div>
              <button
                onClick={() => remove(r)}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-danger)]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
