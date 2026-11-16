import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import { fr } from "@/lib/i18n/dictionaries/fr";
import type { SupportedLocale } from "@/lib/i18n/locales";

const dictionaries: Record<SupportedLocale, Dictionary> = {
  en,
  fr,
};

export function getDictionary(locale: SupportedLocale): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };
export type MessageKey = string;

/** Resolve nested key like "nav.dashboard". */
export function t(
  dictionary: Dictionary,
  path: string,
  fallback?: string,
): string {
  const parts = path.split(".");
  let current: unknown = dictionary;
  for (const part of parts) {
    if (
      current &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return fallback ?? path;
    }
  }
  return typeof current === "string" ? current : (fallback ?? path);
}
