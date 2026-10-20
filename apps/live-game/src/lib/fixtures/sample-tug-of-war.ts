import type { GameBoard, TugOfWarItem } from "@/lib/domain/board";
import packet from "./tug-of-war-sample.json";

/** 16 Grade 4 math MCQ rounds (TEKS 4.4 + 4.3), answer key checked by ops key_check.py. */
export const SAMPLE_TUG_OF_WAR_ITEMS: TugOfWarItem[] =
  packet.tow_items as TugOfWarItem[];

export const TUG_OF_WAR_SAMPLE_BOARD_ID = packet.id;
export const DEMO_TUG_OF_WAR_CODE = "T4T-DEMO-TOW-SAMPLE01";

export function buildSampleTugOfWarBoard(
  id = TUG_OF_WAR_SAMPLE_BOARD_ID,
): GameBoard {
  const now = new Date().toISOString();
  return {
    id,
    title: packet.title,
    grade: 4,
    subject: "math",
    theme: packet.theme,
    status: "ready",
    tpt_sku: packet.tpt_sku,
    game_type: "tug_of_war",
    cells: [],
    tow_items: SAMPLE_TUG_OF_WAR_ITEMS.map((item) => ({ ...item })),
    created_at: now,
    updated_at: now,
  };
}
