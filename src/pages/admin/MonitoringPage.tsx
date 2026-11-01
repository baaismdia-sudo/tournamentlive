import { useState } from "react";
import { CheckCircle2, CircleOff, FlaskConical } from "lucide-react";
import { log } from "../../lib/observability/logger";
import { observability } from "../../lib/observability/sentry";
import { getLogUserId } from "../../lib/observability/context";

/**
 * Super Admin → Platform → Monitoring.
 * The equivalent of the "example error page" Sentry's own wizard generates: prove, from
 * the live site, that errors and logs reach Sentry and that secrets are scrubbed.
 */
const CAMERAS = [
  { n: 1, name: "Error tracking", how: "Unhandled errors, render crashes (with a reference code) and every unexpected failure open a Sentry issue." },
  { n: 2, name: "Logs kept for days", how: "All logs go to Sentry (searchable for the retention period of your Sentry plan)." },
  { n: 3, name: "The important moments", how: "Signup, login (failed attempts too), scoring, enquiries, invites, admin actions, failed API calls." },
  { n: 4, name: "Who + which request", how: "Every line carries userId, sessionId, route; each operation shares a requestId." },
  { n: 5, name: "Nothing secret", how: "Passwords, tokens, keys, emails, card/ID numbers and URL query/hash are scrubbed in three layers." },
  { n: 6, name: "An alert", how: "Configured inside Sentry (Alerts → Create Alert). See docs/LOGGING.md for the exact clicks." },
];

export default function MonitoringPage() {
  const [sent, setSent] = useState<string | null>(null);
  const flash = (what: string) => {
    setSent(what);
    window.setTimeout(() => setSent(null), 4000);
  };

  const rows: [string, string][] = [
    ["Remote logging", observability.enabled ? "ON — sending to Sentry" : "OFF — set VITE_SENTRY_DSN to turn on"],
    ["Environment", observability.environment],
    ["Release", observability.release],
    ["Your session id", observability.sessionId],
    ["Your user id", getLogUserId() ?? "—"],
  ];

  const actions: { label: string; hint: string; run: () => void }[] = [
    {
      label: "Send a test log",
      hint: "Appears in Sentry → Logs as monitoring.test_log within seconds.",
      run: () => {
        log.info("monitoring.test_log", { note: "hello from the Monitoring page" });
        flash("Test log sent");
      },
    },
    {
      label: "Send a test error",
      hint: "Opens a Sentry issue titled “Scorio monitoring test — safe to ignore”.",
      run: () => {
        log.fail("monitoring.test_error", new Error("Scorio monitoring test — safe to ignore"), { note: "manual test" });
        flash("Test error sent");
      },
    },
    {
      label: "Throw an uncaught error",
      hint: "Proves the global crash handler works (not just our own logging).",
      run: () => {
        window.setTimeout(() => {
          throw new Error("Scorio uncaught-error test — safe to ignore");
        }, 0);
        flash("Uncaught error thrown");
      },
    },
    {
      label: "Test secret redaction",
      hint: "Logs a fake password, API key and email. In Sentry they must read [redacted] / [email] — never the real values.",
      run: () => {
        log.info("monitoring.redaction_test", {
          password: "hunter2-FAKE",
          apiKey: "sk_live_FAKE123456",
          authorization: "Bearer FAKE.TOKEN.VALUE12345",
          note: "contact fake.person@example.com with token=FAKE-abc-123",
        });
        flash("Redaction test sent");
      },
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <title>Monitoring · Scorio Admin</title>
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--color-heading)]">Monitoring</h1>
        <p className="text-sm text-[var(--color-muted)]">Check that errors and logs reach Sentry, and that secrets never do.</p>
      </div>

      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="mb-3 flex items-center gap-2">
          {observability.enabled ? (
            <CheckCircle2 size={18} className="text-[var(--color-success)]" />
          ) : (
            <CircleOff size={18} className="text-[var(--color-warning)]" />
          )}
          <h2 className="font-display text-sm font-semibold text-[var(--color-heading)]">Status</h2>
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--color-muted)]">{k}</dt>
              <dd className="break-all font-mono text-xs text-[var(--color-heading)]">{v}</dd>
            </div>
          ))}
        </dl>
        {!observability.enabled && (
          <p className="mt-4 rounded-lg bg-[color:color-mix(in_srgb,var(--color-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--color-text)]">
            Logging is currently <b>off</b>: nothing leaves the browser. Add <code className="font-mono">VITE_SENTRY_DSN</code> in your hosting environment variables and redeploy.
          </p>
        )}
      </section>

      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <FlaskConical size={18} className="text-[var(--color-primary-ink)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--color-heading)]">Send a test</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((a) => (
            <div key={a.label} className="rounded-lg border border-[var(--color-border)] p-4">
              <button
                onClick={a.run}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-display text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
              >
                {a.label}
              </button>
              <p className="mt-2 text-xs text-[var(--color-muted)]">{a.hint}</p>
            </div>
          ))}
        </div>
        <p role="status" className="mt-4 h-5 text-sm font-medium text-[var(--color-primary-ink)]">{sent}</p>
      </section>

      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-[var(--color-heading)]">The six cameras</h2>
        <ol className="space-y-2.5">
          {CAMERAS.map((c) => (
            <li key={c.n} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-heading)] font-mono text-xs font-bold text-[var(--color-background)]">{c.n}</span>
              <span><b className="text-[var(--color-heading)]">{c.name}.</b> <span className="text-[var(--color-muted)]">{c.how}</span></span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
