import { config } from './state.svelte';

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

// A tiny dedicated AudioContext for the tap sound, kept separate from the music
// Easter egg so UI taps never pick up its echo or get suspended with it. Created
// lazily on first use — which is always inside a user gesture, so browsers let
// it start.
let clickCtx: AudioContext | null = null;

function audioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

// Play the vibration rhythm as sound instead: one short, soft click per "on"
// pulse (even indices of a pattern array), at the pattern's cumulative offsets.
// So tap → one click, trayCollapse [12,40,12] / loading [40,120,40,120] → the
// same cadence in clicks. A standalone tap is treated as a single on-pulse.
function playTick(pattern: number | number[]): void {
  const Ctor = audioCtor();
  if (!Ctor) return;
  if (!clickCtx) clickCtx = new Ctor();
  if (clickCtx.state !== 'running') void clickCtx.resume();
  const pulses = Array.isArray(pattern) ? pattern : [pattern];
  // Small lookahead so the first blip isn't scheduled at the exact currentTime:
  // on Chrome for Android resume() lags the gesture, and a zero-offset note lands
  // while the context is still suspended and gets dropped (no sound). 0.02s is
  // imperceptible but lands safely after the context starts running.
  const start = clickCtx.currentTime + 0.02;
  let offsetMs = 0;
  for (let i = 0; i < pulses.length; i++) {
    if (i % 2 === 0) clickAt(clickCtx, start + offsetMs / 1000);
    offsetMs += pulses[i]!;
  }
}

// One soft percussive thump, like a fingertip tap rather than an electronic beep:
// a warm sine whose pitch drops fast from ~190 Hz to ~70 Hz (the pitch-drop is
// what reads as a "thump"). A higher level and a little length keep it audible on
// phone speakers, which can't reproduce a quiet sub-bass blip.
function clickAt(ctx: AudioContext, at: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190, at);
  osc.frequency.exponentialRampToValueAtTime(70, at + 0.07);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(0.4, at + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0008, at + 0.13);
  // Settle to true zero before stopping so the thump itself doesn't end on a click.
  env.gain.linearRampToValueAtTime(0, at + 0.15);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.16);
}

// Feedback for a tap/hold. The Haptics setting decides whether that's a
// vibration, a tap sound, or both-or-neither: 'auto' uses vibration where the
// device supports it (else the sound, for Safari/Firefox), 'sound' always plays
// the sound, 'vibration' vibrates only, 'off' does nothing.
function buzz(pattern: number | number[]): void {
  const mode = config.haptics;
  if (mode === 'off') return;
  const vibrates = mode === 'vibration' || (mode === 'auto' && canVibrate());
  const sounds = mode === 'sound' || (mode === 'auto' && !canVibrate());
  if (vibrates && canVibrate()) navigator.vibrate(pattern);
  if (sounds) playTick(pattern);
}

// 5ms is below what many phones (notably Firefox on Android) actually render,
// so taps felt dead there — bump to a perceptible minimum.
export function tap(): void {
  buzz(10);
}

export function longPress(): void {
  buzz(80);
}

// Tray expand = one longer pulse ("taaaap"); collapse = two short ("tap tap").
export function trayExpand(): void {
  buzz(45);
}

export function trayCollapse(): void {
  buzz([12, 40, 12]);
}

// Settings panel open: a firm single pulse, same strength as the tray opening.
export function panelOpen(): void {
  buzz(45);
}

// Calendars refreshing: a vibrate-pause-vibrate-pause pattern while loading.
export function loading(): void {
  buzz([40, 120, 40, 120]);
}

export function createLongPress(ms = 500): {
  start(callback: () => void): void;
  cancel(): void;
  didFire(): boolean;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fired = false;
  return {
    start(callback: () => void) {
      fired = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fired = true;
        longPress();
        callback();
      }, ms);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    didFire() {
      const v = fired;
      fired = false;
      return v;
    },
  };
}
