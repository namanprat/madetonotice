/**
 * The one pointer gesture in the OS.
 *
 * Icons, window moves, resize grips and marquee select all route through this.
 * Before it they were four divergent hand-rolled implementations, and the ways
 * they differed were the bugs: none guarded multi-touch, two forgot
 * `pointercancel` and leaked listeners forever, one had no movement threshold
 * at all, and the icon handler had grown five interacting flags and three
 * separate paths that could open a file.
 *
 * Everything here is the boring correct version of what each of them was
 * approximating. Plain buttons are deliberately NOT routed through this — a
 * `<button>` with a `click` listener already works on every input device.
 */

/**
 * Travel before a press becomes a drag rather than a tap.
 *
 * A mouse cursor sits still; a fingertip never does. Judging touch by the mouse
 * threshold classified ordinary taps as drags, which is why they opened
 * nothing.
 */
export const SLOP = { mouse: 4, touch: 12 } as const;

/** Long-press duration. Below the platform's own (~500-800ms) so ours wins. */
export const LONG_MS = 450;

export type DragHandlers = {
  /**
   * Decide at pointerdown whether this element wants the gesture at all.
   *
   * Needed because a handler can sit on an ancestor: the marquee lives on the
   * desktop surface, which contains every icon. Without this the surface would
   * latch and capture the same pointer an icon was already dragging with, and
   * capture retargets moves away from the icon — the drag would die on contact.
   */
  shouldStart?: (e: PointerEvent) => boolean;
  onStart?: (e: PointerEvent) => void;
  /** Only fires once the gesture has passed the slop threshold. */
  onMove?: (e: PointerEvent) => void;
  /** The gesture moved and has now ended. */
  onEnd?: (e: PointerEvent) => void;
  /** The gesture ended without ever moving — a click or a tap. */
  onTap?: (e: PointerEvent) => void;
  /** Held still past `LONG_MS`. Touch and pen only; mouse has right-click. */
  onLongPress?: (e: PointerEvent) => void;
};

export function slopFor(pointerType: string): number {
  return pointerType === "mouse" ? SLOP.mouse : SLOP.touch;
}

/** True once the pointer has travelled far enough to count as a drag. */
export function isDrag(
  from: { x: number; y: number },
  to: { x: number; y: number },
  pointerType: string,
): boolean {
  // Distance, not a per-axis box: the old `Math.abs` test on each axis
  // separately allowed a 39.6px diagonal before touch registered as a drag.
  return Math.hypot(to.x - from.x, to.y - from.y) > slopFor(pointerType);
}

export function onDrag(el: HTMLElement, h: DragHandlers): void {
  /**
   * The pointer this element is currently following, or null when idle.
   * Latching it is what makes a second finger — or a palm — a no-op instead of
   * a second gesture stacking its own listeners on top of the first.
   */
  let activeId: number | null = null;

  el.addEventListener("pointerdown", (e) => {
    if (activeId !== null) return;
    if (!e.isPrimary) return;
    // Mouse: primary button only. Right-click is contextmenu's job.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (h.shouldStart && !h.shouldStart(e)) return;

    activeId = e.pointerId;
    const from = { x: e.clientX, y: e.clientY };
    let moved = false;
    let longFired = false;
    let longTimer: number | undefined;

    // Capture so the gesture survives leaving the element — over a window, over
    // an embedded frame, past the viewport edge.
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some pointers refuse capture; the listeners below still work.
    }

    const finish = () => {
      window.clearTimeout(longTimer);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      try {
        el.releasePointerCapture(activeId!);
      } catch {
        // Already released, or never captured.
      }
      activeId = null;
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== activeId) return;
      if (!moved) {
        if (!isDrag(from, { x: ev.clientX, y: ev.clientY }, ev.pointerType)) {
          return;
        }
        moved = true;
        window.clearTimeout(longTimer);
        h.onStart?.(ev);
      }
      h.onMove?.(ev);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== activeId) return;
      finish();
      if (moved) h.onEnd?.(ev);
      // A long-press already acted; its release is not also a tap.
      else if (!longFired) h.onTap?.(ev);
    };

    // Cancel is routine on touch — a scroll takeover or a system gesture. The
    // two implementations that ignored it leaked their listeners permanently.
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== activeId) return;
      finish();
      if (moved) h.onEnd?.(ev);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);

    if (h.onLongPress && e.pointerType !== "mouse") {
      longTimer = window.setTimeout(() => {
        if (moved) return;
        longFired = true;
        h.onLongPress!(e);
      }, LONG_MS);
    }
  });

  /**
   * Suppress the native long-press menu on touch. Ours fires first at
   * `LONG_MS`; letting the platform's land too reopened the menu at different
   * coordinates.
   */
  if (h.onLongPress) {
    el.addEventListener("contextmenu", (e) => {
      if ((e as PointerEvent).pointerType === "mouse") return;
      e.preventDefault();
    });
  }
}
