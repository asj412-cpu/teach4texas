// SERVER ONLY. Imported only from route handlers.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const FULL_COOKIE = "t4t_score_desk_full";
export const FULL_TTL_DAYS = 365;

export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function secret(): string | null {
  const s = process.env.SCORE_DESK_COOKIE_SECRET;
  return s && s.length >= 16 ? s : null;
}

/** Cookie = "<exp>.<nonce>.<hmac>" — stateless, no DB writes on redeem. */
export function mintFullCookie(): { value: string; maxAge: number } | null {
  const key = secret();
  if (!key) return null;
  const maxAge = FULL_TTL_DAYS * 86400;
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const nonce = randomBytes(12).toString("hex");
  const mac = createHmac("sha256", key).update(`full:${exp}:${nonce}`).digest("hex");
  return { value: `${exp}.${nonce}.${mac}`, maxAge };
}

export function verifyFullCookie(v: string | undefined): boolean {
  const key = secret();
  if (!key || !v) return false;
  const [exp, nonce, mac] = v.split(".");
  if (!exp || !nonce || !mac || Number(exp) * 1000 < Date.now()) return false;
  const want = createHmac("sha256", key).update(`full:${exp}:${nonce}`).digest("hex");
  const a = Buffer.from(mac), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

function supabaseServer() {
  const url = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL].find((v) => v && /^https:\/\//.test(v));
  const key = [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SECRET_KEY].find(
    (v) => v && (v.startsWith("eyJ") || v.startsWith("sb_secret_")),
  );
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type RedeemError = "INVALID_CODE" | "CODE_REVOKED" | "CODE_EXHAUSTED" | "WRONG_PRODUCT" | "NOT_CONFIGURED";

/**
 * Same model as apps/live-game: product_codes.code_hash = sha256(normalized code),
 * bound to exactly one board_id. Score Desk accepts only codes whose board_id is
 * SCORE_DESK_BOARD_ID (default "score_desk_full"); a live-game code is rejected.
 */
export async function checkCode(raw: string): Promise<{ ok: true; via: string } | { ok: false; error: RedeemError }> {
  const n = normalizeAccessCode(raw);
  if (n.length < 12) return { ok: false, error: "INVALID_CODE" };
  const hash = sha256Hex(n);

  const previewHashes = (process.env.SCORE_DESK_PREVIEW_CODE_HASHES ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[0-9a-f]{64}$/.test(s));
  if (process.env.VERCEL_ENV !== "production" && previewHashes.includes(hash)) return { ok: true, via: "preview_env" };

  const sb = supabaseServer();
  if (!sb) return { ok: false, error: previewHashes.length ? "INVALID_CODE" : "NOT_CONFIGURED" };
  const { data, error } = await sb
    .from("product_codes")
    .select("id, board_id, max_sessions, sessions_started, revoked_at")
    .eq("code_hash", hash)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "INVALID_CODE" };
  if (data.board_id !== (process.env.SCORE_DESK_BOARD_ID || "score_desk_full")) return { ok: false, error: "WRONG_PRODUCT" };
  if (data.revoked_at) return { ok: false, error: "CODE_REVOKED" };
  if (data.max_sessions != null && data.sessions_started >= data.max_sessions) return { ok: false, error: "CODE_EXHAUSTED" };
  return { ok: true, via: "product_codes" };
}
