import type { FavoriteEntry, FavoritesStore, MediaType } from './types';

export const FAVORITES_STORAGE_KEY = 'movie-finder-favorites-v1';
export const DEFAULT_FAVORITES_CATEGORY = 'Загальне';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function sameItem(entry: FavoriteEntry, id: number, mediaType: MediaType) {
  return entry.id === id && entry.mediaType === mediaType;
}

function readStore(): FavoritesStore {
  // Always return a fresh object: callers mutate it before writing back.
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const store: FavoritesStore = {};
    for (const [category, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        store[category] = list as FavoriteEntry[];
      }
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: FavoritesStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or storage disabled: keep the UI working without persistence.
  }
}

function normalizeCategory(category: string): string {
  return category.trim().replace(/\s+/g, ' ');
}

export function loadFavorites(): FavoritesStore {
  return readStore();
}

export function saveFavorites(store: FavoritesStore): void {
  writeStore(store);
}

export function listCategories(store: FavoritesStore): string[] {
  return Object.keys(store).sort((a, b) => a.localeCompare(b, 'uk'));
}

export function countFavorites(store: FavoritesStore): number {
  const unique = new Set(
    Object.values(store)
      .flat()
      .map((entry) => `${entry.mediaType}:${entry.id}`)
  );
  return unique.size;
}

export function isInCategory(category: string, id: number, mediaType: MediaType): boolean {
  return (readStore()[category] ?? []).some((entry) => sameItem(entry, id, mediaType));
}

export function categoriesContaining(id: number, mediaType: MediaType): string[] {
  const store = readStore();
  return listCategories(store).filter((category) =>
    store[category].some((entry) => sameItem(entry, id, mediaType))
  );
}

export function addToFavorites(category: string, item: FavoriteEntry): FavoritesStore {
  const store = readStore();
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return store;

  const list = store[normalizedCategory] ?? [];
  if (!list.some((entry) => sameItem(entry, item.id, item.mediaType))) {
    store[normalizedCategory] = [item, ...list];
    writeStore(store);
  }

  return store;
}

export function removeFromFavorites(
  category: string,
  id: number,
  mediaType: MediaType
): FavoritesStore {
  const store = readStore();
  if (!store[category]) return store;

  store[category] = store[category].filter((entry) => !sameItem(entry, id, mediaType));
  if (store[category].length === 0) {
    delete store[category];
  }

  writeStore(store);
  return store;
}

/** True when the title is saved in any category (what the ♡ shows). */
export function isFavorite(id: number, mediaType: MediaType): boolean {
  return categoriesContaining(id, mediaType).length > 0;
}

/**
 * The ♡ action: saves to the default category, or removes the title from every category.
 * Returns whether the title is a favorite afterwards.
 */
export function toggleFavorite(item: FavoriteEntry): boolean {
  const saved = categoriesContaining(item.id, item.mediaType);
  if (saved.length) {
    saved.forEach((category) => removeFromFavorites(category, item.id, item.mediaType));
    return false;
  }
  addToFavorites(DEFAULT_FAVORITES_CATEGORY, item);
  return true;
}

export function ensureCategory(category: string): FavoritesStore {
  const store = readStore();
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return store;

  if (!store[normalizedCategory]) {
    store[normalizedCategory] = [];
    writeStore(store);
  }

  return store;
}

export function deleteCategory(category: string): FavoritesStore {
  const store = readStore();
  delete store[category];
  writeStore(store);
  return store;
}
