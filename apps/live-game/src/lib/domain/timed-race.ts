import type { GameBoard, TimedRaceItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const TIMED_RACE_POINTS_PER_CORRECT = 100;
export const TIMED_RACE_SECONDS = 90;
export const TIMED_RACE_MAX_ITEMS = 8;

export type PlayerRaceState = {
  items: TimedRaceItem[];
  cursor: number;
  correct_count: number;
  completed_at: string | null;
};

export type PlayerRaceView = {
  item_total: number;
  item_index: number;
  correct_count: number;
  completed: boolean;
  can_answer: boolean;
  time_remaining_ms: number;
  ends_at: string | null;
  prompt: string | null;
  choices: [string, string, string, string] | null;
};

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function raceItemsFromBoard(board: GameBoard): TimedRaceItem[] {
  if (board.race_items && board.race_items.length >= 4) {
    return board.race_items.slice(0, TIMED_RACE_MAX_ITEMS);
  }
  return (board.cells ?? []).slice(0, TIMED_RACE_MAX_ITEMS).map((cell) => ({
    id: cell.id,
    prompt: cell.question,
    choices: cell.choices,
    correct_index: cell.correct_index,
    teks: cell.teks,
  }));
}

export function createPlayerRaceState(items: TimedRaceItem[]): PlayerRaceState {
  return {
    items: shuffle(items.map((item) => ({ ...item }))),
    cursor: 0,
    correct_count: 0,
    completed_at: null,
  };
}

export function remainingMs(endsAt: string | null, now = Date.now()): number {
  if (!endsAt) return 0;
  return Math.max(0, new Date(endsAt).getTime() - now);
}

export function raceTimeUp(endsAt: string | null, now = Date.now()): boolean {
  return remainingMs(endsAt, now) <= 0;
}

/** Returns points awarded this answer (0 or TIMED_RACE_POINTS_PER_CORRECT). */
export function applyRaceAnswer(
  state: PlayerRaceState,
  choiceIndex: number,
  opts: { endsAt: string | null; now?: number } = { endsAt: null },
): { ok: true; points: number } | { ok: false; error: string } {
  const now = opts.now ?? Date.now();
  if (state.completed_at) return { ok: false, error: "ALREADY_COMPLETE" };
  if (raceTimeUp(opts.endsAt, now)) return { ok: false, error: "TIME_UP" };
  if (choiceIndex < 0 || choiceIndex > 3) {
    return { ok: false, error: "INVALID_CHOICE" };
  }
  const item = state.items[state.cursor];
  if (!item) return { ok: false, error: "NO_ITEM" };

  const points =
    choiceIndex === item.correct_index ? TIMED_RACE_POINTS_PER_CORRECT : 0;
  if (points > 0) state.correct_count += 1;
  state.cursor += 1;
  if (state.cursor >= state.items.length) {
    state.completed_at = new Date(now).toISOString();
  }
  return { ok: true, points };
}

export function toPlayerRaceView(
  state: PlayerRaceState,
  endsAt: string | null,
  now = Date.now(),
): PlayerRaceView {
  const remaining = remainingMs(endsAt, now);
  const expired = remaining <= 0;
  const completed = Boolean(state.completed_at);
  const item = !completed && !expired ? (state.items[state.cursor] ?? null) : null;
  return {
    item_total: state.items.length,
    item_index: Math.min(state.cursor, state.items.length),
    correct_count: state.correct_count,
    completed,
    can_answer: Boolean(item) && !expired && !completed,
    time_remaining_ms: remaining,
    ends_at: endsAt,
    prompt: item ? kidPlainText(item.prompt, 200) : null,
    choices: item
      ? [
          kidPlainText(item.choices[0], 80),
          kidPlainText(item.choices[1], 80),
          kidPlainText(item.choices[2], 80),
          kidPlainText(item.choices[3], 80),
        ]
      : null,
  };
}
