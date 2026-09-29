import type { CategorySortItem, GameBoard } from "@/lib/domain/board";
import packet from "./category-sort-sample.json";

/** TEKS-agnostic category-sort item JSON (also the sample board packet). */
export const SAMPLE_CATEGORY_SORT_ITEMS: CategorySortItem[] =
  packet.category_items as CategorySortItem[];

export const CATEGORY_SORT_SAMPLE_BOARD_ID = packet.id;
export const DEMO_CATEGORY_SORT_CODE = "T4T-DEMO-CATEGORY-SAMPLE01";

export function buildSampleCategorySortBoard(
  id = CATEGORY_SORT_SAMPLE_BOARD_ID,
): GameBoard {
  const now = new Date().toISOString();
  return {
    id,
    title: packet.title,
    grade: 3,
    subject: "math",
    theme: packet.theme,
    status: "ready",
    tpt_sku: packet.tpt_sku,
    game_type: "category_sort",
    cells: [],
    category_items: SAMPLE_CATEGORY_SORT_ITEMS.map((item) => ({
      ...item,
      categories: item.categories.map((c) => ({ ...c })),
    })),
    created_at: now,
    updated_at: now,
  };
}
