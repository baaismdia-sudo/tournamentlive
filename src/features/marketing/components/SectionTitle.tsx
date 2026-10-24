import { motion } from "framer-motion";

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
    >
      {eyebrow && (
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary-ink)]">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-heading)] sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-lg text-[var(--color-text-muted)]">{subtitle}</p>}
    </motion.div>
  );
}
