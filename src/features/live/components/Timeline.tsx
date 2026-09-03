import { useState } from "react";
import type { MatchEventRow } from "../hooks/useRealtimeMatch";
import { getSportConfig } from "../data/sportEventConfigs";
import { updateMatchEvent } from "../../../services/supabase/matchControl";

export function Timeline({
  events, sport, onUndo, onChanged,
}: {
  events: MatchEventRow[];
  sport: string;
  onUndo?: (eventId: string) => void;
  /** Called after a successful edit, so the parent can refetch/refresh if it doesn't already do so via realtime. */
  onChanged?: () => void;
}) {
  const config = getSportConfig(sport);
  const iconFor = (eventType: string) => config.quickActions.find((a) => a.eventType === eventType)?.icon ?? "•";
  const visible = [...events].filter((e) => !e.undone).reverse();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (event: MatchEventRow) => {
    setEditingId(event.id);
    setMinuteDraft(event.minute != null ? String(event.minute) : "");
    setDescriptionDraft(event.description ?? "");
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (eventId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateMatchEvent(eventId, {
        minute: minuteDraft.trim() === "" ? null : Number(minuteDraft),
        description: descriptionDraft.trim() === "" ? null : descriptionDraft.trim(),
      });
      setEditingId(null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (visible.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-muted)]">No events yet.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {visible.map((event) => (
        <li key={event.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {editingId === event.id ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minuteDraft}
                  onChange={(e) => setMinuteDraft(e.target.value)}
                  placeholder="Minute"
                  className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
                />
                <input
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => saveEdit(event.id)} disabled={isSaving} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={cancelEdit} disabled={isSaving} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">{iconFor(event.event_type)}</span>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text)]">
                  {event.minute !== null && <span className="mr-2 font-mono text-xs text-[var(--color-muted)]">{event.minute}'</span>}
                  <span className="font-medium text-[var(--color-heading)] capitalize">{event.event_type.replace(/_/g, " ")}</span>
                  {event.description && <span className="text-[var(--color-muted)]"> — {event.description}</span>}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{new Date(event.created_at).toLocaleTimeString()}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button onClick={() => startEdit(event)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                  Edit
                </button>
                {onUndo && (
                  <button onClick={() => onUndo(event.id)} className="text-xs font-medium text-[var(--color-danger)] hover:underline">
                    Undo
                  </button>
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
