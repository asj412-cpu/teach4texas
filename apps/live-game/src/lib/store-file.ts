import { promises as fs } from "fs";
import path from "path";
import {
  type GameBoard,
  GameBoardSchema,
  type HostBoardView,
  boardGameType,
  supportsBoardPlay,
  supportsCategorySort,
  supportsMemoryMatch,
  supportsOddOneOut,
  supportsScavengerTap,
  supportsTrueFalseDash,
  supportsSequenceSort,
  supportsTimedRace,
} from "@/lib/domain/board";
import { categoryItemsFromBoard } from "@/lib/domain/category-sort";
import { itemsFromBoard } from "@/lib/domain/memory-match";
import { oddItemsFromBoard } from "@/lib/domain/odd-one-out";
import { dashItemsFromBoard } from "@/lib/domain/true-false-dash";
import { scavengerItemsFromBoard } from "@/lib/domain/scavenger-tap";
import { sequenceItemsFromBoard } from "@/lib/domain/sequence-sort";
import { raceItemsFromBoard } from "@/lib/domain/timed-race";
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
  buildSampleMemoryMatchBoard,
  DEMO_MEMORY_MATCH_CODE,
  MEMORY_MATCH_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-memory-match";
import {
  buildSampleTimedRaceBoard,
  DEMO_TIMED_RACE_CODE,
  TIMED_RACE_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-timed-race";
import {
  buildSampleScavengerTapBoard,
  DEMO_SCAVENGER_TAP_CODE,
  SCAVENGER_TAP_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-scavenger-tap";
import {
  buildSampleSequenceSortBoard,
  DEMO_SEQUENCE_SORT_CODE,
  SEQUENCE_SORT_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-sequence-sort";
import {
  buildSampleCategorySortBoard,
  CATEGORY_SORT_SAMPLE_BOARD_ID,
  DEMO_CATEGORY_SORT_CODE,
} from "@/lib/fixtures/sample-category-sort";
import {
  buildSampleOddOneOutBoard,
  DEMO_ODD_ONE_OUT_CODE,
  ODD_ONE_OUT_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-odd-one-out";
import {
  buildSampleTrueFalseDashBoard,
  DEMO_TRUE_FALSE_DASH_CODE,
  TRUE_FALSE_DASH_SAMPLE_BOARD_ID,
} from "@/lib/fixtures/sample-true-false-dash";
import {
  ACCESS_CODE_COOKIE,
  ENTITLEMENT_TTL_HOURS,
} from "@/lib/domain/access-code";

type StoreShape = {
  boards: GameBoard[];
  product_codes: ProductCodeRecord[];
  entitlements: HostEntitlement[];
};

const DATA_DIR = path.join(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? "/tmp/live-game-data"
    : path.join(process.cwd(), "data"),
);
const STORE_PATH = path.join(DATA_DIR, "store.json");

/** Fixed packaging string for local demo (any hyphenation of same alphanumerics works). */
export const DEMO_ACCESS_CODE_DISPLAY = "T4T-DEMO-MATH-G3-SAMPLE01";

async function ensureStore(): Promise<StoreShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    const store: StoreShape = {
      boards: parsed.boards ?? [],
      product_codes: parsed.product_codes ?? [],
      entitlements: parsed.entitlements ?? [],
    };
    const seededMath = seedMathGrade3Sample(store);
    const seededMatch = seedMemoryMatchSample(store);
    const seededRace = seedTimedRaceSample(store);
    const seededScavenger = seedScavengerTapSample(store);
    const seededSequence = seedSequenceSortSample(store);
    const seededCategory = seedCategorySortSample(store);
    const seededOdd = seedOddOneOutSample(store);
    const seededDash = seedTrueFalseDashSample(store);
    if (
      seededMath ||
      seededMatch ||
      seededRace ||
      seededScavenger ||
      seededSequence ||
      seededCategory ||
      seededOdd ||
      seededDash
    ) {
      await writeStore(store);
    }
    return store;
  } catch {
    const board = GameBoardSchema.parse(buildSampleMathGrade3Board());
    const matchBoard = GameBoardSchema.parse(buildSampleMemoryMatchBoard());
    const raceBoard = GameBoardSchema.parse(buildSampleTimedRaceBoard());
    const scavengerBoard = GameBoardSchema.parse(buildSampleScavengerTapBoard());
    const sequenceBoard = GameBoardSchema.parse(buildSampleSequenceSortBoard());
    const categoryBoard = GameBoardSchema.parse(buildSampleCategorySortBoard());
    const oddBoard = GameBoardSchema.parse(buildSampleOddOneOutBoard());
    const dashBoard = GameBoardSchema.parse(buildSampleTrueFalseDashBoard());
    const initial: StoreShape = {
      boards: [
        board,
        matchBoard,
        raceBoard,
        scavengerBoard,
        sequenceBoard,
        categoryBoard,
        oddBoard,
        dashBoard,
      ],
      product_codes: [],
      entitlements: [],
    };
    seedMathGrade3Sample(initial);
    seedMemoryMatchSample(initial);
    seedTimedRaceSample(initial);
    seedScavengerTapSample(initial);
    seedSequenceSortSample(initial);
    seedCategorySortSample(initial);
    seedOddOneOutSample(initial);
    seedTrueFalseDashSample(initial);
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

function seedMathGrade3Sample(store: StoreShape): boolean {
  let dirty = false;
  const boardId = "board_sample_math_g3";
  if (!store.boards.some((b) => b.id === boardId)) {
    store.boards.push(GameBoardSchema.parse(buildSampleMathGrade3Board()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode("T4T-DEMO-MATH-G3-SAMPLE01"));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: boardId,
        label: "Local demo / packaging sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedMemoryMatchSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === MEMORY_MATCH_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleMemoryMatchBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_MEMORY_MATCH_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: MEMORY_MATCH_SAMPLE_BOARD_ID,
        label: "Local demo / memory match sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedTimedRaceSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === TIMED_RACE_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleTimedRaceBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_TIMED_RACE_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: TIMED_RACE_SAMPLE_BOARD_ID,
        label: "Local demo / timed race sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedScavengerTapSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === SCAVENGER_TAP_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleScavengerTapBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_SCAVENGER_TAP_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: SCAVENGER_TAP_SAMPLE_BOARD_ID,
        label: "Local demo / scavenger tap sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedSequenceSortSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === SEQUENCE_SORT_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleSequenceSortBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_SEQUENCE_SORT_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: SEQUENCE_SORT_SAMPLE_BOARD_ID,
        label: "Local demo / sequence sort sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedCategorySortSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === CATEGORY_SORT_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleCategorySortBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_CATEGORY_SORT_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: CATEGORY_SORT_SAMPLE_BOARD_ID,
        label: "Local demo / category sort sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedOddOneOutSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === ODD_ONE_OUT_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleOddOneOutBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_ODD_ONE_OUT_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: ODD_ONE_OUT_SAMPLE_BOARD_ID,
        label: "Local demo / odd one out sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
}

function seedTrueFalseDashSample(store: StoreShape): boolean {
  let dirty = false;
  if (!store.boards.some((b) => b.id === TRUE_FALSE_DASH_SAMPLE_BOARD_ID)) {
    store.boards.push(GameBoardSchema.parse(buildSampleTrueFalseDashBoard()));
    dirty = true;
  }
  const hash = sha256Hex(normalizeAccessCode(DEMO_TRUE_FALSE_DASH_CODE));
  if (!store.product_codes.some((c) => c.code_hash === hash)) {
    store.product_codes.push(
      ProductCodeRecordSchema.parse({
        id: generateId("pc"),
        code_hash: hash,
        board_id: TRUE_FALSE_DASH_SAMPLE_BOARD_ID,
        label: "Local demo / true false dash sample",
        max_sessions: null,
        sessions_started: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }),
    );
    dirty = true;
  }
  return dirty;
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
  Pick<
    GameBoard,
    "id" | "title" | "grade" | "subject" | "status" | "tpt_sku" | "game_type"
  >[]
> {
  const store = await ensureStore();
  return store.boards.map((b) => ({
    id: b.id,
    title: b.title,
    grade: b.grade,
    subject: b.subject,
    status: b.status,
    tpt_sku: b.tpt_sku,
    game_type: boardGameType(b),
  }));
}

export function toHostBoardView(board: GameBoard): HostBoardView {
  const categories = [...new Set((board.cells ?? []).map((c) => c.category))];
  return {
    id: board.id,
    title: board.title,
    grade: board.grade,
    subject: board.subject,
    theme: board.theme,
    tpt_sku: board.tpt_sku,
    categories,
    cell_count: board.cells.length,
    game_type: boardGameType(board),
    item_count: itemsFromBoard(board).length,
    race_item_count: raceItemsFromBoard(board).length,
    scavenger_item_count: scavengerItemsFromBoard(board).length,
    sequence_item_count: sequenceItemsFromBoard(board).length,
    category_item_count: categoryItemsFromBoard(board).length,
    odd_item_count: oddItemsFromBoard(board).length,
    dash_item_count: dashItemsFromBoard(board).length,
    supports_board: supportsBoardPlay(board),
    supports_memory_match: supportsMemoryMatch(board),
    supports_timed_race: supportsTimedRace(board),
    supports_scavenger_tap: supportsScavengerTap(board),
    supports_sequence_sort: supportsSequenceSort(board),
    supports_category_sort: supportsCategorySort(board),
    supports_odd_one_out: supportsOddOneOut(board),
    supports_true_false_dash: supportsTrueFalseDash(board),
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
export {
  DEMO_MEMORY_MATCH_CODE,
  DEMO_TIMED_RACE_CODE,
  DEMO_SCAVENGER_TAP_CODE,
  DEMO_SEQUENCE_SORT_CODE,
  DEMO_CATEGORY_SORT_CODE,
  DEMO_ODD_ONE_OUT_CODE,
  DEMO_TRUE_FALSE_DASH_CODE,
};

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

/** Seed Memory Match sample packet + known demo access code. Idempotent. */
export async function ensureMemoryMatchSample(
  plaintext = DEMO_MEMORY_MATCH_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === MEMORY_MATCH_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleMemoryMatchBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_MEMORY_MATCH_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / memory match sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_MEMORY_MATCH_CODE,
    boardId: board.id,
    created: true,
  };
}

/** Seed Timed Race sample packet + known demo access code. Idempotent. */
export async function ensureTimedRaceSample(
  plaintext = DEMO_TIMED_RACE_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === TIMED_RACE_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleTimedRaceBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_TIMED_RACE_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / timed race sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_TIMED_RACE_CODE,
    boardId: board.id,
    created: true,
  };
}

/** Seed Scavenger Tap sample packet + known demo access code. Idempotent. */
export async function ensureScavengerTapSample(
  plaintext = DEMO_SCAVENGER_TAP_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === SCAVENGER_TAP_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleScavengerTapBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_SCAVENGER_TAP_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / scavenger tap sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_SCAVENGER_TAP_CODE,
    boardId: board.id,
    created: true,
  };
}

/** Seed Sequence Sort sample packet + known demo access code. Idempotent. */
export async function ensureSequenceSortSample(
  plaintext = DEMO_SEQUENCE_SORT_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === SEQUENCE_SORT_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleSequenceSortBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_SEQUENCE_SORT_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / sequence sort sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_SEQUENCE_SORT_CODE,
    boardId: board.id,
    created: true,
  };
}

/** Seed Category Sort sample packet + known demo access code. Idempotent. */
export async function ensureCategorySortSample(
  plaintext = DEMO_CATEGORY_SORT_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === CATEGORY_SORT_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleCategorySortBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_CATEGORY_SORT_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / category sort sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_CATEGORY_SORT_CODE,
    boardId: board.id,
    created: true,
  };
}

/** Seed Odd One Out sample packet + known demo access code. Idempotent. */
export async function ensureOddOneOutSample(
  plaintext = DEMO_ODD_ONE_OUT_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === ODD_ONE_OUT_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleOddOneOutBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_ODD_ONE_OUT_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / odd one out sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_ODD_ONE_OUT_CODE,
    boardId: board.id,
    created: true,
  };
}

/** Seed True or False Dash sample packet + known demo access code. Idempotent. */
export async function ensureTrueFalseDashSample(
  plaintext = DEMO_TRUE_FALSE_DASH_CODE,
): Promise<{ code: string; boardId: string; created: boolean }> {
  const store = await ensureStore();
  const board =
    store.boards.find((b) => b.id === TRUE_FALSE_DASH_SAMPLE_BOARD_ID) ??
    GameBoardSchema.parse(buildSampleTrueFalseDashBoard());

  if (!store.boards.some((b) => b.id === board.id)) {
    store.boards.push(board);
  }

  const hash = sha256Hex(normalizeAccessCode(plaintext));
  const existing = store.product_codes.find((c) => c.code_hash === hash);
  if (existing) {
    await writeStore(store);
    return {
      code: DEMO_TRUE_FALSE_DASH_CODE,
      boardId: board.id,
      created: false,
    };
  }

  const record = ProductCodeRecordSchema.parse({
    id: generateId("pc"),
    code_hash: hash,
    board_id: board.id,
    label: "Local demo / true false dash sample",
    max_sessions: null,
    sessions_started: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
  });
  store.product_codes.push(record);
  await writeStore(store);
  return {
    code: DEMO_TRUE_FALSE_DASH_CODE,
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
    game_type: source.game_type ?? "board",
    items: source.items?.map((item) => ({
      ...item,
      id: generateId("mm"),
    })),
    race_items: source.race_items?.map((item) => ({
      ...item,
      id: generateId("tr"),
    })),
    scavenger_items: source.scavenger_items?.map((item) => {
      const newId = generateId("st");
      const correctIdx = item.targets.findIndex(
        (t) => t.id === item.correct_target_id,
      );
      return {
        ...item,
        id: newId,
        targets: item.targets.map((t, i) => ({
          ...t,
          id: `${newId}-t${i}`,
        })),
        correct_target_id: `${newId}-t${Math.max(0, correctIdx)}`,
      };
    }),
    sequence_items: source.sequence_items?.map((item) => {
      const newId = generateId("ss");
      const idMap: Record<string, string> = {};
      const steps = item.steps.map((s, i) => {
        const sid = `${newId}-s${i}`;
        idMap[s.id] = sid;
        return { ...s, id: sid };
      });
      return {
        ...item,
        id: newId,
        steps,
        correct_order: item.correct_order.map((id) => idMap[id] ?? id),
      };
    }),
    category_items: source.category_items?.map((item) => {
      const newId = generateId("cs");
      const idMap: Record<string, string> = {};
      const categories = item.categories.map((c, i) => {
        const cid = `${newId}-c${i}`;
        idMap[c.id] = cid;
        return { ...c, id: cid };
      });
      return {
        ...item,
        id: newId,
        categories,
        correct_category_id:
          idMap[item.correct_category_id] ?? item.correct_category_id,
      };
    }),
    odd_items: source.odd_items?.map((item) => {
      const newId = generateId("oo");
      const idMap: Record<string, string> = {};
      const options = item.options.map((o, i) => {
        const oid = `${newId}-o${i}`;
        idMap[o.id] = oid;
        return { ...o, id: oid };
      });
      return {
        ...item,
        id: newId,
        options,
        odd_option_id: idMap[item.odd_option_id] ?? item.odd_option_id,
      };
    }),
    dash_items: source.dash_items?.map((item) => ({
      ...item,
      id: generateId("tf"),
    })),
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
