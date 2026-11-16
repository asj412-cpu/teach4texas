import { GameBoardSchema, type GameBoard } from "@/lib/domain/board";
import type { NumberLineItem } from "@/lib/domain/number-line";
import { sha256Hex } from "@/lib/crypto";
import {
  buildSampleNumberLineBoard,
  NUMBER_LINE_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-number-line";

/**
 * Bump when the validated Number Line demo key changes and stored rows must refresh.
 * The hash below is the write gate: identical content does not write.
 */
export const NUMBER_LINE_DEMO_VERSION = 2;

type DemoBoardFields = {
  title: string;
  grade: number;
  subject: string;
  theme?: string | null;
  status: string;
  tpt_sku?: string | null;
  game_type?: string | null;
  number_line_items?: NumberLineItem[] | null;
};

/** Stable hash of the validated demo key. Timestamps are not part of the content. */
export function numberLineDemoContentHash(board: DemoBoardFields): string {
  const items = board.number_line_items ?? [];
  return sha256Hex(
    JSON.stringify({
      v: NUMBER_LINE_DEMO_VERSION,
      title: board.title,
      grade: board.grade,
      subject: board.subject,
      theme: board.theme ?? "",
      status: board.status,
      tpt_sku: board.tpt_sku ?? "",
      game_type: board.game_type ?? "board",
      items: items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        teks: item.teks,
        mode: item.mode,
        min: item.min,
        max: item.max,
        divisions: item.divisions,
        answer: item.answer,
        tolerance: item.tolerance ?? null,
      })),
    }),
  );
}

export function planNumberLineDemoBoard(
  existing: GameBoard | null,
  now = new Date().toISOString(),
): { write: "insert" | "update" | "keep"; board: GameBoard; contentHash: string } {
  const fresh = buildSampleNumberLineBoard(NUMBER_LINE_SAMPLE_BOARD_ID);
  const desired = GameBoardSchema.parse({
    ...fresh,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
  const contentHash = numberLineDemoContentHash(desired);
  if (!existing || existing.id !== NUMBER_LINE_SAMPLE_BOARD_ID) {
    return { write: "insert", board: desired, contentHash };
  }
  if (numberLineDemoContentHash(existing) === contentHash) {
    return { write: "keep", board: existing, contentHash };
  }
  const board = GameBoardSchema.parse({
    ...desired,
    id: NUMBER_LINE_SAMPLE_BOARD_ID,
    created_at: existing.created_at,
    updated_at: now,
  });
  return { write: "update", board, contentHash };
}

/** Demo access code row, keyed on the code hash. */
export function planNumberLineDemoCode(
  existingBoardId: string | null,
  boardId: string,
): "insert" | "retarget" | "keep" {
  if (existingBoardId == null) return "insert";
  if (existingBoardId !== boardId) return "retarget";
  return "keep";
}

type DemoCodeRow = {
  code_hash: string;
  board_id: string;
};

/**
 * Idempotent upsert of the number-line demo board and its access-code row.
 * Other boards in the store are left untouched. Writes only when content or the code link differs.
 */
export function applyNumberLineDemo<T extends DemoCodeRow>(
  store: { boards: GameBoard[]; product_codes: T[] },
  opts: { codeHash: string; now?: string; createCode: (boardId: string) => T },
): { created: boolean; wrote: boolean; updated: boolean; boardId: string } {
  const index = store.boards.findIndex((board) => board.id === NUMBER_LINE_SAMPLE_BOARD_ID);
  const existing = index >= 0 ? store.boards[index]! : null;
  const plan = planNumberLineDemoBoard(existing, opts.now);
  let wrote = false;
  if (plan.write === "insert") {
    store.boards.push(plan.board);
    wrote = true;
  } else if (plan.write === "update") {
    store.boards[index] = plan.board;
    wrote = true;
  }
  const code = store.product_codes.find((row) => row.code_hash === opts.codeHash);
  const codePlan = planNumberLineDemoCode(code ? code.board_id : null, plan.board.id);
  let created = false;
  if (codePlan === "insert") {
    store.product_codes.push(opts.createCode(plan.board.id));
    wrote = true;
    created = true;
  } else if (codePlan === "retarget" && code) {
    code.board_id = plan.board.id;
    wrote = true;
  }
  return {
    created,
    wrote,
    updated: plan.write !== "keep",
    boardId: plan.board.id,
  };
}
