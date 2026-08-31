import { useEffect, useState, useMemo } from "react";
import type { SiteTheme } from "./useTournamentSite";

const LIGHT_BASE = { background: "#F8FAFC", surface: "#FFFFFF", surfaceSecondary: "#F1F5F9", border: "#E2E8F0", heading: "#0F172A", text: "#475569", muted: "#64748B" };
const DARK_BASE = { background: "#0B0D12", surface: "#14171F", surfaceSecondary: "#1C202B", border: "#2A2F3B", heading: "#F8FAFC", text: "#CBD5E1", muted: "#94A3B8" };

/**
 * Per-tournament theming, scoped to the public site subtree only — this is
 * intentionally separate from the SaaS platform's ThemeContext (dashboard
 * dark mode) per the branding-separation rule: a viewer toggling dark mode
 * on a tournament site has no effect on (and no relation to) the platform
 * chrome, and vice versa.
 */
export function usePublicSiteTheme(theme: SiteTheme | null) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (theme) setMode(theme.dark_mode_enabled ? "dark" : "light");
  }, [theme]);

  // The Advanced Branding UI tells organizers fonts are "loaded from Google
  // Fonts automatically" — this makes that true. Without it, picking e.g.
  // "Poppins" saves correctly but the font file is never fetched, so the
  // browser silently falls back to a default font and the chosen font
  // never actually renders, even though everything else in the pipeline
  // (DB save, CSS var) is correct.
  useEffect(() => {
    const families = Array.from(new Set([theme?.font_heading, theme?.font_body].filter(Boolean))) as string[];
    if (families.length === 0) return;

    const linkId = "tournament-google-fonts";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    const query = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`).join("&");
    link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;

    return () => {
      // Left in place intentionally: removing it on unmount would cause a
      // flash of unstyled/fallback font when navigating between pages of
      // the same tournament site (each page mount/unmounts this hook).
    };
  }, [theme?.font_heading, theme?.font_body]);

  const cssVars = useMemo(() => {
    const base = mode === "dark" ? DARK_BASE : LIGHT_BASE;
    const primary = theme?.primary_color ?? "#4F46E5";
    const secondary = theme?.secondary_color ?? "#7C3AED";
    const accent = theme?.accent_color ?? "#06B6D4";
    return {
      "--color-primary": primary,
      "--color-primary-hover": primary,
      "--color-secondary": secondary,
      "--color-accent": accent,
      "--color-success": "#10B981",
      "--color-warning": "#F59E0B",
      "--color-danger": "#EF4444",
      "--color-info": "#3B82F6",
      "--color-background": base.background,
      "--color-surface": base.surface,
      "--color-surface-secondary": base.surfaceSecondary,
      "--color-border": base.border,
      "--color-heading": base.heading,
      "--color-text": base.text,
      "--color-muted": base.muted,
      "--gradient-brand": `linear-gradient(135deg, ${primary}, ${secondary})`,
      "--shadow-sm": "0 1px 2px rgba(15,23,42,0.06)",
      "--shadow-md": "0 4px 16px rgba(15,23,42,0.1)",
      "--shadow-lg": "0 12px 32px rgba(15,23,42,0.14)",
      "--color-brand": primary,
      "--color-surface-alt": base.surfaceSecondary,
      "--color-text-muted": base.muted,
      "--font-heading": theme?.font_heading ? `'${theme.font_heading}', sans-serif` : undefined,
      "--font-body": theme?.font_body ? `'${theme.font_body}', sans-serif` : undefined,
    } as React.CSSProperties;
  }, [theme, mode]);

  return { mode, toggleMode: () => setMode((m) => (m === "light" ? "dark" : "light")), cssVars };
}
