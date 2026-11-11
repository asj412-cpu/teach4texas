import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only SUPABASE_URL preferred; NEXT_PUBLIC_SUPABASE_URL kept for existing prod env. */
function cleanUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Skip non-URL placeholders (e.g. neutralized temp vars) so they can't shadow a real value.
  if (/^https:\/\//.test(trimmed)) return trimmed;
  return undefined;
}

function supabaseUrl(): string | undefined {
  return cleanUrl(process.env.SUPABASE_URL) ?? cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export type SupabaseKeySource = "SERVICE_ROLE" | "SECRET" | "none";
export type SupabaseKeyKind = "sb_secret" | "jwt" | "other";

export type SupabaseDiag = {
  urlHost: string | null;
  keySource: SupabaseKeySource;
  keyKind: SupabaseKeyKind;
  keyLen: number;
  keyHadWhitespace: boolean;
};

function keyKind(key: string | undefined): SupabaseKeyKind {
  if (!key) return "other";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  if (key.startsWith("eyJ")) return "jwt";
  return "other";
}

function acceptedKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith("eyJ") || trimmed.startsWith("sb_secret_")) return trimmed;
  return undefined;
}

/**
 * Server-only key. Prefers SUPABASE_SERVICE_ROLE_KEY (current prod), then the
 * Supabase-Vercel integration's SUPABASE_SECRET_KEY. Placeholders are skipped.
 * Values are trimmed so a trailing newline cannot fail the API key check.
 */
function serverKey(): { key: string; source: Exclude<SupabaseKeySource, "none">; hadWhitespace: boolean } | undefined {
  const candidates = [
    ["SERVICE_ROLE", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["SECRET", process.env.SUPABASE_SECRET_KEY],
  ] as const;
  for (const [source, raw] of candidates) {
    const key = acceptedKey(raw);
    if (!key || raw === undefined) continue;
    return { key, source, hadWhitespace: raw !== raw.trim() || /\s/.test(raw) };
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

/**
 * Safe description of which URL host and key shape the server would use.
 * Never includes key characters. Callers must omit this on production health.
 */
export function supabaseDiag(): SupabaseDiag {
  const url = supabaseUrl();
  let urlHost: string | null = null;
  if (url) {
    try {
      urlHost = new URL(url).host;
    } catch {
      urlHost = null;
    }
  }
  const picked = serverKey();
  return {
    urlHost,
    keySource: picked?.source ?? "none",
    keyKind: keyKind(picked?.key),
    keyLen: picked?.key.length ?? 0,
    keyHadWhitespace: picked?.hadWhitespace ?? false,
  };
}

/** Production probes keep the original body. Every other env may see supabaseDiag. */
export function withSupabaseHealthDiag<T extends Record<string, unknown>>(
  body: T,
): T | (T & { supabaseDiag: SupabaseDiag }) {
  if (process.env.VERCEL_ENV === "production") return body;
  return { ...body, supabaseDiag: supabaseDiag() };
}

let cached: { url: string; key: string; client: SupabaseClient } | null = null;

/**
 * supabase-js 2.112 sends the API key as Authorization: Bearer on REST calls
 * (only Edge Functions omit it for sb_secret_). New secret keys are not JWTs.
 * Keep them on the apikey header only.
 */
function secretKeyFetch(key: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("apikey", key);
    if (headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    return fetch(input, { ...init, headers });
  };
}

function createServiceClient(url: string, key: string): SupabaseClient {
  const secret = key.startsWith("sb_secret_");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { apikey: key },
      fetch: secret ? secretKeyFetch(key) : undefined,
    },
  });
}

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
  const picked = serverKey();
  if (!url || !picked) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  if (!cached || cached.url !== url || cached.key !== picked.key) {
    cached = { url, key: picked.key, client: createServiceClient(url, picked.key) };
  }
  return cached.client;
}
