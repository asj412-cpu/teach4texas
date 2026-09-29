import type { GameBoard, CategorySortItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const CATEGORY_SORT_POINTS_PER_CORRECT = 100;
export const CATEGORY_SORT_MAX_ITEMS = 8;

export type PlayerCategoryState = {
  /** item index → category_id the student tapped (first tap sticks). */
  answers: Record<number, string>;
  correct_count: number;
};

export type PlayerCategoryView = {
  item_total: number;
  item_index: number;
  prompt: string | null;
  item_label: string | null;
  categories: { id: string; label: string }[] | null;
  can_tap: boolean;
  tapped: boolean;
  completed: boolean;
  correct_count: number;
};

function choicesAsBins(
  id: string,
  prompt: string,
  choices: readonly string[],
  correctIndex: number,
  teks?: string,
): CategorySortItem {
  const categories = choices.slice(0, 4).map((label, i) => ({
    id: `${id}-c${i}`,
    label,
  }));
  const idx = Math.min(Math.max(correctIndex, 0), categories.length - 1);
  return {
    id,
    prompt,
    item_label: prompt,
    categories,
    correct_category_id: categories[idx]!.id,
    teks,
  };
}

export function categoryItemsFromBoard(board: GameBoard): CategorySortItem[] {
  if (board.category_items && board.category_items.length >= 4) {
    return board.category_items.slice(0, CATEGORY_SORT_MAX_ITEMS);
  }
  if (board.scavenger_items && board.scavenger_items.length >= 4) {
    return board.scavenger_items.slice(0, CATEGORY_SORT_MAX_ITEMS).map((item) => {
      const bins = item.targets.slice(0, 4);
      const correctInBins = bins.some((t) => t.id === item.correct_target_id);
      return {
        id: item.id,
        prompt: item.prompt,
        item_label: item.prompt,
        categories: bins.map((t) => ({ id: t.id, label: t.label })),
        correct_category_id: correctInBins
          ? item.correct_target_id
          : bins[0]!.id,
        teks: item.teks,
      };
    });
  }
  if (board.race_items && board.race_items.length >= 4) {
    return board.race_items
      .slice(0, CATEGORY_SORT_MAX_ITEMS)
      .map((item) =>
        choicesAsBins(
          item.id,
          item.prompt,
          item.choices,
          item.correct_index,
          item.teks,
        ),
      );
  }
  return (board.cells ?? []).slice(0, CATEGORY_SORT_MAX_ITEMS).map((cell) =>
    choicesAsBins(
      cell.id,
      cell.question,
      cell.choices,
      cell.correct_index,
      cell.teks,
    ),
  );
}

export function createPlayerCategoryState(): PlayerCategoryState {
  return { answers: {}, correct_count: 0 };
}

/** Returns points awarded this tap (0 or CATEGORY_SORT_POINTS_PER_CORRECT). */
export function applyCategoryTap(
  state: PlayerCategoryState,
  itemIndex: number,
  categoryId: string,
  items: CategorySortItem[],
): { ok: true; points: number } | { ok: false; error: string } {
  if (itemIndex < 0 || itemIndex >= items.length) {
    return { ok: false, error: "NO_ITEM" };
  }
  if (state.answers[itemIndex] !== undefined) {
    return { ok: false, error: "ALREADY_TAPPED" };
  }
  const item = items[itemIndex]!;
  if (!item.categories.some((c) => c.id === categoryId)) {
    return { ok: false, error: "INVALID_CATEGORY" };
  }
  state.answers[itemIndex] = categoryId;
  const points =
    categoryId === item.correct_category_id
      ? CATEGORY_SORT_POINTS_PER_CORRECT
      : 0;
  if (points > 0) state.correct_count += 1;
  return { ok: true, points };
}

export function toPlayerCategoryView(
  state: PlayerCategoryState,
  items: CategorySortItem[],
  itemIndex: number,
): PlayerCategoryView {
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
    item_label: item ? kidPlainText(item.item_label, 80) : null,
    categories: item
      ? item.categories.map((c) => ({
          id: c.id,
          label: kidPlainText(c.label, 80),
        }))
      : null,
    can_tap: Boolean(item) && !tapped,
    tapped,
    completed,
    correct_count: state.correct_count,
  };
}
