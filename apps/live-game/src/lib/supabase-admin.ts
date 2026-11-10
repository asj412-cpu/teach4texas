import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** True when production/durable path is configured. File store is fallback only. */
/** Server-only SUPABASE_URL preferred; NEXT_PUBLIC_SUPABASE_URL kept for existing prod env. */
function supabaseUrl(): string | undefined {
  // Skip non-URL placeholders (e.g. neutralized temp vars) so they can't shadow a real value.
  for (const v of [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    if (v && /^https:\/\//.test(v)) return v;
  }
  return undefined;
}

/**
 * Server-only key. Prefers SUPABASE_SERVICE_ROLE_KEY (current prod), then the
 * Supabase-Vercel integration's SUPABASE_SECRET_KEY. Placeholders are skipped.
 */
function serverKey(): string | undefined {
  for (const v of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SECRET_KEY]) {
    if (v && (v.startsWith("eyJ") || v.startsWith("sb_secret_"))) return v;
  }
  return undefined;
}

/**
 * Preview (and any other non-production Vercel env) must not open a Supabase
 * client. Preview env currently points at the production project, so preview
 * traffic would write redeems, rooms, and usage into prod.
 * Production is unchanged. Local dev leaves VERCEL_ENV unset and is unchanged.
 * T4T_ALLOW_NONPROD_SUPABASE=1 is an explicit opt-in for a future isolated
 * non-prod project. Do not set it while the URL still points at prod.
 * Removing the Preview env vars is a later, separate step.
 */
function nonProdSupabaseBlocked(): boolean {
  const env = process.env.VERCEL_ENV;
  if (!env || env === "production") return false;
  return process.env.T4T_ALLOW_NONPROD_SUPABASE !== "1";
}

export function isSupabaseConfigured(): boolean {
  if (nonProdSupabaseBlocked()) return false;
  return Boolean(supabaseUrl() && serverKey());
}

let cached: SupabaseClient | null = null;

/**
 * Server-only service-role client. Never import from client components.
 * Anon/authenticated have no table grants and no RLS write policies.
 */
export function getServiceSupabase(): SupabaseClient {
  // Same gate as isSupabaseConfigured: never construct a client for a blocked env.
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const url = supabaseUrl();
  const key = serverKey();
  if (!url || !key) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
