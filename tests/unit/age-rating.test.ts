import { describe, expect, it } from 'vitest';
import { pickAgeRating } from '../../src/lib/ageRating';

describe('pickAgeRating', () => {
  it('prefers UA, then US ratings', () => {
    expect(
      pickAgeRating([
        { country: 'US', rating: 'PG-13' },
        { country: 'UA', rating: '16+' }
      ])
    ).toBe('16+');
    expect(
      pickAgeRating([
        { country: 'FR', rating: '12' },
        { country: 'US', rating: 'R' }
      ])
    ).toBe('R');
  });

  it('skips empty ratings and labels other countries', () => {
    expect(
      pickAgeRating([
        { country: 'US', rating: '' },
        { country: 'FR', rating: '12' }
      ])
    ).toBe('12 (FR)');
  });

  it('falls back to 18+ for adult titles and empty otherwise', () => {
    expect(pickAgeRating([], true)).toBe('18+');
    expect(pickAgeRating([])).toBe('');
  });
});
