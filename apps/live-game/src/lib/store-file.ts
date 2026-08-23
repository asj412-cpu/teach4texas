import { promises as fs } from "fs";
import path from "path";
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
} from "@/lib/domain/access-code";
import {
  generateId,
  generateOpaqueToken,
  generateProductAccessCode,
  sha256Hex,
} from "@/lib/crypto";
import { buildSampleMathGrade3Board } from "@/lib/fixtures/sample-math-grade3";
import {
  ACCESS_CODE_COOKIE,
  ENTITLEMENT_TTL_HOURS,
} from "@/lib/domain/access-code";

type StoreShape = {
  boards: GameBoard[];
  product_codes: ProductCodeRecord[];
  entitlements: HostEntitlement[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

async function ensureStore(): Promise<StoreShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    return {
      boards: parsed.boards ?? [],
      product_codes: parsed.product_codes ?? [],
      entitlements: parsed.entitlements ?? [],
    };
  } catch {
    const board = GameBoardSchema.parse(buildSampleMathGrade3Board());
    const initial: StoreShape = {
      boards: [board],
      product_codes: [],
      entitlements: [],
    };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getBoard(boardId: string): Promise<GameBoard | null> {
  const store = await ensureStore();
  return store.boards.find((b) => b.id === boardId) ?? null;
}

export async function listBoardsForOperator(): Promise<
  Pick<GameBoard, "id" | "title" | "grade" | "subject" | "status" | "tpt_sku">[]
> {
  const store = await ensureStore();
  return store.boards.map((b) => ({
    id: b.id,
    title: b.title,
    grade: b.grade,
    subject: b.subject,
    status: b.status,
    tpt_sku: b.tpt_sku,
  }));
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

/**
 * Mint a product access code for exactly one board.
 * Plaintext returned once for TPT packaging; only hash is stored.
 */
export async function mintProductAccessCode(opts: {
  boardId: string;
  label?: string;
  maxSessions?: number | null;
}): Promise<{ code: string; record: ProductCodeRecord }> {
  const store = await ensureStore();
  const board = store.boards.find((b) => b.id === opts.boardId);
  if (!board) {
    throw new Error("BOARD_NOT_FOUND");
  }
  if (board.status !== "ready") {
    throw new Error("BOARD_NOT_READY");
  }

  const code = generateProductAccessCode();
  const record: ProductCodeRecord = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: sha256Hex(normalizeAccessCode(code)),
    board_id: board.id,
    label: opts.label,
    max_sessions: opts.maxSessions ?? null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });

  store.product_codes.push(record);
  await writeStore(store);
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

/**
 * Redeem TPT access code → host entitlement bound to ONE board only.
 * Teacher never receives a list of other products.
 */
export async function redeemAccessCode(rawCode: string): Promise<RedeemResult> {
  const store = await ensureStore();
  const normalized = normalizeAccessCode(rawCode);
  if (normalized.length < 12) {
    return { ok: false, error: "INVALID_CODE" };
  }

  const hash = sha256Hex(normalized);
  const pc = store.product_codes.find((c) => c.code_hash === hash);
  if (!pc) {
    return { ok: false, error: "INVALID_CODE" };
  }
  if (pc.revoked_at) {
    return { ok: false, error: "CODE_REVOKED" };
  }
  if (
    pc.max_sessions != null &&
    pc.sessions_started >= pc.max_sessions
  ) {
    return { ok: false, error: "CODE_EXHAUSTED" };
  }

  const board = store.boards.find((b) => b.id === pc.board_id);
  if (!board || board.status !== "ready") {
    return { ok: false, error: "GAME_UNAVAILABLE" };
  }

  // Isolation: entitlement is only for pc.board_id
  const token = generateOpaqueToken();
  const now = Date.now();
  const expires = new Date(now + ENTITLEMENT_TTL_HOURS * 3600 * 1000);
  const entitlement: HostEntitlement = HostEntitlementSchema.parse({
    entitlement_id: generateId("ent"),
    board_id: pc.board_id,
    product_code_id: pc.id,
    token_hash: sha256Hex(token),
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  });

  store.entitlements.push(entitlement);
  await writeStore(store);

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
  const store = await ensureStore();
  const hash = sha256Hex(token);
  const ent = store.entitlements.find((e) => e.token_hash === hash);
  if (!ent) return null;
  if (new Date(ent.expires_at).getTime() < Date.now()) return null;

  const board = store.boards.find((b) => b.id === ent.board_id);
  if (!board || board.status !== "ready") return null;

  // Hard isolation: entitlement.board_id is the only allowed board
  if (board.id !== ent.board_id) return null;

  return { board, entitlement: ent };
}

/**
 * Seed a demo code for local/TPT packaging tests.
 * Idempotent: reuses existing hash if DEMO_CODE already minted.
 */
/** Fixed packaging string for local demo (any hyphenation of same alphanumerics works). */
export const DEMO_ACCESS_CODE_DISPLAY = "T4T-DEMO-MATH-G3-SAMPLE01";

export async function ensureDemoAccessCode(
  plaintext = DEMO_ACCESS_CODE_DISPLAY,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === "board_sample_math_g3") ??
    GameBoardSchema.parse(buildSampleMathGrade3Board());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_ACCESS_CODE_DISPLAY,
      boardId: board.id,
      created: false,
    };
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
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_ACCESS_CODE_DISPLAY,
    boardId: board.id,
    created: true,
  };
}

export async function assertBoardAllowedForEntitlement(
  token: string | undefined,
  requestedBoardId: string,
): Promise<boolean> {
  const resolved = await resolveEntitlement(token);
  if (!resolved) return false;
  // One game only — reject any other board_id
  return resolved.board.id === requestedBoardId;
}

/** Operator: save a full board (create or replace by id). */
export async function upsertBoard(boardInput: unknown): Promise<GameBoard> {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const parsed = GameBoardSchema.parse({
    ...(boardInput as object),
    updated_at:
      (boardInput as { updated_at?: string })?.updated_at ?? now,
    created_at:
      (boardInput as { created_at?: string })?.created_at ?? now,
  });

  const idx = store.boards.findIndex((b) => b.id === parsed.id);
  if (idx >= 0) store.boards[idx] = parsed;
  else store.boards.push(parsed);
  await writeStore(store);
  return parsed;
}

/** Operator: clone an existing ready/draft board as a new sellable product shell. */
export async function cloneBoard(opts: {
  sourceBoardId: string;
  title: string;
  tpt_sku?: string;
  grade?: 3 | 4 | 5;
  subject?: "math" | "rla" | "science";
}): Promise<GameBoard> {
  const store = await ensureStore();
  const source = store.boards.find((b) => b.id === opts.sourceBoardId);
  if (!source) throw new Error("BOARD_NOT_FOUND");

  const now = new Date().toISOString();
  const cloned: GameBoard = GameBoardSchema.parse({
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
  store.boards.push(cloned);
  await writeStore(store);
  return cloned;
}

export async function setBoardStatus(
  boardId: string,
  status: GameBoard["status"],
): Promise<GameBoard> {
  const store = await ensureStore();
  const board = store.boards.find((b) => b.id === boardId);
  if (!board) throw new Error("BOARD_NOT_FOUND");
  if (status === "ready") {
    // re-validate shape
    GameBoardSchema.parse(board);
  }
  board.status = status;
  board.updated_at = new Date().toISOString();
  await writeStore(store);
  return board;
}

export async function getBoardForOperator(
  boardId: string,
): Promise<GameBoard | null> {
  return getBoard(boardId);
}
