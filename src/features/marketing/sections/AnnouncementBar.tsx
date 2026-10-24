import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

/**
 * Copy is hardcoded here as a fallback default; the Super Admin dashboard
 * writes to system_settings.key = 'announcement_bar' and this component
 * should be swapped to read from there once that table has real content.
 */
export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-2 bg-[var(--color-primary)] px-10 py-2 text-center text-sm font-medium text-[var(--color-on-primary)]">
      <span>New: ball-by-ball cricket scoring with a live public scoreboard.</span>
      <Link to="/register" className="whitespace-nowrap font-bold underline underline-offset-2">
        Start free
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 opacity-70 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
