import { describe, expect, it } from "vitest";
import { APP_NAME, DICTIONARIES, LANGUAGES, isRtl, resolveLanguage, translate, type I18nKey } from "@/lib/i18n";

const en = DICTIONARIES.en;
const keys = Object.keys(en) as I18nKey[];

describe("i18n", () => {
  it("every listed language has a complete, non-empty translation for every key", () => {
    for (const { code } of LANGUAGES) {
      const dict = DICTIONARIES[code];
      for (const key of keys) expect(dict[key]?.trim(), `${code}:${key}`).toBeTruthy();
    }
  });

  it("keeps the app name VYZUN in English in every language", () => {
    const withName = keys.filter((k) => en[k].includes(APP_NAME));
    expect(withName.length).toBeGreaterThan(0);
    for (const { code } of LANGUAGES) {
      for (const key of withName) expect(DICTIONARIES[code][key], `${code}:${key}`).toContain("VYZUN");
    }
  });

  it("translates Hindi UI text", () => {
    expect(translate("hi", "nav.profile")).toBe("प्रोफ़ाइल");
    expect(translate("hi", "onboarding.join")).toBe("VYZUN से जुड़ें");
  });

  it("falls back to English for unknown languages and matches regional codes", () => {
    expect(resolveLanguage("xx")).toBe("en");
    expect(resolveLanguage("es-MX")).toBe("es");
    expect(translate("xx", "nav.scan")).toBe("Scan");
  });

  it("uses right-to-left only for Arabic", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("hi")).toBe(false);
  });
});
