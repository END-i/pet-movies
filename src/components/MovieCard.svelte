<script lang="ts">
  import { onMount } from 'svelte';
  import { addToFavorites, isInCategory, removeFromFavorites } from '../lib/favorites';
  import { localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';
  import { POSTER_SIZES, posterSrcset } from '../lib/images';
  import type { CatalogItem } from '../lib/types';
  import ReleaseBadge from './ReleaseBadge.svelte';

  export let item: CatalogItem;

  const FALLBACK_POSTER = '/fallback-poster.svg';
  const QUICK_FAVORITES_CATEGORY = 'Швидкі';

  let posterFailed = false;
  let isFavorite = false;

  $: posterSrc = !posterFailed && item.poster ? item.poster : FALLBACK_POSTER;
  $: href = `/details/${item.mediaType}/${item.id}`;
  $: showOriginal = item.originalTitle && item.originalTitle !== item.title;
  $: meta = [item.year, item.countries.slice(0, 2).join(', ')].filter(Boolean).join(' · ');

  function refreshFavoriteState() {
    isFavorite = isInCategory(QUICK_FAVORITES_CATEGORY, item.id, item.mediaType);
  }

  function toggleFavorite() {
    if (isFavorite) {
      removeFromFavorites(QUICK_FAVORITES_CATEGORY, item.id, item.mediaType);
    } else {
      addToFavorites(QUICK_FAVORITES_CATEGORY, {
        id: item.id,
        mediaType: item.mediaType,
        title: item.title,
        originalTitle: item.originalTitle,
        poster: item.poster,
        year: item.year
      });
    }

    refreshFavoriteState();
  }

  onMount(refreshFavoriteState);

  $: if (item) refreshFavoriteState();
</script>

<article class="movie-card">
  <a class="poster-link" {href} tabindex="-1" aria-hidden="true">
    <img
      src={posterSrc}
      srcset={posterFailed ? undefined : posterSrcset(item.poster)}
      sizes={POSTER_SIZES.card}
      alt=""
      loading="lazy"
      decoding="async"
      width="342"
      height="513"
      on:error={() => (posterFailed = true)}
    />
    {#if item.mediaType === 'tv'}
      <span class="type-tag">{tr($localeMode, 'Серіал', 'TV')}</span>
    {/if}
  </a>

  <div class="content">
    <h3>
      <a {href}>{item.title}</a>
    </h3>
    {#if showOriginal}
      <p class="original">{item.originalTitle}</p>
    {/if}

    <p class="meta">
      {#if item.voteCount > 0}<span class="rating">★ {item.voteAverage.toFixed(1)}</span>{/if}
      {#if meta}<span>· {meta}</span>{/if}
    </p>

    {#if item.genres.length}
      <p class="genres">{item.genres.slice(0, 3).join(' · ')}</p>
    {/if}

    {#if item.overview}
      <p class="overview">{item.overview}</p>
    {/if}

    {#if item.release || (!item.hasUkrainianTranslation && $localeMode === 'uk')}
      <p class="tags">
        <ReleaseBadge release={item.release} locale={$localeMode} />
        {#if !item.hasUkrainianTranslation && $localeMode === 'uk'}
          <span class="no-ua" title="Немає українського перекладу">
            <span aria-hidden="true">UA</span>
            <span class="visually-hidden">Немає українського перекладу</span>
          </span>
        {/if}
      </p>
    {/if}
  </div>

  <button
    type="button"
    class="fav"
    class:active={isFavorite}
    on:click={toggleFavorite}
    aria-pressed={isFavorite}
    aria-label={isFavorite
      ? tr(
          $localeMode,
          `Прибрати «${item.title}» з улюблених`,
          `Remove “${item.title}” from favorites`
        )
      : tr($localeMode, `Додати «${item.title}» в улюблені`, `Add “${item.title}” to favorites`)}
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1Z"
      />
    </svg>
  </button>
</article>

<style>
  .movie-card {
    position: relative;
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 12px;
    padding: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .poster-link {
    position: relative;
    display: block;
    align-self: start;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 10px;
    background: var(--surface-2);
  }

  .type-tag {
    position: absolute;
    left: 6px;
    bottom: 6px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 36px;
  }

  h3 {
    margin: 0;
    font-size: 1.02rem;
  }

  h3 a {
    color: var(--text);
  }

  /* Whole card is tappable through the title link. */
  h3 a::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--radius);
  }

  .original,
  .meta,
  .genres,
  .overview {
    margin: 0;
    font-size: 0.86rem;
    color: var(--muted);
  }

  .original {
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .overview {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: 2px;
  }

  .tags {
    margin: 6px 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .no-ua {
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
    text-decoration: line-through;
    text-decoration-color: var(--danger);
    text-decoration-thickness: 2px;
  }

  .fav {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 1;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .fav svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linejoin: round;
  }

  .fav.active {
    color: #ef4444;
  }

  .fav.active svg {
    fill: currentColor;
  }

  @media (min-width: 720px) {
    .movie-card {
      grid-template-columns: 120px minmax(0, 1fr);
      gap: 14px;
      padding: 12px;
    }

    h3 {
      font-size: 1.12rem;
    }
  }
</style>
