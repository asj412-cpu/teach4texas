import {
  type GameBoard,
  GameBoardSchema,
  type HostBoardView,
} from "@/lib/domain/board";
import {
  type HostEntitlement,
  HostEntitlementSchema,
  type ProductCodeRecord,
  ProductCodeRecordSchema,
  normalizeAccessCode,
  ACCESS_CODE_COOKIE,
  ENTITLEMENT_TTL_HOURS,
} from "@/lib/domain/access-code";
import {
  generateId,
  generateOpaqueToken,
  generateProductAccessCode,
  sha256Hex,
} from "@/lib/crypto";
import { buildSampleMathGrade3Board } from "@/lib/fixtures/sample-math-grade3";
import { getServiceSupabase } from "@/lib/supabase-admin";

const SAMPLE_BOARD_ID = "board_sample_math_g3";

export const DEMO_ACCESS_CODE_DISPLAY = "T4T-DEMO-MATH-G3-SAMPLE01";

type BoardRow = {
  id: string;
  title: string;
  grade: number;
  subject: string;
  theme: string | null;
  status: string;
  tpt_sku: string | null;
  cells: unknown;
  created_at: string;
  updated_at: string;
};

type ProductCodeRow = {
  id: string;
  code_hash: string;
  board_id: string;
  label: string | null;
  max_sessions: number | null;
  sessions_started: number;
  revoked_at: string | null;
  created_at: string;
};

type EntitlementRow = {
  entitlement_id: string;
  board_id: string;
  product_code_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

function iso(value: string): string {
  return new Date(value).toISOString();
}

function hashHex(value: string): string {
  return value.trim().toLowerCase();
}

function throwIfError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function boardFromRow(row: BoardRow): GameBoard {
  return GameBoardSchema.parse({
    id: row.id,
    title: row.title,
    grade: row.grade,
    subject: row.subject,
    theme: row.theme ?? undefined,
    status: row.status,
    tpt_sku: row.tpt_sku ?? undefined,
    cells: row.cells,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
}

function productCodeFromRow(row: ProductCodeRow): ProductCodeRecord {
  return ProductCodeRecordSchema.parse({
    id: row.id,
    code_hash: hashHex(row.code_hash),
    board_id: row.board_id,
    label: row.label ?? undefined,
    max_sessions: row.max_sessions,
    sessions_started: row.sessions_started,
    revoked_at: row.revoked_at ? iso(row.revoked_at) : null,
    created_at: iso(row.created_at),
  });
}

function entitlementFromRow(row: EntitlementRow): HostEntitlement {
  return HostEntitlementSchema.parse({
    entitlement_id: row.entitlement_id,
    board_id: row.board_id,
    product_code_id: row.product_code_id,
    token_hash: hashHex(row.token_hash),
    expires_at: iso(row.expires_at),
    created_at: iso(row.created_at),
  });
}

function boardToRow(board: GameBoard): BoardRow {
  return {
    id: board.id,
    title: board.title,
    grade: board.grade,
    subject: board.subject,
    theme: board.theme ?? null,
    status: board.status,
    tpt_sku: board.tpt_sku ?? null,
    cells: board.cells,
    created_at: board.created_at,
    updated_at: board.updated_at,
  };
}

async function ensureSampleBoard(): Promise<GameBoard> {
  const sb = getServiceSupabase();
  const existing = await sb
    .from("boards")
    .select("*")
    .eq("id", SAMPLE_BOARD_ID)
    .maybeSingle();
  throwIfError(existing.error, "ensureSampleBoard.select");
  if (existing.data) {
    return boardFromRow(existing.data as BoardRow);
  }
  const board = GameBoardSchema.parse(buildSampleMathGrade3Board());
  const inserted = await sb.from("boards").insert(boardToRow(board)).select("*").single();
  throwIfError(inserted.error, "ensureSampleBoard.insert");
  return boardFromRow(inserted.data as BoardRow);
}

export function toHostBoardView(board: GameBoard): HostBoardView {
  const categories = [...new Set(board.cells.map((c) => c.category))];
  return {
    id: board.id,
    title: board.title,
    grade: board.grade,
    subject: board.subject,
    theme: board.theme,
    tpt_sku: board.tpt_sku,
    categories,
    cell_count: board.cells.length,
  };
}

export async function getBoard(boardId: string): Promise<GameBoard | null> {
  await ensureSampleBoard();
  const sb = getServiceSupabase();
  const res = await sb.from("boards").select("*").eq("id", boardId).maybeSingle();
  throwIfError(res.error, "getBoard");
  if (!res.data) return null;
  return boardFromRow(res.data as BoardRow);
}

export async function listBoardsForOperator(): Promise<
  Pick<GameBoard, "id" | "title" | "grade" | "subject" | "status" | "tpt_sku">[]
> {
  await ensureSampleBoard();
  const sb = getServiceSupabase();
  const res = await sb
    .from("boards")
    .select("id,title,grade,subject,status,tpt_sku")
    .order("created_at", { ascending: true });
  throwIfError(res.error, "listBoardsForOperator");
  return (res.data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    grade: row.grade as GameBoard["grade"],
    subject: row.subject as GameBoard["subject"],
    status: row.status as GameBoard["status"],
    tpt_sku: (row.tpt_sku as string | null) ?? undefined,
  }));
}

export async function mintProductAccessCode(opts: {
  boardId: string;
  label?: string;
  maxSessions?: number | null;
}): Promise<{ code: string; record: ProductCodeRecord }> {
  const board = await getBoard(opts.boardId);
  if (!board) throw new Error("BOARD_NOT_FOUND");
  if (board.status !== "ready") throw new Error("BOARD_NOT_READY");

  const code = generateProductAccessCode();
  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: sha256Hex(normalizeAccessCode(code)),
    board_id: board.id,
    label: opts.label,
    max_sessions: opts.maxSessions ?? null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });

  const sb = getServiceSupabase();
  const res = await sb.from("product_codes").insert({
    id: record.id,
    code_hash: record.code_hash,
    board_id: record.board_id,
    label: record.label ?? null,
    max_sessions: record.max_sessions,
    sessions_started: record.sessions_started,
    revoked_at: record.revoked_at,
    created_at: record.created_at,
  });
  throwIfError(res.error, "mintProductAccessCode");
  return { code, record };
}

export type RedeemResult =
  | {
      ok: true;
      entitlementToken: string;
      board: HostBoardView;
      cookieName: typeof ACCESS_CODE_COOKIE;
      maxAgeSec: number;
    }
  | { ok: false; error: string };

export async function redeemAccessCode(rawCode: string): Promise<RedeemResult> {
  await ensureSampleBoard();
  const normalized = normalizeAccessCode(rawCode);
  if (normalized.length < 12) {
    return { ok: false, error: "INVALID_CODE" };
  }

  const hash = sha256Hex(normalized);
  const sb = getServiceSupabase();
  const pcRes = await sb
    .from("product_codes")
    .select("*")
    .eq("code_hash", hash)
    .maybeSingle();
  throwIfError(pcRes.error, "redeemAccessCode.lookup");
  if (!pcRes.data) {
    return { ok: false, error: "INVALID_CODE" };
  }
  const pc = productCodeFromRow(pcRes.data as ProductCodeRow);
  if (pc.revoked_at) {
    return { ok: false, error: "CODE_REVOKED" };
  }
  if (pc.max_sessions != null && pc.sessions_started >= pc.max_sessions) {
    return { ok: false, error: "CODE_EXHAUSTED" };
  }

  const boardRes = await sb.from("boards").select("*").eq("id", pc.board_id).maybeSingle();
  throwIfError(boardRes.error, "redeemAccessCode.board");
  if (!boardRes.data) {
    return { ok: false, error: "GAME_UNAVAILABLE" };
  }
  const board = boardFromRow(boardRes.data as BoardRow);
  if (board.status !== "ready") {
    return { ok: false, error: "GAME_UNAVAILABLE" };
  }

  const token = generateOpaqueToken();
  const now = Date.now();
  const expires = new Date(now + ENTITLEMENT_TTL_HOURS * 3600 * 1000);
  const entitlement = HostEntitlementSchema.parse({
    entitlement_id: generateId("ent"),
    board_id: pc.board_id,
    product_code_id: pc.id,
    token_hash: sha256Hex(token),
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  });

  const ins = await sb.from("entitlements").insert({
    entitlement_id: entitlement.entitlement_id,
    board_id: entitlement.board_id,
    product_code_id: entitlement.product_code_id,
    token_hash: entitlement.token_hash,
    expires_at: entitlement.expires_at,
    created_at: entitlement.created_at,
  });
  throwIfError(ins.error, "redeemAccessCode.insert");

  return {
    ok: true,
    entitlementToken: token,
    board: toHostBoardView(board),
    cookieName: ACCESS_CODE_COOKIE,
    maxAgeSec: ENTITLEMENT_TTL_HOURS * 3600,
  };
}

export async function resolveEntitlement(
  token: string | undefined,
): Promise<{ board: GameBoard; entitlement: HostEntitlement } | null> {
  if (!token) return null;
  await ensureSampleBoard();
  const hash = sha256Hex(token);
  const sb = getServiceSupabase();
  const entRes = await sb
    .from("entitlements")
    .select("*")
    .eq("token_hash", hash)
    .maybeSingle();
  throwIfError(entRes.error, "resolveEntitlement");
  if (!entRes.data) return null;
  const ent = entitlementFromRow(entRes.data as EntitlementRow);
  if (new Date(ent.expires_at).getTime() < Date.now()) return null;

  const boardRes = await sb.from("boards").select("*").eq("id", ent.board_id).maybeSingle();
  throwIfError(boardRes.error, "resolveEntitlement.board");
  if (!boardRes.data) return null;
  const board = boardFromRow(boardRes.data as BoardRow);
  if (board.status !== "ready") return null;
  if (board.id !== ent.board_id) return null;
  return { board, entitlement: ent };
}

export async function ensureDemoAccessCode(
  plaintext = DEMO_ACCESS_CODE_DISPLAY,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const board = await ensureSampleBoard();
  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const sb = getServiceSupabase();
  const existing = await sb
    .from("product_codes")
    .select("id")
    .eq("code_hash", hash)
    .maybeSingle();
  throwIfError(existing.error, "ensureDemoAccessCode.lookup");
  if (existing.data) {
    return { code: DEMO_ACCESS_CODE_DISPLAY, boardId: board.id, created: false };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / packaging sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  const ins = await sb.from("product_codes").insert({
    id: record.id,
    code_hash: record.code_hash,
    board_id: record.board_id,
    label: record.label ?? null,
    max_sessions: record.max_sessions,
    sessions_started: record.sessions_started,
    revoked_at: record.revoked_at,
    created_at: record.created_at,
  });
  throwIfError(ins.error, "ensureDemoAccessCode.insert");
  return { code: DEMO_ACCESS_CODE_DISPLAY, boardId: board.id, created: true };
}

export async function assertBoardAllowedForEntitlement(
  token: string | undefined,
  requestedBoardId: string,
): Promise<boolean> {
  const resolved = await resolveEntitlement(token);
  if (!resolved) return false;
  return resolved.board.id === requestedBoardId;
}

export async function upsertBoard(boardInput: unknown): Promise<GameBoard> {
  await ensureSampleBoard();
  const now = new Date().toISOString();
  const parsed = GameBoardSchema.parse({
    ...(boardInput as object),
    updated_at: (boardInput as { updated_at?: string })?.updated_at ?? now,
    created_at: (boardInput as { created_at?: string })?.created_at ?? now,
  });
  const sb = getServiceSupabase();
  const res = await sb.from("boards").upsert(boardToRow(parsed), { onConflict: "id" });
  throwIfError(res.error, "upsertBoard");
  return parsed;
}

export async function cloneBoard(opts: {
  sourceBoardId: string;
  title: string;
  tpt_sku?: string;
  grade?: 3 | 4 | 5;
  subject?: "math" | "rla" | "science";
}): Promise<GameBoard> {
  const source = await getBoard(opts.sourceBoardId);
  if (!source) throw new Error("BOARD_NOT_FOUND");

  const now = new Date().toISOString();
  const cloned = GameBoardSchema.parse({
    ...source,
    id: generateId("board"),
    title: opts.title,
    grade: opts.grade ?? source.grade,
    subject: opts.subject ?? source.subject,
    tpt_sku: opts.tpt_sku ?? `${source.tpt_sku ?? "game"}-copy`,
    status: "draft",
    cells: source.cells.map((c) => ({
      ...c,
      id: `${c.category.slice(0, 3).toLowerCase()}-${c.points}-${generateId("c").slice(-4)}`,
      needs_review: true,
    })),
    created_at: now,
    updated_at: now,
  });
  const sb = getServiceSupabase();
  const res = await sb.from("boards").insert(boardToRow(cloned));
  throwIfError(res.error, "cloneBoard");
  return cloned;
}

export async function setBoardStatus(
  boardId: string,
  status: GameBoard["status"],
): Promise<GameBoard> {
  const board = await getBoard(boardId);
  if (!board) throw new Error("BOARD_NOT_FOUND");
  if (status === "ready") {
    GameBoardSchema.parse(board);
  }
  board.status = status;
  board.updated_at = new Date().toISOString();
  const sb = getServiceSupabase();
  const res = await sb
    .from("boards")
    .update({ status: board.status, updated_at: board.updated_at })
    .eq("id", boardId);
  throwIfError(res.error, "setBoardStatus");
  return board;
}

export async function getBoardForOperator(
  boardId: string,
): Promise<GameBoard | null> {
  return getBoard(boardId);
}
