/**
 * Extracts a readable message from any thrown value.
 *
 * Supabase errors (PostgrestError, AuthError, StorageError, the errors
 * thrown by .rpc() calls) are plain objects with a `.message` field — they
 * are NOT instances of the native `Error` class. Code that checks
 * `err instanceof Error` before reading `.message` will silently fall
 * through to a generic "Unknown error" for every single Supabase failure,
 * which defeats the entire point of surfacing the real error to the user.
 * Always use this helper in catch blocks instead of an `instanceof Error`
 * check.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") return err;
  return "Unknown error";
}
