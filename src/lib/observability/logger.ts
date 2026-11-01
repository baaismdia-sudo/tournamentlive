import * as Sentry from "@sentry/react";
import { baseAttributes, newRequestId } from "./context";
import { redactString, sanitizeAttributes, type LogAttrs } from "./redact";

type Level = "debug" | "info" | "warn" | "error";

/** Pull the useful, non-sensitive facts out of whatever was thrown (Error, Supabase error object, string...). */
export function describeError(error: unknown): { errorName: string; errorMessage: string; errorCode?: string; httpStatus?: number } {
  if (error instanceof Error) {
    const e = error as Error & { code?: string; status?: number };
    return { errorName: e.name, errorMessage: redactString(e.message), errorCode: e.code, httpStatus: e.status };
  }
  if (error && typeof error === "object") {
    // Supabase/PostgREST errors are plain objects: { message, code, details, hint }.
    // `details` is intentionally never read — Postgres puts offending row values in it.
    const e = error as { message?: unknown; code?: unknown; status?: unknown; name?: unknown };
    return {
      errorName: typeof e.name === "string" ? e.name : "SupabaseError",
      errorMessage: redactString(typeof e.message === "string" ? e.message : "unknown error"),
      errorCode: typeof e.code === "string" ? e.code : undefined,
      httpStatus: typeof e.status === "number" ? e.status : undefined,
    };
  }
  return { errorName: "UnknownError", errorMessage: redactString(String(error)) };
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  const d = describeError(error);
  const err = new Error(d.errorMessage);
  err.name = d.errorName;
  return err;
}

function write(level: Level, event: string, attrs?: LogAttrs) {
  const payload = sanitizeAttributes({ ...baseAttributes(), ...attrs });
  Sentry.logger[level](event, payload);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](`[scorio] ${event}`, payload);
  }
}

/**
 * The one way the app writes logs. `event` is a stable dotted name
 * ("auth.login.failed") so it can be searched and alerted on; put variable
 * facts in `attrs`, never in the event name. Attributes must be flat primitives.
 */
export const log = {
  debug: (event: string, attrs?: LogAttrs) => write("debug", event, attrs),
  info: (event: string, attrs?: LogAttrs) => write("info", event, attrs),
  /** Expected-but-notable: wrong password, validation failure, offline, a denied request. */
  warn: (event: string, attrs?: LogAttrs) => write("warn", event, attrs),
  /** Error-level log only (no Sentry "issue"). Use `fail` for unexpected failures. */
  error: (event: string, attrs?: LogAttrs) => write("error", event, attrs),
  /**
   * An UNEXPECTED failure. Writes an error log AND opens/updates a Sentry issue
   * (grouped by event + error code, so 500 identical failures are one issue, not
   * 500) — issues are what the "new problem" alert fires on.
   */
  fail(event: string, error: unknown, attrs?: LogAttrs) {
    const d = describeError(error);
    write("error", event, { ...attrs, errorName: d.errorName, errorMessage: d.errorMessage, errorCode: d.errorCode, httpStatus: d.httpStatus });
    Sentry.withScope((scope) => {
      scope.setFingerprint([event, d.errorCode ?? "no-code"]);
      scope.setTag("event", event);
      scope.setContext("log", sanitizeAttributes({ ...baseAttributes(), ...attrs }));
      Sentry.captureException(toError(error));
    });
  },
};

/**
 * One logical operation (a login attempt, one delivery, one enquiry). Every line
 * it writes shares a requestId, so a single search reconstructs what happened.
 */
export function startRequest(op: string, base: LogAttrs = {}) {
  const requestId = newRequestId();
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsed = () => Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0);
  const ctx = (extra?: LogAttrs): LogAttrs => ({ ...base, ...extra, requestId, op });
  return {
    id: requestId,
    info: (event: string, a?: LogAttrs) => log.info(event, ctx(a)),
    warn: (event: string, a?: LogAttrs) => log.warn(event, ctx(a)),
    /** Operation succeeded -> `${op}.ok`. */
    ok: (a?: LogAttrs) => log.info(`${op}.ok`, ctx({ ...a, durationMs: elapsed() })),
    /** Failed for an EXPECTED reason (bad password, validation). Warn log, no Sentry issue. */
    rejected: (reason: string, a?: LogAttrs) => log.warn(`${op}.failed`, ctx({ ...a, reason, durationMs: elapsed() })),
    /** Failed unexpectedly. Error log + Sentry issue. */
    fail: (error: unknown, a?: LogAttrs) => log.fail(`${op}.failed`, error, ctx({ ...a, durationMs: elapsed() })),
  };
}

/**
 * Was this a "the user/request was wrong" failure (HTTP 4xx: bad password, weak password,
 * rate limit, validation) rather than "something is broken" (5xx, network down, no status)?
 * Expected failures are logged as warnings; unexpected ones also open a Sentry issue.
 */
export function isExpectedFailure(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

/**
 * Runs one operation and always leaves a trace: `${op}.ok` on success, `${op}.failed`
 * (+ a Sentry issue) on failure, sharing one requestId — then re-throws the original
 * error untouched so callers and on-screen messages behave exactly as before.
 */
export async function trackOperation<T>(op: string, attrs: LogAttrs, fn: () => Promise<T>): Promise<T> {
  const req = startRequest(op, attrs);
  try {
    const result = await fn();
    req.ok();
    return result;
  } catch (error) {
    req.fail(error);
    throw error;
  }
}
