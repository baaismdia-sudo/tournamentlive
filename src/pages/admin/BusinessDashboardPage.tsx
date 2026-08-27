import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, UserCheck, UserX, Clock, CreditCard, XCircle, AlertTriangle, IndianRupee, RefreshCw, FileText } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { StatCard } from "../../features/admin/components/StatCard";
import { StatCardSkeleton } from "../../features/admin/components/StatCardSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";

interface BusinessStats {
  total_customers: number; active_customers: number; inactive_customers: number; pending_rental_requests: number;
  active_rentals: number; expired_rentals: number; expiring_7_days: number; monthly_revenue: number;
  pending_renewals: number; total_invoices: number;
}
interface ExpiringRow { subscription_id: string; organizer_name: string; plan_name: string; ends_at: string; days_remaining: number }

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function BusinessDashboardPage() {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [expiring, setExpiring] = useState<ExpiringRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([supabase.rpc("admin_business_stats"), supabase.rpc("admin_expiring_subscriptions", { p_within_days: 30 })])
      .then(([statsRes, expiringRes]) => {
        if (statsRes.error) throw statsRes.error;
        setStats(statsRes.data as BusinessStats);
        setExpiring((expiringRes.data ?? []) as ExpiringRow[]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load business stats"))
      .finally(() => setIsLoading(false));
  }, []);

  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="space-y-8 p-6">
      <title>Business Dashboard · TournamentLive Admin</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-heading)]">Business Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">Customers, rentals, and revenue at a glance.</p>
        </div>
        <Link to="/admin/rental-enquiries" className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
          Review rental enquiries
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading || !stats ? Array.from({ length: 10 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Customers" value={stats.total_customers.toLocaleString()} icon={Users} tone="primary" />
            <StatCard label="Active Customers" value={stats.active_customers.toLocaleString()} icon={UserCheck} tone="success" />
            <StatCard label="Inactive Customers" value={stats.inactive_customers.toLocaleString()} icon={UserX} tone="warning" />
            <StatCard label="Pending Requests" value={stats.pending_rental_requests.toLocaleString()} icon={Clock} tone="warning" />
            <StatCard label="Active Rentals" value={stats.active_rentals.toLocaleString()} icon={CreditCard} tone="success" />
            <StatCard label="Expired Rentals" value={stats.expired_rentals.toLocaleString()} icon={XCircle} tone="danger" />
            <StatCard label="Expiring (7d)" value={stats.expiring_7_days.toLocaleString()} icon={AlertTriangle} tone="warning" />
            <StatCard label="Monthly Revenue" value={formatCurrency(stats.monthly_revenue)} icon={IndianRupee} tone="primary" />
            <StatCard label="Pending Renewals" value={stats.pending_renewals.toLocaleString()} icon={RefreshCw} tone="secondary" />
            <StatCard label="Total Invoices" value={stats.total_invoices.toLocaleString()} icon={FileText} tone="accent" />
          </>
        )}
      </div>

      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-3 font-heading text-sm font-semibold text-[var(--color-heading)]">Upcoming expiries (next 30 days)</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Nothing expiring soon.</p>
        ) : (
          <div className="space-y-2">
            {expiring.map((row) => (
              <div key={row.subscription_id} className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-[var(--color-heading)]">{row.organizer_name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{row.plan_name}</p>
                </div>
                <span className={`text-xs font-medium ${row.days_remaining <= 3 ? "text-[var(--color-danger)]" : row.days_remaining <= 7 ? "text-[var(--color-warning)]" : "text-[var(--color-muted)]"}`}>
                  {row.days_remaining <= 0 ? "Expired" : `${row.days_remaining} days left`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
