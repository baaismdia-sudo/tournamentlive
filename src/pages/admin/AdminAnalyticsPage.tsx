import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { RefreshCw } from "lucide-react";

interface PageViewRow {
  path: string;
  session_id: string;
  country: string | null;
  created_at: string;
  tournament: { name: string } | null;
}

const DAYS = 30;

/**
 * Platform-wide traffic across every tournament's public site — distinct
 * from an organizer's own per-tournament analytics (which stays scoped to
 * their own tournaments via RLS if/when that page is built).
 */
export default function AdminAnalyticsPage() {
  const [rows, setRows] = useState<PageViewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const since = new Date();
    since.setDate(since.getDate() - DAYS);
    const { data, error: err } = await supabase
      .from("page_views")
      .select("path, session_id, country, created_at, tournament:tournaments(name)")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });
    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as PageViewRow[]);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totalViews = rows.length;
  const uniqueSessions = useMemo(() => new Set(rows.map((r) => r.session_id)).size, [rows]);
  const uniqueTournaments = useMemo(() => new Set(rows.map((r) => r.tournament?.name).filter(Boolean)).size, [rows]);

  const dailyTrend = useMemo(() => {
    const buckets = new Map<string, { views: number; sessions: Set<string> }>();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), { views: 0, sessions: new Set() });
    }
    for (const r of rows) {
      const key = r.created_at.slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.views += 1;
        bucket.sessions.add(r.session_id);
      }
    }
    return Array.from(buckets.entries()).map(([date, b]) => ({
      date: date.slice(5),
      views: b.views,
      sessions: b.sessions.size,
    }));
  }, [rows]);

  const topTournaments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const name = r.tournament?.name ?? "Unknown";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const c = r.country ?? "Unknown";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  return (
    <>
      <title>Analytics · Scorio Admin</title>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">Traffic across every tournament, last {DAYS} days.</p>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-secondary)]">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Page views", value: totalViews },
          { label: "Unique visitors", value: uniqueSessions },
          { label: "Active tournaments", value: uniqueTournaments },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-heading)]">{isLoading ? "…" : stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="mb-4 text-sm font-semibold text-[var(--color-heading)]">Traffic trend</p>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" name="Page Views" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sessions" name="Unique Visitors" stroke="var(--color-success)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--color-heading)]">Top tournaments by traffic</p>
          {topTournaments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No data yet</p>
          ) : (
            <ul className="space-y-2">
              {topTournaments.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[var(--color-text)]">{name}</span>
                  <span className="font-medium text-[var(--color-muted)]">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--color-heading)]">Top countries</p>
          {topCountries.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No data yet</p>
          ) : (
            <ul className="space-y-2">
              {topCountries.map(([country, count]) => (
                <li key={country} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text)]">{country}</span>
                  <span className="font-medium text-[var(--color-muted)]">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
