import { useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { TournamentSelector } from "../../features/organizer/components/TournamentSelector";
import { useOrganizerTournaments } from "../../features/organizer/hooks/useOrganizerTournaments";
import { SelectField, TextField } from "../../features/admin/components/FormField";
import { PageLoader, ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../features/admin/components/EmptyState";

interface DownloadItem { id: string; title: string; file_url: string; category: string }

const CATEGORIES = [
  { value: "rule_book", label: "Rule Book" }, { value: "schedule", label: "Schedule" }, { value: "brochure", label: "Brochure" },
  { value: "registration_form", label: "Registration Form" }, { value: "media_kit", label: "Media Kit" }, { value: "other", label: "Other" },
];

export default function DownloadsPage() {
  const { profile } = useAuth();
  const { tournaments, selectedId, setSelectedId, isLoading: tournamentsLoading } = useOrganizerTournaments();
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("rule_book");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    const { data } = await supabase.from("tournament_downloads").select("*").eq("tournament_id", selectedId).order("created_at", { ascending: false });
    setItems((data ?? []) as DownloadItem[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const upload = async (file: File | undefined) => {
    if (!file || !profile || !title.trim()) return;
    setIsUploading(true);
    try {
      const path = `${profile.id}/downloads/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase.from("tournament_downloads").insert({ tournament_id: selectedId, title, file_url: urlData?.signedUrl ?? path, category });
      setTitle("");
      load();
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (item: DownloadItem) => { await supabase.from("tournament_downloads").delete().eq("id", item.id); load(); };

  if (tournamentsLoading) return null;
  if (tournaments.length === 0) return <EmptyState icon={FileText} title="Create a tournament first" />;

  return (
    <div className="space-y-5 p-6">
      <title>Downloads · TournamentLive</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Downloads</h1>
          <p className="text-sm text-[var(--color-muted)]">Rule books, schedules, brochures, and forms visitors can download.</p>
        </div>
        <TournamentSelector tournaments={tournaments} selectedId={selectedId} onChange={setSelectedId} />
      </div>

      <div className="grid gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:grid-cols-4">
        <TextField label="Title" value={title} onChange={setTitle} />
        <SelectField label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
        <div className="flex items-end sm:col-span-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || !title.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
            {isUploading ? <ButtonSpinner /> : <Upload size={15} />} Upload PDF
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </div>
      </div>

      {isLoading ? <PageLoader label="Loading downloads..." /> : items.length === 0 ? <EmptyState icon={FileText} title="No downloads yet" /> : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-heading)]">{item.title}</p>
                <p className="text-xs capitalize text-[var(--color-muted)]">{item.category.replace("_", " ")}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={item.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"><Download size={13} /> Download</a>
                <button onClick={() => remove(item)} aria-label="Delete"><Trash2 size={14} className="text-[var(--color-muted)] hover:text-[var(--color-danger)]" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
