/** Original VYZUN beats synthesized on the device — no licensed catalogue is needed. */
export type BeatSpec = { id: string; name: string; bpm: number; mood: string; root: number; swing: number; bright: number };

export const BEATS: BeatSpec[] = [
  { id: "neon-pulse", name: "Neon Pulse", bpm: 122, mood: "Electro · hype", root: 55, swing: 0, bright: 1 },
  { id: "campus-nights", name: "Campus Nights", bpm: 96, mood: "Hip-hop · chill", root: 49, swing: 0.12, bright: 0.6 },
  { id: "hyper-glow", name: "Hyper Glow", bpm: 140, mood: "Hyperpop · fast", root: 62, swing: 0, bright: 1.3 },
  { id: "lofi-secrets", name: "Lo-fi Secrets", bpm: 78, mood: "Lo-fi · soft", root: 46, swing: 0.18, bright: 0.4 },
];

const SAMPLE_RATE = 22050;
const MINOR = [0, 3, 7, 10];

export async function renderBeat(spec: BeatSpec, seconds: number): Promise<AudioBuffer> {
  const length = Math.ceil(SAMPLE_RATE * Math.max(1, seconds));
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  const beat = 60 / spec.bpm;
  const noise = ctx.createBuffer(1, SAMPLE_RATE / 10, SAMPLE_RATE);
  const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

  for (let t = 0, step = 0; t < seconds; t += beat / 2, step++) {
    const time = t + (step % 2 ? spec.swing * beat : 0);
    if (step % 2 === 0) { // kick on every beat
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, time); o.frequency.exponentialRampToValueAtTime(42, time + 0.18);
      g.gain.setValueAtTime(0.9, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      o.connect(g).connect(master); o.start(time); o.stop(time + 0.32);
    }
    { // hat on every 8th
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = "highpass"; f.frequency.value = 6000 * spec.bright + 2000;
      g.gain.setValueAtTime(step % 2 ? 0.18 : 0.1, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      s.connect(f).connect(g).connect(master); s.start(time); s.stop(time + 0.06);
    }
    if (step % 4 === 2) { // snare/clap on 2 and 4
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = "bandpass"; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.35, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      s.connect(f).connect(g).connect(master); s.start(time); s.stop(time + 0.18);
    }
    if (step % 2 === 0) { // bass line walking the minor chord
      const bar = Math.floor(step / 8);
      const note = spec.root - 12 + MINOR[(bar + Math.floor(step / 2)) % MINOR.length]!;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = hz(note);
      f.type = "lowpass"; f.frequency.value = 500 + 900 * spec.bright;
      g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.16, time + 0.02); g.gain.exponentialRampToValueAtTime(0.001, time + beat * 0.9);
      o.connect(f).connect(g).connect(master); o.start(time); o.stop(time + beat);
    }
  }
  return ctx.startRendering();
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const data = buffer.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const write = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  write(0, "RIFF"); out.setUint32(4, 36 + data.length * 2, true); write(8, "WAVE"); write(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, buffer.sampleRate, true); out.setUint32(28, buffer.sampleRate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true); write(36, "data"); out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i]!)) * 0x7fff, true);
  return new Blob([out], { type: "audio/wav" });
}

export function waveformPeaks(buffer: AudioBuffer, bins = 72): number[] {
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / bins));
  const peaks: number[] = [];
  for (let b = 0; b < bins; b++) {
    let max = 0;
    for (let i = b * size; i < Math.min(data.length, (b + 1) * size); i += 8) max = Math.max(max, Math.abs(data[i]!));
    peaks.push(max);
  }
  const top = Math.max(...peaks, 0.001);
  return peaks.map(p => p / top);
}
