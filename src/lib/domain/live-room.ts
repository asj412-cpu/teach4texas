import { z } from "zod";
import type { GameBoard, GameType, QuestionCell } from "@/lib/domain/board";
import {
  itemsFromBoard,
  toPlayerMatchView,
  type PlayerMatchState,
  type PlayerMatchView,
} from "@/lib/domain/memory-match";
import {
  raceItemsFromBoard,
  remainingMs,
  toPlayerRaceView,
  type PlayerRaceState,
  type PlayerRaceView,
} from "@/lib/domain/timed-race";
import { kidPlainText } from "@/lib/plain-text";

export const RoomPhaseSchema = z.enum([
  "lobby",
  "board",
  "matching",
  "racing",
  "question_open",
  "question_locked",
  "reveal",
  "final",
]);

export type RoomPhase = z.infer<typeof RoomPhaseSchema>;

export type LivePlayer = {
  player_id: string;
  display_name: string;
  score: number;
  connected: boolean;
  resume_secret_hash: string;
};

export type LiveRoom = {
  code: string;
  board_id: string;
  /** Full board — host only; never send raw to students. */
  board: GameBoard;
  /** Mechanic for this live session (packet default or host pick). */
  game_type: GameType;
  host_token_hash: string;
  phase: RoomPhase;
  players: Record<string, LivePlayer>;
  active_cell_id: string | null;
  used_cell_ids: string[];
  /** player_id → choice_index for active question */
  answers: Record<string, number>;
  /** player_id → points for active cell (after reveal) */
  points_awarded: Record<string, number>;
  /** Memory Match per-student decks. Host never sends other students' cards. */
  match_states: Record<string, PlayerMatchState>;
  /** Timed Race per-student item order. Host never sends other students' prompts. */
  race_states: Record<string, PlayerRaceState>;
  /** Shared race countdown; null until host starts. */
  race_ends_at: string | null;
  open_until: string | null;
  answer_seconds: number;
  lobby_locked: boolean;
  created_at: string;
  ended_at: string | null;
};

export type HostRoomView = {
  role: "host";
  code: string;
  phase: RoomPhase;
  game_type: GameType;
  board: GameBoard;
  players: { player_id: string; display_name: string; score: number; connected: boolean }[];
  active_cell_id: string | null;
  used_cell_ids: string[];
  answers: Record<string, number>;
  answer_count: number;
  points_awarded: Record<string, number>;
  match: null | {
    pair_total: number;
    players: {
      player_id: string;
      display_name: string;
      pairs_found: number;
      moves: number;
      completed: boolean;
    }[];
    /** Host-only pair key — keep off the 16:9 student-facing stage. */
    pair_key: { prompt: string; match: string }[];
  };
  race: null | {
    item_total: number;
    seconds: number;
    ends_at: string | null;
    time_remaining_ms: number;
    players: {
      player_id: string;
      display_name: string;
      answered: number;
      correct_count: number;
      completed: boolean;
    }[];
    /** Host-only answer key — keep off the 16:9 student-facing stage. */
    item_key: { prompt: string; answer: string }[];
  };
  open_until: string | null;
  answer_seconds: number;
  lobby_locked: boolean;
  server_now: string;
};

export type PlayerRoomView = {
  role: "player";
  code: string;
  phase: RoomPhase;
  title: string;
  grade: number;
  subject: string;
  players: { display_name: string; score: number }[];
  my_player_id: string;
  my_display_name: string;
  my_score: number;
  my_answered: boolean;
  board_grid: {
    categories: string[];
    cells: {
      id: string;
      category: string;
      points: number;
      used: boolean;
      active: boolean;
    }[];
  };
  active_question: null | {
    category: string;
    points: number;
    question: string;
    choices: [string, string, string, string];
    daily_double: boolean;
    /** only when phase === reveal */
    correct_index?: number;
    answer?: string;
    teks?: string;
  };
  game_type: GameType;
  match: PlayerMatchView | null;
  race: PlayerRaceView | null;
  open_until: string | null;
  answer_seconds: number;
  server_now: string;
};

export function getCell(board: GameBoard, cellId: string): QuestionCell | undefined {
  return board.cells.find((c) => c.id === cellId);
}

function hostMatchView(room: LiveRoom): HostRoomView["match"] {
  if (room.game_type !== "memory_match") return null;
  const items = itemsFromBoard(room.board);
  return {
    pair_total: items.length,
    players: Object.values(room.players).map((p) => {
      const st = room.match_states[p.player_id];
      return {
        player_id: p.player_id,
        display_name: p.display_name,
        pairs_found: st?.pairs_found ?? 0,
        moves: st?.moves ?? 0,
        completed: Boolean(st?.completed_at),
      };
    }),
    pair_key: items.map((item) => ({
      prompt: kidPlainText(item.prompt, 80),
      match: kidPlainText(item.match, 80),
    })),
  };
}

function hostRaceView(room: LiveRoom): HostRoomView["race"] {
  if (room.game_type !== "timed_race") return null;
  const items = raceItemsFromBoard(room.board);
  const now = Date.now();
  return {
    item_total: items.length,
    seconds: room.answer_seconds,
    ends_at: room.race_ends_at,
    time_remaining_ms: remainingMs(room.race_ends_at, now),
    players: Object.values(room.players).map((p) => {
      const st = room.race_states[p.player_id];
      return {
        player_id: p.player_id,
        display_name: p.display_name,
        answered: st?.cursor ?? 0,
        correct_count: st?.correct_count ?? 0,
        completed: Boolean(st?.completed_at),
      };
    }),
    item_key: items.map((item) => ({
      prompt: kidPlainText(item.prompt, 80),
      answer: kidPlainText(item.choices[item.correct_index], 80),
    })),
  };
}

export function sanitizeForHost(room: LiveRoom): HostRoomView {
  return {
    role: "host",
    code: room.code,
    phase: room.phase,
    game_type: room.game_type,
    board: room.board,
    players: Object.values(room.players).map((p) => ({
      player_id: p.player_id,
      display_name: p.display_name,
      score: p.score,
      connected: p.connected,
    })),
    active_cell_id: room.active_cell_id,
    used_cell_ids: [...room.used_cell_ids],
    answers: { ...room.answers },
    answer_count: Object.keys(room.answers).length,
    points_awarded: { ...room.points_awarded },
    match: hostMatchView(room),
    race: hostRaceView(room),
    open_until: room.open_until,
    answer_seconds: room.answer_seconds,
    lobby_locked: room.lobby_locked,
    server_now: new Date().toISOString(),
  };
}

export function sanitizeForPlayer(
  room: LiveRoom,
  playerId: string,
): PlayerRoomView | null {
  const me = room.players[playerId];
  if (!me) return null;

  const categories = [...new Set((room.board.cells ?? []).map((c) => c.category))];
  const used = new Set(room.used_cell_ids);

  let active_question: PlayerRoomView["active_question"] = null;
  if (room.active_cell_id) {
    const cell = getCell(room.board, room.active_cell_id);
    if (cell) {
      const base = {
        category: cell.category,
        points: cell.points,
        question: cell.question,
        choices: cell.choices,
        daily_double: cell.daily_double,
      };
      if (room.phase === "reveal" || room.phase === "final") {
        active_question = {
          ...base,
          correct_index: cell.correct_index,
          answer: cell.answer,
          teks: cell.teks,
        };
      } else if (
        room.phase === "question_open" ||
        room.phase === "question_locked"
      ) {
        active_question = base;
      }
    }
  }

  return {
    role: "player",
    code: room.code,
    phase: room.phase,
    title: room.board.title,
    grade: room.board.grade,
    subject: room.board.subject,
    players: Object.values(room.players)
      .map((p) => ({ display_name: p.display_name, score: p.score }))
      .sort((a, b) => b.score - a.score),
    my_player_id: playerId,
    my_display_name: me.display_name,
    my_score: me.score,
    my_answered: room.answers[playerId] !== undefined,
    board_grid: {
      categories,
      cells: (room.board.cells ?? []).map((c) => ({
        id: c.id,
        category: c.category,
        points: c.points,
        used: used.has(c.id),
        active: c.id === room.active_cell_id,
      })),
    },
    active_question,
    game_type: room.game_type,
    match:
      room.game_type === "memory_match" && room.match_states[playerId]
        ? toPlayerMatchView(room.match_states[playerId]!)
        : null,
    race:
      room.game_type === "timed_race" && room.race_states[playerId]
        ? toPlayerRaceView(room.race_states[playerId]!, room.race_ends_at)
        : null,
    open_until: room.open_until,
    answer_seconds: room.answer_seconds,
    server_now: new Date().toISOString(),
  };
}
