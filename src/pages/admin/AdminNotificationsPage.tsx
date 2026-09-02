import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface RecentNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  recipient_count: number;
}

const TARGET_OPTIONS = [
  { value: "organizer", label: "All Organizers" },
  { value: "manager", label: "All Managers" },
  { value: "scorekeeper", label: "All Scorekeepers" },
  { value: "commentator", label: "All Commentators" },
  { value: "viewer", label: "All Viewers" },
  { value: "__all__", label: "Everyone" },
];

const TYPE_STYLE: Record<string, string> = {
  info: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  error: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  system: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
};

/**
 * Broadcasts a notification by inserting one row per matching recipient —
 * this app's notifications table is per-user (profile_id), with no separate
 * broadcast/audience table, so a "send to all organizers" action for real
 * means: look up every organizer's profile id, then insert N rows.
 */
export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState("organizer");
  const [linkUrl, setLinkUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentNotification[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  const loadRecent = async () => {
    setIsLoadingRecent(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, type, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const grouped = new Map<string, RecentNotification>();
    for (const n of data ?? []) {
      const key = `${n.title}|${n.body}|${n.created_at}`;
      if (grouped.has(key)) {
        grouped.get(key)!.recipient_count += 1;
      } else {
        grouped.set(key, { ...n, recipient_count: 1 });
      }
    }
    setRecent(Array.from(grouped.values()).slice(0, 20));
    setIsLoadingRecent(false);
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      notify("Title and message are required.");
      return;
    }
    setIsSending(true);

    const recipientQuery =
      target === "__all__"
        ? supabase.from("profiles").select("id")
        : supabase.from("profiles").select("id, roles!inner(name)").eq("roles.name", target);
    const { data: recipients, error: recErr } = await recipientQuery;
    if (recErr || !recipients || recipients.length === 0) {
      setIsSending(false);
      notify(recErr ? `Failed: ${recErr.message}` : "No matching recipients found.");
      return;
    }

    const rows = recipients.map((r) => ({
      profile_id: r.id,
      type,
      title: title.trim(),
      body: body.trim(),
      link_url: linkUrl.trim() || null,
    }));

    const { error: insertErr } = await supabase.from("notifications").insert(rows);
    setIsSending(false);
    if (insertErr) {
      notify(`Failed: ${insertErr.message}`);
      return;
    }
    notify(`Sent to ${rows.length} recipient${rows.length === 1 ? "" : "s"}.`);
    setTitle("");
    setBody("");
    setLinkUrl("");
    loadRecent();
  };

  return (
    <>
      <title>Notifications · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--color-heading)]">Send a broadcast notification</p>

          <label className="mb-1.5 block text-sm font-medium">Send to</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]">
            {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]">
            {Object.keys(TYPE_STYLE).map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>

          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scheduled maintenance tonight" className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]" />

          <label className="mb-1.5 block text-sm font-medium">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="The platform will be briefly unavailable at 2 AM IST for maintenance." className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]" />

          <label className="mb-1.5 block text-sm font-medium">Link (optional)</label>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="mb-5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]" />

          <button onClick={send} disabled={isSending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {isSending ? "Sending..." : "Send notification"}
          </button>
        </div>

        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--color-heading)]">Recently sent</p>
          {isLoadingRecent ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No notifications sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((n) => (
                <li key={n.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_STYLE[n.type] ?? ""}`}>{n.type}</span>
                    <span className="text-xs text-[var(--color-muted)]">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-heading)]">{n.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{n.body}</p>
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">Sent to {n.recipient_count} recipient{n.recipient_count === 1 ? "" : "s"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
