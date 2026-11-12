/** Reel studio presets and client-side validation. Browser-safe, no DOM access. */

export const DURATIONS = [15, 30, 60] as const;
export type MaxDuration = (typeof DURATIONS)[number];

export const FILTERS = {
  none: { label: "Original", css: "none" },
  cyber: { label: "Cyber Neon", css: "saturate(1.7) contrast(1.15) hue-rotate(-18deg) brightness(1.04)" },
  glow: { label: "Aesthetic Glow", css: "brightness(1.1) saturate(1.25) contrast(0.92)" },
  vintage: { label: "Vintage", css: "sepia(0.45) contrast(1.05) saturate(0.85) brightness(0.98)" },
  bw: { label: "B&W", css: "grayscale(1) contrast(1.12)" },
  smooth: { label: "Smooth Skin", css: "blur(0.6px) brightness(1.06) saturate(1.06) contrast(0.96)" },
} as const;
export type FilterKey = keyof typeof FILTERS;

export const FONTS = {
  display: { label: "Bold", family: '"Space Grotesk", ui-sans-serif, sans-serif', weight: 700 },
  sans: { label: "Clean", family: '"DM Sans", ui-sans-serif, sans-serif', weight: 600 },
  serif: { label: "Classic", family: 'Georgia, "Times New Roman", serif', weight: 700 },
  mono: { label: "Typewriter", family: "ui-monospace, Menlo, monospace", weight: 600 },
} as const;
export type FontKey = keyof typeof FONTS;

/** Overlay text colours, as CSS custom properties so they follow the design tokens. */
export const TEXT_COLORS = ["--vz-cyan", "--vz-magenta", "--vz-violet", "--vz-gold", "--studio-white"] as const;

export const STICKERS = ["🔥", "✨", "💜", "😂", "👀", "💯", "🌈", "🎧"] as const;
export const TAG_STICKERS = ["@mention", "#vyzun", "📍 Campus", "✨ Beat my Aura"] as const;

export const PRIVACY = [
  { key: "public", label: "Public", hint: "Anyone on VYZUN after review" },
  { key: "secret_drop", label: "Secret Drop", hint: "Only you until you share it" },
  { key: "friends", label: "Friends Only", hint: "People who vibe with you" },
] as const;
export type Privacy = (typeof PRIVACY)[number]["key"];

export const HASHTAG_SUGGESTIONS = ["#vyzun", "#auracheck", "#campuslife", "#vibewith", "#secretdrop", "#beatmyaura", "#neonvibes"] as const;

export const MAX_CAPTION = 500;
export const MAX_HASHTAGS = 10;
export const MAX_TAGS = 10;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const IMAGE_SEGMENT_SECONDS = 3;

export function extractHashtags(caption: string): string[] {
  const tags = caption.match(/#[\p{L}\p{N}_]{1,40}/gu) ?? [];
  return [...new Set(tags.map(tag => tag.toLowerCase()))].slice(0, MAX_HASHTAGS);
}

export function validateCaption(caption: string): string | null {
  if (caption.length > MAX_CAPTION) return `Captions can be up to ${MAX_CAPTION} characters.`;
  if ((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length > MAX_HASHTAGS) return `Use up to ${MAX_HASHTAGS} hashtags.`;
  return null;
}

export function normalizeUsername(raw: string): string | null {
  const name = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{1,30}$/.test(name) ? name : null;
}

export function validateMediaFile(file: { type: string; size: number }): string | null {
  if (file.type.startsWith("video/")) return file.size > MAX_VIDEO_BYTES ? "Videos must be 100 MB or smaller." : null;
  if (file.type.startsWith("image/")) return file.size > MAX_IMAGE_BYTES ? "Photos must be 15 MB or smaller." : null;
  return "Only videos and photos can be imported.";
}

/** Seconds still available on the timer after the recorded segments. */
export function remainingSeconds(max: number, segmentSeconds: number[]): number {
  const used = segmentSeconds.reduce((sum, s) => sum + s, 0);
  return Math.max(0, Math.round((max - used) * 10) / 10);
}
