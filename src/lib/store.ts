import { isSupabaseConfigured } from "@/lib/supabase-admin";
import * as fileStore from "@/lib/store-file";
import * as supabaseStore from "@/lib/store-supabase";
import type { GameBoard } from "@/lib/domain/board";

const backend = () => (isSupabaseConfigured() ? supabaseStore : fileStore);

export const DEMO_ACCESS_CODE_DISPLAY = fileStore.DEMO_ACCESS_CODE_DISPLAY;

export const toHostBoardView = fileStore.toHostBoardView;

export type RedeemResult = fileStore.RedeemResult;

export async function getBoard(boardId: string) {
  return backend().getBoard(boardId);
}

export async function listBoardsForOperator() {
  return backend().listBoardsForOperator();
}

export async function mintProductAccessCode(opts: {
  boardId: string;
  label?: string;
  maxSessions?: number | null;
}) {
  return backend().mintProductAccessCode(opts);
}

export async function redeemAccessCode(rawCode: string) {
  return backend().redeemAccessCode(rawCode);
}

export async function resolveEntitlement(token: string | undefined) {
  return backend().resolveEntitlement(token);
}

export async function ensureDemoAccessCode(
  plaintext = DEMO_ACCESS_CODE_DISPLAY,
) {
  return backend().ensureDemoAccessCode(plaintext);
}

export async function assertBoardAllowedForEntitlement(
  token: string | undefined,
  requestedBoardId: string,
) {
  return backend().assertBoardAllowedForEntitlement(token, requestedBoardId);
}

export async function upsertBoard(boardInput: unknown) {
  return backend().upsertBoard(boardInput);
}

export async function cloneBoard(opts: {
  sourceBoardId: string;
  title: string;
  tpt_sku?: string;
  grade?: 3 | 4 | 5;
  subject?: "math" | "rla" | "science";
}) {
  return backend().cloneBoard(opts);
}

export async function setBoardStatus(
  boardId: string,
  status: GameBoard["status"],
) {
  return backend().setBoardStatus(boardId, status);
}

export async function getBoardForOperator(boardId: string) {
  return backend().getBoardForOperator(boardId);
}
