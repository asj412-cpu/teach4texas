import type {
  EscapeVaultPuzzle,
  EscapeVaultRoom,
  GameBoard,
} from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const ESCAPE_VAULT_POINTS_PER_CORRECT = 100;
export const ESCAPE_VAULT_MAX_ROOMS = 8;

export const HOST_VAULT_EXCLUDED_ID = "host";

export type VaultLockState = "locked" | "ready" | "revealed" | "open";

export type VaultAnswerPayload = {
  choice_id?: string;
  numeric?: string;
};

export type PlayerVaultState = {
  /** `${roomIndex}:${puzzleIndex}` → first locked answer. */
  answers: Record<string, VaultAnswerPayload>;
  correct_count: number;
};

export type PlayerVaultView = {
  room_total: number;
  room_index: number;
  room_name: string | null;
  room_chip: string | null;
  theme_key: string | null;
  puzzle_total: number;
  puzzle_index: number;
  prompt: string | null;
  kind: "mc" | "numeric" | null;
  choices: { id: string; label: string }[] | null;
  can_answer: boolean;
  answered: boolean;
  picked: string | null;
  last_correct: boolean;
  completed: boolean;
  correct_count: number;
  chips: string[];
  lock_state: VaultLockState;
  revealed: boolean;
  /** Only set after the host taps Reveal: the keyed MC choice id. */
  revealed_choice_id: string | null;
  /** Only set after the host taps Reveal: the keyed answer label. */
  revealed_answer: string | null;
  /** True only when every vault room was unlocked (not on End game early). */
  escaped: boolean;
  /** Board theme string (resolved client-side; Thanksgiving is the default). */
  theme: string | null;
  hint: string | null;
};

/** Every room unlocked → the class truly escaped. */
export function isVaultEscaped(
  rooms: EscapeVaultRoom[],
  unlockedRoomIds: string[],
): boolean {
  return (
    rooms.length > 0 && rooms.every((r) => unlockedRoomIds.includes(r.id))
  );
}

const LETTERS = ["A", "B", "C", "D"] as const;

export function vaultPuzzleKey(roomIndex: number, puzzleIndex: number): string {
  return `${roomIndex}:${puzzleIndex}`;
}

export function normalizeVaultNumeric(raw: string): string {
  return raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "");
}

function mcPuzzleFromChoices(
  id: string,
  prompt: string,
  choices: readonly string[],
  correctIndex: number,
  teks?: string,
): EscapeVaultPuzzle {
  const four = choices.slice(0, 4);
  while (four.length < 4) four.push(`Choice ${LETTERS[four.length]}`);
  const idx = Math.min(Math.max(correctIndex, 0), 3);
  return {
    id,
    prompt: prompt.slice(0, 400),
    kind: "mc",
    choices: four.map((label, i) => ({
      id: LETTERS[i]!,
      label: label.slice(0, 80),
    })),
    correct_choice_id: LETTERS[idx],
    teks,
  };
}

export function vaultRoomsFromBoard(board: GameBoard): EscapeVaultRoom[] {
  if (board.vault_rooms && board.vault_rooms.length >= 2) {
    return board.vault_rooms.slice(0, ESCAPE_VAULT_MAX_ROOMS);
  }
  if (board.race_items && board.race_items.length >= 2) {
    return board.race_items.slice(0, ESCAPE_VAULT_MAX_ROOMS).map((item, i) => ({
      id: `room-${item.id}`,
      name: `Room ${i + 1}`,
      unlock_rule: "majority" as const,
      puzzles: [
        mcPuzzleFromChoices(
          item.id,
          item.prompt,
          item.choices,
          item.correct_index,
          item.teks,
        ),
      ],
    }));
  }
  return (board.cells ?? []).slice(0, ESCAPE_VAULT_MAX_ROOMS).map((cell, i) => ({
    id: `room-${cell.id}`,
    name: cell.category || `Room ${i + 1}`,
    unlock_rule: "majority" as const,
    puzzles: [
      mcPuzzleFromChoices(
        cell.id,
        cell.question,
        cell.choices,
        cell.correct_index,
        cell.teks,
      ),
    ],
  }));
}

export function currentVaultPuzzle(
  rooms: EscapeVaultRoom[],
  roomIndex: number,
  puzzleIndex: number,
): EscapeVaultPuzzle | null {
  return rooms[roomIndex]?.puzzles[puzzleIndex] ?? null;
}

export function currentVaultRoom(
  rooms: EscapeVaultRoom[],
  roomIndex: number,
): EscapeVaultRoom | null {
  return rooms[roomIndex] ?? null;
}

export function createPlayerVaultState(): PlayerVaultState {
  return { answers: {}, correct_count: 0 };
}

export function isVaultAnswerCorrect(
  puzzle: EscapeVaultPuzzle,
  payload: VaultAnswerPayload,
): boolean {
  if (puzzle.kind === "mc") {
    return (
      Boolean(payload.choice_id) && payload.choice_id === puzzle.correct_choice_id
    );
  }
  if (payload.numeric == null) return false;
  return (
    normalizeVaultNumeric(payload.numeric) ===
    normalizeVaultNumeric(puzzle.correct_numeric ?? "")
  );
}

export function applyVaultAnswer(
  state: PlayerVaultState,
  roomIndex: number,
  puzzleIndex: number,
  payload: VaultAnswerPayload,
  rooms: EscapeVaultRoom[],
): { ok: true; points: number } | { ok: false; error: string } {
  const puzzle = currentVaultPuzzle(rooms, roomIndex, puzzleIndex);
  if (!puzzle) return { ok: false, error: "NO_PUZZLE" };
  const key = vaultPuzzleKey(roomIndex, puzzleIndex);
  if (state.answers[key] !== undefined) {
    return { ok: false, error: "ALREADY_ANSWERED" };
  }
  if (puzzle.kind === "mc") {
    if (!payload.choice_id) return { ok: false, error: "INVALID_ANSWER" };
    if (!puzzle.choices?.some((c) => c.id === payload.choice_id)) {
      return { ok: false, error: "INVALID_CHOICE" };
    }
    state.answers[key] = { choice_id: payload.choice_id };
  } else {
    if (payload.numeric == null || !payload.numeric.trim()) {
      return { ok: false, error: "INVALID_ANSWER" };
    }
    state.answers[key] = {
      numeric: normalizeVaultNumeric(payload.numeric),
    };
  }
  const correct = isVaultAnswerCorrect(puzzle, state.answers[key]!);
  if (correct) state.correct_count += 1;
  return {
    ok: true,
    points: correct ? ESCAPE_VAULT_POINTS_PER_CORRECT : 0,
  };
}

export function chipsFromUnlocked(
  rooms: EscapeVaultRoom[],
  unlockedIds: string[],
): string[] {
  const unlocked = new Set(unlockedIds);
  return rooms
    .filter((r) => unlocked.has(r.id) && r.chip)
    .map((r) => r.chip!);
}

export function studentMajorityCorrect(opts: {
  players: { player_id: string; connected: boolean }[];
  hostId?: string;
  states: Record<string, PlayerVaultState>;
  rooms: EscapeVaultRoom[];
  roomIndex: number;
  puzzleIndex: number;
}): boolean {
  const hostId = opts.hostId ?? HOST_VAULT_EXCLUDED_ID;
  const puzzle = currentVaultPuzzle(opts.rooms, opts.roomIndex, opts.puzzleIndex);
  if (!puzzle) return false;
  const students = opts.players.filter(
    (p) => p.player_id !== hostId && p.connected,
  );
  if (students.length === 0) return false;
  const key = vaultPuzzleKey(opts.roomIndex, opts.puzzleIndex);
  const correct = students.filter((p) => {
    const ans = opts.states[p.player_id]?.answers[key];
    return ans ? isVaultAnswerCorrect(puzzle, ans) : false;
  }).length;
  return correct * 2 > students.length;
}

export function canUnlockVault(opts: {
  unlockRule: "majority" | "host";
  majority: boolean;
  revealed: boolean;
}): boolean {
  if (opts.unlockRule === "host") return opts.revealed;
  return opts.majority || opts.revealed;
}

export function resolveVaultLockState(opts: {
  unlocked: boolean;
  majority: boolean;
  revealed: boolean;
}): VaultLockState {
  if (opts.unlocked) return "open";
  if (opts.majority) return "ready";
  if (opts.revealed) return "revealed";
  return "locked";
}

export function toPlayerVaultView(
  state: PlayerVaultState,
  rooms: EscapeVaultRoom[],
  roomIndex: number,
  puzzleIndex: number,
  extra: {
    unlockedRoomIds: string[];
    revealed: boolean;
    lockState: VaultLockState;
    theme?: string | null;
  },
): PlayerVaultView {
  const room = currentVaultRoom(rooms, roomIndex);
  const puzzle = currentVaultPuzzle(rooms, roomIndex, puzzleIndex);
  const key = vaultPuzzleKey(roomIndex, puzzleIndex);
  const raw = state.answers[key];
  const answered = raw !== undefined;
  const lastRoom = Math.max(0, rooms.length - 1);
  const lastPuzzle = Math.max(0, (rooms[lastRoom]?.puzzles.length ?? 1) - 1);
  const lastKey = vaultPuzzleKey(lastRoom, lastPuzzle);
  const completed =
    rooms.length > 0 &&
    extra.unlockedRoomIds.includes(rooms[lastRoom]!.id) &&
    state.answers[lastKey] !== undefined;
  const picked =
    raw?.choice_id ?? (raw?.numeric != null ? raw.numeric : null);
  return {
    room_total: rooms.length,
    room_index: roomIndex,
    room_name: room?.name ?? null,
    room_chip: room?.chip ?? null,
    theme_key: room?.theme_key ?? null,
    puzzle_total: room?.puzzles.length ?? 0,
    puzzle_index: puzzleIndex,
    prompt: puzzle ? kidPlainText(puzzle.prompt, 400) : null,
    kind: puzzle?.kind ?? null,
    choices: puzzle?.choices
      ? puzzle.choices.map((c) => ({
          id: c.id,
          label: kidPlainText(c.label, 80),
        }))
      : null,
    can_answer: Boolean(puzzle) && !answered,
    answered,
    picked,
    last_correct: Boolean(puzzle && answered && isVaultAnswerCorrect(puzzle, raw!)),
    completed,
    correct_count: state.correct_count,
    chips: chipsFromUnlocked(rooms, extra.unlockedRoomIds),
    lock_state: extra.lockState,
    revealed: extra.revealed,
    revealed_choice_id:
      extra.revealed && puzzle?.kind === "mc"
        ? (puzzle.correct_choice_id ?? null)
        : null,
    revealed_answer: extra.revealed && puzzle ? vaultAnswerLabel(puzzle) : null,
    escaped: isVaultEscaped(rooms, extra.unlockedRoomIds),
    theme: extra.theme ?? null,
    hint:
      puzzle?.hint && answered && puzzle
        ? kidPlainText(puzzle.hint, 240)
        : null,
  };
}

export function vaultAnswerLabel(puzzle: EscapeVaultPuzzle): string {
  if (puzzle.kind === "mc") {
    const choice = puzzle.choices?.find((c) => c.id === puzzle.correct_choice_id);
    return choice
      ? `${choice.id}. ${kidPlainText(choice.label, 80)}`
      : (puzzle.correct_choice_id ?? "");
  }
  return puzzle.correct_numeric ?? "";
}
