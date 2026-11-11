"use client";

/** Bingo SFX: Web Audio tones and noise only. No speech. */
type Sfx = "drum" | "stamp" | "buzz" | "reveal" | "fanfare";

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

export function ensureBingoAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  started = true;
}

export function isBingoMuted(): boolean {
  return muted;
}

export function setBingoMuted(next: boolean): void {
  muted = next;
}

function noise(c: AudioContext, dur: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

export function playBingoSfx(kind: Sfx): void {
  if (muted || !started) return;
  const c = getCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const out = c.createGain();
    out.gain.value = 0.85;
    out.connect(c.destination);
    const tone = (
      f: number,
      dur: number,
      type: OscillatorType,
      gain: number,
      delay = 0,
    ) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now + delay);
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(gain, now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      o.connect(g).connect(out);
      o.start(now + delay);
      o.stop(now + delay + dur + 0.05);
    };
    if (kind === "drum") {
      const n = noise(c, 0.45);
      const bp = c.createBiquadFilter();
      bp.type = "lowpass";
      bp.frequency.value = 280;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      n.connect(bp).connect(g).connect(out);
      n.start(now);
      n.stop(now + 0.5);
      tone(90, 0.28, "sine", 0.4);
      tone(140, 0.18, "triangle", 0.2, 0.08);
    } else if (kind === "stamp") {
      const n = noise(c, 0.12);
      const bp = c.createBiquadFilter();
      bp.type = "highpass";
      bp.frequency.value = 900;
      const g = c.createGain();
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      n.connect(bp).connect(g).connect(out);
      n.start(now);
      n.stop(now + 0.14);
      tone(180, 0.1, "square", 0.12);
    } else if (kind === "buzz") {
      tone(140, 0.16, "square", 0.12);
      tone(90, 0.2, "square", 0.1, 0.14);
    } else if (kind === "reveal") {
      tone(523, 0.16, "triangle", 0.16);
      tone(659, 0.18, "triangle", 0.14, 0.1);
      tone(784, 0.22, "triangle", 0.12, 0.2);
    } else {
      tone(523, 0.2, "triangle", 0.16);
      tone(659, 0.2, "triangle", 0.14, 0.16);
      tone(784, 0.28, "triangle", 0.14, 0.32);
      tone(1046, 0.4, "triangle", 0.12, 0.48);
    }
  } catch {
    /* audio is optional */
  }
}
