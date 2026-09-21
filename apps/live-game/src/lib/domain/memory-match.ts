import type { GameBoard, MemoryMatchItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

export const MEMORY_MATCH_POINTS_PER_PAIR = 100;
export const MEMORY_MISMATCH_MS = 900;
export const MEMORY_MATCH_MAX_PAIRS = 8;

export type MatchCard = {
  id: string;
  item_id: string;
  face: "prompt" | "match";
  text: string;
};

export type PlayerMatchState = {
  cards: MatchCard[];
  flipped: number[];
  matched_ids: string[];
  pairs_found: number;
  moves: number;
  mismatch_until: number | null;
  completed_at: string | null;
};

export type PlayerMatchView = {
  columns: number;
  pair_total: number;
  pairs_found: number;
  moves: number;
  can_flip: boolean;
  completed: boolean;
  cards: {
    id: string;
    up: boolean;
    matched: boolean;
    text: string | null;
  }[];
};

export function itemsFromBoard(board: GameBoard): MemoryMatchItem[] {
  if (board.items && board.items.length >= 4) {
    return board.items.slice(0, MEMORY_MATCH_MAX_PAIRS);
  }
  return (board.cells ?? []).slice(0, MEMORY_MATCH_MAX_PAIRS).map((cell) => ({
    id: cell.id,
    prompt: cell.question,
    match: cell.answer,
    teks: cell.teks,
  }));
}

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

export function buildMatchDeck(items: MemoryMatchItem[]): MatchCard[] {
  const cards: MatchCard[] = [];
  for (const item of items) {
    cards.push({
      id: `${item.id}-a`,
      item_id: item.id,
      face: "prompt",
      text: kidPlainText(item.prompt, 90),
    });
    cards.push({
      id: `${item.id}-b`,
      item_id: item.id,
      face: "match",
      text: kidPlainText(item.match, 90),
    });
  }
  return shuffle(cards);
}

export function createPlayerMatchState(items: MemoryMatchItem[]): PlayerMatchState {
  return {
    cards: buildMatchDeck(items),
    flipped: [],
    matched_ids: [],
    pairs_found: 0,
    moves: 0,
    mismatch_until: null,
    completed_at: null,
  };
}

export function clearExpiredMismatch(
  state: PlayerMatchState,
  now = Date.now(),
): void {
  if (state.mismatch_until != null && now >= state.mismatch_until) {
    state.flipped = [];
    state.mismatch_until = null;
  }
}

/** Returns points awarded this flip (0 or MEMORY_MATCH_POINTS_PER_PAIR). */
export function applyCardFlip(
  state: PlayerMatchState,
  index: number,
  now = Date.now(),
): { ok: true; points: number } | { ok: false; error: string } {
  clearExpiredMismatch(state, now);
  if (state.completed_at) return { ok: false, error: "ALREADY_COMPLETE" };
  if (state.mismatch_until != null && now < state.mismatch_until) {
    return { ok: false, error: "WAIT" };
  }
  if (index < 0 || index >= state.cards.length) {
    return { ok: false, error: "BAD_CARD" };
  }
  const card = state.cards[index]!;
  if (state.matched_ids.includes(card.item_id)) {
    return { ok: false, error: "ALREADY_MATCHED" };
  }
  if (state.flipped.includes(index)) {
    return { ok: false, error: "ALREADY_UP" };
  }
  if (state.flipped.length >= 2) {
    return { ok: false, error: "WAIT" };
  }

  state.flipped.push(index);
  if (state.flipped.length < 2) {
    return { ok: true, points: 0 };
  }

  state.moves += 1;
  const a = state.cards[state.flipped[0]!]!;
  const b = state.cards[state.flipped[1]!]!;
  const isMatch = a.item_id === b.item_id && a.face !== b.face;
  if (isMatch) {
    state.matched_ids.push(a.item_id);
    state.pairs_found += 1;
    state.flipped = [];
    state.mismatch_until = null;
    if (state.pairs_found >= state.cards.length / 2) {
      state.completed_at = new Date(now).toISOString();
    }
    return { ok: true, points: MEMORY_MATCH_POINTS_PER_PAIR };
  }

  state.mismatch_until = now + MEMORY_MISMATCH_MS;
  return { ok: true, points: 0 };
}

export function toPlayerMatchView(
  state: PlayerMatchState,
  now = Date.now(),
): PlayerMatchView {
  clearExpiredMismatch(state, now);
  const pair_total = state.cards.length / 2;
  const up = new Set(state.flipped);
  const matched = new Set(state.matched_ids);
  const waiting = state.mismatch_until != null && now < state.mismatch_until;
  return {
    columns: 4,
    pair_total,
    pairs_found: state.pairs_found,
    moves: state.moves,
    can_flip: !waiting && !state.completed_at && state.flipped.length < 2,
    completed: Boolean(state.completed_at),
    cards: state.cards.map((card, i) => {
      const isMatched = matched.has(card.item_id);
      const isUp = isMatched || up.has(i);
      return {
        id: card.id,
        up: isUp,
        matched: isMatched,
        text: isUp ? card.text : null,
      };
    }),
  };
}
