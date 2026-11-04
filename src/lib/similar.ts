import { isGenreAllowed } from './genres';
import { isoDate, movieRelease, tvRelease, type ReleaseInfo } from './releaseStatus';
import type { MediaType } from './types';

export const ANIMATION_GENRE_ID = 16;
export const SIMILAR_LIMIT = 20;

export interface SimilarItem {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string;
  poster: string | null;
  voteAverage: number;
  release: ReleaseInfo | null;
  /** In a series list: the title whose page is open. */
  current?: boolean;
}

/** Films of one series (TMDB collection) or one shared universe (franchise keyword). */
export interface SeriesGroup {
  id: number;
  name: string;
  /** In release order; the open title is marked `current`. */
  items: SimilarItem[];
}

export interface SimilarPayload {
  /** TMDB recommendations ("people who liked this also watched"), or `similar` as a fallback. */
  recommended: SimilarItem[];
  /** Titles sharing the most specific keywords; `keywords` are TMDB tags (English). */
  topic: { keywords: Keyword[]; items: SimilarItem[] };
  /** Parts of the same film series: sequels and prequels. */
  collection: SeriesGroup | null;
  /** All titles of a shared universe, such as the Marvel Cinematic Universe. */
  universe: SeriesGroup | null;
}

export interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  genre_ids?: number[];
  original_language?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface Keyword {
  id: number;
  name: string;
}

// Tags on thousands of unrelated titles: they say how a film was made, not what it is about.
const GENERIC_KEYWORDS = new Set([
  'based on novel or book',
  'based on comic',
  'based on true story',
  'based on young adult novel',
  'based on short story',
  'based on play or musical',
  'based on tv series',
  'based on video game',
  'based on manga',
  'based on memoir or autobiography',
  'sequel',
  'prequel',
  'remake',
  'live action remake',
  'duringcreditsstinger',
  'aftercreditsstinger',
  'woman director',
  'biography',
  'anime',
  'adult animation',
  'cartoon',
  'family',
  'friendship',
  'love',
  'murder',
  'death',
  'violence',
  'revenge',
  'independent film',
  'miniseries',
  'sitcom',
  'tv movie',
  '3d animation',
  'science fiction',
  'thriller',
  'suspense',
  'allegory',
  'high concept',
  // Mood tags TMDB adds to many titles.
  'understated',
  'dignified',
  'chilling',
  'intellectual',
  'incredulous',
  'admiring',
  'amused',
  'awestruck',
  'bold',
  'cautionary',
  'comforting',
  'complicated',
  'dramatic',
  'excited',
  'hopeful',
  'inspirational',
  'joyous',
  'melancholy',
  'playful',
  'provocative',
  'sentimental',
  'tense',
  'witty',
  // More mood tags and genre names among the most common tags (counted 03.11.2026).
  'intense',
  'hilarious',
  'suspenseful',
  'cheerful',
  'complex',
  'depressing',
  'powerful',
  'absurd',
  'enthusiastic',
  'exhilarated',
  'joyful',
  'aggressive',
  'nostalgic',
  'adoring',
  'wonder',
  'appreciative',
  'intimate',
  'romantic',
  'compassionate',
  'whimsical',
  'sincere',
  'lighthearted',
  'shocking',
  'angry',
  'ambiguous',
  'earnest',
  'dreary',
  'optimistic',
  'tragic',
  'sympathetic',
  'empathetic',
  'dark',
  'horror',
  'fantasy',
  'romance',
  'adventure',
  'war',
  'musical'
]);

/** Keywords that describe the story (TMDB lists them in no particular order). */
export function pickTopicKeywords(keywords: Keyword[] | undefined, max = 12): Keyword[] {
  return (keywords ?? [])
    .filter((keyword) => !GENERIC_KEYWORDS.has(keyword.name.trim().toLowerCase()))
    .slice(0, max);
}

// Genres that set the mood of a whole title: a romance should not suggest horror, an adult drama
// not a family film. A candidate with one of these needs it on the source title too.
const MOOD_GENRES: Record<MediaType, number[]> = {
  movie: [27, 99, 10751], // Horror, Documentary, Family
  tv: [99, 10762, 10763, 10764, 10766, 10767] // Documentary, Kids, News, Reality, Soap, Talk
};

// Drama is on about half of all titles, so sharing only Drama says little. Animation is matched
// separately (cartoons stay cartoons).
const BROAD_GENRES = new Set([18, ANIMATION_GENRE_ID]);

/**
 * Whether a candidate's genres suit the source title: no mood genre the source does not have,
 * and at least one shared genre that is not Drama (or Drama itself, for a pure drama).
 * Titles with unknown genres are kept.
 */
export function genresFit(
  candidate: number[] | undefined,
  source: number[],
  mediaType: MediaType
): boolean {
  if (!source.length || !candidate?.length) return true;
  const own = new Set(source);
  if (MOOD_GENRES[mediaType].some((id) => candidate.includes(id) && !own.has(id))) return false;
  const specific = source.filter((id) => !BROAD_GENRES.has(id));
  const wanted = specific.length ? specific : source;
  return candidate.some((id) => wanted.includes(id));
}

/**
 * Genres for the "same genres" fallback when TMDB has few or no recommendations: the specific
 * genres only (not Drama or Animation), or Drama for a pure drama; at most two, so the match
 * stays close (TMDB's `with_genres` with commas means all of them).
 */
export function fallbackGenres(source: number[]): number[] {
  const specific = source.filter((id) => !BROAD_GENRES.has(id));
  return (specific.length ? specific : source.filter((id) => id !== ANIMATION_GENRE_ID)).slice(
    0,
    2
  );
}

/** A candidate needs this many keywords in common to count as "same topic". */
export const MIN_SHARED_KEYWORDS = 2;

/**
 * Orders candidates by how many keywords they share with the source title (then by vote count),
 * and names the topic by the keywords shared most often.
 */
export function rankByKeywordOverlap(
  candidates: TmdbListItem[],
  candidateKeywords: Map<number, number[]>,
  sourceKeywords: Keyword[],
  maxLabels = 3
): { items: TmdbListItem[]; keywords: Keyword[] } {
  const sourceIds = new Set(sourceKeywords.map((keyword) => keyword.id));
  const usage = new Map<number, number>();

  const scored = candidates
    .map((item) => {
      const shared = (candidateKeywords.get(item.id) ?? []).filter((id) => sourceIds.has(id));
      return { item, shared };
    })
    .filter(({ shared }) => shared.length >= MIN_SHARED_KEYWORDS)
    .sort(
      (left, right) =>
        right.shared.length - left.shared.length ||
        (right.item.vote_count ?? 0) - (left.item.vote_count ?? 0)
    );

  for (const { shared } of scored) {
    for (const id of shared) usage.set(id, (usage.get(id) ?? 0) + 1);
  }

  const keywords = sourceKeywords
    .filter((keyword) => usage.has(keyword.id))
    .sort((left, right) => (usage.get(right.id) ?? 0) - (usage.get(left.id) ?? 0))
    .slice(0, maxLabels)
    .map((keyword) => ({ id: keyword.id, name: keyword.name.trim() }));

  return { items: scored.map(({ item }) => item), keywords };
}

/**
 * Same rules as the catalog: no current title, no Russian-language titles, the user's hidden
 * genres, and the format kept (cartoons stay cartoons, live action stays live action).
 * With `genres` (the source title's), candidates must also suit them (`genresFit`).
 */
export function filterSimilar(
  items: TmdbListItem[] | undefined,
  options: {
    currentId: number;
    isAnimation: boolean;
    hiddenIds: number[];
    exclude?: Set<number>;
    genres?: { ids: number[]; mediaType: MediaType };
  }
): TmdbListItem[] {
  const seen = new Set<number>([options.currentId, ...(options.exclude ?? [])]);

  return (items ?? []).filter((item) => {
    if (seen.has(item.id) || !item.poster_path) return false;
    if (item.original_language === 'ru') return false;
    const genres = item.genre_ids ?? [];
    if (genres.includes(ANIMATION_GENRE_ID) !== options.isAnimation) return false;
    if (!isGenreAllowed(genres, options.hiddenIds)) return false;
    if (options.genres && !genresFit(genres, options.genres.ids, options.genres.mediaType)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function toSimilarItem(
  item: TmdbListItem,
  mediaType: MediaType,
  poster: string | null,
  today = isoDate(new Date())
): SimilarItem {
  const date = item.release_date ?? item.first_air_date ?? '';
  return {
    id: item.id,
    mediaType,
    title: item.title ?? item.name ?? '',
    year: date.slice(0, 4),
    poster,
    voteAverage: item.vote_average ?? 0,
    // List results carry only the premiere date, so the badge is approximate (no home release).
    release:
      mediaType === 'movie' ? movieRelease({}, date || undefined, today) : tvRelease(date, today)
  };
}

// Franchise keywords that join films of different series into one universe. TMDB has no
// "universe" object, only these tags; the names are shown as they are known in every language.
export const UNIVERSE_KEYWORDS: Record<number, string> = {
  180547: 'Marvel Cinematic Universe',
  229266: 'DC Extended Universe',
  312528: 'DC Universe',
  380322: 'MonsterVerse',
  361757: 'Middle-earth',
  379196: 'Star Wars'
};

export function findUniverse(keywords: Keyword[] | undefined): { id: number; name: string } | null {
  const match = (keywords ?? []).find((keyword) => UNIVERSE_KEYWORDS[keyword.id]);
  return match ? { id: match.id, name: UNIVERSE_KEYWORDS[match.id] } : null;
}

const releaseKey = (item: TmdbListItem) => item.release_date || item.first_air_date || '9999';

/**
 * A series list in release order (unannounced dates last), the open title marked. Russian-language
 * titles are dropped as everywhere else; hidden genres are not, so a series stays whole.
 */
export function seriesItems(
  parts: TmdbListItem[] | undefined,
  currentId: number,
  toItem: (item: TmdbListItem) => SimilarItem
): SimilarItem[] {
  const seen = new Set<number>();
  return (parts ?? [])
    .filter((item) => {
      if (seen.has(item.id) || item.original_language === 'ru') return false;
      seen.add(item.id);
      return true;
    })
    .sort((left, right) => releaseKey(left).localeCompare(releaseKey(right)))
    .map((item) => ({ ...toItem(item), ...(item.id === currentId ? { current: true } : {}) }));
}

// How TMDB ends collection names in the app's languages: "The Avengers Collection",
// "Месники | Колекція", "Отмъстителите (поредица)", "… Filmreihe", "… - Colección", "… - Saga".
const COLLECTION_SUFFIX =
  /\s*(?:[|:–-]\s*)?(?:Collection|Колекція|\(поредица\)|Filmreihe|Sammlung|Colección|Saga)\s*$/i;

/** A collection name without the "Collection" word, e.g. "Месники | Колекція" → "Месники". */
export function collectionName(name: string | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed.replace(COLLECTION_SUFFIX, '').trim() || trimmed;
}
