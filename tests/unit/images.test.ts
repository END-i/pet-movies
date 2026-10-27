import { describe, expect, it } from 'vitest';
import { posterSrcset, profileSrcset, resizeTmdbImage } from '../../src/lib/images';

const POSTER = 'https://image.tmdb.org/t/p/w500/abc.jpg';

describe('TMDB image helpers', () => {
  it('swaps the size segment of a TMDB URL', () => {
    expect(resizeTmdbImage(POSTER, 'w185')).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
    expect(resizeTmdbImage('https://image.tmdb.org/t/p/original/abc.jpg', 'w342')).toBe(
      'https://image.tmdb.org/t/p/w342/abc.jpg'
    );
  });

  it('leaves other URLs alone', () => {
    expect(resizeTmdbImage('/fallback-poster.svg', 'w185')).toBe('/fallback-poster.svg');
    expect(resizeTmdbImage(null, 'w185')).toBeNull();
  });

  it('builds a poster srcset, including for favorites saved with w500', () => {
    expect(posterSrcset(POSTER)).toBe(
      [
        'https://image.tmdb.org/t/p/w154/abc.jpg 154w',
        'https://image.tmdb.org/t/p/w185/abc.jpg 185w',
        'https://image.tmdb.org/t/p/w342/abc.jpg 342w',
        'https://image.tmdb.org/t/p/w500/abc.jpg 500w'
      ].join(', ')
    );
    expect(posterSrcset(null)).toBeUndefined();
    expect(posterSrcset('/fallback-poster.svg')).toBeUndefined();
  });

  it('uses only sizes TMDB serves for profile photos', () => {
    expect(profileSrcset('https://image.tmdb.org/t/p/h632/p.jpg')).toBe(
      'https://image.tmdb.org/t/p/w185/p.jpg 185w, https://image.tmdb.org/t/p/h632/p.jpg 421w'
    );
  });
});
