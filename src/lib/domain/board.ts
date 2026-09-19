import { z } from "zod";

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
    cells: z.array(QuestionCellSchema).length(25),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .superRefine((board, ctx) => {
    const cats = [...new Set(board.cells.map((c) => c.category))];
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
};
