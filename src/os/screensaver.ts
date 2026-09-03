import type { Ctx } from "@/os/context.ts";

/**
 * Idle screensaver, after Win95's "Scrolling Marquee" and "Flying Windows".
 *
 * The most on-brand surface on the site: a screensaver exists for no reason
 * other than to be noticed.
 *
 * ponytail: one rAF loop driving transforms only, so it stays on the compositor.
 * Ceiling is the fixed star count below; if it ever needs depth sorting or
 * thousands of marks, move it to a canvas.
 */

const STARS = 48;

let raf = 0;
let idleTimer: number | undefined;
let active = false;

/** Pixels per second the marquee travels. */
const MARQUEE_X = 180;
const MARQUEE_Y = 21;
/** How much of the way to the viewer a mark travels per second. */
const STAR_SPEED = 0.36;

/**
 * Run a loop against elapsed time rather than frame count, so the motion
 * reads the same on a 60Hz panel, a 120Hz one, and a throttled background tab.
 */
function loop(tick: (dt: number) => void): () => void {
  let last = performance.now();
  const frame = (now: number) => {
    // A backgrounded tab can hand back a huge gap; clamp so nothing teleports.
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tick(dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

function buildMarquee(host: HTMLElement, text: string): () => void {
  host.innerHTML = `<div class="saver_marquee"><span>${text}</span></div>`;
  const band = host.querySelector<HTMLElement>(".saver_marquee")!;
  const span = band.querySelector<HTMLElement>("span")!;

  let x = host.clientWidth;
  let y = host.clientHeight / 2;
  let dir = 1;

  return loop((dt) => {
    const w = span.offsetWidth;
    x -= MARQUEE_X * dt;
    if (x < -w) x = host.clientWidth;
    // Drift vertically and bounce, the way the original wanders the screen.
    y += MARQUEE_Y * dir * dt;
    if (y < 40 || y > host.clientHeight - 80) dir = -dir;
    band.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
}

function buildStars(host: HTMLElement): () => void {
  const field = document.createElement("div");
  field.className = "saver_field";
  host.appendChild(field);

  const w = host.clientWidth;
  const h = host.clientHeight;
  const marks = Array.from({ length: STARS }, () => {
    const el = document.createElement("span");
    el.className = "saver_mark";
    field.appendChild(el);
    return {
      el,
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
    };
  });

  return loop((dt) => {
    for (const m of marks) {
      m.z -= STAR_SPEED * dt;
      if (m.z <= 0.02) {
        m.x = Math.random() * 2 - 1;
        m.y = Math.random() * 2 - 1;
        m.z = 1;
      }
      const scale = 1 / m.z;
      const px = w / 2 + ((m.x * w) / 2) * scale * 0.5;
      const py = h / 2 + ((m.y * h) / 2) * scale * 0.5;
      m.el.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${Math.min(scale * 0.4, 3)})`;
      m.el.style.opacity = String(Math.min(1, 1.2 - m.z));
    }
  });
}

export function stopScreensaver(ctx: Ctx): void {
  if (!active) return;
  active = false;
  cancelAnimationFrame(raf);
  const host = ctx.el.saver;
  if (!host) return;
  host.classList.remove("is-active");
  host.hidden = true;
  host.replaceChildren();
}

export function startScreensaver(ctx: Ctx): void {
  const host = ctx.el.saver;
  if (!host || active) return;
  active = true;
  host.hidden = false;
  host.classList.add("is-active");
  host.replaceChildren();

  if (ctx.state.saver === "stars") {
    buildStars(host);
  } else {
    buildMarquee(host, "Made to Notice");
  }
}

/**
 * Every input that counts as "still here".
 *
 * `pointermove` alone is a mouse-only signal: a pointing device fires it
 * constantly, so the timer never elapses. A touch device fires it only mid-
 * gesture, so reading a window for the delay would raise the screensaver and
 * the next tap would be spent dismissing it — which reads as the buttons
 * being dead. The touch and focus events are what keep the two in step.
 */
const WAKE_EVENTS = [
  "pointerdown",
  "pointermove",
  "touchstart",
  "touchmove",
  "click",
  "keydown",
  "wheel",
  "focusin",
] as const;

/**
 * Arm the idle timer. Any real input resets it; while the saver is up, the
 * first input dismisses it instead.
 */
export function wireScreensaver(ctx: Ctx): void {
  const reset = () => {
    if (active) {
      stopScreensaver(ctx);
      return;
    }
    window.clearTimeout(idleTimer);
    if (ctx.state.saver === "off") return;
    idleTimer = window.setTimeout(
      () => startScreensaver(ctx),
      ctx.state.saverDelay * 1000,
    );
  };

  for (const evt of WAKE_EVENTS) {
    window.addEventListener(evt, reset, { passive: true, capture: true });
  }

  // Re-arm when the setting changes, and on boot.
  ctx.rearmScreensaver = reset;
  reset();
}
