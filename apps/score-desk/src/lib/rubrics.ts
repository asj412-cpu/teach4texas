import data from "@/data/rubrics.json";
import type { DeskState, Rubric, Score } from "./types";

/** Verbatim built-in rubrics carried over from the original Score Desk (see /workspace/ops/score-desk/rubrics.json). */
export const RUBRICS: Rubric[] = (data as { rubrics: Rubric[] }).rubrics;
export const rubricById = (id: string | undefined) => RUBRICS.find((r) => r.id === id);

export const maxPoints = (r: Rubric) => r.criteria.reduce((s, c) => s + Math.max(...c.levels.map((l) => l.score)), 0);

/** STAAR ECR rule (from original app): if Org/Dev is 0, Conventions is 0. */
export function applyRules(r: Rubric, cs: Record<string, number>): Record<string, number> {
  if (r.kind !== "staar-ecr") return cs;
  const [a, b] = [r.criteria[0]?.id, r.criteria[1]?.id];
  if (!a || !b) return cs;
  return (cs[a] ?? 0) === 0 && cs[a] !== undefined ? { ...cs, [b]: 0 } : cs;
}
export function total(r: Rubric, s: Score | undefined): number | null {
  if (!s) return null;
  const cs = applyRules(r, s.criterionScores);
  let t = 0, any = false;
  for (const c of r.criteria) if (cs[c.id] !== undefined) { any = true; t += cs[c.id]; }
  return any ? t : null;
}
export const isComplete = (r: Rubric, s: Score | undefined) => !!s && r.criteria.every((c) => s.criterionScores[c.id] !== undefined);

/** Verified LIVE by TPT Operator 2026-10-15: ID 17493794 (FREE listing). CTA copy must say "free", never a price/"full version". */
export const TPT_LISTING_ID = "17493794";
export const TPT_LISTING_URL = "https://www.teacherspayteachers.com/Product/FREE-Score-Desk-Companion-STAAR-Click-Score-One-Pager-17493794";
export const TPT_CTA_TEXT = "Get Score Desk free on TPT";

export function emptyState(): DeskState {
  return { classes: [], assignments: [], scores: [], lastClassId: null, lastAssignmentId: null };
}
