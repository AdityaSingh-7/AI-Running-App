/**
 * Split audio — plays a short "ding" tone using the Web Audio API.
 * Works in any modern browser; silently no-ops in SSR/Node environments.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AudioContextCtor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx = new AudioContextCtor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function playSplitSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 0.2; // 200 ms

    // Oscillator — 440 Hz sine wave
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5 — bright, clear ding

    // Gain envelope: quick attack, smooth decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01); // 10 ms attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // decay to silence

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Silently swallow — audio is non-critical
  }
}
