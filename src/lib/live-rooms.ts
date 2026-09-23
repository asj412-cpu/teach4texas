import type { GameBoard, GameType } from "@/lib/domain/board";
import { resolvePlayableGameType } from "@/lib/domain/board";
import {
  getCell,
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
  generateId,
  generateOpaqueToken,
  sha256Hex,
} from "@/lib/crypto";

const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_ANSWER_SECONDS = 45;
const MAX_PLAYERS = 40;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

type GlobalRooms = {
  rooms: Map<string, LiveRoom>;
};

function g(): GlobalRooms {
  const key = "__t4t_live_rooms__";
  const root = globalThis as unknown as Record<string, GlobalRooms>;
  if (!root[key]) {
    root[key] = { rooms: new Map() };
  }
  return root[key];
}

function randomRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function purgeExpired() {
  const now = Date.now();
  for (const [code, room] of g().rooms) {
    const created = new Date(room.created_at).getTime();
    if (now - created > ROOM_TTL_MS || room.ended_at) {
      if (room.ended_at && now - new Date(room.ended_at).getTime() > 10 * 60 * 1000) {
        g().rooms.delete(code);
      } else if (!room.ended_at && now - created > ROOM_TTL_MS) {
        g().rooms.delete(code);
      }
    }
  }
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

export function createLiveRoom(opts: {
  board: GameBoard;
  answerSeconds?: number;
  gameType?: string | null;
}): { room: LiveRoom; hostToken: string } {
  purgeExpired();
  let code = randomRoomCode();
  for (let i = 0; i < 20 && g().rooms.has(code); i++) {
    code = randomRoomCode();
  }
  if (g().rooms.has(code)) {
    throw new Error("CODE_COLLISION");
  }

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
    open_until: null,
    answer_seconds:
      opts.answerSeconds ??
      (gameType === "timed_race" ? TIMED_RACE_SECONDS : DEFAULT_ANSWER_SECONDS),
    lobby_locked: false,
    created_at: new Date().toISOString(),
    ended_at: null,
  };
  g().rooms.set(code, room);
  return { room, hostToken };
}

export function getRoom(code: string): LiveRoom | null {
  purgeExpired();
  const room = g().rooms.get(code.toUpperCase()) ?? null;
  if (room) {
    maybeAutoLock(room);
    maybeClearMismatches(room);
  }
  return room;
}

export function verifyHost(room: LiveRoom, hostToken: string | undefined): boolean {
  if (!hostToken) return false;
  return room.host_token_hash === sha256Hex(hostToken);
}

export function hostView(room: LiveRoom) {
  maybeAutoLock(room);
  maybeClearMismatches(room);
  return sanitizeForHost(room);
}

export function playerView(room: LiveRoom, playerId: string) {
  maybeAutoLock(room);
  maybeClearMismatches(room);
  if (room.game_type === "scavenger_tap" && room.phase === "scavenging") {
    ensurePlayerScavengerState(room, playerId);
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
  code: string,
  displayName: string,
  resume?: { player_id: string; resume_secret: string },
): JoinResult {
  const room = getRoom(code);
  if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
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

  const count = Object.keys(room.players).length;
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

  const player_id = generateId("pl");
  const resume_secret = generateOpaqueToken();
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
  | { type: "lock_lobby"; locked: boolean }
  | { type: "kick"; player_id: string }
  | { type: "next_clue" };

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
      if (room.phase !== "board" || !room.active_cell_id) {
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
        const base = cell.points;
        const mult = cell.daily_double ? 2 : 1;
        const award = base * mult;
        for (const [pid, choice] of Object.entries(room.answers)) {
          if (choice === cell.correct_index) {
            room.points_awarded[pid] = award;
            const p = room.players[pid];
            if (p) p.score += award;
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
    case "lock_lobby": {
      room.lobby_locked = action.locked;
      return { ok: true };
    }
    case "kick": {
      delete room.players[action.player_id];
      delete room.answers[action.player_id];
      delete room.match_states[action.player_id];
      delete room.race_states[action.player_id];
      delete room.scavenger_states[action.player_id];
      return { ok: true };
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

export function submitAnswer(
  room: LiveRoom,
  playerId: string,
  choiceIndex: number,
): { ok: true } | { ok: false; error: string } {
  maybeAutoLock(room);
  if (
    room.game_type === "memory_match" ||
    room.game_type === "timed_race" ||
    room.game_type === "scavenger_tap"
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
