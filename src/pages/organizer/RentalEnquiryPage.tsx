import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { TextField, TextAreaField, SelectField } from "../../features/admin/components/FormField";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { submitRentalEnquiry } from "../../services/supabase/rentalEnquiries";

interface Plan { id: string; name: string; duration: string; price_cents: number; currency: string }
interface TournamentOption { id: string; name: string; sport: string }
interface SportOption { id: string; name: string }

const emptyForm = {
  rentalPlanId: "", tournamentId: "", fullName: "", organizationName: "", tournamentName: "", sport: "",
  country: "India", state: "", city: "", contactEmail: "", contactPhone: "", whatsappNumber: "",
  tournamentStartsAt: "", tournamentEndsAt: "", expectedTeams: "", expectedPlayers: "", message: "",
};

export default function RentalEnquiryPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("rental_plans").select("id, name, duration, price_cents, currency").eq("is_active", true).order("sort_order").then(({ data }) => setPlans(data ?? []));
    supabase.from("tournaments").select("id, name, sport").is("deleted_at", null).then(({ data }) => setTournaments(data ?? []));
    supabase.from("sports").select("id, name").eq("status", "active").order("sort_order").then(({ data }) => setSports(data ?? []));
  }, []);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({ ...f, fullName: profile.full_name, organizationName: profile.full_name, contactEmail: profile.email, contactPhone: profile.phone ?? "", whatsappNumber: profile.phone ?? "" }));
    }
  }, [profile]);

  const selectTournament = (id: string) => {
    const t = tournaments.find((tt) => tt.id === id);
    setForm((f) => ({ ...f, tournamentId: id, tournamentName: t?.name ?? f.tournamentName, sport: t?.sport ?? f.sport }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rentalPlanId || !form.fullName || !form.organizationName || !form.tournamentName || !form.contactPhone) {
      setError("Plan, name, organization, tournament name, and phone are required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { whatsappUrl } = await submitRentalEnquiry({
        rentalPlanId: form.rentalPlanId, tournamentId: form.tournamentId || undefined,
        fullName: form.fullName, organizationName: form.organizationName, tournamentName: form.tournamentName,
        sport: form.sport, country: form.country, state: form.state, city: form.city,
        contactEmail: form.contactEmail, contactPhone: form.contactPhone, whatsappNumber: form.whatsappNumber || form.contactPhone,
        tournamentStartsAt: form.tournamentStartsAt || undefined, tournamentEndsAt: form.tournamentEndsAt || undefined,
        expectedTeams: form.expectedTeams ? Number(form.expectedTeams) : undefined,
        expectedPlayers: form.expectedPlayers ? Number(form.expectedPlayers) : undefined,
        message: form.message,
      });
      setSubmitted(true);
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <title>Rental Enquiry · TournamentLive</title>
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Activate or renew a rental</h1>
        <p className="text-sm text-[var(--color-muted)]">Fill this in, then continue on WhatsApp — our team activates it manually and confirms by email.</p>
      </div>

      {submitted ? (
        <div className="rounded-card border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-6 text-center">
          <MessageCircle size={28} className="mx-auto mb-3 text-[var(--color-success)]" />
          <p className="font-medium text-[var(--color-heading)]">Enquiry sent</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            We opened WhatsApp with your details pre-filled. Once our team activates your plan, you'll get an
            email and an in-app notification.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)] dark:bg-red-900/20">{error}</p>}

          <SelectField label="Rental plan" value={form.rentalPlanId} onChange={(v) => setForm((f) => ({ ...f, rentalPlanId: v }))} options={[{ value: "", label: "Select a plan" }, ...plans.map((p) => ({ value: p.id, label: `${p.name} — ${new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(p.price_cents / 100)}` }))]} />
          <SelectField label="Existing tournament (optional)" value={form.tournamentId} onChange={selectTournament} options={[{ value: "", label: "New tournament — not created yet" }, ...tournaments.map((t) => ({ value: t.id, label: t.name }))]} />

          <TextField label="Full name" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} />
          <TextField label="Organization" value={form.organizationName} onChange={(v) => setForm((f) => ({ ...f, organizationName: v }))} />
          <TextField label="Tournament name" value={form.tournamentName} onChange={(v) => setForm((f) => ({ ...f, tournamentName: v }))} />
          <SelectField label="Sport" value={form.sport} onChange={(v) => setForm((f) => ({ ...f, sport: v }))} options={[{ value: "", label: "Select a sport" }, ...sports.map((s) => ({ value: s.name, label: s.name }))]} />

          <div className="grid grid-cols-3 gap-3">
            <TextField label="Country" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
            <TextField label="State" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
            <TextField label="City" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          </div>

          <TextField label="Email" value={form.contactEmail} onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Phone" value={form.contactPhone} onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))} />
            <TextField label="WhatsApp number" value={form.whatsappNumber} onChange={(v) => setForm((f) => ({ ...f, whatsappNumber: v }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Tournament start" type="date" value={form.tournamentStartsAt} onChange={(v) => setForm((f) => ({ ...f, tournamentStartsAt: v }))} />
            <TextField label="Tournament end" type="date" value={form.tournamentEndsAt} onChange={(v) => setForm((f) => ({ ...f, tournamentEndsAt: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Expected teams" type="number" value={form.expectedTeams} onChange={(v) => setForm((f) => ({ ...f, expectedTeams: v }))} />
            <TextField label="Expected players" type="number" value={form.expectedPlayers} onChange={(v) => setForm((f) => ({ ...f, expectedPlayers: v }))} />
          </div>

          <TextAreaField label="Additional notes (optional)" value={form.message} onChange={(v) => setForm((f) => ({ ...f, message: v }))} />

          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {isSubmitting && <ButtonSpinner />}
            <MessageCircle size={16} /> Continue on WhatsApp
          </button>
        </form>
      )}
    </div>
  );
}
