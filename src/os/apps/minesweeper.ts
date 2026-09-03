import type { AppModule } from "@/os/apps/types.ts";
import type { Ctx } from "@/os/context.ts";
import {
  COLS,
  MINES,
  ROWS,
  createBoard,
  flagCount,
  isWon,
  reveal,
  toggleFlag,
  type Board,
} from "@/os/minesweeper-board.ts";

/** One live board per window, keyed by window id. */
const boards = new Map<string, Board>();

/** Pad a counter to the three-digit LED display. */
function leds(n: number): string {
  const clamped = Math.max(-99, Math.min(999, n));
  const sign = clamped < 0 ? "-" : "";
  return sign + String(Math.abs(clamped)).padStart(sign ? 2 : 3, "0");
}

function cellClass(board: Board, i: number): string {
  const cell = board.cells[i]!;
  if (!cell.revealed) return cell.flagged ? "mine_cell is-flagged" : "mine_cell";
  if (cell.mine) return "mine_cell is-revealed is-mine";
  return `mine_cell is-revealed n${cell.adjacent}`;
}

function cellContent(board: Board, i: number): string {
  const cell = board.cells[i]!;
  if (!cell.revealed) {
    return cell.flagged
      ? `<img src="/os/icons/flag.png" alt="Flagged" draggable="false" />`
      : "";
  }
  if (cell.mine) return `<span class="mine_dot"></span>`;
  return cell.adjacent > 0 ? String(cell.adjacent) : "";
}

function gridHtml(board: Board): string {
  return board.cells
    .map(
      (_, i) =>
        `<button type="button" class="${cellClass(board, i)}" data-cell="${i}">${cellContent(board, i)}</button>`,
    )
    .join("");
}

function face(board: Board): string {
  return board.exploded
    ? "/os/icons/dead-face.png"
    : "/os/icons/smiley-face.png";
}

/** Repaint the board in place; cheaper and less jumpy than a full re-render. */
function paint(ctx: Ctx, el: HTMLElement, id: string): void {
  const board = boards.get(id);
  if (!board) return;
  const grid = el.querySelector<HTMLElement>("[data-mine-grid]");
  const counter = el.querySelector<HTMLElement>("[data-mine-count]");
  const faceImg = el.querySelector<HTMLImageElement>("[data-mine-face]");

  if (grid) grid.innerHTML = gridHtml(board);
  if (counter) counter.textContent = leds(board.mines - flagCount(board));
  if (faceImg) faceImg.src = face(board);

  const status = el
    .closest(".window_wrap")
    ?.querySelector<HTMLElement>(".window_status_main");
  if (status) {
    status.textContent = board.exploded
      ? "Boom. Click the face to play again."
      : isWon(board)
        ? "You cleared it."
        : "Left-click to clear, right-click to flag.";
  }
  if (isWon(board)) ctx.toast("Minesweeper cleared!");
}

export const minesweeperApp: AppModule = {
  size: { w: 320, h: 400 },

  html(_ctx, win) {
    const board = createBoard();
    boards.set(win.id, board);
    return `<div class="app_mine">
      <div class="mine_hud">
        <span class="mine_leds" data-mine-count>${leds(MINES)}</span>
        <button type="button" class="mine_face" data-mine-reset aria-label="New game">
          <img src="${face(board)}" alt="" data-mine-face draggable="false" />
        </button>
        <span class="mine_leds" data-mine-timer>000</span>
      </div>
      <div class="mine_grid" data-mine-grid
        style="--mine-cols:${COLS};--mine-rows:${ROWS}">${gridHtml(board)}</div>
    </div>`;
  },

  menus(ctx, el) {
    return [
      {
        label: "Game",
        key: 0,
        items: [
          {
            label: "New",
            action: () =>
              el.querySelector<HTMLButtonElement>("[data-mine-reset]")?.click(),
          },
          {
            label: ctx.state.bestTime
              ? `Best time: ${ctx.state.bestTime}s`
              : "Best time: —",
            action: () => {},
            disabled: true,
          },
        ],
      },
      {
        label: "Help",
        key: 0,
        items: [
          { label: "About Made to Notice", action: () => ctx.openApp("about") },
        ],
      },
    ];
  },

  status() {
    return ["Left-click to clear, right-click to flag.", `${MINES} mines`];
  },

  wire(ctx, el, win) {
    const grid = el.querySelector<HTMLElement>("[data-mine-grid]");
    const timerEl = el.querySelector<HTMLElement>("[data-mine-timer]");
    let seconds = 0;
    let timer: number | undefined;

    const stopTimer = () => {
      window.clearInterval(timer);
      timer = undefined;
    };

    const startTimer = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(() => {
        seconds += 1;
        if (timerEl) timerEl.textContent = leds(seconds);
      }, 1000);
    };

    // The window can close at any time; a stray interval would keep ticking.
    const observer = new MutationObserver(() => {
      if (!el.isConnected) {
        stopTimer();
        boards.delete(win.id);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const finish = (board: Board) => {
      if (!board.exploded && !isWon(board)) return;
      stopTimer();
      if (isWon(board) && (ctx.state.bestTime === null || seconds < ctx.state.bestTime)) {
        ctx.state.bestTime = seconds;
        ctx.persist();
      }
    };

    grid?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
      const board = boards.get(win.id);
      if (!btn || !board || board.exploded || isWon(board)) return;
      startTimer();
      const next = reveal(board, Number(btn.dataset.cell));
      boards.set(win.id, next);
      paint(ctx, el, win.id);
      finish(next);
    });

    grid?.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
      const board = boards.get(win.id);
      if (!btn || !board || board.exploded || isWon(board)) return;
      boards.set(win.id, toggleFlag(board, Number(btn.dataset.cell)));
      paint(ctx, el, win.id);
    });

    el.querySelector("[data-mine-reset]")?.addEventListener("click", () => {
      stopTimer();
      seconds = 0;
      if (timerEl) timerEl.textContent = leds(0);
      boards.set(win.id, createBoard());
      paint(ctx, el, win.id);
    });
  },
};
