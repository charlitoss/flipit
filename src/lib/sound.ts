// Shared WebAudio context for the flap tick and the countdown alarm.
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// Create/resume the context during a user gesture (e.g. pressing Start) so a
// later sound — the countdown alarm — is allowed to play.
export function unlockAudio(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume?.();
}

// Mechanical "tick" for each flap.
export function tick(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const dur = 0.03;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.value = 0.18;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
}

// A short chime played once when a countdown reaches zero.
export function alarm(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume?.();
  const t0 = ctx.currentTime + 0.02;
  const beep = (offset: number, freq: number, dur: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = t0 + offset;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  };
  beep(0.0, 880, 0.16); // A5
  beep(0.22, 880, 0.16);
  beep(0.44, 880, 0.16);
  beep(0.66, 1318.51, 0.42); // E6, longer final
}

// A gentle two-tone chime for break reminders.
export function chime(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume?.();
  const t0 = ctx.currentTime + 0.02;
  const note = (offset: number, freq: number, dur: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = t0 + offset;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  };
  note(0.0, 659.25, 0.5); // E5
  note(0.18, 987.77, 0.6); // B5
}
