import { writable } from 'svelte/store';
import { parseHiddenGenres } from './genres';
import { parseTranslationLanguage } from './translations';

export type ThemeMode = 'dark' | 'light';
export type LocaleMode = 'uk' | 'en';

export const THEME_STORAGE_KEY = 'pet-theme-mode';
export const LOCALE_STORAGE_KEY = 'pet-locale-mode';
export const HIDDEN_GENRES_STORAGE_KEY = 'pet-hidden-genres';
export const TRANSLATION_STORAGE_KEY = 'pet-translation-language';

const isBrowser = () => typeof window !== 'undefined';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode); the preference then lasts for this page only.
  }
}

// Read synchronously so islands render in the right language/theme from their first paint.
export const themeMode = writable<ThemeMode>(
  isBrowser() && readStorage(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
);
export const localeMode = writable<LocaleMode>(
  isBrowser() && readStorage(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'uk'
);

/** Genre keys (see `HIDEABLE_GENRES`) the user never wants to see in the catalog. */
export const hiddenGenres = writable<string[]>(
  isBrowser() ? parseHiddenGenres(readStorage(HIDDEN_GENRES_STORAGE_KEY)) : []
);

/** Language the "no translation" badge checks (see `src/lib/translations.ts`). */
export const translationPreference = writable<string>(
  parseTranslationLanguage(isBrowser() ? readStorage(TRANSLATION_STORAGE_KEY) : null)
);

let initialized = false;

export function initializePreferences() {
  if (!isBrowser() || initialized) return;
  initialized = true;

  themeMode.subscribe((mode) => {
    writeStorage(THEME_STORAGE_KEY, mode);
    document.documentElement.setAttribute('data-theme', mode);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'light' ? '#f4f6fb' : '#0b0f1a');
  });

  localeMode.subscribe((locale) => {
    writeStorage(LOCALE_STORAGE_KEY, locale);
    document.documentElement.setAttribute('lang', locale);
  });

  hiddenGenres.subscribe((keys) => writeStorage(HIDDEN_GENRES_STORAGE_KEY, keys.join(',')));
  translationPreference.subscribe((code) => writeStorage(TRANSLATION_STORAGE_KEY, code));
}
