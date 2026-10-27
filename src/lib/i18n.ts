import type { LocaleMode } from './preferences';

/** Picks the string for the current UI locale. */
export function tr(locale: LocaleMode, uk: string, en: string): string {
  return locale === 'en' ? en : uk;
}

export function tmdbLanguage(locale: string | null | undefined): 'uk-UA' | 'en-US' {
  return locale === 'en' ? 'en-US' : 'uk-UA';
}
