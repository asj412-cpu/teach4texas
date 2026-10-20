"use client";

/** Tug of War SFX: Web Audio only ($0, no files). Starts after a user gesture. */
type Sfx = "cheer" | "creak" | "whoosh" | "fanfare" | "tick";

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

/** Call from a click/tap so browser autoplay policy allows sound. */
export function ensureTowAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  started = true;
}

export function isTowMuted(): boolean {
  return muted;
}

export function setTowMuted(next: boolean): void {
  muted = next;
}

function noise(c: AudioContext, dur: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

export function playTowSfx(kind: Sfx): void {
  if (muted || !started) return;
  const c = getCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const out = c.createGain();
    out.gain.value = 0.9;
    out.connect(c.destination);
    const tone = (f: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now + delay);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + delay + dur);
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(gain, now + delay + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      o.connect(g).connect(out);
      o.start(now + delay);
      o.stop(now + delay + dur + 0.05);
    };
    if (kind === "cheer") {
      // Crowd swell: band-passed noise rising then falling.
      const n = noise(c, 1.6);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1100;
      bp.Q.value = 0.7;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      n.connect(bp).connect(g).connect(out);
      n.start(now);
      tone(520, 0.25, "triangle", 0.05, 0.1);
      tone(660, 0.25, "triangle", 0.05, 0.25);
    } else if (kind === "creak") {
      tone(90, 0.5, "sawtooth", 0.06, 0, 140);
      tone(70, 0.45, "sawtooth", 0.05, 0.25, 110);
    } else if (kind === "whoosh") {
      const n = noise(c, 0.7);
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(300, now);
      f.frequency.exponentialRampToValueAtTime(2400, now + 0.6);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      n.connect(f).connect(g).connect(out);
      n.start(now);
    } else if (kind === "fanfare") {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, "square", 0.06, i * 0.14));
      tone(1047, 0.9, "triangle", 0.07, 0.6);
    } else {
      tone(880, 0.08, "square", 0.04);
    }
  } catch {
    /* audio is optional */
  }
}
