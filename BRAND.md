# Scorio — brand & design system (developer reference)

Source of truth for tokens: `src/styles/theme.css`. Fonts: `src/main.tsx` + `src/index.css`. Logo: `src/components/brand/`.

## Palette
| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--color-primary` | `#00E575` Electric Volt | `#00E575` | Fills: buttons, chips, indicators |
| `--color-on-primary` | `#0A0F1D` | `#0A0F1D` | Text/icons ON a Volt fill (never white) |
| `--color-primary-ink` | `#00E575` | `#007A3A` | Volt used as TEXT/links (pure Volt on white is ~1.4:1) |
| `--color-danger` | `#FF4500` Match Point Blaze | `#D93A00` | Live badge, wickets/OUT, errors |
| `--color-background` | `#0A0F1D` Stadium Carbon | `#F4F6FA` | Page |
| `--color-surface` / `-secondary` | `#0F1626` / `#161E33` | `#FFFFFF` / `#EDF0F6` | Cards / wells |

Light mode keeps Volt as the *fill* but switches text-coloured Volt to the deeper `--color-primary-ink` — a deliberate, documented deviation for legibility.

## Rules we enforce
- Dark is the default theme (brand recommendation). First paint is themed via a script in `index.html` (no flash).
- No gradients, glows or shadows on the logo mark; flat colour only (`--gradient-brand` is flat Volt).
- Logo: horizontal lockup ≥ 120px wide, symbol ≥ 32px; the small-cut symbol is used automatically below 32px (`BrandLogo`).
- Scores, overs, clocks: tabular monospaced numerals — use the `.score` class (JetBrains Mono). Never mix with `font-heading`.
- Headings: Space Grotesk. Body: Inter. Both self-hosted via `@fontsource-variable` (no Google Fonts request).
- Charts: only `--chart-*` tokens, in order (Volt, Blaze, Sky, Gold, Steel).

## Gotchas fixed during the rebrand (keep in mind when writing new UI)
- **Never write `bg-[var(--color-x)]/10`.** Tailwind 3 silently emits *no CSS* for an opacity suffix on a `var()` colour. Use `bg-[color:color-mix(in_srgb,var(--color-x)_10%,transparent)]`.
- Text on a Volt/primary fill must be `text-[var(--color-on-primary)]`, not `text-white`.
- Inverse "toast" pairing is `bg-[var(--color-heading)] text-[var(--color-background)]` (works in both themes).
- Public tournament sites inject their own tokens (organizer-chosen colours) and compute `--color-on-primary` automatically from contrast (`usePublicSiteTheme.ts`).
