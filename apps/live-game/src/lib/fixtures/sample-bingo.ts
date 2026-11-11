import type { BingoItem, GameBoard } from "@/lib/domain/board";
import packet from "./bingo-sample.json";

/** 30 Grade 3 math calls (TEKS 3.4(F) and 3.4(K)). Each answer is a unique whole number. */
export const SAMPLE_BINGO_ITEMS: BingoItem[] = packet.bingo_items as BingoItem[];

export const BINGO_SAMPLE_BOARD_ID = packet.id;
export const DEMO_BINGO_CODE = "T4T-DEMO-BINGO-SAMPLE01";

export function buildSampleBingoBoard(id = BINGO_SAMPLE_BOARD_ID): GameBoard {
  const now = new Date().toISOString();
  return {
    id,
    title: packet.title,
    grade: 3,
    subject: "math",
    theme: packet.theme,
    status: "ready",
    tpt_sku: packet.tpt_sku,
    game_type: "bingo",
    cells: [],
    bingo_items: SAMPLE_BINGO_ITEMS.map((item) => ({ ...item })),
    created_at: now,
    updated_at: now,
  };
}
