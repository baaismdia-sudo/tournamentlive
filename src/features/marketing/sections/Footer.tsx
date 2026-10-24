import { Link } from "react-router-dom";
import { Youtube, Instagram, Linkedin, Facebook, Mail } from "lucide-react";
import { NewsletterForm } from "../components/NewsletterForm";
import { BrandLogo } from "../../../components/brand/BrandLogo";

const COLUMNS = [
  { title: "Product", links: [{ label: "Features", to: "/features" }, { label: "Pricing", to: "/pricing" }] },
  { title: "Company", links: [{ label: "Templates", to: "/templates" }, { label: "Blog", to: "/blog" }] },
  { title: "Support", links: [{ label: "Help & contact", to: "/contact" }, { label: "Sports we support", to: "/sports" }] },
];

const SOCIALS = [
  { label: "YouTube", href: "https://youtube.com", icon: Youtube },
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
];

export function Footer() {
  return (
    <footer className="overflow-hidden bg-[#0A0F1D] px-4 pt-16 text-white/70 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo height={34} tone="onDark" />
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Live scores &amp; tournament management. Fixtures, ball-by-ball scoring, standings, and a branded tournament website — all in one place.
            </p>
            <a href="mailto:hello@scorio.app" className="mt-4 flex items-center gap-2 text-sm text-white/70 hover:text-white">
              <Mail size={15} /> hello@scorio.app
            </a>
            <div className="mt-5 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-[#00E575] hover:text-[#00E575]"
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-white/60 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-sm font-semibold text-white">Subscribe</p>
            <p className="mt-3 text-sm text-white/60">Get the latest tournament tech updates &amp; features.</p>
            <div className="mt-4 [&_input]:!bg-white/5 [&_input]:!border-white/15 [&_input]:!text-[var(--color-on-primary)] [&_input]:placeholder:!text-white/40 [&_button]:!bg-[var(--color-primary)] [&_button]:!text-[#0A0F1D]">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 sm:flex-row">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} Scorio. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-white/50">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-white">Refund Policy</Link>
          </div>
        </div>
      </div>

      {/* Oversized tonal wordmark — flat colour, no gradient (brand rule). */}
      <p
        aria-hidden="true"
        className="-mb-6 select-none text-center font-display text-[22vw] font-bold leading-none tracking-tight text-white/[0.06] sm:-mb-10 sm:text-[14vw]"
      >
        SCORIO
      </p>
    </footer>
  );
}
