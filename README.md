# Movie Finder (Astro + Svelte)

Проєкт пошуку фільмів, мультфільмів і TV-шоу на базі Astro + Svelte, без UI бібліотек.

## Що реалізовано

- Каталог із фільтрами: категорія, жанр, рейтинг, рік, сортування, пошук за назвою, країни, вікове обмеження.
- Важлива вимога: до вибору категорії запитів немає.
- Картка елемента: постер, назва, рік, країна, головні актори, короткий опис, кнопка деталей.
- Сторінка деталей: розширена інформація, актори з фото, рейтинг, трейлер, додавання в улюблені.
- Сторінка улюблених: категорії користувача, створення категорій, видалення, зберігання в `localStorage`.

## Сторінки

- `/` — пошук і список контенту
- `/details/[mediaType]/[id]` — деталі
- `/favorites` — улюблені

## Налаштування

1. Створіть `.env` у корені проєкту.
2. Додайте ключ TMDB:

```env
TMDB_API_KEY=your_tmdb_key
```

Отримати ключ можна в акаунті [TMDB](https://www.themoviedb.org/).

## PWA

- Manifest + service worker (`@vite-pwa/astro`, конфіг у `pwa.config.mjs`).
- Сторінки й `/api/*` кешуються за стратегією network-first, постери TMDB — cache-first.
- Без мережі показується пререндерена сторінка `/offline`; улюблені працюють офлайн (`localStorage`).
- Іконки: `public/icons/icon.svg` → PNG через `npm run icons`.
- Встановлення на телефон потребує HTTPS (сервер Node, `output: 'server'`).

## Команди

```bash
npm install
npm run dev
```

- `npm run test` — unit-тести (Vitest).
- `npm run test:e2e` — e2e на мобільному профілі (Playwright). API мокається, ключ TMDB не потрібен.
- `npm run typecheck` — `astro check`.
- `npm run ci` — format + typecheck + unit + e2e + build.

Для production-збірки:

```bash
npm run build
TMDB_API_KEY=... HOST=0.0.0.0 PORT=4321 node dist/server/entry.mjs
```

Ключ TMDB читається зі змінної середовища під час роботи сервера (`astro:env`, secret) і не потрапляє в `dist/`. Локально його бере з `.env`.

## Документація

- [docs/ROADMAP.md](docs/ROADMAP.md) — контекст змін, чекліст до релізу, ідеї й технічний борг.
