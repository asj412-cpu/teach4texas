/**
 * Eng proofs for bingo BG-03, BG-04, BG-05, BG-07, BG-08.
 * Run: npx tsx scripts/bingo-proof.ts
 */
import { writeFileSync } from "node:fs";
import { GameBoardSchema } from "@/lib/domain/board";
import { normalizeAccessCode } from "@/lib/domain/access-code";
import {
  BINGO_LOCKOUT_MS,
  advanceBingoCall,
  applyBingoTap,
  cardSignature,
  completedPatterns,
  createBingoState,
  dealBingoPlayer,
  earlierCallIds,
  bingoEndPresentation,
  freeCellIndex,
  isBlackout,
  linePatterns,
  parseBingoTapBody,
  sameCallWinners,
  startBingo,
  validateBingoSet,
  type BingoCard,
  type BingoGrid,
  type BingoItem,
  type BingoState,
} from "@/lib/domain/bingo";
import { buildSampleBingoBoard, DEMO_BINGO_CODE } from "@/lib/fixtures/sample-bingo";
import { redemptionKindFromNormalizedCode } from "@/lib/redemption-kind";

const failures: string[] = [];
function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function itemsFrom(count: number): BingoItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i + 1}`,
    prompt: `What is ${i + 1}?`,
    answer: String(i + 1),
    teks: "3.4(F)",
  }));
}

function blankCard(grid: BingoGrid): BingoCard {
  const free = freeCellIndex(grid);
  const cells = [];
  for (let index = 0; index < grid * grid; index++) {
    cells.push({
      index,
      free: index === free,
      answer: index === free ? null : String(index + 1),
      item_id: index === free ? null : `c${index}`,
      marked: false,
    });
  }
  return { cells };
}

const board = buildSampleBingoBoard();
const parsed = GameBoardSchema.parse(board);
const demoItems = parsed.bingo_items ?? [];

const KEY: { id: string; teks: "3.4(F)" | "3.4(K)"; prompt: string; value: number }[] = [
  { id: "b01", teks: "3.4(F)", prompt: "What is 2 × 5?", value: 2 * 5 },
  { id: "b02", teks: "3.4(F)", prompt: "What is 3 × 4?", value: 3 * 4 },
  { id: "b03", teks: "3.4(F)", prompt: "What is 3 × 5?", value: 3 * 5 },
  { id: "b04", teks: "3.4(F)", prompt: "What is 2 × 8?", value: 2 * 8 },
  { id: "b05", teks: "3.4(F)", prompt: "What is 3 × 6?", value: 3 * 6 },
  { id: "b06", teks: "3.4(F)", prompt: "What is 4 × 5?", value: 4 * 5 },
  { id: "b07", teks: "3.4(F)", prompt: "What is 3 × 7?", value: 3 * 7 },
  { id: "b08", teks: "3.4(F)", prompt: "What is 4 × 6?", value: 4 * 6 },
  { id: "b09", teks: "3.4(F)", prompt: "What is 5 × 5?", value: 5 * 5 },
  { id: "b10", teks: "3.4(F)", prompt: "What is 3 × 9?", value: 3 * 9 },
  { id: "b11", teks: "3.4(F)", prompt: "What is 4 × 7?", value: 4 * 7 },
  { id: "b12", teks: "3.4(F)", prompt: "What is 5 × 6?", value: 5 * 6 },
  { id: "b13", teks: "3.4(F)", prompt: "What is 5 × 7?", value: 5 * 7 },
  { id: "b14", teks: "3.4(F)", prompt: "What is 6 × 6?", value: 6 * 6 },
  { id: "b15", teks: "3.4(F)", prompt: "What is 5 × 8?", value: 5 * 8 },
  { id: "b16", teks: "3.4(F)", prompt: "What is 6 × 7?", value: 6 * 7 },
  { id: "b17", teks: "3.4(F)", prompt: "What is 5 × 9?", value: 5 * 9 },
  { id: "b18", teks: "3.4(F)", prompt: "What is 7 × 7?", value: 7 * 7 },
  { id: "b19", teks: "3.4(F)", prompt: "What is 6 × 9?", value: 6 * 9 },
  { id: "b20", teks: "3.4(F)", prompt: "What is 7 × 8?", value: 7 * 8 },
  { id: "b21", teks: "3.4(F)", prompt: "What is 14 ÷ 2?", value: 14 / 2 },
  { id: "b22", teks: "3.4(F)", prompt: "What is 18 ÷ 2?", value: 18 / 2 },
  { id: "b23", teks: "3.4(F)", prompt: "What is 20 ÷ 5?", value: 20 / 5 },
  { id: "b24", teks: "3.4(F)", prompt: "What is 32 ÷ 4?", value: 32 / 4 },
  { id: "b25", teks: "3.4(K)", prompt: "A garden has 7 rows of 9 flowers. How many flowers are in the garden?", value: 7 * 9 },
  { id: "b26", teks: "3.4(K)", prompt: "There are 8 rows of 8 chairs. How many chairs are there?", value: 8 * 8 },
  { id: "b27", teks: "3.4(K)", prompt: "Ms. Diaz packs 7 boxes with 10 crayons in each box. How many crayons is that?", value: 7 * 10 },
  { id: "b28", teks: "3.4(K)", prompt: "A sticker sheet has 8 rows of 9 stickers. How many stickers are on the sheet?", value: 8 * 9 },
  { id: "b29", teks: "3.4(K)", prompt: "A classroom has 8 tables with 10 folders on each table. How many folders are there?", value: 8 * 10 },
  { id: "b30", teks: "3.4(K)", prompt: "Nine friends each bring 10 pencils to class. How many pencils do they bring in all?", value: 9 * 10 },
];

check(demoItems.length === 30, `expected 30 demo calls, got ${demoItems.length}`);
check(parsed.grade === 3 && parsed.subject === "math" && parsed.game_type === "bingo", "demo board is grade 3 math bingo");
const answers = new Set<string>();
for (const row of KEY) {
  const item = demoItems.find((entry) => entry.id === row.id);
  check(Boolean(item), `missing ${row.id}`);
  if (!item) continue;
  check(item.prompt === row.prompt, `${row.id} prompt mismatch`);
  check(item.teks === row.teks, `${row.id} teks mismatch`);
  check(item.answer === String(row.value), `${row.id} key ${item.answer} !== ${row.value}`);
  check(row.value <= 100 && row.value >= 0 && Number.isInteger(row.value), `${row.id} out of 10×10 / 100`);
  answers.add(item.answer);
}
check(answers.size === 30, `demo answers not unique (${answers.size})`);
check(KEY.filter((row) => row.teks === "3.4(F)").length > 0 && KEY.filter((row) => row.teks === "3.4(K)").length > 0, "both TEKS present");
check(!demoItems.some((item) => /https?:|www\.|@|kill|weapon|gun|beer/i.test(item.prompt)), "demo copy is kid-safe");
check(redemptionKindFromNormalizedCode(normalizeAccessCode(DEMO_BINGO_CODE)) === "demo", "demo code must not classify as paid");

const tooFew = validateBingoSet(itemsFrom(23), 5);
const tooFew4 = validateBingoSet(itemsFrom(14), 4);
const dupes = validateBingoSet(
  [...itemsFrom(24), { ...itemsFrom(1)[0]!, id: "dup", answer: "1" }],
  5,
);
check(!tooFew.ok && tooFew.ok === false && tooFew.error.includes("24"), `5×5 too-few error: ${JSON.stringify(tooFew)}`);
check(!tooFew4.ok && tooFew4.ok === false && tooFew4.error.includes("15"), `4×4 too-few error: ${JSON.stringify(tooFew4)}`);
check(!dupes.ok && dupes.ok === false && dupes.error.includes("Duplicate"), `duplicate error: ${JSON.stringify(dupes)}`);

let schemaTooFew = "";
let schemaDupe = "";
try {
  GameBoardSchema.parse({ ...board, bingo_items: itemsFrom(10) });
} catch (err) {
  schemaTooFew = err instanceof Error ? err.message : String(err);
}
try {
  const cloned = itemsFrom(24);
  cloned[1] = { ...cloned[1]!, answer: cloned[0]!.answer };
  GameBoardSchema.parse({ ...board, bingo_items: cloned });
} catch (err) {
  schemaDupe = err instanceof Error ? err.message : String(err);
}
check(schemaTooFew.includes("24"), `schema too-few missing: ${schemaTooFew}`);
check(schemaDupe.includes("Duplicate"), `schema dupe missing: ${schemaDupe}`);

function dumpCards(grid: 4 | 5) {
  const state = createBingoState(grid, "first");
  const ids = Array.from({ length: 30 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);
  const started = startBingo(state, demoItems, ids, mulberry(grid * 1000 + 7));
  check(started.ok, `deal ${grid} failed`);
  const cards = ids.map((id) => {
    const card = state.cards[id]!;
    const free = card.cells.filter((cell) => cell.free);
    const filled = card.cells.filter((cell) => !cell.free);
    check(card.cells.length === grid * grid, `${id} size`);
    check(free.length === 1 && free[0]!.index === freeCellIndex(grid), `${id} FREE center`);
    check(filled.length === (grid === 5 ? 24 : 15), `${id} answer count`);
    check(new Set(filled.map((cell) => cell.answer)).size === filled.length, `${id} in-card dupes`);
    check(filled.every((cell) => answers.has(cell.answer ?? "")), `${id} off-set answer`);
    check(!state.cards.host, "host must not have a card");
    return {
      player: id,
      signature: cardSignature(card),
      cells: card.cells.map((cell) => (cell.free ? "FREE" : cell.answer)),
    };
  });
  const sigs = new Set(cards.map((card) => card.signature));
  check(sigs.size === 30, `${grid}×${grid} cards not unique (${sigs.size})`);
  return { grid, players: 30, unique: sigs.size === 30, free_index: freeCellIndex(grid), cards };
}

const cards5 = dumpCards(5);
const cards4 = dumpCards(4);

const patternLog: { grid: BingoGrid; id: string; detected: string[] }[] = [];
for (const grid of [5, 4] as BingoGrid[]) {
  for (const line of linePatterns(grid)) {
    const card = blankCard(grid);
    for (const index of line.cells) {
      const cell = card.cells[index]!;
      if (!cell.free) cell.marked = true;
    }
    const detected = completedPatterns(card, grid);
    patternLog.push({ grid, id: line.id, detected });
    check(detected.length === 1 && detected[0] === line.id, `${grid} pattern ${line.id} → ${detected.join(",")}`);
  }
}

function arm(state: BingoState, items: BingoItem[], playerId: string, card: BingoCard) {
  state.cards[playerId] = card;
  state.order = items.map((item) => item.id);
  state.stage = "ready";
  state.call_index = -1;
  state.called_ids = [];
  state.winners = [];
  state.decided = false;
  state.paused = false;
  state.lockouts = {};
}

function place(items: BingoItem[], grid: BingoGrid, slots: { index: number; item: BingoItem }[]): BingoCard {
  const card = blankCard(grid);
  for (const slot of slots) {
    const cell = card.cells[slot.index]!;
    cell.free = false;
    cell.answer = slot.item.answer;
    cell.item_id = slot.item.id;
    cell.marked = false;
  }
  const free = freeCellIndex(grid);
  const freeCell = card.cells[free]!;
  freeCell.free = true;
  freeCell.answer = null;
  freeCell.item_id = null;
  freeCell.marked = false;
  return card;
}

const pool = itemsFrom(30);
const tapLog: Record<string, unknown>[] = [];

function runTap(label: string, state: BingoState, playerId: string, cell: number, now: number) {
  const before = JSON.stringify(state.cards[playerId]);
  const result = applyBingoTap(state, pool, playerId, cell, now);
  tapLog.push({
    case: label,
    result,
    marked_after: state.cards[playerId]?.cells[cell]?.marked ?? null,
    card_unchanged: JSON.stringify(state.cards[playerId]) === before,
  });
  return result;
}

{
  const state = createBingoState(5, "first");
  const card = place(pool, 5, [
    { index: 0, item: pool[0]! },
    { index: 1, item: pool[1]! },
  ]);
  arm(state, pool, "p1", card);
  advanceBingoCall(state, pool);
  const correct = runTap("correct", state, "p1", 0, 1_000);
  check(correct.ok === true && state.cards.p1!.cells[0]!.marked, "correct tap should mark");
  const uncalled = runTap("uncalled", state, "p1", 1, 1_100);
  check(
    !uncalled.ok && uncalled.ok === false && uncalled.error === "NOT_CALLED" && !state.cards.p1!.cells[1]!.marked,
    "uncalled answer must not mark",
  );
  check(
    !uncalled.ok && uncalled.ok === false && uncalled.lockout_until === 1_100 + BINGO_LOCKOUT_MS,
    "wrong square lockout is 3s",
  );
  const during = runTap("during_lockout", state, "p1", 1, 1_100 + 500);
  check(!during.ok && during.ok === false && during.error === "LOCKED_OUT", "lockout blocks taps");
  advanceBingoCall(state, pool);
  const wrong = runTap("wrong_previous_call", state, "p1", 0, 5_000);
  check(!wrong.ok && wrong.ok === false && wrong.error === "ALREADY_MARKED", "already marked stays marked");
  const fresh = place(pool, 5, [
    { index: 0, item: pool[0]! },
    { index: 1, item: pool[1]! },
  ]);
  fresh.cells[0]!.marked = false;
  state.cards.p2 = fresh;
  const wrongOpen = applyBingoTap(state, pool, "p2", 0, 5_000);
  check(
    !wrongOpen.ok && wrongOpen.ok === false && wrongOpen.error === "WRONG" && wrongOpen.lockout_until === 5_000 + BINGO_LOCKOUT_MS,
    `previous-call square is WRONG + 3s, got ${JSON.stringify(wrongOpen)}`,
  );
  check(state.cards.p2!.cells[0]!.marked === false, "WRONG does not mark");
}

const forgedBody = {
  player_id: "p1",
  cell_index: 1,
  marked: true,
  answer: "2",
  force: true,
};
const forged = parseBingoTapBody(forgedBody);
check(!forged.ok && forged.ok === false && forged.error === "FORGED", "forged body rejected");
const forgedState = createBingoState(5, "first");
const forgedCard = place(pool, 5, [{ index: 1, item: pool[1]! }]);
arm(forgedState, pool, "p1", forgedCard);
advanceBingoCall(forgedState, pool);
const beforeForge = JSON.stringify(forgedState.cards.p1);
if (forged.ok) {
  applyBingoTap(forgedState, pool, forged.player_id, forged.cell_index, 10);
}
check(JSON.stringify(forgedState.cards.p1) === beforeForge, "forged request must not change the card");
tapLog.push({ case: "forged", body_keys: Object.keys(forgedBody), result: forged, card_unchanged: true });

const badIndex = applyBingoTap(forgedState, pool, "p1", 99, 10);
check(!badIndex.ok && badIndex.ok === false && badIndex.error === "BAD_CELL", "out-of-range cell rejected");
const hostTap = applyBingoTap(forgedState, pool, "host", 0, 10);
check(!hostTap.ok && hostTap.ok === false && hostTap.error === "HOST_HAS_NO_CARD", "host has no card");

function winnerSummary(state: BingoState) {
  return {
    decided: state.decided,
    winners: state.winners.map((winner) => ({
      player_id: winner.player_id,
      call_index: winner.call_index,
      patterns: winner.patterns,
      blackout: winner.blackout,
    })),
    tie: sameCallWinners(state.winners).map((winner) => winner.player_id),
  };
}

const endLog: Record<string, unknown> = {};

{
  const state = createBingoState(5, "first");
  const a = place(pool, 5, [{ index: 0, item: pool[0]! }]);
  const b = place(pool, 5, [
    { index: 3, item: pool[0]! },
    { index: 4, item: pool[8]! },
  ]);
  for (const index of [1, 2, 3, 4]) a.cells[index]!.marked = true;
  for (const index of [0, 1, 2, 4]) b.cells[index]!.marked = true;
  arm(state, pool, "a", a);
  state.cards.b = b;
  advanceBingoCall(state, pool);
  const first = applyBingoTap(state, pool, "a", 0, 100);
  const second = applyBingoTap(state, pool, "b", 3, 120);
  endLog.first = { first, second, ...winnerSummary(state) };
  check(first.ok === true && second.ok === true, "same-call taps both apply");
  check(state.decided && state.winners.length === 2, "first rule keeps both same-call winners");
  check(state.winners.every((winner) => winner.call_index === state.call_index), "tie shares the call");
  check(sameCallWinners(state.winners).length === 2, "tie group shows both");
  const blocked = advanceBingoCall(state, pool);
  check(!blocked.ok && blocked.ok === false && blocked.error === "GAME_DECIDED", "first bingo blocks the next call");
}

{
  const state = createBingoState(5, "three");
  const seats = [
    ["a", 0],
    ["b", 1],
    ["c", 2],
    ["d", 2],
  ] as const;
  for (const [id, n] of seats) {
    const card = place(pool, 5, [{ index: 0, item: pool[n]! }]);
    for (const index of [1, 2, 3, 4]) card.cells[index]!.marked = true;
    state.cards[id] = card;
  }
  state.order = pool.map((item) => item.id);
  for (const id of ["a", "b", "c"]) {
    advanceBingoCall(state, pool);
    applyBingoTap(state, pool, id, 0, 200);
  }
  check(state.decided && state.winners.length === 3, "three-winner rule ends at 3");
  const fourth = applyBingoTap(state, pool, "d", 0, 250);
  endLog.three = { fourth, ...winnerSummary(state) };
  check(fourth.ok === true && state.winners.length === 4, "same-call fourth winner is kept");
  check(state.winners.filter((winner) => winner.call_index === state.call_index).length === 2, "c and d tie the third call");
}

{
  const state = createBingoState(4, "blackout");
  const last = pool[14]!;
  function almost(id: string) {
    const card = blankCard(4);
    card.cells.forEach((cell, index) => {
      if (cell.free) return;
      const item = index === 0 ? last : pool[index]!;
      cell.answer = item.answer;
      cell.item_id = item.id;
      cell.marked = index !== 0;
    });
    state.cards[id] = card;
  }
  almost("a");
  almost("b");
  state.order = [last.id, ...pool.filter((item) => item.id !== last.id).map((item) => item.id)];
  check(completedPatterns(state.cards.a!, 4).length > 0, "blackout setup already has a line");
  check(!isBlackout(state.cards.a!), "not a blackout yet");
  check(!state.decided, "a line does not end blackout");
  advanceBingoCall(state, pool);
  applyBingoTap(state, pool, "a", 0, 300);
  const beforeSecond = state.decided;
  applyBingoTap(state, pool, "b", 0, 320);
  endLog.blackout = { line_did_not_end: true, after_first: beforeSecond, ...winnerSummary(state) };
  check(beforeSecond && state.winners.length === 2, "both blackouts on the same call count");
  check(state.winners.every((winner) => winner.blackout), "blackout flag set");
}

{
  const items = demoItems.slice(0, 24);
  const state = createBingoState(5, "three");
  const started = startBingo(state, items, ["early"], mulberry(42));
  check(started.ok, "late-join room should deal");
  advanceBingoCall(state, items);
  advanceBingoCall(state, items);
  const earlier = new Set(earlierCallIds(state));
  const current = state.called_ids[state.called_ids.length - 1];
  const joined = dealBingoPlayer(state, items, "late", mulberry(99));
  check(joined.ok === true && joined.ok && joined.reconnected === false, "late join deals a card");
  const late = state.cards.late!;
  const heldEarlier = late.cells.filter((cell) => cell.item_id && earlier.has(cell.item_id));
  const heldCurrent = late.cells.filter((cell) => cell.item_id === current);
  check(heldEarlier.length >= 1 && heldEarlier.every((cell) => cell.marked), "earlier calls auto-mark");
  check(heldCurrent.length === 1 && heldCurrent.every((cell) => !cell.marked), "open call is not auto-marked");
  const marked = late.cells.filter((cell) => cell.marked).length;
  late.cells[3]!.marked = true;
  const snapshot = JSON.stringify(late);
  const again = dealBingoPlayer(state, items, "late", mulberry(100));
  check(again.ok === true && again.ok && again.reconnected === true, "reconnect reuses the player");
  check(JSON.stringify(state.cards.late) === snapshot, "reconnect keeps the card and marks");
  endLog.late_join = {
    earlier_marked: heldEarlier.map((cell) => cell.answer),
    open_call_unmarked: heldCurrent.map((cell) => cell.answer),
    marks_before_reconnect: marked,
    reconnected: true,
  };
}

const samples: number[] = [];
for (let room = 0; room < 3; room++) {
  const state = createBingoState(5, "blackout");
  const ids = Array.from({ length: 30 }, (_, i) => `r${room}p${i}`);
  startBingo(state, demoItems, ids, mulberry(5000 + room));
  advanceBingoCall(state, demoItems);
  for (const id of ids) {
    const card = state.cards[id]!;
    const cell = card.cells.find((entry) => !entry.free);
    const t0 = performance.now();
    applyBingoTap(state, demoItems, id, cell!.index, 10_000 + room);
    samples.push(performance.now() - t0);
  }
}
samples.sort((a, b) => a - b);
const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))]!;

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
function contrast(a: string, b: string) {
  const L1 = lum(a);
  const L2 = lum(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
const pairs = [
  ["host question white", "#ffffff", "#052e22", 4.5],
  ["ball number", "#1c1917", "#fde047", 4.5],
  ["card number", "#1c1917", "#ffffff", 4.5],
  ["free label", "#14532d", "#fde68a", 4.5],
  ["stamp banner", "#ffffff", "#991b1b", 4.5],
  ["lockout", "#ffffff", "#7f1d1d", 4.5],
  ["close chip", "#1c1917", "#fde047", 4.5],
  ["called log", "#ffffff", "#052e22", 4.5],
] as const;
const noWin = bingoEndPresentation(0);
const oneWin = bingoEndPresentation(1);
check(noWin.celebrate === false, "0 winners must not celebrate");
check(noWin.eyebrow === "Game over" && noWin.headline === "No bingo this round", "0-winner copy");
check(noWin.headline !== "Bingo!" && noWin.eyebrow !== "Bingo", "0 winners must not use the bingo celebration");
check(oneWin.celebrate === true && oneWin.headline === "Bingo!", "1 winner keeps the bingo celebration");
endLog.zero_winners = noWin;

const contrastLog = pairs.map(([name, fg, bg, min]) => {
  const ratio = Number(contrast(fg, bg).toFixed(2));
  check(ratio >= min, `${name} contrast ${ratio} < ${min}`);
  return { name, fg, bg, ratio, min };
});

const report = {
  ok: failures.length === 0,
  failures,
  bg03: { cards_5x5: cards5, cards_4x4: cards4 },
  bg04: tapLog,
  bg05: { patterns: patternLog, ends: endLog },
  bg07: endLog.late_join,
  bg08: {
    questions: demoItems.length,
    unique_answers: answers.size,
    teks: { "3.4(F)": KEY.filter((row) => row.teks === "3.4(F)").length, "3.4(K)": KEY.filter((row) => row.teks === "3.4(K)").length },
    redemption_kind: redemptionKindFromNormalizedCode(normalizeAccessCode(DEMO_BINGO_CODE)),
    validator: {
      too_few_5: tooFew.ok ? null : tooFew.error,
      too_few_4: tooFew4.ok ? null : tooFew4.error,
      duplicate: dupes.ok ? null : dupes.error,
      schema_too_few: schemaTooFew.includes("24"),
      schema_duplicate: schemaDupe.includes("Duplicate"),
    },
  },
  bg09_contrast: contrastLog,
  bg10_domain_ms: { taps: samples.length, p95, max: samples[samples.length - 1] },
};

const outPath = "/opt/cursor/artifacts/bingo-proof.json";
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, failures, p95, contrast: contrastLog, validator: report.bg08.validator }, null, 2));
if (failures.length) process.exit(1);
