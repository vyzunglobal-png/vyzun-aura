import { MORNING_RITUAL_TEXT } from "@/lib/use-aura-daily";
import { useT } from "@/lib/vyzun-store";

export function DailyAuraBanner({ streak, prompt, fresh, onOpen }: { streak: number; prompt: string; fresh: boolean; onOpen: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="aura-banner mb-4 flex w-full items-center gap-3 rounded-[1.4rem] px-4 py-3 text-left tap active:tap-active"
      aria-label={t("banner.title")}
    >
      <span aria-hidden className="aura-flame-icon text-3xl">🔥</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-base font-bold">
          {t("banner.title")}
          {fresh && <span className="h-2 w-2 rounded-full bg-magenta shadow-[0_0_8px_var(--color-magenta)]" aria-label="New today" />}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {fresh ? MORNING_RITUAL_TEXT : `Aura Flame ${streak} · ${prompt}`}
        </span>
      </span>
      <span className="aura-banner-open shrink-0 rounded-full px-4 py-1.5 text-sm font-bold">{t("banner.open")}</span>
    </button>
  );
}
