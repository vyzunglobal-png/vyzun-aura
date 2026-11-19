import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, Check, Download, Image as ImageIcon, Music2, Pause, Play, RefreshCcw, Search, Sparkles, Sticker, Trash2, Type, Undo2, Upload, X, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { BEATS, audioBufferToWav, renderBeat, waveformPeaks } from "@/lib/studio/beats";
import { captureCover, renderReel, type MusicChoice, type Overlay, type Segment } from "@/lib/studio/export";
import { REEL_MEDIA_BUCKET } from "@/lib/reel-feed";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { reviewMyReel } from "@/lib/reel-review.functions";
import {
  DURATIONS, FILTERS, FONTS, HASHTAG_SUGGESTIONS, IMAGE_SEGMENT_SECONDS, MAX_CAPTION, MAX_TAGS, PRIVACY, STICKERS, TAG_STICKERS, TEXT_COLORS,
  extractHashtags, normalizeUsername, remainingSeconds, validateCaption, validateMediaFile,
  type FilterKey, type FontKey, type MaxDuration, type Privacy,
} from "@/lib/studio/presets";

type Step = "camera" | "edit" | "publish";
type Tool = "filters" | "music" | "text" | "stickers";
const uid = () => Math.random().toString(36).slice(2, 10);

function pickRecorderMime() {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Single entry point for recording, editing and publishing Reels. */
export function ReelStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useVyzunSession();
  const [step, setStep] = useState<Step>("camera");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [filter, setFilter] = useState<FilterKey>("none");
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [music, setMusic] = useState<MusicChoice>(null);
  const [maxDuration, setMaxDuration] = useState<MaxDuration>(15);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSegments(prev => { prev.forEach(s => URL.revokeObjectURL(s.url)); return []; });
    setOverlays([]); setFilter("none"); setStep("camera"); setNotice(null);
    setMusic(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });
  }, []);

  useEffect(() => { if (!open) reset(); }, [open, reset]);
  if (!open) return null;

  const total = segments.reduce((s, x) => s + x.duration, 0);

  return (
    <div className="studio-shell fixed inset-0 z-[65] flex flex-col" role="dialog" aria-modal="true" aria-label="Reel Creator Studio">
      {step === "camera" && (
        <CameraStep
          segments={segments} setSegments={setSegments} maxDuration={maxDuration} setMaxDuration={setMaxDuration}
          filter={filter} onClose={onClose} onNext={() => setStep("edit")} notice={notice} setNotice={setNotice}
        />
      )}
      {step === "edit" && (
        <EditStep
          segments={segments} filter={filter} setFilter={setFilter} overlays={overlays} setOverlays={setOverlays}
          music={music} setMusic={setMusic} total={total} onBack={() => setStep("camera")} onNext={() => setStep("publish")}
        />
      )}
      {step === "publish" && (
        <PublishStep
          segments={segments} filter={filter} overlays={overlays} music={music} total={total} userId={session?.user.id ?? null}
          onBack={() => setStep("edit")} onDone={() => { reset(); onClose(); }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Camera ------------------------------ */

function SegmentBar({ segments, live, max }: { segments: Segment[]; live: number; max: number }) {
  return (
    <div className="flex h-1.5 w-full gap-1" aria-label="Recorded clips">
      {segments.map(s => <span key={s.id} className="studio-seg rounded-full" style={{ width: `${(s.duration / max) * 100}%` }} />)}
      {live > 0 && <span className="studio-seg studio-seg-live rounded-full" style={{ width: `${(live / max) * 100}%` }} />}
      <span className="studio-seg-rest flex-1 rounded-full" />
    </div>
  );
}

function CameraStep({ segments, setSegments, maxDuration, setMaxDuration, filter, onClose, onNext, notice, setNotice }: {
  segments: Segment[]; setSegments: React.Dispatch<React.SetStateAction<Segment[]>>; maxDuration: MaxDuration; setMaxDuration: (d: MaxDuration) => void;
  filter: FilterKey; onClose: () => void; onNext: () => void; notice: string | null; setNotice: (n: string | null) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState(false);
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [live, setLive] = useState(0);
  const remaining = remainingSeconds(maxDuration, segments.map(s => s.duration));

  const stopTracks = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    setNotice(null); stopTracks(); setReady(false);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true });
      stream.current = next;
      const track = next.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorch(!!caps.torch);
      if (video.current) { video.current.srcObject = next; await video.current.play().catch(() => undefined); }
      setReady(true);
    } catch { setNotice("Allow camera and microphone access to record. You can still import from your gallery."); }
  }, [setNotice]);

  useEffect(() => { void startCamera(facing); }, [facing, startCamera]);
  useEffect(() => () => { if (ticker.current) clearInterval(ticker.current); if (recorder.current?.state === "recording") recorder.current.stop(); stopTracks(); }, []);

  async function toggleFlash() {
    const next = !flash; setFlash(next);
    const track = stream.current?.getVideoTracks()[0];
    if (torch && track) { try { await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }); } catch { /* unsupported */ } }
  }

  function stopSegment() { if (recorder.current?.state === "recording") recorder.current.stop(); }

  function startSegment() {
    if (!stream.current || remaining <= 0.2) return;
    if (typeof MediaRecorder === "undefined") { setNotice("Recording isn’t supported in this browser. Import a video instead."); return; }
    const mime = pickRecorderMime();
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const limit = remaining;
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (ticker.current) clearInterval(ticker.current);
      const duration = Math.min(limit, (performance.now() - startedAt.current) / 1000);
      setRecording(false); setLive(0);
      if (duration < 0.3) return;
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      setSegments(prev => [...prev, { id: uid(), kind: "video", url: URL.createObjectURL(blob), duration: Math.round(duration * 10) / 10 }]);
    };
    recorder.current = rec;
    rec.start(200); startedAt.current = performance.now(); setRecording(true);
    ticker.current = setInterval(() => {
      const t = (performance.now() - startedAt.current) / 1000;
      setLive(t);
      if (t >= limit) stopSegment();
    }, 100);
  }

  function undo() {
    setSegments(prev => { const last = prev.at(-1); if (last) URL.revokeObjectURL(last.url); return prev.slice(0, -1); });
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    let left = remaining;
    const added: Segment[] = [];
    for (const file of Array.from(files)) {
      const problem = validateMediaFile(file);
      if (problem) { setNotice(problem); continue; }
      if (left <= 0.2) { setNotice(`Your ${maxDuration}s timer is full.`); break; }
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("image/")) {
        const d = Math.min(IMAGE_SEGMENT_SECONDS, left); added.push({ id: uid(), kind: "image", url, duration: d }); left -= d;
      } else {
        const d = await new Promise<number>(resolve => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0); v.onerror = () => resolve(0); v.src = url; });
        if (!d) { URL.revokeObjectURL(url); setNotice("That video couldn’t be read."); continue; }
        const use = Math.min(d, left); added.push({ id: uid(), kind: "video", url, duration: Math.round(use * 10) / 10 }); left -= use;
      }
    }
    if (added.length) setSegments(prev => [...prev, ...added]);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <>
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} muted playsInline className={cn("absolute inset-0 h-full w-full object-cover", facing === "user" && "-scale-x-100")} style={{ filter: FILTERS[filter].css }} />
        {recording && flash && !torch && facing === "user" && <span aria-hidden className="studio-screen-flash pointer-events-none absolute inset-0" />}
        <div className="studio-top absolute inset-x-0 top-0 z-10 space-y-3 px-4 pb-6">
          <SegmentBar segments={segments} live={live} max={maxDuration} />
          <div className="flex items-center justify-between">
            <button onClick={onClose} aria-label="Close studio" className="studio-icon"><X /></button>
            <span className="studio-pill rounded-full px-3 py-1 text-xs font-semibold tabular-nums">{(maxDuration - remaining + live).toFixed(1)}s / {maxDuration}s</span>
            <div className="flex gap-2">
              <button onClick={() => void toggleFlash()} aria-label={flash ? "Flash off" : "Flash on"} aria-pressed={flash} className="studio-icon">{flash ? <Zap /> : <ZapOff />}</button>
              <button onClick={() => setFacing(f => (f === "user" ? "environment" : "user"))} disabled={recording} aria-label="Flip camera" className="studio-icon"><RefreshCcw /></button>
            </div>
          </div>
        </div>
        {!ready && !notice && <p className="absolute inset-0 m-auto h-fit text-center text-sm text-[var(--studio-muted)]">Starting camera…</p>}
        {notice && <p role="alert" className="studio-pill absolute inset-x-6 top-1/3 rounded-2xl p-3 text-center text-sm">{notice}</p>}
      </div>

      <div className="studio-bottom space-y-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
        <div className="flex justify-center gap-2" role="radiogroup" aria-label="Timer">
          {DURATIONS.map(d => (
            <button key={d} role="radio" aria-checked={maxDuration === d} disabled={segments.length > 0 || recording} onClick={() => setMaxDuration(d)} className="studio-chip rounded-full px-4 py-1.5 text-xs font-bold">{d}s</button>
          ))}
        </div>
        <div className="grid grid-cols-3 items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => fileInput.current?.click()} aria-label="Import from gallery" className="studio-icon studio-icon-lg"><ImageIcon /></button>
            <input ref={fileInput} type="file" accept="video/*,image/*" multiple hidden onChange={e => void importFiles(e.target.files)} />
            {segments.length > 0 && !recording && <button onClick={undo} aria-label="Undo last clip" className="studio-icon"><Undo2 /></button>}
          </div>
          <div className="flex justify-center">
            <button
              onClick={recording ? stopSegment : startSegment}
              disabled={!ready || (!recording && remaining <= 0.2)}
              aria-label={recording ? "Pause recording" : segments.length ? "Resume recording" : "Start recording"}
              className={cn("studio-record grid h-20 w-20 place-items-center rounded-full", recording && "studio-record-on")}
            >
              {recording ? <Pause className="h-8 w-8" /> : <span className="studio-record-dot h-14 w-14 rounded-full" />}
            </button>
          </div>
          <div className="flex justify-end">
            {segments.length > 0 && !recording && <Button variant="studioPrimary" onClick={onNext} className="h-11 rounded-full px-5"><Check />Next</Button>}
          </div>
        </div>
        <p className="text-center text-[11px] text-[var(--studio-muted)]">Tap to record · tap again to pause · {remaining.toFixed(1)}s left</p>
      </div>
    </>
  );
}

/* ------------------------------ Preview ------------------------------ */

function Preview({ segments, filter, overlays, music, editable, setOverlays, selected, setSelected, playing }: {
  segments: Segment[]; filter: FilterKey; overlays: Overlay[]; music: MusicChoice; playing: boolean;
  editable?: boolean; setOverlays?: React.Dispatch<React.SetStateAction<Overlay[]>>; selected?: string | null; setSelected?: (id: string | null) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const seg = segments[index];
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ id: string; dist: number; scale: number } | null>(null);

  useEffect(() => { setIndex(0); }, [segments]);
  useEffect(() => {
    if (!seg || seg.kind !== "image" || !playing) return;
    const t = setTimeout(() => setIndex(i => (i + 1) % segments.length), seg.duration * 1000);
    return () => clearTimeout(t);
  }, [seg, segments.length, playing]);
  useEffect(() => {
    const a = audio.current; if (!a || !music) return;
    if (index === 0) a.currentTime = music.start;
    if (playing) void a.play().catch(() => undefined); else a.pause();
  }, [index, music, playing]);

  function onPointerDown(e: ReactPointerEvent, o: Overlay) {
    if (!editable) return;
    e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId);
    setSelected?.(o.id);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { id: o.id, dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), scale: o.scale };
    }
  }
  function onPointerMove(e: ReactPointerEvent, o: Overlay) {
    if (!editable || !pointers.current.has(e.pointerId) || !frame.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = frame.current.getBoundingClientRect();
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const scale = Math.min(4, Math.max(0.4, gesture.current.scale * (Math.hypot(a!.x - b!.x, a!.y - b!.y) / gesture.current.dist)));
      setOverlays?.(list => list.map(item => (item.id === o.id ? { ...item, scale } : item)));
    } else {
      const x = Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width));
      const y = Math.min(0.95, Math.max(0.05, (e.clientY - rect.top) / rect.height));
      setOverlays?.(list => list.map(item => (item.id === o.id ? { ...item, x, y } : item)));
    }
  }
  function onPointerUp(e: ReactPointerEvent) { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) gesture.current = null; }

  return (
    <div ref={frame} onPointerDown={() => setSelected?.(null)} className="studio-frame relative mx-auto aspect-[9/16] h-full max-h-full overflow-hidden rounded-2xl" style={{ containerType: "inline-size" }}>
      {seg?.kind === "video" && <video key={seg.id} src={seg.url} autoPlay={playing} muted={!!music} playsInline onEnded={() => setIndex(i => (i + 1) % segments.length)} className="absolute inset-0 h-full w-full object-cover" style={{ filter: FILTERS[filter].css }} ref={el => { if (el) { if (playing) void el.play().catch(() => undefined); else el.pause(); } }} />}
      {seg?.kind === "image" && <img src={seg.url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: FILTERS[filter].css }} />}
      {music && <audio ref={audio} src={music.url} />}
      {overlays.map(o => (
        <span
          key={o.id}
          onPointerDown={e => onPointerDown(e, o)} onPointerMove={e => onPointerMove(e, o)} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          className={cn("studio-overlay absolute -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap", editable && "cursor-move touch-none", selected === o.id && "studio-overlay-selected")}
          style={{ left: `${o.x * 100}%`, top: `${o.y * 100}%`, fontSize: `${8 * o.scale}cqw`, fontFamily: FONTS[o.font].family, fontWeight: FONTS[o.font].weight, color: `var(${o.color})`, textShadow: o.glow ? `0 0 0.35em var(${o.color}), 0 0 0.8em var(${o.color})` : undefined }}
        >{o.content}</span>
      ))}
    </div>
  );
}

/* ------------------------------ Edit ------------------------------ */

function EditStep({ segments, filter, setFilter, overlays, setOverlays, music, setMusic, total, onBack, onNext }: {
  segments: Segment[]; filter: FilterKey; setFilter: (f: FilterKey) => void; overlays: Overlay[]; setOverlays: React.Dispatch<React.SetStateAction<Overlay[]>>;
  music: MusicChoice; setMusic: React.Dispatch<React.SetStateAction<MusicChoice>>; total: number; onBack: () => void; onNext: () => void;
}) {
  const [tool, setTool] = useState<Tool>("filters");
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const sel = overlays.find(o => o.id === selected) ?? null;
  const updateSel = (patch: Partial<Overlay>) => setOverlays(list => list.map(o => (o.id === selected ? { ...o, ...patch } : o)));

  return (
    <>
      <header className="studio-top flex items-center justify-between px-4 pb-2">
        <button onClick={onBack} aria-label="Back to camera" className="studio-icon"><ArrowLeft /></button>
        <span className="text-sm font-semibold">Edit · {total.toFixed(1)}s</span>
        <Button variant="studioPrimary" onClick={onNext} className="h-10 rounded-full px-5">Next</Button>
      </header>
      <div className="relative min-h-0 flex-1 px-4 py-2">
        <Preview segments={segments} filter={filter} overlays={overlays} music={music} editable setOverlays={setOverlays} selected={selected} setSelected={setSelected} playing={playing} />
        <button onClick={() => setPlaying(p => !p)} aria-label={playing ? "Pause preview" : "Play preview"} className="studio-icon absolute bottom-4 left-1/2 -translate-x-1/2">{playing ? <Pause /> : <Play />}</button>
      </div>

      <div className="studio-bottom px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        {sel && (
          <div className="studio-panel mb-3 flex items-center gap-3 rounded-2xl p-3">
            <span className="text-xs font-semibold">Size</span>
            <Slider aria-label="Overlay size" min={0.4} max={4} step={0.05} value={[sel.scale]} onValueChange={([v]) => updateSel({ scale: v ?? 1 })} className="flex-1" />
            {sel.kind === "text" && <button onClick={() => updateSel({ glow: !sel.glow })} aria-pressed={sel.glow} className="studio-chip rounded-full px-3 py-1 text-xs font-bold">Glow</button>}
            <button onClick={() => { setOverlays(list => list.filter(o => o.id !== sel.id)); setSelected(null); }} aria-label="Delete overlay" className="studio-icon"><Trash2 /></button>
          </div>
        )}
        <div className="mb-3 min-h-[8.5rem]">
          {tool === "filters" && <FilterPicker filter={filter} setFilter={setFilter} poster={segments[0]} />}
          {tool === "music" && <MusicPicker music={music} setMusic={setMusic} total={total} />}
          {tool === "text" && <TextTool onAdd={o => { setOverlays(list => [...list, o]); setSelected(o.id); }} />}
          {tool === "stickers" && <StickerTool onAdd={o => { setOverlays(list => [...list, o]); setSelected(o.id); }} />}
        </div>
        <nav className="grid grid-cols-4 gap-2" aria-label="Editing tools">
          {([["filters", "Filters", Sparkles], ["music", "Music", Music2], ["text", "Text", Type], ["stickers", "Stickers", Sticker]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTool(key)} aria-pressed={tool === key} className="studio-tool flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold"><Icon className="h-5 w-5" />{label}</button>
          ))}
        </nav>
      </div>
    </>
  );
}

function FilterPicker({ filter, setFilter, poster }: { filter: FilterKey; setFilter: (f: FilterKey) => void; poster?: Segment | undefined }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1" role="radiogroup" aria-label="Filters">
      {(Object.keys(FILTERS) as FilterKey[]).map(key => (
        <button key={key} role="radio" aria-checked={filter === key} onClick={() => setFilter(key)} className="studio-filter flex w-16 shrink-0 flex-col items-center gap-1.5 text-[10px] font-semibold">
          <span className="studio-filter-thumb block h-20 w-16 overflow-hidden rounded-xl">
            {poster?.kind === "image" ? <img src={poster.url} alt="" className="h-full w-full object-cover" style={{ filter: FILTERS[key].css }} />
              : poster ? <video src={poster.url} muted playsInline preload="metadata" className="h-full w-full object-cover" style={{ filter: FILTERS[key].css }} />
              : <span className="block h-full w-full bg-gradient-vyzun" style={{ filter: FILTERS[key].css }} />}
          </span>
          {FILTERS[key].label}
        </button>
      ))}
    </div>
  );
}

function MusicPicker({ music, setMusic, total }: { music: MusicChoice; setMusic: React.Dispatch<React.SetStateAction<MusicChoice>>; total: number }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = useRef<HTMLAudioElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const beats = useMemo(() => BEATS.filter(b => `${b.name} ${b.mood}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  useEffect(() => () => { preview.current?.pause(); }, []);

  const choose = (name: string, buffer: AudioBuffer, blob: Blob) => {
    setMusic(prev => { if (prev) URL.revokeObjectURL(prev.url); return { name, url: URL.createObjectURL(blob), start: 0, duration: buffer.duration, peaks: waveformPeaks(buffer) }; });
  };

  async function pickBeat(id: string) {
    const spec = BEATS.find(b => b.id === id); if (!spec) return;
    setBusy(id); setError(null);
    try { const buffer = await renderBeat(spec, Math.max(total + 15, 30)); choose(`${spec.name} · VYZUN Beats`, buffer, audioBufferToWav(buffer)); }
    catch { setError("This beat couldn’t be created on your device."); }
    finally { setBusy(null); }
  }
  async function previewBeat(id: string) {
    const spec = BEATS.find(b => b.id === id); if (!spec) return;
    preview.current?.pause();
    const buffer = await renderBeat(spec, 6);
    const a = new Audio(URL.createObjectURL(audioBufferToWav(buffer))); preview.current = a; void a.play();
  }
  async function importAudio(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("audio/") || file.size > 30 * 1024 * 1024) { setError("Choose an audio file up to 30 MB."); return; }
    setBusy("file"); setError(null);
    try {
      const ctx = new AudioContext(); const buffer = await ctx.decodeAudioData(await file.arrayBuffer()); void ctx.close();
      choose(file.name.replace(/\.[^.]+$/, "").slice(0, 40), buffer, file);
    } catch { setError("That audio file couldn’t be read."); }
    finally { setBusy(null); if (fileInput.current) fileInput.current.value = ""; }
  }

  return (
    <div className="space-y-2">
      {music ? (
        <div className="studio-panel space-y-2 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold"><Music2 className="mr-1 inline h-3.5 w-3.5" />{music.name}</p><button onClick={() => setMusic(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; })} className="text-xs text-[var(--studio-muted)]">Remove</button></div>
          <div className="relative flex h-10 items-center gap-px" aria-hidden>
            {music.peaks.map((p, i) => {
              const t = (i / music.peaks.length) * music.duration;
              const inWindow = t >= music.start && t <= music.start + total;
              return <span key={i} className={cn("studio-wave flex-1 rounded-full", inWindow && "studio-wave-on")} style={{ height: `${Math.max(8, p * 100)}%` }} />;
            })}
          </div>
          <Slider aria-label="Trim music start" min={0} max={Math.max(0, music.duration - total)} step={0.1} value={[music.start]} onValueChange={([v]) => setMusic(prev => (prev ? { ...prev, start: v ?? 0 } : prev))} />
          <p className="text-[10px] text-[var(--studio-muted)]">Starts at {music.start.toFixed(1)}s · uses {total.toFixed(1)}s</p>
        </div>
      ) : (
        <>
          <label className="studio-panel flex items-center gap-2 rounded-full px-3 py-2"><Search className="h-4 w-4 shrink-0" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search beats" aria-label="Search music" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {beats.map(b => (
              <div key={b.id} className="studio-panel w-36 shrink-0 rounded-2xl p-2.5">
                <p className="truncate text-xs font-bold">{b.name}</p>
                <p className="truncate text-[10px] text-[var(--studio-muted)]">{b.mood} · {b.bpm} BPM</p>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => void previewBeat(b.id)} aria-label={`Preview ${b.name}`} className="studio-icon studio-icon-sm"><Play /></button>
                  <button onClick={() => void pickBeat(b.id)} disabled={!!busy} className="studio-chip flex-1 rounded-full text-[11px] font-bold">{busy === b.id ? "…" : "Use"}</button>
                </div>
              </div>
            ))}
            <button onClick={() => fileInput.current?.click()} className="studio-panel flex w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl p-2 text-[11px] font-semibold"><Upload className="h-5 w-5" />{busy === "file" ? "Reading…" : "Your audio"}</button>
            <input ref={fileInput} type="file" accept="audio/*" hidden onChange={e => void importAudio(e.target.files?.[0])} />
          </div>
          {!beats.length && <p className="text-xs text-[var(--studio-muted)]">No beats match “{query}”.</p>}
        </>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TextTool({ onAdd }: { onAdd: (o: Overlay) => void }) {
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontKey>("display");
  const [color, setColor] = useState<string>(TEXT_COLORS[0]);
  const [glow, setGlow] = useState(true);
  return (
    <div className="space-y-2">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const t = text.trim(); if (!t) return; onAdd({ id: uid(), kind: "text", content: t.slice(0, 60), x: 0.5, y: 0.4, scale: 1, font, color, glow }); setText(""); }}>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={60} placeholder="Type something…" aria-label="Overlay text" className="studio-panel min-w-0 flex-1 rounded-full px-4 py-2 text-sm outline-none" />
        <Button type="submit" variant="studioPrimary" className="rounded-full" disabled={!text.trim()}>Add</Button>
      </form>
      <div className="flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label="Font">
        {(Object.keys(FONTS) as FontKey[]).map(k => <button key={k} role="radio" aria-checked={font === k} onClick={() => setFont(k)} className="studio-chip shrink-0 rounded-full px-3 py-1 text-xs" style={{ fontFamily: FONTS[k].family, fontWeight: FONTS[k].weight }}>{FONTS[k].label}</button>)}
        <button aria-pressed={glow} onClick={() => setGlow(g => !g)} className="studio-chip shrink-0 rounded-full px-3 py-1 text-xs font-bold">Neon glow</button>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Text colour">
        {TEXT_COLORS.map(c => <button key={c} role="radio" aria-checked={color === c} aria-label={c.replace("--vz-", "").replace("--studio-", "")} onClick={() => setColor(c)} className="studio-swatch h-7 w-7 rounded-full" style={{ background: `var(${c})` }} />)}
      </div>
      <p className="text-[10px] text-[var(--studio-muted)]">Drag to move · pinch or use Size to scale</p>
    </div>
  );
}

function StickerTool({ onAdd }: { onAdd: (o: Overlay) => void }) {
  const add = (content: string, isTag: boolean) => onAdd({ id: uid(), kind: "sticker", content, x: 0.5, y: 0.55, scale: isTag ? 0.8 : 1.4, font: "display", color: isTag ? "--vz-cyan" : "--studio-white", glow: isTag });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{STICKERS.map(s => <button key={s} onClick={() => add(s, false)} aria-label={`Add ${s} sticker`} className="studio-panel grid h-11 w-11 place-items-center rounded-xl text-2xl">{s}</button>)}</div>
      <div className="flex flex-wrap gap-2">{TAG_STICKERS.map(t => <button key={t} onClick={() => add(t, true)} className="studio-chip rounded-full px-3 py-1.5 text-xs font-bold">{t}</button>)}</div>
    </div>
  );
}

/* ------------------------------ Publish ------------------------------ */

function PublishStep({ segments, filter, overlays, music, total, userId, onBack, onDone }: {
  segments: Segment[]; filter: FilterKey; overlays: Overlay[]; music: MusicChoice; total: number; userId: string | null; onBack: () => void; onDone: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [coverAt, setCoverAt] = useState(0);
  const [cover, setCover] = useState<{ blob: Blob; url: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [published, setPublished] = useState(false);
  const [pendingReelId, setPendingReelId] = useState<string | null>(null);
  const review = useServerFn(reviewMyReel);
  const queryClient = useQueryClient();
  const abort = useRef<AbortController | null>(null);
  const first = segments[0];
  const captionError = validateCaption(caption);

  useEffect(() => {
    if (!first) return;
    let alive = true;
    const t = setTimeout(() => {
      void captureCover(first, coverAt, filter, overlays).then(blob => {
        if (!alive) return;
        setCover(prev => { if (prev) URL.revokeObjectURL(prev.url); return { blob, url: URL.createObjectURL(blob) }; });
      }).catch(() => undefined);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [first, coverAt, filter, overlays]);
  useEffect(() => () => abort.current?.abort(), []);

  async function addTag() {
    const name = normalizeUsername(tagDraft);
    setTagError(null);
    if (!name) { setTagError("Usernames use letters, numbers and _ only."); return; }
    if (tags.includes(name)) { setTagDraft(""); return; }
    if (tags.length >= MAX_TAGS) { setTagError(`Tag up to ${MAX_TAGS} people.`); return; }
    const { data, error } = await supabase.from("profiles").select("username").eq("username", name).maybeSingle();
    if (error) { setTagError("Couldn’t check that username. Try again."); return; }
    if (!data) { setTagError(`@${name} isn’t on VYZUN.`); return; }
    setTags(list => [...list, name]); setTagDraft("");
  }

  async function exportVideo() {
    abort.current = new AbortController();
    setProgress(0); setStatus(null);
    try { return await renderReel({ segments, filter, overlays, music, musicVolume: 0.8, onProgress: setProgress, signal: abort.current.signal }); }
    finally { setProgress(null); }
  }

  async function saveToDevice() {
    try {
      const blob = await exportVideo();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vyzun-reel.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
      setStatus({ tone: "ok", text: "Saved to your device’s downloads." });
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setStatus({ tone: "error", text: "Export failed. Try again, or use a shorter clip." }); }
  }

  async function publish() {
    if (!userId) { setStatus({ tone: "error", text: "Sign in to publish. You can still save the Reel to your device." }); return; }
    if (captionError) { setStatus({ tone: "error", text: captionError }); return; }
    try {
      const blob = await exportVideo();
      setStatus({ tone: "ok", text: "Uploading…" });
      const id = crypto.randomUUID();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const videoPath = `${userId}/${id}.${ext}`;
      const coverPath = cover ? `${userId}/${id}.jpg` : null;
      const up = await supabase.storage.from(REEL_MEDIA_BUCKET).upload(videoPath, blob, { contentType: blob.type, upsert: false });
      if (up.error) throw up.error;
      if (cover && coverPath) { const c = await supabase.storage.from(REEL_MEDIA_BUCKET).upload(coverPath, cover.blob, { contentType: "image/jpeg" }); if (c.error) throw c.error; }
      const { error } = await supabase.from("reels").insert({
        id, creator_id: userId, caption: caption.trim(), hashtags: extractHashtags(caption), visibility: privacy, tagged_usernames: tags,
        audio_label: music?.name ?? null, duration_seconds: Math.round(total * 100) / 100, video_path: videoPath, cover_path: coverPath, is_published: true,
      });
      if (error) { await supabase.storage.from(REEL_MEDIA_BUCKET).remove([videoPath, ...(coverPath ? [coverPath] : [])]); throw error; }
      setPublished(true);
      await runReview(id);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setStatus({ tone: "error", text: "Publishing failed. Nothing was posted — please try again." });
    }
  }

  /** AI safety check: safe Reels go live instantly; failures keep the Reel pending and retryable. */
  async function runReview(id: string) {
    setPendingReelId(id);
    setStatus({ tone: "ok", text: "AI is checking your Reel…" });
    try {
      const { state } = await review({ data: { id } });
      if (state === "approved") {
        setPendingReelId(null);
        void queryClient.invalidateQueries({ queryKey: ["reel-feed"] });
        setStatus({ tone: "ok", text: privacy === "secret_drop" ? "Saved as a Secret Drop — only you can see it." : privacy === "friends" ? "Live! Your friends can see your Reel now." : "Live! Your Reel is now in the feed." });
      } else if (state === "removed") {
        setPendingReelId(null);
        setStatus({ tone: "error", text: "This Reel breaks VYZUN’s community rules, so it wasn’t posted." });
      } else {
        setStatus({ tone: "error", text: "The AI check couldn’t finish. Your Reel is saved but not live yet — tap Check again." });
      }
    } catch {
      setStatus({ tone: "error", text: "The AI check couldn’t finish. Your Reel is saved but not live yet — tap Check again." });
    }
  }

  const busy = progress !== null;
  return (
    <>
      <header className="studio-top flex items-center justify-between px-4 pb-2">
        <button onClick={onBack} disabled={busy} aria-label="Back to editing" className="studio-icon"><ArrowLeft /></button>
        <span className="text-sm font-semibold">New Reel</span>
        <span className="w-10" />
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex gap-3">
          <div className="h-64 shrink-0"><Preview segments={segments} filter={filter} overlays={overlays} music={music} playing={!busy} /></div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold">Cover</p>
            {cover ? <img src={cover.url} alt="Selected cover frame" className="studio-frame aspect-[9/16] w-20 rounded-xl object-cover" /> : <span className="studio-frame block aspect-[9/16] w-20 rounded-xl" />}
            {first?.kind === "video" && <Slider aria-label="Choose cover frame" min={0} max={Math.max(0.1, first.duration - 0.1)} step={0.1} value={[coverAt]} onValueChange={([v]) => setCoverAt(v ?? 0)} />}
            <p className="text-[10px] text-[var(--studio-muted)]">{total.toFixed(1)}s · {FILTERS[filter].label}{music ? ` · ${music.name}` : ""}</p>
          </div>
        </div>

        <div className="space-y-2">
          <textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={MAX_CAPTION + 50} rows={3} aria-label="Caption" placeholder="Write a caption… #vyzun" className="studio-panel w-full resize-none rounded-2xl p-3 text-sm outline-none" />
          <div className="flex items-center justify-between text-[10px]"><span className={cn(captionError ? "text-destructive" : "text-[var(--studio-muted)]")}>{captionError ?? `${extractHashtags(caption).length} hashtags`}</span><span className="text-[var(--studio-muted)]">{caption.length}/{MAX_CAPTION}</span></div>
          <div className="flex flex-wrap gap-1.5" aria-label="Hashtag suggestions">
            {HASHTAG_SUGGESTIONS.filter(t => !caption.toLowerCase().includes(t)).map(t => <button key={t} onClick={() => setCaption(c => `${c}${c && !c.endsWith(" ") ? " " : ""}${t} `)} className="studio-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">{t}</button>)}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold">Tag people</p>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void addTag(); }}>
            <input value={tagDraft} onChange={e => setTagDraft(e.target.value)} maxLength={31} placeholder="@username" aria-label="Tag a username" className="studio-panel min-w-0 flex-1 rounded-full px-4 py-2 text-sm outline-none" />
            <Button type="submit" variant="studio" className="rounded-full" disabled={!tagDraft.trim()}>Tag</Button>
          </form>
          {tagError && <p role="alert" className="text-xs text-destructive">{tagError}</p>}
          {tags.length > 0 && <div className="flex flex-wrap gap-1.5">{tags.map(t => <button key={t} onClick={() => setTags(list => list.filter(x => x !== t))} aria-label={`Remove @${t}`} className="studio-chip rounded-full px-2.5 py-1 text-xs">@{t} ×</button>)}</div>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold">Who can watch</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Privacy">
            {PRIVACY.map(p => <button key={p.key} role="radio" aria-checked={privacy === p.key} onClick={() => setPrivacy(p.key)} className="studio-tool flex flex-col items-center gap-0.5 rounded-2xl p-2 text-center"><span className="text-xs font-bold">{p.label}</span><span className="text-[9px] leading-tight opacity-80">{p.hint}</span></button>)}
          </div>
        </div>

        {busy && <div className="space-y-1" role="status"><div className="studio-seg-rest h-2 overflow-hidden rounded-full"><div className="studio-seg h-full rounded-full" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} /></div><div className="flex justify-between text-xs"><span>Rendering your Reel… {Math.round((progress ?? 0) * 100)}%</span><button onClick={() => abort.current?.abort()} className="font-semibold text-destructive">Cancel</button></div></div>}
        {status && <p role={status.tone === "error" ? "alert" : "status"} className={cn("text-sm", status.tone === "error" ? "text-destructive" : "text-cyan")}>{status.text}</p>}

        {published ? <div className="space-y-2">{pendingReelId && status?.tone === "error" && <Button variant="outline" onClick={() => void runReview(pendingReelId)} className="h-11 w-full rounded-full">Check again</Button>}<Button variant="studioPrimary" onClick={onDone} className="h-12 w-full rounded-full text-base">Done</Button></div> : (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="studio" onClick={() => void saveToDevice()} disabled={busy} className="h-12 rounded-full px-4" aria-label="Save to device"><Download /></Button>
            <Button variant="studioPrimary" onClick={() => void publish()} disabled={busy || !!captionError} className="h-12 rounded-full text-base">{userId ? "Publish Reel" : "Sign in to publish"}</Button>
          </div>
        )}
      </div>
    </>
  );
}
