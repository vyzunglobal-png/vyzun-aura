import { describe, expect, it } from "vitest";
import { inviteLink, normalizeInviteCode, supportMailto, SUPPORT_EMAIL } from "@/lib/vyzun-links";

describe("invite deep links and support contact", () => {
  it("builds an invite link on the running app origin", () => {
    expect(inviteLink("https://my-vyzun.lovable.app", "@AuraFan")).toBe("https://my-vyzun.lovable.app/invite/aurafan");
  });
  it("rejects invite codes with unsafe characters", () => {
    expect(normalizeInviteCode("../admin")).toBeNull();
    expect(normalizeInviteCode("a".repeat(31))).toBeNull();
  });
  it("uses the official support email", () => {
    expect(SUPPORT_EMAIL).toBe("vyzun.global@gmail.com");
    expect(supportMailto("VYZUN Help")).toBe("mailto:vyzun.global@gmail.com?subject=VYZUN%20Help");
  });
});
