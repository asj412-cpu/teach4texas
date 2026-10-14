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

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && serverKey());
}

let cached: SupabaseClient | null = null;

/**
 * Server-only service-role client. Never import from client components.
 * Anon/authenticated have no table grants and no RLS write policies.
 */
export function getServiceSupabase(): SupabaseClient {
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
