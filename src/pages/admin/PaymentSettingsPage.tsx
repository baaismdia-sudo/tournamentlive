import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { PageLoader } from "../../components/ui/LoadingSpinner";
import { SuccessBanner } from "../../components/ui/ErrorState";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
}

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Gateway", keys: ["payment_gateway_active"] },
  { title: "Razorpay", keys: ["razorpay_key_id", "razorpay_key_secret", "razorpay_webhook_secret"] },
  { title: "Stripe", keys: ["stripe_publishable_key", "stripe_secret_key"] },
  { title: "Manual payments", keys: ["manual_payment_instructions"] },
];

const SECRET_KEYS = new Set(["razorpay_key_secret", "razorpay_webhook_secret", "stripe_secret_key"]);
const GATEWAY_OPTIONS = [
  { value: "manual", label: "Manual (bank transfer / offline)" },
  { value: "razorpay", label: "Razorpay" },
  { value: "stripe", label: "Stripe" },
];

function renderValue(v: unknown): string {
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingRow>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const allKeys = GROUPS.flatMap((g) => g.keys);

  useEffect(() => {
    supabase
      .from("system_settings")
      .select("*")
      .in("key", allKeys)
      .then(({ data }) => {
        const map: Record<string, SettingRow> = {};
        const draftMap: Record<string, string> = {};
        (data ?? []).forEach((row) => {
          map[row.key] = row as SettingRow;
          draftMap[row.key] = renderValue(row.value);
        });
        setSettings(map);
        setDrafts(draftMap);
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (key: string) => {
    setSavingKey(key);
    setSavedKey(null);
    try {
      const raw = drafts[key];
      await supabase.from("system_settings").update({ value: raw }).eq("key", key);
      setSavedKey(key);
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) return <PageLoader label="Loading payment settings..." />;

  return (
    <div className="space-y-8 p-6">
      <title>Payment Settings · TournamentLive Admin</title>
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Payment Settings</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Payment gateway configuration for subscription checkout. Secret keys are only ever visible to super admins.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="font-heading text-sm font-semibold text-[var(--color-heading)]">{group.title}</h2>
          {group.keys.map((key) => {
            const row = settings[key];
            if (!row) return null;
            const isSecret = SECRET_KEYS.has(key);
            const isGateway = key === "payment_gateway_active";
            return (
              <div key={key} className="flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">{row.description ?? key}</label>
                  {isGateway ? (
                    <select
                      value={drafts[key]?.replace(/"/g, "") ?? "manual"}
                      onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    >
                      {GATEWAY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type={isSecret && !revealed[key] ? "password" : "text"}
                        value={drafts[key]?.replace(/^"|"$/g, "") ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [key]: !r[key] }))}
                          className="whitespace-nowrap text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
                        >
                          {revealed[key] ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => save(key)}
                  disabled={savingKey === key}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
                >
                  {savingKey === key && <ButtonSpinner />}
                  Save
                </button>
                {savedKey === key && <SuccessBanner message="Saved" />}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
