import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/vyzun-links";

export type LegalSection = { heading: string; body: ReactNode };

/** Shared layout for the Privacy Policy and Terms of Service pages. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-glass-border bg-background/85 px-5 py-4 backdrop-blur-md">
        <Link to="/profile" search={{ u: undefined }} aria-label="Back" className="tap active:tap-active">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">{title}</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">Last updated: {updated}</p>
        <p>{intro}</p>
        {sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="font-display text-base font-semibold">{s.heading}</h2>
            <div className="space-y-2 text-muted-foreground">{s.body}</div>
          </section>
        ))}
        <section className="glass-card space-y-1 p-4">
          <h2 className="font-display text-base font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            Questions or requests: <a href={supportMailto(`VYZUN ${title}`)} className="font-semibold text-cyan underline-offset-2 hover:underline">{SUPPORT_EMAIL}</a>
          </p>
        </section>
      </main>
    </div>
  );
}
