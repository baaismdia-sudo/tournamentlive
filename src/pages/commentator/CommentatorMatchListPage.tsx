import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquareQuote } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PageLoader } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../features/admin/components/EmptyState";

interface AssignedMatch {
  id: string;
  status: string;
  tournaments: { name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
}

export default function CommentatorMatchListPage() {
  const [matches, setMatches] = useState<AssignedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Same fix as ScorekeeperMatchListPage: the matches table's only SELECT
      // RLS policy is "public read of any publicly-visible tournament," so
      // without this filter every commentator sees every live match on the
      // entire platform, not just their own organizer's.
      const { data: orgId, error: orgErr } = await supabase.rpc("effective_organizer_id");
      if (!mounted) return;
      if (orgErr || !orgId) {
        setError("Couldn't determine which organizer you're assigned to.");
        setIsLoading(false);
        return;
      }

      const { data, error: matchErr } = await supabase
        .from("matches")
        .select("id, status, tournaments!inner(name, organizer_id), home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)")
        .eq("tournaments.organizer_id", orgId)
        .in("status", ["scheduled", "warm_up", "live", "half_time", "break", "extra_time", "penalty_shootout"])
        .order("scheduled_at", { ascending: true });
      if (!mounted) return;
      if (matchErr) {
        setError(matchErr.message);
      } else {
        setMatches((data ?? []) as unknown as AssignedMatch[]);
      }
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) return <PageLoader label="Loading matches..." />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <title>Commentator · TournamentLive</title>
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Matches</h1>
        <p className="text-sm text-[var(--color-muted)]">Pick a match to start commentating.</p>
      </div>
      {error && (
        <p className="rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{error}</p>
      )}
      {matches.length === 0 ? (
        <EmptyState icon={MessageSquareQuote} title="No matches to commentate right now" />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <Link key={m.id} to={`/commentator/${m.id}`} className="flex items-center justify-between gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:shadow-[var(--shadow-md)]">
              <div>
                <p className="font-medium text-[var(--color-heading)]">{m.home?.name ?? "TBD"} vs {m.away?.name ?? "TBD"}</p>
                <p className="text-xs text-[var(--color-muted)]">{m.tournaments?.name}</p>
              </div>
              <span className="text-xs capitalize text-[var(--color-muted)]">{m.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
