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

const KEYS = ["gst_enabled", "gst_percentage", "tax_registration_number", "prices_include_tax"];

function renderValue(v: unknown): string {
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export default function TaxesPage() {
  const [settings, setSettings] = useState<Record<string, SettingRow>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("system_settings")
      .select("*")
      .in("key", KEYS)
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
  }, []);

  const save = async (key: string) => {
    setSavingKey(key);
    setSavedKey(null);
    try {
      const raw = drafts[key];
      let parsed: unknown = raw;
      if (raw === "true" || raw === "false") parsed = raw === "true";
      else if (!Number.isNaN(Number(raw)) && raw.trim() !== "") parsed = Number(raw);
      await supabase.from("system_settings").update({ value: parsed }).eq("key", key);
      setSavedKey(key);
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) return <PageLoader label="Loading tax settings..." />;

  return (
    <div className="space-y-8 p-6">
      <title>Taxes · TournamentLive Admin</title>
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Taxes</h1>
        <p className="text-sm text-[var(--color-muted)]">GST/VAT configuration applied to invoices and subscription billing.</p>
      </div>

      <section className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        {KEYS.map((key) => {
          const row = settings[key];
          if (!row) return null;
          const isBoolean = typeof row.value === "boolean";
          return (
            <div key={key} className="flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">{row.description ?? key}</label>
                {isBoolean ? (
                  <select
                    value={drafts[key] ?? "false"}
                    onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    value={drafts[key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  />
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
    </div>
  );
}
