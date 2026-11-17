import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NumberLineStartCard } from "@/components/number-line/start-card";
import { GameBoardSchema, supportsNumberLine } from "@/lib/domain/board";
import {
  sanitizeForHost,
  sanitizeForPlayer,
  type LiveRoom,
} from "@/lib/domain/live-room";
import {
  activeElapsedMs,
  applyNumberLinePlace,
  buildNumberLineReveal,
  collectAnswerFields,
  createNumberLineState,
  hostNumberLineView,
  parseNumberLinePlaceBody,
  playerNumberLineView,
  scoreNumberLineAwards,
  scorePlacement,
  snapTickIndex,
  speedBonus,
  stripNumberLineAnswers,
  supportsHostNumberLine,
  tickLabelCap,
  tickValue,
  lineLabelIndexes,
  flushMarkerArrow,
  queueMarkerArrow,
  studentRailWidth,
  tickLabelBox,
  validateNumberLineItem,
  visibleTickIndexes,
  NL_MAX_BONUS,
  type NumberLineItem,
  type NumberLineState,
} from "@/lib/domain/number-line";
import {
  boxesOverlap,
  contrastRatio,
  flagBottomY,
  hostBarControlRights,
  hostClearY,
  hostPageHeight,
  layoutNumberLineReveal,
  lineFoldY,
  lobbyStartTop,
  NL_BAR_GAP_PX,
  NL_CONTROLS_PX,
  NL_CHROME_MOBILE_PX,
  NL_DOT_MIN_PX,
  NL_GROUP_WINDOW_PX,
  NL_LABELS_PX,
  NL_MOBILE_VIEWPORT_PX,
  NL_NAME_BG,
  NL_NAME_FG,
  NL_NAME_FONT_PX,
  NL_RAIL_PX,
  NL_VIEWPORT_H_PX,
  type Box,
  type NameLayoutDot,
  type RevealLeader,
} from "@/lib/domain/number-line-layout";
import {
  applyNumberLineDemo,
  numberLineDemoContentHash,
  NUMBER_LINE_DEMO_VERSION,
  planNumberLineDemoCode,
} from "@/lib/fixtures/number-line-demo-seed";
import {
  buildSampleNumberLineBoard,
  checkNumberLineDemoKey,
  NUMBER_LINE_SAMPLE_BOARD_ID,
  SAMPLE_NUMBER_LINE_ITEMS,
} from "@/lib/fixtures/sample-number-line";
import { toHostBoardView } from "@/lib/store-file";

const rangeItem: NumberLineItem = {
  id: "q-range",
  prompt: "Round 640 to the nearest hundred. Place that hundred.",
  teks: "3.2(C)",
  mode: "range",
  min: 0,
  max: 1000,
  divisions: 10,
  answer: 600,
};

const snapItem: NumberLineItem = {
  id: "q-snap",
  prompt: "Place three fourths on the number line.",
  teks: "3.3(B)",
  mode: "snap",
  min: 0,
  max: 1,
  divisions: 4,
  answer: tickValue({ min: 0, max: 1, divisions: 4 }, 3),
};

function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    out.push(value);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const entry of value) numbersIn(entry, out);
    return out;
  }
  for (const entry of Object.values(value as Record<string, unknown>)) numbersIn(entry, out);
  return out;
}

function roomFor(item: NumberLineItem, state: NumberLineState): LiveRoom {
  const now = new Date().toISOString();
  return {
    code: "ABCD23",
    board_id: "nl-test",
    board: {
      id: "nl-test",
      title: "Number line test",
      grade: 3,
      subject: "math",
      status: "ready",
      game_type: "number_line",
      cells: [],
      number_line_items: [item, { ...rangeItem, id: "later", answer: 900, prompt: "Later item" }],
      created_at: now,
      updated_at: now,
    },
    game_type: "number_line",
    host_token_hash: "hash",
    phase: "number_line",
    players: {
      host: {
        player_id: "host",
        display_name: "host",
        score: 0,
        connected: true,
        resume_secret_hash: "h",
      },
      ada: {
        player_id: "ada",
        display_name: "Ada",
        score: 40,
        connected: true,
        resume_secret_hash: "a",
      },
    },
    active_cell_id: null,
    used_cell_ids: [],
    answers: {},
    points_awarded: {},
    match_states: {},
    race_states: {},
    race_ends_at: null,
    scavenger_states: {},
    scavenger_index: 0,
    sequence_states: {},
    sequence_index: 0,
    category_states: {},
    category_index: 0,
    odd_states: {},
    odd_index: 0,
    dash_states: {},
    dash_index: 0,
    vault_states: {},
    vault_room_index: 0,
    vault_puzzle_index: 0,
    vault_revealed: false,
    vault_unlocked_rooms: [],
    vault_started_at: null,
    number_line: state,
    open_until: null,
    answer_seconds: 30,
    lobby_locked: false,
    created_at: now,
    ended_at: null,
  };
}

test("NL-04 snap scores the exact tick only", () => {
  const timing = { locked: false, elapsedMs: 0, totalMs: 30_000 };
  const exact = scorePlacement(snapItem, snapItem.answer, timing);
  assert.equal(exact.base, 1000);
  assert.equal(exact.exact, true);
  const neighbor = scorePlacement(snapItem, tickValue(snapItem, 2), timing);
  assert.equal(neighbor.base, 0);
  assert.equal(neighbor.total, 0);
  assert.equal(neighbor.exact, false);
  const off = scorePlacement(snapItem, 0.8, timing);
  assert.equal(off.base, 0);
});

test("NL-04 range falls linearly to the tolerance and is zero outside", () => {
  const timing = { locked: false, elapsedMs: 0, totalMs: 30_000 };
  assert.equal(scorePlacement(rangeItem, 600, timing).base, 1000);
  assert.equal(scorePlacement(rangeItem, 650, timing).base, 500);
  assert.equal(scorePlacement(rangeItem, 700, timing).base, 0);
  assert.equal(scorePlacement(rangeItem, 700, timing).within, false);
  assert.equal(scorePlacement(rangeItem, 699, timing).within, true);
  assert.equal(scorePlacement(rangeItem, 701, timing).base, 0);
  assert.equal(scorePlacement(rangeItem, 701, timing).within, false);
  const custom = scorePlacement({ ...rangeItem, tolerance: 50 }, 625, timing);
  assert.equal(custom.base, 500);
});

test("NL-04 speed bonus never exceeds 200 and skips misses", () => {
  for (let elapsed = -10_000; elapsed <= 40_000; elapsed += 250) {
    const bonus = speedBonus({
      eligible: true,
      locked: true,
      elapsedMs: elapsed,
      totalMs: 15_000,
    });
    assert.ok(bonus <= NL_MAX_BONUS);
    assert.ok(bonus >= 0);
  }
  const fast = scorePlacement(snapItem, snapItem.answer, {
    locked: true,
    elapsedMs: 0,
    totalMs: 15_000,
  });
  assert.equal(fast.bonus, 200);
  assert.equal(fast.total, 1200);
  const late = scorePlacement(rangeItem, 650, {
    locked: true,
    elapsedMs: 15_000,
    totalMs: 15_000,
  });
  assert.equal(late.base, 500);
  assert.equal(late.bonus, 0);
  const unlocked = scorePlacement(rangeItem, 600, {
    locked: false,
    elapsedMs: 0,
    totalMs: 15_000,
  });
  assert.equal(unlocked.bonus, 0);
  const miss = scorePlacement(snapItem, tickValue(snapItem, 1), {
    locked: true,
    elapsedMs: 0,
    totalMs: 15_000,
  });
  assert.equal(miss.bonus, 0);
  assert.equal(miss.total, 0);
});

test("NL-04 client payloads omit the answer before reveal", () => {
  const state = createNumberLineState(30);
  state.stage = "placing";
  state.accepting = true;
  state.started_at = new Date().toISOString();
  state.ends_at = new Date(Date.now() + 30_000).toISOString();
  const placed = applyNumberLinePlace(state, [rangeItem], "ada", rangeItem.id, 400, true, Date.now());
  assert.equal(placed.ok, true);
  const room = roomFor(rangeItem, state);
  const host = sanitizeForHost(room);
  const player = sanitizeForPlayer(room, "ada");
  assert.ok(player);
  assert.equal(host.number_line?.question?.answer, null);
  assert.equal(player?.number_line?.question?.answer, null);
  assert.equal(host.number_line?.question?.tolerance, null);
  assert.equal(player?.number_line?.my_value, 400);
  assert.equal(host.number_line?.markers[0]?.value, null);
  assert.deepEqual(collectAnswerFields(host), []);
  assert.deepEqual(collectAnswerFields(player), []);
  const leaked = [...numbersIn(host), ...numbersIn(player)].filter((n) => n === 600 || n === 900);
  assert.deepEqual(leaked, []);
  const directHost = hostNumberLineView("number_line", state, [rangeItem], [
    { player_id: "ada", display_name: "Ada", score: 40 },
  ]);
  const directPlayer = playerNumberLineView(
    "number_line",
    state,
    [rangeItem],
    "ada",
    [{ player_id: "ada", display_name: "Ada", score: 40 }],
  );
  assert.equal(directHost?.question?.answer, null);
  assert.equal(directPlayer?.question?.answer, null);
});

test("NL-04 reveal is the first payload that carries the answer", () => {
  const state = createNumberLineState(30);
  state.stage = "placing";
  state.accepting = true;
  const now = Date.now();
  state.started_at = new Date(now).toISOString();
  state.ends_at = new Date(now + 30_000).toISOString();
  applyNumberLinePlace(state, [rangeItem], "ada", rangeItem.id, 600, true, now);
  const awards = scoreNumberLineAwards(state, rangeItem, ["ada"], now);
  assert.equal(awards[0]?.total, 1200);
  state.awards = awards;
  state.scored_ids = [rangeItem.id];
  state.stage = "reveal";
  const room = roomFor(rangeItem, state);
  room.players.ada!.score = 1200;
  const host = sanitizeForHost(room);
  const player = sanitizeForPlayer(room, "ada");
  assert.equal(host.number_line?.question?.answer, 600);
  assert.equal(player?.number_line?.question?.answer, 600);
  assert.equal(host.number_line?.markers[0]?.value, 600);
  assert.equal(host.number_line?.exact_pct, 100);
  assert.equal(host.board.number_line_items, undefined);
  assert.equal(JSON.stringify(host.board).includes("Later item"), false);
});

test("NL-04 rejects forged, out-of-range, off-tick, wrong question, lock, and time", () => {
  assert.equal(parseNumberLinePlaceBody({ player_id: "ada", question_id: "q-range", value: 10, extra: 1 }).ok, false);
  assert.equal(
    (parseNumberLinePlaceBody({ player_id: "ada", question_id: "q-range", value: 10, extra: 1 }) as { error: string }).error,
    "FORGED",
  );
  assert.equal(parseNumberLinePlaceBody({ player_id: "ada", question_id: "q-range", value: Number.NaN }).ok, false);
  assert.equal(
    parseNumberLinePlaceBody({ player_id: "ada", question_id: "q-range", value: "600" }).ok,
    false,
  );

  const state = createNumberLineState(15);
  state.stage = "placing";
  state.accepting = true;
  const now = 1_700_000_000_000;
  state.started_at = new Date(now).toISOString();
  state.ends_at = new Date(now + 15_000).toISOString();
  const items = [rangeItem, snapItem];

  assert.equal(applyNumberLinePlace(state, items, "ada", "nope", 600, false, now).ok, false);
  assert.equal(
    (applyNumberLinePlace(state, items, "ada", "nope", 600, false, now) as { error: string }).error,
    "WRONG_QUESTION",
  );
  assert.equal(
    (applyNumberLinePlace(state, items, "ada", rangeItem.id, 1001, false, now) as { error: string }).error,
    "OUT_OF_RANGE",
  );
  assert.equal(
    (applyNumberLinePlace(state, items, "ada", rangeItem.id, -1, false, now) as { error: string }).error,
    "OUT_OF_RANGE",
  );

  state.index = 1;
  assert.equal(
    (applyNumberLinePlace(state, items, "ada", snapItem.id, 0.2, false, now) as { error: string }).error,
    "OFF_TICK",
  );
  assert.equal(applyNumberLinePlace(state, items, "ada", snapItem.id, snapItem.answer, true, now).ok, true);
  assert.equal(state.placements.ada?.value, snapItem.answer);
  assert.equal(
    (applyNumberLinePlace(state, items, "ada", snapItem.id, tickValue(snapItem, 1), true, now) as { error: string }).error,
    "LOCKED",
  );
  assert.equal(state.placements.ada?.value, snapItem.answer);

  const open = createNumberLineState(15);
  open.stage = "placing";
  open.accepting = true;
  open.index = 0;
  open.started_at = new Date(now).toISOString();
  open.ends_at = new Date(now + 15_000).toISOString();
  assert.equal(
    (applyNumberLinePlace(open, items, "ada", rangeItem.id, 600, true, now + 15_001) as { error: string }).error,
    "TIME_UP",
  );
  assert.equal(open.placements.ada, undefined);
});

test("validator names the four rejected question shapes", () => {
  const outside = validateNumberLineItem({ ...rangeItem, answer: 1001 });
  assert.equal(outside.ok, false);
  if (!outside.ok) assert.match(outside.error, /outside the number line/);

  const offTick = validateNumberLineItem({ ...snapItem, answer: 0.1 });
  assert.equal(offTick.ok, false);
  if (!offTick.ok) assert.match(offTick.error, /on a tick/);

  const flat = validateNumberLineItem({ ...rangeItem, min: 5, max: 5 });
  assert.equal(flat.ok, false);
  if (!flat.ok) assert.match(flat.error, /greater than the minimum/);

  const backwards = validateNumberLineItem({ ...rangeItem, min: 10, max: 0 });
  assert.equal(backwards.ok, false);
  if (!backwards.ok) assert.match(backwards.error, /greater than the minimum/);

  const noTicks = validateNumberLineItem({ ...rangeItem, divisions: 0 });
  assert.equal(noTicks.ok, false);
  if (!noTicks.ok) assert.match(noTicks.error, /zero ticks/);

  const parsed = GameBoardSchema.safeParse({
    id: "bad",
    title: "Bad line",
    grade: 3,
    subject: "math",
    status: "ready",
    game_type: "number_line",
    cells: [],
    number_line_items: [{ ...snapItem, answer: 0.1 }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.match(parsed.error.issues.map((issue) => issue.message).join(" "), /tick/);
  }
});

test("demo key: 20 answers on the line, snap answers on a tick", () => {
  const report = checkNumberLineDemoKey();
  assert.equal(report.ok, true, report.lines.join("\n"));
  assert.equal(SAMPLE_NUMBER_LINE_ITEMS.length, 20);
  const board = GameBoardSchema.parse(buildSampleNumberLineBoard());
  assert.equal(board.game_type, "number_line");
  assert.equal(board.number_line_items?.length, 20);
});

test("snap hides non-integer fractions until reveal", () => {
  const eighths = { min: 0, max: 1, divisions: 8, mode: "snap" as const };
  const hidden = lineLabelIndexes(eighths, 1366, false);
  assert.deepEqual(hidden, [0, 8]);
  for (const index of hidden) {
    const value = tickValue(eighths, index);
    assert.ok(Number.isInteger(value), `pre-reveal label ${value} is a fraction`);
  }
  const shown = lineLabelIndexes(eighths, 1366, true);
  assert.ok(shown.includes(3));
  const range = lineLabelIndexes({ ...eighths, mode: "range" }, 1366, false);
  assert.ok(range.includes(3));
});

test("student snap reveal labels the answer without overlap at 375", () => {
  const rail = studentRailWidth(375);
  const questions = [11, 15, 19].map((index) => SAMPLE_NUMBER_LINE_ITEMS[index]!);
  assert.deepEqual(
    questions.map((item) => item.id),
    ["nl-s02", "nl-s06", "nl-s10"],
  );
  for (const item of questions) {
    const labels = lineLabelIndexes(item, rail, true, item.answer);
    const answerIndex = snapTickIndex(item, item.answer);
    assert.ok(answerIndex != null);
    assert.ok(labels.includes(answerIndex!), `${item.id} hid the answer tick`);
    assert.ok(labels.includes(0) && labels.includes(item.divisions));
    const boxes = labels.map((index) => tickLabelBox(item, index, rail));
    for (const box of boxes) {
      assert.ok(box.left >= -0.5 && box.right <= rail + 0.5, `${item.id} label overflows`);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const overlap = boxes[i]!.left < boxes[j]!.right && boxes[j]!.left < boxes[i]!.right;
        assert.equal(overlap, false, `${item.id} labels overlap`);
      }
    }
  }
});

test("arrow keys do nothing after lock or time up", () => {
  const item = { min: 0, max: 2, divisions: 16, mode: "snap" as const };
  const locked = tickValue(item, 1);
  let afterLock = { value: locked, busy: false, pending: null as number | null, focused: true };
  for (let press = 0; press < 4; press++) afterLock = queueMarkerArrow(afterLock, item, 1, false);
  assert.equal(afterLock.value, locked);
  assert.equal(afterLock.pending, null);
  assert.equal(afterLock.focused, true);
  let afterTimeUp = { value: locked, busy: false, pending: null as number | null, focused: true };
  for (let press = 0; press < 4; press++) afterTimeUp = queueMarkerArrow(afterTimeUp, item, 1, false);
  assert.equal(afterTimeUp.value, locked);
  assert.equal(afterTimeUp.pending, null);
  assert.equal(afterTimeUp.focused, true);
});

test("three rapid arrow presses land three steps later and keep focus", () => {
  const item = { min: 0, max: 1, divisions: 4, mode: "snap" as const };
  let state = { value: 0, busy: false, pending: null as number | null, focused: true };
  state = queueMarkerArrow(state, item, 1);
  assert.equal(state.busy, true);
  assert.equal(state.focused, true);
  state = queueMarkerArrow(state, item, 1);
  state = queueMarkerArrow(state, item, 1);
  assert.equal(state.value, tickValue(item, 3));
  assert.equal(state.pending, tickValue(item, 3));
  assert.equal(state.focused, true);
  const flushed = flushMarkerArrow(state);
  assert.equal(flushed.send, tickValue(item, 3));
  assert.equal(flushed.state.focused, true);
});

test("tick labels thin out so 11 ticks fit in five slots", () => {
  const shown = visibleTickIndexes(10, 5);
  assert.ok(shown.length <= 5);
  assert.equal(shown[0], 0);
  assert.equal(shown[shown.length - 1], 10);
  assert.equal(new Set(shown).size, shown.length);
  const step = shown[1]! - shown[0]!;
  assert.ok(shown.every((tick, index) => index === 0 || tick - shown[index - 1]! === step));
});

test("every tick mark exists even when labels are thinned", () => {
  const sixthMarks = Array.from({ length: 7 }, (_, index) => index);
  assert.ok(sixthMarks.includes(5));
  const labels = visibleTickIndexes(6, 5);
  assert.deepEqual(labels, [0, 2, 4, 6]);
  const sixteenthMarks = Array.from({ length: 17 }, (_, index) => index);
  assert.equal(sixteenthMarks.length, 17);
  assert.ok(sixteenthMarks.includes(11));
  assert.deepEqual(visibleTickIndexes(16, 5), [0, 4, 8, 12, 16]);
});

test("a fractional tick count is not reported as zero ticks", () => {
  const fractional = validateNumberLineItem({ ...rangeItem, divisions: 2.5 });
  assert.equal(fractional.ok, false);
  if (!fractional.ok) assert.match(fractional.error, /whole number/);
  if (!fractional.ok) assert.equal(/zero ticks/.test(fractional.error), false);
});

test("speed bonus ignores time spent paused", () => {
  const started = 1_000_000;
  const locked = started + 12_000;
  const pauses = [{ start: new Date(started + 1_000).toISOString(), end: new Date(started + 11_000).toISOString() }];
  const active = activeElapsedMs(pauses, started, locked);
  assert.equal(active, 2_000);
  const withPause = speedBonus({ eligible: true, locked: true, elapsedMs: active, totalMs: 15_000 });
  const countingPause = speedBonus({ eligible: true, locked: true, elapsedMs: 12_000, totalMs: 15_000 });
  assert.ok(withPause > countingPause);
  assert.ok(withPause <= 200);
});

test("the same request id does not apply twice", () => {
  const state = createNumberLineState(30);
  state.stage = "placing";
  state.accepting = true;
  const now = Date.now();
  state.started_at = new Date(now).toISOString();
  state.ends_at = new Date(now + 30_000).toISOString();
  const id = "req-place-001";
  assert.equal(applyNumberLinePlace(state, [rangeItem], "ada", rangeItem.id, 400, true, now, id).ok, true);
  assert.equal(applyNumberLinePlace(state, [rangeItem], "ada", rangeItem.id, 100, true, now + 50, id).ok, true);
  assert.equal(state.placements.ada?.value, 400);
  assert.equal(
    (applyNumberLinePlace(state, [rangeItem], "ada", rangeItem.id, 100, false, now + 80, "req-place-002") as { error: string }).error,
    "LOCKED",
  );
});

test("host and player payloads hide every number line answer before reveal", () => {
  const board = buildSampleNumberLineBoard();
  const room = roomFor(board.number_line_items![0]!, createNumberLineState(30));
  room.board = board;
  room.phase = "lobby";
  const responses: Record<string, unknown> = {
    "GET /api/host/board": { ok: true, board: stripNumberLineAnswers(board) },
    "GET /api/host/me": { ok: true, board: toHostBoardView(board) },
    "POST /api/redeem": { ok: true, board: toHostBoardView(board) },
    "POST /api/sessions": { ok: true, view: sanitizeForHost(room) },
    "GET /api/rooms host": { ok: true, view: sanitizeForHost(room) },
    "POST /api/rooms/host": { ok: true, view: sanitizeForHost(room) },
    "GET /api/rooms player": { ok: true, view: sanitizeForPlayer(room, "ada") },
    "POST /api/rooms/join": { ok: true, view: sanitizeForPlayer(room, "ada") },
    "POST /api/rooms/number-line": { ok: true, view: sanitizeForPlayer(room, "ada") },
  };
  for (const [name, body] of Object.entries(responses)) {
    assert.deepEqual(collectAnswerFields(body), [], name);
    const blob = JSON.stringify(body);
    for (const item of SAMPLE_NUMBER_LINE_ITEMS) {
      if (item.mode !== "snap") continue;
      assert.equal(blob.includes(String(item.answer)), false, `${name} leaked ${item.id}`);
    }
  }
});

test("a stripped host board still offers Start Number Line", () => {
  const board = buildSampleNumberLineBoard();
  const response = { ok: true, board: stripNumberLineAnswers(board) };
  assert.deepEqual(collectAnswerFields(response), []);
  assert.equal(JSON.stringify(response).includes('"answer"'), false);
  assert.equal(supportsNumberLine(response.board), false);
  assert.equal(supportsHostNumberLine(response.board), true);
  assert.equal(response.board.number_line_items?.length, 20);
  const html = renderToStaticMarkup(
    createElement(NumberLineStartCard, {
      questions: response.board.number_line_items?.length ?? 0,
      grade: response.board.grade,
      onStart: () => {},
    }),
  );
  assert.match(html, /Number Line ready|Start Number Line/);
  assert.match(html, />Start Number Line</);
  assert.equal(html.includes("answer"), false);
  const broken = stripNumberLineAnswers(board);
  broken.number_line_items = [{ ...broken.number_line_items![0]!, prompt: "  " }];
  assert.equal(supportsHostNumberLine(broken), false);
});

test("late join misses earlier points and a locked placement stays put", () => {
  const state = createNumberLineState(30);
  state.stage = "placing";
  state.accepting = true;
  const now = Date.now();
  state.started_at = new Date(now).toISOString();
  state.ends_at = new Date(now + 30_000).toISOString();
  applyNumberLinePlace(state, [rangeItem], "ada", rangeItem.id, 600, true, now);
  const first = scoreNumberLineAwards(state, rangeItem, ["ada", "bo"], now);
  assert.equal(first.find((row) => row.player_id === "bo")?.total, 0);
  assert.equal(first.find((row) => row.player_id === "ada")?.total, 1200);
  state.awards = first;
  state.scored_ids = [rangeItem.id];
  state.stage = "board";
  state.index = 1;
  state.placements = {};
  state.stage = "placing";
  state.accepting = true;
  const second = applyNumberLinePlace(state, [rangeItem, snapItem], "ada", snapItem.id, snapItem.answer, true, now);
  assert.equal(second.ok, true);
  assert.equal(state.placements.ada?.locked, true);
  assert.equal(
    (applyNumberLinePlace(state, [rangeItem, snapItem], "ada", snapItem.id, tickValue(snapItem, 0), false, now) as { error: string }).error,
    "LOCKED",
  );
});

test("number line demo seed upserts a stale key and skips an identical row", () => {
  const now = "2026-11-16T00:00:00.000Z";
  const other = GameBoardSchema.parse(buildSampleNumberLineBoard("leave-this-board"));
  other.title = "Not the number line demo";
  const store = {
    boards: [other],
    product_codes: [] as {
      id: string;
      code_hash: string;
      board_id: string;
      sessions_started: number;
    }[],
  };
  const first = applyNumberLineDemo(store, {
    codeHash: "nl-demo-hash",
    now,
    createCode: (boardId) => ({
      id: "pc-nl",
      code_hash: "nl-demo-hash",
      board_id: boardId,
      sessions_started: 4,
    }),
  });
  assert.equal(first.created, true);
  assert.equal(first.updated, true);
  assert.equal(first.wrote, true);
  assert.equal(first.boardId, NUMBER_LINE_SAMPLE_BOARD_ID);
  assert.equal(store.boards[0], other);
  assert.equal(other.title, "Not the number line demo");
  const seeded = store.boards.find((board) => board.id === NUMBER_LINE_SAMPLE_BOARD_ID);
  assert.ok(seeded);
  assert.equal(
    seeded!.number_line_items?.find((item) => item.id === "nl-r07")?.prompt,
    "Place 640 on the number line.",
  );
  assert.equal(NUMBER_LINE_DEMO_VERSION >= 2, true);
  assert.equal(numberLineDemoContentHash(seeded!), numberLineDemoContentHash(buildSampleNumberLineBoard()));

  const second = applyNumberLineDemo(store, {
    codeHash: "nl-demo-hash",
    now: "2026-11-16T01:00:00.000Z",
    createCode: () => {
      throw new Error("identical content must not create another code");
    },
  });
  assert.equal(second.wrote, false);
  assert.equal(second.updated, false);
  assert.equal(second.created, false);
  assert.equal(store.boards.find((board) => board.id === NUMBER_LINE_SAMPLE_BOARD_ID), seeded);

  const stale = store.boards.find((board) => board.id === NUMBER_LINE_SAMPLE_BOARD_ID)!;
  const createdAt = stale.created_at;
  stale.number_line_items = stale.number_line_items!.map((item) =>
    item.id === "nl-r07"
      ? { ...item, prompt: "Round 640 to the nearest hundred", answer: 600 }
      : item,
  );
  const refreshed = applyNumberLineDemo(store, {
    codeHash: "nl-demo-hash",
    now: "2026-11-16T02:00:00.000Z",
    createCode: () => {
      throw new Error("the demo code already exists");
    },
  });
  assert.equal(refreshed.updated, true);
  assert.equal(refreshed.created, false);
  const current = store.boards.find((board) => board.id === NUMBER_LINE_SAMPLE_BOARD_ID)!;
  assert.equal(current.created_at, createdAt);
  assert.equal(current.updated_at, "2026-11-16T02:00:00.000Z");
  assert.equal(
    current.number_line_items?.find((item) => item.id === "nl-r07")?.prompt,
    "Place 640 on the number line.",
  );
  assert.equal(current.number_line_items?.find((item) => item.id === "nl-r07")?.answer, 640);
  assert.equal(checkNumberLineDemoKey(current.number_line_items).ok, true);
  assert.equal(store.boards[0], other);

  store.product_codes[0]!.board_id = "old-board";
  store.product_codes[0]!.sessions_started = 4;
  const retarget = applyNumberLineDemo(store, {
    codeHash: "nl-demo-hash",
    now: "2026-11-16T03:00:00.000Z",
    createCode: () => {
      throw new Error("retarget must not insert");
    },
  });
  assert.equal(retarget.created, false);
  assert.equal(retarget.updated, false);
  assert.equal(retarget.wrote, true);
  assert.equal(store.product_codes[0]!.board_id, NUMBER_LINE_SAMPLE_BOARD_ID);
  assert.equal(store.product_codes[0]!.sessions_started, 4);
  assert.equal(planNumberLineDemoCode(NUMBER_LINE_SAMPLE_BOARD_ID, NUMBER_LINE_SAMPLE_BOARD_ID), "keep");
  assert.equal(planNumberLineDemoCode(null, NUMBER_LINE_SAMPLE_BOARD_ID), "insert");
});

function leaderCrossesChip(leader: RevealLeader, box: Box): boolean {
  if (leader.x <= box.left || leader.x >= box.right) return false;
  return leader.y1 < box.bottom - 0.5 && leader.y2 > box.top + 0.5;
}

function circlesIntersect(
  a: { x: number; size: number; box: Box },
  b: { x: number; size: number; box: Box },
): boolean {
  const dy = a.box.top + a.size / 2 - (b.box.top + b.size / 2);
  return Math.hypot(a.x - b.x, dy) < Math.max(a.size, b.size) - 0.05;
}

function assertRevealFits(dots: NameLayoutDot[], width: number, label: string) {
  const laid = layoutNumberLineReveal(dots, width);
  const badged = laid.badges.reduce((sum, badge) => sum + badge.count, 0);
  assert.equal(
    laid.dots.length + badged,
    dots.length,
    `${label} @ ${width} drew ${laid.dots.length} and badged ${badged} of ${dots.length}`,
  );
  if (width >= 768) {
    assert.equal(laid.dots.length, dots.length, `${label} @ ${width} hid a placement`);
    assert.equal(laid.badges.length, 0, `${label} @ ${width} used a badge`);
  }
  assert.ok(laid.dots.every((dot) => dot.size >= NL_DOT_MIN_PX), `${label} dot shrunk below 10px`);
  assert.ok(laid.dots.every((dot) => Math.abs(dot.size - laid.dotSize) < 0.05), `${label} mixed dot sizes`);
  const labelTop = laid.aboveSpace + NL_RAIL_PX;
  const labelBottom = labelTop + NL_LABELS_PX;
  for (const input of dots) {
    const dot = laid.dots.find((row) => row.id === input.id);
    if (!dot) continue;
    const trueX = (Math.min(100, Math.max(0, input.xPercent)) / 100) * width;
    assert.ok(Math.abs(dot.x - trueX) <= 1, `${label} @ ${width} ${input.id} is ${dot.x} not ${trueX}`);
    assert.ok(dot.x >= -1 && dot.x <= width + 1, `${label} @ ${width} ${input.id} left the track`);
  }
  for (let i = 0; i < laid.dots.length; i++) {
    for (let j = i + 1; j < laid.dots.length; j++) {
      assert.equal(
        circlesIntersect(laid.dots[i]!, laid.dots[j]!),
        false,
        `${label} @ ${width} ${laid.dots[i]!.id} covers ${laid.dots[j]!.id}`,
      );
    }
  }
  if (width >= 1000) {
    assert.ok(
      hostPageHeight(laid) <= NL_VIEWPORT_H_PX,
      `${label} @ ${width} page ${hostPageHeight(laid)}px needs a scroll`,
    );
  }
  if (width <= 500) {
    const line = lineFoldY(laid, NL_CHROME_MOBILE_PX);
    assert.ok(line <= NL_MOBILE_VIEWPORT_PX, `${label} @ ${width} line bottom ${line}px`);
  }
  const seen = new Set<string>();
  for (const chip of laid.chips) {
    assert.ok(chip.box.left >= -0.5, `${label} chip starts off the line`);
    assert.ok(chip.box.right <= width + 0.5, `${label} chip runs off the line`);
    for (const id of chip.memberIds) {
      const input = dots.find((row) => row.id === id);
      const dot = laid.dots.find((row) => row.id === id);
      const badged = laid.badges.some((badge) => badge.memberIds.includes(id));
      assert.ok(input, `${label} chip names an unknown placement`);
      assert.ok(dot || badged, `${label} chip names a placement that is neither drawn nor badged`);
      const trueX = (Math.min(100, Math.max(0, input!.xPercent)) / 100) * width;
      const x = dot ? dot.x : trueX;
      assert.ok(
        Math.abs(x - chip.anchorX) <= NL_GROUP_WINDOW_PX + 0.5,
        `${label} @ ${width} ${chip.text} reaches x ${x} from ${chip.anchorX}`,
      );
      assert.equal(seen.has(id), false, `${label} named ${id} twice`);
      seen.add(id);
    }
    assert.equal(/^\+\d+$/.test(chip.text), false, `${label} chip has no name: ${chip.text}`);
    for (const dot of laid.dots) {
      assert.equal(boxesOverlap(chip.box, dot.box), false, `${label} @ ${width} ${chip.text} covers a dot`);
    }
    for (const other of laid.chips) {
      if (other.id === chip.id) continue;
      assert.equal(boxesOverlap(chip.box, other.box), false, `${label} @ ${width} chips overlap`);
    }
  }
  for (const badge of laid.badges) {
    assert.match(badge.text, /^\+\d+$/);
    assert.equal(badge.count, badge.memberIds.length);
    for (const dot of laid.dots) {
      assert.equal(boxesOverlap(badge.box, dot.box), false, `${label} badge covers ${dot.id}`);
    }
    for (const chip of laid.chips) {
      assert.equal(boxesOverlap(badge.box, chip.box), false, `${label} badge covers ${chip.text}`);
    }
  }
  for (const leader of laid.leaders) {
    for (const chip of laid.chips) {
      assert.equal(leaderCrossesChip(leader, chip.box), false, `${label} leader crosses ${chip.text}`);
    }
    const throughLabels = leader.y1 < labelBottom - 0.5 && leader.y2 > labelTop + 0.5;
    assert.equal(throughLabels, false, `${label} leader crosses the tick labels`);
  }
  const named = dots.filter((dot) => dot.name);
  assert.equal(seen.size, named.length, `${label} @ ${width} dropped a name`);
}

test("reveal name chips clear AA and stay clear of dots", () => {
  assert.ok(contrastRatio(NL_NAME_FG, NL_NAME_BG) >= 4.5);
  assert.ok(NL_NAME_FONT_PX >= 24);
  const widths = [375, 768, 1366];
  for (const width of widths) {
    const close = [
      { id: "ben", xPercent: 10, value: 100, name: "Ben" },
      { id: "cy", xPercent: 12, value: 120, name: "Cy" },
      { id: "dee", xPercent: 14, value: 140, name: "Dee" },
    ];
    assertRevealFits(close, width, "Ben Cy Dee");
    const four = [
      { id: "ava", xPercent: 8, value: 80, name: "Ava" },
      { id: "ben", xPercent: 10, value: 100, name: "Ben" },
      { id: "cy", xPercent: 12, value: 120, name: "Cy" },
      { id: "dee", xPercent: 14, value: 140, name: "Dee" },
    ];
    const fourLaid = layoutNumberLineReveal(four, width);
    assert.equal(fourLaid.dots.length, 4, `close values @ ${width}`);
    assertRevealFits(four, width, "Ava Ben Cy Dee");
    const spread = Array.from({ length: 30 }, (_, index) => ({
      id: `s${index}`,
      xPercent: (index / 29) * 100,
      value: index * 10,
      name: `Student ${index}`,
    }));
    assertRevealFits(spread, width, "spread");
    const clustered = Array.from({ length: 30 }, (_, index) => ({
      id: `c${index}`,
      xPercent: 40 + (index % 12) * 0.4,
      value: 400 + (index % 12) * 2,
      name: index < 12 ? ["Ava", "Ben", "Cy", "Dee", "Eli", "Fay", "Gia", "Hua", "Ian", "Joy", "Ken", "Lea"][index]! : `Kid ${index}`,
    }));
    assertRevealFits(clustered, width, "clustered");
    const identical = Array.from({ length: 30 }, (_, index) => ({
      id: `i${index}`,
      xPercent: index < 12 ? 50 : (index / 29) * 100,
      value: index < 12 ? 500 : 800 + index,
      name: index === 0 ? "Ava" : index === 1 ? "Ben" : `Kid ${index}`,
    }));
    assertRevealFits(identical, width, "twelve identical");
    const same = layoutNumberLineReveal(identical, width);
    const pile = same.chips.find((chip) => chip.fullNames.includes("Ava"));
    assert.ok(pile);
    assert.ok(pile!.fullNames.includes("Ben"));
    assert.equal(pile!.fullNames.filter((name) => name === "Ava" || name === "Ben" || name.startsWith("Kid")).length >= 12, true);
    assert.match(pile!.text, /^[A-Za-z0-9].* \+\d+$/);
    assert.equal(/^\+\d+$/.test(pile!.text), false);
  }
  const onlyIdentical = Array.from({ length: 12 }, (_, index) => ({
    id: `same-${index}`,
    xPercent: 50,
    value: 500,
    name: index === 0 ? "Ava" : index === 1 ? "Ben" : `Kid ${index}`,
  }));
  const onePile = layoutNumberLineReveal(onlyIdentical, 1366);
  assert.equal(onePile.dots.length, 12);
  assert.equal(onePile.chips.length, 1);
  assert.equal(onePile.chips[0]!.text, "Ava +11");
  assert.equal(onePile.chips[0]!.fullNames.length, 12);
  const mixed = [
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `a${index}`,
      xPercent: 8,
      value: 80,
      name: `A${index}`,
    })),
    { id: "ben", xPercent: 10, value: 100, name: "Ben" },
  ];
  for (const width of [375, 768, 1366]) {
    assertRevealFits(mixed, width, "twelve at 80 plus 100");
    const row = layoutNumberLineReveal(mixed, width);
    const ben = row.dots.find((dot) => dot.id === "ben");
    const first = row.dots.find((dot) => dot.id === "a0");
    if (ben && first) {
      assert.equal(circlesIntersect(ben, first), false, `Ben covers the 80 stack @ ${width}`);
    }
    if (width >= 768) assert.equal(row.dots.length, 13, `mixed dots @ ${width}`);
  }
  assertRevealFits(onlyIdentical, 375, "twelve only");
  assertRevealFits(onlyIdentical, 768, "twelve only");
  assertRevealFits(onlyIdentical, 1366, "twelve only");
  const far = layoutNumberLineReveal(
    [
      { id: "ann", xPercent: 18, value: 180, name: "Ann" },
      { id: "bea", xPercent: 19, value: 190, name: "Bea" },
      { id: "zed", xPercent: 91, value: 910, name: "Zed" },
    ],
    375,
  );
  const ann = far.chips.find((chip) => chip.memberIds.includes("ann"));
  assert.ok(ann);
  assert.equal(ann!.memberIds.includes("zed"), false);
  assert.deepEqual(visibleTickIndexes(3, tickLabelCap(3, 231)), [0, 1, 2, 3]);
  const identicalThirty = Array.from({ length: 30 }, (_, index) => ({
    id: `all-${index}`,
    xPercent: 40,
    value: 400,
    name: index === 0 ? "Ava" : `Kid ${index}`,
  }));
  const clusteredThirty = Array.from({ length: 30 }, (_, index) => ({
    id: `cl-${index}`,
    xPercent: 40 + (index % 12) * 0.4,
    value: 400 + (index % 12) * 2,
    name: `Kid ${index}`,
  }));
  for (const [label, dots] of [
    ["30 identical", identicalThirty],
    ["30 clustered", clusteredThirty],
  ] as const) {
    const laid = layoutNumberLineReveal(dots, 1366);
    const badged = laid.badges.reduce((sum, badge) => sum + badge.count, 0);
    assert.equal(laid.dots.length + badged, dots.length, `${label} lost a placement`);
    assert.ok(
      hostPageHeight(laid) <= 768,
      `${label} controls end at ${hostPageHeight(laid)}px`,
    );
    assert.ok(flagBottomY(laid) <= hostClearY(laid), `${label} flag clears the bar`);
    const named = new Set(laid.chips.flatMap((chip) => chip.memberIds));
    for (const badge of laid.badges) for (const id of badge.memberIds) named.add(id);
    assert.equal(named.size, dots.length, `${label} dropped a name`);
  }
  const identical32 = Array.from({ length: 32 }, (_, index) => ({
    id: `p32-${index}`,
    xPercent: 50,
    value: 500,
    name: index === 0 ? "Ava" : `Kid ${index}`,
  }));
  const fourSmall = [
    { id: "ava", xPercent: 8, value: 80, name: "Ava" },
    { id: "ben", xPercent: 10, value: 100, name: "Ben" },
    { id: "cy", xPercent: 12, value: 120, name: "Cy" },
    { id: "dee", xPercent: 14, value: 140, name: "Dee" },
  ];
  function assertAboveBar(dots: NameLayoutDot[], width: number, label: string) {
    const laid = layoutNumberLineReveal(dots, width);
    const limit = hostClearY(laid);
    assert.ok(flagBottomY(laid) <= limit + 0.05, `${label} @ ${width} flag ${flagBottomY(laid)} limit ${limit}`);
    for (const dot of laid.dots) {
      assert.ok(laid.chromePx + dot.box.bottom <= limit + 0.05, `${label} dot ${dot.id} under the bar`);
    }
    for (const chip of [...laid.chips, ...laid.badges]) {
      assert.ok(laid.chromePx + chip.box.bottom <= limit + 0.05, `${label} chip under the bar`);
    }
    assert.ok(limit - flagBottomY(laid) >= NL_BAR_GAP_PX - 0.05 || flagBottomY(laid) <= limit);
  }
  for (const width of [1366, 1440, 375]) assertAboveBar(identical32, width, "32 identical");
  assertAboveBar(fourSmall, 375, "4 players");
  for (const namesOn of [false, true]) {
    const rights = hostBarControlRights(namesOn, 375);
    assert.equal(rights.length, 5);
    for (const right of rights) {
      assert.ok(right <= 375, `bar control ends at ${right} with names ${namesOn ? "on" : "off"}`);
    }
    assert.ok(rights[4]! <= 375 - 8, `End is flush at ${rights[4]}`);
    assert.equal(hostBarControlRights(false)[3], hostBarControlRights(true)[3]);
  }
  for (const [width, viewport] of [
    [1366, 768],
    [1440, 900],
    [375, 812],
  ] as const) {
    const startBottom = lobbyStartTop(35, width) + (width <= 500 ? 52 : NL_CONTROLS_PX);
    assert.ok(startBottom <= viewport, `35-player Start ends at ${startBottom} on ${width}x${viewport}`);
  }
});

test("NL-10 reveal reuses one dot plot for a class of 30", () => {
  const samples: number[] = [];
  for (let room = 0; room < 3; room++) {
    const item = { ...rangeItem, id: `room-${room}` };
    const state = createNumberLineState(30);
    state.stage = "placing";
    state.accepting = true;
    const now = 1_700_000_000_000 + room;
    state.started_at = new Date(now).toISOString();
    state.ends_at = new Date(now + 30_000).toISOString();
    const players = [{ player_id: "host", display_name: "host", score: 0 }];
    for (let i = 0; i < 30; i++) {
      const id = `p${i}`;
      players.push({ player_id: id, display_name: `Student ${i}`, score: 0 });
      applyNumberLinePlace(state, [item], id, item.id, 400 + (i % 12) * 50, true, now);
    }
    const ids = players.filter((player) => player.player_id !== "host").map((player) => player.player_id);
    const t0 = performance.now();
    const awards = scoreNumberLineAwards(state, item, ids, now);
    for (const award of awards) {
      const player = players.find((row) => row.player_id === award.player_id);
      if (player) player.score += award.total;
    }
    state.awards = awards;
    state.stage = "reveal";
    state.reveal = buildNumberLineReveal(state, item, players);
    const host = hostNumberLineView("number_line", state, [item], players);
    for (const id of ids) playerNumberLineView("number_line", state, [item], id, players);
    samples.push(performance.now() - t0);
    assert.equal(host?.leaderboard, state.reveal.leaderboard);
    assert.equal(host?.podium, state.reveal.podium);
    assert.equal(state.reveal.dots.length, 30);
    const ada = playerNumberLineView("number_line", state, [item], ids[0]!, players);
    assert.equal(ada?.leaderboard, state.reveal.leaderboard);
    assert.equal(ada?.my_award?.player_id, ids[0]);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))]!;
  assert.ok(p95 <= 1000, `reveal p95 ${p95}ms`);
});
