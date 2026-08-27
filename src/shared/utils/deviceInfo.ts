/**
 * Lightweight user-agent parsing — good enough for "Chrome on Windows,
 * mobile" style login-history display without pulling in a full UA-parser
 * dependency. Not exhaustive, but covers the common browsers/OSes/devices.
 */
export function parseDeviceInfo(userAgent: string) {
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Unknown browser";
  const os = /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Linux/.test(userAgent) ? "Linux" : "Unknown OS";
  const device = /Mobi/.test(userAgent) ? "Mobile" : /Tablet|iPad/.test(userAgent) ? "Tablet" : "Desktop";
  return { browser, os, device };
}

/**
 * Best-effort public IP lookup via a client-side call to a free IP-echo
 * service. This is the real-world approach for capturing IP from a pure
 * SPA (Postgres never sees the browser's IP on a client-side insert) —
 * it can fail or be blocked by an ad blocker, so callers must treat a
 * null return as "IP unavailable," not an error.
 */
export async function getClientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip ?? null;
  } catch {
    return null;
  }
}
