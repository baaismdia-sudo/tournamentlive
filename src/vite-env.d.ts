/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Sentry project DSN. Public by design (safe in the browser). Leave unset to disable all remote logging. */
  readonly VITE_SENTRY_DSN?: string;
  /** e.g. "production" | "preview". Defaults to the Vite mode. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}

/** Git commit (short) on Vercel, else the package version. Injected by vite.config.ts. */
declare const __APP_RELEASE__: string;
