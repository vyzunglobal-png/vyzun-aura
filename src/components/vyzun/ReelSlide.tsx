import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Flame, Heart, MessageCircle, Music2, Pause, Play, Send, ShoppingBag, Swords, UserRound, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlideReel = {
  id: string;
  caption: string;
  hashtags: string[];
  video_url: string | null;
  thumbnail_url: string | null;
  audio_label: string | null;
  creator?: { username: string; avatar_url: string | null; is_verified: boolean } | undefined;
};

type Props = {
  reel: SlideReel;
  liked: boolean;
  likeCount: string;
  muted: boolean;
  onToggleMute: () => void;
  onLike: (force?: boolean) => void;
  onFire: () => void;
  onComments: () => void;
  onShare: () => void;
  onBattle: () => void;
  onVibeWith: () => void;
  onProducts: () => void;
};

const DOUBLE_TAP_MS = 260;

/** One full-screen 9:16 reel: tap to play/pause, double-tap for a neon heart burst. */
export function ReelSlide({ reel, liked, likeCount, muted, onToggleMute, onLike, onFire, onComments, onShare, onBattle, onVibeWith, onProducts }: Props) {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [fire, setFire] = useState(false);

  // Autoplay only the reel that is on screen.
  useEffect(() => {
    const el = section.current, v = video.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && entry.intersectionRatio > 0.6) { void v.play().then(() => setPaused(false)).catch(() => setPaused(true)); }
      else { v.pause(); }
    }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current); }, []);

  function togglePlay() {
    const v = video.current;
    if (!v) return;
    if (v.paused) { void v.play().then(() => { setPaused(false); setFlash("play"); }).catch(() => undefined); }
    else { v.pause(); setPaused(true); setFlash("pause"); }
    window.setTimeout(() => setFlash(null), 700);
  }

  function onStageTap(e: PointerEvent<HTMLDivElement>) {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = 0;
      const heart = { id: now, x: e.clientX - rect.left, y: e.clientY - rect.top };
      setHearts(items => [...items, heart]);
      window.setTimeout(() => setHearts(items => items.filter(item => item.id !== heart.id)), 850);
      onLike(true);
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(togglePlay, DOUBLE_TAP_MS);
  }

  const audio = reel.audio_label?.trim() || `Original audio · @${reel.creator?.username ?? "creator"}`;

  return (
    <section ref={section} id={`reel-${reel.id}`} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden">
      <video ref={video} src={reel.video_url ?? undefined} poster={reel.thumbnail_url ?? undefined} muted={muted} loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      <div className="rv-scrim pointer-events-none absolute inset-x-0 bottom-0 h-3/5" />

      <div className="absolute inset-0" onPointerUp={onStageTap} onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePlay(); } }} role="button" aria-label={paused ? "Play Reel" : "Pause Reel"} tabIndex={0} />
      {flash && <span aria-hidden className="rv-pause-flash pointer-events-none absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-full rv-play-ring">{flash === "pause" ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}</span>}
      {paused && !flash && <span aria-hidden className="pointer-events-none absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-full rv-play-ring"><Play className="h-9 w-9" /></span>}
      {hearts.map(h => <Heart key={h.id} aria-hidden className="rv-heart-burst pointer-events-none absolute h-28 w-28 fill-current" style={{ left: h.x - 56, top: h.y - 56 }} />)}
      {fire && <span aria-hidden className="fire-burst pointer-events-none absolute inset-0 m-auto grid h-28 w-28 place-items-center text-6xl">🔥</span>}

      <button onClick={onToggleMute} aria-label={muted ? "Turn sound on" : "Mute"} className="rv-audio absolute right-3 top-[calc(max(10px,env(safe-area-inset-top))+56px)] z-10 grid h-9 w-9 place-items-center rounded-full">
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <aside className="absolute bottom-28 right-2.5 z-10 flex flex-col items-center gap-3.5" aria-label="Reel actions">
        <div className="flex flex-col items-center gap-1">
          <button className="rv-tile rv-tile-heart" aria-label="Like" aria-pressed={liked} onClick={() => onLike()}><Heart className={cn(liked && "fill-current")} /></button>
          <span className="rv-count">{likeCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="rv-tile rv-tile-fire" aria-label="Vibe fire reaction" onClick={() => { setFire(true); window.setTimeout(() => setFire(false), 800); onFire(); }}><Flame className="fill-current" /></button>
          <span className="rv-count" aria-label="Count unavailable">—</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="rv-tile rv-tile-comment" aria-label="Comments" onClick={onComments}><MessageCircle className="fill-current" /></button>
          <span className="rv-count" aria-label="Count unavailable">—</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="rv-tile rv-tile-share" aria-label="Share" onClick={onShare}><Send /></button>
          <span className="rv-count !text-xs">Share</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="rv-tile rv-tile-clash" aria-label="Aura Battle" onClick={onBattle}><Swords /></button>
          <span className="rv-count !text-xs">Battle</span>
        </div>
      </aside>

      <div className="absolute inset-x-0 bottom-24 z-10 space-y-2 pl-4 pr-20">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="rv-avatar h-11 w-11 shrink-0"><span className="rv-avatar-inner">{reel.creator?.avatar_url ? <img src={reel.creator.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="size-6" />}</span></span>
          <Link to="/profile" search={{ u: reel.creator?.username }} className="rv-text flex min-w-0 items-center gap-1 text-sm font-bold">
            <span className="truncate">@{reel.creator?.username ?? "creator"}</span>
            {reel.creator?.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-cyan" />}
          </Link>
          <button onClick={onVibeWith} className="rv-vibe h-8 shrink-0 rounded-full px-3 text-xs font-bold">+ Vibe With</button>
        </div>
        {(reel.caption || reel.hashtags.length > 0) && (
          <button onClick={() => setExpanded(v => !v)} className="rv-text block w-full text-left text-sm" aria-expanded={expanded}>
            <span className={cn(!expanded && "line-clamp-2")}>
              {reel.caption}{" "}
              {reel.hashtags.map(tag => <span key={tag} className="rv-hashtag font-semibold">{tag.startsWith("#") ? tag : `#${tag}`} </span>)}
            </span>
            {!expanded && <span className="text-xs font-semibold opacity-80">more</span>}
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="rv-audio flex min-w-0 max-w-[70%] items-center gap-2 overflow-hidden rounded-full px-3 py-1.5 text-xs">
            <Music2 className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 overflow-hidden"><span className="rv-marquee"><span>{audio}</span><span aria-hidden>{audio}</span></span></span>
            <span aria-hidden className="rv-eq flex h-3 shrink-0 items-end gap-0.5"><span /><span /><span /><span /></span>
          </span>
          <button onClick={onProducts} aria-label="Creator picks" className="rv-audio grid h-8 w-8 shrink-0 place-items-center rounded-full"><ShoppingBag className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}
