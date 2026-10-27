import { writable } from 'svelte/store';

export type ThemeMode = 'dark' | 'light';
export type LocaleMode = 'uk' | 'en';

export const THEME_STORAGE_KEY = 'pet-theme-mode';
export const LOCALE_STORAGE_KEY = 'pet-locale-mode';

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
}
