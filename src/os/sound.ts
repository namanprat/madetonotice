/**
 * System sounds, synthesised rather than shipped.
 *
 * A period sound set would be a handful of WAVs; these are a few oscillators
 * instead, which costs no payload and cannot fail to load. Everything is
 * opt-in — nothing plays until the visitor unmutes from the tray, which also
 * satisfies the browser's autoplay rules, since that click is the gesture
 * that lets the audio context start.
 */

export type SoundName = "startup" | "notice" | "error" | "bin" | "click";

type Note = {
  /** Hz. */
  freq: number;
  /** Seconds from the start of the cue. */
  at: number;
  /** Seconds. */
  hold: number;
  type?: OscillatorType;
  gain?: number;
};

/** Short, dry cues — a system sound that outstays its welcome is a bug. */
const CUES: Record<SoundName, Note[]> = {
  // A rising four-note figure, in the spirit of a startup chime.
  startup: [
    { freq: 587.33, at: 0, hold: 0.34, type: "triangle" },
    { freq: 783.99, at: 0.16, hold: 0.34, type: "triangle" },
    { freq: 880.0, at: 0.32, hold: 0.36, type: "triangle" },
    { freq: 1174.66, at: 0.48, hold: 0.55, type: "triangle", gain: 0.5 },
  ],
  notice: [
    { freq: 1046.5, at: 0, hold: 0.1 },
    { freq: 1396.91, at: 0.07, hold: 0.22 },
  ],
  error: [
    { freq: 261.63, at: 0, hold: 0.22, type: "square", gain: 0.28 },
    { freq: 196.0, at: 0.14, hold: 0.3, type: "square", gain: 0.28 },
  ],
  bin: [
    { freq: 392.0, at: 0, hold: 0.09, type: "sawtooth", gain: 0.25 },
    { freq: 261.63, at: 0.08, hold: 0.16, type: "sawtooth", gain: 0.25 },
  ],
  click: [{ freq: 1600, at: 0, hold: 0.03, type: "square", gain: 0.16 }],
};

let context: AudioContext | null = null;
let enabled = false;

/** Created on the unmute gesture, so the context is allowed to start. */
function ensureContext(): AudioContext | null {
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) void ensureContext()?.resume();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  const ctx = ensureContext();
  if (!ctx) return;
  // Tab was backgrounded, or the context never got its gesture.
  if (ctx.state === "suspended") void ctx.resume();

  const start = ctx.currentTime + 0.01;

  for (const note of CUES[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = note.gain ?? 0.35;
    const from = start + note.at;
    const to = from + note.hold;

    osc.type = note.type ?? "sine";
    osc.frequency.setValueAtTime(note.freq, from);

    // A short attack and an exponential tail; a raw gate would click.
    gain.gain.setValueAtTime(0.0001, from);
    gain.gain.exponentialRampToValueAtTime(peak, from + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, to);

    osc.connect(gain).connect(ctx.destination);
    osc.start(from);
    osc.stop(to + 0.02);
  }
}
