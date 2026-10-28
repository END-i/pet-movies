import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest, TMDB_TTL } from '../../../../lib/tmdb';
import { tmdbLanguage } from '../../../../lib/i18n';
import { hiddenGenreIds, parseHiddenGenres } from '../../../../lib/genres';
import {
  ANIMATION_GENRE_ID,
  filterSimilar,
  MIN_SHARED_KEYWORDS,
  pickTopicKeywords,
  rankByKeywordOverlap,
  SIMILAR_LIMIT,
  toSimilarItem,
  type Keyword,
  type SimilarPayload,
  type TmdbListItem
} from '../../../../lib/similar';
import type { MediaType } from '../../../../lib/types';

// Each candidate costs one cached keywords request.
const MAX_CANDIDATES = 30;

interface SimilarSource {
  genres?: Array<{ id: number }>;
  keywords?: { keywords?: Keyword[]; results?: Keyword[] };
  recommendations?: { results?: TmdbListItem[] };
  similar?: { results?: TmdbListItem[] };
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

    const source = await tmdbRequest<SimilarSource>(
      `/${mediaType}/${id}`,
      { append_to_response: 'recommendations,similar,keywords', language },
      { ttlMs: TMDB_TTL.entity }
    );
    const isAnimation = (source.genres ?? []).some((genre) => genre.id === ANIMATION_GENRE_ID);
    const toItem = (item: TmdbListItem) =>
      toSimilarItem(item, mediaType, makeImageUrl(item.poster_path, 'w185'));

    let recommended = filterSimilar(source.recommendations?.results, {
      currentId: id,
      isAnimation,
      hiddenIds
    });
    if (recommended.length < 4) {
      recommended = filterSimilar(source.similar?.results, {
        currentId: id,
        isAnimation,
        hiddenIds
      });
    }
    recommended = recommended.slice(0, SIMILAR_LIMIT);

    // Candidates: popular titles with any of the keywords, plus TMDB's own `similar` list;
    // they are then ranked by how many keywords they really share with this title.
    const keywords = pickTopicKeywords(source.keywords?.keywords ?? source.keywords?.results);
    let topic: { items: TmdbListItem[]; keywords: string[] } = { items: [], keywords: [] };
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
      }
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
