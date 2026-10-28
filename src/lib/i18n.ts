import type { LocaleMode } from './preferences';

/** Picks the string for the current UI locale. */
export function tr(locale: LocaleMode, uk: string, en: string): string {
  return locale === 'en' ? en : uk;
}

export function tmdbLanguage(locale: string | null | undefined): 'uk-UA' | 'en-US' {
  return locale === 'en' ? 'en-US' : 'uk-UA';
}

const regionNames = new Map<string, Intl.DisplayNames>();

/**
 * Country name in the UI language from its ISO code. TMDB returns production countries in English
 * whatever `language` is, so names are built from codes instead.
 */
export function countryName(code: string, language: string, fallback = code): string {
  try {
    let names = regionNames.get(language);
    if (!names) {
      names = new Intl.DisplayNames([language], { type: 'region' });
      regionNames.set(language, names);
    }
    return names.of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}
