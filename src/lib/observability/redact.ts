/**
 * Camera 5 — "nothing secret".
 *
 * Everything that leaves the browser as a log, an error event or a breadcrumb
 * passes through this module. It is deliberately defensive: it assumes callers
 * (including future code written in a hurry, or by an AI assistant) will one day
 * pass something they shouldn't.
 */

/** Keys that are always safe to keep, even though a naive rule might match them. */
const ALWAYS_KEEP = new Set(["requestid", "sessionid", "userid", "statuscode", "errorcode", "pgcode", "tokencount"]);

/** A key is sensitive if ANY of its words is one of these (keys are split on case/underscore/dash). */
const SENSITIVE_WORDS = new Set([
  "password", "passwd", "pwd", "passphrase", "passcode", "secret", "token", "tokens", "apikey", "authorization",
  "cookie", "cookies", "credential", "credentials", "jwt", "bearer", "otp", "pin", "cvv", "cvc", "cvn",
  "cardnumber", "cardholder", "iban", "aadhaar", "aadhar", "passport", "emirates", "ssn", "signature", "privatekey",
]);

/** Two-word combinations that are sensitive only together. */
const SENSITIVE_PAIRS: [string, string][] = [
  ["api", "key"], ["private", "key"], ["account", "number"], ["national", "id"], ["code", "verifier"],
  ["auth", "header"], ["set", "cookie"], ["pan", "number"], ["tax", "id"], ["id", "number"], ["secret", "key"],
  // "card" alone is NOT sensitive here: scorecard / yellowCard / redCard are everyday sports terms.
  ["card", "number"], ["card", "no"], ["card", "num"], ["card", "cvv"], ["card", "expiry"], ["card", "holder"],
  ["credit", "card"], ["debit", "card"], ["payment", "card"],
];

export const REDACTED = "[redacted]";

function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function isSensitiveKey(key: string): boolean {
  if (ALWAYS_KEEP.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase())) return false;
  const words = keyWords(key);
  if (words.some((w) => SENSITIVE_WORDS.has(w))) return true;
  // Also catch run-together keys like "apikey" / "accesstoken".
  const squashed = words.join("");
  if (squashed.endsWith("token") || squashed.endsWith("password") || squashed.endsWith("apikey") || squashed.endsWith("secret")) return true;
  return SENSITIVE_PAIRS.some(([a, b]) => words.includes(a) && words.includes(b));
}

const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const KEY_VALUE =
  /\b(pass(?:word|wd)?|pwd|secret|(?:access|refresh|id|auth|api)[_-]?token|token|api[_-]?key|apikey|authorization|otp|cvv|cvc|passcode)\b(["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&)}\]]+)/gi;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const LONG_DIGITS = /\b(?:\d[ -]?){12,19}\b/g; // card numbers, Aadhaar, Emirates ID, etc.

/** Mask secrets and personal data that appear inside free text (error messages, URLs, console output). */
export function redactString(input: string, maxLength = 500): string {
  let s = input
    .replace(JWT, "[jwt]")
    .replace(BEARER, "Bearer [redacted]")
    .replace(KEY_VALUE, (_m, k: string, sep: string) => `${k}${sep}${REDACTED}`)
    .replace(EMAIL, "[email]")
    .replace(LONG_DIGITS, "[number]");
  if (s.length > maxLength) s = `${s.slice(0, maxLength)}…`;
  return s;
}

/** "player@example.com" -> "pl***@example.com". Enough to recognise a repeat offender, not enough to identify. */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "unknown";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Strip the query string and #fragment (password-reset tokens and search terms live there). */
export function scrubUrl(url: string | undefined | null): string {
  if (!url) return "";
  try {
    const u = new URL(url, typeof location !== "undefined" ? location.origin : "http://localhost");
    const isRelative = !/^[a-z][a-z0-9+.-]*:/i.test(url);
    return isRelative ? u.pathname : `${u.origin}${u.pathname}`;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

export type LogValue = string | number | boolean | null | undefined;
export type LogAttrs = Record<string, LogValue>;

/** Flat, primitive-only attributes: objects and request bodies are refused by design. */
export function sanitizeAttributes(attrs: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!attrs) return out;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
    } else if (typeof value === "string") {
      out[key] = redactString(value, 300);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    } else if (value instanceof Error) {
      out[key] = redactString(`${value.name}: ${value.message}`, 300);
    } else {
      out[key] = "[object omitted]";
    }
  }
  return out;
}

/** Deep, depth-limited sanitiser for Sentry event payloads (extra, contexts, tags). */
export function sanitizeDeep(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitizeDeep(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      out[k] = isSensitiveKey(k) ? REDACTED : sanitizeDeep(v, depth + 1);
    }
    return out;
  }
  return "[unsupported]";
}
