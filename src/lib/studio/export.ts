import { FILTERS, FONTS, type FilterKey, type FontKey } from "./presets";

export type Segment = { id: string; kind: "video" | "image"; url: string; duration: number };
export type Overlay = {
  id: string; kind: "text" | "sticker"; content: string;
  x: number; y: number; scale: number; // x/y as 0–1 of the frame, scale 1 = 8% of frame width
  font: FontKey; color: string; glow: boolean;
};
export type MusicChoice = { name: string; url: string; start: number; duration: number; peaks: number[] } | null;

export const EXPORT_W = 720;
export const EXPORT_H = 1280;

function pickMime() {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return types.find(t => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

export function resolveColor(token: string, el: Element = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(token).trim() || "white";
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number) {
  if (!sw || !sh) return;
  const scale = Math.max(EXPORT_W / sw, EXPORT_H / sh);
  const w = sw * scale, h = sh * scale;
  ctx.drawImage(src, (EXPORT_W - w) / 2, (EXPORT_H - h) / 2, w, h);
}

export function drawOverlays(ctx: CanvasRenderingContext2D, overlays: Overlay[]) {
  for (const o of overlays) {
    const size = EXPORT_W * 0.08 * o.scale;
    const font = FONTS[o.font];
    ctx.save();
    ctx.font = `${o.kind === "sticker" && !o.content.startsWith("@") && !o.content.startsWith("#") ? 400 : font.weight} ${size}px ${font.family}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const color = resolveColor(o.color);
    if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = size * 0.6; }
    ctx.fillStyle = color;
    ctx.fillText(o.content, o.x * EXPORT_W, o.y * EXPORT_H, EXPORT_W * 0.92);
    ctx.restore();
  }
}

/** Renders clips + filter + text/stickers + music into one 9:16 video, in real time. */
export async function renderReel(opts: {
  segments: Segment[]; filter: FilterKey; overlays: Overlay[]; music: MusicChoice; musicVolume: number;
  onProgress?: (p: number) => void; signal?: AbortSignal;
}): Promise<Blob> {
  const { segments, filter, overlays, music, musicVolume, onProgress, signal } = opts;
  const mime = pickMime();
  if (!mime) throw new Error("This browser can’t export video.");
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W; canvas.height = EXPORT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] ?? "video/webm" })); });

  const total = segments.reduce((s, x) => s + x.duration, 0);
  let musicEl: HTMLAudioElement | null = null;
  if (music) {
    musicEl = new Audio(music.url);
    musicEl.currentTime = music.start;
    const g = audioCtx.createGain(); g.gain.value = musicVolume;
    audioCtx.createMediaElementSource(musicEl).connect(g).connect(dest);
  }
  const frame = (src: CanvasImageSource, w: number, h: number) => {
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
    ctx.filter = FILTERS[filter].css; drawCover(ctx, src, w, h); ctx.filter = "none";
    drawOverlays(ctx, overlays);
  };

  recorder.start(250);
  await musicEl?.play().catch(() => undefined);
  let elapsedBefore = 0;
  try {
    for (const seg of segments) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (seg.kind === "image") {
        const img = new Image(); img.src = seg.url; await img.decode();
        const start = performance.now();
        await new Promise<void>(resolve => {
          const tick = () => {
            const t = (performance.now() - start) / 1000;
            frame(img, img.naturalWidth, img.naturalHeight);
            onProgress?.(Math.min(1, (elapsedBefore + t) / total));
            if (t >= seg.duration || signal?.aborted) resolve(); else requestAnimationFrame(tick);
          };
          tick();
        });
      } else {
        const v = document.createElement("video");
        v.src = seg.url; v.playsInline = true;
        await new Promise(r => { v.onloadeddata = r; v.onerror = r; });
        audioCtx.createMediaElementSource(v).connect(dest);
        await v.play();
        await new Promise<void>(resolve => {
          const tick = () => {
            frame(v, v.videoWidth, v.videoHeight);
            onProgress?.(Math.min(1, (elapsedBefore + v.currentTime) / total));
            if (v.ended || v.currentTime >= seg.duration - 0.03 || signal?.aborted) { v.pause(); resolve(); } else requestAnimationFrame(tick);
          };
          tick();
        });
      }
      elapsedBefore += seg.duration;
    }
  } finally {
    musicEl?.pause();
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach(t => t.stop());
  }
  const blob = await done;
  void audioCtx.close();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  onProgress?.(1);
  return blob;
}

/** Grabs one frame of a clip as a JPEG cover. */
export async function captureCover(segment: Segment, at: number, filter: FilterKey, overlays: Overlay[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W; canvas.height = EXPORT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  let src: HTMLImageElement | HTMLVideoElement; let w: number; let h: number;
  if (segment.kind === "image") { const img = new Image(); img.src = segment.url; await img.decode(); src = img; w = img.naturalWidth; h = img.naturalHeight; }
  else {
    const v = document.createElement("video"); v.src = segment.url; v.muted = true; v.playsInline = true;
    await new Promise(r => { v.onloadeddata = r; v.onerror = r; });
    v.currentTime = Math.min(at, Math.max(0, segment.duration - 0.1));
    await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); });
    src = v; w = v.videoWidth; h = v.videoHeight;
  }
  ctx.fillStyle = "black"; ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
  ctx.filter = FILTERS[filter].css; drawCover(ctx, src, w, h); ctx.filter = "none";
  drawOverlays(ctx, overlays);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Cover failed"))), "image/jpeg", 0.85));
}
