<script lang="ts">
  import { PUBLIC_DEBUG_LOGS } from 'astro:env/client';
  import { onMount, untrack } from 'svelte';
  import { get } from 'svelte/store';
  import {
    addToFavorites,
    categoriesContaining,
    DEFAULT_FAVORITES_CATEGORY,
    listCategories,
    loadFavorites,
    removeFromFavorites,
    toggleFavorite
  } from '../lib/favorites';
  import {
    hiddenGenres,
    localeMode,
    translationPreference,
    type LocaleMode
  } from '../lib/preferences';
  import {
    lacksTranslation,
    missingTranslationLabel,
    translationLanguage
  } from '../lib/translations';
  import { intlLocale, tr } from '../lib/i18n';
  import { POSTER_SIZES, posterSrcset } from '../lib/images';
  import type { MovieDetails } from '../lib/types';
  import type { SimilarPayload } from '../lib/similar';
  import ReleaseBadge from './ReleaseBadge.svelte';
  import { episodesLabel, runtimeLabel, seasonsLabel } from '../lib/series';

  const CLIENT_DEBUG = PUBLIC_DEBUG_LOGS;

  interface Props {
    mediaType: 'movie' | 'tv';
    id: number;
  }

  let { mediaType, id }: Props = $props();

  let details: MovieDetails | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let categories: string[] = $state([]);
  let savedIn: string[] = $state([]);
  let newCategory = $state('');
  let showTrailer = $state(false);
  let loadedLocale = $state('');
  let similar: SimilarPayload | null = $state(null);

  let locale = $derived($localeMode);
  let showOriginal = $derived(details?.originalTitle && details.originalTitle !== details.title);
  let dateLocale = $derived(intlLocale(locale));

  function formatDay(value: string): string {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function formatMoney(value: number): string {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  async function loadDetails() {
    loading = true;
    error = '';
    loadedLocale = get(localeMode);

    try {
      const response = await fetch(`/api/details/${mediaType}/${id}.json?locale=${loadedLocale}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          payload?.error ??
            tr(
              loadedLocale as LocaleMode,
              'Не вдалося завантажити деталі',
              'Failed to load details'
            )
        );
      }
      details = (await response.json()) as MovieDetails;
      if (CLIENT_DEBUG) {
        console.log('[BROWSER][details][response]', details);
      }
      void loadSimilar();
    } catch (err) {
      error = !navigator.onLine
        ? tr(get(localeMode), 'Немає з’єднання з інтернетом', 'You are offline')
        : err instanceof Error
          ? err.message
          : tr(get(localeMode), 'Невідома помилка', 'Unknown error');
    } finally {
      loading = false;
    }
  }

  // Loaded after the details so the page is never slower because of them; failures just hide the rows.
  async function loadSimilar() {
    similar = null;
    const params = new URLSearchParams({
      locale: loadedLocale,
      hideGenres: get(hiddenGenres).join(',')
    });
    try {
      const response = await fetch(`/api/similar/${mediaType}/${id}.json?${params}`);
      if (response.ok) similar = (await response.json()) as SimilarPayload;
    } catch {
      similar = null;
    }
  }

  function refreshFavorites() {
    categories = listCategories(loadFavorites());
    if (!categories.includes(DEFAULT_FAVORITES_CATEGORY)) {
      categories = [DEFAULT_FAVORITES_CATEGORY, ...categories];
    }
    savedIn = categoriesContaining(id, mediaType);
  }

  function toggleCategory(category: string) {
    if (!details) return;

    if (savedIn.includes(category)) {
      removeFromFavorites(category, details.id, details.mediaType);
    } else {
      addToFavorites(category, {
        id: details.id,
        mediaType: details.mediaType,
        title: details.title,
        originalTitle: details.originalTitle,
        poster: details.poster,
        year: details.year
      });
    }

    refreshFavorites();
  }

  function toggleHeart() {
    if (!details) return;
    toggleFavorite({
      id: details.id,
      mediaType: details.mediaType,
      title: details.title,
      originalTitle: details.originalTitle,
      poster: details.poster,
      year: details.year
    });
    refreshFavorites();
  }

  function createCategory() {
    const value = newCategory.trim();
    if (!value || !details) return;

    newCategory = '';
    if (!savedIn.includes(value)) {
      toggleCategory(value);
    }
  }

  async function share() {
    if (!details) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: details.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // User cancelled the share sheet.
    }
  }

  function goBack() {
    if (history.length > 1 && document.referrer.startsWith(location.origin)) {
      history.back();
    } else {
      location.href = '/';
    }
  }

  onMount(() => {
    refreshFavorites();
    void loadDetails();
  });

  // Reload in the new language; the load itself must not become a dependency.
  $effect(() => {
    if (loadedLocale && $localeMode !== loadedLocale && !loading) {
      untrack(() => void loadDetails());
    }
  });
</script>

<main class="details-page">
  {#if loading}
    <div class="skeleton hero-skeleton"></div>
    <div class="page"><div class="skeleton" style="height: 140px"></div></div>
  {:else if error || !details}
    <div class="page">
      <button type="button" class="btn back-inline" onclick={goBack}
        >← {tr(locale, 'Назад', 'Back')}</button
      >
      <div class="panel">
        <p class="error">{error || tr(locale, 'Деталі не знайдено', 'Details not found')}</p>
        <button type="button" class="btn" onclick={loadDetails}
          >{tr(locale, 'Спробувати знову', 'Try again')}</button
        >
      </div>
    </div>
  {:else}
    <section class="hero" style={details.backdrop ? `--backdrop:url('${details.backdrop}')` : ''}>
      <div class="hero-top">
        <button
          type="button"
          class="round-btn"
          onclick={goBack}
          aria-label={tr(locale, 'Назад', 'Back')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
            ><path d="M15 5l-7 7 7 7" /></svg
          >
        </button>
        <div class="hero-actions">
          <button
            type="button"
            class="round-btn heart"
            class:active={savedIn.length > 0}
            onclick={toggleHeart}
            aria-pressed={savedIn.length > 0}
            aria-label={savedIn.length
              ? tr(locale, 'Прибрати з улюблених', 'Remove from favorites')
              : tr(locale, 'Додати в улюблені', 'Add to favorites')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1Z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="round-btn"
            onclick={share}
            aria-label={tr(locale, 'Поділитися', 'Share')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
            </svg>
          </button>
        </div>
      </div>

      <div class="hero-main">
        <img
          class="poster"
          src={details.poster ?? '/fallback-poster.svg'}
          srcset={posterSrcset(details.poster)}
          sizes={POSTER_SIZES.details}
          alt={details.title}
          width="342"
          height="513"
        />
        <div class="hero-info">
          <h1>{details.title}</h1>
          {#if showOriginal}
            <p class="original">{details.originalTitle}</p>
          {/if}
          <p class="facts">
            {#if details.voteAverage}<span class="rating">★ {details.voteAverage.toFixed(1)}</span
              >{/if}
            {#if details.year}<span>{details.year}</span>{/if}
            {#if details.ageRating}<span class="age">{details.ageRating}</span>{/if}
            {#if runtimeLabel(details.runtime, locale)}<span
                >{runtimeLabel(details.runtime, locale)}{details.mediaType === 'tv'
                  ? tr(locale, ' / серія', ' / ep')
                  : ''}</span
              >{/if}
            <span
              >{details.mediaType === 'tv'
                ? tr(locale, 'Серіал', 'Series')
                : tr(locale, 'Фільм', 'Movie')}</span
            >
          </p>
          {#if details.countries.length}
            <p class="muted small">{details.countries.join(', ')}</p>
          {/if}
          {#if details.release || details.series?.status}
            <p class="release-row">
              <ReleaseBadge release={details.release} series={details.series} {locale} long />
            </p>
          {/if}
        </div>
      </div>
    </section>

    <div class="page">
      {#if details.genres.length}
        <div class="genre-list">
          {#each details.genres as genre (genre)}
            <span class="genre">{genre}</span>
          {/each}
        </div>
      {/if}

      {#if lacksTranslation(details, $translationPreference)}
        {@const language = translationLanguage($translationPreference)}
        <span class="no-translation">
          {missingTranslationLabel(language, locale)}
        </span>
      {/if}

      {#if details.tagline}
        <p class="tagline">«{details.tagline}»</p>
      {/if}

      <p class="overview">
        {details.overview || tr(locale, 'Опис поки відсутній.', 'No description yet.')}
      </p>

      <p class="muted small stats">
        {details.voteCount.toLocaleString(dateLocale)}
        {tr(locale, 'оцінок', 'votes')}
        {#if details.imdbId}
          · <a
            href={`https://www.imdb.com/title/${details.imdbId}`}
            target="_blank"
            rel="noreferrer">IMDb ↗</a
          >
        {/if}
      </p>

      {#if details.makers?.length || details.series || details.networks?.length || details.budget || details.revenue}
        <dl class="info">
          {#if details.makers?.length}
            <dt>
              {details.mediaType === 'tv'
                ? tr(locale, 'Творці', 'Created by')
                : tr(locale, 'Режисер', 'Director')}
            </dt>
            <dd>
              {#each details.makers as maker, index (maker.id)}{index ? ', ' : ''}<a
                  href={`/person/${maker.id}`}>{maker.name}</a
                >{/each}
            </dd>
          {/if}
          {#if details.series?.seasons}
            <dt>{tr(locale, 'Сезони', 'Seasons')}</dt>
            <dd>
              {[
                seasonsLabel(details.series.seasons, locale),
                details.series.episodes ? episodesLabel(details.series.episodes, locale) : ''
              ]
                .filter(Boolean)
                .join(' · ')}
            </dd>
          {/if}
          {#if details.series?.nextEpisode}
            <dt>{tr(locale, 'Наступна серія', 'Next episode')}</dt>
            <dd>{formatDay(details.series.nextEpisode)}</dd>
          {/if}
          {#if details.networks?.length}
            <dt>{tr(locale, 'Канал', 'Network')}</dt>
            <dd>{details.networks.join(', ')}</dd>
          {/if}
          {#if details.budget}
            <dt>{tr(locale, 'Бюджет', 'Budget')}</dt>
            <dd>{formatMoney(details.budget)}</dd>
          {/if}
          {#if details.revenue}
            <dt>{tr(locale, 'Збори', 'Box office')}</dt>
            <dd>{formatMoney(details.revenue)}</dd>
          {/if}
        </dl>
      {/if}

      {#if details.watch}
        <section class="watch" aria-labelledby="watch-title">
          <h2 id="watch-title" class="section-title">
            {tr(locale, 'Де подивитися в Україні', 'Where to watch in Ukraine')}
          </h2>
          {#each [{ list: details.watch.stream, uk: 'За підпискою', en: 'Subscription' }, { list: details.watch.rent, uk: 'Оренда', en: 'Rent' }, { list: details.watch.buy, uk: 'Купівля', en: 'Buy' }] as group (group.en)}
            {#if group.list.length}
              <div class="watch-group">
                <span class="muted small">{tr(locale, group.uk, group.en)}</span>
                <div class="providers">
                  {#each group.list as provider (provider.id)}
                    <a
                      class="provider"
                      href={details.watch.link}
                      target="_blank"
                      rel="noreferrer"
                      title={provider.name}
                    >
                      {#if provider.logo}
                        <img src={provider.logo} alt="" width="40" height="40" loading="lazy" />
                      {/if}
                      <span>{provider.name}</span>
                    </a>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
          <p class="muted small">{tr(locale, 'Дані: JustWatch', 'Data: JustWatch')}</p>
        </section>
      {/if}

      {#if details.seasons?.length}
        <details class="panel seasons">
          <summary>
            {tr(locale, 'Сезони', 'Seasons')} · {details.seasons.length}
          </summary>
          <ul>
            {#each details.seasons as season (season.number)}
              <li>
                <span>{season.name}</span>
                <span class="muted small">
                  {[season.year, season.episodes ? episodesLabel(season.episodes, locale) : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            {/each}
          </ul>
        </details>
      {/if}

      <details class="panel favorites">
        <summary>
          <span>{tr(locale, 'Категорії улюблених', 'Favorite categories')}</span>
          {#if savedIn.length}<span class="saved-in">{savedIn.join(', ')}</span>{/if}
        </summary>
        <div class="chips">
          {#each categories as category (category)}
            <button
              type="button"
              class="chip"
              aria-pressed={savedIn.includes(category)}
              onclick={() => toggleCategory(category)}
            >
              {savedIn.includes(category) ? '✓ ' : '+ '}{category}
            </button>
          {/each}
        </div>
        <form
          class="new-category"
          onsubmit={(event) => {
            event.preventDefault();
            createCategory();
          }}
        >
          <input
            class="input"
            type="text"
            bind:value={newCategory}
            placeholder={tr(locale, 'Нова категорія', 'New category')}
            aria-label={tr(locale, 'Нова категорія', 'New category')}
            enterkeyhint="done"
          />
          <button
            type="submit"
            class="btn btn-primary btn-icon add-category"
            disabled={!newCategory.trim()}
            aria-label={tr(locale, 'Створити категорію й додати', 'Create category and add')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </form>
      </details>

      {#if details.trailerKey}
        <section>
          <h2 class="section-title">{tr(locale, 'Трейлер', 'Trailer')}</h2>
          <div class="video-wrap">
            {#if showTrailer}
              <iframe
                title={tr(locale, 'Трейлер', 'Trailer')}
                src={`https://www.youtube-nocookie.com/embed/${details.trailerKey}?autoplay=1&playsinline=1`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowfullscreen
              ></iframe>
            {:else}
              <button
                type="button"
                class="trailer-cover"
                style={`background-image:url('https://i.ytimg.com/vi/${details.trailerKey}/hqdefault.jpg')`}
                onclick={() => (showTrailer = true)}
                aria-label={tr(locale, 'Відтворити трейлер', 'Play trailer')}
              >
                <span class="play">▶</span>
              </button>
            {/if}
          </div>
        </section>
      {/if}

      {#if details.actors.length}
        <section>
          <h2 class="section-title">{tr(locale, 'Актори', 'Cast')}</h2>
          <div class="h-scroll">
            {#each details.actors as actor (actor.id)}
              <a class="actor" href={`/person/${actor.id}`}>
                <img
                  src={actor.photo ?? '/fallback-person.svg'}
                  alt=""
                  loading="lazy"
                  width="132"
                  height="176"
                />
                <strong>{actor.name}</strong>
                {#if actor.character}<small>{actor.character}</small>{/if}
              </a>
            {/each}
          </div>
        </section>
      {/if}

      {#if similar?.recommended.length}
        <section aria-labelledby="recommended-title">
          <h2 class="section-title" id="recommended-title">
            {tr(locale, 'Рекомендуємо', 'Recommended')}
          </h2>
          <div class="h-scroll">
            {#each similar.recommended as item (item.id)}
              <a class="similar" href={`/details/${item.mediaType}/${item.id}`}>
                <img
                  src={item.poster ?? '/fallback-poster.svg'}
                  srcset={posterSrcset(item.poster)}
                  sizes={POSTER_SIZES.row}
                  alt=""
                  loading="lazy"
                  width="132"
                  height="198"
                />
                <strong>{item.title}</strong>
                <small>
                  {item.year || '—'}{#if item.voteAverage}&nbsp;· ★ {item.voteAverage.toFixed(
                      1
                    )}{/if}
                </small>
                {#if item.release && item.release.status !== 'online'}
                  <ReleaseBadge release={item.release} {locale} />
                {/if}
              </a>
            {/each}
          </div>
        </section>
      {/if}

      {#if similar?.topic.items.length}
        <section aria-labelledby="topic-title">
          <h2 class="section-title" id="topic-title">
            {tr(locale, 'Схожі за темою', 'Similar topics')}
          </h2>
          <p class="topic-keywords">{similar.topic.keywords.join(' · ')}</p>
          <div class="h-scroll">
            {#each similar.topic.items as item (item.id)}
              <a class="similar" href={`/details/${item.mediaType}/${item.id}`}>
                <img
                  src={item.poster ?? '/fallback-poster.svg'}
                  srcset={posterSrcset(item.poster)}
                  sizes={POSTER_SIZES.row}
                  alt=""
                  loading="lazy"
                  width="132"
                  height="198"
                />
                <strong>{item.title}</strong>
                <small>
                  {item.year || '—'}{#if item.voteAverage}&nbsp;· ★ {item.voteAverage.toFixed(
                      1
                    )}{/if}
                </small>
                {#if item.release && item.release.status !== 'online'}
                  <ReleaseBadge release={item.release} {locale} />
                {/if}
              </a>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</main>

<style>
  .hero-skeleton {
    height: 320px;
    border-radius: 0;
  }

  .back-inline {
    justify-self: start;
  }

  .hero {
    position: relative;
    padding: 12px 16px 16px;
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, var(--bg) 100%),
      var(--backdrop, linear-gradient(135deg, #1e3a8a, #0b0f1a)) center / cover no-repeat;
  }

  .hero-top {
    display: flex;
    justify-content: space-between;
    width: min(1120px, 100%);
    margin: 0 auto 12px;
  }

  .hero-actions {
    display: flex;
    gap: 8px;
  }

  .heart.active {
    color: #ef4444;
  }

  .heart.active svg {
    fill: currentColor;
  }

  .add-category svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .add-category {
    color: #fff;
  }

  .hero-main {
    width: min(1120px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 116px minmax(0, 1fr);
    gap: 14px;
    align-items: end;
  }

  .poster {
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: var(--shadow);
    background: var(--surface-2);
  }

  .hero-info h1 {
    margin: 0;
    font-size: clamp(1.35rem, 6vw, 2.2rem);
  }

  .release-row {
    margin: 8px 0 0;
  }

  .original {
    margin: 4px 0 0;
    color: var(--muted);
    font-style: italic;
  }

  .facts {
    margin: 8px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .age {
    padding: 0 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .small {
    margin: 6px 0 0;
    font-size: 0.85rem;
  }

  .genre-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .genre {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--chip-bg);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .overview {
    margin: 0;
    font-size: 1rem;
    line-height: 1.55;
  }

  .stats {
    margin-top: -6px;
  }

  .favorites {
    padding: 10px 14px;
  }

  .favorites[open] {
    padding-bottom: 14px;
  }

  .favorites > * + * {
    margin-top: 10px;
  }

  summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    font-weight: 600;
    font-size: 0.92rem;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::after {
    content: '';
    flex: none;
    margin-left: auto;
    width: 8px;
    height: 8px;
    border-right: 2px solid var(--muted);
    border-bottom: 2px solid var(--muted);
    transform: rotate(45deg) translateY(-2px);
    transition: transform 0.15s;
  }

  details[open] > summary::after {
    transform: rotate(-135deg) translateY(-2px);
  }

  .saved-in {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--accent);
    font-weight: 500;
  }

  .tagline {
    margin: 0;
    font-style: italic;
    color: var(--muted);
  }

  .info {
    margin: 0;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 6px 14px;
    font-size: 0.92rem;
  }

  .info dt {
    color: var(--muted);
  }

  .info dd {
    margin: 0;
  }

  .watch {
    display: grid;
    gap: 10px;
  }

  .watch .section-title,
  .watch p {
    margin: 0;
  }

  .watch-group {
    display: grid;
    gap: 6px;
  }

  .providers {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .provider {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 4px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .provider img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .seasons {
    padding: 10px 14px;
  }

  .seasons ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .seasons li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .favorites .chips {
    flex-wrap: wrap;
    margin: 10px 0 0;
    padding: 0;
    overflow: visible;
  }

  .new-category {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .video-wrap {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    aspect-ratio: 16 / 9;
    border-radius: var(--radius);
    overflow: hidden;
    background: #000;
  }

  .video-wrap iframe,
  .trailer-cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  /* iOS Safari sizes iframes to their content and ignores width: 100%. */
  .video-wrap iframe {
    width: 1px;
    min-width: 100%;
  }

  .trailer-cover {
    background-size: cover;
    background-position: center;
    cursor: pointer;
    display: grid;
    place-items: center;
  }

  .play {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 1.5rem;
    display: grid;
    place-items: center;
    padding-left: 4px;
  }

  .actor {
    display: grid;
    gap: 4px;
    color: var(--text);
  }

  .actor img {
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 12px;
    background: var(--surface-2);
  }

  .actor strong {
    font-size: 0.86rem;
    line-height: 1.25;
  }

  .no-translation {
    justify-self: start;
    padding: 4px 10px;
    border-radius: 999px;
    /* Fixed red: white text keeps 4.5:1 contrast in both themes. */
    background: #c81e1e;
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .similar {
    display: grid;
    /* Long single words ("Перезавантаження") must not widen the tile. */
    grid-template-columns: minmax(0, 1fr);
    gap: 3px;
    align-content: start;
    color: var(--text);
  }

  .similar > :global(.release) {
    justify-self: start;
  }

  .similar img {
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 10px;
    background: var(--surface-2);
  }

  .similar strong {
    font-size: 0.84rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .similar small {
    color: var(--muted);
    font-size: 0.76rem;
  }

  .topic-keywords {
    margin: -6px 0 10px;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .actor small {
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.25;
  }

  @media (min-width: 720px) {
    .hero {
      padding: 20px 24px 28px;
    }

    .hero-main {
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 24px;
    }
  }
</style>
