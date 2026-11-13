import { z } from "zod";
import { kidPlainText } from "@/lib/plain-text";

/**
 * Number Line (live game type `number_line`).
 * The server stores a placed VALUE, scores it, and withholds the answer until reveal.
 * Snap is exact-tick only. Range falls off linearly inside the tolerance.
 */

export const NL_EXACT_POINTS = 1000;
export const NL_MAX_BONUS = 200;
export const NL_SECONDS = [15, 30, 45, 60] as const;
export type NlSeconds = (typeof NL_SECONDS)[number];
export type NlMode = "snap" | "range";
export type NlStage = "ready" | "placing" | "reveal" | "board";

export type NumberLineItem = {
  id: string;
  prompt: string;
  teks: string;
  mode: NlMode;
  /** Inclusive left endpoint. */
  min: number;
  /** Inclusive right endpoint. Must be greater than min. */
  max: number;
  /**
   * Equal spaces from min to max. Tick count is divisions + 1 (both ends).
   * Zero means there are no ticks.
   */
  divisions: number;
  /** Correct value on the line. Hidden from clients until reveal. */
  answer: number;
  /** Range only. Distance at which points hit 0. Default is 10% of the span. */
  tolerance?: number;
};

export type NlPlacement = {
  value: number;
  /** True only when the student pressed lock. Time-up does not set this. */
  locked: boolean;
  at: string;
};

export type NlPause = { start: string; end: string | null };

export type NlAward = {
  player_id: string;
  value: number | null;
  base: number;
  bonus: number;
  total: number;
  exact: boolean;
  within: boolean;
};

export type NumberLineState = {
  index: number;
  stage: NlStage;
  paused: boolean;
  show_names: boolean;
  seconds: NlSeconds;
  started_at: string | null;
  ends_at: string | null;
  paused_remaining_ms: number | null;
  accepting: boolean;
  placements: Record<string, NlPlacement>;
  awards: NlAward[];
  /** Question ids whose points were already added. */
  scored_ids: string[];
  /** Closed and open pauses for this question. Open pause has end === null. */
  pauses: NlPause[];
  /** Client request ids already applied. A retry with the same id is a no-op. */
  applied_request_ids: string[];
};

const PLACE_KEYS = new Set(["player_id", "question_id", "value", "lock", "request_id"]);

export function createNumberLineState(seconds: NlSeconds = 30): NumberLineState {
  return {
    index: 0,
    stage: "ready",
    paused: false,
    show_names: false,
    seconds,
    started_at: null,
    ends_at: null,
    paused_remaining_ms: null,
    accepting: false,
    placements: {},
    awards: [],
    scored_ids: [],
    pauses: [],
    applied_request_ids: [],
  };
}

export function numberLineItemsFromBoard(board: {
  number_line_items?: NumberLineItem[] | null;
}): NumberLineItem[] {
  return board.number_line_items ?? [];
}

export function isNlSeconds(value: number): value is NlSeconds {
  return (NL_SECONDS as readonly number[]).includes(value);
}

export function lineSpan(item: { min: number; max: number }): number {
  return item.max - item.min;
}

/** Tick value for an integer index in 0..divisions. Shared by the client and the server. */
export function tickValue(
  item: { min: number; max: number; divisions: number },
  index: number,
): number {
  if (item.divisions <= 0) return item.min;
  return item.min + (index * (item.max - item.min)) / item.divisions;
}

/** Snap index when `value` sits on a tick. Null when it is off the ticks or off the line. */
export function snapTickIndex(
  item: { min: number; max: number; divisions: number },
  value: number,
): number | null {
  if (!Number.isFinite(value) || !Number.isInteger(item.divisions) || item.divisions < 1) {
    return null;
  }
  const span = lineSpan(item);
  if (!(span > 0)) return null;
  const raw = ((value - item.min) / span) * item.divisions;
  const index = Math.round(raw);
  if (index < 0 || index > item.divisions) return null;
  if (Math.abs(raw - index) > 1e-6) return null;
  return index;
}

export function isOnTick(
  item: { min: number; max: number; divisions: number },
  value: number,
): boolean {
  return snapTickIndex(item, value) !== null;
}

export function rangeTolerance(item: NumberLineItem): number {
  if (item.tolerance != null && Number.isFinite(item.tolerance) && item.tolerance >= 0) {
    return item.tolerance;
  }
  return Math.abs(lineSpan(item)) * 0.1;
}

export function validateNumberLineItem(
  item: NumberLineItem,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(item.min) || !Number.isFinite(item.max) || !(item.max > item.min)) {
    return { ok: false, error: "The maximum must be greater than the minimum." };
  }
  if (!Number.isFinite(item.divisions)) {
    return {
      ok: false,
      error: "This question has zero ticks. Add at least one space between the ends.",
    };
  }
  if (!Number.isInteger(item.divisions)) {
    return { ok: false, error: "The number of ticks has to be a whole number." };
  }
  if (item.divisions < 1) {
    return {
      ok: false,
      error: "This question has zero ticks. Add at least one space between the ends.",
    };
  }
  if (!Number.isFinite(item.answer) || item.answer < item.min || item.answer > item.max) {
    return { ok: false, error: "The answer is outside the number line." };
  }
  if (item.mode === "snap" && !isOnTick(item, item.answer)) {
    return { ok: false, error: "Snap mode only accepts an answer that sits on a tick." };
  }
  if (item.mode === "range" && item.tolerance != null) {
    if (!Number.isFinite(item.tolerance) || item.tolerance < 0) {
      return { ok: false, error: "The tolerance has to be zero or a positive distance." };
    }
  }
  return { ok: true };
}

export function validateNumberLineSet(
  items: NumberLineItem[],
): { ok: true } | { ok: false; error: string } {
  if (items.length < 1) {
    return { ok: false, error: "Number line needs at least one question." };
  }
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      return { ok: false, error: `Duplicate question id: ${item.id}.` };
    }
    ids.add(item.id);
    const check = validateNumberLineItem(item);
    if (!check.ok) return check;
  }
  return { ok: true };
}

export const NumberLineItemSchema = z
  .object({
    id: z.string().min(1).max(40),
    prompt: z.string().min(1).max(280),
    teks: z.string().min(1).max(32),
    mode: z.enum(["snap", "range"]),
    min: z.number(),
    max: z.number(),
    divisions: z.number(),
    answer: z.number(),
    tolerance: z.number().optional(),
  })
  .superRefine((item, ctx) => {
    const check = validateNumberLineItem(item);
    if (!check.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error });
    }
  });

/**
 * Labels that fit without overlap. Endpoints always stay.
 * `maxLabels` is how many labels the width can hold at the text floor.
 */
export function visibleTickIndexes(divisions: number, maxLabels: number): number[] {
  if (!Number.isInteger(divisions) || divisions < 1) return [0];
  const total = divisions + 1;
  const cap = Math.max(2, Math.min(total, Math.floor(maxLabels)));
  if (total <= cap) return Array.from({ length: total }, (_, i) => i);
  let gaps = cap - 1;
  while (gaps > 1 && divisions % gaps !== 0) gaps -= 1;
  if (divisions % gaps === 0) {
    const step = divisions / gaps;
    return Array.from({ length: gaps + 1 }, (_, i) => i * step);
  }
  const out = [0];
  for (let i = 1; i < gaps; i++) {
    const idx = Math.round((i * divisions) / gaps);
    if (idx > out[out.length - 1]! && idx < divisions) out.push(idx);
  }
  out.push(divisions);
  return out;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Kid-facing tick label. Fractions are reduced. Whole numbers stay whole. */
export function formatTickLabel(
  item: { min: number; max: number; divisions: number; mode: NlMode },
  index: number,
): string {
  if (item.mode === "range") {
    const value = tickValue(item, index);
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-6) return String(rounded);
    return String(Math.round(value * 1000) / 1000);
  }
  const span = item.max - item.min;
  if (index === 0) return formatFraction(item.min, 1);
  if (index === item.divisions) return formatFraction(item.max, 1);
  if (Number.isInteger(span)) {
    return formatFraction(index * span + item.min * item.divisions, item.divisions);
  }
  const value = tickValue(item, index);
  return String(Math.round(value * 1000) / 1000);
}

function formatFraction(numerator: number, denominator: number): string {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return "0";
  }
  const sign = numerator < 0 ? "-" : "";
  const n = Math.round(Math.abs(numerator));
  const d = Math.round(Math.abs(denominator));
  const g = gcd(n, d);
  const nn = n / g;
  const dd = d / g;
  if (dd === 1) return `${sign}${nn}`;
  const whole = Math.floor(nn / dd);
  const rem = nn % dd;
  if (whole > 0 && rem === 0) return `${sign}${whole}`;
  if (whole > 0) return `${sign}${whole} ${rem}/${dd}`;
  return `${sign}${nn}/${dd}`;
}

export type ScoreParts = {
  base: number;
  bonus: number;
  total: number;
  exact: boolean;
  within: boolean;
};

/**
 * Speed bonus for a locked-in answer that already earned points.
 * 200 at the opening instant, 0 at the buzzer, never above 200.
 */
export function speedBonus(opts: {
  eligible: boolean;
  locked: boolean;
  elapsedMs: number;
  totalMs: number;
}): number {
  if (!opts.eligible || !opts.locked) return 0;
  if (!(opts.totalMs > 0) || !Number.isFinite(opts.elapsedMs)) return 0;
  const ratio = 1 - opts.elapsedMs / opts.totalMs;
  const clamped = Math.min(1, Math.max(0, ratio));
  const bonus = Math.round(NL_MAX_BONUS * clamped);
  return Math.min(NL_MAX_BONUS, Math.max(0, bonus));
}

/** Server scoring. Snap is exact-tick or nothing. Range is linear to the tolerance. */
export function scorePlacement(
  item: NumberLineItem,
  value: number,
  opts: { locked: boolean; elapsedMs: number; totalMs: number },
): ScoreParts {
  if (!Number.isFinite(value)) {
    return { base: 0, bonus: 0, total: 0, exact: false, within: false };
  }
  if (item.mode === "snap") {
    const placed = snapTickIndex(item, value);
    const correct = snapTickIndex(item, item.answer);
    const exact = placed !== null && correct !== null && placed === correct;
    const base = exact ? NL_EXACT_POINTS : 0;
    const bonus = speedBonus({
      eligible: base > 0,
      locked: opts.locked,
      elapsedMs: opts.elapsedMs,
      totalMs: opts.totalMs,
    });
    return { base, bonus, total: base + bonus, exact, within: exact };
  }
  const tol = rangeTolerance(item);
  const dist = Math.abs(value - item.answer);
  const exact = dist <= 1e-6 * Math.max(1, Math.abs(item.answer), Math.abs(lineSpan(item)));
  let base = 0;
  if (exact) base = NL_EXACT_POINTS;
  else if (tol === 0) base = 0;
  else if (dist < tol || Math.abs(dist - tol) <= 1e-9) {
    base = Math.round(NL_EXACT_POINTS * (1 - dist / tol));
  }
  if (base < 0) base = 0;
  if (base > NL_EXACT_POINTS) base = NL_EXACT_POINTS;
  const within = exact || (tol > 0 && dist <= tol + 1e-9);
  const bonus = speedBonus({
    eligible: base > 0,
    locked: opts.locked,
    elapsedMs: opts.elapsedMs,
    totalMs: opts.totalMs,
  });
  return { base, bonus, total: base + bonus, exact, within };
}

export type PlaceBody =
  | {
      ok: true;
      player_id: string;
      question_id: string;
      value: number;
      lock: boolean;
      request_id: string | null;
    }
  | { ok: false; error: string };

/** Reject extra keys before the value is scored. The route uses this on every POST. */
export function parseNumberLinePlaceBody(body: unknown): PlaceBody {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "INVALID_BODY" };
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!PLACE_KEYS.has(key)) return { ok: false, error: "FORGED" };
  }
  if (typeof record.player_id !== "string" || record.player_id.trim().length < 2) {
    return { ok: false, error: "INVALID_BODY" };
  }
  if (typeof record.question_id !== "string" || record.question_id.trim().length < 1) {
    return { ok: false, error: "INVALID_BODY" };
  }
  if (typeof record.value !== "number" || !Number.isFinite(record.value)) {
    return { ok: false, error: "INVALID_VALUE" };
  }
  if (record.lock !== undefined && typeof record.lock !== "boolean") {
    return { ok: false, error: "FORGED" };
  }
  let request_id: string | null = null;
  if (record.request_id !== undefined) {
    if (typeof record.request_id !== "string" || record.request_id.trim().length < 8 || record.request_id.length > 80) {
      return { ok: false, error: "FORGED" };
    }
    request_id = record.request_id.trim();
  }
  return {
    ok: true,
    player_id: record.player_id,
    question_id: record.question_id.trim(),
    value: record.value,
    lock: record.lock === true,
    request_id,
  };
}

/** Active milliseconds between start and a lock, with pauses removed. */
export function activeElapsedMs(
  pauses: NlPause[] | undefined,
  startedAtMs: number,
  lockedAtMs: number,
): number {
  let paused = 0;
  for (const pause of pauses ?? []) {
    const start = new Date(pause.start).getTime();
    const end = pause.end ? new Date(pause.end).getTime() : lockedAtMs;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const from = Math.max(startedAtMs, start);
    const to = Math.min(lockedAtMs, end);
    if (to > from) paused += to - from;
  }
  return Math.max(0, lockedAtMs - startedAtMs - paused);
}

export function currentNumberLineItem(
  state: NumberLineState,
  items: NumberLineItem[],
): NumberLineItem | null {
  return items[state.index] ?? null;
}

export function syncNumberLineClock(state: NumberLineState, now: number): void {
  if (state.stage !== "placing" || state.paused || !state.ends_at) return;
  if (now >= new Date(state.ends_at).getTime()) state.accepting = false;
}

function inRange(item: NumberLineItem, value: number): boolean {
  const eps = Math.max(1e-9, Math.abs(lineSpan(item)) * 1e-9);
  return value >= item.min - eps && value <= item.max + eps;
}

function clampToLine(item: NumberLineItem, value: number): number {
  return Math.min(item.max, Math.max(item.min, value));
}

/**
 * Accept or reject one placement. Does not score.
 * Forged / out-of-range / off-tick / wrong question / after lock / after time all fail.
 */
export function applyNumberLinePlace(
  state: NumberLineState,
  items: NumberLineItem[],
  playerId: string,
  questionId: string,
  value: number,
  lock: boolean,
  now: number,
  requestId: string | null = null,
): { ok: true } | { ok: false; error: string } {
  if (!state.applied_request_ids) state.applied_request_ids = [];
  if (requestId && state.applied_request_ids.includes(requestId)) return { ok: true };
  syncNumberLineClock(state, now);
  if (state.stage !== "placing") return { ok: false, error: "NOT_ACCEPTING" };
  if (state.paused) return { ok: false, error: "PAUSED" };
  const item = currentNumberLineItem(state, items);
  if (!item) return { ok: false, error: "NO_QUESTION" };
  if (questionId !== item.id) return { ok: false, error: "WRONG_QUESTION" };
  if (!state.accepting) return { ok: false, error: "TIME_UP" };
  if (state.ends_at && now > new Date(state.ends_at).getTime()) {
    state.accepting = false;
    return { ok: false, error: "TIME_UP" };
  }
  const prev = state.placements[playerId];
  if (prev?.locked) return { ok: false, error: "LOCKED" };
  if (!Number.isFinite(value)) return { ok: false, error: "INVALID_VALUE" };
  if (!inRange(item, value)) return { ok: false, error: "OUT_OF_RANGE" };
  const stored = clampToLine(item, value);
  if (item.mode === "snap" && !isOnTick(item, stored)) {
    return { ok: false, error: "OFF_TICK" };
  }
  state.placements[playerId] = {
    value: stored,
    locked: lock,
    at: new Date(now).toISOString(),
  };
  if (requestId) {
    state.applied_request_ids.push(requestId);
    if (state.applied_request_ids.length > 4000) {
      state.applied_request_ids.splice(0, state.applied_request_ids.length - 4000);
    }
  }
  return { ok: true };
}

export function scoreNumberLineAwards(
  state: NumberLineState,
  item: NumberLineItem,
  playerIds: string[],
  now: number,
): NlAward[] {
  const totalMs = state.seconds * 1000;
  const started = state.started_at ? new Date(state.started_at).getTime() : now;
  return playerIds.map((playerId) => {
    const placed = state.placements[playerId];
    if (!placed) {
      return {
        player_id: playerId,
        value: null,
        base: 0,
        bonus: 0,
        total: 0,
        exact: false,
        within: false,
      };
    }
    const elapsed = placed.locked
      ? activeElapsedMs(state.pauses, started, new Date(placed.at).getTime())
      : totalMs;
    const parts = scorePlacement(item, placed.value, {
      locked: placed.locked,
      elapsedMs: elapsed,
      totalMs,
    });
    return { player_id: playerId, value: placed.value, ...parts };
  });
}

export type NlQuestionView = {
  id: string;
  prompt: string;
  teks: string;
  mode: NlMode;
  min: number;
  max: number;
  divisions: number;
  number: number;
  total: number;
  /** Null until reveal. */
  answer: number | null;
  /** Null until reveal. */
  tolerance: number | null;
};

export type NlMarkerView = {
  player_id: string;
  display_name: string | null;
  placed: boolean;
  locked: boolean;
  /** Null until reveal. The server stored a value either way. */
  value: number | null;
};

export type NlRankView = {
  player_id: string;
  display_name: string;
  score: number;
};

export type HostNumberLineView = {
  stage: NlStage;
  paused: boolean;
  show_names: boolean;
  seconds: NlSeconds;
  second_choices: number[];
  accepting: boolean;
  started_at: string | null;
  ends_at: string | null;
  paused_remaining_ms: number | null;
  question: NlQuestionView | null;
  locked_count: number;
  joined_count: number;
  markers: NlMarkerView[];
  exact_pct: number | null;
  within_pct: number | null;
  leaderboard: NlRankView[];
  podium: NlRankView[];
};

export type PlayerNumberLineView = {
  stage: NlStage;
  paused: boolean;
  accepting: boolean;
  seconds: NlSeconds;
  started_at: string | null;
  ends_at: string | null;
  paused_remaining_ms: number | null;
  question: NlQuestionView | null;
  my_value: number | null;
  my_locked: boolean;
  my_award: NlAward | null;
  leaderboard: NlRankView[];
  podium: NlRankView[];
};

function questionView(item: NumberLineItem, state: NumberLineState, total: number, reveal: boolean): NlQuestionView {
  return {
    id: item.id,
    prompt: kidPlainText(item.prompt, 280),
    teks: item.teks,
    mode: item.mode,
    min: item.min,
    max: item.max,
    divisions: item.divisions,
    number: state.index + 1,
    total,
    answer: reveal ? item.answer : null,
    tolerance: reveal ? rangeTolerance(item) : null,
  };
}

export function ranksFromPlayers(
  players: { player_id: string; display_name: string; score: number }[],
  limit: number,
): NlRankView[] {
  return players
    .filter((player) => player.player_id !== "host")
    .map((player) => ({
      player_id: player.player_id,
      display_name: kidPlainText(player.display_name, 16),
      score: player.score,
    }))
    .sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name))
    .slice(0, limit);
}

function revealedNow(state: NumberLineState): boolean {
  return state.stage === "reveal" || state.stage === "board";
}

export function hostNumberLineView(
  gameType: string,
  state: NumberLineState | undefined,
  items: NumberLineItem[],
  players: { player_id: string; display_name: string; score: number }[],
): HostNumberLineView | null {
  if (gameType !== "number_line" || !state) return null;
  const students = players.filter((player) => player.player_id !== "host");
  const item = currentNumberLineItem(state, items);
  const reveal = revealedNow(state);
  const names = new Map(players.map((player) => [player.player_id, player.display_name]));
  const locked = students.filter((player) => state.placements[player.player_id]?.locked).length;
  const markers: NlMarkerView[] = students.map((player) => {
    const placed = state.placements[player.player_id];
    return {
      player_id: player.player_id,
      display_name:
        reveal && state.show_names ? kidPlainText(names.get(player.player_id) ?? "Student", 16) : null,
      placed: Boolean(placed),
      locked: Boolean(placed?.locked),
      value: reveal && placed ? placed.value : null,
    };
  });
  let exactPct: number | null = null;
  let withinPct: number | null = null;
  if (reveal && students.length > 0) {
    const exact = state.awards.filter((award) => award.exact).length;
    const within = state.awards.filter((award) => award.within).length;
    exactPct = Math.round((exact / students.length) * 100);
    withinPct = Math.round((within / students.length) * 100);
  }
  return {
    stage: state.stage,
    paused: state.paused,
    show_names: state.show_names,
    seconds: state.seconds,
    second_choices: [...NL_SECONDS],
    accepting: state.accepting && state.stage === "placing" && !state.paused,
    started_at: state.started_at,
    ends_at: state.ends_at,
    paused_remaining_ms: state.paused_remaining_ms,
    question: item ? questionView(item, state, items.length, reveal) : null,
    locked_count: locked,
    joined_count: students.length,
    markers,
    exact_pct: exactPct,
    within_pct: withinPct,
    leaderboard: ranksFromPlayers(players, 5),
    podium: ranksFromPlayers(players, 3),
  };
}

export function playerNumberLineView(
  gameType: string,
  state: NumberLineState | undefined,
  items: NumberLineItem[],
  playerId: string,
  players: { player_id: string; display_name: string; score: number }[],
): PlayerNumberLineView | null {
  if (gameType !== "number_line" || !state) return null;
  const item = currentNumberLineItem(state, items);
  const reveal = revealedNow(state);
  const mine = state.placements[playerId] ?? null;
  const award = reveal ? (state.awards.find((row) => row.player_id === playerId) ?? null) : null;
  return {
    stage: state.stage,
    paused: state.paused,
    accepting: state.accepting && state.stage === "placing" && !state.paused,
    seconds: state.seconds,
    started_at: state.started_at,
    ends_at: state.ends_at,
    paused_remaining_ms: state.paused_remaining_ms,
    question: item ? questionView(item, state, items.length, reveal) : null,
    my_value: mine ? mine.value : null,
    my_locked: Boolean(mine?.locked),
    my_award: award,
    leaderboard: ranksFromPlayers(players, 5),
    podium: ranksFromPlayers(players, 3),
  };
}

/** Host and player board payloads never carry number-line answers. Reveal uses room state. */
export function stripNumberLineAnswers<T extends { number_line_items?: NumberLineItem[] | null }>(
  board: T,
): T {
  return redactNumberLineItems(board, new Set());
}

/** Drop unrevealed answers so a host board payload cannot leak the key. */
export function redactNumberLineItems<T extends { number_line_items?: NumberLineItem[] | null }>(
  board: T,
  revealedIds: ReadonlySet<string>,
): T {
  if (!board.number_line_items) return board;
  return {
    ...board,
    number_line_items: board.number_line_items.map((item) => {
      if (revealedIds.has(item.id)) return item;
      const { answer: _answer, tolerance: _tolerance, ...rest } = item;
      return rest as NumberLineItem;
    }),
  };
}

export function revealedNumberLineIds(state: NumberLineState | undefined): Set<string> {
  if (!state || !revealedNow(state)) return new Set();
  return new Set(state.scored_ids);
}

/** Collect numeric `answer` fields. Tests use this to prove the key is absent. */
export function collectAnswerFields(value: unknown, found: number[] = []): number[] {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const entry of value) collectAnswerFields(entry, found);
    return found;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === "answer" && typeof entry === "number") found.push(entry);
    else collectAnswerFields(entry, found);
  }
  return found;
}
