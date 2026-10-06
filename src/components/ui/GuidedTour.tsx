import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

export interface TourStep {
  target: string; // matches a data-tour="<target>" attribute on the element to highlight
  title: string;
  description: string;
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * A lightweight guided tour: highlights one real element on screen at a
 * time (via a `data-tour="<id>"` attribute) with a spotlight cutout and an
 * anchored tooltip card carrying Next/Back/Skip and a step-progress strip.
 * Re-measures on resize/scroll so it stays aligned with the live layout.
 */
export function GuidedTour({ steps, onClose, onFinish }: { steps: TourStep[]; onClose: () => void; onFinish?: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    setRect(getRect(step.target));
  }, [step]);

  useEffect(() => {
    measure();
    // Scroll the target into view so the tour never points at something off-screen.
    const el = step && document.querySelector(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(measure, 320); // after the smooth-scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const next = () => {
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else {
      onFinish?.();
      onClose();
    }
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));

  if (!step) return null;

  // Decide tooltip position: below the target if there's room, else above.
  const viewportH = window.innerHeight;
  const spaceBelow = rect ? viewportH - (rect.top + rect.height) : 0;
  const placeAbove = rect ? spaceBelow < 180 && rect.top > 180 : false;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Spotlight overlay: a dark scrim with a cutout around the target (or full-screen dim if the target isn't found/mounted yet) */}
      {rect ? (
        <div
          className="pointer-events-none fixed inset-0 transition-all duration-200"
          style={{ boxShadow: `0 0 0 9999px rgba(0,0,0,0.65)`, top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: 14, position: "fixed" }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65" />
      )}
      {rect && (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-[var(--color-primary)] transition-all duration-200"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[101] w-[300px] max-w-[90vw] rounded-2xl bg-[var(--color-surface)] p-4 shadow-2xl"
        style={
          rect
            ? placeAbove
              ? { left: Math.min(Math.max(rect.left, 12), window.innerWidth - 312), top: Math.max(rect.top - PAD - 14, 12), transform: "translateY(-100%)" }
              : { left: Math.min(Math.max(rect.left, 12), window.innerWidth - 312), top: rect.top + rect.height + PAD + 14 }
            : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        <button onClick={onClose} aria-label="Close tour" className="absolute right-3 top-3 text-[var(--color-muted)] hover:text-[var(--color-text)]">
          <X size={16} />
        </button>
        <p className="pr-5 font-heading text-sm font-bold text-[var(--color-heading)]">{step.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">{step.description}</p>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-[var(--color-primary)]" : "w-1.5 bg-[var(--color-border)]"}`} />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button onClick={back} disabled={index === 0} className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] disabled:opacity-0">
            Back
          </button>
          <button onClick={next} className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white">
            {index === steps.length - 1 ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small persistent "?" launcher button + first-visit auto-launch, both backed by localStorage so the tour doesn't nag after the first time. */
export function useTourAutoLaunch(storageKey: string) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode etc) — just don't auto-launch
    }
  }, [storageKey]);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };
  return { open, setOpen, close };
}
