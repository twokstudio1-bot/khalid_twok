import type { AppLocale } from "@/lib/i18n";

export type BlockSettings = Record<string, unknown>;

export function settingsValue(
  settings: BlockSettings,
  key: string,
  locale: AppLocale,
  fallback = "",
): string {
  const localized = settings[`${key}${locale === "fr" ? "Fr" : "En"}`];
  const french = settings[`${key}Fr`];
  const plain = settings[key];
  if (typeof localized === "string" && localized.trim()) return localized;
  if (typeof french === "string" && french.trim()) return french;
  if (typeof plain === "string") return plain;
  return fallback;
}

export function settingsString(settings: BlockSettings, key: string, fallback = "") {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

export function settingsNumber(settings: BlockSettings, key: string, fallback: number) {
  const value = settings[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

export function settingsBool(settings: BlockSettings, key: string, fallback = false) {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

export function settingsIds(settings: BlockSettings, key: string): string[] {
  const value = settings[key];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

export function safeSettings(value: unknown): BlockSettings {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as BlockSettings;
  return {};
}
