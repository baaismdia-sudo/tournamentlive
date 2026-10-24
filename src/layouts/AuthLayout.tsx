import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/brand/BrandLogo";
import { TurfStripes } from "../components/brand/TurfStripes";
import { LiveScoreCard } from "../components/brand/LiveScoreCard";

export function AuthLayout({
  children,
  title,
  subtitle,
  seoTitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  seoTitle: string;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <title>{`${seoTitle} · Scorio`}</title>
      <meta name="robots" content="noindex" />

      {/* Left: form panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <Link to="/" aria-label="Scorio home" className="mb-10 inline-flex">
          <BrandLogo height={32} />
        </Link>

        <div className="w-full max-w-sm animate-[fadeIn_0.3s_ease-out]">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-heading)]">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-[var(--color-muted)]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* Right: brand panel (always Stadium Carbon), hidden on mobile */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-[#0A0F1D] px-12 lg:flex">
        <TurfStripes />
        <div className="relative w-full max-w-md">
          <p className="font-display text-3xl font-bold leading-tight tracking-tight text-white">
            Launch a tournament website in minutes, <span className="text-[#00E575]">not weeks.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Live scores, fixtures, sponsors, and a fully branded site — all from one dashboard.
          </p>
          <LiveScoreCard className="mt-8 [--color-border:#232D47] [--color-surface:#0F1626] [--color-heading:#FFFFFF] [--color-muted:#8892A9] [--color-primary:#00E575] [--color-on-primary:#0A0F1D] [--color-primary-ink:#00E575] [--color-danger:#FF4500] [--color-surface-secondary:#161E33] [--color-text:#C3CBDB]" />
        </div>
      </div>
    </div>
  );
}
