import { describe, expect, it } from "vitest";
import { parseReelVerdict } from "@/lib/reel-review";

describe("AI Reel review verdict", () => {
  it("a safe Reel is approved and shows instantly", () => {
    expect(parseReelVerdict('{"allowed": true}')).toBe("approved");
    expect(parseReelVerdict('```json\n{"allowed":true}\n```')).toBe("approved");
  });
  it("an unsafe Reel is removed", () => {
    expect(parseReelVerdict('{"allowed": false}')).toBe("removed");
  });
  it("an unclear answer keeps the Reel pending instead of publishing it", () => {
    expect(parseReelVerdict("looks fine to me")).toBeNull();
    expect(parseReelVerdict('{"allowed":"yes"}')).toBeNull();
    expect(parseReelVerdict("")).toBeNull();
  });
});
