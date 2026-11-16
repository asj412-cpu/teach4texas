/** Host name chips. 24px type on navy clears WCAG AA against the chip, not the yellow line. */
export const NL_NAME_FG = "#ffffff";
export const NL_NAME_BG = "#07111f";
export const NL_NAME_FONT_PX = 24;

/** Matches the track CSS at a 16px root. */
export const NL_DOT_MIN_PX = 8;
export const NL_DOT_MAX_PX = 22;
export const NL_STACK_PREF_PX = 10;
export const NL_BIN_PX = 14;
export const NL_DOT_TOP_IN_RAIL = 34.4;
export const NL_LINE_BOTTOM_IN_RAIL = 50;
export const NL_RAIL_PX = 88;
export const NL_LABELS_PX = 40;
export const NL_CHIP_H = 32;
export const NL_CHIP_GAP_PX = 4;
/** Names on one chip stay inside this window of the anchor. */
export const NL_GROUP_WINDOW_PX = 48;

const NL_CHAR_PX = 17;
const NL_CHIP_PAD_X = 12;
const NL_MAX_LANES = 8;

/** Header and question on a 1366-wide projector, before the track. */
export const NL_CHROME_DESKTOP_PX = 300;
/** Exact/Within plus NEXT, REVEAL, and End. */
export const NL_CONTROLS_PX = 160;
export const NL_DESKTOP_VIEWPORT_PX = 768;
/** Wrapped header plus the question on a phone. */
export const NL_CHROME_MOBILE_PX = 500;
export const NL_MOBILE_VIEWPORT_PX = 812;

export const NL_HOST_CHROME_PX = NL_CHROME_DESKTOP_PX;
export const NL_VIEWPORT_H_PX = NL_DESKTOP_VIEWPORT_PX;
export const NL_REVEAL_BUDGET_PX =
  NL_DESKTOP_VIEWPORT_PX - NL_CHROME_DESKTOP_PX - NL_CONTROLS_PX;

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
  aboveSpace: number;
  belowSpace: number;
  /** @deprecated Use aboveSpace. Kept so callers reading the old name still work. */
  nameSpace: number;
  revealHeight: number;
};

export function hostPageHeight(layout: NumberLineRevealLayout): number {
  return NL_CHROME_DESKTOP_PX + layout.revealHeight + NL_CONTROLS_PX;
}

/** Y of the line's bottom edge, measured from the top of the host page. */
export function lineFoldY(layout: NumberLineRevealLayout, chromeAbove: number): number {
  return chromeAbove + layout.aboveSpace + NL_LINE_BOTTOM_IN_RAIL;
}

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

export function truncateName(name: string, max = 10): string {
  if (name.length <= max) return name;
  return `${name.slice(0, Math.max(1, max - 1))}…`;
}

/** At least one name, then +N. Long names ellipsize at about 10 characters. */
export function formatChipText(names: string[]): string {
  const clean = names.filter((name) => name.length > 0);
  if (clean.length === 0) return "";
  const first = truncateName(clean[0]!, 10);
  if (clean.length === 1) return first;
  return `${first} +${clean.length - 1}`;
}

/** @deprecated Use formatChipText. Kept for older call sites. */
export function chipLabel(names: string[]): string {
  return formatChipText(names);
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function valueKey(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

function clampLeft(center: number, boxWidth: number, rail: number): number {
  if (boxWidth >= rail) return 0;
  return Math.max(0, Math.min(rail - boxWidth, center - boxWidth / 2));
}

type Group = {
  id: string;
  anchorX: number;
  ids: string[];
  names: string[];
  stacks: number[];
};

type Draft = {
  id: string;
  names: string[];
  memberIds: string[];
  anchorX: number;
  left: number;
  width: number;
  lane: number;
  text: string;
};

/**
 * One dot per placement. Only identical values, or values in the same pixel,
 * share a vertical stack. Each stack's chip shows a name plus +N.
 * Lanes alternate above and below the line so the controls stay on a 1366×768 screen.
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

  const bins = new Map<number, typeof placed>();
  for (const dot of placed) {
    const bin = Math.round(dot.x / NL_BIN_PX);
    const list = bins.get(bin) ?? [];
    list.push(dot);
    bins.set(bin, list);
  }

  const groups: Group[] = [];
  const drawX = new Map<string, number>();
  const stackOf = new Map<string, number>();
  let maxStack = 0;

  for (const bin of [...bins.keys()].sort((a, b) => a - b)) {
    const dots = bins.get(bin)!;
    const byValue = new Map<string, typeof dots>();
    for (const dot of dots) {
      const key = dot.value == null ? `id:${dot.id}` : `v:${valueKey(dot.value)}`;
      const list = byValue.get(key) ?? [];
      list.push(dot);
      byValue.set(key, list);
    }
    let shift = 0;
    for (const list of byValue.values()) {
      const anchor = list[0]!.x + shift;
      shift += byValue.size > 1 ? NL_BIN_PX : 0;
      const ids = list.map((dot) => dot.id);
      ids.forEach((id, index) => {
        drawX.set(id, anchor);
        stackOf.set(id, index);
        maxStack = Math.max(maxStack, index);
      });
      groups.push({
        id: list[0]!.id,
        anchorX: anchor,
        ids,
        names: list.flatMap((dot) => (dot.name ? [dot.name] : [])),
        stacks: ids.map((_, index) => index),
      });
    }
  }

  const separated = [...groups].sort((a, b) => a.anchorX - b.anchorX || a.id.localeCompare(b.id));
  let lastAnchor = Number.NEGATIVE_INFINITY;
  for (const group of separated) {
    if (group.anchorX - lastAnchor < NL_BIN_PX) {
      const next = lastAnchor + NL_BIN_PX;
      const delta = next - group.anchorX;
      group.anchorX = next;
      for (const id of group.ids) drawX.set(id, (drawX.get(id) ?? next) + delta);
    }
    lastAnchor = group.anchorX;
  }

  const chipGroups: Group[] = [];
  for (const group of groups) {
    const host = chipGroups[chipGroups.length - 1];
    const hostXs = host ? host.ids.map((id) => drawX.get(id) ?? host.anchorX) : [];
    const nextXs = group.ids.map((id) => drawX.get(id) ?? group.anchorX);
    const inside =
      host != null &&
      host.names.length > 0 &&
      group.names.length > 0 &&
      [...hostXs, ...nextXs].every((x) => Math.abs(x - host.anchorX) <= NL_GROUP_WINDOW_PX);
    if (host && inside) {
      host.ids.push(...group.ids);
      host.names.push(...group.names);
      continue;
    }
    chipGroups.push({
      id: group.id,
      anchorX: group.anchorX,
      ids: [...group.ids],
      names: [...group.names],
      stacks: group.stacks,
    });
  }

  const drafts: Draft[] = [];
  for (const group of chipGroups) {
    if (group.names.length === 0) continue;
    const text = formatChipText(group.names);
    const chip = chipWidthPx(text, width);
    drafts.push({
      id: group.id,
      names: group.names,
      memberIds: [...group.ids],
      anchorX: group.anchorX,
      width: chip,
      left: clampLeft(group.anchorX, chip, width),
      lane: 0,
      text,
    });
  }

  const parked = new Set<string>();

  function hits(draft: Draft, lane: number): boolean {
    const right = draft.left + draft.width;
    for (const other of drafts) {
      if (other.id === draft.id || !parked.has(other.id) || other.lane !== lane) continue;
      if (
        draft.left < other.left + other.width + NL_CHIP_GAP_PX &&
        other.left < right + NL_CHIP_GAP_PX
      ) {
        return true;
      }
    }
    return false;
  }

  function tryPlace(draft: Draft, maxLanes: number): boolean {
    draft.left = clampLeft(draft.anchorX, draft.width, width);
    for (let lane = 0; lane < maxLanes; lane++) {
      if (!hits(draft, lane)) {
        draft.lane = lane;
        return true;
      }
    }
    for (let shift = 4; shift <= NL_BIN_PX; shift += 4) {
      for (const sign of [-1, 1]) {
        draft.left = clampLeft(draft.anchorX + sign * shift, draft.width, width);
        for (let lane = 0; lane < maxLanes; lane++) {
          if (!hits(draft, lane)) {
            draft.lane = lane;
            return true;
          }
        }
      }
    }
    draft.left = clampLeft(draft.anchorX, draft.width, width);
    return false;
  }

  const pending = [...drafts].sort((a, b) => a.anchorX - b.anchorX || a.id.localeCompare(b.id));
  let laneCap = 1;
  const pack = (maxLanes: number) => {
    parked.clear();
    for (const draft of pending) {
      if (!tryPlace(draft, maxLanes)) return false;
      parked.add(draft.id);
    }
    return true;
  };
  while (laneCap < NL_MAX_LANES && !pack(laneCap)) laneCap += 1;
  pack(laneCap);

  let aboveRows = 0;
  let belowRows = 0;
  for (const draft of drafts) {
    const row = Math.floor(draft.lane / 2) + 1;
    if (draft.lane % 2 === 0) aboveRows = Math.max(aboveRows, row);
    else belowRows = Math.max(belowRows, row);
  }

  const aboveChip =
    aboveRows === 0 ? 0 : aboveRows * NL_CHIP_H + Math.max(0, aboveRows - 1) * NL_CHIP_GAP_PX;
  const belowSpace =
    belowRows === 0 ? 0 : belowRows * NL_CHIP_H + Math.max(0, belowRows - 1) * NL_CHIP_GAP_PX;

  const chipBlock = aboveChip + (aboveRows > 0 ? NL_CHIP_GAP_PX : 0) + belowSpace;
  const pageRoom = Math.max(
    0,
    NL_DESKTOP_VIEWPORT_PX -
      NL_CHROME_DESKTOP_PX -
      NL_CONTROLS_PX -
      NL_RAIL_PX -
      NL_LABELS_PX -
      chipBlock,
  );
  const mobileRoom = Math.max(
    0,
    NL_MOBILE_VIEWPORT_PX -
      NL_CHROME_MOBILE_PX -
      NL_LINE_BOTTOM_IN_RAIL -
      aboveChip -
      (aboveRows > 0 ? NL_CHIP_GAP_PX : 0),
  );
  const protrusionRoom = Math.min(pageRoom, mobileRoom);

  let spacing = NL_STACK_PREF_PX;
  let dotSize = NL_DOT_MAX_PX;
  if (maxStack > 0) {
    const fitted = (protrusionRoom + NL_DOT_TOP_IN_RAIL) / maxStack;
    spacing = Math.min(NL_STACK_PREF_PX, Math.max(2, fitted));
    dotSize = Math.min(NL_DOT_MAX_PX, Math.max(NL_DOT_MIN_PX, spacing));
  }
  const protrusion = Math.max(0, maxStack * spacing - NL_DOT_TOP_IN_RAIL);
  const aboveSpace = aboveChip + (aboveRows > 0 ? NL_CHIP_GAP_PX : 0) + protrusion;
  const belowStart = aboveSpace + NL_RAIL_PX + NL_LABELS_PX;

  const dots: RevealDot[] = placed.map((dot) => {
    const stack = stackOf.get(dot.id) ?? 0;
    const x = drawXOr(dot.id, dot.x);
    const top = aboveSpace + NL_DOT_TOP_IN_RAIL - stack * spacing;
    return {
      id: dot.id,
      x,
      stack,
      box: {
        left: x - dotSize / 2,
        right: x + dotSize / 2,
        top,
        bottom: top + dotSize,
      },
    };
  });

  function drawXOr(id: string, fallback: number) {
    return drawX.get(id) ?? fallback;
  }

  const chips: RevealChip[] = drafts.map((draft) => {
    const row = Math.floor(draft.lane / 2);
    const above = draft.lane % 2 === 0;
    const top = above
      ? aboveChip - (row + 1) * NL_CHIP_H - row * NL_CHIP_GAP_PX
      : belowStart + row * (NL_CHIP_H + NL_CHIP_GAP_PX);
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
    const above = chip.box.bottom <= aboveSpace + 1;
    let y1 = above ? chip.box.bottom : Math.min(...members.map((dot) => dot.box.bottom));
    let y2 = above ? Math.min(...members.map((dot) => dot.box.top)) : chip.box.top;
    if (y2 < y1) [y1, y2] = [y2, y1];
    for (const other of chips) {
      if (other.id === chip.id) continue;
      if (x <= other.box.left || x >= other.box.right) continue;
      if (other.box.top >= y1 && other.box.top < y2) y2 = other.box.top;
      if (other.box.bottom > y1 && other.box.bottom <= y2) y1 = other.box.bottom;
    }
    if (y2 > y1 + 1) leaders.push({ x, y1, y2 });
  }

  const revealHeight = aboveSpace + NL_RAIL_PX + NL_LABELS_PX + belowSpace;
  return {
    width,
    dotSize,
    dots,
    chips,
    leaders,
    aboveSpace,
    belowSpace,
    nameSpace: aboveSpace,
    revealHeight,
  };
}
