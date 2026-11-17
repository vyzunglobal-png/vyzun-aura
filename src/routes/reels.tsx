import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Flame, Megaphone, MessageSquare, Plus, Search, Video, Share2, Copy, Send } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ReelSlide } from "@/components/vyzun/ReelSlide";
import { Button } from "@/components/ui/button";
import { ReelStudio } from "@/components/vyzun/ReelStudio";
import { ReelCommerce } from "@/components/vyzun/ReelCommerce";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionDialog } from "@/components/vyzun/ActionDialog";
import { withSponsoredSlots } from "@/lib/reel-ad-engine";
import { useReelFeed, type ReelCategory } from "@/lib/reel-feed";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reels")({
  validateSearch: (search: Record<string, unknown>): { reel?: string } => typeof search['reel'] === "string" && /^[a-f0-9-]{36}$/i.test(search['reel']) ? { reel: search['reel'] } : {},
  head: () => ({
    meta: [
      { title: "VYZUN Reels — Vertical Video Feed" },
      {
        name: "description",
        content:
          "Watch full-screen vertical reels on VYZUN, vibe with creators and build your audience. Comedy, trending and more.",
      },
      { property: "og:title", content: "VYZUN Reels — Vertical Video Feed" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Full-screen vertical video, VYZUN reactions and creator discovery.",
      },
    ],
  }),
  component: ReelsPage,
});

const TABS: { key: ReelCategory; label: string; flame?: boolean }[] = [
  { key: "For You", label: "For You", flame: true },
  { key: "Vibe With", label: "Vibe With" },
  { key: "Trending", label: "Trending" },
];

/** Real like counts per reel; only totals are exposed, never who liked. */
function useReelLikeCounts(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["reel-like-counts", key],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reel_like_counts", { _reel_ids: ids });
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.reel_id] = Number(row.likes);
      return counts;
    },
  });
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString("en-US");
  return String(n);
}

function ReelsPage() {
  const { reel: targetReel } = Route.useSearch();
  const { session } = useVyzunSession();
  const cache = useQueryClient();
  const [category, setCategory] = useState<ReelCategory>("For You");
  const feed = useReelFeed(category, session?.user.id, false, targetReel);
  useEffect(() => { if (targetReel && feed.data?.length) document.getElementById(`reel-${targetReel}`)?.scrollIntoView({ block: "start" }); }, [targetReel, feed.data]);
  const likeCounts = useReelLikeCounts((feed.data ?? []).map(r => r.id));
  const [studio, setStudio] = useState(false);
  const [products, setProducts] = useState(false);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [shareTarget, setShareTarget] = useState<{ id: string; videoUrl?: string | null } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [comments, setComments] = useState<string | null>(null);
  const status = (title: string, text: string) => setNotice({ title, text });

  async function like(id: string, force?: boolean) {
    if (!session) { status("Sign in", "Sign in to react to a Reel."); return; }
    if (saving[id]) return;
    const previous = liked[id] ?? false;
    if (force && previous) return;
    setLiked(value => ({ ...value, [id]: !previous })); setSaving(value => ({ ...value, [id]: true }));
    try {
      const { error } = previous ? await supabase.from("reel_reactions").delete().eq("reel_id", id).eq("user_id", session.user.id) : await supabase.from("reel_reactions").upsert({ reel_id: id, user_id: session.user.id, reaction: "vibe" }, { onConflict: "reel_id,user_id" });
      if (error) throw error;
      void cache.invalidateQueries({ queryKey: ["reel-reactions", id] });
      void cache.invalidateQueries({ queryKey: ["reel-like-counts"] });
    } catch { setLiked(value => ({ ...value, [id]: previous })); status("Reaction not saved", "The connection failed. Your reaction was rolled back."); }
    finally { setSaving(value => ({ ...value, [id]: false })); }
  }

  function reelLink(id: string) {
    const url = new URL("/reels", window.location.origin);
    url.searchParams.set("reel", id);
    return url.href;
  }

  async function shareReel(id: string) {
    try {
      if (navigator.share) await navigator.share({ title: "VYZUN Reel", url: reelLink(id) });
      else { await navigator.clipboard.writeText(reelLink(id)); status("Link copied", "Your Reel link is ready to share."); }
      setShareTarget(null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) status("Could not share", "Try copying the Reel link instead.");
    }
  }

  async function downloadReel(id: string, videoUrl?: string | null) {
    if (!videoUrl || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Download unavailable");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `vyzun-reel-${id}.mp4`;
      document.body.appendChild(a);
      a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      setShareTarget(null);
      status("Download started", "Your browser will save the video to your device’s downloads.");
    } catch { status("Download unavailable", "The video could not be downloaded. You can still share or copy its link."); }
    finally { setDownloading(false); }
  }

  const reels = feed.data ?? [];

  return (
    <div className="rv-stage fixed inset-0 flex flex-col">
      <div aria-hidden className="rv-beams" />
      <header className="rv-topbar absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pb-3">
        <button aria-label="Search Reels" title="Search Reels" className="rv-ring-btn grid h-10 w-10 shrink-0 place-items-center" onClick={() => status("Search", "Reel search opens once more creators publish. Try the For You and Trending tabs.")}><Search className="size-5" /></button>
        <nav className="rv-tabs flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full p-1" aria-label="Reel categories">
          {TABS.map(tab => <button key={tab.key} aria-pressed={category === tab.key} onClick={() => setCategory(tab.key)} className="rv-tab flex shrink-0 items-center gap-1 px-3 text-xs">
            {tab.flame && <Flame className="h-3.5 w-3.5 fill-gold text-gold" />}{tab.label}
          </button>)}
        </nav>
        <button onClick={() => setStudio(true)} aria-label="Create Reel" title="Create Reel" className="rv-ring-btn rv-create grid h-10 w-10 shrink-0 place-items-center"><Plus className="size-5" /></button>
      </header>

      <main className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {!reels.length && (
          <section className="relative flex h-[100dvh] w-full snap-start flex-col items-center justify-center gap-4 px-12 text-center">
            <span className="rv-play-ring grid h-24 w-24 place-items-center"><Video className="h-10 w-10" /></span>
            <h1 className="font-display text-lg font-semibold">{feed.isLoading ? "Loading Reels…" : feed.isError ? "Reels couldn’t load" : category === "Vibe With" && !session ? "Sign in to see Reels from people you vibe with" : "No published Reels yet"}</h1>
            {feed.isLoading ? <div role="status" className="h-2 w-40 animate-pulse rounded-full bg-muted" /> : feed.isError ? <button className="rv-refresh text-sm font-semibold" onClick={() => void feed.refetch()}>Try again</button> : <><p className="text-sm text-[var(--rv-muted)]">Be the first — record, edit and publish your Reel.</p><button onClick={() => setStudio(true)} className="rv-vibe h-11 rounded-full px-6 text-sm font-bold"><Plus className="mr-1 inline h-4 w-4" />Create Reel</button></>}
          </section>
        )}

        {withSponsoredSlots(reels).map(item => item.kind === "ad" ? (
          <section key={`ad-${item.slot}`} data-sponsored-slot={item.slot} className="relative flex h-[100dvh] snap-start flex-col items-center justify-center gap-4 px-6 pb-24 pt-28 text-center">
            <span className="text-xs text-gold">Sponsored · House promotion</span>
            <Megaphone className="h-12 w-12 text-cyan" />
            <h2 className="font-display text-xl">VYZUN for brands</h2>
            <Button onClick={() => setPaid({ title: "Native Reel Sponsorship", price: "Custom campaign quote", description: "External sponsored inventory and rewarded payouts are not connected. No cash reward is issued." })}>Explore sponsorship</Button>
          </section>
        ) : (
          <ReelSlide
            key={item.reel.id}
            reel={item.reel}
            liked={!!liked[item.reel.id]}
            likeCount={likeCounts.isSuccess ? formatCount((likeCounts.data[item.reel.id] ?? 0) + (liked[item.reel.id] ? 1 : 0)) : "—"}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            onLike={force => void like(item.reel.id, force)}
            onFire={() => status("Vibe fire 🔥", "Fire reactions are shown to the creator once reaction totals are live. No points were issued.")}
            onComments={() => setComments(item.reel.id)}
            onShare={() => setShareTarget({ id: item.reel.id, videoUrl: item.reel.video_url })}
            onBattle={() => status("Aura Battle", "A duel needs both creators’ shared Aura Cards and consent. No match was created.")}
            onVibeWith={() => status("Vibe With", "Open the creator’s profile to Vibe With them.")}
            onProducts={() => setProducts(true)}
          />
        ))}
      </main>

      <Drawer open={!!comments} onOpenChange={open => { if (!open) setComments(null); }} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[70dvh]">
          <DrawerHeader><DrawerTitle>Comments</DrawerTitle><DrawerDescription>Kind words only — every comment is moderated.</DrawerDescription></DrawerHeader>
          <div className="flex flex-col items-center gap-2 px-6 pb-4 text-center"><MessageSquare className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">No comments yet. Comments on Reels open soon.</p></div>
          <form className="flex gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onSubmit={e => { e.preventDefault(); status("Comments", "Reel comments aren’t switched on yet, so nothing was posted."); }}>
            <input aria-label="Add a comment" placeholder="Add a comment…" maxLength={300} className="min-w-0 flex-1 rounded-full border border-glass-border bg-transparent px-4 py-2 text-sm outline-none" />
            <Button type="submit" size="icon" className="rounded-full bg-gradient-secret" aria-label="Post comment"><Send /></Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Dialog open={!!shareTarget} onOpenChange={open => { if (!open) setShareTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Share / Save</DialogTitle><DialogDescription>VYZUN Reel</DialogDescription></DialogHeader>
          <Button variant="linkShare" onClick={() => { if (shareTarget) void shareReel(shareTarget.id); }}><Share2 />Share Reel</Button>
          <Button variant="outline" disabled={downloading || !shareTarget?.videoUrl} onClick={() => { if (shareTarget) void downloadReel(shareTarget.id, shareTarget.videoUrl); }}><Download />{downloading ? "Downloading…" : "Download video"}</Button>
          <Button variant="ghost" onClick={async () => { if (!shareTarget) return; try { await navigator.clipboard.writeText(reelLink(shareTarget.id)); setShareTarget(null); status("Link copied", "Your Reel link is ready to share."); } catch { status("Could not copy", "Try Share Reel instead."); } }}><Copy />Copy link</Button>
        </DialogContent>
      </Dialog>
      <ReelStudio open={studio} onClose={() => setStudio(false)} />
      <ReelCommerce open={products} onClose={() => setProducts(false)} />
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
      <ActionDialog title={notice?.title ?? null} description={notice?.text} onClose={() => setNotice(null)} />
    </div>
  );
}
