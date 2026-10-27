<script lang="ts">
  import { onMount } from 'svelte';
  import {
    countFavorites,
    deleteCategory,
    ensureCategory,
    FAVORITES_STORAGE_KEY,
    listCategories,
    loadFavorites,
    removeFromFavorites
  } from '../lib/favorites';
  import { localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';
  import { POSTER_SIZES, posterSrcset } from '../lib/images';
  import type { FavoriteEntry, FavoritesStore } from '../lib/types';

  type DisplayEntry = { category: string; item: FavoriteEntry };

  let store: FavoritesStore = {};
  let categories: string[] = [];
  let selectedCategory = '';
  let newCategory = '';
  let hydrated = false;

  $: locale = $localeMode;
  $: total = countFavorites(store);
  $: displayEntries = buildEntries(store, categories, selectedCategory);

  function buildEntries(
    current: FavoritesStore,
    allCategories: string[],
    selected: string
  ): DisplayEntry[] {
    if (selected) {
      return (current[selected] ?? []).map((item) => ({ category: selected, item }));
    }

    // "All" view: show each title once, with every category it belongs to.
    const seen = new Map<string, DisplayEntry & { categories: string[] }>();
    for (const category of allCategories) {
      for (const item of current[category] ?? []) {
        const key = `${item.mediaType}:${item.id}`;
        const existing = seen.get(key);
        if (existing) {
          existing.categories.push(category);
        } else {
          seen.set(key, { category, item, categories: [category] });
        }
      }
    }
    return [...seen.values()].map(({ categories: list, item }) => ({
      category: list.join(', '),
      item
    }));
  }

  function sync() {
    store = loadFavorites();
    categories = listCategories(store);
    if (selectedCategory && !categories.includes(selectedCategory)) {
      selectedCategory = '';
    }
  }

  function createCategory() {
    const value = newCategory.trim();
    if (!value) return;

    ensureCategory(value);
    newCategory = '';
    sync();
    selectedCategory = value;
  }

  function removeItem(entry: DisplayEntry) {
    const targets = selectedCategory ? [selectedCategory] : categories;
    targets.forEach((category) =>
      removeFromFavorites(category, entry.item.id, entry.item.mediaType)
    );
    sync();
  }

  function removeSelectedCategory() {
    if (!selectedCategory) return;
    const count = store[selectedCategory]?.length ?? 0;
    const confirmed = window.confirm(
      count
        ? tr(
            locale,
            `Видалити категорію «${selectedCategory}» разом з ${count} фільмами?`,
            `Delete category “${selectedCategory}” and its ${count} titles?`
          )
        : tr(
            locale,
            `Видалити категорію «${selectedCategory}»?`,
            `Delete category “${selectedCategory}”?`
          )
    );
    if (!confirmed) return;
    deleteCategory(selectedCategory);
    selectedCategory = '';
    sync();
  }

  onMount(() => {
    sync();
    hydrated = true;

    // Keep several open tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });
</script>

<main class="page">
  <header class="head">
    <h1 class="page-title">{tr(locale, 'Улюблені', 'Favorites')}</h1>
    {#if total}<span class="muted">{total}</span>{/if}
    {#if selectedCategory}
      <button
        type="button"
        class="btn btn-icon delete-category"
        on:click={removeSelectedCategory}
        aria-label={tr(
          locale,
          `Видалити категорію «${selectedCategory}»`,
          `Delete category “${selectedCategory}”`
        )}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"
          />
        </svg>
      </button>
    {/if}
  </header>

  <div class="chips" role="group" aria-label={tr(locale, 'Категорії', 'Categories')}>
    <button
      type="button"
      class="chip"
      aria-pressed={selectedCategory === ''}
      on:click={() => (selectedCategory = '')}
    >
      {tr(locale, 'Усі', 'All')}
    </button>
    {#each categories as category (category)}
      <button
        type="button"
        class="chip"
        aria-pressed={selectedCategory === category}
        on:click={() => (selectedCategory = category)}
      >
        {category} <span class="chip-count">{store[category]?.length ?? 0}</span>
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
    <button
      type="submit"
      class="btn btn-primary btn-icon add-category"
      disabled={!newCategory.trim()}
      aria-label={tr(locale, 'Створити категорію', 'Create category')}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </form>

  {#if !hydrated}
    <div class="skeleton" style="height: 120px"></div>
  {:else if displayEntries.length === 0}
    <div class="panel empty">
      <p class="hint">
        {selectedCategory
          ? tr(locale, 'Категорія порожня.', 'This category is empty.')
          : tr(
              locale,
              'Улюблених ще немає. Натисніть ♡ на картці фільму.',
              'No favorites yet. Tap ♡ on any title.'
            )}
      </p>
      {#if !selectedCategory}
        <a class="btn btn-primary" href="/">{tr(locale, 'До пошуку', 'Go to search')}</a>
      {/if}
    </div>
  {:else}
    <section class="list">
      {#each displayEntries as entry (`${entry.item.mediaType}-${entry.item.id}`)}
        <article class="fav-item">
          <a
            class="poster"
            href={`/details/${entry.item.mediaType}/${entry.item.id}`}
            tabindex="-1"
            aria-hidden="true"
          >
            <img
              src={entry.item.poster ?? '/fallback-poster.svg'}
              srcset={posterSrcset(entry.item.poster)}
              sizes={POSTER_SIZES.thumb}
              alt=""
              loading="lazy"
              width="185"
              height="278"
            />
          </a>
          <div class="body">
            <h2>
              <a href={`/details/${entry.item.mediaType}/${entry.item.id}`}>{entry.item.title}</a>
            </h2>
            <p class="muted">
              {entry.item.year || '—'} · {entry.item.mediaType === 'tv'
                ? tr(locale, 'Серіал', 'TV series')
                : tr(locale, 'Фільм', 'Movie')}
            </p>
            {#if !selectedCategory}
              <p class="category-mark">{entry.category}</p>
            {/if}
          </div>
          <button
            type="button"
            class="btn btn-icon remove"
            on:click={() => removeItem(entry)}
            aria-label={tr(
              locale,
              `Видалити «${entry.item.title}»`,
              `Remove “${entry.item.title}”`
            )}
          >
            ✕
          </button>
        </article>
      {/each}
    </section>
  {/if}
</main>

<style>
  .head {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .delete-category {
    margin-left: auto;
    align-self: center;
    color: var(--danger);
    background: transparent;
    border-color: transparent;
  }

  .head svg,
  .add-category svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .add-category {
    color: #fff;
  }

  .chip-count {
    opacity: 0.7;
    font-weight: 500;
  }

  .new-category {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .empty {
    display: grid;
    justify-items: start;
    gap: 12px;
  }

  .list {
    display: grid;
    gap: 10px;
  }

  .fav-item {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .poster img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 8px;
    background: var(--surface-2);
  }

  .body {
    min-width: 0;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  h2 a {
    color: var(--text);
  }

  .body p {
    margin: 4px 0 0;
    font-size: 0.85rem;
  }

  .category-mark {
    color: var(--accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove {
    color: var(--muted);
    background: transparent;
    border-color: transparent;
  }

  @media (min-width: 760px) {
    .list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
