import { describe, expect, it } from "vitest";
import { safeSettings, settingsBool, settingsIds, settingsNumber, settingsString, settingsValue } from "@/lib/settings-utils";

describe("settings-utils", () => {
  it("returns localized values", () => {
    const settings = { titleFr: "Bonjour", titleEn: "Hello" };
    expect(settingsValue(settings, "title", "fr")).toBe("Bonjour");
    expect(settingsValue(settings, "title", "en")).toBe("Hello");
  });

  it("falls back to French", () => {
    const settings = { titleFr: "Bonjour" };
    expect(settingsValue(settings, "title", "en")).toBe("Bonjour");
  });

  it("reads strings, numbers, booleans and ids", () => {
    const settings = { url: "/booking", count: 3, enabled: true, ids: ["a", "b"] };
    expect(settingsString(settings, "url")).toBe("/booking");
    expect(settingsNumber(settings, "count", 0)).toBe(3);
    expect(settingsBool(settings, "enabled")).toBe(true);
    expect(settingsIds(settings, "ids")).toEqual(["a", "b"]);
  });

  it("parses comma-separated ids", () => {
    expect(settingsIds({ ids: "a, b ,c" }, "ids")).toEqual(["a", "b", "c"]);
  });

  it("safeSettings rejects arrays and null", () => {
    expect(safeSettings(null)).toEqual({});
    expect(safeSettings([1, 2])).toEqual({});
    expect(safeSettings({ a: 1 })).toEqual({ a: 1 });
  });
});
