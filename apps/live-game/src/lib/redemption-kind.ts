/**
 * Classify a redeem as demo vs paid for money-pulse telemetry.
 * Call with the output of normalizeAccessCode (hyphens/non-alnum already stripped),
 * so the demo packaging prefix "T4T-DEMO-" becomes "T4TDEMO".
 */
export type RedemptionKind = "demo" | "paid";

export function redemptionKindFromNormalizedCode(
  normalized: string,
): RedemptionKind {
  return normalized.startsWith("T4TDEMO") ? "demo" : "paid";
}
