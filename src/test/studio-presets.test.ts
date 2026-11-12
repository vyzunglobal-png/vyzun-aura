import { describe, expect, it } from "vitest";
import { DURATIONS, FILTERS, PRIVACY, extractHashtags, normalizeUsername, remainingSeconds, validateCaption, validateMediaFile } from "@/lib/studio/presets";

describe("Reel Creator Studio rules", () => {
  it("offers 15, 30 and 60 second timers", () => {
    expect([...DURATIONS]).toEqual([15, 30, 60]);
  });
  it("offers the five named filter presets", () => {
    expect(Object.values(FILTERS).map(f => f.label)).toEqual(["Original", "Cyber Neon", "Aesthetic Glow", "Vintage", "B&W", "Smooth Skin"]);
  });
  it("offers Public, Secret Drop and Friends Only privacy", () => {
    expect(PRIVACY.map(p => p.label)).toEqual(["Public", "Secret Drop", "Friends Only"]);
  });
  it("counts the time left after recorded clips", () => {
    expect(remainingSeconds(15, [4.2, 6.3])).toBe(4.5);
    expect(remainingSeconds(15, [10, 9])).toBe(0);
  });
  it("rejects captions over 500 characters or with more than 10 hashtags", () => {
    expect(validateCaption("a".repeat(501))).not.toBeNull();
    expect(validateCaption(Array.from({ length: 11 }, (_, i) => `#t${i}`).join(" "))).not.toBeNull();
    expect(validateCaption("hello #vyzun")).toBeNull();
  });
  it("pulls unique hashtags from a caption", () => {
    expect(extractHashtags("Vibes #VYZUN #vyzun #campus_life")).toEqual(["#vyzun", "#campus_life"]);
  });
  it("only accepts safe usernames for tags", () => {
    expect(normalizeUsername("@Riya_99")).toBe("riya_99");
    expect(normalizeUsername("bad name")).toBeNull();
  });
  it("limits imported videos to 100 MB and photos to 15 MB", () => {
    expect(validateMediaFile({ type: "video/mp4", size: 101 * 1024 * 1024 })).not.toBeNull();
    expect(validateMediaFile({ type: "image/png", size: 16 * 1024 * 1024 })).not.toBeNull();
    expect(validateMediaFile({ type: "application/pdf", size: 10 })).not.toBeNull();
    expect(validateMediaFile({ type: "video/webm", size: 5 * 1024 * 1024 })).toBeNull();
  });
});
