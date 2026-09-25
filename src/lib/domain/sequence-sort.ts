import type { GameBoard, SequenceSortItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const SEQUENCE_SORT_POINTS_PER_CORRECT = 100;
export const SEQUENCE_SORT_MAX_ITEMS = 8;

export type PlayerSequenceState = {
  /** item index → shuffled/working step ids (stable across polls). */
  working: Record<number, string[]>;
  /** item index → locked-in order (first submit sticks). */
  answers: Record<number, string[]>;
  correct_count: number;
};

export type PlayerSequenceView = {
  item_total: number;
  item_index: number;
  prompt: string | null;
  steps: { id: string; label: string }[] | null;
  can_submit: boolean;
  submitted: boolean;
  completed: boolean;
  correct_count: number;
};

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function sameStepOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function shuffledStepIds(item: SequenceSortItem): string[] {
  const ids = shuffle(item.steps.map((s) => s.id));
  if (ids.length > 1 && sameStepOrder(ids, item.correct_order)) {
    const tmp = ids[0]!;
    ids[0] = ids[1]!;
    ids[1] = tmp;
  }
  return ids;
}

function choicesAsSteps(
  id: string,
  prompt: string,
  choices: readonly string[],
  teks?: string,
): SequenceSortItem {
  const steps = choices.map((label, i) => ({
    id: `${id}-s${i}`,
    label,
  }));
  return {
    id,
    prompt,
    steps,
    correct_order: steps.map((s) => s.id),
    teks,
  };
}

export function sequenceItemsFromBoard(board: GameBoard): SequenceSortItem[] {
  if (board.sequence_items && board.sequence_items.length >= 4) {
    return board.sequence_items.slice(0, SEQUENCE_SORT_MAX_ITEMS);
  }
  if (board.scavenger_items && board.scavenger_items.length >= 4) {
    return board.scavenger_items.slice(0, SEQUENCE_SORT_MAX_ITEMS).map((item) => ({
      id: item.id,
      prompt: item.prompt,
      steps: item.targets.map((t) => ({ id: t.id, label: t.label })),
      correct_order: item.targets.map((t) => t.id),
      teks: item.teks,
    }));
  }
  if (board.race_items && board.race_items.length >= 4) {
    return board.race_items
      .slice(0, SEQUENCE_SORT_MAX_ITEMS)
      .map((item) =>
        choicesAsSteps(item.id, item.prompt, item.choices, item.teks),
      );
  }
  return (board.cells ?? [])
    .slice(0, SEQUENCE_SORT_MAX_ITEMS)
    .map((cell) =>
      choicesAsSteps(cell.id, cell.question, cell.choices, cell.teks),
    );
}

export function createPlayerSequenceState(): PlayerSequenceState {
  return { working: {}, answers: {}, correct_count: 0 };
}

export function ensureSequenceWorking(
  state: PlayerSequenceState,
  itemIndex: number,
  items: SequenceSortItem[],
): void {
  const item = items[itemIndex];
  if (!item) return;
  if (state.working[itemIndex]) return;
  state.working[itemIndex] = shuffledStepIds(item);
}

/** Returns points awarded this lock-in (0 or SEQUENCE_SORT_POINTS_PER_CORRECT). */
export function applySequenceSubmit(
  state: PlayerSequenceState,
  itemIndex: number,
  order: string[],
  items: SequenceSortItem[],
): { ok: true; points: number } | { ok: false; error: string } {
  if (itemIndex < 0 || itemIndex >= items.length) {
    return { ok: false, error: "NO_ITEM" };
  }
  if (state.answers[itemIndex] !== undefined) {
    return { ok: false, error: "ALREADY_SUBMITTED" };
  }
  const item = items[itemIndex]!;
  const stepIds = item.steps.map((s) => s.id);
  if (order.length !== stepIds.length) {
    return { ok: false, error: "INVALID_ORDER" };
  }
  if (new Set(order).size !== order.length) {
    return { ok: false, error: "INVALID_ORDER" };
  }
  if (!order.every((id) => stepIds.includes(id))) {
    return { ok: false, error: "INVALID_ORDER" };
  }
  state.answers[itemIndex] = [...order];
  state.working[itemIndex] = [...order];
  const points = sameStepOrder(order, item.correct_order)
    ? SEQUENCE_SORT_POINTS_PER_CORRECT
    : 0;
  if (points > 0) state.correct_count += 1;
  return { ok: true, points };
}

export function toPlayerSequenceView(
  state: PlayerSequenceState,
  items: SequenceSortItem[],
  itemIndex: number,
): PlayerSequenceView {
  const item = items[itemIndex] ?? null;
  if (item) ensureSequenceWorking(state, itemIndex, items);
  const submitted = item ? state.answers[itemIndex] !== undefined : false;
  const working = item ? (state.working[itemIndex] ?? item.steps.map((s) => s.id)) : [];
  const lastIndex = Math.max(0, items.length - 1);
  const completed =
    items.length > 0 &&
    itemIndex >= lastIndex &&
    state.answers[lastIndex] !== undefined;
  const byId = new Map(item ? item.steps.map((s) => [s.id, s]) : []);
  return {
    item_total: items.length,
    item_index: itemIndex,
    prompt: item ? kidPlainText(item.prompt, 200) : null,
    steps: item
      ? working.map((id) => {
          const step = byId.get(id);
          return {
            id,
            label: kidPlainText(step?.label ?? "", 80),
          };
        })
      : null,
    can_submit: Boolean(item) && !submitted,
    submitted,
    completed,
    correct_count: state.correct_count,
  };
}
