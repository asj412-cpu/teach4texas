import type { GameBoard, OddOneOutItem } from "@/lib/domain/board";
import packet from "./odd-one-out-sample.json";

/** TEKS-agnostic odd-one-out item JSON (also the sample board packet). */
export const SAMPLE_ODD_ONE_OUT_ITEMS: OddOneOutItem[] =
  packet.odd_items as OddOneOutItem[];

export const ODD_ONE_OUT_SAMPLE_BOARD_ID = packet.id;
export const DEMO_ODD_ONE_OUT_CODE = "T4T-DEMO-ODD-SAMPLE01";

export function buildSampleOddOneOutBoard(
  id = ODD_ONE_OUT_SAMPLE_BOARD_ID,
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
    game_type: "odd_one_out",
    cells: [],
    odd_items: SAMPLE_ODD_ONE_OUT_ITEMS.map((item) => ({
      ...item,
      options: item.options.map((o) => ({ ...o })),
    })),
    created_at: now,
    updated_at: now,
  };
}
