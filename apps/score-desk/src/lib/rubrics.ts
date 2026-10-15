import data from "@/data/rubrics.json";
import type { DeskState, Rubric, Score } from "./types";

/** Verbatim built-in rubrics carried over from the original Score Desk (see /workspace/ops/score-desk/rubrics.json). */
export const RUBRICS: Rubric[] = (data as { rubrics: Rubric[] }).rubrics;
let CUSTOM: Rubric[] = [];
/** Called by the desk on each render so lookups see this browser's custom rubrics. */
export function setCustomRubrics(list: Rubric[] | undefined) { CUSTOM = list ?? []; }
export const allRubrics = (): Rubric[] => [...RUBRICS, ...CUSTOM];
export const rubricById = (id: string | undefined) => RUBRICS.find((r) => r.id === id) ?? CUSTOM.find((r) => r.id === id);

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));
/** Same template as the original Score Desk "New rubric". */
export function blankRubric(): Rubric {
  return {
    id: newId(), name: "New TEKS rubric", kind: "custom", subject: "RLA", gradeBand: "3–5", teks: "", blurb: "",
    studentTitle: "How this assignment is scored", builtIn: false,
    criteria: [{ id: newId(), name: "Criterion 1", shortName: "C1", levels: [
      { score: 1, label: "1", teacher: "Beginning", student: "I am getting started." },
      { score: 2, label: "2", teacher: "Developing", student: "I showed some of the skill." },
      { score: 3, label: "3", teacher: "Proficient", student: "I met the goal." },
      { score: 4, label: "4", teacher: "Distinguished", student: "I went beyond the goal." },
    ] }],
  };
}
/** Same as the original "Add criterion". */
export function blankCriterion(n: number) {
  return { id: newId(), name: `Criterion ${n}`, shortName: `C${n}`, levels: [
    { score: 1, label: "1", teacher: "Beginning", student: "Getting started." },
    { score: 2, label: "2", teacher: "Developing", student: "Some of the skill." },
    { score: 3, label: "3", teacher: "Proficient", student: "Met the goal." },
    { score: 4, label: "4", teacher: "Distinguished", student: "Went beyond." },
  ] };
}
/** Same as the original Duplicate: editable copy, "(copy)" suffix, kind custom, fresh ids. */
export function duplicateRubric(r: Rubric): Rubric {
  return { ...structuredClone(r), id: newId(), builtIn: false, name: `${r.name} (copy)`, kind: "custom",
    criteria: r.criteria.map((c) => ({ ...c, id: newId(), levels: c.levels.map((l) => ({ ...l })) })) };
}

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
