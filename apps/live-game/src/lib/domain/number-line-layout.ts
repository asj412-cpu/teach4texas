/** Host name chips. 24px type on navy clears WCAG AA against the chip, not the yellow line. */
export const NL_NAME_FG = "#ffffff";
export const NL_NAME_BG = "#07111f";
export const NL_NAME_FONT_PX = 24;

/** Matches the track CSS at a 16px root. */
export const NL_DOT_PX = 22;
export const NL_STACK_PX = 28;
export const NL_DOT_TOP_IN_RAIL = 34.4;
export const NL_RAIL_PX = 88;
export const NL_LABELS_PX = 52;
export const NL_CHIP_H = 40;
export const NL_CHIP_GAP_PX = 6;
export const NL_MAX_LANES = 2;
export const NL_MAX_STACK = 2;
/** Extra-bold 24px is wider than 0.62em. This stays above the rendered chip. */
const NL_CHAR_PX = 22;
const NL_CHIP_PAD_X = 16;
const NL_DOT_HIT_PX = NL_DOT_PX;

/**
 * Host chrome above the track on a 1366-wide projector (header, question, gaps).
 * The track budget keeps the line and the true-spot flag inside a 768px screen.
 */
export const NL_HOST_CHROME_PX = 400;
export const NL_VIEWPORT_H_PX = 768;
export const NL_REVEAL_BUDGET_PX = NL_VIEWPORT_H_PX - NL_HOST_CHROME_PX;

export type NameLayoutDot = {
  id: string;
  /** 0–100 along the line. */
  xPercent: number;
  name: string | null;
  /** Identical values share one dot and one chip. Omit to keep each dot separate. */
  value?: number;
};

export type Box = { left: number; top: number; right: number; bottom: number };

export type RevealDot = {
  id: string;
  x: number;
  stack: number;
  names: string[];
  box: Box;
};

export type RevealChip = {
  id: string;
  text: string;
  fullNames: string[];
  box: Box;
  /** Dot x the leader line drops to. */
  anchorX: number;
};

export type NumberLineRevealLayout = {
  width: number;
  dots: RevealDot[];
  chips: RevealChip[];
  /** Space above the rail reserved for chips and stacked dots. */
  nameSpace: number;
  /** Names, rail, truth flag, and tick labels. */
  revealHeight: number;
};

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const read = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const r = channel((n >> 16) & 255);
    const g = channel((n >> 8) & 255);
    const b = channel(n & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const left = read(foreground);
  const right = read(background);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

export function chipWidthPx(name: string, railWidth = Number.POSITIVE_INFINITY): number {
  const raw = Math.ceil(name.length * NL_CHAR_PX + NL_CHIP_PAD_X * 2);
  return Math.max(NL_CHIP_H, Math.min(raw, Math.max(1, railWidth)));
}

/** "Ava", "Ava, Ben", or "Ava, Ben +10". */
export function chipLabel(names: string[]): string {
  const clean = names.filter((name) => name.length > 0);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]}, ${clean[1]}`;
  return `${clean[0]}, ${clean[1]} +${clean.length - 2}`;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

type Group = {
  id: string;
  x: number;
  names: string[];
  stack: number;
};

function valueKey(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function clampLeft(x: number, width: number, rail: number): number {
  if (width >= rail) return 0;
  return Math.max(0, Math.min(rail - width, x - width / 2));
}

/**
 * Group identical values, cap stacks and lanes, and park every chip above the dots.
 * Chips share one coordinate space so a later dot cannot cover an earlier name.
 */
export function layoutNumberLineReveal(
  dots: NameLayoutDot[],
  widthPx: number,
): NumberLineRevealLayout {
  const width = Math.max(1, widthPx);
  const grouped = new Map<string, Group>();
  for (const dot of dots) {
    const x = (Math.min(100, Math.max(0, dot.xPercent)) / 100) * width;
    const key = dot.value == null ? `id:${dot.id}` : `v:${valueKey(dot.value)}`;
    const existing = grouped.get(key);
    if (existing) {
      if (dot.name) existing.names.push(dot.name);
      continue;
    }
    grouped.set(key, {
      id: dot.id,
      x,
      names: dot.name ? [dot.name] : [],
      stack: 0,
    });
  }

  const groups = [...grouped.values()].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  const visible: Group[] = [];
  let lastX = Number.NEGATIVE_INFINITY;
  let stack = 0;
  let column: Group[] = [];
  for (const group of groups) {
    if (group.x - lastX < NL_DOT_HIT_PX && column.length > 0) {
      if (stack + 1 < NL_MAX_STACK) {
        stack += 1;
        group.stack = stack;
        visible.push(group);
        column.push(group);
        lastX = group.x;
      } else {
        column[column.length - 1]!.names.push(...group.names);
      }
      continue;
    }
    stack = 0;
    group.stack = 0;
    visible.push(group);
    column = [group];
    lastX = group.x;
  }

  const maxStack = visible.reduce((highest, group) => Math.max(highest, group.stack), 0);
  const named = visible.filter((group) => group.names.length > 0);

  type Draft = {
    id: string;
    names: string[];
    anchorX: number;
    left: number;
    width: number;
    lane: number;
  };

  const drafts: Draft[] = named.map((group) => {
    const text = chipLabel(group.names);
    const chip = chipWidthPx(text, width);
    return {
      id: group.id,
      names: group.names,
      anchorX: group.x,
      width: chip,
      left: clampLeft(group.x, chip, width),
      lane: 0,
    };
  });

  const parked = new Set<string>();

  function sameLaneHit(draft: Draft, lane: number): Draft | null {
    const right = draft.left + draft.width;
    for (const other of drafts) {
      if (other.id === draft.id || !parked.has(other.id) || other.lane !== lane) continue;
      if (draft.left < other.left + other.width + NL_CHIP_GAP_PX && other.left < right + NL_CHIP_GAP_PX) {
        return other;
      }
    }
    return null;
  }

  function place(draft: Draft): boolean {
    for (let lane = 0; lane < NL_MAX_LANES; lane++) {
      if (!sameLaneHit(draft, lane)) {
        draft.lane = lane;
        return true;
      }
    }
    return false;
  }

  function absorb(host: Draft, extra: Draft) {
    host.names.push(...extra.names);
    host.width = chipWidthPx(chipLabel(host.names), width);
    host.left = clampLeft(host.anchorX, host.width, width);
    const index = drafts.findIndex((row) => row.id === extra.id);
    if (index >= 0) drafts.splice(index, 1);
    parked.delete(extra.id);
  }

  // Left to right. A chip that cannot take a free lane merges into its neighbor.
  const pending = [...drafts].sort((a, b) => a.left - b.left || a.id.localeCompare(b.id));
  for (const draft of pending) {
    if (!drafts.includes(draft)) continue;
    if (place(draft)) {
      parked.add(draft.id);
      continue;
    }
    let nearest: Draft | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const other of drafts) {
      if (other.id === draft.id || !parked.has(other.id)) continue;
      const dist = Math.abs(other.anchorX - draft.anchorX);
      if (dist < nearestDist) {
        nearest = other;
        nearestDist = dist;
      }
    }
    if (!nearest) {
      draft.lane = 0;
      parked.add(draft.id);
      continue;
    }
    absorb(nearest, draft);
    let guard = 0;
    while (guard < 40) {
      guard += 1;
      if (place(nearest)) break;
      const hit = sameLaneHit(nearest, 0) ?? sameLaneHit(nearest, nearest.lane);
      if (!hit) {
        nearest.lane = 0;
        break;
      }
      absorb(nearest, hit);
    }
    parked.add(nearest.id);
  }

  const lanesUsed = drafts.length === 0 ? 0 : Math.max(...drafts.map((draft) => draft.lane)) + 1;
  const protrusion = Math.max(0, maxStack * NL_STACK_PX - NL_DOT_TOP_IN_RAIL);
  const chipArea =
    lanesUsed === 0 ? 0 : lanesUsed * NL_CHIP_H + Math.max(0, lanesUsed - 1) * NL_CHIP_GAP_PX;
  const nameSpace = chipArea + (lanesUsed > 0 ? NL_CHIP_GAP_PX : 0) + protrusion;

  const dotsOut: RevealDot[] = visible.map((group) => {
    const top = nameSpace + NL_DOT_TOP_IN_RAIL - group.stack * NL_STACK_PX;
    return {
      id: group.id,
      x: group.x,
      stack: group.stack,
      names: group.names,
      box: {
        left: group.x - NL_DOT_PX / 2,
        right: group.x + NL_DOT_PX / 2,
        top,
        bottom: top + NL_DOT_PX,
      },
    };
  });

  const chips: RevealChip[] = drafts.map((draft) => {
    const text = chipLabel(draft.names);
    const top = chipArea - (draft.lane + 1) * NL_CHIP_H - draft.lane * NL_CHIP_GAP_PX;
    return {
      id: draft.id,
      text,
      fullNames: [...draft.names],
      anchorX: draft.anchorX,
      box: {
        left: draft.left,
        right: draft.left + draft.width,
        top,
        bottom: top + NL_CHIP_H,
      },
    };
  });

  return {
    width,
    dots: dotsOut,
    chips,
    nameSpace,
    revealHeight: nameSpace + NL_RAIL_PX + NL_LABELS_PX,
  };
}
