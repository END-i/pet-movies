import { describe, expect, it } from 'vitest';
import {
  lacksTranslation,
  parseTranslationLanguage,
  translatedLanguages,
  translationLanguage
} from '../../src/lib/translations';

describe('translations', () => {
  it('lists known languages that have a translated title or description', () => {
    expect(
      translatedLanguages([
        { iso_639_1: 'uk', data: { title: 'Матриця' } },
        { iso_639_1: 'pl', data: { overview: 'Opis' } },
        { iso_639_1: 'de', data: { title: '', overview: '' } },
        { iso_639_1: 'ja', data: { title: 'マトリックス' } }
      ])
    ).toEqual(['uk', 'pl']);
  });

  it('falls back to Ukrainian for unknown stored values', () => {
    expect(parseTranslationLanguage('pl')).toBe('pl');
    expect(parseTranslationLanguage('xx')).toBe('uk');
    expect(parseTranslationLanguage(null)).toBe('uk');
    expect(translationLanguage('bg').badge).toBe('BG');
  });

  it('checks the chosen language, and old items only for Ukrainian', () => {
    expect(lacksTranslation({ translations: ['uk'] }, 'pl')).toBe(true);
    expect(lacksTranslation({ translations: ['uk', 'pl'] }, 'pl')).toBe(false);
    expect(lacksTranslation({ hasUkrainianTranslation: false }, 'uk')).toBe(true);
    expect(lacksTranslation({ hasUkrainianTranslation: false }, 'pl')).toBe(false);
  });
});
