import type { GameBoard, ScavengerTapItem } from "@/lib/domain/board";
import packet from "./scavenger-tap-sample.json";

/** TEKS-agnostic scavenger-tap item JSON (also the sample board packet). */
export const SAMPLE_SCAVENGER_TAP_ITEMS: ScavengerTapItem[] =
  packet.scavenger_items as ScavengerTapItem[];

export const SCAVENGER_TAP_SAMPLE_BOARD_ID = packet.id;
export const DEMO_SCAVENGER_TAP_CODE = "T4T-DEMO-SCAVENGER-SAMPLE01";

export function buildSampleScavengerTapBoard(
  id = SCAVENGER_TAP_SAMPLE_BOARD_ID,
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
    game_type: "scavenger_tap",
    cells: [],
    scavenger_items: SAMPLE_SCAVENGER_TAP_ITEMS.map((item) => ({
      ...item,
      targets: item.targets.map((t) => ({ ...t })),
    })),
    created_at: now,
    updated_at: now,
  };
}
