// Timeline music Easter egg: a tiny Web Audio synth plus pure helpers that turn
// the calendar into a "chart for music". As a playhead crosses into an event a
// bell rings; as it leaves, a whistle answers. Pitch is a "voice" derived from
// the event's row and collision sub-lane (see voiceStep), stepped through a
// major-pentatonic scale so every row sounds distinct yet consonant.

// Major pentatonic, in semitones above the root.
const PENTATONIC = [0, 2, 4, 7, 9];

// Middle C — low enough that octave-wrapped deep voices stay musical.
const BASE_HZ = 261.626;

// Pentatonic degrees to step up per calendar row, so adjacent rows sound a
// distinct note. The collision sub-lane then steps up from the row's base.
const ROW_STRIDE = 1;

export function pentatonicSemitone(step: number): number {
  const n = Math.max(0, Math.floor(step));
  const octave = Math.floor(n / PENTATONIC.length);
  const degree = n % PENTATONIC.length;
  return PENTATONIC[degree]! + 12 * octave;
}

// A "voice" is the scale step a span sounds at: each row starts ROW_STRIDE
// degrees above the previous, and stacked (overlapping) events step up from
// there via their collision sub-lane.
export function voiceStep(row: number, lane: number): number {
  return Math.max(0, Math.floor(row)) * ROW_STRIDE + Math.max(0, Math.floor(lane));
}

export function laneToFrequency(step: number, base = BASE_HZ): number {
  return base * Math.pow(2, pentatonicSemitone(step) / 12);
}

export type LaneSpan = {
  key: string;
  startMs: number;
  endMs: number;
  // The voice this span sounds at (row + sub-lane, see voiceStep), not the raw
  // collision lane.
  lane: number;
  allDay: boolean;
};

// Which events the playhead sits inside at instant `ms`, keyed by span with its
// voice. All-day events sound too (holiday calendars are entirely all-day).
// Half-open [start, end) so an event stops being active exactly at its end.
export function activeLanesAt(ms: number, spans: LaneSpan[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of spans) {
    if (ms >= s.startMs && ms < s.endMs) out.set(s.key, s.lane);
  }
  return out;
}

export type Crossing = { key: string; lane: number };

// Spans newly entered vs. just exited between two active sets. Entered carry
// their lane from `next`; exited from `prev` (they're gone from `next`).
export function crossings(
  prev: Map<string, number>,
  next: Map<string, number>,
): { entered: Crossing[]; exited: Crossing[] } {
  const entered: Crossing[] = [];
  const exited: Crossing[] = [];
  for (const [key, lane] of next) if (!prev.has(key)) entered.push({ key, lane });
  for (const [key, lane] of prev) if (!next.has(key)) exited.push({ key, lane });
  return { entered, exited };
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;

function cancelPendingSuspend(): void {
  if (suspendTimer) {
    clearTimeout(suspendTimer);
    suspendTimer = null;
  }
}

function audioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

// Build the graph and resume it. Must be called from a user gesture (browsers
// won't start audio otherwise), so the date-button pointerdown is where this
// fires. Firefox in particular keeps the context suspended until a gesture
// resumes it.
export function primeTimelineAudio(): void {
  // A quick re-enable cancels any suspend still waiting out a bell's tail.
  cancelPendingSuspend();
  const Ctor = audioCtor();
  if (!Ctor) return;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state !== 'running') void ctx.resume();
}

// Suspend the context to release audio when the egg is off. `delayMs` lets a
// final note (e.g. the last beat of the disable countdown) ring out before the
// context freezes — suspend() would otherwise cut it mid-tail.
export function suspendTimelineAudio(delayMs = 0): void {
  cancelPendingSuspend();
  if (!ctx) return;
  const doSuspend = (): void => {
    if (ctx && ctx.state === 'running') void ctx.suspend();
  };
  if (delayMs <= 0) {
    doSuspend();
    return;
  }
  suspendTimer = setTimeout(() => {
    suspendTimer = null;
    doSuspend();
  }, delayMs);
}

// Inharmonic partials give the strike a bell-like, slightly metallic ring.
const BELL_PARTIALS = [
  { mult: 1, gain: 1 },
  { mult: 2.76, gain: 0.45 },
  { mult: 5.4, gain: 0.2 },
];

// If the context isn't running yet (Firefox can lag a resume), nudge it and
// schedule anyway — the notes play once it starts. Bailing here is what left
// Firefox silent. A small lookahead keeps scheduling off `currentTime` exactly,
// which Firefox dislikes. Envelopes attack with a linear ramp from a true zero
// (exponential ramps can't start at 0 and clicked/dropped on Firefox).
function ready(): boolean {
  if (!ctx || !master) return false;
  if (ctx.state !== 'running') void ctx.resume();
  return true;
}

export function playBell(freq: number): void {
  if (!ready() || !ctx || !master) return;
  const now = ctx.currentTime + 0.02;
  const dur = 1.1;
  const env = ctx.createGain();
  env.connect(master);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1, now + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  for (const p of BELL_PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * p.mult;
    const pg = ctx.createGain();
    pg.gain.value = p.gain;
    osc.connect(pg);
    pg.connect(env);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }
}

export function playWhistle(freq: number): void {
  if (!ready() || !ctx || !master) return;
  const now = ctx.currentTime + 0.02;
  const dur = 0.55;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  // A short upward glide reads as a whistle rather than a plain beep.
  osc.frequency.setValueAtTime(freq * 0.92, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.6, now + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  osc.connect(env);
  env.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

// Ascending major triad (C5, E5, G5) for the activation countdown: "ding,
// dung, dong" as the hold arms, the third coinciding with auto-start.
export const COUNTDOWN_HZ = [523.25, 659.25, 783.99];

// Which COUNTDOWN_HZ index a beat plays. Enabling ascends (0,1,2); disabling
// descends (2,1,0) so the chime mirrors itself when turning the egg off.
// `beat` is 1-based.
export function countdownToneIndex(beat: number, enabling: boolean, steps = COUNTDOWN_HZ.length): number {
  const b = Math.max(1, Math.min(steps, Math.floor(beat)));
  return enabling ? b - 1 : steps - b;
}

export function playCountdownTone(step: number): void {
  const i = Math.max(0, Math.min(COUNTDOWN_HZ.length - 1, Math.floor(step)));
  playBell(COUNTDOWN_HZ[i]!);
}
