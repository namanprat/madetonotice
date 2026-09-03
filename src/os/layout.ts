/** Pure desktop-icon geometry. No DOM — this is the half that gets tested. */

export type Point = { x: number; y: number };

export type Surface = {
  /** Usable desktop width in rem. */
  w: number;
  /** Usable desktop height in rem, taskbar already subtracted. */
  h: number;
};

export type Cell = {
  /** Column pitch in rem: icon box plus gutter. */
  w: number;
  /** Row pitch in rem. */
  h: number;
};

/** Desktop margin in rem, matching `.desktop_icons` padding. */
const MARGIN = 0.5;

/** Drag snap grid in rem — the source snaps to a 10px grid at a 16px root. */
export const SNAP = 0.625;

/**
 * Lay icons out column-first: fill a column top to bottom, then wrap to the
 * next column, the way Windows 95 arranges a desktop.
 *
 * The reference project gets this from `flex-direction: column; flex-wrap:
 * wrap` on a fixed-height container. We position absolutely instead — free
 * placement and drag-to-bin both need real coordinates — so the wrap is
 * computed here.
 *
 * Guarantees every returned point sits inside `surface`, which is what keeps
 * icons reachable on a narrow phone.
 */
export function packIcons(
  count: number,
  surface: Surface,
  cell: Cell,
): Point[] {
  const rows = Math.max(1, Math.floor((surface.h - MARGIN) / cell.h));
  const cols = Math.max(1, Math.floor((surface.w - MARGIN) / cell.w));
  const out: Point[] = [];

  for (let i = 0; i < count; i += 1) {
    // Past a full grid, wrap back over the first column rather than marching
    // off the right edge. Overlapping beats unreachable.
    const slot = i % (rows * cols);
    const col = Math.floor(slot / rows);
    const row = slot % rows;
    out.push({ x: MARGIN + col * cell.w, y: MARGIN + row * cell.h });
  }

  return out;
}

/** Snap a dragged position to the icon grid and clamp it inside the desktop. */
export function snapToSurface(
  point: Point,
  surface: Surface,
  cell: Cell,
): Point {
  const snap = (n: number) => Math.round(n / SNAP) * SNAP;
  return {
    x: bound(snap(point.x), surface.w - cell.w),
    y: bound(snap(point.y), surface.h - cell.h),
  };
}

/**
 * Clamp into `[0, max]`, but only when `max` is a real bound.
 *
 * A surface can measure zero — a hidden tab, a window collapsed to nothing,
 * or a read taken before layout has run — which makes `max` negative. Clamping
 * to a negative bound pins every icon to the origin, so a drag looks like it
 * does nothing. Dropping the upper bound is much better than teleporting.
 */
function bound(n: number, max: number): number {
  return max > 0 ? clamp(n, 0, max) : Math.max(0, n);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
