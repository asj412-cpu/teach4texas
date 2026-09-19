"use client";

import { useCallback, useState } from "react";

type BoardRow = {
  id: string;
  title: string;
  grade: number;
  subject: string;
  status: string;
  tpt_sku?: string;
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [minted, setMinted] = useState<{ code: string; board_id: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  // Create form
  const [cloneTitle, setCloneTitle] = useState("");
  const [cloneSource, setCloneSource] = useState("board_sample_math_g3");
  const [aiGrade, setAiGrade] = useState<3 | 4 | 5>(4);
  const [aiSubject, setAiSubject] = useState<"math" | "rla" | "science">("math");
  const [aiTopic, setAiTopic] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [importJson, setImportJson] = useState("");

  const loadInventory = useCallback(async () => {
    const res = await fetch("/api/admin/inventory");
    const data = await res.json();
    if (!res.ok) {
      setAuthed(false);
      setError("Not authorized — enter operator secret.");
      return;
    }
    setBoards(data.boards);
    setAuthed(true);
    setError(null);
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        setError("Wrong operator secret.");
        return;
      }
      await fetch("/api/admin/seed-demo", { method: "POST" });
      await loadInventory();
    } finally {
      setBusy(false);
    }
  }

  async function mint(boardId: string) {
    setBusy(true);
    setMinted(null);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/mint-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: boardId,
          label: `TPT mint ${new Date().toISOString().slice(0, 10)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Mint failed (board must be status: ready)");
        return;
      }
      setMinted({ code: data.code, board_id: data.board_id });
      setInfo("Copy this code into the TPT product download (teacher guide PDF).");
    } finally {
      setBusy(false);
    }
  }

  async function markReady(boardId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not mark ready");
        return;
      }
      setInfo(`Marked ${boardId} ready — you can mint a TPT code.`);
      await loadInventory();
    } finally {
      setBusy(false);
    }
  }

  async function cloneGame(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "clone",
          source_board_id: cloneSource,
          title: cloneTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Clone failed");
        return;
      }
      setInfo(
        `Cloned as draft: ${data.board.id}. Review/edit JSON, mark ready, mint code.`,
      );
      setCloneTitle("");
      await loadInventory();
    } finally {
      setBusy(false);
    }
  }

  async function aiDraft(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo("Generating with Grok (may take 30–90s)…");
    try {
      const res = await fetch("/api/admin/boards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: aiGrade,
          subject: aiSubject,
          topic: aiTopic,
          title: aiTitle || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "XAI_API_KEY_MISSING"
            ? "Set XAI_API_KEY in env for AI drafts (or use clone/import instead)."
            : (data.error ?? "AI generate failed"),
        );
        setInfo(null);
        return;
      }
      setInfo(
        `AI draft saved as ${data.board.id} (status: draft). Review before ready + mint.`,
      );
      setAiTopic("");
      await loadInventory();
    } finally {
      setBusy(false);
    }
  }

  async function importBoard(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const board = JSON.parse(importJson);
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", board }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Import validation failed — check 25 cells, 5 categories, MC choices.",
        );
        return;
      }
      setInfo(`Imported ${data.board.id} (${data.board.status}).`);
      setImportJson("");
      await loadInventory();
    } catch {
      setError("Invalid JSON.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadBoard(boardId: string) {
    const res = await fetch(`/api/admin/boards/${boardId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    const blob = new Blob([JSON.stringify(data.board, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${boardId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-bold text-t4t-navy">Creator admin</h1>
        <p className="mt-2 text-sm text-t4t-darkText/75">
          Build sellable games and mint TPT access codes. Teachers never see this
          page and cannot generate games.
        </p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="OPERATOR_SECRET"
            className="w-full rounded-lg border border-t4t-navy/20 px-3 py-2.5"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-t4t-navy py-3 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-t4t-navy">Create games to sell</h1>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-t4t-darkText/80">
        <li>Create a board (clone, AI draft, or import JSON)</li>
        <li>Review → mark <strong>ready</strong></li>
        <li>
          <strong>Mint TPT access code</strong> → paste into product download
        </li>
        <li>List the product on Teachers Pay Teachers</li>
        <li>Teachers redeem on play.teach4texas.com (not a free generator)</li>
      </ol>

      {minted && (
        <div className="mt-6 rounded-xl border border-t4t-green/40 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-t4t-green">
            TPT access code (copy now — not stored in plaintext)
          </p>
          <p className="mt-2 break-all font-mono text-lg font-bold text-t4t-navy">
            {minted.code}
          </p>
          <p className="mt-1 text-xs text-t4t-darkText/60">
            board_id: {minted.board_id}
          </p>
        </div>
      )}

      {info && (
        <p className="mt-4 rounded-lg bg-t4t-lightBlue px-3 py-2 text-sm text-t4t-navy">
          {info}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {/* Create methods */}
      <section className="mt-10 grid gap-6 md:grid-cols-1">
        <form
          onSubmit={cloneGame}
          className="rounded-xl border border-t4t-navy/10 bg-white p-5"
        >
          <h2 className="font-bold text-t4t-navy">A. Clone sample / existing</h2>
          <p className="mt-1 text-xs text-t4t-darkText/60">
            Fastest: copy structure, then edit JSON offline and re-import.
          </p>
          <select
            className="mt-3 w-full rounded border px-2 py-2 text-sm"
            value={cloneSource}
            onChange={(e) => setCloneSource(e.target.value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.id})
              </option>
            ))}
          </select>
          <input
            className="mt-2 w-full rounded border px-2 py-2 text-sm"
            placeholder="New product title"
            value={cloneTitle}
            onChange={(e) => setCloneTitle(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 rounded-lg bg-t4t-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Clone as draft
          </button>
        </form>

        <form
          onSubmit={aiDraft}
          className="rounded-xl border border-t4t-navy/10 bg-white p-5"
        >
          <h2 className="font-bold text-t4t-navy">B. AI draft (operator only)</h2>
          <p className="mt-1 text-xs text-t4t-darkText/60">
            Uses XAI_API_KEY. Always review — status stays draft until you mark
            ready.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="rounded border px-2 py-2 text-sm"
              value={aiGrade}
              onChange={(e) => setAiGrade(Number(e.target.value) as 3 | 4 | 5)}
            >
              <option value={3}>Grade 3</option>
              <option value={4}>Grade 4</option>
              <option value={5}>Grade 5</option>
            </select>
            <select
              className="rounded border px-2 py-2 text-sm"
              value={aiSubject}
              onChange={(e) =>
                setAiSubject(e.target.value as "math" | "rla" | "science")
              }
            >
              <option value="math">Math</option>
              <option value="rla">RLA</option>
              <option value="science">Science</option>
            </select>
          </div>
          <input
            className="mt-2 w-full rounded border px-2 py-2 text-sm"
            placeholder="Topic (e.g. multiplication word problems)"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            required
          />
          <input
            className="mt-2 w-full rounded border px-2 py-2 text-sm"
            placeholder="Optional title"
            value={aiTitle}
            onChange={(e) => setAiTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 rounded-lg bg-t4t-burnt px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate draft board
          </button>
        </form>

        <form
          onSubmit={importBoard}
          className="rounded-xl border border-t4t-navy/10 bg-white p-5"
        >
          <h2 className="font-bold text-t4t-navy">C. Import full board JSON</h2>
          <p className="mt-1 text-xs text-t4t-darkText/60">
            Paste a complete GameBoard (25 MC cells, 5 categories). Download an
            existing board as a template.
          </p>
          <textarea
            className="mt-3 h-40 w-full rounded border px-2 py-2 font-mono text-xs"
            placeholder='{"id":"board_...","title":"...", ...}'
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 rounded-lg border border-t4t-navy px-4 py-2 text-sm font-semibold text-t4t-navy disabled:opacity-50"
          >
            Import / upsert
          </button>
        </form>
      </section>

      <h2 className="mt-12 text-lg font-bold text-t4t-navy">Inventory</h2>
      <ul className="mt-4 space-y-4">
        {boards.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-t4t-navy/10 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-t4t-navy">{b.title}</p>
                <p className="text-xs text-t4t-darkText/60">
                  {b.id} · G{b.grade} {b.subject} ·{" "}
                  <span
                    className={
                      b.status === "ready"
                        ? "font-semibold text-t4t-green"
                        : "text-t4t-burnt"
                    }
                  >
                    {b.status}
                  </span>
                  {b.tpt_sku ? ` · ${b.tpt_sku}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => downloadBoard(b.id)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                >
                  Download JSON
                </button>
                {b.status !== "ready" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markReady(b.id)}
                    className="rounded-lg bg-t4t-green px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Mark ready
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy || b.status !== "ready"}
                  onClick={() => mint(b.id)}
                  className="rounded-lg bg-t4t-burnt px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Mint TPT code
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
