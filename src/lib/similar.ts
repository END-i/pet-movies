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
}

export interface SimilarPayload {
  /** TMDB recommendations ("people who liked this also watched"), or `similar` as a fallback. */
  recommended: SimilarItem[];
  /** Titles sharing the most specific keywords; `keywords` are TMDB tags (English). */
  topic: { keywords: string[]; items: SimilarItem[] };
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
  'witty'
]);

/** Keywords that describe the story (TMDB lists them in no particular order). */
export function pickTopicKeywords(keywords: Keyword[] | undefined, max = 12): Keyword[] {
  return (keywords ?? [])
    .filter((keyword) => !GENERIC_KEYWORDS.has(keyword.name.trim().toLowerCase()))
    .slice(0, max);
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
): { items: TmdbListItem[]; keywords: string[] } {
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
    .map((keyword) => keyword.name.trim());

  return { items: scored.map(({ item }) => item), keywords };
}

/**
 * Same rules as the catalog: no current title, no Russian-language titles, the user's hidden
 * genres, and the format kept (cartoons stay cartoons, live action stays live action).
 */
export function filterSimilar(
  items: TmdbListItem[] | undefined,
  options: { currentId: number; isAnimation: boolean; hiddenIds: number[]; exclude?: Set<number> }
): TmdbListItem[] {
  const seen = new Set<number>([options.currentId, ...(options.exclude ?? [])]);

  return (items ?? []).filter((item) => {
    if (seen.has(item.id) || !item.poster_path) return false;
    if (item.original_language === 'ru') return false;
    const genres = item.genre_ids ?? [];
    if (genres.includes(ANIMATION_GENRE_ID) !== options.isAnimation) return false;
    if (!isGenreAllowed(genres, options.hiddenIds)) return false;
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
