import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Trash2, ExternalLink } from "lucide-react";

interface MediaRow {
  id: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: number | null;
  folder: string | null;
  created_at: string;
  deleted_at: string | null;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

/** Platform-wide media library oversight — every uploaded file across every organizer, for storage moderation. */
export default function AdminMediaLibraryPage() {
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState(0);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("media_library")
      .select("id, file_url, file_type, file_size_bytes, folder, created_at, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) { setError(err.message); setIsLoading(false); return; }
    setRows((data ?? []) as MediaRow[]);
    setTotalSize((data ?? []).reduce((sum, r) => sum + (r.file_size_bytes ?? 0), 0));
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const remove = async (row: MediaRow) => {
    const { error: err } = await supabase.from("media_library").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (err) return notify(`Failed: ${err.message}`);
    notify("File removed");
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const isImage = (type: string | null) => !!type && type.startsWith("image/");

  return (
    <>
      <title>Media Library · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Most recent 100 files across every organizer — {formatBytes(totalSize)} shown below.
      </p>
      {error && <p className="mb-4 rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No files found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((r) => (
            <div key={r.id} className="group relative overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex h-28 w-full items-center justify-center bg-[var(--color-surface-secondary)]">
                {isImage(r.file_type) ? (
                  <img src={r.file_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">📄</span>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs text-[var(--color-muted)]">{r.folder ?? "—"}</p>
                <p className="text-xs font-medium text-[var(--color-heading)]">{formatBytes(r.file_size_bytes)}</p>
              </div>
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <a href={r.file_url} target="_blank" rel="noreferrer" aria-label="Open" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><ExternalLink size={13} /></a>
                <button onClick={() => remove(r)} aria-label="Remove" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-[var(--color-danger)]"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
