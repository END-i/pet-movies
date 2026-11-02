import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest, TMDB_TTL } from '../../../../lib/tmdb';
import { tmdbLanguage } from '../../../../lib/i18n';
import { hiddenGenreIds, parseHiddenGenres } from '../../../../lib/genres';
import {
  ANIMATION_GENRE_ID,
  collectionName,
  filterSimilar,
  findUniverse,
  MIN_SHARED_KEYWORDS,
  pickTopicKeywords,
  rankByKeywordOverlap,
  seriesItems,
  SIMILAR_LIMIT,
  toSimilarItem,
  type Keyword,
  type SeriesGroup,
  type SimilarPayload,
  type TmdbListItem
} from '../../../../lib/similar';
import type { MediaType } from '../../../../lib/types';
import type { TmdbSimilarSource } from '../../../../lib/tmdb-types';

// Each candidate costs one cached keywords request.
const MAX_CANDIDATES = 30;
// A universe list is read in release order; 3 pages = 60 titles cover the largest one (MCU).
const UNIVERSE_PAGES = 3;

type ToItem = (item: TmdbListItem) => SeriesGroup['items'][number];

/** The film series (sequels, prequels) from TMDB's collection, if the film belongs to one. */
async function loadCollection(
  collectionId: number | undefined,
  currentId: number,
  language: string,
  toItem: ToItem
): Promise<SeriesGroup | null> {
  if (!collectionId) return null;
  const data = await tmdbRequest<{ id: number; name?: string; parts?: TmdbListItem[] }>(
    `/collection/${collectionId}`,
    { language },
    { ttlMs: TMDB_TTL.entity }
  ).catch(() => null);
  const items = seriesItems(data?.parts, currentId, toItem);
  return data && items.length > 1
    ? { id: collectionId, name: collectionName(data.name), items }
    : null;
}

/** Every feature-length title tagged with the universe keyword, in release order. */
async function loadUniverse(
  universe: { id: number; name: string } | null,
  mediaType: MediaType,
  currentId: number,
  language: string,
  toItem: ToItem
): Promise<SeriesGroup | null> {
  if (!universe) return null;
  const pages = await Promise.all(
    Array.from({ length: UNIVERSE_PAGES }, (_, index) =>
      tmdbRequest<{ results?: TmdbListItem[]; total_pages?: number }>(
        `/discover/${mediaType}`,
        {
          with_keywords: universe.id,
          sort_by: mediaType === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc',
          // One-shots and making-of films carry the tag too.
          'with_runtime.gte': mediaType === 'movie' ? 60 : undefined,
          without_genres: 99,
          page: index + 1,
          language
        },
        { ttlMs: TMDB_TTL.entity }
      ).catch(() => ({ results: [] }))
    )
  );
  const items = seriesItems(
    pages.flatMap((page) => page.results ?? []),
    currentId,
    toItem
  );
  return items.length > 1 ? { ...universe, items } : null;
}

export const GET: APIRoute = async ({ params, url }) => {
  const mediaType = params.mediaType as MediaType;
  const id = Number(params.id);

  if (!['movie', 'tv'].includes(mediaType) || Number.isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Некоректні параметри' }), { status: 400 });
  }

  try {
    const language = tmdbLanguage(url.searchParams.get('locale'));
    const hiddenIds = hiddenGenreIds(
      parseHiddenGenres(url.searchParams.get('hideGenres')),
      mediaType
    );

    const source = await tmdbRequest<TmdbSimilarSource>(
      `/${mediaType}/${id}`,
      { append_to_response: 'recommendations,similar,keywords', language },
      { ttlMs: TMDB_TTL.entity }
    );
    const genreIds = (source.genres ?? []).map((genre) => genre.id);
    const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
    const genres = { ids: genreIds, mediaType };
    const toItem = (item: TmdbListItem) =>
      toSimilarItem(item, mediaType, makeImageUrl(item.poster_path, 'w185'));

    // Recommendations first; `similar` (noisier) only tops up a short list. Both must suit the
    // title's genres, so a melodrama does not get horror.
    let recommended = filterSimilar(source.recommendations?.results, {
      currentId: id,
      isAnimation,
      hiddenIds,
      genres
    });
    if (recommended.length < 4) {
      recommended = filterSimilar(
        [...(source.recommendations?.results ?? []), ...(source.similar?.results ?? [])],
        { currentId: id, isAnimation, hiddenIds, genres }
      );
    }
    recommended = recommended.slice(0, SIMILAR_LIMIT);

    const allKeywords = source.keywords?.keywords ?? source.keywords?.results;
    const [collection, universe] = await Promise.all([
      loadCollection(source.belongs_to_collection?.id, id, language, toItem),
      loadUniverse(findUniverse(allKeywords), mediaType, id, language, toItem)
    ]);

    // Candidates: popular titles with any of the keywords, plus TMDB's own `similar` list;
    // they are then ranked by how many keywords they really share with this title.
    const keywords = pickTopicKeywords(allKeywords);
    let topic: { items: TmdbListItem[]; keywords: Keyword[] } = { items: [], keywords: [] };
    if (keywords.length >= MIN_SHARED_KEYWORDS) {
      const discovered = await tmdbRequest<{ results?: TmdbListItem[] }>(
        `/discover/${mediaType}`,
        {
          with_keywords: keywords.map((keyword) => keyword.id).join('|'),
          sort_by: 'vote_count.desc',
          language
        },
        { ttlMs: TMDB_TTL.entity }
      );
      const candidates = filterSimilar(
        [...(discovered.results ?? []), ...(source.similar?.results ?? [])],
        {
          currentId: id,
          isAnimation,
          hiddenIds,
          genres,
          exclude: new Set(recommended.map((item) => item.id))
        }
      ).slice(0, MAX_CANDIDATES);

      const candidateKeywords = new Map(
        await Promise.all(
          candidates.map(async (item) => {
            const data = await tmdbRequest<{ keywords?: Keyword[]; results?: Keyword[] }>(
              `/${mediaType}/${item.id}/keywords`,
              {},
              { ttlMs: TMDB_TTL.entity }
            ).catch(() => ({}) as { keywords?: Keyword[]; results?: Keyword[] });
            return [
              item.id,
              (data.keywords ?? data.results ?? []).map((keyword) => keyword.id)
            ] as const;
          })
        )
      );
      topic = rankByKeywordOverlap(candidates, candidateKeywords, keywords);
      topic.items = topic.items.slice(0, SIMILAR_LIMIT);
    }

    const payload: SimilarPayload = {
      recommended: recommended.map(toItem),
      topic: {
        keywords: topic.items.length ? topic.keywords : [],
        items: topic.items.map(toItem)
      },
      collection,
      // A universe that adds nothing to the series list is not shown twice.
      universe:
        universe && universe.items.length > (collection?.items.length ?? 1) ? universe : null
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Помилка завантаження схожих'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
