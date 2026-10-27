import { describe, expect, it } from 'vitest';
import {
  certificationToAge,
  normalizeAgeFilter,
  pickAgeRating,
  usCertificationForFilter
} from '../../src/lib/ageRating';

describe('certificationToAge', () => {
  it('maps letter ratings onto the age scale', () => {
    expect(certificationToAge('US', 'G')).toBe('0');
    expect(certificationToAge('US', 'PG-13')).toBe('12');
    expect(certificationToAge('US', 'R')).toBe('16');
    expect(certificationToAge('US', 'TV-MA')).toBe('18');
    expect(certificationToAge('GB', '12A')).toBe('12');
    expect(certificationToAge('GB', '15')).toBe('16');
  });

  it('rounds numeric ratings up to the next step', () => {
    expect(certificationToAge('DE', '0')).toBe('0');
    expect(certificationToAge('UA', '16+')).toBe('16');
    expect(certificationToAge('FR', '10')).toBe('12');
    expect(certificationToAge('NL', '14')).toBe('16');
  });

  it('ignores unknown ratings', () => {
    expect(certificationToAge('US', 'NR')).toBeNull();
    expect(certificationToAge('US', '')).toBeNull();
  });
});

describe('pickAgeRating', () => {
  it('prefers UA, then DE, GB, US and shows ages', () => {
    expect(
      pickAgeRating([
        { country: 'US', rating: 'PG-13' },
        { country: 'UA', rating: '16+' }
      ])
    ).toBe('16+');
    expect(
      pickAgeRating([
        { country: 'US', rating: 'R' },
        { country: 'DE', rating: '12' }
      ])
    ).toBe('12+');
    expect(pickAgeRating([{ country: 'US', rating: 'PG-13' }])).toBe('12+');
  });

  it('skips empty and unknown ratings, then uses other countries', () => {
    expect(
      pickAgeRating([
        { country: 'US', rating: 'NR' },
        { country: 'UA', rating: '' },
        { country: 'FR', rating: '12' }
      ])
    ).toBe('12+');
  });

  it('falls back to 18+ for adult titles and empty otherwise', () => {
    expect(pickAgeRating([], true)).toBe('18+');
    expect(pickAgeRating([])).toBe('');
  });
});

describe('age filter', () => {
  it('converts the selected age to a US certification for TMDB', () => {
    expect(usCertificationForFilter('0')).toBe('G');
    expect(usCertificationForFilter('12')).toBe('PG-13');
    expect(usCertificationForFilter('18')).toBe('NC-17');
    expect(usCertificationForFilter('')).toBeUndefined();
    expect(usCertificationForFilter('bogus')).toBeUndefined();
  });

  it('keeps old links with US letters working', () => {
    expect(usCertificationForFilter('PG')).toBe('PG');
    expect(normalizeAgeFilter('PG-13')).toBe('12');
    expect(normalizeAgeFilter('R')).toBe('16');
    expect(normalizeAgeFilter('16')).toBe('16');
    expect(normalizeAgeFilter(null)).toBe('');
  });
});
