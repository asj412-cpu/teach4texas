import type { GameBoard } from "@/lib/domain/board";
import {
  getCell,
  type LivePlayer,
  type LiveRoom,
  sanitizeForHost,
  sanitizeForPlayer,
} from "@/lib/domain/live-room";
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

export function createLiveRoom(opts: {
  board: GameBoard;
  answerSeconds?: number;
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
  const room: LiveRoom = {
    code,
    board_id: opts.board.id,
    board: opts.board,
    host_token_hash: sha256Hex(hostToken),
    phase: "lobby",
    players: {},
    active_cell_id: null,
    used_cell_ids: [],
    answers: {},
    points_awarded: {},
    open_until: null,
    answer_seconds: opts.answerSeconds ?? DEFAULT_ANSWER_SECONDS,
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
  if (room) maybeAutoLock(room);
  return room;
}

export function verifyHost(room: LiveRoom, hostToken: string | undefined): boolean {
  if (!hostToken) return false;
  return room.host_token_hash === sha256Hex(hostToken);
}

export function hostView(room: LiveRoom) {
  maybeAutoLock(room);
  return sanitizeForHost(room);
}

export function playerView(room: LiveRoom, playerId: string) {
  maybeAutoLock(room);
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
  | { type: "kick"; player_id: string };

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
      room.phase = "board";
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
      return { ok: true };
    }
    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}

export function submitAnswer(
  room: LiveRoom,
  playerId: string,
  choiceIndex: number,
): { ok: true } | { ok: false; error: string } {
  maybeAutoLock(room);
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
