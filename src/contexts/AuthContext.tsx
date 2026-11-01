import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { getOwnProfile } from "../services/supabase/profiles";
import { log } from "../lib/observability/logger";
import { Sentry } from "../lib/observability/sentry";
import { setLogUser, setLogRole, getLogUserId } from "../lib/observability/context";
import type { Profile } from "../../supabase/types/database.types";

interface ProfileWithRole extends Profile {
  roles?: { name: string; label: string };
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileWithRole | null;
  roleName: string | null;
  isLoading: boolean;
  isEmailVerified: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const p = (await getOwnProfile()) as ProfileWithRole | null;
      setProfile(p);
      setLogRole(p?.roles?.name ?? null);
      // A signed-in user with no profile row looks "role-less" and gets bounced around
      // the app with no error on screen — make it visible.
      if (!p) log.warn("auth.profile_missing");
    } catch (err) {
      // Previously swallowed: the user simply appeared to have no role / no access.
      log.fail("auth.profile_load_failed", err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLogUser(data.session?.user?.id ?? null);
      Sentry.setUser(data.session?.user ? { id: data.session.user.id } : null);
      if (data.session?.user) await loadProfile();
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      const previousUserId = getLogUserId();
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLogUser(newSession?.user?.id ?? null);
      // Only the user's id is ever attached — never their email or name.
      Sentry.setUser(newSession?.user ? { id: newSession.user.id } : null);
      if (event === "SIGNED_IN" && newSession?.user && newSession.user.id !== previousUserId) log.info("auth.session.signed_in");
      if (event === "SIGNED_OUT") log.info("auth.session.signed_out", { previousUserId });
      if (event === "PASSWORD_RECOVERY") log.info("auth.session.password_recovery");
      if (newSession?.user) {
        await loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    roleName: profile?.roles?.name ?? null,
    isLoading,
    isEmailVerified: Boolean(user?.email_confirmed_at),
    refreshProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
