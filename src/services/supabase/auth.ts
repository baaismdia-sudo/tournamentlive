import { supabase } from "../../lib/supabaseClient";
import { parseDeviceInfo, getClientIp } from "../../shared/utils/deviceInfo";
import type { SignupInput, LoginInput } from "../../shared/validators/auth.schema";
import { startRequest, describeError, isExpectedFailure } from "../../lib/observability/logger";
import { maskEmail } from "../../lib/observability/redact";

type Req = ReturnType<typeof startRequest>;

/** Non-fatal follow-up writes must not block the user, but they must not fail silently either. */
function noteBookkeepingFailure(req: Req, step: string, error: unknown) {
  const d = describeError(error);
  req.warn("auth.bookkeeping_failed", { step, errorCode: d.errorCode, errorMessage: d.errorMessage });
}

/** One place for the "expected vs unexpected" rule used by every auth call. */
function reportAuthFailure(req: Req, error: unknown) {
  if (isExpectedFailure(error)) {
    const d = describeError(error);
    req.rejected(d.errorCode ?? "rejected", { httpStatus: d.httpStatus, errorMessage: d.errorMessage });
  } else {
    req.fail(error);
  }
}

export interface RegisterPayload extends SignupInput {
  username: string;
  phoneNumber?: string;
  country: string;
  timezone: string;
  newsletterOptIn?: boolean;
}

export async function registerUser(payload: RegisterPayload) {
  const req = startRequest("auth.signup", { emailMasked: maskEmail(payload.email), country: payload.country });
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: `${import.meta.env.VITE_APP_URL}/auth/verify-email-success`,
      data: {
        full_name: payload.fullName,
        username: payload.username,
        phone: payload.phoneNumber ?? null,
        country: payload.country,
        timezone: payload.timezone,
        newsletter_opt_in: payload.newsletterOptIn ?? false,
      },
    },
  });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  // Supabase deliberately returns a "successful" signup with no identities when the email is
  // already registered (to avoid leaking which emails exist). The screen says "check your
  // email" but no email is ever sent — a classic quiet failure, so record it.
  if (data.user && data.user.identities?.length === 0) {
    req.warn("auth.signup.email_already_registered");
  }
  req.ok({ userId: data.user?.id, verificationEmailRequested: !data.session });
  return data;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_username_available", { p_username: username });
  if (error) throw error;
  return Boolean(data);
}

export async function loginWithPassword(payload: LoginInput) {
  const req = startRequest("auth.login", { emailMasked: maskEmail(payload.email) });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  if (error) {
    // Wrong password / unconfirmed email are normal — a warning, not an incident. But a run of
    // these for one emailMasked in a short time is exactly what a credential-stuffing attempt looks like.
    reportAuthFailure(req, error);
    throw error;
  }

  // Persistence mode: Supabase always persists to localStorage by default via
  // the client config; "Remember Me" = false downgrades to sessionStorage by
  // re-writing the session into a session-scoped store and clearing local.
  if (!payload.rememberMe) {
    const raw = window.localStorage.getItem("tournamentlive-auth");
    if (raw) {
      window.sessionStorage.setItem("tournamentlive-auth", raw);
      window.localStorage.removeItem("tournamentlive-auth");
    }
  }

  const lastLogin = await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);
  if (lastLogin.error) noteBookkeepingFailure(req, "profiles.last_login_at", lastLogin.error);

  const { browser, os, device } = parseDeviceInfo(navigator.userAgent);
  const ip = await getClientIp();
  const history = await supabase.from("login_history").insert({ profile_id: data.user.id, browser, os, device, ip_address: ip });
  if (history.error) noteBookkeepingFailure(req, "login_history.insert", history.error);
  const activity = await supabase.from("activity_logs").insert({ profile_id: data.user.id, action: "login", metadata: { browser, os, device } });
  if (activity.error) noteBookkeepingFailure(req, "activity_logs.insert", activity.error);

  req.ok({ userId: data.user.id, browser, os, device });
  return data;
}

export async function loginWithGoogle() {
  const req = startRequest("auth.oauth_google", {});
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback` },
  });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  req.ok({});
  return data;
}

export async function sendMagicLink(email: string) {
  const req = startRequest("auth.magic_link", { emailMasked: maskEmail(email) });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback` },
  });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  req.ok({});
}

export async function requestPasswordReset(email: string) {
  const req = startRequest("auth.password_reset", { emailMasked: maskEmail(email) });
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
  });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  req.ok({});
}

export async function updatePassword(newPassword: string) {
  const req = startRequest("auth.password_update", {});
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  req.ok({});
}

export async function updateEmail(newEmail: string) {
  const req = startRequest("auth.email_update", { newEmailMasked: maskEmail(newEmail) });
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  req.ok({});
}

export async function resendVerificationEmail(email: string) {
  const req = startRequest("auth.verification_resend", { emailMasked: maskEmail(email) });
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${import.meta.env.VITE_APP_URL}/auth/verify-email-success` },
  });
  if (error) {
    reportAuthFailure(req, error);
    throw error;
  }
  req.ok({});
}

export async function signOut(everywhere = false) {
  const req = startRequest("auth.logout", { everywhere });
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    const activity = await supabase.from("activity_logs").insert({ profile_id: userData.user.id, action: "logout", metadata: {} });
    if (activity.error) noteBookkeepingFailure(req, "activity_logs.insert", activity.error);
  }
  const { error } = await supabase.auth.signOut({ scope: everywhere ? "global" : "local" });
  if (error) {
    req.fail(error);
    throw error;
  }
  req.ok();
}

export async function getActiveSessions() {
  // Supabase does not expose a cross-device session list via supabase-js on
  // the client; this reads the audit trail of successful logins instead,
  // which is what the "Active Sessions" UI displays (device/browser/IP/time).
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, metadata, ip_address, created_at")
    .eq("action", "login")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function deleteOwnAccount() {
  // Client cannot call auth.admin.deleteUser (needs service role). This
  // marks the profile for deletion; an Edge Function (service role) picks
  // up soft-deleted profiles on a schedule and performs the real deletion
  // from auth.users, keeping the destructive step off the client entirely.
  const req = startRequest("account.delete_request");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), status: "suspended" })
    .eq("id", userData.user.id);
  if (error) {
    req.fail(error);
    throw error;
  }
  // As of this writing no Edge Function exists to finish the job, so every request logged here
  // is a soft-deleted account still waiting for hard deletion. Search for awaitingCleanup=true
  // to see the backlog.
  req.ok({ userId: userData.user.id, awaitingCleanup: true });
  await signOut(true);
}
