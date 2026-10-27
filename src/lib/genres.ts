import type { MediaType } from './types';

export interface HideableGenre {
  key: string;
  uk: string;
  en: string;
  /** TMDB genre ids per media type; series use their own (often combined) genres. */
  movie: number[];
  tv: number[];
}

export const HIDEABLE_GENRES: HideableGenre[] = [
  { key: 'horror', uk: 'Жахи', en: 'Horror', movie: [27], tv: [] },
  { key: 'action', uk: 'Бойовики', en: 'Action', movie: [28], tv: [10759] },
  { key: 'romance', uk: 'Мелодрами', en: 'Romance', movie: [10749], tv: [] },
  { key: 'thriller', uk: 'Трилери', en: 'Thrillers', movie: [53], tv: [] },
  { key: 'crime', uk: 'Кримінал', en: 'Crime', movie: [80], tv: [80] },
  { key: 'war', uk: 'Військові', en: 'War', movie: [10752], tv: [10768] },
  { key: 'comedy', uk: 'Комедії', en: 'Comedy', movie: [35], tv: [35] },
  { key: 'drama', uk: 'Драми', en: 'Drama', movie: [18], tv: [18] },
  { key: 'scifi', uk: 'Фантастика', en: 'Sci-fi', movie: [878], tv: [10765] },
  { key: 'fantasy', uk: 'Фентезі', en: 'Fantasy', movie: [14], tv: [10765] },
  { key: 'documentary', uk: 'Документальні', en: 'Documentary', movie: [99], tv: [99] },
  { key: 'history', uk: 'Історичні', en: 'History', movie: [36], tv: [] },
  { key: 'western', uk: 'Вестерни', en: 'Westerns', movie: [37], tv: [37] },
  { key: 'reality', uk: 'Реаліті-шоу', en: 'Reality', movie: [], tv: [10764] }
];

const KNOWN_KEYS = new Set(HIDEABLE_GENRES.map((genre) => genre.key));

/** Parses `horror,action` (from a query string or storage) into known keys. */
export function parseHiddenGenres(value: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((key) => key.trim())
        .filter((key) => KNOWN_KEYS.has(key))
    )
  );
}

export function hiddenGenreIds(keys: string[], mediaType: MediaType): number[] {
  return Array.from(
    new Set(
      HIDEABLE_GENRES.filter((genre) => keys.includes(genre.key)).flatMap(
        (genre) => genre[mediaType]
      )
    )
  );
}

/** True when a title has none of the hidden genre ids. */
export function isGenreAllowed(genreIds: number[] | undefined, hiddenIds: number[]): boolean {
  if (!hiddenIds.length || !genreIds?.length) return true;
  return !genreIds.some((id) => hiddenIds.includes(id));
}
