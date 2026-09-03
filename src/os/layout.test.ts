/**
 * The two pieces of non-trivial pure logic in the OS: desktop icon packing and
 * the Minesweeper board. Everything else is DOM wiring.
 *
 *   node --test --experimental-strip-types src/os/layout.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { packIcons, snapToSurface, type Cell } from "./layout.ts";
import {
  createBoard,
  isWon,
  neighbourIndices,
  placeMines,
  reveal,
  toggleFlag,
} from "./minesweeper-board.ts";

/** Icon cell pitch at the default icon size, in rem. */
const CELL: Cell = { w: 4.25, h: 4.4375 };

/** Viewports the site actually has to survive, as rem at a 16px root. */
const VIEWPORTS = [
  { name: "phone 375px", w: 375 / 16, h: (812 - 35) / 16 },
  { name: "tablet 768px", w: 768 / 16, h: (1024 - 35) / 16 },
  { name: "desktop 1440px", w: 1440 / 16, h: (900 - 35) / 16 },
];

test("packIcons keeps every icon inside the surface", () => {
  for (const vp of VIEWPORTS) {
    const points = packIcons(24, vp, CELL);
    assert.equal(points.length, 24, `${vp.name}: returns one point per icon`);

    for (const [i, p] of points.entries()) {
      assert.ok(
        p.x >= 0 && p.x + CELL.w <= vp.w + 0.001,
        `${vp.name}: icon ${i} x=${p.x} escapes width ${vp.w}`,
      );
      assert.ok(
        p.y >= 0 && p.y + CELL.h <= vp.h + 0.001,
        `${vp.name}: icon ${i} y=${p.y} escapes height ${vp.h}`,
      );
    }
  }
});

test("packIcons fills a column before starting the next", () => {
  // 22rem of height at a 4.4375rem pitch, less the 0.5rem margin, is 4 rows.
  const surface = { w: 40, h: 22 };
  const points = packIcons(6, surface, CELL);

  const firstColumn = points.slice(0, 4);
  assert.ok(
    firstColumn.every((p) => p.x === points[0]!.x),
    "first four icons share a column",
  );
  assert.deepEqual(
    firstColumn.map((p) => p.y),
    [0.5, 0.5 + CELL.h, 0.5 + CELL.h * 2, 0.5 + CELL.h * 3],
    "they step down by exactly one row pitch",
  );
  assert.ok(
    points[4]!.x > points[0]!.x,
    "the fifth icon wraps to a new column",
  );
  assert.equal(points[4]!.y, 0.5, "and starts back at the top");
});

test("snapToSurface clamps a drag inside the desktop", () => {
  const surface = { w: 20, h: 15 };
  assert.deepEqual(
    snapToSurface({ x: -99, y: -99 }, surface, CELL),
    { x: 0, y: 0 },
    "past the top-left corner",
  );
  const far = snapToSurface({ x: 999, y: 999 }, surface, CELL);
  assert.ok(far.x + CELL.w <= surface.w + 0.001, "past the right edge");
  assert.ok(far.y + CELL.h <= surface.h + 0.001, "past the bottom edge");
});

test("a surface that measures zero does not pin icons to the origin", () => {
  // A hidden tab, or a read taken before layout, reports 0x0. Clamping to the
  // resulting negative bound used to snap every drag back to the corner, so
  // the icon appeared not to move at all.
  for (const surface of [
    { w: 0, h: 0 },
    { w: 2, h: 2 },
  ]) {
    const pos = snapToSurface({ x: 12, y: 9 }, surface, CELL);
    assert.ok(
      pos.x > 0 && pos.y > 0,
      `surface ${surface.w}x${surface.h} collapsed the drag to ${pos.x},${pos.y}`,
    );
  }

  // Negative input is still floored at zero, degenerate surface or not.
  assert.deepEqual(snapToSurface({ x: -5, y: -5 }, { w: 0, h: 0 }, CELL), {
    x: 0,
    y: 0,
  });
});

test("neighbourIndices does not wrap around board edges", () => {
  // Corner cell 0 on a 9x9 board has exactly three neighbours.
  assert.deepEqual(
    neighbourIndices(0, 9, 9).sort((a, b) => a - b),
    [1, 9, 10],
  );
  // A middle cell has all eight.
  assert.equal(neighbourIndices(40, 9, 9).length, 8);
});

test("placeMines lays exactly the requested count and spares the first click", () => {
  const board = createBoard();
  // Deterministic "random" so a failure is reproducible.
  let seed = 7;
  const rng = () =>
    (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  const seeded = placeMines(board, 40, rng);
  assert.equal(
    seeded.cells.filter((c) => c.mine).length,
    10,
    "mine count is exact",
  );

  const safe = [40, ...neighbourIndices(40, 9, 9)];
  for (const i of safe) {
    assert.equal(seeded.cells[i]!.mine, false, `cell ${i} is kept clear`);
  }
});

test("first click is never a mine", () => {
  for (let i = 0; i < 200; i += 1) {
    const at = i % 81;
    const board = reveal(createBoard(), at);
    assert.equal(board.exploded, false, `opening on cell ${at} exploded`);
    assert.equal(
      board.cells[at]!.revealed,
      true,
      `cell ${at} was not revealed`,
    );
  }
});

test("adjacent counts match the mines actually placed", () => {
  const board = reveal(createBoard(), 40);
  for (const [i, cell] of board.cells.entries()) {
    const actual = neighbourIndices(i, 9, 9).filter(
      (n) => board.cells[n]!.mine,
    ).length;
    assert.equal(cell.adjacent, actual, `cell ${i} has the wrong count`);
  }
});

test("flood fill stops at numbered cells and clears a known board", () => {
  // A hand-built 3x3 with one mine in the corner. Revealing the opposite
  // corner must open every cell except the mine, and win.
  const board = createBoard(3, 3, 1);
  const seeded = {
    ...board,
    seeded: true,
    cells: board.cells.map((c, i) => ({ ...c, mine: i === 0 })),
  };
  const counted = {
    ...seeded,
    cells: seeded.cells.map((c, i) => ({
      ...c,
      adjacent: neighbourIndices(i, 3, 3).filter((n) => seeded.cells[n]!.mine)
        .length,
    })),
  };

  const after = reveal(counted, 8);
  assert.equal(after.exploded, false);
  assert.equal(after.cells[0]!.revealed, false, "the mine stays covered");
  assert.equal(
    after.cells.filter((c) => c.revealed).length,
    8,
    "every safe cell opens",
  );
  assert.equal(isWon(after), true, "clearing all safe cells wins");
});

test("revealing a mine ends the game and uncovers the rest", () => {
  const board = createBoard(3, 3, 1);
  const seeded = {
    ...board,
    seeded: true,
    cells: board.cells.map((c, i) => ({ ...c, mine: i === 0, adjacent: 0 })),
  };

  const after = reveal(seeded, 0);
  assert.equal(after.exploded, true);
  assert.equal(after.cells[0]!.revealed, true, "the struck mine shows");
  assert.equal(isWon(after), false, "an exploded board is never won");
});

test("a flagged cell cannot be revealed", () => {
  const board = reveal(createBoard(), 40);
  const covered = board.cells.findIndex((c) => !c.revealed);
  const flagged = toggleFlag(board, covered);
  const after = reveal(flagged, covered);
  assert.equal(
    after.cells[covered]!.revealed,
    false,
    "flagging protects against a misclick",
  );
});
