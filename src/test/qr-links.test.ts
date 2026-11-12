import { describe, expect, it } from "vitest";
import { resolveScannedLink } from "@/lib/qr-links";

describe("scanned QR codes", () => {
  const origin = "https://my-vyzun.lovable.app";
  it("opens a VYZUN invite on this app", () => {
    expect(resolveScannedLink("https://my-vyzun.lovable.app/invite/aurafan", origin)).toBe("/invite/aurafan");
  });
  it("opens a vyzun.app secret drop inside the app", () => {
    expect(resolveScannedLink("https://vyzun.app/ask/@riya", origin)).toBe("/ask/@riya");
  });
  it("never opens other websites", () => {
    expect(resolveScannedLink("https://evil.example/invite/aurafan", origin)).toBeNull();
    expect(resolveScannedLink("not a link", origin)).toBeNull();
  });
});
