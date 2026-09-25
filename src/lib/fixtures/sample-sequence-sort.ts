import type { GameBoard, SequenceSortItem } from "@/lib/domain/board";
import packet from "./sequence-sort-sample.json";

/** TEKS-agnostic sequence-sort item JSON (also the sample board packet). */
export const SAMPLE_SEQUENCE_SORT_ITEMS: SequenceSortItem[] =
  packet.sequence_items as SequenceSortItem[];

export const SEQUENCE_SORT_SAMPLE_BOARD_ID = packet.id;
export const DEMO_SEQUENCE_SORT_CODE = "T4T-DEMO-SEQUENCE-SAMPLE01";

export function buildSampleSequenceSortBoard(
  id = SEQUENCE_SORT_SAMPLE_BOARD_ID,
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
    game_type: "sequence_sort",
    cells: [],
    sequence_items: SAMPLE_SEQUENCE_SORT_ITEMS.map((item) => ({
      ...item,
      steps: item.steps.map((s) => ({ ...s })),
      correct_order: [...item.correct_order],
    })),
    created_at: now,
    updated_at: now,
  };
}
