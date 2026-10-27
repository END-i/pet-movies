<script lang="ts">
  import { PUBLIC_DEBUG_LOGS } from 'astro:env/client';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import {
    addToFavorites,
    categoriesContaining,
    DEFAULT_FAVORITES_CATEGORY,
    listCategories,
    loadFavorites,
    removeFromFavorites
  } from '../lib/favorites';
  import { localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';
  import type { MovieDetails } from '../lib/types';

  const CLIENT_DEBUG = PUBLIC_DEBUG_LOGS;

  export let mediaType: 'movie' | 'tv';
  export let id: number;

  let details: MovieDetails | null = null;
  let loading = true;
  let error = '';
  let categories: string[] = [];
  let savedIn: string[] = [];
  let newCategory = '';
  let showTrailer = false;
  let loadedLocale = '';

  $: locale = $localeMode;
  $: showOriginal = details?.originalTitle && details.originalTitle !== details.title;

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
              loadedLocale as 'uk' | 'en',
              'Не вдалося завантажити деталі',
              'Failed to load details'
            )
        );
      }
      details = (await response.json()) as MovieDetails;
      if (CLIENT_DEBUG) {
        console.log('[BROWSER][details][response]', details);
      }
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

  $: if (loadedLocale && $localeMode !== loadedLocale && !loading) {
    void loadDetails();
  }
</script>

<main class="details-page">
  {#if loading}
    <div class="skeleton hero-skeleton"></div>
    <div class="page"><div class="skeleton" style="height: 140px"></div></div>
  {:else if error || !details}
    <div class="page">
      <button type="button" class="btn back-inline" on:click={goBack}
        >← {tr(locale, 'Назад', 'Back')}</button
      >
      <div class="panel">
        <p class="error">{error || tr(locale, 'Деталі не знайдено', 'Details not found')}</p>
        <button type="button" class="btn" on:click={loadDetails}
          >{tr(locale, 'Спробувати знову', 'Try again')}</button
        >
      </div>
    </div>
  {:else}
    <section class="hero" style={details.backdrop ? `--backdrop:url('${details.backdrop}')` : ''}>
      <div class="hero-top">
        <button
          type="button"
          class="round"
          on:click={goBack}
          aria-label={tr(locale, 'Назад', 'Back')}>←</button
        >
        <button
          type="button"
          class="round"
          on:click={share}
          aria-label={tr(locale, 'Поділитися', 'Share')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
          </svg>
        </button>
      </div>

      <div class="hero-main">
        <img
          class="poster"
          src={details.poster ?? '/fallback-poster.svg'}
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
            <span
              >{details.mediaType === 'tv'
                ? tr(locale, 'Серіал', 'TV series')
                : tr(locale, 'Фільм', 'Movie')}</span
            >
          </p>
          {#if details.countries.length}
            <p class="muted small">{details.countries.join(', ')}</p>
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

      {#if !details.hasUkrainianTranslation && locale === 'uk'}
        <span class="badge">UA переклад відсутній</span>
      {/if}

      <p class="overview">
        {details.overview || tr(locale, 'Опис поки відсутній.', 'No description yet.')}
      </p>

      <p class="muted small stats">
        {details.voteCount.toLocaleString()}
        {tr(locale, 'оцінок', 'votes')}
        {#if details.imdbId}
          · <a
            href={`https://www.imdb.com/title/${details.imdbId}`}
            target="_blank"
            rel="noreferrer">IMDb ↗</a
          >
        {/if}
      </p>

      <section class="panel favorites" aria-labelledby="fav-title">
        <h2 id="fav-title" class="section-title">
          {savedIn.length
            ? tr(locale, 'В улюблених', 'In favorites')
            : tr(locale, 'Додати в улюблені', 'Add to favorites')}
        </h2>
        <div class="chips">
          {#each categories as category (category)}
            <button
              type="button"
              class="chip"
              aria-pressed={savedIn.includes(category)}
              on:click={() => toggleCategory(category)}
            >
              {savedIn.includes(category) ? '✓ ' : '+ '}{category}
            </button>
          {/each}
        </div>
        <form class="new-category" on:submit|preventDefault={createCategory}>
          <input
            class="input"
            type="text"
            bind:value={newCategory}
            placeholder={tr(locale, 'Нова категорія', 'New category')}
            aria-label={tr(locale, 'Нова категорія', 'New category')}
            enterkeyhint="done"
          />
          <button type="submit" class="btn btn-primary" disabled={!newCategory.trim()}>
            {tr(locale, 'Додати', 'Add')}
          </button>
        </form>
      </section>

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
                on:click={() => (showTrailer = true)}
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

  .round {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 0;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 1.2rem;
    display: grid;
    place-items: center;
    cursor: pointer;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  .round svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
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
    display: grid;
    gap: 10px;
  }

  .favorites .section-title {
    margin: 0;
  }

  .favorites .chips {
    flex-wrap: wrap;
    margin: 0;
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
