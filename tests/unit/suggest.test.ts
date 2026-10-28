import { describe, expect, it } from 'vitest';
import { suggestionHref, toSuggestions } from '../../src/lib/suggest';

const image = (path: string | null | undefined) => (path ? `img${path}` : null);

describe('toSuggestions', () => {
  it('maps movies, series and people and skips noise', () => {
    const suggestions = toSuggestions(
      [
        {
          id: 1,
          media_type: 'movie',
          title: 'Matrix',
          release_date: '1999-03-31',
          poster_path: '/m.jpg'
        },
        { id: 2, media_type: 'tv', name: 'Dark', first_air_date: '2017-12-01' },
        { id: 3, media_type: 'movie', title: 'Брат', original_language: 'ru' },
        { id: 4, media_type: 'person', name: 'Keanu Reeves', known_for: [{ title: 'Matrix' }] },
        { id: 5, media_type: 'person', name: 'Nobody', known_for: [] },
        { id: 6, media_type: 'collection', name: 'Matrix Collection' }
      ],
      image
    );

    expect(suggestions).toEqual([
      { kind: 'movie', id: 1, title: 'Matrix', detail: '1999', image: 'img/m.jpg' },
      { kind: 'tv', id: 2, title: 'Dark', detail: '2017', image: null },
      { kind: 'person', id: 4, title: 'Keanu Reeves', detail: 'Matrix', image: null }
    ]);
  });

  it('keeps at most eight', () => {
    const many = Array.from({ length: 20 }, (_, id) => ({
      id,
      media_type: 'movie',
      title: `T${id}`
    }));
    expect(toSuggestions(many, image)).toHaveLength(8);
  });

  it('links to the right page', () => {
    expect(suggestionHref({ kind: 'person', id: 4, title: '', detail: '', image: null })).toBe(
      '/person/4'
    );
    expect(suggestionHref({ kind: 'tv', id: 2, title: '', detail: '', image: null })).toBe(
      '/details/tv/2'
    );
  });
});

describe('toSuggestions order', () => {
  it('puts popular titles first', () => {
    const ordered = toSuggestions(
      [
        { id: 1, media_type: 'movie', title: 'Obscure', popularity: 1 },
        { id: 2, media_type: 'movie', title: 'Famous', popularity: 50 }
      ],
      image
    );
    expect(ordered.map((item) => item.id)).toEqual([2, 1]);
  });
});
