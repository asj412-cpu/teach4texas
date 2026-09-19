import { z } from "zod";

/**
 * Product access code (TPT download) vs room join code (students).
 * Only product access codes are modeled here.
 */

export const ProductCodeRecordSchema = z.object({
  id: z.string().min(1),
  /** SHA-256 hex of normalized plaintext code. Never store plaintext. */
  code_hash: z.string().length(64),
  /** The one board this code may unlock — isolation boundary. */
  board_id: z.string().min(1),
  /** Label for operator (e.g. "TPT buyer batch March"). */
  label: z.string().max(120).optional(),
  /** null = unlimited host sessions until revoked. */
  max_sessions: z.number().int().positive().nullable(),
  sessions_started: z.number().int().nonnegative().default(0),
  revoked_at: z.string().nullable().default(null),
  created_at: z.string(),
});

export type ProductCodeRecord = z.infer<typeof ProductCodeRecordSchema>;

/** Cookie-backed host entitlement after redeem. Bound to exactly one board. */
export const HostEntitlementSchema = z.object({
  entitlement_id: z.string().min(1),
  board_id: z.string().min(1),
  product_code_id: z.string().min(1),
  /** Opaque secret in cookie; only hash stored server-side. */
  token_hash: z.string().length(64),
  expires_at: z.string(),
  created_at: z.string(),
});

export type HostEntitlement = z.infer<typeof HostEntitlementSchema>;

export const ACCESS_CODE_COOKIE = "t4t_host_entitlement";
export const ENTITLEMENT_TTL_HOURS = 12;

/**
 * Normalize for hashing: uppercase A–Z0–9 only.
 * Teachers may type with or without hyphens/spaces.
 */
export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Display format T4T-XXXX-XXXX-… (4-char groups after prefix). */
export function formatAccessCode(raw: string): string {
  let n = normalizeAccessCode(raw);
  if (n.startsWith("T4T")) n = n.slice(3);
  const groups = n.match(/.{1,4}/g) ?? [];
  return `T4T-${groups.join("-")}`;
}
