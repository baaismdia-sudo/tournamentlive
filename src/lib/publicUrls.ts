/**
 * Centralized public URL generation.
 *
 * All public-facing tournament/match links MUST go through these helpers.
 * Never hardcode a domain (e.g. "tournamentlive.app") anywhere else in the app.
 *
 * VITE_APP_BASE_URL should be set to the actual deployment origin, e.g.
 *   https://my-tournamentlive.vercel.app
 * If it's not set, we fall back to the browser's current origin so the app
 * still works correctly in any environment (local dev, preview deploys, etc.)
 * without requiring a purchased custom domain.
 */

export function getBaseUrl(): string {
  const configured = import.meta.env.VITE_APP_BASE_URL as string | undefined;
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/+$/, ""); // strip trailing slash
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function getTournamentUrl(slug: string): string {
  return `${getBaseUrl()}/tournament/${slug}`;
}

export function getTournamentPageUrl(slug: string, page: string): string {
  const cleanPage = page.replace(/^\/+/, "");
  return `${getBaseUrl()}/tournament/${slug}/${cleanPage}`;
}

export function getLiveMatchUrl(matchId: string): string {
  return `${getBaseUrl()}/live/${matchId}`;
}

export function getTeamUrl(slug: string, teamId: string): string {
  return `${getBaseUrl()}/tournament/${slug}/teams/${teamId}`;
}

export function getPlayerUrl(slug: string, playerId: string): string {
  return `${getBaseUrl()}/tournament/${slug}/players/${playerId}`;
}
