import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent, Log } from "@sentry/react";
import { sanitizeAttributes, sanitizeDeep, redactString, scrubUrl } from "./redact";
import { sessionId } from "./context";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const observability = {
  enabled: Boolean(dsn),
  environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? import.meta.env.MODE,
  release: typeof __APP_RELEASE__ === "string" ? __APP_RELEASE__ : "dev",
  sessionId,
};

/** Last-line defence for error events: anything the helper layer missed gets scrubbed here. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined; // never email / username / IP
  if (event.message) event.message = redactString(event.message);
  event.exception?.values?.forEach((v) => {
    if (v.value) v.value = redactString(v.value);
  });
  if (event.extra) event.extra = sanitizeDeep(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = sanitizeDeep(event.contexts) as typeof event.contexts;
  if (event.tags) event.tags = sanitizeDeep(event.tags) as typeof event.tags;
  event.breadcrumbs?.forEach(scrubBreadcrumb);
  return event;
}

export function scrubBreadcrumb(b: Breadcrumb): Breadcrumb {
  if (b.message) b.message = redactString(b.message);
  if (b.data) {
    const data = { ...b.data } as Record<string, unknown>;
    for (const key of ["url", "from", "to"]) {
      if (typeof data[key] === "string") data[key] = scrubUrl(data[key] as string);
    }
    b.data = sanitizeDeep(data) as Record<string, unknown>;
  }
  return b;
}

/** Last-line defence for logs: runs on every log after the SDK adds its own attributes (incl. user.email if ever set). */
export function scrubLog(entry: Log): Log | null {
  const attributes = { ...(entry.attributes ?? {}) } as Record<string, unknown>;
  delete attributes["user.email"];
  delete attributes["user.name"];
  delete attributes["user.ip_address"];
  return {
    ...entry,
    message: typeof entry.message === "string" ? redactString(entry.message) : entry.message,
    attributes: sanitizeAttributes(attributes),
  };
}

export function initObservability() {
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: observability.environment,
    release: observability.release,
    // v11 sends no cookies/IP/email by default; scrubEvent + scrubLog below enforce it even if that ever changes.
    attachStacktrace: true,
    maxBreadcrumbs: 40,
    denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i],
    ignoreErrors: ["ResizeObserver loop limit exceeded", "ResizeObserver loop completed with undelivered notifications."],
    beforeSend: (event) => scrubEvent(event),
    beforeSendLog: (entry) => scrubLog(entry),
    beforeBreadcrumb: (b) => scrubBreadcrumb(b),
  });
  Sentry.setTag("app", "scorio");
  Sentry.setTag("session_id", sessionId);
}

export { Sentry };
