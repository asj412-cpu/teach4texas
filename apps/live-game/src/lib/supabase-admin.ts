import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** True when production/durable path is configured. File store is fallback only. */
/** Server-only SUPABASE_URL preferred; NEXT_PUBLIC_SUPABASE_URL kept for existing prod env. */
function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cached: SupabaseClient | null = null;

/**
 * Server-only service-role client. Never import from client components.
 * Anon/authenticated have no table grants and no RLS write policies.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
