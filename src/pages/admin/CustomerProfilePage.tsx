import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { PageLoader, ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { AccountStatusBadge } from "../../components/ui/Badge";

interface Customer { id: string; full_name: string; email: string; phone: string | null; status: string; created_at: string; last_login_at: string | null }
interface Subscription { id: string; status: string; starts_at: string; ends_at: string; rental_plans: { name: string } | null }
interface Invoice { id: string; invoice_number: string; total_cents: number; status: string; issue_date: string }
interface LoginRow { id: string; browser: string | null; device: string | null; os: string | null; ip_address: string | null; created_at: string }
interface ActivityRow { id: string; action: string; created_at: string }
interface TournamentRow { id: string; name: string; status: string }

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    const [customerRes, subsRes, invoicesRes, loginsRes, activityRes, tournamentsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, status, created_at, last_login_at").eq("id", id).single(),
      supabase.from("subscriptions").select("id, status, starts_at, ends_at, rental_plans(name)").eq("organizer_id", id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("id, invoice_number, total_cents, status, issue_date").eq("organizer_id", id).order("issue_date", { ascending: false }),
      supabase.from("login_history").select("id, browser, device, os, ip_address, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(10),
      supabase.from("activity_logs").select("id, action, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(15),
      supabase.from("tournaments").select("id, name, status").eq("organizer_id", id).is("deleted_at", null),
    ]);
    setCustomer(customerRes.data);
    setSubscriptions((subsRes.data ?? []) as unknown as Subscription[]);
    setInvoices((invoicesRes.data ?? []) as Invoice[]);
    setLogins((loginsRes.data ?? []) as LoginRow[]);
    setActivity((activityRes.data ?? []) as ActivityRow[]);
    setTournaments((tournamentsRes.data ?? []) as TournamentRow[]);
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const extend = async (subscriptionId: string) => {
    const days = window.prompt("Extend by how many days?", "30");
    if (!days) return;
    setBusy(true);
    await supabase.rpc("admin_extend_subscription", { p_subscription_id: subscriptionId, p_days: Number(days) });
    await load();
    setBusy(false);
  };

  const suspend = async (subscriptionId: string) => {
    setBusy(true);
    await supabase.rpc("admin_suspend_subscription", { p_subscription_id: subscriptionId });
    await load();
    setBusy(false);
  };

  if (isLoading) return <PageLoader label="Loading customer..." />;
  if (!customer) return <div className="p-6"><ErrorState message="Customer not found" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <title>{`${customer.full_name} · TournamentLive Admin`}</title>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">{customer.full_name}</h1>
          <p className="text-sm text-[var(--color-muted)]">{customer.email} {customer.phone && `· ${customer.phone}`}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Joined {new Date(customer.created_at).toLocaleDateString()}
            {customer.last_login_at && ` · Last login ${new Date(customer.last_login_at).toLocaleString()}`}
          </p>
        </div>
        <AccountStatusBadge status={customer.status as "active" | "suspended" | "pending"} />
      </div>

      <Section title="Tournaments">
        {tournaments.length === 0 ? <Empty text="No tournaments yet" /> : (
          <ul className="space-y-1.5 text-sm">
            {tournaments.map((t) => <li key={t.id} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0"><span className="text-[var(--color-text)]">{t.name}</span><span className="capitalize text-[var(--color-muted)]">{t.status.replace("_", " ")}</span></li>)}
          </ul>
        )}
      </Section>

      <Section title="Subscription history">
        {subscriptions.length === 0 ? <Empty text="No subscriptions yet" /> : (
          <div className="space-y-2">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-[var(--color-heading)]">{s.rental_plans?.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{new Date(s.starts_at).toLocaleDateString()} → {new Date(s.ends_at).toLocaleDateString()} · <span className="capitalize">{s.status}</span></p>
                </div>
                {s.status === "active" && (
                  <div className="flex gap-2">
                    <button onClick={() => extend(s.id)} disabled={busy} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-surface-secondary)]">{busy && <ButtonSpinner />}Extend</button>
                    <button onClick={() => suspend(s.id)} disabled={busy} className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-900/20">Suspend</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Invoices">
        {invoices.length === 0 ? <Empty text="No invoices yet" /> : (
          <ul className="space-y-1.5 text-sm">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
                <span className="font-mono text-xs text-[var(--color-text)]">{inv.invoice_number}</span>
                <span className="text-[var(--color-muted)]">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(inv.total_cents / 100)} · <span className="capitalize">{inv.status}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Login history">
        {logins.length === 0 ? <Empty text="No login history recorded yet" /> : (
          <ul className="space-y-1.5 text-sm">
            {logins.map((l) => (
              <li key={l.id} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
                <span className="text-[var(--color-text)]">{l.browser ?? "Unknown"} on {l.os ?? "Unknown"} ({l.device ?? "desktop"})</span>
                <span className="text-xs text-[var(--color-muted)]">{new Date(l.created_at).toLocaleString()} · {l.ip_address ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Activity">
        {activity.length === 0 ? <Empty text="No recent activity" /> : (
          <ul className="space-y-1.5 text-sm">
            {activity.map((a) => <li key={a.id} className="flex justify-between border-b border-[var(--color-border)] py-1.5 last:border-0"><span className="text-[var(--color-text)]">{a.action.replace(/_/g, " ")}</span><span className="text-xs text-[var(--color-muted)]">{new Date(a.created_at).toLocaleString()}</span></li>)}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-3 font-heading text-sm font-semibold text-[var(--color-heading)]">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[var(--color-muted)]">{text}</p>;
}
