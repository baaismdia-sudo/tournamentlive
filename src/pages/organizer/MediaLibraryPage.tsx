import { useEffect, useRef, useState } from "react";
import { Upload, Search, Trash2, FolderOpen } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { PageLoader, ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../features/admin/components/EmptyState";

interface MediaItem { id: string; file_url: string; file_type: string; folder: string; alt_text: string | null }

const FOLDERS = ["General", "Images", "Videos", "Logos", "Icons", "Documents"];

/** Client-side WebP conversion + downscale, same technique as the avatar uploader. */
async function convertToWebp(file: File, maxDimension = 1600): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", 0.85));
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}

export default function MediaLibraryPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folder, setFolder] = useState("All");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!profile) return;
    setIsLoading(true);
    const { data } = await supabase.from("media_library").select("id, file_url, file_type, folder, alt_text").eq("organizer_id", profile.id).is("deleted_at", null).order("created_at", { ascending: false });
    setItems((data ?? []) as MediaItem[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !profile) return;
    setIsUploading(true);
    try {
      for (const rawFile of Array.from(files)) {
        const file = await convertToWebp(rawFile);
        const path = `${profile.id}/media/${Date.now()}-${file.name}`;
        const bucket = file.type.startsWith("video/") ? "videos" : "public-files";
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
        if (uploadError) continue;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        await supabase.from("media_library").insert({
          organizer_id: profile.id, file_url: urlData.publicUrl, file_type: file.type.startsWith("video/") ? "video" : "image",
          file_size_bytes: file.size, uploaded_by: profile.id, folder: folder === "All" ? "General" : folder,
        });
      }
      load();
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (item: MediaItem) => {
    await supabase.from("media_library").update({ deleted_at: new Date().toISOString() }).eq("id", item.id);
    load();
  };

  const filtered = items.filter((i) => (folder === "All" || i.folder === folder) && (!search || i.file_url.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-5 p-6">
      <title>Media Library · TournamentLive</title>
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Media Library</h1>
        <p className="text-sm text-[var(--color-muted)]">Central storage for logos, icons, images, and documents — images auto-convert to WebP on upload.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]">
          <option value="All">All folders</option>
          {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2">
          <Search size={15} className="text-[var(--color-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..." className="bg-transparent text-sm outline-none" />
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="ml-auto flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
          {isUploading ? <ButtonSpinner /> : <Upload size={15} />} Bulk upload
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        className="rounded-card border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted)]"
      >
        Drag & drop files here to upload to <strong>{folder === "All" ? "General" : folder}</strong>
      </div>

      {isLoading ? <PageLoader label="Loading media..." /> : filtered.length === 0 ? <EmptyState icon={FolderOpen} title="No files yet" /> : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {filtered.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)]">
              {item.file_type === "video" ? (
                <video src={item.file_url} className="h-full w-full object-cover" muted />
              ) : (
                <img src={item.file_url} alt={item.alt_text ?? ""} className="h-full w-full object-cover" loading="lazy" />
              )}
              <button onClick={() => remove(item)} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
