import { beforeEach, describe, expect, it } from 'vitest';
import {
  addToFavorites,
  categoriesContaining,
  countFavorites,
  DEFAULT_FAVORITES_CATEGORY,
  deleteCategory,
  ensureCategory,
  FAVORITES_STORAGE_KEY,
  isFavorite,
  isInCategory,
  listCategories,
  loadFavorites,
  removeFromFavorites,
  toggleFavorite
} from '../../src/lib/favorites';
import type { FavoriteEntry } from '../../src/lib/types';

const matrix: FavoriteEntry = {
  id: 603,
  mediaType: 'movie',
  title: 'Матриця',
  poster: null,
  year: '1999'
};
const dark: FavoriteEntry = {
  id: 70523,
  mediaType: 'tv',
  title: 'Dark',
  poster: null,
  year: '2017'
};

describe('favorites storage', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty and survives corrupted storage', () => {
    expect(loadFavorites()).toEqual({});
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not json');
    expect(loadFavorites()).toEqual({});
    localStorage.setItem(FAVORITES_STORAGE_KEY, '[1,2]');
    expect(loadFavorites()).toEqual({});
  });

  it('does not leak state between reads when storage is empty', () => {
    const first = loadFavorites();
    first.Hacked = [matrix];
    expect(loadFavorites()).toEqual({});
  });

  it('adds items once per category and newest first', () => {
    addToFavorites('Вечір', matrix);
    addToFavorites('Вечір', matrix);
    addToFavorites('Вечір', dark);
    expect(loadFavorites()['Вечір'].map((item) => item.id)).toEqual([70523, 603]);
  });

  it('treats the same id with a different media type as a different item', () => {
    addToFavorites('Mix', matrix);
    addToFavorites('Mix', { ...matrix, mediaType: 'tv' });
    expect(loadFavorites().Mix).toHaveLength(2);
  });

  it('normalizes category names and ignores blank ones', () => {
    addToFavorites('  Нове   кіно ', matrix);
    addToFavorites('   ', dark);
    expect(listCategories(loadFavorites())).toEqual(['Нове кіно']);
  });

  it('removes items and drops categories that become empty', () => {
    addToFavorites('A', matrix);
    addToFavorites('A', dark);
    removeFromFavorites('A', 603, 'movie');
    expect(isInCategory('A', 603, 'movie')).toBe(false);
    removeFromFavorites('A', 70523, 'tv');
    expect(loadFavorites()).toEqual({});
  });

  it('reports which categories contain an item and counts unique titles', () => {
    addToFavorites('A', matrix);
    addToFavorites('B', matrix);
    addToFavorites('B', dark);
    expect(categoriesContaining(603, 'movie')).toEqual(['A', 'B']);
    expect(countFavorites(loadFavorites())).toBe(2);
  });

  it('creates and deletes empty categories', () => {
    ensureCategory('Пізніше');
    expect(loadFavorites()['Пізніше']).toEqual([]);
    deleteCategory('Пізніше');
    expect(loadFavorites()).toEqual({});
  });

  it('♡ saves to the default category and removes from every category', () => {
    expect(toggleFavorite(matrix)).toBe(true);
    expect(isInCategory(DEFAULT_FAVORITES_CATEGORY, 603, 'movie')).toBe(true);
    addToFavorites('Класика', matrix);
    expect(isFavorite(603, 'movie')).toBe(true);

    expect(toggleFavorite(matrix)).toBe(false);
    expect(isFavorite(603, 'movie')).toBe(false);
    expect(categoriesContaining(603, 'movie')).toEqual([]);
  });

  it('♡ shows titles saved earlier in any category as favorites', () => {
    addToFavorites('Швидкі', dark);
    expect(isFavorite(70523, 'tv')).toBe(true);
    expect(isFavorite(603, 'movie')).toBe(false);
  });
});
