/**
 * Camera 4 — "who + which request".
 *
 * Every log line carries: userId (who), sessionId (this browser tab's visit),
 * route (where), and — for anything that is one logical operation — a requestId.
 */
import { scrubUrl } from "./redact";

function randomHex(length: number): string {
  try {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
  } catch {
    return Math.random().toString(16).slice(2, 2 + length).padEnd(length, "0");
  }
}

/** One per page load. Lets you read a single visit end-to-end even before the user logs in. */
export const sessionId = `ses_${randomHex(10)}`;

/** One per operation (a login attempt, a delivery, an HTTP call). */
export function newRequestId(): string {
  return `req_${randomHex(8)}`;
}

let currentUserId: string | null = null;
let currentRole: string | null = null;

export function setLogUser(userId: string | null, role?: string | null) {
  currentUserId = userId;
  currentRole = userId ? role ?? currentRole : null;
}
export function setLogRole(role: string | null) {
  currentRole = role;
}
export function getLogUserId() {
  return currentUserId;
}

export function baseAttributes(): Record<string, string> {
  const base: Record<string, string> = { sessionId };
  if (currentUserId) base.userId = currentUserId;
  if (currentRole) base.role = currentRole;
  if (typeof location !== "undefined") base.route = scrubUrl(location.pathname);
  return base;
}
