import { createHash, randomBytes } from "crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** 12 random bytes → 24 hex chars → T4T-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (high entropy). */
export function generateProductAccessCode(): string {
  const hex = randomBytes(12).toString("hex").toUpperCase(); // 24 chars
  const groups = hex.match(/.{1,4}/g)!;
  return `T4T-${groups.join("-")}`;
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}
