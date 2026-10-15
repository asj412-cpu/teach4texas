"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RUBRICS, TPT_CTA_TEXT, TPT_LISTING_URL, isComplete, maxPoints, rubricById, total } from "@/lib/rubrics";
import { parseCsv, parsePaste } from "@/lib/roster";
import { today, useDesk, type DeskApi, type Mode } from "@/lib/useDesk";
import type { DeskState, Rubric, Window } from "@/lib/types";

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

  return (
    <div className={sample ? "pb-36" : "pb-24"}>
      <header className="no-print sticky top-0 z-30 border-b-2 border-[#ffd66b]/40 bg-[#0b1a30]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <button onClick={() => go("desk")} className="flex items-center gap-3 text-left">
            <span className="grid size-11 place-items-center rounded-xl bg-[#bf5700] text-lg font-black text-white shadow-[0_4px_0_#6b3000]">T4</span>
            <span><span className="block text-xl font-black gs-title">Score Desk</span><span className={`block text-base ${muted}`}>Teach4Texas</span></span>
          </button>
          <span className={`rounded-full px-3 py-1 text-base font-bold ${sample ? "bg-[#ffd66b] text-[#3d2700]" : "bg-[#2e8b57] text-white"}`} data-testid="mode-badge">
            {sample ? "SAMPLE MODE" : "YOUR DESK"}
          </span>
          <nav className="ml-auto flex flex-wrap gap-1" aria-label="Main">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-base font-bold ${tab === t.id ? "bg-[#ffd66b] text-[#3d2700]" : "text-white hover:bg-white/10"}`}>
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
            <button onClick={() => setGuide(true)} className="rounded-lg px-3 py-2 text-base font-bold text-white hover:bg-white/10">❓ How it works</button>
          </nav>
        </div>
        {sample && (
          <div className="bg-[#ffd66b] px-4 py-2 text-center text-base font-semibold text-[#3d2700]">
            You&apos;re trying the sample. Changes reset when you close this tab.{" "}
            <button className="underline" onClick={() => { api.reset(); setToast("Sample reset"); }}>Reset sample</button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6">
        {tab === "desk" && <DeskTab s={s} sample={sample} go={go} openGuide={() => setGuide(true)} openUnlock={() => setUnlockOpen(true)} api={api} setToast={setToast} />}
        {tab === "score" && <ScoreTab s={s} api={api} go={go} sample={sample} />}
        {tab === "rubrics" && <RubricsTab />}
        {tab === "classes" && <ClassesTab s={s} api={api} go={go} setToast={setToast} />}
        {tab === "growth" && <GrowthTab s={s} sample={sample} />}
      </main>

      <footer className={`no-print mx-auto mt-10 max-w-6xl px-4 text-base ${muted}`}>
        Scores stay on this device. Use first names or initials if you share a computer. ·{" "}
        <a className="underline" href="https://teach4texas.com/" target="_blank" rel="noreferrer">teach4texas.com</a>
      </footer>

      {sample && (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#ffd66b] bg-[#0b1a30]/97 px-4 py-3" data-testid="tpt-cta-bar">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3">
            <span className="text-base font-semibold text-white">Keep your classes and scores on your own device.</span>
            <a href={TPT_LISTING_URL} target="_blank" rel="noreferrer" className="gs-btn px-5 py-3 text-lg" data-testid="tpt-cta">🎁 {TPT_CTA_TEXT}</a>
            <button onClick={() => setUnlockOpen(true)} className="gs-btn2 px-4 py-3 text-base">🔑 Have a code? Unlock</button>
          </div>
        </div>
      )}

      {guide && <Guide s={s} sample={sample} onClose={closeGuide} go={(t) => { closeGuide(); go(t); }} />}
      {unlockOpen && <Unlock onClose={() => { setUnlockOpen(false); history.replaceState(null, "", "#desk"); }} onDone={() => { setUnlockOpen(false); setMode("full"); setTab("desk"); setGuide(true); }} />}
      {toast && <div role="status" className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-xl bg-[#2e8b57] px-5 py-3 text-lg font-bold text-white shadow-xl gs-rise">{toast}</div>}
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
        <label className="text-base font-bold text-white">Class<br />
          <select value={classId ?? ""} onChange={(e) => api.setLast(e.target.value, s.assignments.find((x) => x.classId === e.target.value)?.id ?? null)}>
            {s.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        {asgs.length > 0 && !creating && <label className="text-base font-bold text-white">Assignment<br />
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
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[["SCORED", `${done}/${cls.students.length}`], ["CLASS AVG", avg], ["MAX", String(maxPoints(r))]].map(([k, v]) => (
              <div key={k} className="gs-card p-3 text-center"><p className={`text-base font-bold ${mutedInk}`}>{k}</p><p className="text-3xl font-black">{v}</p></div>
            ))}
          </div>
          <div className="gs-panel mb-3 flex flex-wrap items-center gap-3 p-3">
            <span className="text-base font-bold text-white">{r.name}</span>
            <ViewToggle view={view} setView={setView} />
          </div>
          {r.kind === "staar-ecr" && <p className="mb-3 rounded-xl bg-[#ffd66b] px-4 py-2 text-base font-semibold text-[#3d2700]">STAAR ECR rule: if Organization &amp; Development is 0, Conventions is locked to 0.</p>}
          <div className="gs-card overflow-x-auto p-2">
            <table className="w-full text-left text-base">
              <thead><tr className="border-b-2 border-[#1b365d]/20">
                <th className="p-2">Student</th>
                {r.criteria.map((c) => <th key={c.id} className="p-2">{c.shortName}</th>)}
                <th className="p-2">Total</th><th className="p-2">Note</th>
              </tr></thead>
              <tbody>
                {cls.students.map((st) => {
                  const sc = scores.find((x) => x.studentId === st.id);
                  const t = total(r, sc);
                  const orgZero = r.kind === "staar-ecr" && sc?.criterionScores[r.criteria[0].id] === 0;
                  return (
                    <tr key={st.id} className="border-b border-[#1b365d]/10" data-testid={`row-${st.name}`}>
                      <td className="p-2 text-lg font-bold">{st.name}{!isComplete(r, sc) && <span className={`ml-2 text-base font-normal ${mutedInk}`}>· open</span>}</td>
                      {r.criteria.map((c, ci) => (
                        <td key={c.id} className="p-2"><div className="flex flex-wrap gap-1">
                          {[...c.levels].sort((x, y) => x.score - y.score).map((l) => (
                            <button key={l.score} className="chip px-2" aria-pressed={sc?.criterionScores[c.id] === l.score}
                              disabled={ci === 1 && orgZero && l.score !== 0}
                              aria-label={`${st.name} ${c.name} ${l.label}`} title={view === "teacher" ? l.teacher : l.student}
                              onClick={() => { api.setScore(a.id, st.id, c.id, l.score); setFocus({ cid: c.id, v: l.score }); }}>{l.label}</button>
                          ))}</div></td>
                      ))}
                      <td className="p-2 text-2xl font-black" data-testid={`total-${st.name}`}>{t ?? "—"}</td>
                      <td className="p-2"><input aria-label={`Note for ${st.name}`} className="w-40" value={sc?.comment ?? ""} onChange={(e) => api.setComment(a.id, st.id, e.target.value)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {focusLevel && <p className="gs-panel mt-3 p-3 text-lg text-white"><b className="text-[#ffd66b]">{focusLevel.label}:</b> {view === "teacher" ? focusLevel.teacher : focusLevel.student}</p>}
        </>
      )}
    </div>
  );
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
        {RUBRICS.map((r) => (
          <button key={r.id} onClick={() => setRid(r.id)} aria-pressed={rid === r.id} data-testid={`pick-${r.id}`}
            className={`gs-card p-4 text-left ${rid === r.id ? "ring-4 ring-[#ffd66b]" : ""}`}>
            <span className="block text-lg font-black">{rid === r.id ? "✅ " : ""}{r.name}</span>
            <span className={`block text-base ${mutedInk}`}>{r.gradeBand} · {r.subject} · {maxPoints(r)} pts</span>
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
function RubricsTab() {
  const [rid, setRid] = useState(RUBRICS[0].id);
  const [view, setView] = useState<"teacher" | "student">("teacher");
  const r = rubricById(rid) as Rubric;
  return (
    <div>
      <H1 kicker="LIBRARY" title="Rubrics" />
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <div className="no-print flex flex-col gap-2">
          {RUBRICS.map((x) => (
            <button key={x.id} onClick={() => setRid(x.id)} className={`gs-card p-3 text-left ${rid === x.id ? "ring-4 ring-[#ffd66b]" : ""}`}>
              <span className="block text-base font-black">{x.name}</span>
              <span className={`block text-base ${mutedInk}`}>{x.gradeBand} · {x.subject} · {maxPoints(x)} pts</span>
            </button>
          ))}
        </div>
        <div>
          <div className="no-print gs-panel mb-3 flex flex-wrap items-center gap-3 p-3">
            <ViewToggle view={view} setView={setView} />
            <button className="gs-btn2 ml-auto px-4 py-2" onClick={() => window.print()}>🖨 Print</button>
          </div>
          <article className="gs-card p-6" data-testid="rubric-view">
            <p className={`text-base font-bold ${mutedInk}`}>TEACH4TEXAS SCORE DESK</p>
            <h2 className="text-3xl font-black">{view === "teacher" ? r.name : r.studentTitle}</h2>
            {view === "teacher" && <><p className={`text-base ${mutedInk}`}>{r.gradeBand} · {r.subject}{r.teks ? ` · ${r.teks}` : ""} · {maxPoints(r)} points</p><p className="mt-2 text-lg">{r.blurb}</p></>}
            {r.criteria.map((c) => (
              <section key={c.id} className="mt-5">
                <h3 className="text-xl font-black">{c.name}</h3>
                <ul className="mt-2 space-y-2">
                  {[...c.levels].sort((x, y) => y.score - x.score).map((l) => (
                    <li key={l.score} className="flex gap-3 rounded-xl bg-[#eef3fa] p-3">
                      <span className="grid min-w-12 place-items-center rounded-lg bg-[#1b365d] px-2 text-lg font-black text-white">{view === "student" ? "☐ " : ""}{l.label}</span>
                      <span className="text-lg">{view === "teacher" ? l.teacher : l.student}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
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
        <textarea data-testid="roster-paste" rows={6} className="mt-1 w-full" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} placeholder={"Mia\nJayden\nSofia"} />
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
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
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
                <input aria-label="Class name" className="text-xl font-black" value={cls.name} onChange={(e) => api.renameClass(cls.id, e.target.value)} />
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
        <label className="text-base font-bold text-white">Class<br /><select value={cid} onChange={(e) => setCid(e.target.value)}>{s.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-base font-bold text-white">Rubric<br /><select value={r.id} onChange={(e) => setRid(e.target.value)}>{(rubricIds.length ? rubricIds : [RUBRICS[0].id]).map((id) => <option key={id} value={id}>{rubricById(id)?.name}</option>)}</select></label>
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
    { n: 1, t: "Make a class", b: "Paste your student names (or import a CSV) in Classes.", tab: "classes" as Tab, done: hasClass },
    { n: 2, t: "Pick a rubric", b: "On Score, tap New assignment and choose STAAR ECR, SCR, RACE, or 4-level.", tab: "score" as Tab, done: hasAsg },
    { n: 3, t: "Score", b: "Tap a chip for each student. Totals and averages update instantly.", tab: "score" as Tab, done: hasScore },
  ];
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guide-title" className="no-print fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" data-testid="guide">
      <div className="gs-panel w-full max-w-2xl p-6 gs-rise">
        <h2 id="guide-title" className="text-3xl font-black gs-title">Score your first student in 3 steps</h2>
        <p className={`mt-1 text-lg ${muted}`}>{sample ? "The sample already has a class — try it, or make your own." : "Takes about 2 minutes."}</p>
        <ol className="mt-4 space-y-3">
          {steps.map((x) => (
            <li key={x.n}>
              <button onClick={() => go(x.tab)} className="gs-card flex w-full items-center gap-4 p-4 text-left">
                <span className={`grid size-12 shrink-0 place-items-center rounded-full text-2xl font-black ${x.done ? "bg-[#2e8b57] text-white" : "bg-[#ffd66b] text-[#3d2700]"}`}>{x.done && !sample ? "✓" : x.n}</span>
                <span><span className="block text-xl font-black">{x.t}</span><span className={`block text-base ${mutedInk}`}>{x.b}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button className="gs-btn2 px-4 py-3" onClick={onClose} data-testid="guide-skip">Skip for now</button>
          <button className="gs-btn px-5 py-3 text-lg" onClick={() => go("classes")} data-testid="guide-start">Start with step 1 →</button>
        </div>
        <p className={`mt-3 text-base ${muted}`}>Reopen any time with ❓ How it works.</p>
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
    <div role="dialog" aria-modal="true" aria-labelledby="unlock-title" className="no-print fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" data-testid="unlock">
      <form className="gs-panel w-full max-w-lg p-6 gs-rise" onSubmit={async (e) => {
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
function csvCell(v: string) { return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v; }
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
