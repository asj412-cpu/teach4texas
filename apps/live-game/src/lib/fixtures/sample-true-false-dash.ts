import type { GameBoard, TrueFalseDashItem } from "@/lib/domain/board";
import packet from "./true-false-dash-sample.json";

/** TEKS-agnostic true/false claim JSON (also the sample board packet). */
export const SAMPLE_TRUE_FALSE_DASH_ITEMS: TrueFalseDashItem[] =
  packet.dash_items as TrueFalseDashItem[];

export const TRUE_FALSE_DASH_SAMPLE_BOARD_ID = packet.id;
export const DEMO_TRUE_FALSE_DASH_CODE = "T4T-DEMO-TF-SAMPLE01";

export function buildSampleTrueFalseDashBoard(
  id = TRUE_FALSE_DASH_SAMPLE_BOARD_ID,
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
    game_type: "true_false_dash",
    cells: [],
    dash_items: SAMPLE_TRUE_FALSE_DASH_ITEMS.map((item) => ({ ...item })),
    created_at: now,
    updated_at: now,
  };
}
