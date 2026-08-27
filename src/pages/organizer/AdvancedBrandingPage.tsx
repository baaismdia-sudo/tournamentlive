import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { TournamentSelector } from "../../features/organizer/components/TournamentSelector";
import { useOrganizerTournaments } from "../../features/organizer/hooks/useOrganizerTournaments";
import { TextField, SelectField, TextAreaField, CheckboxField } from "../../features/admin/components/FormField";
import { PageLoader, ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { SuccessBanner } from "../../components/ui/ErrorState";
import { EmptyState } from "../../features/admin/components/EmptyState";
import { Monitor, Tablet, Smartphone, Paintbrush } from "lucide-react";

const GOOGLE_FONTS = ["Inter", "Manrope", "Poppins", "Roboto", "Open Sans", "Montserrat", "Playfair Display", "Space Grotesk", "Lato", "Nunito"];
const COLOR_KEYS = ["success", "warning", "danger", "info", "background", "surface", "text"] as const;

export default function AdvancedBrandingPage() {
  const { profile } = useAuth();
  const { tournaments, selectedId, setSelectedId, isLoading: tournamentsLoading } = useOrganizerTournaments();
  const [tab, setTab] = useState<"colors" | "typography" | "header" | "footer" | "css">("colors");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [advancedColors, setAdvancedColors] = useState<Record<string, string>>({});
  const [typography, setTypography] = useState({ font_size_base: "16px", line_height: "1.5", letter_spacing: "normal", font_weight: "400", button_font: "Inter" });
  const [buttonStyle, setButtonStyle] = useState("rounded");
  const [cardStyle, setCardStyle] = useState("elevated");
  const [themeMode, setThemeMode] = useState("auto");
  const [headerConfig, setHeaderConfig] = useState({ logo_position: "left", sticky: true, transparent: false, show_search: true, show_login: true, show_register: true, show_theme_switch: true, announcement_text: "" });
  const [footerConfig, setFooterConfig] = useState({ show_sponsors: true, show_social_links: true, quick_links: [] as { label: string; url: string }[] });
  const [customCss, setCustomCss] = useState("");
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");

  useEffect(() => {
    if (!selectedId) return;
    setIsLoading(true);
    supabase.from("website_themes").select("*").eq("tournament_id", selectedId).single().then(({ data }) => {
      if (data) {
        setAdvancedColors(data.advanced_colors ?? {});
        setTypography(data.typography ?? typography);
        setButtonStyle(data.button_style ?? "rounded");
        setCardStyle(data.card_style ?? "elevated");
        setThemeMode(data.theme_mode ?? "auto");
        setHeaderConfig({ ...headerConfig, ...(data.header_config ?? {}), announcement_text: data.header_config?.announcement_text ?? "" });
        setFooterConfig(data.footer_config ?? footerConfig);
        setCustomCss(data.custom_css ?? "");
        setNewsletterEnabled(data.newsletter_enabled ?? false);
        setPrimaryColor(data.primary_color ?? "#4F46E5");
      }
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const save = async () => {
    setIsSaving(true);
    setSaved(false);
    await supabase.from("website_themes").update({
      advanced_colors: advancedColors, typography, button_style: buttonStyle, card_style: cardStyle,
      theme_mode: themeMode, header_config: headerConfig, footer_config: footerConfig,
      custom_css: profile?.custom_css_enabled ? customCss : null, newsletter_enabled: newsletterEnabled,
    }).eq("tournament_id", selectedId);
    setIsSaving(false);
    setSaved(true);
  };

  const addQuickLink = () => setFooterConfig((f) => ({ ...f, quick_links: [...f.quick_links, { label: "", url: "" }] }));
  const updateQuickLink = (i: number, key: "label" | "url", value: string) =>
    setFooterConfig((f) => ({ ...f, quick_links: f.quick_links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)) }));
  const removeQuickLink = (i: number) => setFooterConfig((f) => ({ ...f, quick_links: f.quick_links.filter((_, idx) => idx !== i) }));

  const previewWidth = { desktop: "100%", tablet: "480px", mobile: "320px" }[device];

  if (tournamentsLoading) return null;
  if (tournaments.length === 0) return <EmptyState icon={Paintbrush} title="Create a tournament first" />;

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <title>Advanced Branding · TournamentLive</title>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Advanced Branding</h1>
            <p className="text-sm text-[var(--color-muted)]">Fine-grained color, typography, header, and footer control.</p>
          </div>
          <TournamentSelector tournaments={tournaments} selectedId={selectedId} onChange={setSelectedId} />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
          {(["colors", "typography", "header", "footer", "css"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${tab === t ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-muted)]"}`}>
              {t === "css" ? "Custom CSS" : t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <PageLoader label="Loading branding..." />
        ) : (
          <>
            {saved && <SuccessBanner message="Branding saved." />}

            {tab === "colors" && (
              <div className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <p className="text-xs text-[var(--color-muted)]">Primary/secondary/accent live in Website Builder → Branding. These are the extended semantic colors.</p>
                <div className="grid grid-cols-2 gap-3">
                  {COLOR_KEYS.map((key) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-sm font-medium capitalize text-[var(--color-text)]">{key}</label>
                      <input type="color" value={advancedColors[key] ?? "#4F46E5"} onChange={(e) => setAdvancedColors((c) => ({ ...c, [key]: e.target.value }))} className="h-10 w-full rounded-lg border border-[var(--color-border)]" />
                    </div>
                  ))}
                </div>
                <SelectField label="Button style" value={buttonStyle} onChange={setButtonStyle} options={[{ value: "rounded", label: "Rounded" }, { value: "pill", label: "Pill" }, { value: "square", label: "Square" }]} />
                <SelectField label="Card style" value={cardStyle} onChange={setCardStyle} options={[{ value: "elevated", label: "Elevated (shadow)" }, { value: "flat", label: "Flat" }, { value: "bordered", label: "Bordered" }]} />
                <SelectField label="Theme mode" value={themeMode} onChange={setThemeMode} options={[{ value: "auto", label: "Auto (visitor choice)" }, { value: "light", label: "Light only" }, { value: "dark", label: "Dark only" }]} />
              </div>
            )}

            {tab === "typography" && (
              <div className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <SelectField label="Button font (Google Fonts)" value={typography.button_font} onChange={(v) => setTypography((t) => ({ ...t, button_font: v }))} options={GOOGLE_FONTS.map((f) => ({ value: f, label: f }))} />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Base font size" value={typography.font_size_base} onChange={(v) => setTypography((t) => ({ ...t, font_size_base: v }))} />
                  <TextField label="Line height" value={typography.line_height} onChange={(v) => setTypography((t) => ({ ...t, line_height: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Letter spacing" value={typography.letter_spacing} onChange={(v) => setTypography((t) => ({ ...t, letter_spacing: v }))} />
                  <SelectField label="Font weight" value={typography.font_weight} onChange={(v) => setTypography((t) => ({ ...t, font_weight: v }))} options={["300", "400", "500", "600", "700"].map((w) => ({ value: w, label: w }))} />
                </div>
                <p className="text-xs text-[var(--color-muted)]">Heading/body fonts live in Website Builder → Branding, loaded from Google Fonts automatically on the public site.</p>
              </div>
            )}

            {tab === "header" && (
              <div className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <SelectField label="Logo position" value={headerConfig.logo_position} onChange={(v) => setHeaderConfig((h) => ({ ...h, logo_position: v }))} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }]} />
                <div className="grid grid-cols-2 gap-2">
                  <CheckboxField label="Sticky header" checked={headerConfig.sticky} onChange={(v) => setHeaderConfig((h) => ({ ...h, sticky: v }))} />
                  <CheckboxField label="Transparent header" checked={headerConfig.transparent} onChange={(v) => setHeaderConfig((h) => ({ ...h, transparent: v }))} />
                  <CheckboxField label="Show search" checked={headerConfig.show_search} onChange={(v) => setHeaderConfig((h) => ({ ...h, show_search: v }))} />
                  <CheckboxField label="Show theme switch" checked={headerConfig.show_theme_switch} onChange={(v) => setHeaderConfig((h) => ({ ...h, show_theme_switch: v }))} />
                </div>
                <TextField label="Announcement bar text (optional)" value={headerConfig.announcement_text} onChange={(v) => setHeaderConfig((h) => ({ ...h, announcement_text: v }))} />
              </div>
            )}

            {tab === "footer" && (
              <div className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="grid grid-cols-2 gap-2">
                  <CheckboxField label="Show sponsors in footer" checked={footerConfig.show_sponsors} onChange={(v) => setFooterConfig((f) => ({ ...f, show_sponsors: v }))} />
                  <CheckboxField label="Show social links" checked={footerConfig.show_social_links} onChange={(v) => setFooterConfig((f) => ({ ...f, show_social_links: v }))} />
                </div>
                <CheckboxField label="Enable newsletter signup" checked={newsletterEnabled} onChange={setNewsletterEnabled} />
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Quick links</p>
                  {footerConfig.quick_links.map((link, i) => (
                    <div key={i} className="mb-2 flex gap-2">
                      <input value={link.label} onChange={(e) => updateQuickLink(i, "label", e.target.value)} placeholder="Label" className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
                      <input value={link.url} onChange={(e) => updateQuickLink(i, "url", e.target.value)} placeholder="URL" className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
                      <button onClick={() => removeQuickLink(i)} className="text-xs text-[var(--color-danger)]">Remove</button>
                    </div>
                  ))}
                  <button onClick={addQuickLink} className="text-xs font-medium text-[var(--color-primary)] hover:underline">+ Add link</button>
                </div>
              </div>
            )}

            {tab === "css" && (
              profile?.custom_css_enabled ? (
                <div className="space-y-2 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <TextAreaField label="Custom CSS (applied to your public site only)" value={customCss} onChange={setCustomCss} rows={10} />
                  <p className="text-xs text-[var(--color-muted)]">CSS only — no HTML or JavaScript editing, by design.</p>
                </div>
              ) : (
                <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)]">
                  Custom CSS is a Super Admin-gated feature. Contact support to request access for your account.
                </div>
              )
            )}

            <button onClick={save} disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
              {isSaving && <ButtonSpinner />}
              Save branding
            </button>
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-text)]">Live preview</p>
          <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-1">
            {[{ key: "desktop", icon: Monitor }, { key: "tablet", icon: Tablet }, { key: "mobile", icon: Smartphone }].map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => setDevice(key as typeof device)} className={`rounded p-1.5 ${device === key ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)]"}`}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-lg)] transition-all" style={{ width: previewWidth }}>
          <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`, borderRadius: buttonStyle === "square" ? 0 : undefined }}>
            <p className="font-heading text-lg font-bold text-white">Preview</p>
            <button className="mt-3 bg-white px-4 py-2 text-sm font-medium" style={{ color: primaryColor, borderRadius: buttonStyle === "pill" ? 999 : buttonStyle === "square" ? 0 : 8 }}>
              Sample Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
