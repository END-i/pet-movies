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
    requestPersistentStorage();
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

// Favorites live only in this browser; a JSON file is the user's own backup.
export const FAVORITES_BACKUP_APP = 'pet-movies-favorites';

export interface FavoritesBackup {
  app: typeof FAVORITES_BACKUP_APP;
  version: 1;
  exportedAt: string;
  favorites: FavoritesStore;
}

export function buildFavoritesBackup(store: FavoritesStore, now = new Date()): FavoritesBackup {
  return { app: FAVORITES_BACKUP_APP, version: 1, exportedAt: now.toISOString(), favorites: store };
}

export function favoritesBackupFileName(now = new Date()): string {
  return `pet-movies-favorites-${now.toISOString().slice(0, 10)}.json`;
}

function isEntry(value: unknown): value is FavoriteEntry {
  const entry = value as FavoriteEntry | null;
  return (
    !!entry &&
    typeof entry.id === 'number' &&
    (entry.mediaType === 'movie' || entry.mediaType === 'tv') &&
    typeof entry.title === 'string'
  );
}

/** Returns null when the text is not a favorites backup. Invalid entries are dropped. */
export function parseFavoritesBackup(text: string): FavoritesStore | null {
  try {
    const data = JSON.parse(text) as Partial<FavoritesBackup> | null;
    if (
      data?.app !== FAVORITES_BACKUP_APP ||
      !data.favorites ||
      typeof data.favorites !== 'object'
    ) {
      return null;
    }
    const store: FavoritesStore = {};
    for (const [category, list] of Object.entries(data.favorites)) {
      const name = normalizeCategory(category);
      if (name && Array.isArray(list)) {
        store[name] = list.filter(isEntry).map((entry) => ({
          id: entry.id,
          mediaType: entry.mediaType,
          title: entry.title,
          originalTitle: entry.originalTitle,
          poster: entry.poster ?? null,
          year: entry.year ?? ''
        }));
      }
    }
    return store;
  } catch {
    return null;
  }
}

/** Adds imported titles to the saved ones (nothing is removed); returns how many were new. */
export function importFavorites(incoming: FavoritesStore): number {
  const store = readStore();
  let added = 0;
  for (const [category, list] of Object.entries(incoming)) {
    const current = store[category] ?? [];
    const fresh = list.filter(
      (item) => !current.some((entry) => sameItem(entry, item.id, item.mediaType))
    );
    if (fresh.length || !store[category]) store[category] = [...current, ...fresh];
    added += fresh.length;
  }
  writeStore(store);
  return added;
}

/** Ask the browser not to evict saved favorites under storage pressure (like cards does). */
export function requestPersistentStorage(): void {
  if (isBrowser()) void navigator.storage?.persist?.().catch(() => false);
}
