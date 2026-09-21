import type { GameBoard, MemoryMatchItem } from "@/lib/domain/board";
import packet from "./memory-match-sample.json";

/** TEKS-agnostic memory-match item JSON (also the sample board packet). */
export const SAMPLE_MEMORY_MATCH_ITEMS: MemoryMatchItem[] =
  packet.items as MemoryMatchItem[];

export const MEMORY_MATCH_SAMPLE_BOARD_ID = packet.id;
export const DEMO_MEMORY_MATCH_CODE = "T4T-DEMO-MATCH-SAMPLE01";

export function buildSampleMemoryMatchBoard(
  id = MEMORY_MATCH_SAMPLE_BOARD_ID,
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
    game_type: "memory_match",
    cells: [],
    items: SAMPLE_MEMORY_MATCH_ITEMS.map((item) => ({ ...item })),
    created_at: now,
    updated_at: now,
  };
}
