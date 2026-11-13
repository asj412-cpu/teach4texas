"use client";

/** Number line SFX: Web Audio tones only. No speech. */
type Sfx = "pickup" | "drop" | "lock" | "reveal" | "fanfare";

let ctx: AudioContext | null = null;
let muted = false;
let started = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function ensureNumberLineAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  started = true;
}

export function isNumberLineMuted(): boolean {
  return muted;
}

export function setNumberLineMuted(next: boolean): void {
  muted = next;
}

export function playNumberLineSfx(kind: Sfx): void {
  if (muted || !started) return;
  const c = getCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const out = c.createGain();
    out.gain.value = 0.8;
    out.connect(c.destination);
    const tone = (freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) => {
      const osc = c.createOscillator();
      const amp = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);
      amp.gain.setValueAtTime(0.0001, now + delay);
      amp.gain.exponentialRampToValueAtTime(gain, now + delay + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(amp).connect(out);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.05);
    };
    if (kind === "pickup") tone(520, 0.12, "triangle", 0.2);
    if (kind === "drop") {
      tone(220, 0.16, "sine", 0.28);
      tone(140, 0.2, "sine", 0.16, 0.04);
    }
    if (kind === "lock") {
      tone(523, 0.16, "triangle", 0.22);
      tone(784, 0.22, "triangle", 0.18, 0.08);
    }
    if (kind === "reveal") {
      tone(392, 0.2, "sawtooth", 0.08);
      tone(523, 0.28, "triangle", 0.2, 0.12);
      tone(659, 0.36, "triangle", 0.18, 0.22);
    }
    if (kind === "fanfare") {
      tone(523, 0.18, "triangle", 0.22);
      tone(659, 0.18, "triangle", 0.2, 0.16);
      tone(784, 0.28, "triangle", 0.22, 0.32);
      tone(1046, 0.4, "sine", 0.16, 0.48);
    }
  } catch {
    /* audio is optional */
  }
}
