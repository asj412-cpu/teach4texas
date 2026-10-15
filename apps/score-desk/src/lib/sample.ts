import type { DeskState } from "./types";

/** Seeded SAMPLE data (same demo class as the original Score Desk, plus MOY/EOY so Growth isn't empty). */
export function sampleState(): DeskState {
  const today = new Date().toISOString().slice(0, 10);
  const names = ["Mia", "Jayden", "Sofia", "Luis", "Avery", "Noah", "Camila", "Eli"];
  const students = names.map((name, i) => ({ id: `demo-s-${i + 1}`, name }));
  const c2 = ["Ava", "Mateo", "Zoe", "Diego", "Harper", "Liam"].map((name, i) => ({ id: `demo-t-${i + 1}`, name }));
  const ecr: [number, number, string][] = [[3, 2, "Clear idea + two text beats."], [2, 1, "Needs a second piece of evidence."], [2, 2, ""], [1, 1, "Restate + answer only."], [3, 1, "Strong development; conventions slips."]];
  const grow = (seed: number[], w: "BOY" | "MOY" | "EOY") => students.map((s, i) => ({ id: `demo-g-${w}-${i}`, assignmentId: `demo-asg-${w}`, studentId: s.id, criterionScores: { "ecr-org": Math.min(3, seed[i]), "ecr-conv": seed[i] === 0 ? 0 : Math.min(2, seed[i] - (i % 2)) }, comment: "" }));
  return {
    classes: [
      { id: "demo-class-4rla", name: "4th RLA — Period 2", grade: "4", subject: "RLA", students },
      { id: "demo-class-5rla", name: "5th RLA — Period 4", grade: "5", subject: "RLA", students: c2 },
    ],
    assignments: [
      { id: "demo-asg-ecr", classId: "demo-class-4rla", rubricId: "staar-ecr", title: "ECR practice — character response", date: today, window: "practice" },
      { id: "demo-asg-race", classId: "demo-class-5rla", rubricId: "race-4th", title: "RACE warm-up — theme", date: today, window: "practice" },
      { id: "demo-asg-BOY", classId: "demo-class-4rla", rubricId: "staar-ecr", title: "BOY ECR benchmark", date: "2026-09-02", window: "BOY" },
      { id: "demo-asg-MOY", classId: "demo-class-4rla", rubricId: "staar-ecr", title: "MOY ECR benchmark", date: "2026-12-09", window: "MOY" },
      { id: "demo-asg-EOY", classId: "demo-class-4rla", rubricId: "staar-ecr", title: "EOY ECR benchmark", date: "2027-04-14", window: "EOY" },
    ],
    scores: [
      ...ecr.map(([o, c, comment], i) => ({ id: `demo-sc-${i}`, assignmentId: "demo-asg-ecr", studentId: students[i].id, criterionScores: { "ecr-org": o, "ecr-conv": c }, comment })),
      ...grow([1, 1, 0, 1, 2, 1, 0, 1], "BOY"), ...grow([2, 1, 1, 1, 2, 2, 1, 2], "MOY"), ...grow([3, 2, 2, 2, 3, 2, 2, 3], "EOY"),
    ],
    lastClassId: "demo-class-4rla", lastAssignmentId: "demo-asg-ecr",
  };
}
