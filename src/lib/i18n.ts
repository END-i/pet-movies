import type { LocaleMode } from './preferences';
import bg from './locales/bg';
import de from './locales/de';
import es from './locales/es';
import fr from './locales/fr';

export interface LocaleOption {
  code: LocaleMode;
  /** Short label on the header switch. */
  badge: string;
  /** Language name in itself, so it can be found whatever language is on screen. */
  name: string;
  intl: string;
}

export const LOCALES: LocaleOption[] = [
  { code: 'uk', badge: 'UA', name: 'Українська', intl: 'uk-UA' },
  { code: 'en', badge: 'EN', name: 'English', intl: 'en-US' },
  { code: 'bg', badge: 'BG', name: 'Български', intl: 'bg-BG' },
  { code: 'de', badge: 'DE', name: 'Deutsch', intl: 'de-DE' },
  { code: 'es', badge: 'ES', name: 'Español', intl: 'es-ES' },
  { code: 'fr', badge: 'FR', name: 'Français', intl: 'fr-FR' }
];

/**
 * Ukrainian and English are written next to each other at every call site; the other languages
 * translate the English text (gettext-style: the English string is the key).
 * `tests/unit/locales.test.ts` checks that every dictionary covers every English string.
 */
export const DICTIONARIES: Partial<Record<LocaleMode, Record<string, string>>> = { bg, de, es, fr };

export function parseLocale(value: string | null | undefined): LocaleMode {
  return LOCALES.find((option) => option.code === value)?.code ?? 'uk';
}

/** Picks the string for the current UI locale. */
export function tr(locale: LocaleMode, uk: string, en: string): string {
  if (locale === 'uk') return uk;
  if (locale === 'en') return en;
  return DICTIONARIES[locale]?.[en] ?? en;
}

/** `tr` with `{name}` placeholders, e.g. `trf(locale, 'Анонс · {date}', 'Coming {date}', { date })`. */
export function trf(
  locale: LocaleMode,
  uk: string,
  en: string,
  values: Record<string, string | number>
): string {
  return tr(locale, uk, en).replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
}

/** BCP 47 tag for `Intl` (dates, numbers, plurals). */
export function intlLocale(locale: string | null | undefined): string {
  return LOCALES.find((option) => option.code === locale)?.intl ?? 'uk-UA';
}

/** TMDB `language` parameter: titles, descriptions and genres in the UI language. */
export function tmdbLanguage(locale: string | null | undefined): string {
  return intlLocale(locale);
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
