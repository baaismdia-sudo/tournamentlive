import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldHalf, User, Swords, Globe, Link2, Handshake, Image, Newspaper, UserPlus, X, Copy, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { getTournamentUrl } from "../../lib/publicUrls";
import { PageLoader } from "../../components/ui/LoadingSpinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { getErrorMessage } from "../../lib/errors";

interface TournamentDetail {
  id: string;
  name: string;
  sport: string;
  status: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

interface StaffAssignment {
  id: string;
  role_in_tournament: string;
  profiles: { full_name: string; email: string } | null;
}

const QUICK_LINKS = [
  { label: "Teams", to: "/dashboard/teams", icon: ShieldHalf },
  { label: "Players", to: "/dashboard/players", icon: User },
  { label: "Matches", to: "/dashboard/matches", icon: Swords },
  { label: "Website Builder", to: "/dashboard/website", icon: Globe },
  { label: "Custom Domain", to: "/dashboard/domain", icon: Link2 },
  { label: "Sponsors", to: "/dashboard/sponsors", icon: Handshake },
  { label: "Gallery", to: "/dashboard/gallery", icon: Image },
  { label: "News", to: "/dashboard/news", icon: Newspaper },
];

function StaffAssignmentsPanel({ tournamentId }: { tournamentId: string }) {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"manager" | "scorekeeper" | "commentator">("scorekeeper");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("tournament_staff_assignments")
      .select("id, role_in_tournament, profiles(full_name, email)")
      .eq("tournament_id", tournamentId);
    setAssignments((data ?? []) as unknown as StaffAssignment[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const invite = async () => {
    if (!email.trim()) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("invite_tournament_staff", {
        p_email: email.trim(),
        p_role: selectedRole,
        p_tournament_id: tournamentId,
      });
      if (rpcError) throw rpcError;
      const result = data as { full_name: string; role: string } | null;
      setSuccess(`${result?.full_name ?? email} is now assigned as ${selectedRole} on this tournament.`);
      setEmail("");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (assignmentId: string) => {
    await supabase.from("tournament_staff_assignments").delete().eq("id", assignmentId);
    load();
  };

  return (
    <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="font-heading text-sm font-semibold text-[var(--color-heading)]">Assigned staff</h2>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Invite a manager, scorekeeper, or commentator by the email address of their existing TournamentLive account.
        They must sign up first — inviting them here links their account to your business and gives them access to
        this tournament.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their-email@example.com"
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]">
          <option value="manager">Manager</option>
          <option value="scorekeeper">Scorekeeper</option>
          <option value="commentator">Commentator</option>
        </select>
        <button onClick={invite} disabled={isSaving || !email.trim()} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
          <UserPlus size={14} /> Invite
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
      {success && <p className="mt-2 text-xs text-[var(--color-success)]">{success}</p>}

      {assignments.length === 0 && !error && (
        <p className="mt-3 text-xs text-[var(--color-muted)]">No staff assigned to this tournament yet.</p>
      )}

      <ul className="mt-4 space-y-2">
        {assignments.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
            <span className="text-[var(--color-text)]">{a.profiles?.full_name} <span className="capitalize text-[var(--color-muted)]">· {a.role_in_tournament}</span></span>
            <button onClick={() => remove(a.id)} aria-label="Remove assignment" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"><X size={14} /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("tournaments").select("id, name, sport, status, slug, description, logo_url").eq("id", id).single().then(({ data, error: fetchError }) => {
      if (fetchError) setError(fetchError.message);
      else setTournament(data);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) return <PageLoader label="Loading tournament..." />;
  if (error || !tournament) return <div className="p-6"><ErrorState message={error ?? "Tournament not found"} /></div>;

  return (
    <div className="space-y-6 p-6">
      <title>{`${tournament.name} · TournamentLive`}</title>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]">
          {tournament.logo_url ? <img src={tournament.logo_url} alt="" className="h-full w-full object-cover" /> : "🏆"}
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">{tournament.name}</h1>
          <p className="text-sm text-[var(--color-muted)]">{tournament.sport} · <span className="capitalize">{tournament.status.replace("_", " ")}</span></p>
        </div>
      </div>

      {tournament.description && <p className="max-w-2xl text-sm text-[var(--color-text)]">{tournament.description}</p>}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5">
        <span className="text-xs font-medium text-[var(--color-muted)]">Public Website</span>
        <a href={getTournamentUrl(tournament.slug)} target="_blank" rel="noreferrer" className="truncate text-sm text-[var(--color-primary)] hover:underline">
          {getTournamentUrl(tournament.slug)}
        </a>
        <div className="ml-auto flex items-center gap-2">
          <a href={getTournamentUrl(tournament.slug)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]">
            <ExternalLink size={13} /> Open Public Website
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(getTournamentUrl(tournament.slug));
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          >
            <Copy size={13} /> {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.label} to={link.to} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center transition-shadow hover:shadow-[var(--shadow-md)]">
            <link.icon size={18} className="mx-auto mb-2 text-[var(--color-primary)]" />
            <p className="text-sm font-medium text-[var(--color-heading)]">{link.label}</p>
          </Link>
        ))}
      </div>

      <StaffAssignmentsPanel tournamentId={tournament.id} />
    </div>
  );
}
