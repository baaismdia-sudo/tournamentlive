/**
 * Decorative "mown turf" stripes — the brand's pitch motif. Pure CSS (no
 * canvas/WebGL) so it costs nothing on low-end phones. Purely decorative.
 */
export function TurfStripes({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 3.5%, transparent) 0, color-mix(in srgb, var(--color-primary) 3.5%, transparent) 72px, transparent 72px, transparent 144px)",
        maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
      }}
    />
  );
}
