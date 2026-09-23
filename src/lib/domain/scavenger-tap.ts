import type { GameBoard, ScavengerTapItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const SCAVENGER_TAP_POINTS_PER_CORRECT = 100;
export const SCAVENGER_TAP_MAX_ITEMS = 8;

export type PlayerScavengerState = {
  /** clue index → target_id the student tapped (first tap sticks). */
  answers: Record<number, string>;
  correct_count: number;
};

export type PlayerScavengerView = {
  item_total: number;
  item_index: number;
  prompt: string | null;
  targets: { id: string; label: string }[] | null;
  can_tap: boolean;
  tapped: boolean;
  completed: boolean;
  correct_count: number;
};

export function scavengerItemsFromBoard(board: GameBoard): ScavengerTapItem[] {
  if (board.scavenger_items && board.scavenger_items.length >= 4) {
    return board.scavenger_items.slice(0, SCAVENGER_TAP_MAX_ITEMS);
  }
  if (board.race_items && board.race_items.length >= 4) {
    return board.race_items.slice(0, SCAVENGER_TAP_MAX_ITEMS).map((item) => ({
      id: item.id,
      prompt: item.prompt,
      targets: item.choices.map((label, i) => ({
        id: `${item.id}-t${i}`,
        label,
      })),
      correct_target_id: `${item.id}-t${item.correct_index}`,
      teks: item.teks,
    }));
  }
  return (board.cells ?? []).slice(0, SCAVENGER_TAP_MAX_ITEMS).map((cell) => ({
    id: cell.id,
    prompt: cell.question,
    targets: cell.choices.map((label, i) => ({
      id: `${cell.id}-t${i}`,
      label,
    })),
    correct_target_id: `${cell.id}-t${cell.correct_index}`,
    teks: cell.teks,
  }));
}

export function createPlayerScavengerState(): PlayerScavengerState {
  return { answers: {}, correct_count: 0 };
}

/** Returns points awarded this tap (0 or SCAVENGER_TAP_POINTS_PER_CORRECT). */
export function applyScavengerTap(
  state: PlayerScavengerState,
  itemIndex: number,
  targetId: string,
  items: ScavengerTapItem[],
): { ok: true; points: number } | { ok: false; error: string } {
  if (itemIndex < 0 || itemIndex >= items.length) {
    return { ok: false, error: "NO_ITEM" };
  }
  if (state.answers[itemIndex] !== undefined) {
    return { ok: false, error: "ALREADY_TAPPED" };
  }
  const item = items[itemIndex]!;
  if (!item.targets.some((t) => t.id === targetId)) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  state.answers[itemIndex] = targetId;
  const points =
    targetId === item.correct_target_id
      ? SCAVENGER_TAP_POINTS_PER_CORRECT
      : 0;
  if (points > 0) state.correct_count += 1;
  return { ok: true, points };
}

export function toPlayerScavengerView(
  state: PlayerScavengerState,
  items: ScavengerTapItem[],
  itemIndex: number,
): PlayerScavengerView {
  const item = items[itemIndex] ?? null;
  const tapped = item ? state.answers[itemIndex] !== undefined : false;
  const lastIndex = Math.max(0, items.length - 1);
  const completed =
    items.length > 0 &&
    itemIndex >= lastIndex &&
    state.answers[lastIndex] !== undefined;
  return {
    item_total: items.length,
    item_index: itemIndex,
    prompt: item ? kidPlainText(item.prompt, 200) : null,
    targets: item
      ? item.targets.map((t) => ({
          id: t.id,
          label: kidPlainText(t.label, 80),
        }))
      : null,
    can_tap: Boolean(item) && !tapped,
    tapped,
    completed,
    correct_count: state.correct_count,
  };
}
