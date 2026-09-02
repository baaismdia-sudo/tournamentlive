import { Link } from "react-router-dom";
import { Youtube, Instagram, Linkedin, Facebook, Mail } from "lucide-react";
import { NewsletterForm } from "../components/NewsletterForm";

const COLUMNS = [
  { title: "Product", links: [{ label: "Features", to: "/features" }, { label: "Pricing", to: "/pricing" }] },
  { title: "Company", links: [{ label: "Testimonials", to: "/#testimonials" }, { label: "Blog", to: "/blog" }] },
  { title: "Support", links: [{ label: "Help Center", to: "/support" }, { label: "Documentation", to: "/docs" }] },
];

const SOCIALS = [
  { label: "YouTube", href: "https://youtube.com", icon: Youtube },
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
];

export function Footer() {
  return (
    <footer className="overflow-hidden bg-[#0a0a0a] px-6 pt-16 text-white/70">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-lg font-bold text-white">Scorio App.</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              The next-generation tournament operating system powering live scores, fixtures, and instant standings.
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
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
            <div className="mt-4 [&_input]:!bg-white/5 [&_input]:!border-white/15 [&_input]:!text-white [&_input]:placeholder:!text-white/40 [&_button]:!bg-[var(--color-brand)]">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 sm:flex-row">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} Scorio App. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-white/50">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-white">Refund Policy</Link>
          </div>
        </div>
      </div>

      {/* Large faded brand wordmark, matching the reference footer's signature look. */}
      <p
        aria-hidden="true"
        className="-mb-6 select-none text-center text-[22vw] font-black leading-none tracking-tight sm:-mb-10 sm:text-[14vw]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
      >
        SCORIO
      </p>
    </footer>
  );
}
