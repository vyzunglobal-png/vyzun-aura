import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/vyzun/Logo";
import { INVITE_STORAGE_KEY, normalizeInviteCode } from "@/lib/vyzun-links";

export const Route = createFileRoute("/invite/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `You're invited to VYZUN by @${params.code}` },
      { name: "description", content: "Join VYZUN: scan your Aura, drop anonymous secrets and watch campus Reels." },
      { property: "og:title", content: `@${params.code} invited you to VYZUN` },
      { property: "og:description", content: "Scan your Aura, beat their score and find out who's curious about you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const inviter = normalizeInviteCode(code);

  useEffect(() => {
    if (!inviter) return;
    try { window.localStorage.setItem(INVITE_STORAGE_KEY, inviter); } catch { /* storage unavailable */ }
  }, [inviter]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-5 px-6 pb-28 text-center">
      <span className="squircle-glow grid h-20 w-20 place-items-center bg-background p-3"><Logo className="h-full w-full" /></span>
      {inviter ? (
        <>
          <h1 className="font-display text-2xl font-bold">@{inviter} invited you to <span className="text-gradient">VYZUN</span></h1>
          <p className="text-sm text-muted-foreground">Scan your face, get your 3D Aura Card and see if you can beat their Aura.</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold">This invite link isn't valid</h1>
          <p className="text-sm text-muted-foreground">You can still join VYZUN and scan your Aura.</p>
        </>
      )}
      <Button asChild className="h-12 w-full rounded-full bg-gradient-vyzun text-base font-bold text-primary-foreground">
        <Link to="/"><Sparkles />Scan my Aura</Link>
      </Button>
    </main>
  );
}
