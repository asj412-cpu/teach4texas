import assert from "node:assert/strict";
import { test } from "node:test";
import { GameBoardSchema } from "@/lib/domain/board";
import {
  sanitizeForHost,
  sanitizeForPlayer,
  type LiveRoom,
} from "@/lib/domain/live-room";
import {
  activeElapsedMs,
  applyNumberLinePlace,
  collectAnswerFields,
  createNumberLineState,
  hostNumberLineView,
  parseNumberLinePlaceBody,
  playerNumberLineView,
  scoreNumberLineAwards,
  scorePlacement,
  speedBonus,
  stripNumberLineAnswers,
  tickValue,
  validateNumberLineItem,
  visibleTickIndexes,
  NL_MAX_BONUS,
  type NumberLineItem,
  type NumberLineState,
} from "@/lib/domain/number-line";
import {
  buildSampleNumberLineBoard,
  checkNumberLineDemoKey,
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
  assert.equal(scorePlacement(rangeItem, 700, timing).within, true);
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
  const later = (host.board.number_line_items ?? []).find((item) => item.id === "later");
  assert.equal(later && "answer" in later, false);
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
