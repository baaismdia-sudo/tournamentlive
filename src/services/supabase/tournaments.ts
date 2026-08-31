import { supabase } from "../../lib/supabaseClient";

export interface CreateTournamentPayload {
  name: string;
  slug: string;
  description: string;
  sport: string;
  season: string;
  logoUrl: string;
  bannerUrl: string;
  format: "league" | "knockout" | "round_robin" | "groups_knockout" | "double_elimination" | "custom";
  registrationStart: string;
  registrationEnd: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  country: string;
  state: string;
  city: string;
  venue: string;
  googleMapsUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontHeading: string;
  fontBody: string;
  isPublic: boolean;
  seoTitle: string;
  seoDescription: string;
  subdomain: string;
  rentalPlanId: string;
}

/**
 * Writes across tournaments + its five 1:1 config tables in sequence. Not
 * wrapped in a single DB transaction (supabase-js issues separate requests),
 * so on partial failure the tournament row itself is left in 'draft' status
 * and safe to retry/edit rather than silently vanishing — a Postgres
 * function wrapping this in one transaction is a reasonable hardening
 * follow-up once this flow has real usage to learn from.
 */
export async function createTournament(payload: CreateTournamentPayload) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({
      organizer_id: userData.user.id,
      rental_plan_id: payload.rentalPlanId || null,
      name: payload.name,
      slug: payload.slug,
      sport: payload.sport,
      description: payload.description || null,
      status: "draft",
      season: payload.season || null,
      logo_url: payload.logoUrl || null,
      cover_image_url: payload.bannerUrl || null,
      is_public: payload.isPublic,
      timezone: payload.timezone,
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
    })
    .select()
    .single();
  if (tournamentError) throw tournamentError;

  await supabase.from("tournament_settings").insert({
    tournament_id: tournament.id,
    format: payload.format === "double_elimination" || payload.format === "custom" ? "knockout" : payload.format,
    registration_open: true,
    registration_deadline: payload.registrationEnd || null,
  });

  await supabase.from("website_themes").insert({
    tournament_id: tournament.id,
    primary_color: payload.primaryColor,
    secondary_color: payload.secondaryColor,
    font_heading: payload.fontHeading,
    font_body: payload.fontBody,
  });

  await supabase.from("site_settings").insert({
    tournament_id: tournament.id,
    site_title: payload.name,
  });

  await supabase.from("seo_settings").insert({
    tournament_id: tournament.id,
    meta_title: payload.seoTitle || payload.name,
    meta_description: payload.seoDescription || payload.description,
  });

  if (payload.subdomain) {
    await supabase.from("domains").insert({
      tournament_id: tournament.id,
      subdomain: payload.subdomain,
    });
  }

  return tournament;
}

export async function publishTournament(tournamentId: string) {
  const { error } = await supabase.from("tournaments").update({ status: "active" }).eq("id", tournamentId);
  if (error) throw error;
}

export async function unpublishTournament(tournamentId: string) {
  const { error } = await supabase.from("tournaments").update({ status: "draft" }).eq("id", tournamentId);
  if (error) throw error;
}

export async function archiveTournament(tournamentId: string) {
  const { error } = await supabase.from("tournaments").update({ status: "archived" }).eq("id", tournamentId);
  if (error) throw error;
}

export async function deleteTournament(tournamentId: string) {
  const { error } = await supabase.from("tournaments").update({ deleted_at: new Date().toISOString() }).eq("id", tournamentId);
  if (error) throw error;
}

export async function duplicateTournament(tournamentId: string) {
  const { data: original, error: fetchError } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
  if (fetchError) throw fetchError;

  const { data: copy, error: insertError } = await supabase
    .from("tournaments")
    .insert({
      organizer_id: original.organizer_id,
      rental_plan_id: original.rental_plan_id,
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      sport: original.sport,
      description: original.description,
      status: "draft",
      logo_url: original.logo_url,
      cover_image_url: original.cover_image_url,
      is_public: false,
      timezone: original.timezone,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  // A tournament is meaningless without its five 1:1 config rows (see
  // createTournament above) — without these, Advanced Branding's .update()
  // silently matches zero rows (no error, but nothing is ever saved), and
  // the public site falls back to defaults forever. Duplication must create
  // the same rows createTournament does, copying values from the original
  // where sensible so the copy starts branded exactly like its source.
  const { data: originalTheme } = await supabase.from("website_themes").select("*").eq("tournament_id", tournamentId).maybeSingle();
  const { data: originalSite } = await supabase.from("site_settings").select("*").eq("tournament_id", tournamentId).maybeSingle();
  const { data: originalSeo } = await supabase.from("seo_settings").select("*").eq("tournament_id", tournamentId).maybeSingle();
  const { data: originalTournamentSettings } = await supabase.from("tournament_settings").select("*").eq("tournament_id", tournamentId).maybeSingle();

  await Promise.all([
    supabase.from("tournament_settings").insert({
      tournament_id: copy.id,
      format: originalTournamentSettings?.format ?? "knockout",
      registration_open: true,
      registration_deadline: originalTournamentSettings?.registration_deadline ?? null,
    }),
    supabase.from("website_themes").insert({
      tournament_id: copy.id,
      primary_color: originalTheme?.primary_color ?? "#4F46E5",
      secondary_color: originalTheme?.secondary_color ?? "#7C3AED",
      accent_color: originalTheme?.accent_color,
      font_heading: originalTheme?.font_heading ?? "Inter",
      font_body: originalTheme?.font_body ?? "Inter",
      dark_mode_enabled: originalTheme?.dark_mode_enabled ?? false,
      layout_variant: originalTheme?.layout_variant,
      advanced_colors: originalTheme?.advanced_colors,
      typography: originalTheme?.typography,
      button_style: originalTheme?.button_style,
      card_style: originalTheme?.card_style,
      theme_mode: originalTheme?.theme_mode,
      header_config: originalTheme?.header_config,
      footer_config: originalTheme?.footer_config,
      newsletter_enabled: originalTheme?.newsletter_enabled,
    }),
    supabase.from("site_settings").insert({
      tournament_id: copy.id,
      site_title: copy.name,
      tagline: originalSite?.tagline,
      show_sponsors: originalSite?.show_sponsors,
      show_gallery: originalSite?.show_gallery,
      show_news: originalSite?.show_news,
      show_live_stream: originalSite?.show_live_stream,
      footer_text: originalSite?.footer_text,
    }),
    supabase.from("seo_settings").insert({
      tournament_id: copy.id,
      meta_title: copy.name,
      meta_description: originalSeo?.meta_description,
      og_image_url: originalSeo?.og_image_url,
    }),
  ]);

  return copy;
}

export async function checkSubdomainAvailable(subdomain: string): Promise<boolean> {
  const { data, error } = await supabase.from("domains").select("id").eq("subdomain", subdomain).maybeSingle();
  if (error) throw error;
  return !data;
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase.from("tournaments").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return !data;
}
