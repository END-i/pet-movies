import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tmdbLanguage, tr } from '../../src/lib/i18n';
import { pwaOptions as rawOptions } from '../../pwa.config.mjs';

type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string };
const pwaOptions = rawOptions as {
  manifest: { icons: ManifestIcon[]; display: string; start_url: string };
  workbox: { navigateFallback: string | null; runtimeCaching: Array<{ handler: string }> };
};

describe('i18n helpers', () => {
  it('picks strings and TMDB language by locale', () => {
    expect(tr('uk', 'Пошук', 'Search')).toBe('Пошук');
    expect(tr('en', 'Пошук', 'Search')).toBe('Search');
    expect(tmdbLanguage('en')).toBe('en-US');
    expect(tmdbLanguage('uk')).toBe('uk-UA');
    expect(tmdbLanguage(null)).toBe('uk-UA');
  });
});

describe('PWA config', () => {
  const publicDir = path.resolve(__dirname, '../../public');

  it('declares installable icons that exist', () => {
    const { icons } = pwaOptions.manifest;
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(existsSync(path.join(publicDir, icon.src))).toBe(true);
    }
    expect(pwaOptions.manifest.display).toBe('standalone');
  });

  it('does not use a catch-all navigation fallback for server-rendered pages', () => {
    expect(pwaOptions.workbox.navigateFallback).toBeNull();
    expect(pwaOptions.workbox.runtimeCaching.map((rule) => rule.handler)).toContain('NetworkFirst');
  });
});

describe('countryName', () => {
  it('names countries in the UI language from ISO codes', async () => {
    const { countryName } = await import('../../src/lib/i18n');
    expect(countryName('US', 'uk-UA')).toBe('Сполучені Штати');
    expect(countryName('US', 'en-US')).toBe('United States');
    expect(countryName('??', 'uk-UA', 'Unknown')).toBe('Unknown');
  });
});
