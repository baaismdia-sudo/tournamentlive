import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { TurfStripes } from "../../../components/brand/TurfStripes";

export function CtaSection() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#0A0F1D] px-6 py-16 text-center ring-1 ring-[var(--color-border)] sm:px-12"
      >
        <TurfStripes />
        <div className="relative">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to run your next{" "}
            <span className="rounded-lg bg-[#00E575] px-2 pb-0.5 text-[#0A0F1D]">tournament?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/65">
            Start free, score your first match in minutes, and share a live scoreboard with everyone.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to="/register" size="lg">Start free</Button>
            <Button
              href="/contact"
              variant="ghost"
              size="lg"
              className="!border-white/25 !text-white hover:!bg-white/10"
            >
              Talk to us
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
