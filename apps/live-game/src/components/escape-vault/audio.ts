"use client";

type Sfx = "tick" | "unlock" | "wrong" | "fanfare" | "ambient";

let ctx: AudioContext | null = null;
let muted = false;
let ambientTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a click/tap so Chromebook autoplay policy allows sound. */
export function ensureVaultAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  started = true;
}

export function isVaultMuted(): boolean {
  return muted;
}

export function setVaultMuted(next: boolean): void {
  muted = next;
  if (muted) stopAmbient();
}

export function playVaultSfx(kind: Sfx): void {
  if (muted || !started) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const now = c.currentTime;

  const beep = (
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.08,
    delay = 0,
  ) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + delay);
    g.gain.exponentialRampToValueAtTime(gain, now + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(now + delay);
    o.stop(now + delay + dur + 0.02);
  };

  switch (kind) {
    case "tick":
      beep(880, 0.06, "square", 0.05);
      break;
    case "wrong":
      beep(180, 0.18, "sawtooth", 0.07);
      beep(140, 0.22, "sawtooth", 0.05, 0.08);
      break;
    case "unlock":
      beep(523, 0.12, "sine", 0.08);
      beep(659, 0.14, "sine", 0.08, 0.1);
      beep(784, 0.2, "sine", 0.09, 0.2);
      break;
    case "fanfare":
      beep(523, 0.15, "triangle", 0.09);
      beep(659, 0.15, "triangle", 0.09, 0.12);
      beep(784, 0.15, "triangle", 0.09, 0.24);
      beep(1046, 0.35, "triangle", 0.1, 0.36);
      break;
    case "ambient":
      beep(196, 0.4, "sine", 0.015);
      break;
  }
}

export function startAmbient(): void {
  if (muted || !started) return;
  stopAmbient();
  playVaultSfx("ambient");
  ambientTimer = setInterval(() => {
    if (!muted) playVaultSfx("ambient");
  }, 4000);
}

export function stopAmbient(): void {
  if (ambientTimer) {
    clearInterval(ambientTimer);
    ambientTimer = null;
  }
}
