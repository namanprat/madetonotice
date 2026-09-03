/**
 * The drag primitive's pure half. The DOM half is verified in a browser; this
 * covers the classification rules that every gesture in the OS depends on.
 *
 *   npm test
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { SLOP, isDrag, slopFor } from "./drag.ts";

const at = (x: number, y: number) => ({ x, y });

test("touch gets a bigger allowance than a mouse", () => {
  assert.equal(slopFor("mouse"), SLOP.mouse);
  assert.equal(slopFor("touch"), SLOP.touch);
  // A stylus shakes like a finger, not like a cursor.
  assert.equal(slopFor("pen"), SLOP.touch);
  assert.equal(slopFor("anything-else"), SLOP.touch);
});

test("a still press is a tap on every pointer type", () => {
  for (const type of ["mouse", "touch", "pen"]) {
    assert.equal(isDrag(at(100, 100), at(100, 100), type), false, type);
  }
});

test("small jitter stays a tap on touch but is a drag on a mouse", () => {
  // 7px: inside the finger threshold, outside the cursor one. This is the case
  // that made ordinary taps register as drags and open nothing.
  const from = at(100, 100);
  const to = at(105, 105); // 7.07px
  assert.equal(isDrag(from, to, "touch"), false, "finger jitter is a tap");
  assert.equal(isDrag(from, to, "mouse"), true, "a mouse that far has dragged");
});

test("real travel is a drag on every pointer type", () => {
  for (const type of ["mouse", "touch", "pen"]) {
    assert.equal(isDrag(at(0, 0), at(60, 60), type), true, type);
  }
});

test("the threshold is a radius, not a per-axis box", () => {
  // The old test was `abs(dx) <= slop && abs(dy) <= slop`, which let a touch
  // travel slop*sqrt(2) diagonally before counting. Guard against a regression.
  const diagonal = SLOP.touch * 0.75; // 9px on each axis => 12.7px of travel
  assert.equal(
    isDrag(at(0, 0), at(diagonal, diagonal), "touch"),
    true,
    "diagonal travel past the radius must count as a drag",
  );
  assert.equal(
    isDrag(at(0, 0), at(SLOP.touch, 0), "touch"),
    false,
    "travel exactly at the radius is still a tap",
  );
});

test("direction does not matter", () => {
  for (const [dx, dy] of [
    [-40, 0],
    [0, -40],
    [-30, -30],
    [30, -30],
  ]) {
    assert.equal(isDrag(at(200, 200), at(200 + dx, 200 + dy), "touch"), true);
  }
});
