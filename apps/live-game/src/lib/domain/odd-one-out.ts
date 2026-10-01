import type { GameBoard, OddOneOutItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const ODD_ONE_OUT_POINTS_PER_CORRECT = 100;
export const ODD_ONE_OUT_MAX_ITEMS = 8;

export type PlayerOddState = {
  /** item index → option_id the student tapped (first tap sticks). */
  answers: Record<number, string>;
  correct_count: number;
};

export type PlayerOddView = {
  item_total: number;
  item_index: number;
  prompt: string | null;
  options: { id: string; label: string }[] | null;
  can_tap: boolean;
  tapped: boolean;
  completed: boolean;
  correct_count: number;
};

function choicesAsOptions(
  id: string,
  prompt: string,
  choices: readonly string[],
  correctIndex: number,
  teks?: string,
): OddOneOutItem {
  const options = choices.slice(0, 4).map((label, i) => ({
    id: `${id}-o${i}`,
    label,
  }));
  const idx = Math.min(Math.max(correctIndex, 0), options.length - 1);
  return {
    id,
    prompt,
    options,
    odd_option_id: options[idx]!.id,
    teks,
  };
}

export function oddItemsFromBoard(board: GameBoard): OddOneOutItem[] {
  if (board.odd_items && board.odd_items.length >= 4) {
    return board.odd_items.slice(0, ODD_ONE_OUT_MAX_ITEMS);
  }
  if (board.category_items && board.category_items.length >= 4) {
    const fromBins = board.category_items
      .filter((item) => item.categories.length >= 3)
      .slice(0, ODD_ONE_OUT_MAX_ITEMS)
      .map((item) => {
        const options = item.categories.slice(0, 4).map((c) => ({
          id: c.id,
          label: c.label,
        }));
        const oddInOptions = options.some((o) => o.id === item.correct_category_id);
        return {
          id: item.id,
          prompt: item.prompt ?? item.item_label,
          options,
          odd_option_id: oddInOptions
            ? item.correct_category_id
            : options[0]!.id,
          teks: item.teks,
        };
      });
    if (fromBins.length >= 4) return fromBins;
  }
  if (board.scavenger_items && board.scavenger_items.length >= 4) {
    return board.scavenger_items.slice(0, ODD_ONE_OUT_MAX_ITEMS).map((item) => {
      const options = item.targets.slice(0, 4).map((t) => ({
        id: t.id,
        label: t.label,
      }));
      const oddInOptions = options.some((o) => o.id === item.correct_target_id);
      return {
        id: item.id,
        prompt: item.prompt,
        options,
        odd_option_id: oddInOptions ? item.correct_target_id : options[0]!.id,
        teks: item.teks,
      };
    });
  }
  if (board.race_items && board.race_items.length >= 4) {
    return board.race_items
      .slice(0, ODD_ONE_OUT_MAX_ITEMS)
      .map((item) =>
        choicesAsOptions(
          item.id,
          item.prompt,
          item.choices,
          item.correct_index,
          item.teks,
        ),
      );
  }
  return (board.cells ?? []).slice(0, ODD_ONE_OUT_MAX_ITEMS).map((cell) =>
    choicesAsOptions(
      cell.id,
      cell.question,
      cell.choices,
      cell.correct_index,
      cell.teks,
    ),
  );
}

export function createPlayerOddState(): PlayerOddState {
  return { answers: {}, correct_count: 0 };
}

/** Returns points awarded this tap (0 or ODD_ONE_OUT_POINTS_PER_CORRECT). */
export function applyOddTap(
  state: PlayerOddState,
  itemIndex: number,
  optionId: string,
  items: OddOneOutItem[],
): { ok: true; points: number } | { ok: false; error: string } {
  if (itemIndex < 0 || itemIndex >= items.length) {
    return { ok: false, error: "NO_ITEM" };
  }
  if (state.answers[itemIndex] !== undefined) {
    return { ok: false, error: "ALREADY_TAPPED" };
  }
  const item = items[itemIndex]!;
  if (!item.options.some((o) => o.id === optionId)) {
    return { ok: false, error: "INVALID_OPTION" };
  }
  state.answers[itemIndex] = optionId;
  const points =
    optionId === item.odd_option_id ? ODD_ONE_OUT_POINTS_PER_CORRECT : 0;
  if (points > 0) state.correct_count += 1;
  return { ok: true, points };
}

export function toPlayerOddView(
  state: PlayerOddState,
  items: OddOneOutItem[],
  itemIndex: number,
): PlayerOddView {
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
    prompt: item?.prompt ? kidPlainText(item.prompt, 200) : null,
    options: item
      ? item.options.map((o) => ({
          id: o.id,
          label: kidPlainText(o.label, 80),
        }))
      : null,
    can_tap: Boolean(item) && !tapped,
    tapped,
    completed,
    correct_count: state.correct_count,
  };
}
