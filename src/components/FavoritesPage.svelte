<script lang="ts">
  import { onMount } from 'svelte';
  import {
    buildFavoritesBackup,
    countFavorites,
    deleteCategory,
    ensureCategory,
    FAVORITES_STORAGE_KEY,
    favoritesBackupFileName,
    importFavorites,
    listCategories,
    loadFavorites,
    moveFavorite,
    renameCategory,
    setWatched,
    sortFavorites,
    type FavoritesSort,
    parseFavoritesBackup,
    removeFromFavorites
  } from '../lib/favorites';
  import { localeMode } from '../lib/preferences';
  import { intlLocale, tr, trf } from '../lib/i18n';
  import { POSTER_SIZES, posterSrcset } from '../lib/images';
  import type { FavoriteEntry, FavoritesStore } from '../lib/types';
  import EmptyState from './EmptyState.svelte';
  import { swipeToRemove } from '../lib/swipe';

  type DisplayEntry = { category: string; item: FavoriteEntry };

  let store: FavoritesStore = $state({});
  let categories: string[] = $state([]);
  let selectedCategory = $state('');
  let newCategory = $state('');
  let hydrated = $state(false);
  let sort: FavoritesSort = $state('added');
  let hideWatched = $state(false);
  let backupMessage = $state('');
  let backupError = $state(false);
  let importInput: HTMLInputElement = $state();

  function buildEntries(
    current: FavoritesStore,
    allCategories: string[],
    selected: string
  ): DisplayEntry[] {
    if (selected) {
      return (current[selected] ?? []).map((item) => ({ category: selected, item }));
    }

    // "All" view: show each title once, with every category it belongs to.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local value, not component state
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

  function toggleWatched(entry: DisplayEntry) {
    setWatched(entry.item.id, entry.item.mediaType, !entry.item.watched);
    sync();
  }

  function moveItem(entry: DisplayEntry, event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    if (select.value)
      moveFavorite(selectedCategory, select.value, entry.item.id, entry.item.mediaType);
    select.value = '';
    sync();
  }

  function renameSelectedCategory() {
    if (!selectedCategory) return;
    const name = window.prompt(
      tr(locale, 'Нова назва категорії', 'New category name'),
      selectedCategory
    );
    if (name === null) return;
    const renamed = renameCategory(selectedCategory, name);
    sync();
    if (renamed) selectedCategory = renamed;
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
        ? trf(
            locale,
            'Видалити категорію «{name}» разом з {count} фільмами?',
            'Delete category “{name}” and its {count} titles?',
            { name: selectedCategory, count }
          )
        : trf(locale, 'Видалити категорію «{name}»?', 'Delete category “{name}”?', {
            name: selectedCategory
          })
    );
    if (!confirmed) return;
    deleteCategory(selectedCategory);
    selectedCategory = '';
    sync();
  }

  function exportFavorites() {
    const blob = new Blob([JSON.stringify(buildFavoritesBackup(store), null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = favoritesBackupFileName();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    backupError = false;
    backupMessage = trf(locale, 'Збережено файл: {count}', 'Saved a file: {count}', {
      count: total
    });
  }

  async function onImportFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const incoming = parseFavoritesBackup(await file.text());
    if (!incoming) {
      backupError = true;
      backupMessage = tr(
        locale,
        'Це не файл з улюбленими PET Movies.',
        'This is not a PET Movies favorites file.'
      );
      return;
    }
    const added = importFavorites(incoming);
    sync();
    backupError = false;
    backupMessage = trf(locale, 'Додано: {count}', 'Added: {count}', { count: added });
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
  let locale = $derived($localeMode);
  let total = $derived(countFavorites(store));
  let displayEntries = $derived(
    sortFavorites(
      buildEntries(store, categories, selectedCategory).filter(
        (entry) => !hideWatched || !entry.item.watched
      ),
      sort,
      intlLocale(locale)
    )
  );
  let otherCategories = $derived(categories.filter((category) => category !== selectedCategory));
</script>

<main class="page">
  <header class="head">
    <h1 class="page-title">{tr(locale, 'Улюблені', 'Favorites')}</h1>
    {#if total}<span class="muted">{total}</span>{/if}
    {#if selectedCategory}
      <button
        type="button"
        class="btn btn-icon rename-category"
        onclick={renameSelectedCategory}
        aria-label={trf(locale, 'Перейменувати категорію «{name}»', 'Rename category “{name}”', {
          name: selectedCategory
        })}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
        </svg>
      </button>
      <button
        type="button"
        class="btn btn-icon delete-category"
        onclick={removeSelectedCategory}
        aria-label={trf(locale, 'Видалити категорію «{name}»', 'Delete category “{name}”', {
          name: selectedCategory
        })}
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
      onclick={() => (selectedCategory = '')}
    >
      {tr(locale, 'Усі', 'All')}
    </button>
    {#each categories as category (category)}
      <button
        type="button"
        class="chip"
        aria-pressed={selectedCategory === category}
        onclick={() => (selectedCategory = category)}
      >
        {category} <span class="chip-count">{store[category]?.length ?? 0}</span>
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
      aria-label={tr(locale, 'Створити категорію', 'Create category')}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </form>

  {#if hydrated && total}
    <div class="toolbar">
      <label>
        <span class="visually-hidden">{tr(locale, 'Сортування', 'Sorting')}</span>
        <select class="input" bind:value={sort}>
          <option value="added">{tr(locale, 'Нещодавно додані', 'Recently added')}</option>
          <option value="title">{tr(locale, 'За назвою', 'By title')}</option>
          <option value="year">{tr(locale, 'Новіші', 'Newest')}</option>
        </select>
      </label>
      <button
        type="button"
        class="chip"
        aria-pressed={hideWatched}
        onclick={() => (hideWatched = !hideWatched)}
      >
        {tr(locale, 'Сховати переглянуті', 'Hide watched')}
      </button>
    </div>
  {/if}

  {#if !hydrated}
    <div class="skeleton" style="height: 120px"></div>
  {:else if displayEntries.length === 0}
    <div class="panel empty">
      <EmptyState kind="favorites" />
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
        <article
          class="fav-item"
          class:watched={entry.item.watched}
          use:swipeToRemove={{ onSwipe: () => removeItem(entry) }}
        >
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
                ? tr(locale, 'Серіал', 'Series')
                : tr(locale, 'Фільм', 'Movie')}
            </p>
            {#if !selectedCategory}
              <p class="category-mark">{entry.category}</p>
            {:else if otherCategories.length}
              <label class="move">
                <span class="visually-hidden">
                  {trf(locale, 'Перемістити «{title}»', 'Move “{title}”', {
                    title: entry.item.title
                  })}
                </span>
                <select class="input" onchange={(event) => moveItem(entry, event)}>
                  <option value="">{tr(locale, 'Перемістити до…', 'Move to…')}</option>
                  {#each otherCategories as category (category)}
                    <option value={category}>{category}</option>
                  {/each}
                </select>
              </label>
            {/if}
          </div>
          <button
            type="button"
            class="btn btn-icon watched-toggle"
            aria-pressed={!!entry.item.watched}
            onclick={() => toggleWatched(entry)}
            aria-label={trf(locale, 'Переглянуто: «{title}»', 'Watched: “{title}”', {
              title: entry.item.title
            })}
          >
            ✓
          </button>
          <button
            type="button"
            class="btn btn-icon remove"
            onclick={() => removeItem(entry)}
            aria-label={trf(locale, 'Видалити «{title}»', 'Remove “{title}”', {
              title: entry.item.title
            })}
          >
            ✕
          </button>
        </article>
      {/each}
    </section>
  {/if}

  <section class="backup" aria-labelledby="backup-title">
    <h2 id="backup-title" class="section-title">{tr(locale, 'Резервна копія', 'Backup')}</h2>
    <p class="hint">
      {tr(
        locale,
        'Улюблені зберігаються лише в цьому браузері. Збережіть файл, щоб не втратити їх.',
        'Favorites are stored only in this browser. Save a file so you do not lose them.'
      )}
    </p>
    <div class="backup-actions">
      <button type="button" class="btn" onclick={exportFavorites} disabled={!hydrated || !total}>
        {tr(locale, 'Експортувати', 'Export')}
      </button>
      <button type="button" class="btn" onclick={() => importInput.click()} disabled={!hydrated}>
        {tr(locale, 'Імпортувати', 'Import')}
      </button>
      <input
        class="visually-hidden"
        type="file"
        accept="application/json,.json"
        tabindex="-1"
        aria-label={tr(locale, 'Файл з улюбленими', 'Favorites file')}
        bind:this={importInput}
        onchange={onImportFile}
      />
    </div>
    {#if backupMessage}
      <p class="hint" class:error={backupError} role={backupError ? 'alert' : 'status'}>
        {backupMessage}
      </p>
    {/if}
  </section>
</main>

<style>
  .backup {
    display: grid;
    gap: 8px;
    margin-top: 24px;
  }

  .backup .section-title,
  .backup .hint {
    margin: 0;
  }

  .backup .error {
    color: var(--danger);
  }

  .backup-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

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
    grid-template-columns: 64px minmax(0, 1fr) auto auto;
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

  .fav-item.watched .poster,
  .fav-item.watched .body {
    opacity: 0.55;
  }

  .watched-toggle {
    color: var(--muted);
    background: transparent;
    font-weight: 800;
  }

  .watched-toggle[aria-pressed='true'] {
    color: var(--success);
    border-color: var(--success);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .toolbar select {
    min-height: 40px;
  }

  .move select {
    margin-top: 4px;
    min-height: 36px;
    padding: 4px 8px;
    font-size: 0.85rem;
  }

  .rename-category {
    margin-left: auto;
    align-self: center;
    color: var(--muted);
    background: transparent;
    border-color: transparent;
  }

  .rename-category + .delete-category {
    margin-left: 0;
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
