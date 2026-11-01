import { createClient } from "@supabase/supabase-js";
import { instrumentedFetch } from "./observability/supabaseFetch";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Logs every failed / slow API call once, centrally (see lib/observability/supabaseFetch.ts).
  global: { fetch: instrumentedFetch },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "tournamentlive-auth",
  },
});
