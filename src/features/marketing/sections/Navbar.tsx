import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "../components/Button";
import { BrandLogo } from "../../../components/brand/BrandLogo";

const NAV_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Demo", to: "/demo" },
  { label: "Sports", to: "/sports" },
  { label: "Templates", to: "/templates" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export function Navbar({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-background)_85%,transparent)] backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Scorio home" className="flex items-center">
          <BrandLogo height={30} />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-display text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-heading)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            onClick={onToggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-heading)]"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button to="/login" variant="ghost" size="sm">Log in</Button>
          <Button to="/register" variant="primary" size="sm">Get started</Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button
            onClick={onToggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg p-2.5 text-[var(--color-muted)]"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="rounded-lg p-2.5 text-[var(--color-heading)]"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-background)] lg:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 font-display text-base font-medium text-[var(--color-heading)] hover:bg-[var(--color-surface-secondary)]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-3 px-1">
                <Button to="/login" variant="ghost" size="md" className="flex-1">Log in</Button>
                <Button to="/register" variant="primary" size="md" className="flex-1">Get started</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
