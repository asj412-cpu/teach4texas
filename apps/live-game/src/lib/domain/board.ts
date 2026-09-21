import { z } from "zod";

export const GameTypeSchema = z.enum(["board", "memory_match", "timed_race"]);
export type GameType = z.infer<typeof GameTypeSchema>;

/** TEKS-agnostic pair for Memory Match. `teks` is optional on purpose. */
export const MemoryMatchItemSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1).max(200),
  match: z.string().min(1).max(200),
  teks: z.string().max(32).optional(),
});

export type MemoryMatchItem = z.infer<typeof MemoryMatchItemSchema>;

/** TEKS-agnostic 4-choice item for Timed Race. `teks` is optional on purpose. */
export const TimedRaceItemSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1).max(200),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct_index: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  teks: z.string().max(32).optional(),
});

export type TimedRaceItem = z.infer<typeof TimedRaceItemSchema>;

/** Live MC cell — distinct from offline free-response TPT JSON. */
export const QuestionCellSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1).max(40),
  points: z.union([
    z.literal(100),
    z.literal(200),
    z.literal(300),
    z.literal(400),
    z.literal(500),
  ]),
  question: z.string().min(1).max(500),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct_index: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  /** Display text on reveal (usually choices[correct_index]). */
  answer: z.string().min(1).max(200),
  teks: z.string().min(1).max(32),
  daily_double: z.boolean().default(false),
  needs_review: z.boolean().optional(),
});

export const BoardStatusSchema = z.enum([
  "generating",
  "draft",
  "ready",
  "failed",
]);

export const GameBoardSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(120),
    grade: z.union([z.literal(3), z.literal(4), z.literal(5)]),
    subject: z.enum(["math", "rla", "science"]),
    theme: z.string().max(80).optional(),
    status: BoardStatusSchema,
    /** TPT listing slug / SKU for packaging (optional). */
    tpt_sku: z.string().max(80).optional(),
    /** Host mechanic. Existing packets without this field stay Jeopardy board. */
    game_type: GameTypeSchema.default("board"),
    cells: z.array(QuestionCellSchema).default([]),
    /** Memory Match pairs. Ignored for game_type=board unless host picks Memory Match. */
    items: z.array(MemoryMatchItemSchema).max(12).optional(),
    /** Timed Race items. Ignored for game_type=board unless host picks Timed Race. */
    race_items: z.array(TimedRaceItemSchema).max(12).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .superRefine((board, ctx) => {
    const type = board.game_type ?? "board";
    if (type === "board") {
      const cats = [...new Set(board.cells.map((c) => c.category))];
      if (board.cells.length !== 25) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected 25 cells, got ${board.cells.length}`,
        });
      }
      if (cats.length !== 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected 5 categories, got ${cats.length}`,
        });
      }
      for (const cat of cats) {
        const pts = board.cells
          .filter((c) => c.category === cat)
          .map((c) => c.points)
          .sort((a, b) => a - b);
        if (pts.join(",") !== "100,200,300,400,500") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Category "${cat}" must have points 100–500 exactly once`,
          });
        }
      }
      return;
    }

    if (type === "timed_race") {
      const raceCount =
        board.race_items && board.race_items.length >= 4
          ? board.race_items.length
          : board.cells.length;
      if (raceCount < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Timed race needs at least 4 items (race_items JSON or board cells)",
        });
      }
      if (board.race_items && board.race_items.length > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Timed race supports at most 12 items",
        });
      }
      return;
    }

    const pairCount =
      board.items && board.items.length >= 4
        ? board.items.length
        : board.cells.length;
    if (pairCount < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Memory match needs at least 4 pairs (items JSON or board cells)",
      });
    }
    if (board.items && board.items.length > 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Memory match supports at most 12 pairs",
      });
    }
  });

export type QuestionCell = z.infer<typeof QuestionCellSchema>;
export type GameBoard = z.infer<typeof GameBoardSchema>;
export type BoardStatus = z.infer<typeof BoardStatusSchema>;

/** Safe view for teacher host UI after redeem — still no need to list other games. */
export type HostBoardView = {
  id: string;
  title: string;
  grade: GameBoard["grade"];
  subject: GameBoard["subject"];
  theme?: string;
  tpt_sku?: string;
  categories: string[];
  cell_count: number;
  game_type: GameType;
  item_count: number;
  race_item_count: number;
  supports_board: boolean;
  supports_memory_match: boolean;
  supports_timed_race: boolean;
};

export function boardGameType(board: { game_type?: GameType }): GameType {
  return board.game_type ?? "board";
}

export function supportsBoardPlay(board: {
  cells?: { id: string }[];
}): boolean {
  return (board.cells?.length ?? 0) === 25;
}

export function supportsMemoryMatch(board: {
  items?: MemoryMatchItem[];
  cells?: { id: string }[];
}): boolean {
  return (board.items?.length ?? 0) >= 4 || (board.cells?.length ?? 0) >= 4;
}

export function supportsTimedRace(board: {
  race_items?: TimedRaceItem[];
  cells?: { id: string }[];
}): boolean {
  return (board.race_items?.length ?? 0) >= 4 || (board.cells?.length ?? 0) >= 4;
}

export function resolvePlayableGameType(
  board: GameBoard,
  requested?: string | null,
): GameType {
  if (requested === "timed_race" && supportsTimedRace(board)) {
    return "timed_race";
  }
  if (requested === "memory_match" && supportsMemoryMatch(board)) {
    return "memory_match";
  }
  if (requested === "board" && supportsBoardPlay(board)) {
    return "board";
  }
  const native = boardGameType(board);
  if (native === "timed_race" && supportsTimedRace(board)) {
    return "timed_race";
  }
  if (native === "memory_match" && supportsMemoryMatch(board)) {
    return "memory_match";
  }
  if (supportsBoardPlay(board)) return "board";
  if (supportsMemoryMatch(board)) return "memory_match";
  if (supportsTimedRace(board)) return "timed_race";
  return "board";
}
