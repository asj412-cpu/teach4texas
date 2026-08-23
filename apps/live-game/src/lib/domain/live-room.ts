import { z } from "zod";
import type { GameBoard, QuestionCell } from "@/lib/domain/board";

export const RoomPhaseSchema = z.enum([
  "lobby",
  "board",
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
  host_token_hash: string;
  phase: RoomPhase;
  players: Record<string, LivePlayer>;
  active_cell_id: string | null;
  used_cell_ids: string[];
  /** player_id → choice_index for active question */
  answers: Record<string, number>;
  /** player_id → points for active cell (after reveal) */
  points_awarded: Record<string, number>;
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
  board: GameBoard;
  players: { player_id: string; display_name: string; score: number; connected: boolean }[];
  active_cell_id: string | null;
  used_cell_ids: string[];
  answers: Record<string, number>;
  answer_count: number;
  points_awarded: Record<string, number>;
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
  open_until: string | null;
  answer_seconds: number;
  server_now: string;
};

export function getCell(board: GameBoard, cellId: string): QuestionCell | undefined {
  return board.cells.find((c) => c.id === cellId);
}

export function sanitizeForHost(room: LiveRoom): HostRoomView {
  return {
    role: "host",
    code: room.code,
    phase: room.phase,
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

  const categories = [...new Set(room.board.cells.map((c) => c.category))];
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
      cells: room.board.cells.map((c) => ({
        id: c.id,
        category: c.category,
        points: c.points,
        used: used.has(c.id),
        active: c.id === room.active_cell_id,
      })),
    },
    active_question,
    open_until: room.open_until,
    answer_seconds: room.answer_seconds,
    server_now: new Date().toISOString(),
  };
}
