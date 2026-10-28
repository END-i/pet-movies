<script lang="ts">
  import { PUBLIC_DEBUG_LOGS } from 'astro:env/client';
  import { get } from 'svelte/store';
  import { onMount, untrack } from 'svelte';
  import MovieCard from './MovieCard.svelte';
  import SearchSuggest from './SearchSuggest.svelte';
  import EmptyState from './EmptyState.svelte';
  import {
    hiddenGenres,
    initializePreferences,
    localeMode,
    translationPreference
  } from '../lib/preferences';
  import { TRANSLATION_LANGUAGES } from '../lib/translations';
  import { HIDEABLE_GENRES } from '../lib/genres';
  import { intlLocale, tr } from '../lib/i18n';
  import { AGE_STEPS } from '../lib/ageRating';
  import { buildPaginationTokens } from '../lib/pagination';
  import {
    categoryOptions,
    clearedFilters,
    countActiveFilters,
    countryOptions,
    defaultFilters,
    filtersFromParams,
    filtersToParams,
    movieGenres,
    presetFilters,
    presetOptions,
    releaseRange,
    shareableSearch,
    tvGenres,
    voteOptions,
    type CatalogFilters,
    type Category,
    type DiscoverPayload,
    type FilterPreset,
    type ReleasePeriod
  } from '../lib/catalog';
  import type { CatalogItem, PersonSummary } from '../lib/types';
  import { jobLabel } from '../lib/filmography';
  import { profileSrcset } from '../lib/images';

  const CLIENT_DEBUG = PUBLIC_DEBUG_LOGS;

  const initial = defaultFilters();

  let category: Category = $state(initial.category);
  let genre = $state(initial.genre);
  let minRating = $state(initial.minRating);
  let minVotes = $state(initial.minVotes);
  let year = $state(initial.year);
  let sortBy = $state(initial.sortBy);
  let query = $state(initial.query);
  let includeCountry = $state(initial.includeCountry);
  let ageRating = $state(initial.ageRating);
  let releaseDateGte = $state(initial.releaseDateGte);
  let releaseDateLte = $state(initial.releaseDateLte);
  let releasePeriod: ReleasePeriod = $state(initial.releasePeriod);
  let limit = $state(initial.limit);
  let preset: FilterPreset = $state(initial.preset);

  let results: CatalogItem[] = $state([]);
  let page = $state(1);
  let totalPages = $state(0);
  let totalResults = $state(0);
  let loading = $state(false);
  let error = $state('');
  let loadedOnce = $state(false);
  let showFilters = $state(false);
  let showScrollTop = $state(false);
  let appliedLocale = $state(get(localeMode));
  let requestId = 0;
  let resultsAnchor: HTMLElement | null = $state(null);
  // Phones load the next page on scroll instead of paginating; `firstPage` is where the list starts.
  let phone = $state(false);
  let firstPage = $state(1);
  let appending = $state(false);
  let people: PersonSummary[] = $state([]);
  let peopleKey = '';
  let suggest: SearchSuggest = $state();
  let suggestOpen = $state(false);
  let suggestActive = $state(-1);

  let genreOptions = $derived(category === 'tv' ? tvGenres : movieGenres);
  let paginationTokens = $derived(buildPaginationTokens(page, totalPages));
  let activeFilterCount = $derived(countActiveFilters(currentFilters(), $hiddenGenres.length));
  let locale = $derived($localeMode);

  function resetResults() {
    results = [];
    page = 1;
    totalPages = 0;
  }

  function currentFilters(): CatalogFilters {
    return {
      category,
      genre,
      minRating,
      minVotes,
      year,
      sortBy,
      query,
      includeCountry,
      ageRating,
      releaseDateGte,
      releaseDateLte,
      releasePeriod,
      limit,
      preset
    };
  }

  function setFilters(next: CatalogFilters) {
    category = next.category;
    genre = next.genre;
    minRating = next.minRating;
    minVotes = next.minVotes;
    year = next.year;
    sortBy = next.sortBy;
    query = next.query;
    includeCountry = next.includeCountry;
    ageRating = next.ageRating;
    releaseDateGte = next.releaseDateGte;
    releaseDateLte = next.releaseDateLte;
    releasePeriod = next.releasePeriod;
    limit = next.limit;
    preset = next.preset;
  }

  function resetFilters() {
    setFilters(clearedFilters());
    showFilters = false;
    resetResults();
    void fetchData(1);
  }

  function toggleHiddenGenre(key: string) {
    hiddenGenres.update((keys) =>
      keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key]
    );
  }

  function applyPreset(value: Exclude<FilterPreset, ''>) {
    if (preset === value) {
      resetFilters();
      return;
    }
    setFilters(presetFilters(currentFilters(), value));
    resetResults();
    void fetchData(1);
  }

  function onReleasePeriodChange() {
    const range = releaseRange(releasePeriod);
    if (!range) return;
    releaseDateGte = range.gte;
    releaseDateLte = range.lte;
  }

  function buildParams(nextPage: number) {
    return filtersToParams(currentFilters(), nextPage, {
      locale: get(localeMode),
      hiddenGenres: get(hiddenGenres)
    });
  }

  function syncUrl(nextPage: number) {
    if (typeof window === 'undefined') return;
    const queryString = shareableSearch(buildParams(nextPage));
    const url = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState({}, '', url);
  }

  function readStateFromUrl() {
    if (typeof window === 'undefined') return 1;
    const restored = filtersFromParams(
      new URLSearchParams(window.location.search),
      currentFilters()
    );
    setFilters(restored.filters);
    return restored.page;
  }

  /** People matching the text query; loaded once per query and language, not per page. */
  async function loadPeople() {
    const text = query.trim();
    const key = `${get(localeMode)}:${text}`;
    if (key === peopleKey) return;
    peopleKey = key;

    if (text.length < 2) {
      people = [];
      return;
    }

    try {
      const params = new URLSearchParams({ query: text, locale: get(localeMode) });
      const response = await fetch(`/api/search/people.json?${params.toString()}`);
      const payload = response.ok
        ? ((await response.json()) as { results: PersonSummary[] })
        : { results: [] };
      // A newer query may have started while this one was loading.
      if (key === peopleKey) people = payload.results;
    } catch {
      if (key === peopleKey) people = [];
    }
  }

  async function fetchData(nextPage = 1, { append = false } = {}) {
    if (!category) return;
    if (!append) void loadPeople();

    const currentRequest = ++requestId;
    loading = true;
    appending = append;
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

      if (append) {
        // Movie and TV pages can overlap when results shift between requests.
        const seen = new Set(results.map((item) => `${item.mediaType}-${item.id}`));
        results = [
          ...results,
          ...payload.results.filter((item) => !seen.has(`${item.mediaType}-${item.id}`))
        ];
      } else {
        results = payload.results;
        firstPage = payload.page;
        syncUrl(payload.page);
      }
      page = payload.page;
      totalPages = payload.totalPages;
      totalResults = payload.totalResults;
      loadedOnce = true;
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

  function onSearchKeydown(event: KeyboardEvent) {
    if (suggest?.handleKey(event)) event.preventDefault();
  }

  async function onSearchSubmit() {
    suggestOpen = false;
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

  let canLoadMore = $derived(phone && loadedOnce && !error && page < totalPages);

  function loadMore() {
    if (loading || !canLoadMore) return;
    void fetchData(page + 1, { append: true });
  }

  function observeSentinel(node: HTMLElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
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

    const phoneQuery = window.matchMedia('(max-width: 759px)');
    const onPhoneChange = () => (phone = phoneQuery.matches);
    onPhoneChange();
    phoneQuery.addEventListener('change', onPhoneChange);

    onWindowScroll();
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      phoneQuery.removeEventListener('change', onPhoneChange);
    };
  });

  $effect(() => {
    if ($localeMode !== appliedLocale) {
      appliedLocale = $localeMode;
      untrack(() => {
        if (loadedOnce && category) {
          // On phones the list may hold several pages; reload it from its first one.
          void fetchData(phone ? firstPage : page);
        }
      });
    }
  });

  $effect(() => {
    document.body.style.overflow = showFilters ? 'hidden' : '';
  });
</script>

<svelte:window onkeydown={onKeydown} />

<main class="page catalog">
  <h1 class="page-title">{tr(locale, 'Що подивитися?', 'What to watch?')}</h1>

  <form
    class="search"
    role="search"
    onsubmit={(event) => {
      event.preventDefault();
      void onSearchSubmit();
    }}
  >
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5" />
    </svg>
    <label class="visually-hidden" for="catalog-query"
      >{tr(locale, 'Пошук фільмів, серіалів і людей', 'Search movies, series and people')}</label
    >
    <input
      id="catalog-query"
      type="search"
      bind:value={query}
      placeholder={tr(locale, 'Фільм, серіал або актор', 'Movie, series or actor')}
      enterkeyhint="search"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="search-suggest"
      aria-expanded={suggestOpen}
      aria-activedescendant={suggestActive >= 0 ? suggest?.optionId(suggestActive) : undefined}
      oninput={() => (suggestOpen = true)}
      onfocus={() => (suggestOpen = true)}
      onblur={() => (suggestOpen = false)}
      onkeydown={onSearchKeydown}
    />
    <SearchSuggest
      bind:this={suggest}
      bind:open={suggestOpen}
      bind:active={suggestActive}
      {query}
      {locale}
    />
    <button
      type="button"
      class="filters-btn"
      onclick={() => (showFilters = true)}
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
        onclick={() => selectCategory(option.value)}
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
        onclick={() => applyPreset(option.value)}
      >
        {tr(locale, option.uk, option.en)}
      </button>
    {/each}
  </div>

  {#if people.length && query.trim()}
    <section class="people" aria-labelledby="people-title">
      <h2 id="people-title" class="section-title">{tr(locale, 'Люди', 'People')}</h2>
      <div class="h-scroll">
        {#each people as person (person.id)}
          <a class="person" href={`/person/${person.id}`}>
            <img
              src={person.photo ?? '/fallback-person.svg'}
              srcset={profileSrcset(person.photo)}
              sizes="72px"
              alt=""
              width="72"
              height="72"
              loading="lazy"
            />
            <strong>{person.name}</strong>
            <small>
              {[person.department ? jobLabel(person.department, locale) : '', ...person.knownFor]
                .filter(Boolean)
                .slice(0, 2)
                .join(' · ')}
            </small>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <div bind:this={resultsAnchor} class="results-anchor"></div>

  {#if error}
    <div class="panel state">
      <p class="error">{error}</p>
      <button type="button" class="btn" onclick={() => fetchData(page)}>
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
      <EmptyState kind="search" />
      <p class="hint">
        {tr(
          locale,
          'За поточними фільтрами нічого не знайдено.',
          'No matches for current filters.'
        )}
      </p>
      <button type="button" class="btn" onclick={resetFilters}>
        {tr(locale, 'Скинути фільтри', 'Reset filters')}
      </button>
    </div>
  {:else if results.length}
    <p class="hint summary">
      {tr(locale, 'Знайдено', 'Found')}: {totalResults.toLocaleString(intlLocale(locale))}
      {#if totalPages > 1 && !phone}
        · {tr(locale, 'сторінка', 'page')} {page} / {totalPages}
      {/if}
    </p>

    <section class="results" class:dimmed={loading && !appending} aria-busy={loading}>
      {#each results as item (`${item.mediaType}-${item.id}`)}
        <MovieCard {item} />
      {/each}
    </section>

    {#if phone}
      {#if canLoadMore}
        <!-- Re-created per page: an observer fires only on changes, and after a short page
             the sentinel may still be in view. -->
        {#key page}
          <div class="load-more" use:observeSentinel>
            <button type="button" class="btn" onclick={loadMore} disabled={loading}>
              {loading ? '…' : tr(locale, 'Показати ще', 'Show more')}
            </button>
          </div>
        {/key}
      {/if}
    {:else if totalPages > 1}
      <nav class="pagination" aria-label={tr(locale, 'Сторінки результатів', 'Result pages')}>
        <button
          type="button"
          class="btn"
          onclick={() => goToPage(page - 1)}
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
                onclick={() => goToPage(token)}
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
          onclick={() => goToPage(page + 1)}
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
      onclick={scrollToTop}
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
    onclick={() => (showFilters = false)}
  ></button>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title">
    <header class="sheet-head">
      <h2 id="filters-title">{tr(locale, 'Фільтри', 'Filters')}</h2>
      <button
        type="button"
        class="btn btn-icon"
        onclick={() => (showFilters = false)}
        aria-label={tr(locale, 'Закрити', 'Close')}
      >
        ✕
      </button>
    </header>

    <form
      id="filters-form"
      class="filters"
      onsubmit={(event) => {
        event.preventDefault();
        void onFiltersSubmit();
      }}
    >
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
        <select class="input" bind:value={releasePeriod} onchange={onReleasePeriodChange}>
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
          <select class="input" bind:value={minVotes}>
            {#each voteOptions as votes (votes)}
              <option value={votes}>
                {votes === '0'
                  ? tr(locale, 'Будь-яка кількість', 'Any')
                  : Number(votes).toLocaleString(intlLocale(locale))}
              </option>
            {/each}
          </select>
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
          {tr(locale, 'Країна', 'Country')}
          <select class="input" bind:value={includeCountry}>
            <option value="">{tr(locale, 'Будь-яка', 'Any')}</option>
            {#each countryOptions as country (country.code)}
              <option value={country.code}>{tr(locale, country.uk, country.en)}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="row">
        <label>
          {tr(locale, 'Вік глядача', 'Viewer age')}
          <select class="input" bind:value={ageRating}>
            <option value="">{tr(locale, 'Будь-який', 'Any')}</option>
            {#each AGE_STEPS as age (age)}
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

      <label class="translation-pref">
        {tr(locale, 'Позначати, якщо немає перекладу', 'Flag titles without a translation')}
        <select class="input" bind:value={$translationPreference}>
          {#each TRANSLATION_LANGUAGES as language (language.code)}
            <option value={language.code}>{tr(locale, language.uk, language.en)}</option>
          {/each}
        </select>
        <small class="hint">
          {tr(
            locale,
            'Червона плашка з кодом мови — у TMDB немає назви чи опису цією мовою.',
            'A red badge with the language code: TMDB has no title or description in it.'
          )}
        </small>
      </label>

      <fieldset class="hidden-genres">
        <legend>{tr(locale, 'Не показувати', 'Hide genres')}</legend>
        <div class="genre-toggles">
          {#each HIDEABLE_GENRES as item (item.key)}
            <button
              type="button"
              class="chip"
              aria-pressed={$hiddenGenres.includes(item.key)}
              onclick={() => toggleHiddenGenre(item.key)}
            >
              {tr(locale, item.uk, item.en)}
            </button>
          {/each}
        </div>
        <p class="hint">
          {tr(locale, 'Запам’ятовується на цьому пристрої.', 'Saved on this device.')}
        </p>
      </fieldset>
    </form>

    <footer class="sheet-actions">
      <button type="button" class="btn" onclick={resetFilters}>
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
    position: relative;
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

  .load-more {
    display: grid;
    justify-items: center;
    padding: 4px 0 12px;
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
    bottom: calc(var(--nav-h) + var(--nav-safe) + 14px);
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

  .hidden-genres {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 8px;
  }

  .hidden-genres legend {
    padding: 0;
    margin-bottom: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }

  .genre-toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .hidden-genres .chip[aria-pressed='true'] {
    background: var(--danger-bg);
    border-color: var(--danger-bg);
    color: var(--text);
    text-decoration: line-through;
  }

  .hidden-genres .hint,
  .translation-pref .hint {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 400;
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

  .people .section-title {
    margin: 0 0 8px;
  }

  .people .h-scroll {
    grid-auto-columns: 96px;
  }

  .person {
    display: grid;
    justify-items: center;
    gap: 4px;
    text-align: center;
    color: var(--text);
  }

  .person img {
    width: 72px;
    height: 72px;
    border-radius: 999px;
    object-fit: cover;
    background: var(--surface-2);
  }

  .person strong {
    font-size: 0.82rem;
    line-height: 1.2;
  }

  .person small {
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
