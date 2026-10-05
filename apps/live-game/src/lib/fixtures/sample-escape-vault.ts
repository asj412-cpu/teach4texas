import type { EscapeVaultRoom, GameBoard } from "@/lib/domain/board";
import packet from "./escape-vault-sample.json";

export const SAMPLE_ESCAPE_VAULT_ROOMS: EscapeVaultRoom[] =
  packet.vault_rooms as EscapeVaultRoom[];

export const ESCAPE_VAULT_SAMPLE_BOARD_ID = packet.id;
export const DEMO_ESCAPE_VAULT_CODE = "T4T-DEMO-ESCAPE-SAMPLE01";

export function buildSampleEscapeVaultBoard(
  id = ESCAPE_VAULT_SAMPLE_BOARD_ID,
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
    game_type: "escape_vault",
    cells: [],
    vault_rooms: SAMPLE_ESCAPE_VAULT_ROOMS.map((room) => ({
      ...room,
      puzzles: room.puzzles.map((p) => ({ ...p })),
    })),
    created_at: now,
    updated_at: now,
  };
}
