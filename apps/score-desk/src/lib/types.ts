export type Level = { score: number; label: string; teacher: string; student: string };
export type Criterion = { id: string; name: string; shortName: string; levels: Level[] };
export type Rubric = {
  id: string; name: string; kind: string; subject: string; gradeBand: string; teks: string;
  blurb: string; studentTitle: string; builtIn: boolean; criteria: Criterion[];
};
export type Student = { id: string; name: string };
export type ClassRoom = { id: string; name: string; grade: string; subject: string; students: Student[] };
export type Window = "practice" | "BOY" | "MOY" | "EOY";
export type Assignment = { id: string; classId: string; rubricId: string; title: string; date: string; window: Window };
export type Score = { id: string; assignmentId: string; studentId: string; criterionScores: Record<string, number>; comment: string };
export type DeskState = {
  classes: ClassRoom[]; assignments: Assignment[]; scores: Score[];
  lastClassId: string | null; lastAssignmentId: string | null;
  /** Teacher-made / duplicated rubrics (builtIn=false). Sample: sessionStorage; unlocked: localStorage. */
  customRubrics?: Rubric[];
};
