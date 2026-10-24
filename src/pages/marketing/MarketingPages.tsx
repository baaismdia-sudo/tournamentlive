import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { MarketingShell } from "./MarketingShell";
import { Button } from "../../features/marketing/components/Button";
import { Features } from "../../features/marketing/sections/Features";
import { supabase } from "../../lib/supabaseClient";
import { getErrorMessage } from "../../lib/errors";
import { ButtonSpinner } from "../../components/ui/LoadingSpinner";

const lz = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, key: K) =>
  lazy(() => loader().then((m) => ({ default: m[key] })));

const HowItWorks = lz(() => import("../../features/marketing/sections/HowItWorks"), "HowItWorks");
const WhyChooseUs = lz(() => import("../../features/marketing/sections/WhyChooseUs"), "WhyChooseUs");
const LiveDemo = lz(() => import("../../features/marketing/sections/LiveDemo"), "LiveDemo");
const LiveScoreShowcase = lz(() => import("../../features/marketing/sections/LiveScoreShowcase"), "LiveScoreShowcase");
const SupportedSports = lz(() => import("../../features/marketing/sections/SupportedSports"), "SupportedSports");
const WebsiteCustomizationShowcase = lz(() => import("../../features/marketing/sections/WebsiteCustomizationShowcase"), "WebsiteCustomizationShowcase");
const Screenshots = lz(() => import("../../features/marketing/sections/Screenshots"), "Screenshots");
const Pricing = lz(() => import("../../features/marketing/sections/Pricing"), "Pricing");
const Faq = lz(() => import("../../features/marketing/sections/Faq"), "Faq");
const BlogPreview = lz(() => import("../../features/marketing/sections/BlogPreview"), "BlogPreview");
const CtaSection = lz(() => import("../../features/marketing/sections/CtaSection"), "CtaSection");

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="h-40" aria-hidden="true" />}>{children}</Suspense>;
}

export function FeaturesPage() {
  return (
    <MarketingShell path="/features" seoTitle="Features" seoDescription="Live scoring, fixtures, standings, sponsors and a branded tournament website — everything in one platform."
      eyebrow="Features" title="Everything a tournament needs" subtitle="From the first fixture to the final whistle — scoring, standings, and a website your community will actually use.">
      <Features />
      <Lazy><HowItWorks /></Lazy><Lazy><WhyChooseUs /></Lazy><Lazy><CtaSection /></Lazy>
    </MarketingShell>
  );
}

export function PricingPage() {
  return (
    <MarketingShell path="/pricing" seoTitle="Pricing" seoDescription="Rent a tournament website by the day, week or month. Pay once per tournament — no subscriptions."
      eyebrow="Pricing" title="Pay for the days you play" subtitle="No subscriptions and no surprise renewals. Rent exactly the time your tournament needs.">
      <Lazy><Pricing /></Lazy><Lazy><Faq /></Lazy><Lazy><CtaSection /></Lazy>
    </MarketingShell>
  );
}

export function DemoPage() {
  return (
    <MarketingShell path="/demo" seoTitle="Live demo" seoDescription="See a live Scorio tournament site and scoreboard before you build your own."
      eyebrow="Live demo" title="See it before you build it" subtitle="A real tournament site, a real live scoreboard — explore what your players and fans will see.">
      <Lazy><LiveDemo /></Lazy><Lazy><LiveScoreShowcase /></Lazy><Lazy><CtaSection /></Lazy>
    </MarketingShell>
  );
}

export function SportsPage() {
  return (
    <MarketingShell path="/sports" seoTitle="Supported sports" seoDescription="Cricket, football, kabaddi, basketball and more — one platform for every sport."
      eyebrow="Sports" title="One platform. Every sport." subtitle="Ball-by-ball cricket scoring, football, kabaddi, basketball and more.">
      <Lazy><SupportedSports /></Lazy><Lazy><CtaSection /></Lazy>
    </MarketingShell>
  );
}

export function TemplatesPage() {
  return (
    <MarketingShell path="/templates" seoTitle="Templates & themes" seoDescription="Make your tournament site yours — colours, fonts, layouts and your own domain."
      eyebrow="Templates" title="Make it yours" subtitle="Pick your colours, fonts and layout. Add your sponsors. Point your own domain at it.">
      <Lazy><WebsiteCustomizationShowcase /></Lazy><Lazy><Screenshots /></Lazy><Lazy><CtaSection /></Lazy>
    </MarketingShell>
  );
}

export function BlogIndexPage() {
  return (
    <MarketingShell path="/blog" seoTitle="Blog" seoDescription="Guides and ideas for running a better tournament."
      eyebrow="Blog" title="Guides for running a better tournament" subtitle="Practical advice for organizers, scorekeepers and sponsors.">
      <Lazy><BlogPreview /></Lazy><Lazy><CtaSection /></Lazy>
    </MarketingShell>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-3 text-sm text-[var(--color-heading)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)]";

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    setStatus("sending");
    try {
      const { error: insertError } = await supabase.from("contact_messages").insert({
        tournament_id: null, name: form.name.trim(), email: form.email.trim(),
        subject: form.subject.trim() || "General enquiry", message: form.message.trim(),
      });
      if (insertError) throw insertError;
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(getErrorMessage(err));
    }
  };

  return (
    <MarketingShell path="/contact" seoTitle="Contact" seoDescription="Talk to the Scorio team about your tournament."
      eyebrow="Contact" title="Talk to us" subtitle="Questions about rentals, a guided demo, or a custom setup? Send a message and we'll get back to you.">
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl">
          {status === "sent" ? (
            <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center">
              <MailCheck className="mx-auto text-[var(--color-primary-ink)]" size={36} />
              <h2 className="mt-4 font-display text-xl font-bold text-[var(--color-heading)]">Message sent</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Thanks — we'll reply to {form.email} soon.</p>
              <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[var(--color-primary-ink)]">Back to home</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input required className={inputCls} placeholder="Your name" aria-label="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="email" className={inputCls} placeholder="Email address" aria-label="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <input className={inputCls} placeholder="Subject (optional)" aria-label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <textarea required rows={6} className={inputCls} placeholder="How can we help?" aria-label="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
              <Button size="lg" className="w-full" onClick={() => undefined}>
                {status === "sending" ? <ButtonSpinner /> : null} Send message
              </Button>
              <p className="text-center text-xs text-[var(--color-muted)]">Or email <a className="font-semibold text-[var(--color-primary-ink)]" href="mailto:hello@scorio.app">hello@scorio.app</a></p>
            </form>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}

/**
 * Terms and Privacy are legal documents and must be written/approved by the
 * business owner — they are deliberately NOT drafted here. This page exists so
 * the links in sign-up and the footer don't dead-end while the real text is added.
 */
export function LegalPlaceholderPage({ kind }: { kind: "terms" | "privacy" }) {
  const name = kind === "terms" ? "Terms of Service" : "Privacy Policy";
  return (
    <MarketingShell path={`/${kind}`} seoTitle={name} seoDescription={`${name} for Scorio.`} eyebrow="Legal" title={name}>
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl rounded-card border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center">
          <p className="text-[var(--color-text)]">Our {name} is being finalised and will be published here shortly.</p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Questions in the meantime? Email <a className="font-semibold text-[var(--color-primary-ink)]" href="mailto:hello@scorio.app">hello@scorio.app</a>.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}

export function NotFoundPage() {
  return (
    <MarketingShell path="/404" seoTitle="Page not found" seoDescription="This page could not be found.">
      <section className="px-4 py-24 text-center sm:px-6">
        <p className="score text-7xl font-bold text-[var(--color-primary-ink)] sm:text-9xl">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-[var(--color-heading)] sm:text-3xl">That's out of play.</h1>
        <p className="mx-auto mt-3 max-w-md text-[var(--color-muted)]">The page you're looking for doesn't exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3"><Button to="/">Back to home</Button><Button to="/contact" variant="ghost">Contact us</Button></div>
      </section>
    </MarketingShell>
  );
}
