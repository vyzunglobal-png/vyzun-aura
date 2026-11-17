import { useMemo, useState, type ReactNode } from "react";
import {
  AtSign,
  BadgeCheck,
  Ban,
  Bell,
  ChevronDown,
  Crown,
  Download,
  Eye,
  FileText,
  Fingerprint,
  Globe,
  Heart,
  HelpCircle,
  Info,
  KeyRound,
  Languages,
  Link2,
  LogOut,
  Moon,
  Phone,
  Play,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserCog,
  Vibrate,
  Volume2,
  Wallet2,
  X,
} from "lucide-react";
import {
  APP_VERSION,
  LANGUAGES,
  useT,
  useVyzun,
  type Audience,
  type VyzunSettings,
} from "@/lib/vyzun-store";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, savePreferences } from "@/lib/vyzun-account.functions";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL, inviteLink, supportMailto } from "@/lib/vyzun-links";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenPrime?: () => void;
  onOpenCreator?: () => void;
};

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "vibers", label: "Vibers only" },
  { key: "nobody", label: "Nobody" },
];

/* ---------- small building blocks ---------- */

function Section({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left tap active:tap-active"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-glass-border">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{title}</span>
          {subtitle && (
            <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="space-y-2 border-t border-glass-border p-4">{children}</div>}
    </section>
  );
}

function Row({
  icon,
  label,
  hint,
  right,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  right?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-glass-border px-3 py-2.5 text-left",
        onClick && "tap active:tap-active",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0 opacity-80">{icon}</span>}
        <span className="min-w-0">
          <span className="block truncate text-sm">{label}</span>
          {hint && <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>}
        </span>
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </Tag>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 rounded-full border border-glass-border transition-colors tap active:tap-active",
        on ? "bg-gradient-vyzun" : "bg-muted/40",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
          on ? "left-[1.375rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "truncate rounded-lg border border-glass-border px-2 py-1.5 text-[11px] tap active:tap-active",
            value === o.key && "bg-gradient-vyzun text-primary-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="mt-1 flex items-center gap-1 rounded-xl border border-glass-border px-3 py-2">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-sm outline-none"
        />
      </span>
    </label>
  );
}

/* ---------- main sheet ---------- */

export function SettingsSheet({ open, onClose, onOpenPrime, onOpenCreator }: Props) {
  const { state, update, reset } = useVyzun();
  const t = useT();
  const { isAuthenticated, session } = useVyzunSession();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    displayName: state.profile.displayName,
    username: state.profile.username,
    bio: state.profile.bio,
  });

  const s = state.settings;

  const setSettings = (patch: Partial<VyzunSettings>) =>
    update((prev) => ({ settings: { ...prev.settings, ...patch } }));

  const setPush = (patch: Partial<VyzunSettings["push"]>) =>
    update((prev) => ({ settings: { ...prev.settings, push: { ...prev.settings.push, ...patch } } }));

  /** Local-first; mirrored to the account when signed in. */
  const syncPrefs = (data: Record<string, unknown>) => {
    if (!isAuthenticated) return;
    void Promise.resolve(savePreferences({ data } as never)).catch(() => undefined);
  };

  const langs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? LANGUAGES.filter((l) => l.label.toLowerCase().includes(q) || l.code.includes(q))
      : LANGUAGES;
  }, [query]);

  if (!open) return null;

  const audienceRow = (
    label: string,
    hint: string,
    key: "whoCanSendSecrets" | "whoCanMessage" | "whoCanCall",
    prefKey: string,
  ) => (
    <div className="rounded-xl border border-glass-border p-3">
      <p className="text-sm">{label}</p>
      <p className="mb-2 text-[11px] text-muted-foreground">{hint}</p>
      <Segmented
        value={s[key]}
        options={AUDIENCES}
        onChange={(v) => {
          setSettings({ [key]: v } as Partial<VyzunSettings>);
          syncPrefs({ [prefKey]: v });
        }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm">
      <div className="glass-card max-h-[85vh] w-full overflow-y-auto overflow-x-hidden rounded-b-none p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold">{t("settings.title")}</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              @{state.profile.username} · {isAuthenticated ? t("settings.signedIn") : t("settings.guest")}
            </p>
          </div>
          <button onClick={onClose} aria-label={t("settings.close")} className="tap active:tap-active">
            <X className="h-5 w-5" />
          </button>
        </header>

        {notice && (
          <p className="mt-3 rounded-xl border border-glass-border px-3 py-2 text-[11px] text-muted-foreground">
            {notice}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {/* A. Account & Profile */}
          <Section
            icon={<UserCog className="h-4 w-4 text-cyan" />}
            title={t("settings.account")}
            subtitle={t("settings.accountHint")}
            defaultOpen
          >
            <Field
              label={t("settings.displayName")}
              value={draft.displayName}
              onChange={(v) => setDraft((d) => ({ ...d, displayName: v }))}
            />
            <Field
              label={t("settings.username")}
              prefix="@"
              value={draft.username}
              onChange={(v) => setDraft((d) => ({ ...d, username: v.toLowerCase() }))}
            />
            <Field
              label={t("settings.bio")}
              value={draft.bio}
              onChange={(v) => setDraft((d) => ({ ...d, bio: v }))}
              placeholder="Watch. Create. Vibe. Earn."
            />
            <button
              onClick={() => {
                update((prev) => ({
                  profile: {
                    ...prev.profile,
                    displayName: draft.displayName.trim() || prev.profile.displayName,
                    username: draft.username.trim() || prev.profile.username,
                    bio: draft.bio,
                  },
                }));
                setNotice(t("settings.profileSaved"));
              }}
              className="w-full rounded-xl bg-gradient-vyzun py-2.5 text-sm font-semibold text-primary-foreground tap active:tap-active"
            >
              {t("settings.saveProfile")}
            </button>

            <Row
              icon={<BadgeCheck className="h-4 w-4 text-cyan" />}
              label={state.profile.verified ? "VYZUN Verified" : "Request VYZUN Verified"}
              hint="Identity review — separate from VYZUN Prime"
              right={
                <span className="rounded-lg border border-glass-border px-2 py-1 text-[10px]">
                  {state.profile.verified ? "Active" : "Review"}
                </span>
              }
              onClick={() => setNotice("Verification requests open after your account is signed in and reviewed.")}
            />
            <Row
              icon={<Link2 className="h-4 w-4 text-violet" />}
              label="Linked accounts"
              hint={
                isAuthenticated
                  ? `Signed in as ${session?.user.email ?? session?.user.phone ?? "your account"}`
                  : "Upgrade guest to a full account"
              }
              right={<AtSign className="h-4 w-4 opacity-60" />}
              onClick={() => setNotice(isAuthenticated ? "Google and phone sync are managed from your account." : "Sign in from onboarding to keep your data across devices.")}
            />
            <Row
              icon={<Fingerprint className="h-4 w-4 text-magenta" />}
              label="Two-factor authentication"
              hint="Add a second step at sign-in"
              right={<span className="text-[10px] text-muted-foreground">Setup</span>}
              onClick={() => setNotice("Two-factor setup requires a signed-in account.")}
            />
            <Row
              icon={<Smartphone className="h-4 w-4 text-cyan" />}
              label="Active sessions"
              hint="Devices currently signed in"
              onClick={() => setNotice(isAuthenticated ? "This device is your current session." : "No account sessions — you're a guest on this device.")}
            />
            <Row
              icon={<KeyRound className="h-4 w-4 text-violet" />}
              label="Change password"
              onClick={() => {
                if (!session?.user.email) {
                  setNotice("Add an email to your account to set a password.");
                  return;
                }
                void supabase.auth
                  .resetPasswordForEmail(session.user.email)
                  .then(({ error }) =>
                    setNotice(error ? "Could not send the reset link." : "Password reset link sent to your email."),
                  );
              }}
            />
          </Section>

          {/* B. Prime & monetization */}
          <Section
            icon={<Crown className="h-4 w-4 text-magenta" />}
            title={t("settings.prime")}
            subtitle={t("settings.primeHint")}
          >
            <Row
              icon={<Crown className="h-4 w-4 text-magenta" />}
              label="Manage VYZUN Prime"
              hint={state.profile.prime ? "Prime active" : "₹99 / month · ₹799 / year"}
              onClick={() => {
                onClose();
                onOpenPrime?.();
              }}
            />
            <Row
              icon={<Wallet2 className="h-4 w-4 text-cyan" />}
              label="Creator Dashboard"
              hint="Real-money earnings & analytics"
              onClick={() => {
                onClose();
                onOpenCreator?.();
              }}
            />
            <Row
              icon={<Sparkles className="h-4 w-4 text-violet" />}
              label="Creator eligibility & payout settings"
              hint="Bank / UPI details and tax information"
              onClick={() => setNotice("Payout details are collected securely once a payout provider is connected.")}
            />
          </Section>

          {/* C. Privacy & safety */}
          <Section
            icon={<ShieldCheck className="h-4 w-4 text-cyan" />}
            title={t("settings.privacy")}
            subtitle={t("settings.privacyHint")}
          >
            {audienceRow(
              "Anonymous Secrets",
              "Who can send you anonymous secrets",
              "whoCanSendSecrets",
              "who_can_send_secrets",
            )}
            {audienceRow("Secret Chat & direct chats", "Who can start a chat with you", "whoCanMessage", "who_can_message")}
            {audienceRow("Calls", "Who can call you", "whoCanCall", "who_can_call")}

            <Row
              icon={<Heart className="h-4 w-4 text-magenta" />}
              label="Double-Blind Crush Matcher"
              hint="Only revealed when the crush is mutual"
              right={
                <Toggle
                  on={s.crushMatcher}
                  label="Crush Matcher"
                  onChange={(v) => setSettings({ crushMatcher: v })}
                />
              }
            />
            <Row
              icon={<Search className="h-4 w-4 text-cyan" />}
              label="Show me in search"
              right={
                <Toggle
                  on={s.searchable}
                  label="Searchable"
                  onChange={(v) => {
                    setSettings({ searchable: v });
                    syncPrefs({ searchable: v });
                  }}
                />
              }
            />
            <Row
              icon={<Eye className="h-4 w-4 text-violet" />}
              label="Read receipts"
              right={
                <Toggle
                  on={s.readReceipts}
                  label="Read receipts"
                  onChange={(v) => {
                    setSettings({ readReceipts: v });
                    syncPrefs({ read_receipts: v });
                  }}
                />
              }
            />
            <Row
              icon={<Ban className="h-4 w-4 text-destructive" />}
              label="Blocked & muted accounts"
              hint={`${s.blocked.length} blocked · ${s.muted.length} muted`}
              onClick={() => setNotice("Block or mute someone from their profile or a chat to see them listed here.")}
            />
            <Row
              icon={<Download className="h-4 w-4 text-cyan" />}
              label={t("settings.downloadData")}
              hint="Export what this device holds"
              onClick={() => {
                try {
                  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "vyzun-my-data.json";
                  a.click();
                  URL.revokeObjectURL(url);
                  setNotice("Your on-device data was exported.");
                } catch {
                  setNotice("Export is unavailable on this device.");
                }
              }}
            />
          </Section>

          {/* D. Experience */}
          <Section
            icon={<Sparkles className="h-4 w-4 text-violet" />}
            title={t("settings.experience")}
            subtitle={t("settings.experienceHint")}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  update({ theme: "dark-neon" });
                  syncPrefs({ theme: "dark-neon" });
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border border-glass-border py-2.5 text-sm tap active:tap-active",
                  state.theme === "dark-neon" && "bg-gradient-vyzun text-primary-foreground",
                )}
              >
                <Moon className="h-4 w-4" /> Dark Neon
              </button>
              <button
                onClick={() => {
                  update({ theme: "light-glass" });
                  syncPrefs({ theme: "light-glass" });
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border border-glass-border py-2.5 text-sm tap active:tap-active",
                  state.theme === "light-glass" && "bg-gradient-vyzun text-primary-foreground",
                )}
              >
                <Sun className="h-4 w-4" /> Light Glass
              </button>
            </div>

            <div className="rounded-xl border border-glass-border p-3">
              <p className="flex items-center gap-2 text-sm">
                <Languages className="h-4 w-4 text-cyan" /> {t("settings.language")}
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("settings.searchLanguages")}
                  aria-label={t("settings.searchLanguages")}
                  className="w-full min-w-0 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      update({ language: l.code });
                      syncPrefs({ app_language: l.code });
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-sm tap active:tap-active",
                      state.language === l.code && "bg-gradient-vyzun text-primary-foreground",
                    )}
                  >
                    <Globe className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate">{l.label}</span>
                  </button>
                ))}
                {langs.length === 0 && (
                  <p className="py-2 text-center text-[11px] text-muted-foreground">{t("settings.noMatch")}</p>
                )}
              </div>
            </div>

            <Row
              icon={<Play className="h-4 w-4 text-magenta" />}
              label="Autoplay Reels on cellular data"
              right={
                <Toggle
                  on={s.reelAutoplayCellular}
                  label="Autoplay on cellular"
                  onChange={(v) => {
                    setSettings({ reelAutoplayCellular: v });
                    syncPrefs({ reel_autoplay: v });
                  }}
                />
              }
            />
            <Row
              icon={<Smartphone className="h-4 w-4 text-cyan" />}
              label="Low-data saver mode"
              right={
                <Toggle
                  on={s.dataSaver}
                  label="Data saver"
                  onChange={(v) => {
                    setSettings({ dataSaver: v });
                    syncPrefs({ data_saver: v });
                  }}
                />
              }
            />
            <div className="rounded-xl border border-glass-border p-3">
              <p className="mb-2 text-sm">Video quality</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(["auto", "low", "medium", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setSettings({ videoQuality: q });
                      syncPrefs({ video_quality: q });
                    }}
                    className={cn(
                      "truncate rounded-lg border border-glass-border py-1.5 text-[11px] capitalize tap active:tap-active",
                      s.videoQuality === q && "bg-gradient-vyzun text-primary-foreground",
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <Row
              icon={<Vibrate className="h-4 w-4 text-violet" />}
              label="Haptics"
              right={<Toggle on={s.haptics} label="Haptics" onChange={(v) => setSettings({ haptics: v })} />}
            />
            <Row
              icon={<Volume2 className="h-4 w-4 text-cyan" />}
              label="UI sound effects"
              right={<Toggle on={s.uiSounds} label="UI sounds" onChange={(v) => setSettings({ uiSounds: v })} />}
            />
            <Row
              icon={<Sparkles className="h-4 w-4 text-magenta" />}
              label="Reduce motion"
              right={
                <Toggle
                  on={s.reducedMotion}
                  label="Reduce motion"
                  onChange={(v) => {
                    setSettings({ reducedMotion: v });
                    syncPrefs({ reduced_motion: v });
                  }}
                />
              }
            />
          </Section>

          {/* E. Notifications */}
          <Section
            icon={<Bell className="h-4 w-4 text-cyan" />}
            title={t("settings.notifications")}
            subtitle={t("settings.notificationsHint")}
          >
            {(
              [
                ["vibes", "Vibes & reactions"],
                ["secrets", "New secrets"],
                ["secretReplies", "Secret replies"],
                ["directMessages", "Direct messages"],
                ["calls", "Calls"],
                ["brandInvitations", "Brand invitations"],
                ["creatorEarnings", "Creator earnings"],
              ] as [keyof VyzunSettings["push"], string][]
            ).map(([key, label]) => (
              <Row
                key={key}
                label={label}
                right={
                  <Toggle
                    on={s.push[key]}
                    label={label}
                    onChange={(v) => {
                      setPush({ [key]: v } as Partial<VyzunSettings["push"]>);
                      syncPrefs({ push_enabled: Object.values({ ...s.push, [key]: v }).some(Boolean) });
                    }}
                  />
                }
              />
            ))}
          </Section>

          {/* F. Support & legal */}
          <Section
            icon={<HelpCircle className="h-4 w-4 text-violet" />}
            title={t("settings.support")}
            subtitle={t("settings.supportHint")}
          >
            <Row
              icon={<Sparkles className="h-4 w-4 text-magenta" />}
              label="Invite friends to VYZUN"
              hint={`vyzun.app/invite/${state.profile.username}`}
              onClick={async () => {
                const link = inviteLink(window.location.origin, state.profile.username);
                try {
                  if (navigator.share) await navigator.share({ title: "Join me on VYZUN", text: "Beat my Aura on VYZUN", url: link });
                  else { await navigator.clipboard.writeText(link); setNotice("Invite link copied."); }
                } catch (error) {
                  if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("Could not share. Try again.");
                }
              }}
            />
            <Row
              icon={<HelpCircle className="h-4 w-4 text-cyan" />}
              label={t("settings.help")}
              hint={SUPPORT_EMAIL}
              onClick={() => { window.location.href = supportMailto("VYZUN Help"); }}
            />
            <Row
              icon={<FileText className="h-4 w-4 text-violet" />}
              label={t("settings.report")}
              onClick={() => setNotice("Tell us what happened from the report control on any post, chat or profile.")}
            />
            <Row
              icon={<ShieldCheck className="h-4 w-4 text-cyan" />}
              label={t("settings.guidelines")}
              onClick={() => setNotice("VYZUN removes harassment, doxxing and non-original content.")}
            />
            <Row
              icon={<FileText className="h-4 w-4 text-magenta" />}
              label={t("settings.privacyPolicy")}
              hint={SUPPORT_EMAIL}
              onClick={() => { onClose(); void navigate({ to: "/privacy" }); }}
            />
            <Row
              icon={<FileText className="h-4 w-4 text-violet" />}
              label={t("settings.terms")}
              onClick={() => { onClose(); void navigate({ to: "/terms" }); }}
            />
            <Row
              icon={<Info className="h-4 w-4 text-muted-foreground" />}
              label={t("settings.version")}
              hint={`VYZUN ${APP_VERSION} · ${isAuthenticated ? "Cloud connected" : "Local device mode"}`}
            />
          </Section>

          {/* G. Account actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                void supabase.auth.signOut().then(() => {
                  onClose();
                });
              }}
              disabled={!isAuthenticated}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border border-glass-border py-2.5 text-sm tap active:tap-active",
                !isAuthenticated && "opacity-50",
              )}
            >
              <LogOut className="h-4 w-4" /> {isAuthenticated ? t("settings.logout") : t("settings.notSignedIn")}
            </button>
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="w-full rounded-xl border border-glass-border py-2.5 text-sm tap active:tap-active"
            >
              {t("settings.reset")}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/60 py-2.5 text-sm text-destructive tap active:tap-active"
            >
              <Trash2 className="h-4 w-4" /> {t("settings.delete")}
            </button>
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              Guest data stays on this device and syncs after you sign in.
            </p>
            <p className="text-center text-[11px] text-muted-foreground">
              Help, safety & privacy: <a href={supportMailto("VYZUN Support")} className="font-semibold text-cyan underline-offset-2 hover:underline">{SUPPORT_EMAIL}</a>
            </p>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-5 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-5">
            <h3 className="font-display text-base font-semibold">{t("settings.deleteTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("settings.deleteBody")}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-glass-border py-2.5 text-sm tap active:tap-active"
              >
                {t("settings.keep")}
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  if (!isAuthenticated) {
                    setConfirmDelete(false);
                    setNotice(t("settings.guestDelete"));
                    return;
                  }
                  setDeleting(true);
                  try {
                    const res = await deleteMyAccount();
                    if (!res.ok) throw new Error("delete_failed");
                    await supabase.auth.signOut().catch(() => undefined);
                    reset();
                    setConfirmDelete(false);
                    onClose();
                  } catch {
                    setNotice(t("settings.deleteFailed"));
                    setConfirmDelete(false);
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground tap active:tap-active disabled:opacity-60"
              >
                {deleting ? t("settings.deleting") : t("settings.deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
