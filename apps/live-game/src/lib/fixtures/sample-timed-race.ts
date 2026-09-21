import type { GameBoard, TimedRaceItem } from "@/lib/domain/board";
import packet from "./timed-race-sample.json";

/** TEKS-agnostic timed-race item JSON (also the sample board packet). */
export const SAMPLE_TIMED_RACE_ITEMS: TimedRaceItem[] =
  packet.race_items as TimedRaceItem[];

export const TIMED_RACE_SAMPLE_BOARD_ID = packet.id;
export const DEMO_TIMED_RACE_CODE = "T4T-DEMO-RACE-SAMPLE01";

export function buildSampleTimedRaceBoard(
  id = TIMED_RACE_SAMPLE_BOARD_ID,
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
    game_type: "timed_race",
    cells: [],
    race_items: SAMPLE_TIMED_RACE_ITEMS.map((item) => ({ ...item })),
    created_at: now,
    updated_at: now,
  };
}
