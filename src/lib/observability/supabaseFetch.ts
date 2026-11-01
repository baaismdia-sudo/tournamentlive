import { log } from "./logger";
import { newRequestId } from "./context";
import { scrubUrl } from "./redact";

const SLOW_MS = 4000;

/** "/rest/v1/rpc/log_cricket_delivery" -> { service: "rpc", target: "log_cricket_delivery" } */
export function classifySupabasePath(pathname: string): { service: string; target: string } {
  const parts = pathname.split("/").filter(Boolean); // e.g. ["rest","v1","matches"]
  const [area, , first, second] = parts;
  if (area === "auth") return { service: "auth", target: first ?? "unknown" };
  if (area === "rest") return first === "rpc" ? { service: "rpc", target: second ?? "unknown" } : { service: "rest", target: first ?? "unknown" };
  if (area === "storage") return { service: "storage", target: [first, second].filter(Boolean).join("/") || "unknown" };
  if (area === "functions") return { service: "function", target: first ?? "unknown" };
  return { service: area ?? "other", target: first ?? "unknown" };
}

/** Postgres/PostgREST error body -> its code + message. `details`/`hint` are never read (they can contain row data). */
async function readErrorBody(res: Response): Promise<{ pgCode?: string; pgMessage?: string }> {
  try {
    if (!(res.headers.get("content-type") ?? "").includes("json")) return {};
    const text = (await res.clone().text()).slice(0, 2000);
    const body = JSON.parse(text) as { code?: unknown; message?: unknown; error_code?: unknown; msg?: unknown };
    return {
      pgCode: typeof body.code === "string" ? body.code : typeof body.error_code === "string" ? body.error_code : undefined,
      pgMessage: typeof body.message === "string" ? body.message : typeof body.msg === "string" ? body.msg : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * A fetch wrapper for the Supabase client: the camera over the whole building.
 * Every failed or slow API call is logged once, in one place, with what was called
 * (never its body, headers or query values) and what came back. Successful calls
 * are not logged (volume). Auth 4xx are left to the auth service, which knows the
 * business meaning (wrong password vs. expired link).
 */
export const instrumentedFetch: typeof fetch = async (input, init) => {
  const started = performance.now();
  const requestId = newRequestId();
  const request = input instanceof Request ? input : null;
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : (request?.url ?? "");
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const path = scrubUrl(rawUrl);
  const { service, target } = classifySupabasePath(new URL(path, location.origin).pathname);

  try {
    const res = await fetch(input, init);
    const durationMs = Math.round(performance.now() - started);

    if (res.status >= 500) {
      const body = await readErrorBody(res);
      log.fail("http.supabase.server_error", { name: "SupabaseServerError", message: body.pgMessage ?? `HTTP ${res.status}`, code: body.pgCode ?? String(res.status) }, { requestId, method, service, target, status: res.status, durationMs });
    } else if (res.status >= 400 && service !== "auth") {
      const body = await readErrorBody(res);
      const event = res.status === 429 ? "http.supabase.rate_limited" : res.status === 401 || res.status === 403 ? "http.supabase.denied" : "http.supabase.rejected";
      log.warn(event, { requestId, method, service, target, status: res.status, pgCode: body.pgCode, pgMessage: body.pgMessage, durationMs });
    } else if (durationMs > SLOW_MS) {
      log.warn("http.supabase.slow", { requestId, method, service, target, status: res.status, durationMs });
    }
    return res;
  } catch (err) {
    // Navigating away / component unmount aborts requests on purpose — that is not a failure.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const attrs = { requestId, method, service, target, offline, durationMs: Math.round(performance.now() - started) };
    if (offline) log.warn("http.supabase.network_offline", attrs);
    else log.error("http.supabase.network_error", { ...attrs, errorMessage: err instanceof Error ? err.message : "fetch failed" });
    throw err;
  }
};
