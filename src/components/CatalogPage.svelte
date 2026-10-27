<script lang="ts">
  import { PUBLIC_DEBUG_LOGS } from 'astro:env/client';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import MovieCard from './MovieCard.svelte';
  import { RECENT_RELEASE_DAYS } from '../lib/config';
  import { initializePreferences, localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';
  import { AGE_STEPS, normalizeAgeFilter } from '../lib/ageRating';
  import { buildPaginationTokens, parsePositiveInteger } from '../lib/pagination';
  import type { CatalogItem } from '../lib/types';

  const CLIENT_DEBUG = PUBLIC_DEBUG_LOGS;

  type Category = '' | 'all' | 'movie' | 'cartoon' | 'tv';

  interface DiscoverPayload {
    page: number;
    totalPages: number;
    totalResults: number;
    results: CatalogItem[];
  }

  type ReleasePeriod = 'all' | '7' | '30' | '90' | '120' | 'custom';
  type FilterPreset = '' | 'adult' | 'family' | 'child12' | 'new' | 'documentary';

  const releasePeriodOptions: ReleasePeriod[] = ['all', '7', '30', '90', '120', 'custom'];
  const filterPresetOptions: FilterPreset[] = [
    '',
    'adult',
    'family',
    'child12',
    'new',
    'documentary'
  ];

  const categoryOptions: Array<{ value: Exclude<Category, ''>; uk: string; en: string }> = [
    { value: 'all', uk: 'Усе', en: 'All' },
    { value: 'movie', uk: 'Фільми', en: 'Movies' },
    { value: 'cartoon', uk: 'Мультфільми', en: 'Cartoons' },
    { value: 'tv', uk: 'Серіали', en: 'TV series' }
  ];

  const presetOptions: Array<{ value: Exclude<FilterPreset, ''>; uk: string; en: string }> = [
    { value: 'new', uk: 'Новинки', en: 'New releases' },
    { value: 'adult', uk: 'Всі фільми', en: 'All movies' },
    { value: 'documentary', uk: 'Документалки', en: 'Documentaries' },
    { value: 'family', uk: 'Для сім’ї', en: 'Family' },
    { value: 'child12', uk: 'Дитина 12+', en: 'Kids 12+' }
  ];

  const movieGenres = [
    { id: '', uk: 'Будь-який жанр', en: 'Any genre' },
    { id: '28', uk: 'Бойовик', en: 'Action' },
    { id: '35', uk: 'Комедія', en: 'Comedy' },
    { id: '18', uk: 'Драма', en: 'Drama' },
    { id: '14', uk: 'Фентезі', en: 'Fantasy' },
    { id: '27', uk: 'Жахи', en: 'Horror' },
    { id: '10749', uk: 'Романтика', en: 'Romance' },
    { id: '878', uk: 'Наукова фантастика', en: 'Science fiction' },
    { id: '53', uk: 'Трилер', en: 'Thriller' },
    { id: '10751', uk: 'Сімейний', en: 'Family' },
    { id: '99', uk: 'Документальний', en: 'Documentary' }
  ];

  const tvGenres = [
    { id: '', uk: 'Будь-який жанр', en: 'Any genre' },
    { id: '10759', uk: 'Бойовик і пригоди', en: 'Action & adventure' },
    { id: '35', uk: 'Комедія', en: 'Comedy' },
    { id: '18', uk: 'Драма', en: 'Drama' },
    { id: '9648', uk: 'Містика', en: 'Mystery' },
    { id: '10765', uk: 'Фантастика і фентезі', en: 'Sci-Fi & fantasy' },
    { id: '16', uk: 'Анімація', en: 'Animation' }
  ];

  const formatDate = (value: Date) => value.toISOString().slice(0, 10);

  const today = new Date();
  const recentStart = new Date(today);
  recentStart.setDate(today.getDate() - RECENT_RELEASE_DAYS);

  let category: Category = 'all';
  let genre = '';
  let minRating = '';
  let minVotes = '';
  let year = '';
  // Popular recent titles make a better first screen than raw newest releases (mostly unrated).
  let sortBy = 'popularity.desc';
  let query = '';
  let includeCountry = '';
  let ageRating = '';
  let releaseDateGte = formatDate(recentStart);
  let releaseDateLte = formatDate(today);
  let releasePeriod: ReleasePeriod = '120';
  let limit = '20';
  let preset: FilterPreset = '';

  let results: CatalogItem[] = [];
  let page = 1;
  let totalPages = 0;
  let totalResults = 0;
  let loading = false;
  let error = '';
  let loadedOnce = false;
  let showFilters = false;
  let showScrollTop = false;
  let appliedLocale = get(localeMode);
  let requestId = 0;
  let resultsAnchor: HTMLElement | null = null;

  $: genreOptions = category === 'tv' ? tvGenres : movieGenres;
  $: paginationTokens = buildPaginationTokens(page, totalPages);
  $: activeFilterCount = [
    genre,
    minRating,
    minVotes,
    year,
    includeCountry,
    ageRating,
    releasePeriod !== 'all' ? releasePeriod : ''
  ].filter(Boolean).length;
  $: locale = $localeMode;

  function resetResults() {
    results = [];
    page = 1;
    totalPages = 0;
  }

  function resetFilters() {
    preset = '';
    category = 'all';
    genre = '';
    minRating = '';
    minVotes = '';
    year = '';
    sortBy = 'popularity.desc';
    query = '';
    includeCountry = '';
    ageRating = '';
    releasePeriod = 'all';
    limit = '20';
    onReleasePeriodChange();
    showFilters = false;
    resetResults();
    void fetchData(1);
  }

  function applyPreset(value: FilterPreset) {
    if (preset === value) {
      resetFilters();
      return;
    }

    preset = value;
    query = '';
    year = '';
    includeCountry = '';
    sortBy = 'primary_release_date.desc';
    releasePeriod = '120';

    if (value === 'adult') {
      category = 'movie';
      genre = '';
      minRating = '5';
      minVotes = '50';
      ageRating = '18';
      limit = '20';
      releasePeriod = 'all';
    } else if (value === 'family') {
      category = 'movie';
      genre = '10751';
      minRating = '6';
      minVotes = '50';
      ageRating = '6';
      limit = '15';
    } else if (value === 'child12') {
      category = 'cartoon';
      genre = '';
      minRating = '6';
      minVotes = '100';
      ageRating = '12';
      limit = '15';
    } else if (value === 'new') {
      category = 'all';
      genre = '';
      minRating = '5';
      minVotes = '10';
      ageRating = '';
      limit = '20';
    } else if (value === 'documentary') {
      category = 'movie';
      genre = '99';
      minRating = '5';
      minVotes = '20';
      ageRating = '';
      sortBy = 'popularity.desc';
      releasePeriod = 'all';
      limit = '20';
    }

    onReleasePeriodChange();
    resetResults();
    void fetchData(1);
  }

  function setPeriod(days: number) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - days);
    releaseDateGte = formatDate(start);
    releaseDateLte = formatDate(end);
  }

  function onReleasePeriodChange() {
    if (releasePeriod === 'custom') return;
    if (releasePeriod === 'all') {
      releaseDateGte = '';
      releaseDateLte = '';
      return;
    }
    setPeriod(Number(releasePeriod));
  }

  function buildParams(nextPage: number) {
    const params = new URLSearchParams();
    params.set('category', category);
    params.set('page', String(nextPage));
    params.set('sortBy', sortBy);
    params.set('query', query.trim());
    params.set('genre', genre);
    params.set('minRating', minRating);
    params.set('minVotes', minVotes);
    params.set('year', year);
    params.set('includeCountry', includeCountry.trim().toUpperCase());
    params.set('locale', get(localeMode));
    params.set('ageRating', ageRating);
    params.set('releaseDateGte', releaseDateGte);
    params.set('releaseDateLte', releaseDateLte);
    params.set('releasePeriod', releasePeriod);
    params.set('preset', preset);
    params.set('limit', limit);
    return params;
  }

  function syncUrl(nextPage: number) {
    if (typeof window === 'undefined') return;
    const params = buildParams(nextPage);
    params.delete('locale');
    // Keep shareable URLs short: drop empty values.
    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }
    const queryString = params.toString();
    const url = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState({}, '', url);
  }

  function readStateFromUrl() {
    if (typeof window === 'undefined') return 1;

    const params = new URLSearchParams(window.location.search);
    const categoryValue = params.get('category');
    if (
      categoryValue === 'all' ||
      categoryValue === 'movie' ||
      categoryValue === 'cartoon' ||
      categoryValue === 'tv'
    ) {
      category = categoryValue;
    }

    genre = params.get('genre') ?? genre;
    minRating = params.get('minRating') ?? minRating;
    minVotes = params.get('minVotes') ?? minVotes;
    year = params.get('year') ?? year;
    sortBy = params.get('sortBy') ?? sortBy;
    query = params.get('query') ?? query;
    includeCountry = (params.get('includeCountry') ?? includeCountry).toUpperCase();
    ageRating = params.has('ageRating') ? normalizeAgeFilter(params.get('ageRating')) : ageRating;
    limit = params.get('limit') ?? limit;

    const releasePeriodValue = params.get('releasePeriod') as ReleasePeriod | null;
    if (releasePeriodValue && releasePeriodOptions.includes(releasePeriodValue)) {
      releasePeriod = releasePeriodValue;
    }

    const presetValue = params.get('preset') as FilterPreset | null;
    if (presetValue && filterPresetOptions.includes(presetValue)) {
      preset = presetValue;
    }

    const dateFromParam = params.get('releaseDateGte');
    const dateToParam = params.get('releaseDateLte');
    if (dateFromParam !== null) releaseDateGte = dateFromParam;
    if (dateToParam !== null) releaseDateLte = dateToParam;

    if (!params.has('releaseDateGte') && !params.has('releaseDateLte')) {
      onReleasePeriodChange();
    }

    return parsePositiveInteger(params.get('page'), 1);
  }

  async function fetchData(nextPage = 1) {
    if (!category) return;

    const currentRequest = ++requestId;
    loading = true;
    error = '';

    try {
      const params = buildParams(nextPage);

      const response = await fetch(`/api/discover.json?${params.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (CLIENT_DEBUG) {
          console.error('[BROWSER][discover][error]', { status: response.status, payload });
        }
        throw new Error(
          payload?.error ??
            tr(get(localeMode), 'Не вдалося отримати контент', 'Failed to load content')
        );
      }
      const payload = (await response.json()) as DiscoverPayload;

      // Ignore responses for requests that were superseded by a newer one.
      if (currentRequest !== requestId) return;

      if (CLIENT_DEBUG) {
        console.log('[BROWSER][discover][response]', payload);
      }

      results = payload.results;
      page = payload.page;
      totalPages = payload.totalPages;
      totalResults = payload.totalResults;
      loadedOnce = true;
      syncUrl(payload.page);
    } catch (err) {
      if (currentRequest !== requestId) return;
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      error = offline
        ? tr(get(localeMode), 'Немає з’єднання з інтернетом', 'You are offline')
        : err instanceof Error
          ? err.message
          : tr(get(localeMode), 'Невідома помилка', 'Unknown error');
    } finally {
      if (currentRequest === requestId) loading = false;
    }
  }

  async function onSearchSubmit() {
    preset = '';
    (document.activeElement as HTMLElement | null)?.blur();
    await fetchData(1);
  }

  async function onFiltersSubmit() {
    preset = '';
    showFilters = false;
    await fetchData(1);
  }

  async function selectCategory(value: Category) {
    if (category === value) return;
    category = value;
    preset = '';
    if (!genreOptions.some((option) => option.id === genre)) genre = '';
    resetResults();
    await fetchData(1);
  }

  async function goToPage(nextPage: number) {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    await fetchData(nextPage);
    resultsAnchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onWindowScroll() {
    showScrollTop = window.scrollY > 600;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') showFilters = false;
  }

  onMount(() => {
    initializePreferences();
    appliedLocale = get(localeMode);
    const initialPage = readStateFromUrl();
    void fetchData(initialPage);

    onWindowScroll();
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', onWindowScroll);
  });

  $: if ($localeMode !== appliedLocale) {
    appliedLocale = $localeMode;
    if (loadedOnce && category) {
      void fetchData(page);
    }
  }

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = showFilters ? 'hidden' : '';
  }
</script>

<svelte:window on:keydown={onKeydown} />

<main class="page catalog">
  <h1 class="page-title">{tr(locale, 'Що подивитися?', 'What to watch?')}</h1>

  <form class="search" role="search" on:submit|preventDefault={onSearchSubmit}>
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5" />
    </svg>
    <label class="visually-hidden" for="catalog-query"
      >{tr(locale, 'Пошук за назвою', 'Search by title')}</label
    >
    <input
      id="catalog-query"
      type="search"
      bind:value={query}
      placeholder={tr(locale, 'Назва фільму чи серіалу', 'Movie or series title')}
      enterkeyhint="search"
      autocomplete="off"
    />
    <button
      type="button"
      class="filters-btn"
      on:click={() => (showFilters = true)}
      aria-label={tr(locale, 'Фільтри', 'Filters')}
      aria-haspopup="dialog"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      {#if activeFilterCount}
        <span class="count">{activeFilterCount}</span>
      {/if}
    </button>
  </form>

  <div class="chips" role="group" aria-label={tr(locale, 'Категорія', 'Category')}>
    {#each categoryOptions as option (option.value)}
      <button
        type="button"
        class="chip"
        aria-pressed={category === option.value}
        on:click={() => selectCategory(option.value)}
        disabled={loading && category === option.value}
      >
        {tr(locale, option.uk, option.en)}
      </button>
    {/each}
  </div>

  <div class="chips presets" role="group" aria-label={tr(locale, 'Добірки', 'Presets')}>
    {#each presetOptions as option (option.value)}
      <button
        type="button"
        class="chip"
        aria-pressed={preset === option.value}
        on:click={() => applyPreset(option.value)}
      >
        {tr(locale, option.uk, option.en)}
      </button>
    {/each}
  </div>

  <div bind:this={resultsAnchor} class="results-anchor"></div>

  {#if error}
    <div class="panel state">
      <p class="error">{error}</p>
      <button type="button" class="btn" on:click={() => fetchData(page)}>
        {tr(locale, 'Спробувати знову', 'Try again')}
      </button>
    </div>
  {:else if loading && !results.length}
    <div class="results" aria-busy="true">
      {#each [0, 1, 2, 3] as idx (idx)}
        <div class="skeleton result-skeleton"></div>
      {/each}
    </div>
  {:else if loadedOnce && results.length === 0}
    <div class="panel state">
      <p class="hint">
        {tr(
          locale,
          'За поточними фільтрами нічого не знайдено.',
          'No matches for current filters.'
        )}
      </p>
      <button type="button" class="btn" on:click={resetFilters}>
        {tr(locale, 'Скинути фільтри', 'Reset filters')}
      </button>
    </div>
  {:else if results.length}
    <p class="hint summary">
      {tr(locale, 'Знайдено', 'Found')}: {totalResults.toLocaleString(
        locale === 'en' ? 'en-US' : 'uk-UA'
      )}
      {#if totalPages > 1}
        · {tr(locale, 'сторінка', 'page')} {page} / {totalPages}
      {/if}
    </p>

    <section class="results" class:dimmed={loading} aria-busy={loading}>
      {#each results as item (`${item.mediaType}-${item.id}`)}
        <MovieCard {item} />
      {/each}
    </section>

    {#if totalPages > 1}
      <nav class="pagination" aria-label={tr(locale, 'Сторінки результатів', 'Result pages')}>
        <button
          type="button"
          class="btn"
          on:click={() => goToPage(page - 1)}
          disabled={loading || page <= 1}
          aria-label={tr(locale, 'Попередня сторінка', 'Previous page')}
        >
          ←
        </button>

        <span class="pages-compact">{page} / {totalPages}</span>

        <span class="pages-full">
          {#each paginationTokens as token, tokenIndex (`${token}-${tokenIndex}`)}
            {#if token === '...'}
              <span class="ellipsis">…</span>
            {:else}
              <button
                type="button"
                class="btn page-btn"
                class:btn-primary={token === page}
                on:click={() => goToPage(token)}
                disabled={loading}
                aria-current={token === page ? 'page' : undefined}
              >
                {token}
              </button>
            {/if}
          {/each}
        </span>

        <button
          type="button"
          class="btn"
          on:click={() => goToPage(page + 1)}
          disabled={loading || page >= totalPages}
          aria-label={tr(locale, 'Наступна сторінка', 'Next page')}
        >
          →
        </button>
      </nav>
    {/if}
  {/if}

  {#if showScrollTop}
    <button
      type="button"
      class="scroll-top"
      on:click={scrollToTop}
      aria-label={tr(locale, 'Прокрутити вгору', 'Scroll to top')}
    >
      ↑
    </button>
  {/if}
</main>

{#if showFilters}
  <button
    type="button"
    class="sheet-backdrop"
    aria-label={tr(locale, 'Закрити фільтри', 'Close filters')}
    on:click={() => (showFilters = false)}
  ></button>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title">
    <header class="sheet-head">
      <h2 id="filters-title">{tr(locale, 'Фільтри', 'Filters')}</h2>
      <button
        type="button"
        class="btn btn-icon"
        on:click={() => (showFilters = false)}
        aria-label={tr(locale, 'Закрити', 'Close')}
      >
        ✕
      </button>
    </header>

    <form id="filters-form" class="filters" on:submit|preventDefault={onFiltersSubmit}>
      <label>
        {tr(locale, 'Категорія', 'Category')}
        <select class="input" bind:value={category}>
          {#each categoryOptions as option (option.value)}
            <option value={option.value}>{tr(locale, option.uk, option.en)}</option>
          {/each}
        </select>
      </label>

      <label>
        {tr(locale, 'Жанр', 'Genre')}
        <select class="input" bind:value={genre} disabled={category === 'all'}>
          {#each genreOptions as item (item.id)}
            <option value={item.id}>{tr(locale, item.uk, item.en)}</option>
          {/each}
        </select>
      </label>

      <label>
        {tr(locale, 'Сортування', 'Sorting')}
        <select class="input" bind:value={sortBy}>
          <option value="primary_release_date.desc">{tr(locale, 'Найновіші', 'Newest')}</option>
          <option value="popularity.desc">{tr(locale, 'Популярні', 'Most popular')}</option>
          <option value="vote_average.desc">{tr(locale, 'Найвищий рейтинг', 'Top rated')}</option>
          <option value="primary_release_date.asc">{tr(locale, 'Найстаріші', 'Oldest')}</option>
        </select>
      </label>

      <label>
        {tr(locale, 'Період релізу', 'Release period')}
        <select class="input" bind:value={releasePeriod} on:change={onReleasePeriodChange}>
          <option value="all">{tr(locale, 'За всі часи', 'All time')}</option>
          <option value="7">{tr(locale, 'Останні 7 днів', 'Last 7 days')}</option>
          <option value="30">{tr(locale, 'Останні 30 днів', 'Last 30 days')}</option>
          <option value="90">{tr(locale, 'Останні 90 днів', 'Last 90 days')}</option>
          <option value="120">{tr(locale, 'Останні 120 днів', 'Last 120 days')}</option>
          <option value="custom">{tr(locale, 'Власний діапазон', 'Custom range')}</option>
        </select>
      </label>

      {#if releasePeriod === 'custom'}
        <div class="row">
          <label>
            {tr(locale, 'Від', 'From')}
            <input class="input" type="date" bind:value={releaseDateGte} />
          </label>
          <label>
            {tr(locale, 'До', 'To')}
            <input class="input" type="date" bind:value={releaseDateLte} />
          </label>
        </div>
      {/if}

      <div class="row">
        <label>
          {tr(locale, 'Рейтинг від', 'Rating from')}
          <input
            class="input"
            type="number"
            inputmode="decimal"
            min="0"
            max="10"
            step="0.1"
            bind:value={minRating}
            placeholder="0–10"
          />
        </label>
        <label>
          {tr(locale, 'Голосів від', 'Votes from')}
          <input
            class="input"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            bind:value={minVotes}
          />
        </label>
      </div>

      <div class="row">
        <label>
          {tr(locale, 'Рік', 'Year')}
          <input
            class="input"
            type="number"
            inputmode="numeric"
            min="1900"
            max="2100"
            bind:value={year}
          />
        </label>
        <label>
          {tr(locale, 'Країна (код)', 'Country code')}
          <input
            class="input"
            type="text"
            bind:value={includeCountry}
            placeholder="US"
            maxlength="2"
            autocapitalize="characters"
          />
        </label>
      </div>

      <div class="row">
        <label>
          {tr(locale, 'Вік глядача', 'Viewer age')}
          <select class="input" bind:value={ageRating}>
            <option value="">{tr(locale, 'Будь-який', 'Any')}</option>
            {#each AGE_STEPS as age}
              <option value={age}>{age}+</option>
            {/each}
          </select>
        </label>
        <label>
          {tr(locale, 'На сторінці', 'Per page')}
          <select class="input" bind:value={limit}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </select>
        </label>
      </div>
    </form>

    <footer class="sheet-actions">
      <button type="button" class="btn" on:click={resetFilters}>
        {tr(locale, 'Скинути', 'Reset')}
      </button>
      <button type="submit" form="filters-form" class="btn btn-primary" disabled={loading}>
        {tr(locale, 'Показати', 'Apply')}
      </button>
    </footer>
  </div>
{/if}

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 0 6px 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--muted);
  }

  .search:focus-within {
    border-color: var(--primary);
  }

  .search svg {
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    font-size: 16px;
    outline: none;
  }

  .filters-btn {
    position: relative;
    flex: none;
    width: 42px;
    height: 42px;
    border: 0;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .count {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--primary);
    color: var(--primary-text);
    font-size: 0.7rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }

  .presets .chip {
    background: transparent;
  }

  .presets .chip[aria-pressed='true'] {
    background: var(--primary);
  }

  .results-anchor {
    scroll-margin-top: calc(var(--header-h) + var(--safe-top) + 12px);
  }

  .summary {
    font-size: 0.88rem;
    margin-top: -6px;
  }

  .results {
    display: grid;
    gap: 10px;
    transition: opacity 0.15s ease;
  }

  .results.dimmed {
    opacity: 0.55;
  }

  .result-skeleton {
    height: 168px;
  }

  .state {
    display: grid;
    justify-items: start;
    gap: 10px;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  .pages-compact {
    min-width: 72px;
    text-align: center;
    font-weight: 700;
  }

  .pages-full {
    display: none;
    gap: 6px;
    align-items: center;
  }

  .page-btn {
    min-width: 44px;
    padding: 0 10px;
  }

  .ellipsis {
    color: var(--muted);
  }

  .scroll-top {
    position: fixed;
    right: 16px;
    bottom: calc(var(--nav-h) + var(--safe-bottom) + 14px);
    z-index: 30;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    border: 0;
    background: var(--primary);
    color: var(--primary-text);
    font-size: 1.3rem;
    font-weight: 700;
    box-shadow: var(--shadow);
    cursor: pointer;
  }

  /* Filters bottom sheet */

  .sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    border: 0;
    padding: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  .sheet {
    position: fixed;
    left: 50%;
    bottom: 0;
    z-index: 61;
    width: min(560px, 100%);
    max-height: 88dvh;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-radius: 22px 22px 0 0;
    border: 1px solid var(--border);
    border-bottom: 0;
    box-shadow: var(--shadow);
    animation: sheet-in 0.2s ease-out;
  }

  @keyframes sheet-in {
    from {
      transform: translate(-50%, 100%);
    }
  }

  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 6px;
  }

  .sheet-head h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .filters {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px 16px 12px;
    display: grid;
    gap: 12px;
  }

  .filters label {
    display: grid;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }

  .row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .sheet-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 10px;
    padding: 12px 16px calc(12px + var(--safe-bottom));
    border-top: 1px solid var(--border);
  }

  @media (min-width: 760px) {
    .results {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .pages-compact {
      display: none;
    }

    .pages-full {
      display: inline-flex;
    }

    .sheet {
      bottom: auto;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 22px;
      border-bottom: 1px solid var(--border);
      animation: none;
    }
  }
</style>
