import { describe, expect, it } from 'vitest';
import { keywordLabel, TRANSLATED_KEYWORDS } from '../../src/lib/keywords';

describe('keywordLabel', () => {
  it('translates common TMDB tags in every interface language', () => {
    expect(keywordLabel('time travel', 'uk')).toBe('подорож у часі');
    expect(keywordLabel('time travel', 'bg')).toBe('пътуване във времето');
    expect(keywordLabel('time travel', 'de')).toBe('Zeitreise');
    expect(keywordLabel('time travel', 'es')).toBe('viaje en el tiempo');
    expect(keywordLabel('time travel', 'fr')).toBe('voyage dans le temps');
  });

  it('keeps English, and any tag it does not know, as TMDB writes it', () => {
    expect(keywordLabel('time travel', 'en')).toBe('time travel');
    expect(keywordLabel('heist gone wrong', 'uk')).toBe('heist gone wrong');
    // TMDB sometimes capitalises or pads a tag.
    expect(keywordLabel(' Superhero ', 'uk')).toBe('супергерой');
  });

  it('covers the most common tags', () => {
    expect(TRANSLATED_KEYWORDS).toBeGreaterThan(130);
  });
});
