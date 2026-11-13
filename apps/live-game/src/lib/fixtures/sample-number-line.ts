import type { GameBoard } from "@/lib/domain/board";
import {
  tickValue,
  type NlMode,
  type NumberLineItem,
} from "@/lib/domain/number-line";

/**
 * 20 Grade 3 number-line questions.
 * 10 Range — TEKS 3.2(C), whole numbers to 1,000.
 * 10 Snap — TEKS 3.3(A), 3.3(B), and 3.7(A); denominators 2, 3, 4, 6, and 8
 * on 0–1 and 0–2 lines. Snap answers are the tick the prompt names.
 */

type SnapSeed = {
  id: string;
  prompt: string;
  teks: string;
  min: number;
  max: number;
  divisions: number;
  /** Integer tick index, 0 at the left end. */
  tick: number;
};

type RangeSeed = {
  id: string;
  prompt: string;
  teks: string;
  min: number;
  max: number;
  divisions: number;
  answer: number;
};

const RANGE: RangeSeed[] = [
  {
    id: "nl-r01",
    prompt: "Round 640 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 600,
  },
  {
    id: "nl-r02",
    prompt: "Round 860 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 900,
  },
  {
    id: "nl-r03",
    prompt: "Round 450 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 500,
  },
  {
    id: "nl-r04",
    prompt: "Round 320 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 300,
  },
  {
    id: "nl-r05",
    prompt: "Round 150 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 200,
  },
  {
    id: "nl-r06",
    prompt: "Round 980 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 1000,
  },
  {
    id: "nl-r07",
    prompt: "Round 40 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 0,
  },
  {
    id: "nl-r08",
    prompt: "Place 250 on the number line.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 250,
  },
  {
    id: "nl-r09",
    prompt: "Round 555 to the nearest hundred. Place that hundred.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 600,
  },
  {
    id: "nl-r10",
    prompt: "Place 700 on the number line.",
    teks: "3.2(C)",
    min: 0,
    max: 1000,
    divisions: 10,
    answer: 700,
  },
];

const SNAP: SnapSeed[] = [
  {
    id: "nl-s01",
    prompt: "Place one half on the number line.",
    teks: "3.3(A)",
    min: 0,
    max: 1,
    divisions: 2,
    tick: 1,
  },
  {
    id: "nl-s02",
    prompt: "Place three fourths on the number line.",
    teks: "3.3(B)",
    min: 0,
    max: 1,
    divisions: 4,
    tick: 3,
  },
  {
    id: "nl-s03",
    prompt: "Place one third on the number line.",
    teks: "3.3(A)",
    min: 0,
    max: 1,
    divisions: 3,
    tick: 1,
  },
  {
    id: "nl-s04",
    prompt: "Place two thirds on the number line.",
    teks: "3.3(B)",
    min: 0,
    max: 1,
    divisions: 3,
    tick: 2,
  },
  {
    id: "nl-s05",
    prompt: "Place five sixths on the number line.",
    teks: "3.3(A)",
    min: 0,
    max: 1,
    divisions: 6,
    tick: 5,
  },
  {
    id: "nl-s06",
    prompt: "Place three eighths on the number line.",
    teks: "3.3(B)",
    min: 0,
    max: 1,
    divisions: 8,
    tick: 3,
  },
  {
    id: "nl-s07",
    prompt: "Place seven eighths. It is a distance from zero.",
    teks: "3.7(A)",
    min: 0,
    max: 1,
    divisions: 8,
    tick: 7,
  },
  {
    id: "nl-s08",
    prompt: "Place three halves. Count by halves from zero.",
    teks: "3.7(A)",
    min: 0,
    max: 2,
    divisions: 4,
    tick: 3,
  },
  {
    id: "nl-s09",
    prompt: "Place five fourths. Count by fourths from zero.",
    teks: "3.7(A)",
    min: 0,
    max: 2,
    divisions: 8,
    tick: 5,
  },
  {
    id: "nl-s10",
    prompt: "Place eleven eighths. Count by eighths from zero.",
    teks: "3.7(A)",
    min: 0,
    max: 2,
    divisions: 16,
    tick: 11,
  },
];

function rangeItem(seed: RangeSeed): NumberLineItem {
  return { ...seed, mode: "range" };
}

function snapItem(seed: SnapSeed): NumberLineItem {
  const mode: NlMode = "snap";
  const base = {
    id: seed.id,
    prompt: seed.prompt,
    teks: seed.teks,
    mode,
    min: seed.min,
    max: seed.max,
    divisions: seed.divisions,
    answer: 0,
  };
  return { ...base, answer: tickValue(base, seed.tick) };
}

export const SAMPLE_NUMBER_LINE_ITEMS: NumberLineItem[] = [
  ...RANGE.map(rangeItem),
  ...SNAP.map(snapItem),
];

export const NUMBER_LINE_SAMPLE_BOARD_ID = "sample-number-line-g3-math";
export const DEMO_NUMBER_LINE_CODE = "T4T-DEMO-NUMLINE-SAMPLE01";

export function buildSampleNumberLineBoard(id = NUMBER_LINE_SAMPLE_BOARD_ID): GameBoard {
  const now = new Date().toISOString();
  return {
    id,
    title: "Grade 3 Number Line",
    grade: 3,
    subject: "math",
    theme: "Number line",
    status: "ready",
    tpt_sku: "T4T-NUMLINE-G3-MATH-SAMPLE",
    game_type: "number_line",
    cells: [],
    number_line_items: SAMPLE_NUMBER_LINE_ITEMS.map((item) => ({ ...item })),
    created_at: now,
    updated_at: now,
  };
}

/** Demo key check. Every answer is on the line. Every Snap answer is on a tick. */
export function checkNumberLineDemoKey(
  items: NumberLineItem[] = SAMPLE_NUMBER_LINE_ITEMS,
): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;
  const range = items.filter((item) => item.mode === "range");
  const snap = items.filter((item) => item.mode === "snap");
  lines.push(`questions ${items.length} range ${range.length} snap ${snap.length}`);
  if (items.length !== 20 || range.length !== 10 || snap.length !== 10) {
    ok = false;
    lines.push("FAIL expected 20 questions, 10 range and 10 snap");
  }
  for (const item of items) {
    const onLine = item.answer >= item.min && item.answer <= item.max;
    const span = item.max - item.min;
    const raw = span > 0 ? ((item.answer - item.min) / span) * item.divisions : NaN;
    const tick = Math.round(raw);
    const onTick = Number.isInteger(item.divisions) && Math.abs(raw - tick) <= 1e-6;
    const flag = item.mode === "snap" ? (onLine && onTick ? "OK" : "FAIL") : onLine ? "OK" : "FAIL";
    if (flag === "FAIL") ok = false;
    lines.push(
      `${flag} ${item.id} ${item.mode} teks ${item.teks} line ${item.min}-${item.max} /${item.divisions} answer ${item.answer} onLine ${onLine} onTick ${onTick}`,
    );
  }
  lines.push(ok ? "DEMO KEY OK" : "DEMO KEY FAIL");
  return { ok, lines };
}
