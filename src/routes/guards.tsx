import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PageLoader } from "../components/ui/LoadingSpinner";

/**
 * Client-side route guards are a UX layer only — the real authorization
 * boundary is Postgres RLS. These exist so unauthenticated/unauthorized
 * users see the right page instantly instead of a flash of protected UI
 * followed by empty data from a denied query.
 */

/**
 * Single source of truth for "where does this role actually live." Every
 * role has its own workspace route — Scorekeeper and Commentator do NOT
 * share /dashboard with Organizer/Manager, so sending them there (or
 * anywhere other than their real workspace) causes an immediate
 * "Access denied" the moment RequireAuth's role check runs. Both the login
 * redirect and RequireGuest must use this same mapping, or they drift out
 * of sync exactly like this did before.
 */
export function homeRouteForRole(roleName: string | null | undefined): string {
  switch (roleName) {
    case "super_admin":
      return "/admin";
    case "organizer":
    case "manager":
      return "/dashboard";
    case "scorekeeper":
      return "/scorekeeper";
    case "commentator":
      return "/commentator";
    default:
      // viewer, or any role without a dedicated workspace
      return "/account/profile";
  }
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const { session, isLoading, isEmailVerified, roleName, profile } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Checking your session..." />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (profile?.status === "suspended") {
    return <Navigate to="/access-denied" replace state={{ reason: "suspended" }} />;
  }

  if (profile?.status === "pending") {
    return <Navigate to="/account-pending" replace />;
  }

  if (roles && roles.length > 0 && (!roleName || !roles.includes(roleName))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { session, isLoading, roleName } = useAuth();
  if (isLoading) return <PageLoader label="Loading..." />;
  if (session) return <Navigate to={homeRouteForRole(roleName)} replace />;
  return <>{children}</>;
}

export function RequirePermission({
  children,
  permission,
  hasPermission,
}: {
  children: ReactNode;
  permission: string;
  hasPermission: (code: string) => boolean;
}) {
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}
