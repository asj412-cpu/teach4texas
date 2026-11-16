/** Host name chips. 24px type on navy clears WCAG AA against the chip, not the yellow line. */
export const NL_NAME_FG = "#ffffff";
export const NL_NAME_BG = "#07111f";
export const NL_NAME_FONT_PX = 24;

/** Matches the track CSS at a 16px root. */
export const NL_DOT_MIN_PX = 8;
export const NL_DOT_MAX_PX = 22;
export const NL_STACK_PREF_PX = 28;
export const NL_DOT_TOP_IN_RAIL = 34.4;
export const NL_RAIL_PX = 88;
export const NL_LABELS_PX = 52;
export const NL_CHIP_H = 40;
export const NL_CHIP_GAP_PX = 6;
export const NL_MAX_LANES = 2;
/**
 * A chip may name only the dots in its own stack, which stays inside this window.
 * Far placements keep their own chip.
 */
export const NL_GROUP_WINDOW_PX = 56;
const NL_CHAR_PX = 22;
const NL_CHIP_PAD_X = 16;

/**
 * Host chrome above the track on a 1366-wide projector (header, question, gaps).
 * The track budget keeps the line, the true-spot flag, and the chips inside a 768px screen.
 */
export const NL_HOST_CHROME_PX = 400;
export const NL_VIEWPORT_H_PX = 768;
export const NL_REVEAL_BUDGET_PX = NL_VIEWPORT_H_PX - NL_HOST_CHROME_PX;

export type NameLayoutDot = {
  id: string;
  /** 0–100 along the line. */
  xPercent: number;
  name: string | null;
  value?: number;
};

export type Box = { left: number; top: number; right: number; bottom: number };

export type RevealDot = {
  id: string;
  x: number;
  stack: number;
  box: Box;
};

export type RevealChip = {
  id: string;
  text: string;
  fullNames: string[];
  /** Every placement this chip names. Stays inside the group window of anchorX. */
  memberIds: string[];
  box: Box;
  anchorX: number;
};

export type RevealLeader = {
  x: number;
  y1: number;
  y2: number;
};

export type NumberLineRevealLayout = {
  width: number;
  dotSize: number;
  dots: RevealDot[];
  chips: RevealChip[];
  leaders: RevealLeader[];
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

function clampLeft(center: number, width: number, rail: number): number {
  if (width >= rail) return 0;
  return Math.max(0, Math.min(rail - width, center - width / 2));
}

type Column = {
  id: string;
  anchorX: number;
  ids: string[];
  names: string[];
  xs: number[];
};

type Draft = {
  id: string;
  names: string[];
  memberIds: string[];
  xs: number[];
  anchorX: number;
  left: number;
  width: number;
  lane: number;
  text: string;
};

function fitsWindow(anchorX: number, xs: number[]): boolean {
  return xs.every((x) => Math.abs(x - anchorX) <= NL_GROUP_WINDOW_PX + 0.01);
}

/**
 * One dot per placement. Identical and near values stack, and the stack shrinks
 * (never below an 8px dot) so thirty answers still fit a 1366×768 projector.
 * Name chips only cover that stack. Extra names stay on the group's own +N.
 */
export function layoutNumberLineReveal(
  inputs: NameLayoutDot[],
  widthPx: number,
): NumberLineRevealLayout {
  const width = Math.max(1, widthPx);
  const placed = inputs.map((dot) => ({
    ...dot,
    x: (Math.min(100, Math.max(0, dot.xPercent)) / 100) * width,
  }));
  const ordered = [...placed].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));

  const columns: Column[] = [];
  for (const dot of ordered) {
    const column = columns[columns.length - 1];
    if (column && dot.x - column.anchorX <= NL_GROUP_WINDOW_PX) {
      column.ids.push(dot.id);
      column.xs.push(dot.x);
      if (dot.name) column.names.push(dot.name);
      continue;
    }
    columns.push({
      id: dot.id,
      anchorX: dot.x,
      ids: [dot.id],
      names: dot.name ? [dot.name] : [],
      xs: [dot.x],
    });
  }

  const stackOf = new Map<string, number>();
  let maxStack = 0;
  for (const column of columns) {
    let stack = 0;
    let previousX = Number.NEGATIVE_INFINITY;
    column.ids.forEach((id, index) => {
      const x = column.xs[index]!;
      stack = x - previousX < NL_DOT_MAX_PX ? stack + (index === 0 ? 0 : 1) : 0;
      previousX = x;
      stackOf.set(id, stack);
      maxStack = Math.max(maxStack, stack);
    });
  }

  const drafts: Draft[] = [];
  for (const column of columns) {
    if (column.names.length === 0) continue;
    const text = chipLabel(column.names);
    const chip = chipWidthPx(text, width);
    drafts.push({
      id: column.id,
      names: column.names,
      memberIds: [...column.ids],
      xs: column.xs,
      anchorX: column.anchorX,
      width: chip,
      left: clampLeft(column.anchorX, chip, width),
      lane: 0,
      text,
    });
  }

  const parked = new Set<string>();

  function hits(draft: Draft, lane: number, ignoreId: string | null = null): boolean {
    const right = draft.left + draft.width;
    for (const other of drafts) {
      if (other.id === draft.id || other.id === ignoreId || !parked.has(other.id) || other.lane !== lane) continue;
      if (draft.left < other.left + other.width + NL_CHIP_GAP_PX && other.left < right + NL_CHIP_GAP_PX) {
        return true;
      }
    }
    return false;
  }

  function shove(blocker: Draft, awayFrom: number, ignoreId: string): boolean {
    const original = blocker.left;
    const dir = blocker.anchorX < awayFrom ? -1 : 1;
    for (let shift = 4; shift <= NL_GROUP_WINDOW_PX; shift += 4) {
      const center = blocker.anchorX + dir * shift;
      blocker.left = clampLeft(center, blocker.width, width);
      if (Math.abs(blocker.left + blocker.width / 2 - blocker.anchorX) > NL_GROUP_WINDOW_PX) continue;
      if (!hits(blocker, blocker.lane, ignoreId)) return true;
    }
    blocker.left = original;
    return false;
  }

  function applyText(draft: Draft, text: string) {
    draft.text = text;
    draft.width = chipWidthPx(text, width);
    draft.left = clampLeft(draft.anchorX, draft.width, width);
  }

  const columnsWithNames = drafts.length;

  function tryPlace(draft: Draft): boolean {
    const full = chipLabel(draft.names);
    const plus = `+${draft.names.length}`;
    const options =
      columnsWithNames > 1 && chipWidthPx(full, width) > Math.min(width * 0.45, 140)
        ? [plus]
        : full === plus
          ? [full]
          : [full, plus];
    for (const text of options) {
      applyText(draft, text);
      for (let lane = 0; lane < NL_MAX_LANES; lane++) {
        if (!hits(draft, lane)) {
          draft.lane = lane;
          return true;
        }
      }
      for (let shift = 4; shift <= NL_GROUP_WINDOW_PX; shift += 4) {
        for (const sign of [-1, 1]) {
          const center = draft.anchorX + sign * shift;
          draft.left = clampLeft(center, draft.width, width);
          if (Math.abs(draft.left + draft.width / 2 - draft.anchorX) > NL_GROUP_WINDOW_PX) continue;
          for (let lane = 0; lane < NL_MAX_LANES; lane++) {
            if (!hits(draft, lane)) {
              draft.lane = lane;
              return true;
            }
          }
        }
      }
    }
    applyText(draft, options[options.length - 1]!);
    return false;
  }

  const pending = [...drafts].sort((a, b) => a.anchorX - b.anchorX || a.id.localeCompare(b.id));
  for (const draft of pending) {
    if (!drafts.includes(draft)) continue;
    if (tryPlace(draft)) {
      parked.add(draft.id);
      continue;
    }
    for (const other of drafts) {
      if (other.id === draft.id || !parked.has(other.id)) continue;
      if (Math.abs(other.anchorX - draft.anchorX) > NL_GROUP_WINDOW_PX * 2) continue;
      if (shove(other, draft.anchorX, draft.id) && tryPlace(draft)) break;
    }
    if (parked.has(draft.id) || (drafts.includes(draft) && tryPlace(draft))) {
      parked.add(draft.id);
      continue;
    }
    let host: Draft | null = null;
    let hostDist = Number.POSITIVE_INFINITY;
    for (const other of drafts) {
      if (other.id === draft.id || !parked.has(other.id)) continue;
      const dist = Math.abs(other.anchorX - draft.anchorX);
      if (dist > NL_GROUP_WINDOW_PX || dist >= hostDist) continue;
      const xs = [...other.xs, ...draft.xs];
      if (!fitsWindow(other.anchorX, xs)) continue;
      host = other;
      hostDist = dist;
    }
    if (!host) {
      draft.lane = 0;
      parked.add(draft.id);
      continue;
    }
    host.names.push(...draft.names);
    host.memberIds.push(...draft.memberIds);
    host.xs.push(...draft.xs);
    const index = drafts.findIndex((row) => row.id === draft.id);
    if (index >= 0) drafts.splice(index, 1);
    tryPlace(host);
    parked.add(host.id);
  }

  const lanesUsed = drafts.length === 0 ? 0 : Math.max(...drafts.map((draft) => draft.lane)) + 1;
  const chipArea =
    lanesUsed === 0 ? 0 : lanesUsed * NL_CHIP_H + Math.max(0, lanesUsed - 1) * NL_CHIP_GAP_PX;
  const nameRoom = NL_REVEAL_BUDGET_PX - NL_RAIL_PX - NL_LABELS_PX;
  const protrusionRoom = Math.max(0, nameRoom - chipArea - (lanesUsed > 0 ? NL_CHIP_GAP_PX : 0));
  let spacing = NL_STACK_PREF_PX;
  let dotSize = NL_DOT_MAX_PX;
  if (maxStack > 0) {
    const fitted = (protrusionRoom + NL_DOT_TOP_IN_RAIL) / maxStack;
    spacing = Math.min(NL_STACK_PREF_PX, Math.max(1, fitted));
    dotSize = Math.min(NL_DOT_MAX_PX, Math.max(NL_DOT_MIN_PX, spacing));
  }
  const protrusion = Math.max(0, maxStack * spacing - NL_DOT_TOP_IN_RAIL);
  const nameSpace = chipArea + (lanesUsed > 0 ? NL_CHIP_GAP_PX : 0) + protrusion;

  const dots: RevealDot[] = placed.map((dot) => {
    const stack = stackOf.get(dot.id) ?? 0;
    const top = nameSpace + NL_DOT_TOP_IN_RAIL - stack * spacing;
    return {
      id: dot.id,
      x: dot.x,
      stack,
      box: {
        left: dot.x - dotSize / 2,
        right: dot.x + dotSize / 2,
        top,
        bottom: top + dotSize,
      },
    };
  });

  const chips: RevealChip[] = drafts.map((draft) => {
    const top = chipArea - (draft.lane + 1) * NL_CHIP_H - draft.lane * NL_CHIP_GAP_PX;
    return {
      id: draft.id,
      text: draft.text,
      fullNames: [...draft.names],
      memberIds: [...draft.memberIds],
      anchorX: draft.anchorX,
      box: {
        left: draft.left,
        right: draft.left + draft.width,
        top,
        bottom: top + NL_CHIP_H,
      },
    };
  });

  const leaders: RevealLeader[] = [];
  for (const chip of chips) {
    const members = dots.filter((dot) => chip.memberIds.includes(dot.id));
    if (members.length === 0) continue;
    const x = Math.min(chip.box.right - 2, Math.max(chip.box.left + 2, chip.anchorX));
    let y1 = chip.box.bottom;
    let y2 = Math.min(...members.map((dot) => dot.box.top));
    for (const other of chips) {
      if (other.id === chip.id) continue;
      if (x <= other.box.left || x >= other.box.right) continue;
      if (other.box.top > y1 && other.box.top < y2) y2 = other.box.top;
    }
    if (y2 > y1 + 1) leaders.push({ x, y1, y2 });
  }

  return {
    width,
    dotSize,
    dots,
    chips,
    leaders,
    nameSpace,
    revealHeight: nameSpace + NL_RAIL_PX + NL_LABELS_PX,
  };
}
