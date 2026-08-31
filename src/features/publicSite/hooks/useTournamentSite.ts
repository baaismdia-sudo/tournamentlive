import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

export interface SiteTournament {
  id: string;
  name: string;
  slug: string;
  sport: string;
  season: string | null;
  description: string | null;
  status: string;
  logo_url: string | null;
  cover_image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export interface SiteTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  dark_mode_enabled: boolean;
  layout_variant: string;
}

export interface SiteSettingsRow {
  site_title: string | null;
  tagline: string | null;
  favicon_url: string | null;
  show_sponsors: boolean;
  show_gallery: boolean;
  show_news: boolean;
  show_live_stream: boolean;
  footer_text: string | null;
  maintenance_mode: boolean;
  homepage_sections: { key: string; visible: boolean }[];
}

export interface SeoSettingsRow {
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
}

/**
 * Resolves the tournament + its theme/site/seo config from the :slug route
 * param. This is the single entry point every public-site page uses so the
 * slug -> tournament_id lookup (and its RLS-scoped visibility check) only
 * happens once per navigation.
 */
/**
 * Resolves the tournament + its theme/site/seo config from the :slug route
 * param. This is the single entry point every public-site page uses so the
 * slug -> tournament_id lookup (and its RLS-scoped visibility check) only
 * happens once per navigation.
 *
 * Two correctness rules this hook must maintain:
 * 1. Every state slice is reset at the start of each slug change, before the
 *    new fetch resolves — otherwise navigating from tournament A to
 *    tournament B can briefly (or, if B's config row is missing, permanently)
 *    keep showing A's branding on B's site.
 * 2. website_themes/site_settings/seo_settings are subscribed to realtime,
 *    not fetched once — otherwise an organizer's saved branding change never
 *    appears for a viewer who already has the public site open, and looks
 *    like "the site is showing old branding" even though the save worked.
 */
export function useTournamentSite() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<SiteTournament | null>(null);
  const [theme, setTheme] = useState<SiteTheme | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsRow | null>(null);
  const [seo, setSeo] = useState<SeoSettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Reset immediately so a previous tournament's branding can never be
    // shown, even momentarily, while the new tournament's data loads.
    setTournament(null);
    setTheme(null);
    setSiteSettings(null);
    setSeo(null);
    setNotFound(false);
    setIsLoading(true);

    supabase
      .from("tournaments")
      .select("id, name, slug, sport, season, description, status, logo_url, cover_image_url, starts_at, ends_at")
      .eq("slug", slug)
      .maybeSingle()
      .then(async ({ data: tournamentData }) => {
        if (!mounted) return;
        if (!tournamentData) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        setTournament(tournamentData);

        const [themeRes, siteRes, seoRes] = await Promise.all([
          supabase.from("website_themes").select("*").eq("tournament_id", tournamentData.id).maybeSingle(),
          supabase.from("site_settings").select("*").eq("tournament_id", tournamentData.id).maybeSingle(),
          supabase.from("seo_settings").select("*").eq("tournament_id", tournamentData.id).maybeSingle(),
        ]);
        if (!mounted) return;
        setTheme(themeRes.data);
        setSiteSettings(siteRes.data as unknown as SiteSettingsRow | null);
        setSeo(seoRes.data);
        setIsLoading(false);

        // Live-update branding for anyone with this tournament's site
        // already open, filtered strictly to this tournament_id so no other
        // tournament's changes can ever affect this page.
        channel = supabase
          .channel(`public-site:${tournamentData.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "website_themes", filter: `tournament_id=eq.${tournamentData.id}` }, (payload) => {
            if (payload.eventType !== "DELETE") setTheme(payload.new as SiteTheme);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: `tournament_id=eq.${tournamentData.id}` }, (payload) => {
            if (payload.eventType !== "DELETE") setSiteSettings(payload.new as SiteSettingsRow);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "seo_settings", filter: `tournament_id=eq.${tournamentData.id}` }, (payload) => {
            if (payload.eventType !== "DELETE") setSeo(payload.new as SeoSettingsRow);
          })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${tournamentData.id}` }, (payload) => {
            setTournament(payload.new as SiteTournament);
          })
          .subscribe();
      });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [slug]);

  return { tournament, theme, siteSettings, seo, isLoading, notFound };
}
