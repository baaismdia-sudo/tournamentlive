import { SectionTitle } from "../components/SectionTitle";
import { Button } from "../components/Button";
import { motion } from "framer-motion";
import { FEATURES } from "../data/content";

// Layout only mirrors the reference's staggered bento grid + pill row —
// colors/fonts still come entirely from the app's existing theme tokens.
export function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Features"
          title="Everything a tournament website needs"
          subtitle="Built for organizers, scorekeepers, and fans — all in one platform."
        />

        <div className="mt-10 flex justify-center">
          <Button to="/register" size="lg">
            Create my tournament
          </Button>
        </div>

        {/* Staggered bento grid: CSS multi-column gives the varied-height,
            interlocking card layout without needing a JS masonry library. */}
        <div className="mt-14 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
              className="mb-5 break-inside-avoid rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-shadow hover:shadow-lg hover:shadow-[var(--color-brand)]/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-xl text-[var(--color-brand)]">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[var(--color-text)]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{f.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick-scan pill row summarizing every capability at a glance. */}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {FEATURES.map((f) => (
            <span
              key={f.title}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2 text-sm font-medium text-[var(--color-text)]"
            >
              {f.title}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
