"use client";
import { useCallback, useEffect, useState } from "react";
import type { Assignment, DeskState, Window } from "./types";
import { applyRules, rubricById } from "./rubrics";
import { sampleState } from "./sample";
import { emptyState } from "./rubrics";

export type Mode = "sample" | "full";
const KEY = { sample: "t4t-sd-sample-v1", full: "t4t-sd-full-v1" } as const;
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));
export const today = () => new Date().toISOString().slice(0, 10);

/** SAMPLE data lives in sessionStorage (resets per browser session). FULL data lives in localStorage on this device. */
function storeFor(mode: Mode): Storage | null {
  if (typeof window === "undefined") return null;
  return mode === "sample" ? window.sessionStorage : window.localStorage;
}

export function useDesk(mode: Mode | null) {
  const [s, setS] = useState<DeskState | null>(null);
  useEffect(() => {
    if (!mode) return;
    const st = storeFor(mode);
    const raw = st?.getItem(KEY[mode]);
    try { setS(raw ? (JSON.parse(raw) as DeskState) : mode === "sample" ? sampleState() : emptyState()); }
    catch { setS(mode === "sample" ? sampleState() : emptyState()); }
  }, [mode]);
  const update = useCallback((fn: (d: DeskState) => DeskState) => {
    setS((prev) => {
      if (!prev || !mode) return prev;
      const next = fn(prev);
      storeFor(mode)?.setItem(KEY[mode], JSON.stringify(next));
      return next;
    });
  }, [mode]);

  const api = {
    reset: () => update(() => (mode === "sample" ? sampleState() : emptyState())),
    replaceAll: (d: DeskState) => update(() => d),
    addClass: (name: string, grade: string, names: string[]) => {
      const id = uid();
      update((d) => ({ ...d, classes: [...d.classes, { id, name: name.trim() || "My class", grade: grade.trim(), subject: "RLA", students: names.map((n) => ({ id: uid(), name: n })) }], lastClassId: id }));
      return id;
    },
    addStudents: (classId: string, names: string[]) => update((d) => ({ ...d, classes: d.classes.map((c) => c.id !== classId ? c : { ...c, students: [...c.students, ...names.filter((n) => !c.students.some((x) => x.name.toLowerCase() === n.toLowerCase())).map((n) => ({ id: uid(), name: n }))] }) })),
    removeStudent: (classId: string, sid: string) => update((d) => ({ ...d, classes: d.classes.map((c) => c.id !== classId ? c : { ...c, students: c.students.filter((x) => x.id !== sid) }), scores: d.scores.filter((x) => x.studentId !== sid) })),
    renameClass: (classId: string, name: string) => update((d) => ({ ...d, classes: d.classes.map((c) => c.id === classId ? { ...c, name } : c) })),
    deleteClass: (classId: string) => update((d) => {
      const asg = d.assignments.filter((a) => a.classId === classId).map((a) => a.id);
      return { ...d, classes: d.classes.filter((c) => c.id !== classId), assignments: d.assignments.filter((a) => a.classId !== classId), scores: d.scores.filter((x) => !asg.includes(x.assignmentId)), lastClassId: null, lastAssignmentId: null };
    }),
    addAssignment: (a: Omit<Assignment, "id">) => {
      const id = uid();
      update((d) => ({ ...d, assignments: [{ ...a, id }, ...d.assignments], lastClassId: a.classId, lastAssignmentId: id }));
      return id;
    },
    setLast: (classId: string | null, assignmentId: string | null) => update((d) => ({ ...d, lastClassId: classId, lastAssignmentId: assignmentId })),
    setScore: (assignmentId: string, studentId: string, criterionId: string, value: number) => update((d) => {
      const a = d.assignments.find((x) => x.id === assignmentId); const r = rubricById(a?.rubricId);
      const ex = d.scores.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);
      const cs = r ? applyRules(r, { ...(ex?.criterionScores ?? {}), [criterionId]: value }) : { ...(ex?.criterionScores ?? {}), [criterionId]: value };
      if (ex) return { ...d, scores: d.scores.map((x) => x.id === ex.id ? { ...x, criterionScores: cs } : x) };
      return { ...d, scores: [...d.scores, { id: uid(), assignmentId, studentId, criterionScores: cs, comment: "" }] };
    }),
    setComment: (assignmentId: string, studentId: string, comment: string) => update((d) => {
      const ex = d.scores.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);
      if (ex) return { ...d, scores: d.scores.map((x) => x.id === ex.id ? { ...x, comment } : x) };
      return { ...d, scores: [...d.scores, { id: uid(), assignmentId, studentId, criterionScores: {}, comment }] };
    }),
  };
  return { s, api };
}
export type DeskApi = ReturnType<typeof useDesk>["api"];
export type { Window };
