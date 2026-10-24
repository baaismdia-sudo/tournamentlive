import type { ReactNode } from "react";
import {
  Zap, Trophy, CalendarDays, Table2, TrendingUp, Mic, Palette, SunMoon, Handshake, Image as ImageIcon,
  Newspaper, Radio, Bell, LineChart, Globe, CalendarClock, CreditCard, RefreshCw, Medal, ShieldCheck,
  FilePenLine, Users, Rocket, Link2, CodeXml, Wallet, Lock, Cloud, Search, Smartphone, Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Marketing content stores decorative icons as emoji strings. They look
 * inconsistent across devices, so we render them as one cohesive line-icon
 * set instead. Anything not in this map (e.g. the sport emoji 🏏 ⚽ 🏀, which
 * are the actual subject matter) is rendered unchanged.
 */
const ICONS: Record<string, LucideIcon> = {
  "⚡": Zap, "🏆": Trophy, "📅": CalendarDays, "🗓️": CalendarClock, "📊": Table2, "📈": TrendingUp,
  "🎙️": Mic, "🎨": Palette, "🌗": SunMoon, "🤝": Handshake, "🖼️": ImageIcon, "📰": Newspaper,
  "📡": Radio, "🔔": Bell, "📉": LineChart, "🌐": Globe, "💳": CreditCard, "🔄": RefreshCw,
  "🏅": Medal, "🛡️": ShieldCheck, "📝": FilePenLine, "👥": Users, "🚀": Rocket, "🔗": Link2,
  "🚫💻": CodeXml, "💰": Wallet, "🔒": Lock, "☁️": Cloud, "🔍": Search, "📱": Smartphone, "🏷️": Tag,
};

/** Renders a mapped line icon for a known decorative emoji, else the original content. */
export function MarketingIcon({ icon, size = 22 }: { icon: ReactNode; size?: number }) {
  const Icon = typeof icon === "string" ? ICONS[icon] : undefined;
  return Icon ? <Icon size={size} strokeWidth={2} aria-hidden="true" /> : <>{icon}</>;
}

export function IconWrapper({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "success" | "warning" }) {
  const tones = {
    brand: "bg-[color:color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-primary-ink)]",
    success: "bg-[color:color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]",
    warning: "bg-[color:color-mix(in_srgb,var(--color-warning)_12%,transparent)] text-[var(--color-warning)]",
  };
  const Icon = typeof children === "string" ? ICONS[children] : undefined;
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${tones[tone]}`}>
      {Icon ? <Icon size={22} strokeWidth={2} aria-hidden="true" /> : children}
    </div>
  );
}
