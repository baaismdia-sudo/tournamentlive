import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { TextField, TextAreaField, SelectField } from "../../features/admin/components/FormField";
import { PageLoader, ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { SuccessBanner } from "../../components/ui/ErrorState";
import { EmptyState } from "../../features/admin/components/EmptyState";

interface Ticket { id: string; subject: string; message: string; status: string; priority: string; created_at: string }

export default function SupportPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !subject.trim() || !message.trim()) return;
    setIsSubmitting(true);
    setSubmitted(false);
    try {
      await supabase.from("support_tickets").insert({ profile_id: profile.id, subject, message, priority });
      await supabase.from("activity_logs").insert({ profile_id: profile.id, action: "support_request_submitted" });
      setSubject("");
      setMessage("");
      setSubmitted(true);
      load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    open: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    in_progress: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
    resolved: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
    closed: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <title>Support · TournamentLive</title>
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Support</h1>
        <p className="text-sm text-[var(--color-muted)]">Open a ticket and our team will respond here and by email.</p>
      </div>

      {submitted && <SuccessBanner message="Ticket submitted — we'll get back to you soon." />}

      <form onSubmit={submit} className="space-y-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <TextField label="Subject" value={subject} onChange={setSubject} />
        <SelectField label="Priority" value={priority} onChange={setPriority} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }]} />
        <TextAreaField label="Message" value={message} onChange={setMessage} rows={4} />
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
          {isSubmitting && <ButtonSpinner />}
          Submit ticket
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-heading text-sm font-semibold text-[var(--color-heading)]">Your tickets</h2>
        {isLoading ? <PageLoader label="Loading tickets..." /> : tickets.length === 0 ? <EmptyState icon={LifeBuoy} title="No tickets yet" /> : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[var(--color-heading)]">{t.subject}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[t.status]}`}>{t.status.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{t.message}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{new Date(t.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
