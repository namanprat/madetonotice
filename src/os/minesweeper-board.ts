/** Pure Minesweeper rules. No DOM — this is the half that gets tested. */

export type Cell = {
  mine: boolean;
  /** Mines in the eight surrounding cells. */
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

export type Board = {
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[];
  /** Mines are placed on the first click, so the first click is never fatal. */
  seeded: boolean;
  exploded: boolean;
};

export const ROWS = 9;
export const COLS = 9;
export const MINES = 10;

function emptyCell(): Cell {
  return { mine: false, adjacent: 0, revealed: false, flagged: false };
}

export function createBoard(
  rows = ROWS,
  cols = COLS,
  mines = MINES,
): Board {
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: rows * cols }, emptyCell),
    seeded: false,
    exploded: false,
  };
}

export function neighbourIndices(
  index: number,
  rows: number,
  cols: number,
): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const out: number[] = [];

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      out.push(r * cols + c);
    }
  }

  return out;
}

/**
 * Scatter mines, keeping `safeIndex` and its neighbours clear so the opening
 * click always opens a region rather than ending the game.
 */
export function placeMines(
  board: Board,
  safeIndex: number,
  random: () => number = Math.random,
): Board {
  const forbidden = new Set([
    safeIndex,
    ...neighbourIndices(safeIndex, board.rows, board.cols),
  ]);
  const total = board.rows * board.cols;
  const candidates = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !forbidden.has(i),
  );

  // Partial Fisher-Yates: only the first `mines` slots need to be correct.
  const count = Math.min(board.mines, candidates.length);
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  const mined = new Set(candidates.slice(0, count));

  const cells = board.cells.map((cell, i) => ({
    ...cell,
    mine: mined.has(i),
  }));

  return {
    ...board,
    seeded: true,
    cells: cells.map((cell, i) => ({
      ...cell,
      adjacent: neighbourIndices(i, board.rows, board.cols).filter(
        (n) => cells[n]!.mine,
      ).length,
    })),
  };
}

/**
 * Reveal a cell, flooding outward through the blank region it touches.
 * Revealing a mine sets `exploded` and uncovers every mine.
 */
export function reveal(board: Board, index: number): Board {
  const start = board.cells[index];
  if (!start || start.revealed || start.flagged) return board;

  const seeded = board.seeded ? board : placeMines(board, index);
  const cells = seeded.cells.map((c) => ({ ...c }));

  if (cells[index]!.mine) {
    return {
      ...seeded,
      exploded: true,
      cells: cells.map((c) => (c.mine ? { ...c, revealed: true } : c)),
    };
  }

  const queue = [index];
  while (queue.length > 0) {
    const at = queue.pop()!;
    const cell = cells[at]!;
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent !== 0) continue;
    for (const n of neighbourIndices(at, seeded.rows, seeded.cols)) {
      if (!cells[n]!.revealed) queue.push(n);
    }
  }

  return { ...seeded, cells };
}

export function toggleFlag(board: Board, index: number): Board {
  const cell = board.cells[index];
  if (!cell || cell.revealed) return board;
  return {
    ...board,
    cells: board.cells.map((c, i) =>
      i === index ? { ...c, flagged: !c.flagged } : c,
    ),
  };
}

/** Won once every cell that is not a mine has been revealed. */
export function isWon(board: Board): boolean {
  if (board.exploded || !board.seeded) return false;
  return board.cells.every((c) => c.mine || c.revealed);
}

export function flagCount(board: Board): number {
  return board.cells.filter((c) => c.flagged).length;
}
