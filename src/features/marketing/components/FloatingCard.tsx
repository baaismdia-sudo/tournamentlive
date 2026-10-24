import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function FloatingCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-4 shadow-xl backdrop-blur ${className}`}
    >
      {children}
    </motion.div>
  );
}
