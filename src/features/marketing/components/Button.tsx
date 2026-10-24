import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ButtonProps {
  children: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Primary = Electric Volt fill with Stadium Carbon text (brand pairing).
const VARIANTS = {
  primary: "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]",
  secondary: "bg-[var(--color-surface-secondary)] text-[var(--color-heading)] hover:bg-[var(--color-border)]",
  ghost: "bg-transparent text-[var(--color-heading)] hover:bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
};

const SIZES = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export function Button({ children, to, href, onClick, variant = "primary", size = "md", className = "" }: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-display font-semibold tracking-tight transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  if (to) return <Link to={to} className={classes}>{children}</Link>;
  if (href) return <a href={href} className={classes}>{children}</a>;
  return <button onClick={onClick} className={classes}>{children}</button>;
}
