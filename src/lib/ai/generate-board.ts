/**
 * OPERATOR-ONLY AI board draft (not exposed to teachers).
 * Uses xAI Grok via OpenAI-compatible API — same pattern as generators/lesson_content_generator.py.
 */
import { generateId } from "@/lib/crypto";
import {
  type GameBoard,
  GameBoardSchema,
  type QuestionCell,
} from "@/lib/domain/board";

export type GenerateBoardInput = {
  grade: 3 | 4 | 5;
  subject: "math" | "rla" | "science";
  topic: string;
  teks?: string[];
  title?: string;
  theme?: string;
  tpt_sku?: string;
  categories?: string[]; // optional 5 names
};

type CategoryPayload = {
  category: string;
  cells: {
    points: 100 | 200 | 300 | 400 | 500;
    question: string;
    choices: [string, string, string, string];
    correct_index: 0 | 1 | 2 | 3;
    answer: string;
    teks: string;
    daily_double?: boolean;
  }[];
};

const DEFAULT_CATS: Record<string, string[]> = {
  math: [
    "Number Operations",
    "Fractions",
    "Geometry",
    "Measurement",
    "Data & Graphs",
  ],
  rla: [
    "Vocabulary",
    "Main Idea",
    "Inference",
    "Author's Craft",
    "Grammar",
  ],
  science: [
    "Matter",
    "Force & Energy",
    "Earth & Space",
    "Organisms",
    "Scientific Process",
  ],
};

export async function generateBoardWithGrok(
  input: GenerateBoardInput,
): Promise<GameBoard> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY_MISSING");
  }
  if (process.env.AI_GENERATION_ENABLED === "false") {
    throw new Error("AI_DISABLED");
  }

  const model = process.env.XAI_MODEL || "grok-4.3";
  const categories =
    input.categories?.length === 5
      ? input.categories
      : DEFAULT_CATS[input.subject];

  const teksHint = input.teks?.length
    ? `TEKS focus: ${input.teks.join(", ")}.`
    : "Pick accurate Texas TEKS codes for this grade/subject.";

  // One category at a time = more reliable JSON
  const parts: CategoryPayload[] = [];
  for (const category of categories) {
    const payload = await generateCategory({
      apiKey,
      model,
      category,
      grade: input.grade,
      subject: input.subject,
      topic: input.topic,
      teksHint,
    });
    parts.push(payload);
  }

  // Exactly two daily doubles across board
  const allCells: QuestionCell[] = [];
  for (const part of parts) {
    for (const row of part.cells) {
      allCells.push({
        id: `${part.category.slice(0, 3).toLowerCase()}-${row.points}-${generateId("c").slice(-4)}`,
        category: part.category,
        points: row.points,
        question: row.question,
        choices: row.choices,
        correct_index: row.correct_index,
        answer: row.answer || row.choices[row.correct_index],
        teks: row.teks,
        daily_double: false,
        needs_review: true,
      });
    }
  }
  // pick 2 higher-point cells as DD
  const candidates = allCells.filter((c) => c.points >= 400);
  const pickPool = candidates.length >= 2 ? candidates : allCells;
  for (let i = 0; i < 2 && i < pickPool.length; i++) {
    const idx = Math.floor(Math.random() * pickPool.length);
    pickPool[idx].daily_double = true;
    pickPool.splice(idx, 1);
  }

  const now = new Date().toISOString();
  const board = GameBoardSchema.parse({
    id: generateId("board"),
    title:
      input.title ||
      `STAAR ${input.subject.toUpperCase()} Game Show — Grade ${input.grade}`,
    grade: input.grade,
    subject: input.subject,
    theme: input.theme || "Game Show",
    status: "draft",
    tpt_sku:
      input.tpt_sku ||
      `t4t-${input.subject}-g${input.grade}-${slug(input.topic)}`,
    cells: allCells,
    created_at: now,
    updated_at: now,
  });
  return board;
}

async function generateCategory(opts: {
  apiKey: string;
  model: string;
  category: string;
  grade: number;
  subject: string;
  topic: string;
  teksHint: string;
}): Promise<CategoryPayload> {
  const system = `You write TEKS-aligned multiple-choice game show questions for Texas elementary classrooms.
Return ONLY valid JSON (no markdown) with this shape:
{
  "category": "string",
  "cells": [
    {
      "points": 100,
      "question": "string",
      "choices": ["A","B","C","D"],
      "correct_index": 0,
      "answer": "exact correct choice text",
      "teks": "e.g. 3.4A"
    }
  ]
}
Rules:
- Exactly 5 cells with points 100,200,300,400,500 once each.
- correct_index is 0-3 matching choices.
- answer must equal choices[correct_index].
- Age-appropriate for the grade; rigorous but clear.
- Distractors are plausible mistakes.
- No HTML.`;

  const user = `Grade ${opts.grade} ${opts.subject}. Topic: ${opts.topic}.
Category name (use exactly): ${opts.category}
${opts.teksHint}
Generate the 5 cells for this category only.`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.55,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UPSTREAM_ERROR: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as CategoryPayload;

  if (parsed.category !== opts.category) {
    parsed.category = opts.category;
  }
  if (!Array.isArray(parsed.cells) || parsed.cells.length !== 5) {
    throw new Error("VALIDATION_FAILED: category cell count");
  }
  // normalize points order
  parsed.cells.sort((a, b) => a.points - b.points);
  return parsed;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
