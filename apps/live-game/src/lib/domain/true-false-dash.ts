import type { GameBoard, TrueFalseDashItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const TRUE_FALSE_DASH_POINTS_PER_CORRECT = 100;
export const TRUE_FALSE_DASH_MAX_ITEMS = 8;

export type PlayerDashState = {
  /** item index → the True/False the student tapped (first tap sticks). */
  answers: Record<number, boolean>;
  correct_count: number;
  /** Consecutive correct taps. Resets to 0 on a miss. */
  streak: number;
};

export type PlayerDashView = {
  item_total: number;
  item_index: number;
  prompt: string | null;
  can_tap: boolean;
  tapped: boolean;
  /** The student's locked choice for this round, if any. */
  picked: boolean | null;
  completed: boolean;
  correct_count: number;
  streak: number;
  /** True only after a correct tap on the current round. */
  last_correct: boolean;
};

function claimFromChoice(
  id: string,
  stem: string,
  stated: string,
  isTrue: boolean,
  teks?: string,
): TrueFalseDashItem {
  const joined = `${stem.trim()} ${stated.trim()}`.replace(/\s+/g, " ").trim();
  const prompt = joined.length > 200 ? `${joined.slice(0, 199)}…` : joined;
  return teks ? { id, prompt, answer: isTrue, teks } : { id, prompt, answer: isTrue };
}

function mcToClaim(
  id: string,
  stem: string,
  choices: readonly string[],
  correctIndex: number,
  asTrue: boolean,
  teks?: string,
): TrueFalseDashItem {
  const idx = Math.min(Math.max(correctIndex, 0), Math.max(0, choices.length - 1));
  const correct = choices[idx] ?? "";
  const wrong = choices.find((_, i) => i !== idx) ?? correct;
  return claimFromChoice(id, stem, asTrue ? correct : wrong, asTrue, teks);
}

export function dashItemsFromBoard(board: GameBoard): TrueFalseDashItem[] {
  if (board.dash_items && board.dash_items.length >= 4) {
    return board.dash_items.slice(0, TRUE_FALSE_DASH_MAX_ITEMS);
  }
  if (board.odd_items && board.odd_items.length >= 4) {
    return board.odd_items.slice(0, TRUE_FALSE_DASH_MAX_ITEMS).map((item, i) => {
      const odd = item.options.find((o) => o.id === item.odd_option_id);
      const other = item.options.find((o) => o.id !== item.odd_option_id);
      const asTrue = i % 2 === 0;
      const label = (asTrue ? odd?.label : other?.label) ?? "";
      return claimFromChoice(
        item.id,
        item.prompt ?? "Which one does not belong?",
        `${label} does not belong.`,
        asTrue,
        item.teks,
      );
    });
  }
  if (board.category_items && board.category_items.length >= 4) {
    return board.category_items
      .slice(0, TRUE_FALSE_DASH_MAX_ITEMS)
      .map((item, i) => {
        const correct = item.categories.find(
          (c) => c.id === item.correct_category_id,
        );
        const other = item.categories.find(
          (c) => c.id !== item.correct_category_id,
        );
        const asTrue = i % 2 === 0;
        const label = (asTrue ? correct?.label : other?.label) ?? "";
        const stem = item.prompt
          ? `${item.prompt} ${item.item_label} belongs with`
          : `${item.item_label} belongs with`;
        return claimFromChoice(item.id, stem, `${label}.`, asTrue, item.teks);
      });
  }
  if (board.scavenger_items && board.scavenger_items.length >= 4) {
    return board.scavenger_items
      .slice(0, TRUE_FALSE_DASH_MAX_ITEMS)
      .map((item, i) => {
        const correct = item.targets.find((t) => t.id === item.correct_target_id);
        const other = item.targets.find((t) => t.id !== item.correct_target_id);
        const asTrue = i % 2 === 0;
        const label = (asTrue ? correct?.label : other?.label) ?? "";
        return claimFromChoice(item.id, item.prompt, label, asTrue, item.teks);
      });
  }
  if (board.race_items && board.race_items.length >= 4) {
    return board.race_items.slice(0, TRUE_FALSE_DASH_MAX_ITEMS).map((item, i) =>
      mcToClaim(
        item.id,
        item.prompt,
        item.choices,
        item.correct_index,
        i % 2 === 0,
        item.teks,
      ),
    );
  }
  return (board.cells ?? []).slice(0, TRUE_FALSE_DASH_MAX_ITEMS).map((cell, i) =>
    mcToClaim(
      cell.id,
      cell.question,
      cell.choices,
      cell.correct_index,
      i % 2 === 0,
      cell.teks,
    ),
  );
}

export function createPlayerDashState(): PlayerDashState {
  return { answers: {}, correct_count: 0, streak: 0 };
}

/** Returns points awarded this tap (0 or TRUE_FALSE_DASH_POINTS_PER_CORRECT). */
export function applyDashTap(
  state: PlayerDashState,
  itemIndex: number,
  answer: boolean,
  items: TrueFalseDashItem[],
): { ok: true; points: number; streak: number } | { ok: false; error: string } {
  if (itemIndex < 0 || itemIndex >= items.length) {
    return { ok: false, error: "NO_ITEM" };
  }
  if (state.answers[itemIndex] !== undefined) {
    return { ok: false, error: "ALREADY_TAPPED" };
  }
  const item = items[itemIndex]!;
  state.answers[itemIndex] = answer;
  if (answer === item.answer) {
    state.correct_count += 1;
    state.streak += 1;
    return {
      ok: true,
      points: TRUE_FALSE_DASH_POINTS_PER_CORRECT,
      streak: state.streak,
    };
  }
  state.streak = 0;
  return { ok: true, points: 0, streak: 0 };
}

export function toPlayerDashView(
  state: PlayerDashState,
  items: TrueFalseDashItem[],
  itemIndex: number,
): PlayerDashView {
  const item = items[itemIndex] ?? null;
  const rawPick = state.answers[itemIndex];
  const picked = item != null && rawPick !== undefined ? rawPick : null;
  const tapped = picked !== null;
  const lastIndex = Math.max(0, items.length - 1);
  const completed =
    items.length > 0 &&
    itemIndex >= lastIndex &&
    state.answers[lastIndex] !== undefined;
  return {
    item_total: items.length,
    item_index: itemIndex,
    prompt: item ? kidPlainText(item.prompt, 200) : null,
    can_tap: item != null && !tapped,
    tapped,
    picked,
    completed,
    correct_count: state.correct_count,
    streak: state.streak,
    last_correct: item != null && tapped && picked === item.answer,
  };
}
