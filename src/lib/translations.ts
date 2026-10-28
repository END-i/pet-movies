// Languages the user can ask for on the "no translation" badge. TMDB only knows whether a
// title's name/description are translated — not whether there is a dub or subtitles.
export interface TranslationLanguage {
  code: string;
  badge: string;
  uk: string;
  en: string;
}

export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: 'uk', badge: 'UA', uk: 'Українська', en: 'Ukrainian' },
  { code: 'en', badge: 'EN', uk: 'Англійська', en: 'English' },
  { code: 'pl', badge: 'PL', uk: 'Польська', en: 'Polish' },
  { code: 'de', badge: 'DE', uk: 'Німецька', en: 'German' },
  { code: 'fr', badge: 'FR', uk: 'Французька', en: 'French' },
  { code: 'es', badge: 'ES', uk: 'Іспанська', en: 'Spanish' },
  { code: 'bg', badge: 'BG', uk: 'Болгарська', en: 'Bulgarian' }
];

export const DEFAULT_TRANSLATION_LANGUAGE = 'uk';

const KNOWN = new Set(TRANSLATION_LANGUAGES.map((language) => language.code));

export function parseTranslationLanguage(value: string | null | undefined): string {
  return value && KNOWN.has(value) ? value : DEFAULT_TRANSLATION_LANGUAGE;
}

export function translationLanguage(code: string): TranslationLanguage {
  return (
    TRANSLATION_LANGUAGES.find((language) => language.code === code) ?? TRANSLATION_LANGUAGES[0]
  );
}

interface TmdbTranslation {
  iso_639_1: string;
  data?: { title?: string; name?: string; overview?: string };
}

/** Codes (from `TRANSLATION_LANGUAGES`) the title has a translated name or description in. */
export function translatedLanguages(translations: TmdbTranslation[] | undefined): string[] {
  return Array.from(
    new Set(
      (translations ?? [])
        .filter(
          (translation) =>
            KNOWN.has(translation.iso_639_1) &&
            Boolean(translation.data?.title || translation.data?.name || translation.data?.overview)
        )
        .map((translation) => translation.iso_639_1)
    )
  );
}

/**
 * Missing a translation in the chosen language? Older data (favorites, cached responses) has only
 * `hasUkrainianTranslation`, which still answers for Ukrainian.
 */
export function lacksTranslation(
  item: { translations?: string[]; hasUkrainianTranslation?: boolean },
  code: string
): boolean {
  if (item.translations) return !item.translations.includes(code);
  return code === 'uk' ? item.hasUkrainianTranslation === false : false;
}
