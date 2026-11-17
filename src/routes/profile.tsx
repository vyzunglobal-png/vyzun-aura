import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Crown,
  MessageCircle,
  QrCode,
  Settings,
  Sparkles,
  Gem,
  Plane,
  Video,
  Wallet2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelStudio } from "@/components/vyzun/ReelStudio";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { useT, useVyzun } from "@/lib/vyzun-store";
import { CreatorDashboardSheet } from "@/components/vyzun/CreatorDashboardSheet";
import { PrimeSheet } from "@/components/vyzun/PrimeSheet";
import { SettingsSheet } from "@/components/vyzun/SettingsSheet";
import { VibeWithButton } from "@/components/vyzun/VibeWithButton";
import { QRCodeSVG } from "qrcode.react";
import { ActionDialog } from "@/components/vyzun/ActionDialog";
import { secretDropLink } from "@/lib/vyzun-links";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>) => ({
    u: typeof search['u'] === "string" && search['u'].trim() ? String(search['u']).trim().slice(0, 30) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your VYZUN Profile — Vibers, Reels & Creator Tools" },
      {
        name: "description",
        content:
          "Manage your VYZUN identity: Vibers, Vibing, Reels, Aura Cards, Scan history, Prime and the Creator Dashboard.",
      },
      { property: "og:title", content: "Your VYZUN Profile" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Vibers, Reels, Aura Cards, Prime and real-money creator earnings on VYZUN.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state } = useVyzun();
  const { u } = Route.useSearch();
  const tr = useT();
  const [tab, setTab] = useState<"posts" | "reels" | "aura">("posts");
  const [sheet, setSheet] = useState<null | "prime" | "creator" | "settings">(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLink, setQrLink] = useState("");
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  useEffect(() => { setQrLink(secretDropLink(window.location.origin, u ?? state.profile.username)); }, [state.profile.username, u]);
  const p = state.profile;
  const isSelf = !u || u.toLowerCase() === p.username.toLowerCase();
  const viewedName = isSelf ? p.displayName : (u ?? p.username);
  const viewedHandle = isSelf ? p.username : (u ?? p.username);

  return (
    <div className="pb-28">
      <header className="mx-auto max-w-lg px-5 pt-6">
        {!isSelf && (
          <Link to="/profile" search={{ u: undefined }} className="text-xs text-muted-foreground tap active:tap-active">
            ← Back to your profile
          </Link>
        )}
        <div className="mt-2 flex items-center gap-4">
          <div className="relative">
            <span className="profile-squircle grid h-20 w-20 place-items-center rounded-3xl border-2 border-cyan bg-gradient-vyzun text-2xl font-bold text-primary-foreground">{viewedHandle[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 truncate text-xl font-semibold">
              {viewedName}
              {isSelf && p.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-cyan" />}
            </h1>
            <p className="text-sm text-muted-foreground">@{viewedHandle}</p>
            {isSelf && <p className="mt-1 text-sm">{p.bio}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            { label: tr("profile.vibers"), value: isSelf ? p.vibers : "—" },
            { label: tr("profile.vibing"), value: isSelf ? p.vibing : "—" },
            { label: tr("profile.auraCards"), value: isSelf ? state.auraCards.length : "—" },
          ].map((s) => (
            <div key={s.label} className="glass-card py-3">
              <p className="font-display text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {isSelf ? (
            <Button variant="outline" onClick={() => setSheet("settings")} className="h-11 flex-1">
              {tr("profile.edit")}
            </Button>
          ) : (
            <>
              <VibeWithButton username={viewedHandle} />
              <Button asChild variant="outline" className="flex min-w-0 flex-1"><Link to="/messages">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{tr("profile.message")}</span>
              </Link></Button>
            </>
          )}
          <Button variant="outline" onClick={() => setQrOpen(true)}
            aria-label="Share QR"
            className="grid w-11 shrink-0 place-items-center rounded-xl border border-glass-border tap active:tap-active"
          >
            <QrCode className="h-4 w-4" />
          </Button>
          {isSelf && (
            <Button variant="outline"
              onClick={() => setSheet("settings")}
              aria-label="Settings"
              className="grid w-11 shrink-0 place-items-center rounded-xl border border-glass-border tap active:tap-active"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isSelf && (
          <div className="mt-4 space-y-2" aria-label="Premium and creator tools">
            <button
              onClick={() => setSheet("prime")}
              className="settings-banner settings-banner-platinum flex w-full items-center gap-3 rounded-2xl p-3 text-left tap active:tap-active"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-gold"><Crown className="h-5 w-5 text-background" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">VYZUN Platinum Pass</span>
                <span className="block text-[11px] text-muted-foreground">$19.99 – $49.99/mo · VIP Halo, boosts, priority reveals</span>
              </span>
              <span aria-hidden className="text-gold">›</span>
            </button>
            <button
              onClick={() => setSheet("creator")}
              className="settings-banner settings-banner-creator flex w-full items-center gap-3 rounded-2xl p-3 text-left tap active:tap-active"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-vyzun"><Wallet2 className="h-5 w-5 text-primary-foreground" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{tr("profile.creatorDashboard")}</span>
                <span className="block text-[11px] text-muted-foreground">{tr("profile.creatorHint")}</span>
              </span>
              <span aria-hidden className="text-cyan">›</span>
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto mt-6 max-w-lg px-5">
        <section className="mb-5 border-y border-glass-border py-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Crown className="h-5 w-5 text-gold" />{tr("profile.trophies")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5" role="list" aria-label="Trophy badges">
            {[{ name: "Virtual Crown", price: "$49", icon: Crown }, { name: "Private Jet", price: "$199", icon: Plane }, { name: "Diamond Aura", price: "$499", icon: Gem }].map(({ name, price, icon: Icon }) => (
              <button
                key={name}
                type="button"
                role="listitem"
                aria-label={`${name} · ${price}`}
                onClick={() => setPaid({ title: name, price, description: `Send a ${name} digital gift to an eligible creator. No physical item. Gifts appear only after verified payment.` })}
                className="trophy-tile flex h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl px-1.5 text-center tap active:tap-active"
              >
                <Icon className="h-7 w-7" strokeWidth={2} />
                <span className="w-full truncate text-xs font-medium">{name}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="flex gap-2">
          {(["posts", "reels", "aura"] as const).map((t) => (
            <Button variant="outline"
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-xl border border-glass-border py-2 text-sm capitalize tap active:tap-active",
                tab === t && "bg-gradient-vyzun text-primary-foreground",
              )}
            >
              {t === "aura" ? tr("profile.auraCards") : t === "posts" ? tr("profile.posts") : tr("profile.reels")}
            </Button>
          ))}
        </div>

        {tab === "posts" && <div className="flex flex-col items-center gap-3 py-8 text-center"><MessageCircle className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">{tr("profile.postsEmpty")}</p><Button asChild className="bg-gradient-vyzun"><Link to="/secrets" search={{}}>{tr("profile.openFeed")}</Link></Button></div>}

        {tab === "reels" && (
          <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
            <Video className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">{tr("profile.reelsEmpty")}</p>
            <Button className="bg-gradient-vyzun" onClick={() => setStudioOpen(true)}>+ Create Reel</Button>
          </div>
        )}

        {tab === "aura" && (
          <div className="mt-4 space-y-2">
            {state.auraCards.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center"><Sparkles className="h-8 w-8 text-magenta" /><p className="text-sm text-muted-foreground">{tr("profile.noAura")}</p><Button asChild className="bg-gradient-vyzun"><Link to="/">{tr("profile.scanNow")}</Link></Button></div>
            )}
            {state.auraCards.map((c) => (
              <div key={c.id} className="glass-card flex items-center gap-3 p-4">
                <Sparkles className="h-5 w-5 text-magenta" />
                <div>
                  <p className="text-sm font-medium">{c.headline}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.rarity} · score {c.score} · top {c.percentile}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "aura" && state.scans.length > 0 && (
          <div className="mt-4 space-y-2">
            {state.scans.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center"><Camera className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">{tr("profile.noScans")}</p><Button asChild className="bg-gradient-vyzun"><Link to="/">{tr("scan.start")}</Link></Button></div>
            )}
            {state.scans.map((s) => (
              <div key={s.id} className="glass-card flex items-center justify-between p-4 text-sm">
                <span className="capitalize">{s.mode} scan</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

      </main>

      <ActionDialog title={qrOpen ? "Your VYZUN QR" : null} description="Share your anonymous inbox." onClose={() => setQrOpen(false)}>{qrLink && <><div className="mx-auto rounded-lg bg-primary-foreground p-4"><QRCodeSVG value={qrLink} size={200} /></div><p className="text-gradient-secret truncate text-sm font-bold">vyzun.app/ask/@{u ?? state.profile.username}</p><Button onClick={async () => { try { await navigator.clipboard.writeText(qrLink); setQrNotice("Link copied"); } catch { setQrNotice("Copy is unavailable. You can select the link above."); } }}>{tr("profile.copyLink")}</Button>{qrNotice && <p role="status" className="text-xs text-cyan">{qrNotice}</p>}</>}</ActionDialog>
      <PrimeSheet open={sheet === "prime"} onClose={() => setSheet(null)} />
      <ReelStudio open={studioOpen} onClose={() => setStudioOpen(false)} />
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
      <CreatorDashboardSheet open={sheet === "creator"} onClose={() => setSheet(null)} />
      <SettingsSheet
        open={sheet === "settings"}
        onClose={() => setSheet(null)}
        onOpenPrime={() => setSheet("prime")}
        onOpenCreator={() => setSheet("creator")}
      />

    </div>
  );
}
