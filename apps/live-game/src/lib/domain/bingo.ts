import { kidPlainText } from "@/lib/plain-text";

/**
 * Bingo (CUT-2026-11-10). Server-owned cards and taps.
 * A 5×5 card is 24 answers + FREE center. A 4×4 card is 15 answers + one FREE
 * center cell (upper-left of the middle 2×2, because an even grid has no single center).
 * Students may mark only the answer for the call that is open right now.
 */

export const BINGO_LOCKOUT_MS = 3000;
export const BINGO_POINTS_PER_MARK = 100;
export const BINGO_POINTS_WIN = 500;

export type BingoGrid = 4 | 5;
export type BingoEndRule = "first" | "three" | "blackout";
export type BingoStage = "ready" | "calling" | "reveal";

export type BingoItem = {
  id: string;
  prompt: string;
  answer: string;
  teks: string;
};

export type BingoCell = {
  index: number;
  free: boolean;
  answer: string | null;
  item_id: string | null;
  marked: boolean;
};

export type BingoCard = { cells: BingoCell[] };

export type BingoWinner = {
  player_id: string;
  call_index: number;
  patterns: string[];
  blackout: boolean;
};

export type BingoState = {
  grid: BingoGrid;
  end_rule: BingoEndRule;
  paused: boolean;
  /** -1 before the first call. */
  call_index: number;
  stage: BingoStage;
  order: string[];
  called_ids: string[];
  cards: Record<string, BingoCard>;
  /** player_id → epoch ms when the lockout ends. */
  lockouts: Record<string, number>;
  winners: BingoWinner[];
  decided: boolean;
};

export type BingoTapError =
  | "NO_CARD"
  | "HOST_HAS_NO_CARD"
  | "PAUSED"
  | "NOT_CALLED"
  | "LOCKED_OUT"
  | "BAD_CELL"
  | "FREE_CELL"
  | "ALREADY_MARKED"
  | "WRONG";

export function normalizeBingoAnswer(answer: string): string {
  return answer.trim();
}

export function cellsNeeded(grid: BingoGrid): number {
  return grid === 4 ? 15 : 24;
}

/** Upper-left of the center 2×2 on 4×4 (index 5). True center on 5×5 (index 12). */
export function freeCellIndex(grid: BingoGrid): number {
  return grid === 5 ? 12 : 5;
}

export function createBingoState(
  grid: BingoGrid = 5,
  endRule: BingoEndRule = "first",
): BingoState {
  return {
    grid,
    end_rule: endRule,
    paused: false,
    call_index: -1,
    stage: "ready",
    order: [],
    called_ids: [],
    cards: {},
    lockouts: {},
    winners: [],
    decided: false,
  };
}

/**
 * Set builder. 5×5 needs 24 unique numeric answers. 4×4 needs 15.
 * Duplicate answers are rejected with the values named in the message.
 */
export function validateBingoSet(
  items: { answer: string }[],
  grid: BingoGrid,
): { ok: true } | { ok: false; error: string } {
  const answers = items.map((item) => normalizeBingoAnswer(item.answer));
  if (answers.some((answer) => answer.length === 0)) {
    return { ok: false, error: "Every bingo question needs an answer." };
  }
  for (const answer of answers) {
    if (!/^\d+$/.test(answer)) {
      return {
        ok: false,
        error: `Bingo answers must be whole numbers. "${answer}" is not a numeric answer.`,
      };
    }
  }
  const counts = new Map<string, number>();
  for (const answer of answers) counts.set(answer, (counts.get(answer) ?? 0) + 1);
  const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([answer]) => answer);
  if (dupes.length > 0) {
    return {
      ok: false,
      error: `Duplicate answers are not allowed: ${dupes.join(", ")}. Each bingo answer must be unique.`,
    };
  }
  const need = cellsNeeded(grid);
  if (answers.length < need) {
    return {
      ok: false,
      error: `This set has ${answers.length} unique answers. A ${grid}×${grid} bingo card needs at least ${need} unique answers.`,
    };
  }
  return { ok: true };
}

export function bingoItemsFromBoard(board: {
  bingo_items?: BingoItem[] | null;
}): BingoItem[] {
  return board.bingo_items ?? [];
}

export function shuffleCopy<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = out[i]!;
    out[i] = out[j]!;
    out[j] = swap;
  }
  return out;
}

export function cardSignature(card: BingoCard): string {
  return card.cells.map((cell) => (cell.free ? "FREE" : cell.answer)).join("|");
}

export function linePatterns(grid: BingoGrid): { id: string; cells: number[] }[] {
  const n = grid;
  const lines: { id: string; cells: number[] }[] = [];
  for (let r = 0; r < n; r++) {
    lines.push({
      id: `row-${r}`,
      cells: Array.from({ length: n }, (_, c) => r * n + c),
    });
  }
  for (let c = 0; c < n; c++) {
    lines.push({
      id: `col-${c}`,
      cells: Array.from({ length: n }, (_, r) => r * n + c),
    });
  }
  lines.push({
    id: "diag-main",
    cells: Array.from({ length: n }, (_, i) => i * n + i),
  });
  lines.push({
    id: "diag-anti",
    cells: Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)),
  });
  return lines;
}

function cellFilled(cell: BingoCell | undefined): boolean {
  return Boolean(cell && (cell.free || cell.marked));
}

export function completedPatterns(card: BingoCard, grid: BingoGrid): string[] {
  return linePatterns(grid)
    .filter((line) => line.cells.every((index) => cellFilled(card.cells[index])))
    .map((line) => line.id);
}

export function isBlackout(card: BingoCard): boolean {
  return card.cells.every((cell) => cell.free || cell.marked);
}

/** One unmarked square away from a line, and not already holding a line. */
export function isOneAway(card: BingoCard, grid: BingoGrid): boolean {
  if (completedPatterns(card, grid).length > 0) return false;
  return linePatterns(grid).some((line) => {
    let open = 0;
    for (const index of line.cells) {
      if (!cellFilled(card.cells[index])) open += 1;
    }
    return open === 1;
  });
}

export function dealUniqueCard(
  items: BingoItem[],
  grid: BingoGrid,
  rng: () => number,
  used: Set<string>,
): BingoCard {
  const need = cellsNeeded(grid);
  const freeAt = freeCellIndex(grid);
  const size = grid * grid;
  for (let attempt = 0; attempt < 80; attempt++) {
    const picked = shuffleCopy(items, rng).slice(0, need);
    const placed = shuffleCopy(picked, rng);
    const cells: BingoCell[] = [];
    let cursor = 0;
    for (let index = 0; index < size; index++) {
      if (index === freeAt) {
        cells.push({
          index,
          free: true,
          answer: null,
          item_id: null,
          marked: false,
        });
        continue;
      }
      const item = placed[cursor];
      cursor += 1;
      if (!item) throw new Error("DEAL_FAILED");
      cells.push({
        index,
        free: false,
        answer: normalizeBingoAnswer(item.answer),
        item_id: item.id,
        marked: false,
      });
    }
    const card = { cells };
    const signature = cardSignature(card);
    if (!used.has(signature)) return card;
  }
  throw new Error("DEAL_FAILED");
}

export function earlierCallIds(state: BingoState): string[] {
  if (state.called_ids.length === 0) return [];
  if (state.stage === "calling" || state.stage === "reveal") {
    return state.called_ids.slice(0, -1);
  }
  return [...state.called_ids];
}

export function autoMarkEarlier(
  card: BingoCard,
  state: BingoState,
  items: BingoItem[],
): void {
  const earlier = new Set(earlierCallIds(state));
  const answers = new Set(
    items
      .filter((item) => earlier.has(item.id))
      .map((item) => normalizeBingoAnswer(item.answer)),
  );
  for (const cell of card.cells) {
    if (cell.free || cell.marked || !cell.answer) continue;
    if (answers.has(normalizeBingoAnswer(cell.answer))) cell.marked = true;
  }
}

function endRuleMet(state: BingoState): boolean {
  if (state.end_rule === "first") return state.winners.length >= 1;
  if (state.end_rule === "three") return state.winners.length >= 3;
  return state.winners.some((winner) => winner.blackout);
}

function qualifies(state: BingoState, card: BingoCard): { ok: boolean; patterns: string[]; blackout: boolean } {
  const patterns = completedPatterns(card, state.grid);
  const blackout = isBlackout(card);
  const ok = state.end_rule === "blackout" ? blackout : patterns.length > 0;
  return { ok, patterns, blackout };
}

function pushWinner(state: BingoState, playerId: string, callIndex: number, card: BingoCard): boolean {
  if (state.winners.some((winner) => winner.player_id === playerId)) return false;
  const check = qualifies(state, card);
  if (!check.ok) return false;
  state.winners.push({
    player_id: playerId,
    call_index: callIndex,
    patterns: check.patterns,
    blackout: check.blackout,
  });
  state.decided = endRuleMet(state);
  return true;
}

export function startBingo(
  state: BingoState,
  items: BingoItem[],
  playerIds: string[],
  rng: () => number,
): { ok: true } | { ok: false; error: string } {
  const check = validateBingoSet(items, state.grid);
  if (!check.ok) return check;
  state.order = shuffleCopy(items, rng).map((item) => item.id);
  state.call_index = -1;
  state.stage = "ready";
  state.called_ids = [];
  state.cards = {};
  state.lockouts = {};
  state.winners = [];
  state.decided = false;
  state.paused = false;
  const used = new Set<string>();
  try {
    for (const playerId of playerIds) {
      if (playerId === "host") continue;
      const card = dealUniqueCard(items, state.grid, rng, used);
      used.add(cardSignature(card));
      state.cards[playerId] = card;
    }
  } catch {
    return { ok: false, error: "Could not deal a unique bingo card." };
  }
  return { ok: true };
}

/**
 * Late join deals a new unique card and stamps answers from calls that already closed.
 * The open call is left unmarked so the student can still tap it.
 * Reconnect (card already stored) keeps the same cells and marks.
 */
export function dealBingoPlayer(
  state: BingoState,
  items: BingoItem[],
  playerId: string,
  rng: () => number,
): { ok: true; reconnected: boolean } | { ok: false; error: string } {
  if (playerId === "host") return { ok: false, error: "HOST_HAS_NO_CARD" };
  if (state.cards[playerId]) return { ok: true, reconnected: true };
  const check = validateBingoSet(items, state.grid);
  if (!check.ok) return check;
  const used = new Set(Object.values(state.cards).map((card) => cardSignature(card)));
  let card: BingoCard;
  try {
    card = dealUniqueCard(items, state.grid, rng, used);
  } catch {
    return { ok: false, error: "Could not deal a unique bingo card." };
  }
  autoMarkEarlier(card, state, items);
  state.cards[playerId] = card;
  if (!state.decided && state.call_index >= 1) {
    pushWinner(state, playerId, state.call_index - 1, card);
  }
  return { ok: true, reconnected: false };
}

export function currentBingoItem(state: BingoState, items: BingoItem[]): BingoItem | null {
  if (state.stage === "ready" || state.call_index < 0) return null;
  const id = state.order[state.call_index];
  if (!id) return null;
  return items.find((item) => item.id === id) ?? null;
}

export function advanceBingoCall(
  state: BingoState,
  items: BingoItem[],
): { ok: true } | { ok: false; error: string } {
  if (state.paused) return { ok: false, error: "PAUSED" };
  if (state.decided) return { ok: false, error: "GAME_DECIDED" };
  if (state.call_index + 1 >= state.order.length) {
    return { ok: false, error: "NO_MORE_CALLS" };
  }
  state.call_index += 1;
  const id = state.order[state.call_index];
  if (!id || !items.some((item) => item.id === id)) {
    return { ok: false, error: "NO_ITEM" };
  }
  state.stage = "calling";
  state.called_ids.push(id);
  return { ok: true };
}

export function revealBingoCall(
  state: BingoState,
): { ok: true } | { ok: false; error: string } {
  if (state.paused) return { ok: false, error: "PAUSED" };
  if (state.stage !== "calling") return { ok: false, error: "NO_OPEN_CALL" };
  state.stage = "reveal";
  return { ok: true };
}

function calledAnswerSet(state: BingoState, items: BingoItem[]): Set<string> {
  const ids = new Set(state.called_ids);
  return new Set(
    items.filter((item) => ids.has(item.id)).map((item) => normalizeBingoAnswer(item.answer)),
  );
}

/**
 * Authoritative tap. Only the open call's answer marks.
 * A different square locks the student out for 3s and never marks.
 * An answer that has not been called cannot be marked.
 * Extra client fields never reach this function — callers pass a cell index only.
 */
export function applyBingoTap(
  state: BingoState,
  items: BingoItem[],
  playerId: string,
  cellIndex: number,
  nowMs: number,
):
  | { ok: true; newly_won: boolean }
  | { ok: false; error: BingoTapError; lockout_until?: number } {
  if (playerId === "host") return { ok: false, error: "HOST_HAS_NO_CARD" };
  if (state.paused) return { ok: false, error: "PAUSED" };
  const card = state.cards[playerId];
  if (!card) return { ok: false, error: "NO_CARD" };
  const lockUntil = state.lockouts[playerId] ?? 0;
  if (lockUntil > nowMs) {
    return { ok: false, error: "LOCKED_OUT", lockout_until: lockUntil };
  }
  const current = currentBingoItem(state, items);
  if (!current || (state.stage !== "calling" && state.stage !== "reveal")) {
    return { ok: false, error: "NOT_CALLED" };
  }
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= card.cells.length) {
    return { ok: false, error: "BAD_CELL" };
  }
  const cell = card.cells[cellIndex];
  if (!cell) return { ok: false, error: "BAD_CELL" };
  if (cell.free) return { ok: false, error: "FREE_CELL" };
  if (cell.marked) return { ok: false, error: "ALREADY_MARKED" };
  const answer = normalizeBingoAnswer(cell.answer ?? "");
  if (answer !== normalizeBingoAnswer(current.answer)) {
    const until = nowMs + BINGO_LOCKOUT_MS;
    state.lockouts[playerId] = until;
    const called = calledAnswerSet(state, items);
    if (!called.has(answer)) {
      return { ok: false, error: "NOT_CALLED", lockout_until: until };
    }
    return { ok: false, error: "WRONG", lockout_until: until };
  }
  cell.marked = true;
  const newlyWon = pushWinner(state, playerId, state.call_index, card);
  return { ok: true, newly_won: newlyWon };
}

const TAP_KEYS = new Set(["player_id", "cell_index"]);

/** Rejects any body that tries to send a mark, an answer, or any field besides the cell index. */
export function parseBingoTapBody(
  body: unknown,
):
  | { ok: true; player_id: string; cell_index: number }
  | { ok: false; error: "INVALID_BODY" | "FORGED" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "INVALID_BODY" };
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!TAP_KEYS.has(key)) return { ok: false, error: "FORGED" };
  }
  if (typeof record.player_id !== "string" || record.player_id.trim().length < 2) {
    return { ok: false, error: "INVALID_BODY" };
  }
  if (typeof record.cell_index !== "number" || !Number.isInteger(record.cell_index)) {
    return { ok: false, error: "INVALID_BODY" };
  }
  return { ok: true, player_id: record.player_id, cell_index: record.cell_index };
}

/** Host and student end screens. Zero winners is not a bingo. */
export function bingoEndPresentation(winnerCount: number): {
  celebrate: boolean;
  eyebrow: string;
  headline: string;
} {
  if (winnerCount <= 0) {
    return {
      celebrate: false,
      eyebrow: "Game over",
      headline: "No bingo this round",
    };
  }
  return { celebrate: true, eyebrow: "Bingo", headline: "Bingo!" };
}

export function sameCallWinners(winners: BingoWinner[]): BingoWinner[] {
  if (winners.length === 0) return [];
  const call = Math.max(...winners.map((winner) => winner.call_index));
  const group = winners.filter((winner) => winner.call_index === call);
  return group.length >= 2 ? group : [];
}

export type BingoQuestionView = {
  prompt: string;
  teks: string;
  /** Null until the host reveals. */
  answer: string | null;
  call_number: number;
  call_total: number;
};

export type BingoCardView = {
  grid: BingoGrid;
  cells: {
    index: number;
    free: boolean;
    answer: string | null;
    marked: boolean;
  }[];
};

export type HostBingoView = {
  grid: BingoGrid;
  end_rule: BingoEndRule;
  paused: boolean;
  stage: BingoStage;
  decided: boolean;
  call_number: number;
  call_total: number;
  question: BingoQuestionView | null;
  called_log: { call_number: number; prompt: string; answer: string; teks: string }[];
  close_to_bingo: number;
  winners: {
    player_id: string;
    display_name: string;
    call_index: number;
    patterns: string[];
    blackout: boolean;
    card: BingoCardView;
  }[];
  tie_call: number | null;
  players: {
    player_id: string;
    display_name: string;
    marked: number;
    one_away: boolean;
    winner: boolean;
    connected: boolean;
  }[];
  student_count: number;
};

export type PlayerBingoView = {
  grid: BingoGrid;
  end_rule: BingoEndRule;
  paused: boolean;
  stage: BingoStage;
  decided: boolean;
  question: BingoQuestionView | null;
  card: BingoCardView | null;
  lockout_ms: number;
  i_won: boolean;
  my_patterns: string[];
  winner_names: string[];
  marked_count: number;
};

function questionView(
  state: BingoState,
  items: BingoItem[],
  reveal: boolean,
): BingoQuestionView | null {
  const item = currentBingoItem(state, items);
  if (!item) return null;
  return {
    prompt: kidPlainText(item.prompt, 280),
    teks: item.teks,
    answer: reveal ? kidPlainText(normalizeBingoAnswer(item.answer), 12) : null,
    call_number: state.call_index + 1,
    call_total: state.order.length,
  };
}

function cardView(card: BingoCard, grid: BingoGrid): BingoCardView {
  return {
    grid,
    cells: card.cells.map((cell) => ({
      index: cell.index,
      free: cell.free,
      answer: cell.free ? null : cell.answer,
      marked: cell.marked,
    })),
  };
}

export function hostBingoView(
  gameType: string,
  state: BingoState | undefined,
  items: BingoItem[],
  players: { player_id: string; display_name: string; connected: boolean }[],
): HostBingoView | null {
  if (gameType !== "bingo" || !state) return null;
  const students = players.filter((player) => player.player_id !== "host");
  const names = new Map(players.map((player) => [player.player_id, player.display_name]));
  const tie = sameCallWinners(state.winners);
  let close = 0;
  const rows = students.map((player) => {
    const card = state.cards[player.player_id];
    const winner = state.winners.some((row) => row.player_id === player.player_id);
    const oneAway = Boolean(card && !winner && isOneAway(card, state.grid));
    if (oneAway) close += 1;
    return {
      player_id: player.player_id,
      display_name: kidPlainText(player.display_name, 16),
      marked: card ? card.cells.filter((cell) => !cell.free && cell.marked).length : 0,
      one_away: oneAway,
      winner,
      connected: player.connected,
    };
  });
  return {
    grid: state.grid,
    end_rule: state.end_rule,
    paused: state.paused,
    stage: state.stage,
    decided: state.decided,
    call_number: state.call_index + 1,
    call_total: state.order.length,
    question: questionView(state, items, state.stage === "reveal"),
    called_log: state.called_ids
      .map((id, index) => {
        const item = items.find((row) => row.id === id);
        if (!item) return null;
        const open = index === state.called_ids.length - 1 && state.stage === "calling";
        return {
          call_number: index + 1,
          prompt: kidPlainText(item.prompt, 180),
          answer: open ? "" : kidPlainText(normalizeBingoAnswer(item.answer), 12),
          teks: item.teks,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
    close_to_bingo: close,
    winners: state.winners.flatMap((winner) => {
      const card = state.cards[winner.player_id];
      if (!card) return [];
      return [
        {
          player_id: winner.player_id,
          display_name: kidPlainText(names.get(winner.player_id) ?? "Student", 16),
          call_index: winner.call_index,
          patterns: winner.patterns,
          blackout: winner.blackout,
          card: cardView(card, state.grid),
        },
      ];
    }),
    tie_call: tie.length >= 2 ? tie[0]!.call_index : null,
    players: rows,
    student_count: students.length,
  };
}

export function playerBingoView(
  gameType: string,
  state: BingoState | undefined,
  items: BingoItem[],
  playerId: string,
  names: Map<string, string>,
  nowMs = Date.now(),
): PlayerBingoView | null {
  if (gameType !== "bingo" || !state) return null;
  const card = state.cards[playerId] ?? null;
  const mine = state.winners.find((winner) => winner.player_id === playerId);
  const until = state.lockouts[playerId] ?? 0;
  return {
    grid: state.grid,
    end_rule: state.end_rule,
    paused: state.paused,
    stage: state.stage,
    decided: state.decided,
    question: questionView(state, items, state.stage === "reveal"),
    card: card ? cardView(card, state.grid) : null,
    lockout_ms: Math.max(0, until - nowMs),
    i_won: Boolean(mine),
    my_patterns: mine?.patterns ?? [],
    winner_names: state.winners.map((winner) =>
      kidPlainText(names.get(winner.player_id) ?? "Student", 16),
    ),
    marked_count: card ? card.cells.filter((cell) => !cell.free && cell.marked).length : 0,
  };
}
