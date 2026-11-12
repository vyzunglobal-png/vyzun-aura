import { describe, expect, it } from "vitest";
import { GUIDE_ANSWERS, GUIDE_STARTERS } from "@/lib/vyzun-guide";

describe("VYZUN AI onboarding guide", () => {
  it("offers exactly the three starter questions", () => {
    expect(GUIDE_STARTERS).toEqual(["How to reveal crush?", "What is Aura Score?", "How to pin on Campus Map?"]);
  });
  it("points Campus Map pinning to the map and VIP Halo actions", () => {
    expect(GUIDE_ANSWERS["How to pin on Campus Map?"].actions).toEqual(["map", "halo"]);
    expect(GUIDE_ANSWERS["How to pin on Campus Map?"].text).toContain("Pin Yours - $5");
  });
});
