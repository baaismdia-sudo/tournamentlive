import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { StatsCounter } from "../components/StatsCounter";
import { STATS } from "../data/content";
import { TurfStripes } from "../../../components/brand/TurfStripes";
import { LiveScoreCard } from "../../../components/brand/LiveScoreCard";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
      <TurfStripes />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
            Live scores &amp; tournament management
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-6 font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight text-[var(--color-heading)] sm:text-6xl lg:text-7xl"
          >
            Your tournament,
            <br />
            <span className="mt-1 inline-block rounded-lg bg-[var(--color-primary)] px-3 pb-1 text-[var(--color-on-primary)]">
              live in minutes.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg"
          >
            Rent a fully branded tournament website with live scores, fixtures, and standings — score every ball from
            your phone and watch it update for everyone, instantly. No code, no developer, no waiting.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button to="/register" size="lg" className="w-full sm:w-auto">Start free</Button>
            <Button to="/demo" variant="ghost" size="lg" className="w-full sm:w-auto">Watch demo</Button>
            <Link to="/contact" className="group inline-flex items-center justify-center gap-1.5 px-2 py-2 font-display text-sm font-semibold text-[var(--color-primary-ink)]">
              Request a guided demo <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--color-border)] pt-8 sm:grid-cols-4">
            {STATS.map((s) => (
              <StatsCounter key={s.label} value={s.value} suffix={s.suffix} label={s.label} align="left" />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="relative mx-auto w-full max-w-md pb-10 lg:max-w-none"
        >
          <LiveScoreCard />
          <div className="absolute bottom-0 right-4 hidden w-52 rounded-card border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 shadow-premium sm:block">
            <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Points table</p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-[var(--color-heading)]"><span>Thrissur Titans</span><span className="score font-bold">9</span></div>
              <div className="flex justify-between text-[var(--color-text)]"><span>Cochin Crusaders</span><span className="score font-bold">7</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
