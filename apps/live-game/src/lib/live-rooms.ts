import type { GameBoard, GameType } from "@/lib/domain/board";
import { resolvePlayableGameType } from "@/lib/domain/board";
import {
  getCell,
  maxWagerFor,
  HOST_DISPLAY_NAME,
  HOST_PLAYER_ID,
  type LivePlayer,
  type LiveRoom,
  sanitizeForHost,
  sanitizeForPlayer,
} from "@/lib/domain/live-room";
import {
  applyCardFlip,
  clearExpiredMismatch,
  createPlayerMatchState,
  itemsFromBoard,
} from "@/lib/domain/memory-match";
import {
  applyRaceAnswer,
  createPlayerRaceState,
  raceItemsFromBoard,
  raceTimeUp,
  TIMED_RACE_SECONDS,
} from "@/lib/domain/timed-race";
import {
  applyScavengerTap,
  createPlayerScavengerState,
  scavengerItemsFromBoard,
} from "@/lib/domain/scavenger-tap";
import {
  applySequenceSubmit,
  createPlayerSequenceState,
  sequenceItemsFromBoard,
} from "@/lib/domain/sequence-sort";
import {
  applyCategoryTap,
  categoryItemsFromBoard,
  createPlayerCategoryState,
} from "@/lib/domain/category-sort";
import {
  applyOddTap,
  createPlayerOddState,
  oddItemsFromBoard,
} from "@/lib/domain/odd-one-out";
import {
  applyDashTap,
  createPlayerDashState,
  dashItemsFromBoard,
} from "@/lib/domain/true-false-dash";
import {
  generateId,
  generateOpaqueToken,
  sha256Hex,
} from "@/lib/crypto";
import {
  enqueueAndLoad,
  type RoomRecord,
  insertRoomRecord,
  loadRoomRecord,
  purgeIdleRooms,
  ROOM_IDLE_TTL_MS,
  saveRoomRecord,
} from "@/lib/room-store";

const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_ANSWER_SECONDS = 45;
const MAX_PLAYERS = 40;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

const ENDED_ROOM_GRACE_MS = 10 * 60 * 1000;
const MAX_WRITE_ATTEMPTS = 12;
const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

function randomRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Same lifetime rules as the old in-memory purge: 4h live, 10 min after end. */
function isRoomExpired(room: LiveRoom, now: number): boolean {
  if (room.ended_at) {
    return now - new Date(room.ended_at).getTime() > ENDED_ROOM_GRACE_MS;
  }
  return now - new Date(room.created_at).getTime() > ROOM_TTL_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function maybeAutoLock(room: LiveRoom) {
  if (room.phase !== "question_open" || !room.open_until) return;
  if (Date.now() >= new Date(room.open_until).getTime()) {
    room.phase = "question_locked";
    room.open_until = null;
  }
}

function maybeClearMismatches(room: LiveRoom) {
  if (room.game_type !== "memory_match") return;
  const now = Date.now();
  for (const st of Object.values(room.match_states)) {
    clearExpiredMismatch(st, now);
  }
}

function ensurePlayerMatchState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "memory_match") return;
  if (room.match_states[playerId]) return;
  room.match_states[playerId] = createPlayerMatchState(itemsFromBoard(room.board));
}

function ensurePlayerRaceState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "timed_race") return;
  if (room.race_states[playerId]) return;
  room.race_states[playerId] = createPlayerRaceState(raceItemsFromBoard(room.board));
}

function ensurePlayerScavengerState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "scavenger_tap") return;
  if (room.scavenger_states[playerId]) return;
  room.scavenger_states[playerId] = createPlayerScavengerState();
}

function ensurePlayerSequenceState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "sequence_sort") return;
  if (room.sequence_states[playerId]) return;
  room.sequence_states[playerId] = createPlayerSequenceState();
}

function ensurePlayerCategoryState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "category_sort") return;
  if (room.category_states[playerId]) return;
  room.category_states[playerId] = createPlayerCategoryState();
}

function ensurePlayerOddState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "odd_one_out") return;
  if (room.odd_states[playerId]) return;
  room.odd_states[playerId] = createPlayerOddState();
}


function ensureHostPlayer(room: LiveRoom) {
  if (room.players[HOST_PLAYER_ID]) return;
  room.players[HOST_PLAYER_ID] = {
    player_id: HOST_PLAYER_ID,
    display_name: HOST_DISPLAY_NAME,
    score: 0,
    connected: true,
    resume_secret_hash: sha256Hex(`host-seat:${room.code}`),
  };
}

function studentPlayerCount(room: LiveRoom): number {
  return Object.keys(room.players).filter((id) => id !== HOST_PLAYER_ID).length;
}

function resetRoomToLobby(room: LiveRoom) {
  room.phase = "lobby";
  room.ended_at = null;
  room.active_cell_id = null;
  room.used_cell_ids = [];
  room.answers = {};
  room.points_awarded = {};
  room.wagers = {};
  room.open_until = null;
  room.race_ends_at = null;
  room.scavenger_index = 0;
  room.sequence_index = 0;
  room.category_index = 0;
  room.odd_index = 0;
  room.dash_index = 0;
  room.match_states = {};
  room.race_states = {};
  room.scavenger_states = {};
  room.sequence_states = {};
  room.category_states = {};
  room.odd_states = {};
  room.dash_states = {};
  for (const p of Object.values(room.players)) {
    p.score = 0;
    p.connected = true;
  }
  ensureHostPlayer(room);
}

function ensurePlayerDashState(room: LiveRoom, playerId: string) {
  if (room.game_type !== "true_false_dash") return;
  if (room.dash_states[playerId]) return;
  room.dash_states[playerId] = createPlayerDashState();
}

export async function createLiveRoom(opts: {
  board: GameBoard;
  answerSeconds?: number;
  gameType?: string | null;
}): Promise<{ room: LiveRoom; hostToken: string }> {
  void purgeIdleRooms();
  const code = randomRoomCode();

  const hostToken = generateOpaqueToken();
  const gameType: GameType = resolvePlayableGameType(opts.board, opts.gameType);
  const room: LiveRoom = {
    code,
    board_id: opts.board.id,
    board: opts.board,
    game_type: gameType,
    host_token_hash: sha256Hex(hostToken),
    phase: "lobby",
    players: {},
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
    open_until: null,
    answer_seconds:
      opts.answerSeconds ??
      (gameType === "timed_race" ? TIMED_RACE_SECONDS : DEFAULT_ANSWER_SECONDS),
    lobby_locked: false,
    created_at: new Date().toISOString(),
    ended_at: null,
  };
  ensureHostPlayer(room);
  for (let i = 0; i < 20; i++) {
    if (await insertRoomRecord(room)) return { room, hostToken };
    room.code = randomRoomCode();
    room.players = {};
    ensureHostPlayer(room);
  }
  throw new Error("CODE_COLLISION");
}

export type RoomOutcome<T> =
  | { kind: "ok"; value: T }
  | { kind: "missing" }
  | { kind: "ended" }
  | { kind: "busy" };

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Load a room from the shared store, fold in any queued actions (D1), run `fn`,
 * and persist with an optimistic version check (deleting the folded actions in
 * the same transaction). `fn` must only touch the room it is given.
 * - ownId: the caller's queued action. If it is no longer pending, another
 *   request already applied it: return the view without writing.
 * - poll: one attempt only; on a write conflict still return the computed view.
 */
const ACTION_ERRORS_KEEP = 300;

/** P2-1: remember rejected queued actions so the request that queued them still gets the error. */
function recordActionErrors(room: LiveRoom, results: Map<number, ActionResult>) {
  const errs: Record<string, string> = { ...(room.action_errors ?? {}) };
  let changed = false;
  for (const [id, r] of results) {
    if (!r.ok) {
      errs[String(id)] = r.error;
      changed = true;
    }
  }
  if (!changed) return;
  const keys = Object.keys(errs).sort((a, b) => Number(a) - Number(b));
  for (const k of keys.slice(0, Math.max(0, keys.length - ACTION_ERRORS_KEEP))) delete errs[k];
  room.action_errors = errs;
}

export async function withRoom<T>(
  rawCode: string,
  fn: (room: LiveRoom, results: Map<number, ActionResult>) => T,
  opts: { ownId?: number; poll?: boolean; preloaded?: RoomRecord } = {},
): Promise<RoomOutcome<T>> {
  const code = rawCode.trim().toUpperCase();
  if (!ROOM_CODE_RE.test(code)) return { kind: "missing" };
  const attempts = opts.poll ? 1 : MAX_WRITE_ATTEMPTS;
  try {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const rec = attempt === 0 && opts.preloaded ? opts.preloaded : await loadRoomRecord(code);
      if (!rec) return { kind: "missing" };
      const now = Date.now();
      if (now - rec.updatedAtMs > ROOM_IDLE_TTL_MS || isRoomExpired(rec.room, now)) {
        return { kind: "ended" };
      }
      const room = rec.room;
      const results = new Map<number, ActionResult>();
      if (opts.ownId != null && !rec.pending.some((p) => p.id === opts.ownId)) {
        // Someone else folded our action; report its stored outcome.
        const err = room.action_errors?.[String(opts.ownId)];
        results.set(opts.ownId, err ? { ok: false, error: err } : { ok: true });
        maybeAutoLock(room);
        maybeClearMismatches(room);
        return { kind: "ok", value: fn(room, results) };
      }
      const before = opts.poll && rec.pending.length === 0 ? JSON.stringify(room) : "";
      maybeAutoLock(room);
      maybeClearMismatches(room);
      for (const p of rec.pending) {
        results.set(p.id, applyQueuedAction(room, p.action as QueuedAction));
      }
      recordActionErrors(room, results);
      const value = fn(room, results);
      if (opts.poll) {
        // P2-L1: polls fold in memory for an accurate view but rarely write, so they
        // don't fight tap requests for the version. Writers drain the queue.
        if (rec.pending.length === 0) {
          if (JSON.stringify(room) !== before) await saveRoomRecord(room, rec.version, []);
        } else if (Math.random() < 0.15) {
          await saveRoomRecord(room, rec.version, rec.pending.map((p) => p.id));
        }
        return { kind: "ok", value };
      }
      if (rec.pending.length === 0) return { kind: "ok", value };
      const ids = rec.pending.map((p) => p.id);
      if (await saveRoomRecord(room, rec.version, ids)) return { kind: "ok", value };
      await sleep(5 + Math.random() * 25 * (attempt + 1));
    }
  } catch (err) {
    console.error("withRoom:", err);
  }
  return { kind: "busy" };
}

const PLAYER_ACTIONS = {
  submitAnswer: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitAnswer(room, pid, a[0] as number),
  submitWager: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitWager(room, pid, a[0] as number),
  submitRaceAnswer: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitRaceAnswer(room, pid, a[0] as number),
  flipMatchCard: (room: LiveRoom, pid: string, a: unknown[]) =>
    flipMatchCard(room, pid, a[0] as number),
  submitScavengerTap: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitScavengerTap(room, pid, a[0] as string),
  submitSequenceOrder: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitSequenceOrder(room, pid, a[0] as string[]),
  submitCategoryTap: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitCategoryTap(room, pid, a[0] as string),
  submitOddTap: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitOddTap(room, pid, a[0] as string),
  submitDashTap: (room: LiveRoom, pid: string, a: unknown[]) =>
    submitDashTap(room, pid, a[0] as boolean),
} as const;

export type PlayerActionName = keyof typeof PLAYER_ACTIONS;

/** One queued action (D1). Stored as JSON in live_room_actions.action. */
export type QueuedAction =
  | { t: "host"; a: HostAction }
  | {
      t: "join";
      name: string;
      pid: string;
      secret: string;
      resume?: { player_id: string; resume_secret: string };
    }
  | { t: "player"; fn: PlayerActionName; pid: string; args: unknown[] };

function applyQueuedAction(room: LiveRoom, q: QueuedAction): ActionResult {
  try {
    if (q.t === "host") return applyHostAction(room, q.a);
    if (q.t === "join") {
      const r = joinRoom(room, q.name, q.resume, { player_id: q.pid, resume_secret: q.secret });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    if (q.t === "player") {
      const f = PLAYER_ACTIONS[q.fn];
      if (!f) return { ok: false, error: "UNKNOWN_ACTION" };
      return f(room, q.pid, q.args ?? []);
    }
  } catch (err) {
    console.error("applyQueuedAction:", err);
    return { ok: false, error: "ACTION_FAILED" };
  }
  return { ok: false, error: "UNKNOWN_ACTION" };
}

/**
 * Append an action to the room's queue (never lost once this returns), then fold.
 * `view` gets the action's own result when this request applied it, else undefined
 * (another request applied it). "queued" = accepted but not folded yet (contention);
 * the next poll folds it.
 */
export async function runRoomAction<T>(
  rawCode: string,
  action: QueuedAction,
  view: (room: LiveRoom, result: ActionResult | undefined) => T,
): Promise<RoomOutcome<T> | { kind: "queued" }> {
  const code = rawCode.trim().toUpperCase();
  if (!ROOM_CODE_RE.test(code)) return { kind: "missing" };
  let q: Awaited<ReturnType<typeof enqueueAndLoad>>;
  try {
    q = await enqueueAndLoad(code, action);
  } catch (err) {
    console.error("runRoomAction.enqueue:", err);
    return { kind: "busy" };
  }
  if (q == null) return { kind: "missing" };
  const ownId = q.id;
  const out = await withRoom(code, (room, results) => view(room, results.get(ownId)), {
    ownId,
    preloaded: q.rec,
  });
  if (out.kind === "busy") return { kind: "queued" };
  return out;
}

export function verifyHost(room: LiveRoom, hostToken: string | undefined): boolean {
  if (!hostToken) return false;
  return room.host_token_hash === sha256Hex(hostToken);
}

export function hostView(room: LiveRoom) {
  maybeAutoLock(room);
  maybeClearMismatches(room);
  ensureHostPlayer(room);
  if (room.game_type === "memory_match" && room.phase === "matching") {
    ensurePlayerMatchState(room, HOST_PLAYER_ID);
  }
  if (room.game_type === "timed_race" && room.phase === "racing") {
    ensurePlayerRaceState(room, HOST_PLAYER_ID);
  }
  if (room.game_type === "scavenger_tap" && room.phase === "scavenging") {
    ensurePlayerScavengerState(room, HOST_PLAYER_ID);
  }
  if (room.game_type === "sequence_sort" && room.phase === "sorting") {
    ensurePlayerSequenceState(room, HOST_PLAYER_ID);
  }
  if (room.game_type === "category_sort" && room.phase === "binning") {
    ensurePlayerCategoryState(room, HOST_PLAYER_ID);
  }
  if (room.game_type === "odd_one_out" && room.phase === "odding") {
    ensurePlayerOddState(room, HOST_PLAYER_ID);
  }
  return sanitizeForHost(room);
}

export function playerView(room: LiveRoom, playerId: string) {
  maybeAutoLock(room);
  maybeClearMismatches(room);
  if (room.game_type === "scavenger_tap" && room.phase === "scavenging") {
    ensurePlayerScavengerState(room, playerId);
  }
  if (room.game_type === "sequence_sort" && room.phase === "sorting") {
    ensurePlayerSequenceState(room, playerId);
  }
  if (room.game_type === "category_sort" && room.phase === "binning") {
    ensurePlayerCategoryState(room, playerId);
  }
  if (room.game_type === "odd_one_out" && room.phase === "odding") {
    ensurePlayerOddState(room, playerId);
  }
  if (room.game_type === "true_false_dash" && room.phase === "dashing") {
    ensurePlayerDashState(room, playerId);
  }
  return sanitizeForPlayer(room, playerId);
}

export type JoinResult =
  | {
      ok: true;
      player_id: string;
      resume_secret: string;
      view: NonNullable<ReturnType<typeof sanitizeForPlayer>>;
    }
  | { ok: false; error: string };

export function joinRoom(
  room: LiveRoom,
  displayName: string,
  resume?: { player_id: string; resume_secret: string },
  preset?: { player_id: string; resume_secret: string },
): JoinResult {
  if (room.phase === "final") return { ok: false, error: "ROOM_ENDED" };

  // Resume existing player
  if (resume?.player_id && resume.resume_secret) {
    const existing = room.players[resume.player_id];
    if (
      existing &&
      existing.resume_secret_hash === sha256Hex(resume.resume_secret)
    ) {
      existing.connected = true;
      if (room.game_type === "memory_match" && room.phase === "matching") {
        ensurePlayerMatchState(room, existing.player_id);
      }
      if (room.game_type === "timed_race" && room.phase === "racing") {
        ensurePlayerRaceState(room, existing.player_id);
      }
      if (room.game_type === "scavenger_tap" && room.phase === "scavenging") {
        ensurePlayerScavengerState(room, existing.player_id);
      }
      if (room.game_type === "sequence_sort" && room.phase === "sorting") {
        ensurePlayerSequenceState(room, existing.player_id);
      }
      if (room.game_type === "category_sort" && room.phase === "binning") {
        ensurePlayerCategoryState(room, existing.player_id);
      }
      if (room.game_type === "odd_one_out" && room.phase === "odding") {
        ensurePlayerOddState(room, existing.player_id);
      }
      if (room.game_type === "true_false_dash" && room.phase === "dashing") {
        ensurePlayerDashState(room, existing.player_id);
      }
      const view = sanitizeForPlayer(room, existing.player_id);
      if (!view) return { ok: false, error: "JOIN_FAILED" };
      return {
        ok: true,
        player_id: existing.player_id,
        resume_secret: resume.resume_secret,
        view,
      };
    }
  }

  if (room.lobby_locked && room.phase !== "lobby") {
    // allow join only in lobby if locked after start? Design: lock_lobby rejects new joins anytime
  }
  if (room.lobby_locked) return { ok: false, error: "LOBBY_LOCKED" };

  const name = displayName.trim().slice(0, 16);
  if (name.length < 2) return { ok: false, error: "NAME_INVALID" };

  const count = studentPlayerCount(room);
  if (count >= MAX_PLAYERS) return { ok: false, error: "ROOM_FULL" };

  // Unique display name suffix
  let finalName = name;
  const taken = new Set(
    Object.values(room.players).map((p) => p.display_name.toLowerCase()),
  );
  if (taken.has(finalName.toLowerCase())) {
    let n = 2;
    while (taken.has(`${name}${n}`.toLowerCase()) && n < 99) n++;
    finalName = `${name}${n}`.slice(0, 16);
  }

  const player_id = preset?.player_id ?? generateId("pl");
  const resume_secret = preset?.resume_secret ?? generateOpaqueToken();
  const player: LivePlayer = {
    player_id,
    display_name: finalName,
    score: 0,
    connected: true,
    resume_secret_hash: sha256Hex(resume_secret),
  };
  room.players[player_id] = player;
  if (room.game_type === "memory_match" && room.phase === "matching") {
    ensurePlayerMatchState(room, player_id);
  }
  if (room.game_type === "timed_race" && room.phase === "racing") {
    ensurePlayerRaceState(room, player_id);
  }
  if (room.game_type === "scavenger_tap" && room.phase === "scavenging") {
    ensurePlayerScavengerState(room, player_id);
  }
  if (room.game_type === "sequence_sort" && room.phase === "sorting") {
    ensurePlayerSequenceState(room, player_id);
  }
  if (room.game_type === "category_sort" && room.phase === "binning") {
    ensurePlayerCategoryState(room, player_id);
  }
  if (room.game_type === "odd_one_out" && room.phase === "odding") {
    ensurePlayerOddState(room, player_id);
  }
  if (room.game_type === "true_false_dash" && room.phase === "dashing") {
    ensurePlayerDashState(room, player_id);
  }

  const view = sanitizeForPlayer(room, player_id);
  if (!view) return { ok: false, error: "JOIN_FAILED" };
  return { ok: true, player_id, resume_secret, view };
}

export type HostAction =
  | { type: "start_game" }
  | { type: "select_cell"; cell_id: string }
  | { type: "open_question" }
  | { type: "lock" }
  | { type: "reveal" }
  | { type: "back_to_board" }
  | { type: "end_game" }
  | { type: "play_again" }
  | { type: "return_to_game" }
  | { type: "lock_lobby"; locked: boolean }
  | { type: "kick"; player_id: string }
  | { type: "next_clue" }
  | { type: "next_prompt" }
  | { type: "next_item" }
  | { type: "next_round" }
  | { type: "next_claim" }
  | { type: "host_answer"; choice_index: number }
  | { type: "host_wager"; amount: number }
  | { type: "host_flip"; card_index: number }
  | { type: "host_race"; choice_index: number }
  | { type: "host_scavenge"; target_id: string }
  | { type: "host_sort"; order: string[] }
  | { type: "host_bin"; category_id: string }
  | { type: "host_odd"; option_id: string }
  | { type: "host_claim"; answer: boolean };

export function applyHostAction(
  room: LiveRoom,
  action: HostAction,
): { ok: true } | { ok: false; error: string } {
  maybeAutoLock(room);

  switch (action.type) {
    case "start_game": {
      if (room.phase !== "lobby") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      ensureHostPlayer(room);
      if (room.game_type === "memory_match") {
        for (const pid of Object.keys(room.players)) {
          ensurePlayerMatchState(room, pid);
        }
        room.phase = "matching";
      } else if (room.game_type === "timed_race") {
        for (const pid of Object.keys(room.players)) {
          ensurePlayerRaceState(room, pid);
        }
        room.race_ends_at = new Date(
          Date.now() + room.answer_seconds * 1000,
        ).toISOString();
        room.phase = "racing";
      } else if (room.game_type === "scavenger_tap") {
        room.scavenger_index = 0;
        for (const pid of Object.keys(room.players)) {
          ensurePlayerScavengerState(room, pid);
        }
        room.phase = "scavenging";
      } else if (room.game_type === "sequence_sort") {
        room.sequence_index = 0;
        for (const pid of Object.keys(room.players)) {
          ensurePlayerSequenceState(room, pid);
        }
        room.phase = "sorting";
      } else if (room.game_type === "category_sort") {
        room.category_index = 0;
        for (const pid of Object.keys(room.players)) {
          ensurePlayerCategoryState(room, pid);
        }
        room.phase = "binning";
      } else if (room.game_type === "odd_one_out") {
        room.odd_index = 0;
        for (const pid of Object.keys(room.players)) {
          ensurePlayerOddState(room, pid);
        }
        room.phase = "odding";
      } else if (room.game_type === "true_false_dash") {
        room.dash_index = 0;
        for (const pid of Object.keys(room.players)) {
          ensurePlayerDashState(room, pid);
        }
        room.phase = "dashing";
      } else {
        room.phase = "board";
      }
      return { ok: true };
    }
    case "next_clue": {
      if (room.game_type !== "scavenger_tap") {
        return { ok: false, error: "NOT_SCAVENGER" };
      }
      if (room.phase !== "scavenging") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      const items = scavengerItemsFromBoard(room.board);
      if (room.scavenger_index >= items.length - 1) {
        return { ok: false, error: "NO_MORE_CLUES" };
      }
      room.scavenger_index += 1;
      return { ok: true };
    }
    case "next_prompt": {
      if (room.game_type !== "sequence_sort") {
        return { ok: false, error: "NOT_SEQUENCE" };
      }
      if (room.phase !== "sorting") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      const items = sequenceItemsFromBoard(room.board);
      if (room.sequence_index >= items.length - 1) {
        return { ok: false, error: "NO_MORE_PROMPTS" };
      }
      room.sequence_index += 1;
      return { ok: true };
    }
    case "next_item": {
      if (room.game_type !== "category_sort") {
        return { ok: false, error: "NOT_CATEGORY" };
      }
      if (room.phase !== "binning") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      const items = categoryItemsFromBoard(room.board);
      if (room.category_index >= items.length - 1) {
        return { ok: false, error: "NO_MORE_ITEMS" };
      }
      room.category_index += 1;
      return { ok: true };
    }
    case "next_round": {
      if (room.game_type !== "odd_one_out") {
        return { ok: false, error: "NOT_ODD_ONE_OUT" };
      }
      if (room.phase !== "odding") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      const items = oddItemsFromBoard(room.board);
      if (room.odd_index >= items.length - 1) {
        return { ok: false, error: "NO_MORE_ROUNDS" };
      }
      room.odd_index += 1;
      return { ok: true };
    }
    case "next_claim": {
      if (room.game_type !== "true_false_dash") {
        return { ok: false, error: "NOT_TRUE_FALSE" };
      }
      if (room.phase !== "dashing") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      const items = dashItemsFromBoard(room.board);
      if (room.dash_index >= items.length - 1) {
        return { ok: false, error: "NO_MORE_CLAIMS" };
      }
      room.dash_index += 1;
      return { ok: true };
    }
    case "select_cell": {
      if (room.phase === "lobby") room.phase = "board";
      if (room.phase !== "board") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      const cell = getCell(room.board, action.cell_id);
      if (!cell) return { ok: false, error: "CELL_NOT_FOUND" };
      if (room.used_cell_ids.includes(action.cell_id)) {
        return { ok: false, error: "CELL_USED" };
      }
      room.active_cell_id = action.cell_id;
      return { ok: true };
    }
    case "open_question": {
      const ddCell = room.active_cell_id
        ? getCell(room.board, room.active_cell_id)
        : undefined;
      // Daily Double: board → dd_wager (wager step) → question_open.
      if (room.phase === "board" && room.active_cell_id && ddCell?.daily_double) {
        room.phase = "dd_wager";
        room.wagers = {};
        room.answers = {};
        room.points_awarded = {};
        room.open_until = null;
        return { ok: true };
      }
      if (room.phase === "dd_wager" && ddCell) {
        // Anyone who didn't lock a wager plays for the cell's face value.
        const wagers = room.wagers ?? {};
        for (const pid of Object.keys(room.players)) {
          if (wagers[pid] === undefined) {
            wagers[pid] = Math.min(ddCell.points, maxWagerFor(room, pid));
          }
        }
        room.wagers = wagers;
      } else if (room.phase !== "board" || !room.active_cell_id) {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      room.phase = "question_open";
      room.answers = {};
      room.points_awarded = {};
      room.open_until = new Date(
        Date.now() + room.answer_seconds * 1000,
      ).toISOString();
      return { ok: true };
    }
    case "lock": {
      if (room.phase !== "question_open") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      room.phase = "question_locked";
      room.open_until = null;
      return { ok: true };
    }
    case "reveal": {
      if (room.phase === "reveal") {
        return { ok: false, error: "ALREADY_REVEALED" };
      }
      if (room.phase === "question_open") {
        room.phase = "question_locked";
        room.open_until = null;
      }
      if (room.phase !== "question_locked") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }

      const cell = room.active_cell_id
        ? getCell(room.board, room.active_cell_id)
        : undefined;
      if (!cell) return { ok: false, error: "NO_ACTIVE_CELL" };

      // Idempotent scoring once
      if (Object.keys(room.points_awarded).length === 0) {
        if (cell.daily_double) {
          // DD: right answer adds the wager, wrong answer subtracts it.
          // Players who never answered keep their score.
          for (const [pid, choice] of Object.entries(room.answers)) {
            const wager = room.wagers?.[pid] ?? cell.points;
            const delta = choice === cell.correct_index ? wager : -wager;
            room.points_awarded[pid] = delta;
            const p = room.players[pid];
            if (p) p.score += delta;
          }
        } else {
          const award = cell.points;
          for (const [pid, choice] of Object.entries(room.answers)) {
            if (choice === cell.correct_index) {
              room.points_awarded[pid] = award;
              const p = room.players[pid];
              if (p) p.score += award;
            }
          }
        }
      }
      room.phase = "reveal";
      return { ok: true };
    }
    case "back_to_board": {
      if (room.phase !== "reveal") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      if (room.active_cell_id && !room.used_cell_ids.includes(room.active_cell_id)) {
        room.used_cell_ids.push(room.active_cell_id);
      }
      room.active_cell_id = null;
      room.answers = {};
      room.points_awarded = {};
      room.wagers = {};
      room.open_until = null;
      room.phase = "board";
      return { ok: true };
    }
    case "end_game": {
      room.phase = "final";
      room.ended_at = new Date().toISOString();
      room.open_until = null;
      return { ok: true };
    }
    case "play_again":
    case "return_to_game": {
      if (room.phase !== "final") {
        return { ok: false, error: "ILLEGAL_TRANSITION" };
      }
      resetRoomToLobby(room);
      return { ok: true };
    }
    case "lock_lobby": {
      room.lobby_locked = action.locked;
      return { ok: true };
    }
    case "kick": {
      if (action.player_id === HOST_PLAYER_ID) {
        return { ok: false, error: "CANNOT_KICK_HOST" };
      }
      delete room.players[action.player_id];
      delete room.answers[action.player_id];
      if (room.wagers) delete room.wagers[action.player_id];
      delete room.match_states[action.player_id];
      delete room.race_states[action.player_id];
      delete room.scavenger_states[action.player_id];
      delete room.sequence_states[action.player_id];
      delete room.category_states[action.player_id];
      delete room.odd_states[action.player_id];
      delete room.dash_states[action.player_id];
      return { ok: true };
    }
    case "host_wager": {
      ensureHostPlayer(room);
      return submitWager(room, HOST_PLAYER_ID, action.amount);
    }
    case "host_answer": {
      ensureHostPlayer(room);
      return submitAnswer(room, HOST_PLAYER_ID, action.choice_index);
    }
    case "host_flip": {
      ensureHostPlayer(room);
      return flipMatchCard(room, HOST_PLAYER_ID, action.card_index);
    }
    case "host_race": {
      ensureHostPlayer(room);
      return submitRaceAnswer(room, HOST_PLAYER_ID, action.choice_index);
    }
    case "host_scavenge": {
      ensureHostPlayer(room);
      return submitScavengerTap(room, HOST_PLAYER_ID, action.target_id);
    }
    case "host_sort": {
      ensureHostPlayer(room);
      return submitSequenceOrder(room, HOST_PLAYER_ID, action.order);
    }
    case "host_bin": {
      ensureHostPlayer(room);
      return submitCategoryTap(room, HOST_PLAYER_ID, action.category_id);
    }
    case "host_odd": {
      ensureHostPlayer(room);
      return submitOddTap(room, HOST_PLAYER_ID, action.option_id);
    }
    case "host_claim": {
      ensureHostPlayer(room);
      return submitDashTap(room, HOST_PLAYER_ID, action.answer);
    }
    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}

export function flipMatchCard(
  room: LiveRoom,
  playerId: string,
  cardIndex: number,
): { ok: true } | { ok: false; error: string } {
  maybeClearMismatches(room);
  if (room.game_type !== "memory_match") {
    return { ok: false, error: "NOT_MEMORY_MATCH" };
  }
  if (room.phase !== "matching") {
    return { ok: false, error: "NOT_ACCEPTING_FLIPS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  ensurePlayerMatchState(room, playerId);
  const state = room.match_states[playerId];
  if (!state) return { ok: false, error: "NO_MATCH_STATE" };
  const result = applyCardFlip(state, cardIndex);
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitRaceAnswer(
  room: LiveRoom,
  playerId: string,
  choiceIndex: number,
): { ok: true } | { ok: false; error: string } {
  if (room.game_type !== "timed_race") {
    return { ok: false, error: "NOT_TIMED_RACE" };
  }
  if (room.phase !== "racing") {
    return { ok: false, error: "NOT_ACCEPTING_ANSWERS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (raceTimeUp(room.race_ends_at)) {
    return { ok: false, error: "TIME_UP" };
  }
  ensurePlayerRaceState(room, playerId);
  const state = room.race_states[playerId];
  if (!state) return { ok: false, error: "NO_RACE_STATE" };
  const result = applyRaceAnswer(state, choiceIndex, {
    endsAt: room.race_ends_at,
  });
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitScavengerTap(
  room: LiveRoom,
  playerId: string,
  targetId: string,
): { ok: true } | { ok: false; error: string } {
  if (room.game_type !== "scavenger_tap") {
    return { ok: false, error: "NOT_SCAVENGER" };
  }
  if (room.phase !== "scavenging") {
    return { ok: false, error: "NOT_ACCEPTING_TAPS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (!targetId) return { ok: false, error: "INVALID_TARGET" };
  ensurePlayerScavengerState(room, playerId);
  const state = room.scavenger_states[playerId];
  if (!state) return { ok: false, error: "NO_SCAVENGER_STATE" };
  const result = applyScavengerTap(
    state,
    room.scavenger_index,
    targetId,
    scavengerItemsFromBoard(room.board),
  );
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitSequenceOrder(
  room: LiveRoom,
  playerId: string,
  order: string[],
): { ok: true } | { ok: false; error: string } {
  if (room.game_type !== "sequence_sort") {
    return { ok: false, error: "NOT_SEQUENCE" };
  }
  if (room.phase !== "sorting") {
    return { ok: false, error: "NOT_ACCEPTING_ORDERS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (!Array.isArray(order) || order.length === 0) {
    return { ok: false, error: "INVALID_ORDER" };
  }
  ensurePlayerSequenceState(room, playerId);
  const state = room.sequence_states[playerId];
  if (!state) return { ok: false, error: "NO_SEQUENCE_STATE" };
  const result = applySequenceSubmit(
    state,
    room.sequence_index,
    order,
    sequenceItemsFromBoard(room.board),
  );
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitCategoryTap(
  room: LiveRoom,
  playerId: string,
  categoryId: string,
): { ok: true } | { ok: false; error: string } {
  if (room.game_type !== "category_sort") {
    return { ok: false, error: "NOT_CATEGORY" };
  }
  if (room.phase !== "binning") {
    return { ok: false, error: "NOT_ACCEPTING_TAPS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (!categoryId) return { ok: false, error: "INVALID_CATEGORY" };
  ensurePlayerCategoryState(room, playerId);
  const state = room.category_states[playerId];
  if (!state) return { ok: false, error: "NO_CATEGORY_STATE" };
  const result = applyCategoryTap(
    state,
    room.category_index,
    categoryId,
    categoryItemsFromBoard(room.board),
  );
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitOddTap(
  room: LiveRoom,
  playerId: string,
  optionId: string,
): { ok: true } | { ok: false; error: string } {
  if (room.game_type !== "odd_one_out") {
    return { ok: false, error: "NOT_ODD_ONE_OUT" };
  }
  if (room.phase !== "odding") {
    return { ok: false, error: "NOT_ACCEPTING_TAPS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (!optionId) return { ok: false, error: "INVALID_OPTION" };
  ensurePlayerOddState(room, playerId);
  const state = room.odd_states[playerId];
  if (!state) return { ok: false, error: "NO_ODD_STATE" };
  const result = applyOddTap(
    state,
    room.odd_index,
    optionId,
    oddItemsFromBoard(room.board),
  );
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitDashTap(
  room: LiveRoom,
  playerId: string,
  answer: boolean,
): { ok: true } | { ok: false; error: string } {
  if (room.game_type !== "true_false_dash") {
    return { ok: false, error: "NOT_TRUE_FALSE" };
  }
  if (room.phase !== "dashing") {
    return { ok: false, error: "NOT_ACCEPTING_TAPS" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (typeof answer !== "boolean") return { ok: false, error: "INVALID_ANSWER" };
  ensurePlayerDashState(room, playerId);
  const state = room.dash_states[playerId];
  if (!state) return { ok: false, error: "NO_DASH_STATE" };
  const result = applyDashTap(
    state,
    room.dash_index,
    answer,
    dashItemsFromBoard(room.board),
  );
  if (!result.ok) return result;
  if (result.points > 0) {
    room.players[playerId]!.score += result.points;
  }
  return { ok: true };
}

export function submitAnswer(
  room: LiveRoom,
  playerId: string,
  choiceIndex: number,
): { ok: true } | { ok: false; error: string } {
  maybeAutoLock(room);
  if (
    room.game_type === "memory_match" ||
    room.game_type === "timed_race" ||
    room.game_type === "scavenger_tap" ||
    room.game_type === "sequence_sort" ||
    room.game_type === "category_sort" ||
    room.game_type === "odd_one_out" ||
    room.game_type === "true_false_dash"
  ) {
    return { ok: false, error: "NOT_ACCEPTING_ANSWERS" };
  }
  if (room.phase !== "question_open") {
    return { ok: false, error: "NOT_ACCEPTING_ANSWERS" };
  }
  if (room.open_until && Date.now() > new Date(room.open_until).getTime()) {
    room.phase = "question_locked";
    room.open_until = null;
    return { ok: false, error: "TIME_UP" };
  }
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (choiceIndex < 0 || choiceIndex > 3) {
    return { ok: false, error: "INVALID_CHOICE" };
  }
  // First answer sticks (idempotent)
  if (room.answers[playerId] === undefined) {
    room.answers[playerId] = choiceIndex;
  }
  return { ok: true };
}

/** Daily Double wager step. Whole points, 0..max(score, top board value). Re-bets allowed until the host opens the question. */
export function submitWager(
  room: LiveRoom,
  playerId: string,
  amount: number,
): { ok: true } | { ok: false; error: string } {
  if (room.phase !== "dd_wager") return { ok: false, error: "NOT_ACCEPTING_WAGERS" };
  if (!room.players[playerId]) return { ok: false, error: "NOT_A_PLAYER" };
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return { ok: false, error: "INVALID_WAGER" };
  }
  const max = maxWagerFor(room, playerId);
  const wager = Math.round(amount);
  if (wager < 0 || wager > max) return { ok: false, error: "WAGER_OUT_OF_RANGE" };
  room.wagers = { ...(room.wagers ?? {}), [playerId]: wager };
  return { ok: true };
}
