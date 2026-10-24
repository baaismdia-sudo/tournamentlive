import { type ReactNode } from "react";
import { Seo } from "../../components/seo/Seo";
import { useTheme } from "../../contexts/ThemeContext";
import { Navbar } from "../../features/marketing/sections/Navbar";
import { Footer } from "../../features/marketing/sections/Footer";
import { TurfStripes } from "../../components/brand/TurfStripes";

/** Shared frame for the secondary marketing pages (nav + footer + page header). */
export function MarketingShell({
  seoTitle, seoDescription, path, eyebrow, title, subtitle, children,
}: {
  seoTitle: string; seoDescription: string; path: string;
  eyebrow?: string; title?: string; subtitle?: string; children: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Seo title={`${seoTitle} · Scorio`} description={seoDescription} path={path} />
      <Navbar isDark={theme === "dark"} onToggleDark={toggleTheme} />
      <main>
        {title && (
          <header className="relative overflow-hidden border-b border-[var(--color-border)] px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
            <TurfStripes />
            <div className="relative mx-auto max-w-4xl text-center">
              {eyebrow && (
                <p className="mb-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary-ink)]">{eyebrow}</p>
              )}
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-[var(--color-heading)] sm:text-6xl">{title}</h1>
              {subtitle && <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--color-muted)] sm:text-lg">{subtitle}</p>}
            </div>
          </header>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
