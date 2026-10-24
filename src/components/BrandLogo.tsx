import { useId } from "react";
import {
  SYMBOL_PATHS, SYMBOL_SMALL_PATHS, WORDMARK_PATHS,
  SYMBOL_VIEWBOX, HORIZONTAL_VIEWBOX, HORIZONTAL_SYMBOL_TRANSFORM,
} from "./brandPaths";

const VOLT = "#00E575";
const CARBON = "#0A0F1D";
const WHITE = "#FFFFFF";

type Tone = "auto" | "onDark" | "onLight" | "mono";

interface BrandLogoProps {
  /** "horizontal" = symbol + SCORIO wordmark. "symbol" = the S mark alone. */
  variant?: "horizontal" | "symbol";
  /** Rendered height in px. Width follows the artwork's aspect ratio. */
  height?: number;
  /**
   * auto    -> follows the active theme (white wordmark in dark, carbon in light)
   * onDark  -> Volt symbol + white wordmark (brand default, for carbon/photo backgrounds)
   * onLight -> Volt symbol + carbon wordmark
   * mono    -> single colour (currentColor), for one-colour placements
   */
  tone?: Tone;
  className?: string;
  /** Accessible label; decorative uses (next to visible text) can pass "". */
  title?: string;
}

/**
 * The Scorio logo, drawn from the official brand-kit vectors (not an <img>),
 * so it recolours with the theme and stays crisp at any size.
 *
 * Brand rules enforced here: horizontal lockup is never rendered narrower than
 * 120px, the standard symbol never below 32px (the small-cut symbol with wider
 * negative space is used at 16-31px), no shadows/glows/gradients on the mark.
 */
export function BrandLogo({ variant = "horizontal", height = 32, tone = "auto", className, title = "Scorio" }: BrandLogoProps) {
  const uid = useId();
  const isSymbol = variant === "symbol";

  const symbolPaths = isSymbol && height < 32 ? SYMBOL_SMALL_PATHS : SYMBOL_PATHS;
  const viewBox = isSymbol ? SYMBOL_VIEWBOX : HORIZONTAL_VIEWBOX;
  const [, , vw, vh] = viewBox.split(" ").map(Number);
  let h = height;
  // Enforce minimum reproduction sizes from the brand guidelines.
  if (isSymbol) h = Math.max(h, 16);
  else h = Math.max(h, Math.ceil(120 / (vw / vh)));
  const width = Math.round(h * (vw / vh));

  const symbolFill = tone === "mono" ? "currentColor" : VOLT;
  // "auto" paints the wordmark with a CSS variable, so it flips with the theme.
  const wordFill =
    tone === "mono" ? "currentColor" : tone === "onDark" ? WHITE : tone === "onLight" ? CARBON : "var(--color-heading)";

  const symbol = symbolPaths.map((d, i) => <path key={i} d={d} fill={symbolFill} />);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width}
      height={h}
      role="img"
      aria-labelledby={title ? uid : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      {title && <title id={uid}>{title}</title>}
      {isSymbol ? (
        symbol
      ) : (
        <>
          <g transform={HORIZONTAL_SYMBOL_TRANSFORM}>{symbol}</g>
          <g fill={wordFill} fillRule="evenodd">
            {WORDMARK_PATHS.map((d, i) => <path key={i} d={d} />)}
          </g>
        </>
      )}
    </svg>
  );
}
