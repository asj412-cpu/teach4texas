"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RUBRICS, TPT_CTA_TEXT, TPT_LISTING_URL, allRubrics, blankCriterion, blankRubric, duplicateRubric, isComplete, maxPoints, rubricById, setCustomRubrics, total } from "@/lib/rubrics";
import { parseCsv, parsePaste } from "@/lib/roster";
import { today, useDesk, type DeskApi, type Mode } from "@/lib/useDesk";
import type { Criterion, DeskState, Rubric, Window } from "@/lib/types";

type Tab = "desk" | "score" | "rubrics" | "classes" | "growth";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "desk", label: "Desk", icon: "🏠" }, { id: "score", label: "Score", icon: "✅" },
  { id: "rubrics", label: "Rubrics", icon: "📋" }, { id: "classes", label: "Classes", icon: "👥" },
  { id: "growth", label: "Growth", icon: "📈" },
];
const GUIDE_KEY = "t4t-sd-guide-seen";
const muted = "text-[#d6e2f3]";
const mutedInk = "text-[#3d4f6b]";

export default function ScoreDesk() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [tab, setTab] = useState<Tab>("desk");
  const [guide, setGuide] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { s, api } = useDesk(mode);
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);
  useLayoutEffect(() => {
    const el = barRef.current; if (!el) { setBarH(0); document.documentElement.style.setProperty("--bar-h", "0px"); return; }
    const upd = () => { setBarH(el.offsetHeight); document.documentElement.style.setProperty("--bar-h", `${el.offsetHeight}px`); };
    const ro = new ResizeObserver(upd); ro.observe(el); upd();
    return () => { ro.disconnect(); document.documentElement.style.setProperty("--bar-h", "0px"); };
  }, [mode, !!s]);

  useEffect(() => {
    fetch("/api/entitlement", { cache: "no-store" }).then((r) => r.json()).then((j) => setMode(j.full ? "full" : "sample")).catch(() => setMode("sample"));
    const h = window.location.hash.slice(1);
    if (h === "unlock") setUnlockOpen(true); else if (TABS.some((t) => t.id === h)) setTab(h as Tab);
    if (!localStorage.getItem(GUIDE_KEY)) setGuide(true);
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); } }, [toast]);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", `#${t}`); window.scrollTo({ top: 0 }); };
  const closeGuide = () => { localStorage.setItem(GUIDE_KEY, "1"); setGuide(false); };

  if (!mode || !s) return <div className="grid min-h-screen place-items-center text-2xl font-bold gs-title">Score Desk</div>;
  const sample = mode === "sample";
  setCustomRubrics(s.customRubrics);

  return (
    <div data-testid="app-root" style={{ paddingBottom: (sample ? barH : 0) + 32 }} className="overflow-x-clip">
      <header className="no-print relative z-30 md:sticky md:top-0 border-b-2 border-[#ffd66b]/40 bg-[#0b1a30]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:py-3">
          <button onClick={() => go("desk")} className="flex items-center gap-3 text-left">
            <span className="grid size-11 place-items-center rounded-xl bg-[#bf5700] text-lg font-black text-white shadow-[0_4px_0_#6b3000]">T4</span>
            <span><span className="block text-xl font-black gs-title">Score Desk</span><span className={`block text-base ${muted}`}>Teach4Texas</span></span>
          </button>
          <span className={`rounded-full px-3 py-1 text-base font-bold ${sample ? "bg-[#ffd66b] text-[#3d2700]" : "bg-[#237a48] text-white"}`} data-testid="mode-badge">
            {sample ? "SAMPLE MODE" : "YOUR DESK"}
          </span>
          <nav className="grid w-full grid-cols-3 gap-1 md:ml-auto md:flex md:w-auto md:flex-wrap" aria-label="Main">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-2 py-2 text-base font-bold md:px-3 ${tab === t.id ? "bg-[#ffd66b] text-[#3d2700]" : "text-white hover:bg-white/10"}`}>
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
            <button onClick={() => setGuide(true)} aria-label="How it works" data-testid="help" className="whitespace-nowrap rounded-lg px-2 py-2 text-base font-bold text-white hover:bg-white/10 md:px-3">❓ <span className="md:hidden">Help</span><span className="hidden md:inline">How it works</span></button>
          </nav>
        </div>
        {sample && (
          <div className="bg-[#ffd66b] px-4 py-2 text-center text-base font-semibold text-[#3d2700]">
            <span className="hidden sm:inline">You&apos;re trying the sample. Changes reset when you close this tab.</span><span className="sm:hidden">Sample — resets when you close this tab.</span>{" "}
            <button className="underline" onClick={() => { api.reset(); setToast("Sample reset"); }}>Reset sample</button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6">
        {tab === "desk" && <DeskTab s={s} sample={sample} go={go} openGuide={() => setGuide(true)} openUnlock={() => setUnlockOpen(true)} api={api} setToast={setToast} />}
        {tab === "score" && <ScoreTab s={s} api={api} go={go} sample={sample} />}
        {tab === "rubrics" && <RubricsTab s={s} api={api} sample={sample} setToast={setToast} />}
        {tab === "classes" && <ClassesTab s={s} api={api} go={go} setToast={setToast} />}
        {tab === "growth" && <GrowthTab s={s} sample={sample} />}
      </main>

      <footer className={`no-print mx-auto mt-10 max-w-6xl px-4 text-base ${muted}`}>
        Scores stay on this device. Use first names or initials if you share a computer. ·{" "}
        <a className="underline" href="https://teach4texas.com/" target="_blank" rel="noreferrer">teach4texas.com</a>
      </footer>

      {sample && (
        <div ref={barRef} className="no-print cta-bar fixed inset-x-0 bottom-0 z-40 px-2 py-2 sm:px-3 sm:py-3" data-testid="tpt-cta-bar">
          <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-center gap-2 sm:gap-3">
            <span className="hidden text-base font-semibold text-white lg:inline">Keep your classes and scores on your own device.</span>
            <a href={TPT_LISTING_URL} target="_blank" rel="noreferrer" className="gs-btn min-w-0 whitespace-nowrap px-2.5 py-2 text-base sm:px-5 sm:py-3 sm:text-lg" data-testid="tpt-cta"><span aria-hidden className="hidden sm:inline">🎁 </span>{TPT_CTA_TEXT}</a>
            <button onClick={() => setUnlockOpen(true)} className="gs-btn2 shrink-0 whitespace-nowrap px-2.5 py-2 text-base sm:px-4 sm:py-3"><span aria-hidden className="hidden sm:inline">🔑 </span><span className="hidden sm:inline">Have a code? </span>Unlock</button>
          </div>
        </div>
      )}

      {guide && <Guide s={s} sample={sample} onClose={closeGuide} go={(t) => { closeGuide(); go(t); }} />}
      {unlockOpen && <Unlock onClose={() => { setUnlockOpen(false); history.replaceState(null, "", "#desk"); }} onDone={() => { setUnlockOpen(false); setMode("full"); setTab("desk"); setGuide(true); }} />}
      {toast && <div role="status" style={{ bottom: "calc(var(--bar-h, 0px) + 16px)" }} data-testid="toast" className="fixed right-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl bg-[#237a48] px-5 py-3 text-lg font-bold text-white shadow-xl gs-rise">{toast}</div>}
    </div>
  );
}

function H1({ kicker, title }: { kicker: string; title: string }) {
  return <div className="mb-5 gs-rise"><p className="text-base font-bold tracking-widest text-[#ffd66b]">{kicker}</p><h1 className="text-4xl font-black text-white">{title}</h1></div>;
}

/* ───────────── Desk ───────────── */
function DeskTab({ s, sample, go, openGuide, openUnlock, api, setToast }: { s: DeskState; sample: boolean; go: (t: Tab) => void; openGuide: () => void; openUnlock: () => void; api: DeskApi; setToast: (m: string) => void }) {
  const a = s.assignments.find((x) => x.id === s.lastAssignmentId) ?? s.assignments[0];
  const c = s.classes.find((x) => x.id === a?.classId);
  const r = rubricById(a?.rubricId);
  const scored = a && r && c ? c.students.filter((st) => isComplete(r, s.scores.find((x) => x.assignmentId === a.id && x.studentId === st.id))).length : 0;
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <section className="gs-panel mb-6 p-6 text-center gs-rise">
        <p className="text-base font-bold tracking-widest text-[#ffd66b]">TEXAS TEACHERS · STAAR · RACE</p>
        <h1 className="mt-2 text-5xl font-black gs-title">Score the stack. Keep the evidence.</h1>
        <p className={`mx-auto mt-3 max-w-2xl text-lg ${muted}`}>One-tap STAAR ECR and SCR scoring, RACE checklists, and a BOY/MOY/EOY growth snapshot. Nothing is uploaded.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button className="gs-btn px-6 py-3 text-xl" onClick={() => (s.classes.length ? go("score") : go("classes"))}>▶ {s.classes.length ? "Start scoring" : "Add your class"}</button>
          <button className="gs-btn2 px-5 py-3 text-lg" onClick={openGuide}>❓ 3-step guide</button>
          {sample && <button className="gs-btn2 px-5 py-3 text-lg" onClick={openUnlock}>🔑 Unlock with code</button>}
        </div>
      </section>

      {a && c && r ? (
        <section className="gs-card mb-6 p-5 gs-rise">
          <p className={`text-base font-bold ${mutedInk}`}>CONTINUE SCORING</p>
          <h2 className="text-2xl font-black">{a.title}</h2>
          <p className={`text-lg ${mutedInk}`}>{c.name} · {r.name} · {a.window}</p>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-lg">
            <span><b className="text-3xl">{scored}/{c.students.length}</b> scored</span>
            <span><b className="text-3xl">{maxPoints(r)}</b> max points</span>
            <button className="gs-btn2-dark ml-auto px-5 py-3" onClick={() => { api.setLast(c.id, a.id); go("score"); }}>Open this assignment →</button>
          </div>
        </section>
      ) : (
        <section className="gs-card mb-6 p-6 text-center gs-rise">
          <p className="text-2xl font-black">Add your students to start scoring</p>
          <p className={`mt-2 text-lg ${mutedInk}`}>Paste a list of names or import a CSV — it takes about 30 seconds.</p>
          <button className="gs-btn mt-4 px-6 py-3 text-lg" onClick={() => go("classes")}>👥 Add a class</button>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { t: "score" as Tab, h: "Score a stack", b: "One-tap chips. ECR auto-zeros Conventions when development is 0." },
          { t: "rubrics" as Tab, h: "Rubric library", b: "STAAR ECR/SCR, RACE, and a 4-level rubric — in teacher language or as a student checklist." },
          { t: "growth" as Tab, h: "Growth snapshot", b: "BOY / MOY / EOY on the same rubric. Classroom evidence — not an official TIA calculation." },
        ].map((x) => (
          <button key={x.t} onClick={() => go(x.t)} className="gs-card p-5 text-left hover:-translate-y-1 transition-transform">
            <h3 className="text-xl font-black">{x.h}</h3><p className={`mt-1 text-base ${mutedInk}`}>{x.b}</p>
          </button>
        ))}
      </div>

      {!sample && (
        <section className="gs-panel mt-6 p-5">
          <h2 className="text-xl font-black text-white">Back up your desk</h2>
          <p className={`text-base ${muted}`}>Your data lives in this browser. Download a backup before clearing browser data or switching computers.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="gs-btn2 px-4 py-2" onClick={() => download(`score-desk-backup-${today()}.json`, JSON.stringify(s, null, 2), "application/json")}>⬇ Download backup</button>
            <button className="gs-btn2 px-4 py-2" onClick={() => fileRef.current?.click()}>⬆ Restore backup</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const d = JSON.parse(await f.text()) as DeskState; if (!Array.isArray(d.classes)) throw new Error(); api.replaceAll(d); setToast("Backup restored"); }
              catch { setToast("That file isn't a Score Desk backup"); }
              e.target.value = "";
            }} />
          </div>
        </section>
      )}
    </div>
  );
}

/* ───────────── Score ───────────── */
function ScoreTab({ s, api, go, sample }: { s: DeskState; api: DeskApi; go: (t: Tab) => void; sample: boolean }) {
  const classId = s.lastClassId && s.classes.some((c) => c.id === s.lastClassId) ? s.lastClassId : s.classes[0]?.id ?? null;
  const cls = s.classes.find((c) => c.id === classId);
  const asgs = s.assignments.filter((a) => a.classId === classId);
  const a = asgs.find((x) => x.id === s.lastAssignmentId) ?? asgs[0];
  const r = rubricById(a?.rubricId);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"teacher" | "student">("teacher");
  const [focus, setFocus] = useState<{ cid: string; v: number } | null>(null);
  const legendRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (legendRef.current && window.innerWidth >= 768) legendRef.current.open = true; }, [a?.id]);

  if (!cls) return <><H1 kicker="SCORING" title="Score a stack" /><EmptyRoster go={go} /></>;
  if (!cls.students.length) return <><H1 kicker="SCORING" title="Score a stack" /><EmptyRoster go={go} name={cls.name} /></>;
  const showCreate = creating || !a;
  const scores = a ? s.scores.filter((x) => x.assignmentId === a.id) : [];
  const done = r ? cls.students.filter((st) => isComplete(r, scores.find((x) => x.studentId === st.id))).length : 0;
  const totals = r ? cls.students.map((st) => total(r, scores.find((x) => x.studentId === st.id))).filter((x): x is number => x !== null) : [];
  const avg = totals.length ? (totals.reduce((p, q) => p + q, 0) / totals.length).toFixed(1) : "—";
  const focusLevel = focus && r ? r.criteria.find((c) => c.id === focus.cid)?.levels.find((l) => l.score === focus.v) : undefined;

  return (
    <div>
      <H1 kicker="SCORING" title="Score a stack" />
      <div className="gs-panel mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-0 max-w-full text-base font-bold text-white">Class<br />
          <select value={classId ?? ""} onChange={(e) => api.setLast(e.target.value, s.assignments.find((x) => x.classId === e.target.value)?.id ?? null)}>
            {s.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        {asgs.length > 0 && !creating && <label className="min-w-0 max-w-full text-base font-bold text-white">Assignment<br />
          <select value={a?.id ?? ""} onChange={(e) => api.setLast(classId, e.target.value)}>
            {asgs.map((x) => <option key={x.id} value={x.id}>{x.title} ({x.window})</option>)}
          </select></label>}
        {!showCreate && <button className="gs-btn2 px-4 py-2" onClick={() => setCreating(true)}>＋ New assignment</button>}
        {a && r && !showCreate && (sample
          ? <span className={`text-base ${muted}`}>CSV export is available after you unlock.</span>
          : <button className="gs-btn2 px-4 py-2" onClick={() => download(`${a.title}.csv`, toCsv(s, a.id), "text/csv")}>⬇ CSV</button>)}
      </div>

      {showCreate ? <NewAssignment classId={cls.id} api={api} onDone={() => setCreating(false)} canCancel={!!a} /> : a && r && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            {[["SCORED", `${done}/${cls.students.length}`], ["CLASS AVG", avg], ["MAX", String(maxPoints(r))]].map(([k, v]) => (
              <div key={k} className="gs-card p-3 text-center"><p className={`text-base font-bold ${mutedInk}`}>{k}</p><p className="text-2xl font-black sm:text-3xl">{v}</p></div>
            ))}
          </div>
          <div className="gs-panel mb-3 flex flex-wrap items-center gap-3 p-3">
            <span className="text-base font-bold text-white">{r.name}</span>
            <ViewToggle view={view} setView={setView} />
          </div>
          {r.kind === "staar-ecr" && <p className="mb-3 rounded-xl bg-[#ffd66b] px-4 py-2 text-base font-semibold text-[#3d2700]">STAAR ECR rule: if Organization &amp; Development is 0, Conventions is locked to 0.</p>}
          <details ref={legendRef} className="gs-card mb-3 p-4" data-testid="criteria-legend">
            <summary className="cursor-pointer text-lg font-black">{view === "teacher" ? "What each score means (teacher language)" : r.studentTitle + " (student checklist)"}</summary>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {r.criteria.map((c) => (
                <div key={c.id}>
                  <p className="text-base font-black">{c.name}</p>
                  <ul className="mt-1 space-y-1">
                    {[...c.levels].sort((x, y) => y.score - x.score).map((l, li) => (
                      <li key={li} className="flex gap-2 text-base" data-testid={`legend-${c.id}-${l.score}`}>
                        <span className="min-w-10 shrink-0 rounded-md bg-[#1b365d] px-2 text-center font-black text-white">{view === "student" ? "☐ " : ""}{l.label}</span>
                        <span>{view === "teacher" ? l.teacher : l.student}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
          <ul className="gs-card divide-y divide-[#1b365d]/10 p-2" data-testid="score-list">
            {cls.students.map((st) => {
              const sc = scores.find((x) => x.studentId === st.id);
              const t = total(r, sc);
              const orgZero = r.kind === "staar-ecr" && sc?.criterionScores[r.criteria[0].id] === 0;
              return (
                <li key={st.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-2" data-testid={`row-${st.name}`}>
                  <div className="flex w-full min-w-0 items-center justify-between gap-2 md:w-44">
                    <span className="truncate text-lg font-bold">{st.name}{!isComplete(r, sc) && <span className={`ml-2 text-base font-normal ${mutedInk}`}>· open</span>}</span>
                    <span className="text-2xl font-black md:hidden" aria-hidden>{t ?? "—"}</span>
                  </div>
                  {r.criteria.map((c, ci) => (
                    <div key={c.id} className="min-w-0">
                      <p className={`text-base font-bold ${mutedInk}`}>{c.shortName}</p>
                      <div className="flex flex-wrap gap-1">
                        {[...c.levels].sort((x, y) => x.score - y.score).map((l, li) => (
                          <button key={li} className="chip px-2" aria-pressed={sc?.criterionScores[c.id] === l.score}
                            disabled={ci === 1 && orgZero && l.score !== 0}
                            aria-label={`${st.name} ${c.name} ${l.label}`} title={view === "teacher" ? l.teacher : l.student}
                            onClick={() => { api.setScore(a.id, st.id, c.id, l.score); setFocus({ cid: c.id, v: l.score }); }}>{l.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="hidden text-center md:block"><p className={`text-base font-bold ${mutedInk}`}>Total</p><p className="text-2xl font-black" data-testid={`total-${st.name}`}>{t ?? "—"}</p></div>
                  <label className="no-print block w-full min-w-0"><span className={`text-base font-bold ${mutedInk}`}>Notes for {st.name}</span>
                    <NoteBox testid={`note-${st.name}`} value={sc?.comment ?? ""} onChange={(v) => api.setComment(a.id, st.id, v)} /></label>
                  {sc?.comment && <p className="print-only w-full whitespace-pre-wrap break-words text-base" data-testid={`note-print-${st.name}`}><b>Notes:</b> {sc.comment}</p>}
                </li>
              );
            })}
          </ul>
          {focusLevel && <p className="gs-panel mt-3 p-3 text-lg text-white"><b className="text-[#ffd66b]">{focusLevel.label}:</b> {view === "teacher" ? focusLevel.teacher : focusLevel.student}</p>}
        </>
      )}
    </div>
  );
}

/** Multi-line per-student note: starts at 5 rows, grows with content (no inner scrollbar), full width so it works at 390px. */
function NoteBox({ value, onChange, testid }: { value: string; onChange: (v: string) => void; testid: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.max(el.scrollHeight + 4, 0)}px`; }, [value]);
  return <textarea ref={ref} rows={5} data-testid={testid} className="mt-1 block w-full resize-y overflow-hidden text-base leading-snug" placeholder="Notes (saved with this score)" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function NewAssignment({ classId, api, onDone, canCancel }: { classId: string; api: DeskApi; onDone: () => void; canCancel: boolean }) {
  const [rid, setRid] = useState(RUBRICS[0].id);
  const [title, setTitle] = useState("");
  const [win, setWin] = useState<Window>("practice");
  return (
    <section className="gs-panel p-5 gs-rise" data-testid="new-assignment">
      <h2 className="text-2xl font-black text-white">Pick a rubric</h2>
      <p className={`text-base ${muted}`}>Choose how you&apos;ll score this assignment.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {allRubrics().map((r) => (
          <button key={r.id} onClick={() => setRid(r.id)} aria-pressed={rid === r.id} data-testid={`pick-${r.id}`}
            className={`gs-card p-4 text-left ${rid === r.id ? "ring-4 ring-[#ffd66b]" : ""}`}>
            <span className="block text-lg font-black">{rid === r.id ? "✅ " : ""}{r.name}</span>
            <span className={`block text-base ${mutedInk}`}>{r.builtIn ? "" : "✏️ My rubric · "}{r.gradeBand} · {r.subject} · {maxPoints(r)} pts</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-base font-bold text-white">Assignment name (optional)<br /><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${rubricById(rid)?.name.split(" —")[0]} — ${today()}`} /></label>
        <label className="text-base font-bold text-white">Window<br /><select value={win} onChange={(e) => setWin(e.target.value as Window)}>{["practice", "BOY", "MOY", "EOY"].map((w) => <option key={w}>{w}</option>)}</select></label>
        <button className="gs-btn px-5 py-3 text-lg" data-testid="start-scoring" onClick={() => { api.addAssignment({ classId, rubricId: rid, title: title || `${rubricById(rid)?.name.split(" —")[0]} — ${today()}`, date: today(), window: win }); onDone(); }}>Start scoring →</button>
        {canCancel && <button className="gs-btn2 px-4 py-3" onClick={onDone}>Cancel</button>}
      </div>
    </section>
  );
}

function ViewToggle({ view, setView }: { view: "teacher" | "student"; setView: (v: "teacher" | "student") => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" className="flex rounded-xl bg-white p-1">
        {(["teacher", "student"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`rounded-lg px-3 py-2 text-base font-bold ${view === v ? "bg-[#1b365d] text-white" : "text-[#1b365d]"}`}>
            {v === "teacher" ? "Teacher language" : "Student checklist"}
          </button>
        ))}
      </div>
      <p className={`text-base ${muted}`} data-testid="view-helper">
        {view === "teacher"
          ? "Teacher language shows the rubric in teacher terms — what you look for when you score."
          : "Student checklist shows the kid-friendly self-check version students use before they turn work in."}
      </p>
    </div>
  );
}

/* ───────────── Rubrics ───────────── */
function RubricsTab({ s, api, sample, setToast }: { s: DeskState; api: DeskApi; sample: boolean; setToast: (m: string) => void }) {
  const list = allRubrics();
  const [rid, setRid] = useState(list[0].id);
  const [view, setView] = useState<"teacher" | "student">("teacher");
  const [draft, setDraft] = useState<Rubric | null>(null);
  const r = rubricById(rid) ?? list[0];
  const custom = s.customRubrics ?? [];
  const startEdit = (x: Rubric) => { setDraft(structuredClone(x)); setRid(x.id); };
  const dup = () => { const c = duplicateRubric(r); api.saveRubric(c); setRid(c.id); setDraft(structuredClone(c)); setToast("Copy made — edit it below"); };
  const createNew = () => { const c = blankRubric(); api.saveRubric(c); setRid(c.id); setDraft(structuredClone(c)); setToast("New rubric started"); };
  const shown = draft && draft.id === r.id ? draft : r;
  return (
    <div>
      <H1 kicker="LIBRARY" title="Rubrics" />
      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="no-print flex min-w-0 flex-col gap-2">
          <button className="gs-btn px-4 py-3 text-lg" onClick={createNew} data-testid="new-rubric">＋ New rubric</button>
          <p className="mt-1 text-base font-bold tracking-widest text-[#ffd66b]">STAAR &amp; CLASSROOM</p>
          {RUBRICS.map((x) => (
            <button key={x.id} onClick={() => { setRid(x.id); setDraft(null); }} className={`gs-card p-3 text-left ${rid === x.id ? "ring-4 ring-[#ffd66b]" : ""}`}>
              <span className="block text-base font-black">{x.name}</span>
              <span className={`block text-base ${mutedInk}`}>🔒 {x.gradeBand} · {x.subject} · {maxPoints(x)} pts</span>
            </button>
          ))}
          <p className="mt-2 text-base font-bold tracking-widest text-[#ffd66b]">MY RUBRICS</p>
          {custom.length === 0 && <p className={`text-base ${muted}`}>None yet. Tap ＋ New rubric, or open a STAAR rubric and tap Duplicate.</p>}
          {custom.map((x) => (
            <button key={x.id} data-testid={`my-rubric-${x.name}`} onClick={() => { setRid(x.id); setDraft(null); }} className={`gs-card p-3 text-left ${rid === x.id ? "ring-4 ring-[#ffd66b]" : ""}`}>
              <span className="block break-words text-base font-black">{x.name}</span>
              <span className={`block text-base ${mutedInk}`}>✏️ {x.gradeBand} · {x.subject} · {maxPoints(x)} pts</span>
            </button>
          ))}
          {sample && <p className={`text-base ${muted}`}>In the sample, your rubrics reset when you close this tab. Unlock to keep them on this device.</p>}
        </div>
        <div className="min-w-0">
          <div className="no-print gs-panel mb-3 flex flex-wrap items-center gap-3 p-3">
            <ViewToggle view={view} setView={setView} />
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button className="gs-btn2 px-4 py-2" onClick={() => window.print()}>🖨 Print</button>
              <button className="gs-btn2 px-4 py-2" onClick={dup} data-testid="duplicate"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block align-[-3px]"><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>Duplicate</button>
              {!r.builtIn && !draft && <button className="gs-btn2 px-4 py-2" data-testid="edit-rubric" onClick={() => startEdit(r)}>✏️ Edit</button>}
              {!r.builtIn && <button className="rounded-lg px-3 py-2 text-base font-bold text-white underline" data-testid="delete-rubric" onClick={() => {
                const used = s.assignments.filter((a) => a.rubricId === r.id).length;
                if (confirm(used ? `Delete "${r.name}" and its ${used} assignment(s) and scores?` : `Delete "${r.name}"?`)) { api.deleteRubric(r.id); setDraft(null); setRid(RUBRICS[0].id); setToast("Rubric deleted"); }
              }}>Delete</button>}
            </div>
          </div>
          {r.builtIn && <p className="no-print mb-3 rounded-xl bg-[#ffd66b] px-4 py-2 text-base font-semibold text-[#3d2700]">🔒 Built-in STAAR language stays locked so it does not drift. Duplicate it to make a classroom version.</p>}
          {draft && draft.id === r.id && <RubricEditor draft={draft} setDraft={setDraft} onSave={(clean) => { api.saveRubric(clean); setDraft(null); setToast("Rubric saved"); }} onCancel={() => setDraft(null)} />}
          <RubricView r={shown} view={view} />
        </div>
      </div>
    </div>
  );
}

function RubricView({ r, view }: { r: Rubric; view: "teacher" | "student" }) {
  return (
    <article className="gs-card p-4 sm:p-6" data-testid="rubric-view">
      <p className={`text-base font-bold ${mutedInk}`}>TEACH4TEXAS SCORE DESK{r.builtIn ? "" : " · MY RUBRIC"}</p>
      <h2 className="break-words text-2xl font-black sm:text-3xl">{view === "teacher" ? r.name : r.studentTitle}</h2>
      {view === "teacher" && <><p className={`text-base ${mutedInk}`}>{r.gradeBand} · {r.subject}{r.teks ? ` · ${r.teks}` : ""} · {maxPoints(r)} points</p>{r.blurb && <p className="mt-2 text-lg">{r.blurb}</p>}</>}
      {r.criteria.map((c) => (
        <section key={c.id} className="mt-5">
          <h3 className="break-words text-xl font-black">{c.name}</h3>
          <ul className="mt-2 space-y-2">
            {[...c.levels].map((l, i) => ({ l, i })).sort((x, y) => y.l.score - x.l.score).map(({ l, i }) => (
              <li key={i} className="flex gap-3 rounded-xl bg-[#eef3fa] p-3">
                <span className="grid min-w-12 shrink-0 place-items-center rounded-lg bg-[#1b365d] px-2 text-lg font-black text-white">{view === "student" ? "☐ " : ""}{l.label}</span>
                <span className="min-w-0 break-words text-lg">{view === "teacher" ? l.teacher : l.student}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

/** Port of the original Score Desk rubric editor: name, student title, grade band, subject, TEKS, notes; per criterion name/short name and each level's score + Teacher language + Student checklist text; add/remove criterion; Save rubric. */
function validateRubric(r: Rubric) {
  const errs: Record<string, string> = {};
  if (!r.name.trim()) errs.name = "Give your rubric a name";
  r.criteria.forEach((c, ci) => {
    if (!c.name.trim()) errs[`c${ci}`] = "Give this criterion a name";
    const seen = new Set<number>();
    c.levels.forEach((l, li) => {
      if (!Number.isFinite(l.score)) errs[`c${ci}l${li}`] = "Enter a score";
      else if (l.score < 0 || !Number.isInteger(l.score)) errs[`c${ci}l${li}`] = "Use a whole number, 0 or more";
      else if (seen.has(l.score)) errs[`c${ci}l${li}`] = "Each score in a criterion must be different";
      seen.add(l.score);
    });
  });
  return errs;
}

function FieldErr({ id, msg }: { id: string; msg?: string }) {
  return msg ? <span id={id} role="alert" data-testid={`err-${id}`} className="mt-1 block rounded-lg bg-[#fde8e6] px-2 py-1 text-base font-semibold text-[#8a1c12]">⚠ {msg}</span> : null;
}

function RubricEditor({ draft, setDraft, onSave, onCancel }: { draft: Rubric; setDraft: (r: Rubric) => void; onSave: (clean: Rubric) => void; onCancel: () => void }) {
  const [tried, setTried] = useState(false);
  const errs = tried ? validateRubric(draft) : {};
  const save = () => {
    const e = validateRubric(draft);
    if (Object.keys(e).length) {
      setTried(true);
      const first = e.name ? "ed-name" : Object.keys(e)[0].includes("l") ? `ed-${Object.keys(e)[0].replace(/l/, "-l")}-score` : `ed-${Object.keys(e)[0]}-name`;
      requestAnimationFrame(() => (document.querySelector(`[data-testid="${first}"]`) as HTMLElement | null)?.focus());
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), studentTitle: draft.studentTitle.trim() || draft.name.trim(), criteria: draft.criteria.map((c) => ({ ...c, name: c.name.trim(), shortName: c.shortName.trim() || c.name.trim() })) });
  };
  const set = (p: Partial<Rubric>) => setDraft({ ...draft, ...p });
  const setC = (id: string, p: Partial<Criterion>) => setDraft({ ...draft, criteria: draft.criteria.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const field = "block min-w-0 text-base font-bold";
  const inp = "mt-1 w-full";
  return (
    <section className="gs-card mb-4 p-4 sm:p-5 gs-rise" data-testid="rubric-editor">
      <h2 className="text-2xl font-black">Rubric builder</h2>
      <p className={`text-base ${mutedInk}`}>Teacher language is what you look for when you score. Student checklist is the kid-friendly self-check students use.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={field}>Name<input data-testid="ed-name" aria-invalid={!!errs.name} aria-describedby={errs.name ? "name" : undefined} className={inp} value={draft.name} onChange={(e) => set({ name: e.target.value })} /><FieldErr id="name" msg={errs.name} /></label>
        <label className={field}>Student title<input className={inp} value={draft.studentTitle} onChange={(e) => set({ studentTitle: e.target.value })} /></label>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={field}>Grade band<input className={inp} value={draft.gradeBand} onChange={(e) => set({ gradeBand: e.target.value })} /></label>
        <label className={field}>Subject<input className={inp} value={draft.subject} onChange={(e) => set({ subject: e.target.value })} /></label>
        <label className={field}>TEKS<input className={inp} value={draft.teks} placeholder="4.11.B" onChange={(e) => set({ teks: e.target.value })} /></label>
      </div>
      <label className={`${field} mt-3`}>Notes<textarea className={inp} rows={2} value={draft.blurb} onChange={(e) => set({ blurb: e.target.value })} /></label>
      <p className="mt-2 text-lg font-black">Max score {Number.isFinite(maxPoints(draft)) ? maxPoints(draft) : "—"}</p>
      {draft.criteria.map((c, ci) => (
        <div key={c.id} className="mt-4 rounded-2xl border-2 border-[#1b365d]/20 bg-[#f6f9fd] p-3 sm:p-4" data-testid={`ed-criterion-${ci}`}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <label className={field}>Criterion<input data-testid={`ed-c${ci}-name`} aria-invalid={!!errs[`c${ci}`]} className={inp} value={c.name} onChange={(e) => setC(c.id, { name: e.target.value })} /><FieldErr id={`c${ci}`} msg={errs[`c${ci}`]} /></label>
            <label className={field}>Short name<input className={inp} value={c.shortName} onChange={(e) => setC(c.id, { shortName: e.target.value })} /></label>
          </div>
          <div className="mt-3 space-y-3">
            {c.levels.map((l, li) => {
              const upd = (p: Partial<typeof l>) => setC(c.id, { levels: c.levels.map((x, k) => (k === li ? { ...x, ...p } : x)) });
              return (
                <div key={li} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
                  <label className={field}>Score<input type="number" min={0} step={1} inputMode="numeric" data-testid={`ed-c${ci}-l${li}-score`} aria-invalid={!!errs[`c${ci}l${li}`]} className={inp} value={Number.isFinite(l.score) ? l.score : ""} onChange={(e) => { const n = e.target.value.trim() === "" ? NaN : Number(e.target.value); upd({ score: n, label: /^-?\d*$/.test(l.label) ? (Number.isFinite(n) ? String(n) : "") : l.label }); }} /><FieldErr id={`c${ci}l${li}`} msg={errs[`c${ci}l${li}`]} /></label>
                  <label className={field}>Teacher language<textarea data-testid={`ed-c${ci}-l${li}-teacher`} className={inp} rows={2} value={l.teacher} onChange={(e) => upd({ teacher: e.target.value })} /></label>
                  <label className={field}>Student checklist<textarea data-testid={`ed-c${ci}-l${li}-student`} className={inp} rows={2} value={l.student} onChange={(e) => upd({ student: e.target.value })} /></label>
                </div>
              );
            })}
          </div>
          {draft.criteria.length > 1 && <button className="mt-2 rounded-lg px-2 py-2 text-base font-bold text-[#8a1c12] underline" onClick={() => setDraft({ ...draft, criteria: draft.criteria.filter((x) => x.id !== c.id) })}>Remove criterion</button>}
        </div>
      ))}
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="gs-btn2-dark px-4 py-3" data-testid="ed-add-criterion" onClick={() => setDraft({ ...draft, criteria: [...draft.criteria, blankCriterion(draft.criteria.length + 1)] })}>＋ Add criterion</button>
        <button className="gs-btn px-5 py-3 text-lg" data-testid="ed-save" onClick={save}>💾 Save rubric</button>
        <button className="gs-btn2 px-4 py-3" onClick={onCancel}>Cancel</button>
      </div>
      <p className={`mt-3 text-base ${mutedInk}`}>Preview below updates as you type.</p>
    </section>
  );
}

/* ───────────── Classes ───────────── */
function EmptyRoster({ go, name }: { go: (t: Tab) => void; name?: string }) {
  return (
    <section className="gs-card p-8 text-center" data-testid="empty-state">
      <p className="text-5xl" aria-hidden>👥</p>
      <h2 className="mt-2 text-3xl font-black">Add your students to start scoring</h2>
      <p className={`mt-2 text-lg ${mutedInk}`}>{name ? `${name} has no students yet. ` : ""}Paste a list of names or import a CSV.</p>
      <button className="gs-btn mt-4 px-6 py-3 text-lg" onClick={() => go("classes")}>👥 Go to Classes</button>
    </section>
  );
}

function RosterInput({ onNames, cta }: { onNames: (n: string[]) => void; cta: string }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = parsePaste(text);
  return (
    <div>
      <label className="block text-base font-bold">Paste student names — one per line
        <textarea data-testid="roster-paste" rows={6} className="mt-1 w-full" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} placeholder={"Example:\nFirst student\nSecond student"} />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button className="gs-btn2-dark px-4 py-2" onClick={() => fileRef.current?.click()}>📄 Import CSV</button>
        <input ref={fileRef} data-testid="roster-csv" type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const res = parseCsv(await f.text(), f.name);
          if (res.ok) { setText(res.names.join("\n")); setErr(null); } else setErr(res.error);
          e.target.value = "";
        }} />
        <span className={`text-base ${mutedInk}`}>{preview.length} student{preview.length === 1 ? "" : "s"} ready</span>
      </div>
      {err && <p role="alert" data-testid="csv-error" className="mt-2 rounded-xl bg-[#fde8e6] p-3 text-base font-semibold text-[#8a1c12]">⚠ {err}</p>}
      <button className="gs-btn mt-3 px-5 py-3 text-lg disabled:opacity-60" data-testid="roster-save" disabled={!preview.length} onClick={() => { onNames(preview); setText(""); }}>{cta}</button>
    </div>
  );
}

function ClassesTab({ s, api, go, setToast }: { s: DeskState; api: DeskApi; go: (t: Tab) => void; setToast: (m: string) => void }) {
  const [sel, setSel] = useState<string | "new">(s.classes.length ? (s.lastClassId ?? s.classes[0].id) : "new");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const cls = s.classes.find((c) => c.id === sel);
  return (
    <div>
      <H1 kicker="ROSTER" title="Classes" />
      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          {s.classes.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`gs-card p-3 text-left ${sel === c.id ? "ring-4 ring-[#ffd66b]" : ""}`}>
              <span className="block text-lg font-black">{c.name}</span><span className={`text-base ${mutedInk}`}>{c.students.length} students</span>
            </button>
          ))}
          <button className="gs-btn px-4 py-3" data-testid="new-class" onClick={() => setSel("new")}>＋ New class</button>
        </div>
        <div>
          {sel === "new" || !cls ? (
            <section className="gs-card p-5 gs-rise">
              {!s.classes.length && <p className="mb-3 rounded-xl bg-[#ffd66b] p-3 text-lg font-bold text-[#3d2700]" data-testid="empty-state">Add your students to start scoring</p>}
              <h2 className="text-2xl font-black">Make a class</h2>
              <div className="my-3 flex flex-wrap gap-3">
                <label className="text-base font-bold">Class name<br /><input data-testid="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="4th RLA — Period 1" /></label>
                <label className="text-base font-bold">Grade<br /><input className="w-24" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="4" /></label>
              </div>
              <RosterInput cta="Save class →" onNames={(n) => { const id = api.addClass(name, grade, n); setSel(id); setName(""); setGrade(""); setToast(`Class saved with ${n.length} students`); }} />
            </section>
          ) : (
            <section className="gs-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <input aria-label="Class name" className="w-full min-w-0 text-xl font-black sm:w-auto" value={cls.name} onChange={(e) => api.renameClass(cls.id, e.target.value)} />
                <span className={`text-lg ${mutedInk}`}>{cls.students.length} students</span>
                {cls.students.length > 0 && <button className="gs-btn ml-auto px-5 py-3 text-lg" data-testid="score-this-class" onClick={() => { api.setLast(cls.id, s.assignments.find((a) => a.classId === cls.id)?.id ?? null); go("score"); }}>Next: pick a rubric &amp; score →</button>}
              </div>
              {cls.students.length === 0 ? <p className="mt-4 rounded-xl bg-[#ffd66b] p-4 text-xl font-black text-[#3d2700]" data-testid="empty-state">Add your students to start scoring</p> : (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {cls.students.map((st) => (
                    <li key={st.id} className="flex items-center gap-1 rounded-full bg-[#eef3fa] py-1 pl-3 pr-1 text-base font-bold">
                      {st.name}<button aria-label={`Remove ${st.name}`} className="grid size-8 place-items-center rounded-full hover:bg-[#fde8e6]" onClick={() => api.removeStudent(cls.id, st.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 border-t-2 border-[#1b365d]/10 pt-4">
                <h3 className="mb-2 text-xl font-black">Add students</h3>
                <RosterInput cta="Add to class" onNames={(n) => { api.addStudents(cls.id, n); setToast(`Added ${n.length} students`); }} />
              </div>
              <button className="mt-5 rounded-lg px-3 py-2 text-base font-bold text-[#8a1c12] underline" onClick={() => { if (confirm(`Delete ${cls.name} and its scores?`)) { api.deleteClass(cls.id); setSel("new"); } }}>Delete class</button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Growth ───────────── */
function GrowthTab({ s, sample }: { s: DeskState; sample: boolean }) {
  const [cid, setCid] = useState(s.lastClassId ?? s.classes[0]?.id ?? "");
  const cls = s.classes.find((c) => c.id === cid);
  const rubricIds = useMemo(() => [...new Set(s.assignments.filter((a) => a.classId === cid).map((a) => a.rubricId))], [s, cid]);
  const [rid, setRid] = useState(rubricIds[0] ?? RUBRICS[0].id);
  const r = rubricById(rubricIds.includes(rid) ? rid : rubricIds[0]) ?? RUBRICS[0];
  const win = (w: Window) => s.assignments.filter((a) => a.classId === cid && a.rubricId === r.id && a.window === w).sort((x, y) => y.date.localeCompare(x.date))[0];
  const W: Window[] = ["BOY", "MOY", "EOY"];
  const rows = cls?.students.map((st) => {
    const v = W.map((w) => { const a = win(w); return a ? total(r, s.scores.find((x) => x.assignmentId === a.id && x.studentId === st.id)) : null; });
    const first = v.find((x) => x !== null), last = [...v].reverse().find((x) => x !== null);
    return { st, v, g: first != null && last != null ? last - first : null, pct: last != null ? Math.round((100 * last) / maxPoints(r)) : null };
  }) ?? [];
  if (!cls) return <><H1 kicker="TIA EVIDENCE" title="Growth snapshot" /><p className="gs-card p-6 text-xl font-black">Add your students to start scoring</p></>;
  return (
    <div>
      <H1 kicker="TIA EVIDENCE" title="Growth snapshot" />
      <p className={`mb-3 text-base ${muted}`}>Classroom work product only — not an official TIA calculator. Tag assignments BOY, MOY, or EOY when you create them.</p>
      <div className="no-print gs-panel mb-3 flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-0 max-w-full text-base font-bold text-white">Class<br /><select value={cid} onChange={(e) => setCid(e.target.value)}>{s.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="min-w-0 max-w-full text-base font-bold text-white">Rubric<br /><select value={r.id} onChange={(e) => setRid(e.target.value)}>{(rubricIds.length ? rubricIds : [RUBRICS[0].id]).map((id) => <option key={id} value={id}>{rubricById(id)?.name}</option>)}</select></label>
        {!sample && <button className="gs-btn2 px-4 py-2" onClick={() => window.print()}>🖨 Print</button>}
      </div>
      <div className="gs-card overflow-x-auto p-3">
        <table className="w-full text-left text-lg">
          <thead><tr className="border-b-2 border-[#1b365d]/20"><th className="p-2">Student</th>{W.map((w) => <th key={w} className="p-2">{w}</th>)}<th className="p-2">Growth</th><th className="p-2">% of max</th></tr></thead>
          <tbody>{rows.map(({ st, v, g, pct }) => (
            <tr key={st.id} className="border-b border-[#1b365d]/10"><td className="p-2 font-bold">{st.name}</td>{v.map((x, i) => <td key={i} className="p-2">{x ?? "—"}</td>)}
              <td className={`p-2 font-black ${g != null && g > 0 ? "text-[#1f6f3a]" : ""}`}>{g == null ? "—" : g > 0 ? `+${g}` : g}</td><td className="p-2">{pct == null ? "—" : `${pct}%`}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────── First-run guide ───────────── */
function Guide({ s, sample, onClose, go }: { s: DeskState; sample: boolean; onClose: () => void; go: (t: Tab) => void }) {
  const hasClass = s.classes.some((c) => c.students.length > 0);
  const hasAsg = s.assignments.length > 0;
  const hasScore = s.scores.some((x) => Object.keys(x.criterionScores).length > 0);
  const steps = [
    { n: 1, t: "Make a class", b: "Tap ＋ New class, name it, paste your student names (or import a CSV), and tap Save class.", tab: "classes" as Tab, done: hasClass },
    { n: 2, t: "Pick a rubric", b: "Tap “Next: pick a rubric & score”, choose STAAR ECR, SCR, RACE, or 4-level, then tap Start scoring.", tab: "score" as Tab, done: hasAsg },
    { n: 3, t: "Score", b: "Tap a score chip under each part of the rubric. The total updates instantly.", tab: "score" as Tab, done: hasScore },
  ];
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guide-title" className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4" data-testid="guide">
      <div className="gs-panel my-auto w-full max-w-2xl p-4 gs-rise sm:p-6">
        <h2 id="guide-title" className="text-2xl font-black gs-title sm:text-3xl">Score your first student in 3 steps</h2>
        <p className={`mt-1 text-lg ${muted}`}>{sample ? "The sample already has a class — try it, or make your own." : "Takes about 2 minutes."}</p>
        <ol className="mt-4 space-y-3">
          {steps.map((x) => (
            <li key={x.n}>
              <button onClick={() => go(x.tab)} className="gs-card flex w-full items-center gap-3 p-3 text-left sm:gap-4 sm:p-4">
                <span className={`grid size-12 shrink-0 place-items-center rounded-full text-2xl font-black ${x.done ? "bg-[#237a48] text-white" : "bg-[#ffd66b] text-[#3d2700]"}`}>{x.done && !sample ? "✓" : x.n}</span>
                <span><span className="block text-xl font-black">{x.t}</span><span className={`block text-base ${mutedInk}`}>{x.b}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button className="gs-btn2 px-4 py-3" onClick={onClose} data-testid="guide-skip">Skip for now</button>
          <button className="gs-btn px-5 py-3 text-lg" onClick={() => go("classes")} data-testid="guide-start">Start with step 1 →</button>
        </div>
        <p className={`mt-3 text-base ${muted}`}>Reopen any time with ❓ How it works (❓ Help on phones).</p>
      </div>
    </div>
  );
}

/* ───────────── Unlock ───────────── */
function Unlock({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="unlock-title" className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4" data-testid="unlock">
      <form className="gs-panel my-auto w-full max-w-lg p-4 gs-rise sm:p-6" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null);
        try {
          const r = await fetch("/api/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ access_code: code }) });
          const j = await r.json();
          if (j.ok) onDone(); else setErr(j.message ?? "That code didn't work.");
        } catch { setErr("Couldn't reach Score Desk. Check your connection and try again."); }
        setBusy(false);
      }}>
        <h2 id="unlock-title" className="text-3xl font-black gs-title">Unlock your Score Desk</h2>
        <p className={`mt-2 text-lg ${muted}`}>Enter the code from the Start Here page in your TPT download. Your own classes and scores are saved on this device.</p>
        <input data-testid="code-input" autoFocus className="mt-4 w-full text-xl tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="T4T-XXXX-XXXX-XXXX" />
        {err && <p role="alert" data-testid="code-error" className="mt-3 rounded-xl bg-[#fde8e6] p-3 text-base font-semibold text-[#8a1c12]">⚠ {err}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <a href={TPT_LISTING_URL} target="_blank" rel="noreferrer" className="mr-auto self-center text-base font-bold text-[#ffd66b] underline">No code? {TPT_CTA_TEXT}</a>
          <button type="button" className="gs-btn2 px-4 py-3" onClick={onClose}>Cancel</button>
          <button className="gs-btn px-5 py-3 text-lg" disabled={busy || !code.trim()} data-testid="code-submit">{busy ? "Checking…" : "Unlock"}</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────── utils ───────────── */
function csvCell(v: string) { return /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v; }
function toCsv(s: DeskState, aid: string): string {
  const a = s.assignments.find((x) => x.id === aid)!; const r = rubricById(a.rubricId)!; const c = s.classes.find((x) => x.id === a.classId)!;
  const lines = [["Student", "Assignment", "Date", "Window", "Rubric", ...r.criteria.map((x) => x.shortName), "Total", "Comment"].map(csvCell).join(",")];
  for (const st of c.students) {
    const sc = s.scores.find((x) => x.assignmentId === aid && x.studentId === st.id); const t = total(r, sc);
    lines.push([st.name, a.title, a.date, a.window, r.name, ...r.criteria.map((x) => sc?.criterionScores[x.id] === undefined ? "" : String(sc.criterionScores[x.id])), t == null ? "" : String(t), sc?.comment ?? ""].map(csvCell).join(","));
  }
  return lines.join("\n");
}
function download(name: string, body: string, type: string) {
  const u = URL.createObjectURL(new Blob([body], { type })); const el = document.createElement("a"); el.href = u; el.download = name; el.click(); URL.revokeObjectURL(u);
}
