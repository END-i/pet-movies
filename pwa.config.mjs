// PWA (manifest + service worker) options for @vite-pwa/astro.
// The app is server-rendered, so pages are cached at runtime (network first) instead of precached;
// only static assets and the prerendered /offline page are precached.

/** @type {import('@vite-pwa/astro').AstroPWAOptions} */
export const pwaOptions = {
  registerType: 'autoUpdate',
  // Registration happens in Layout.astro.
  injectRegister: false,
  includeAssets: ['favicon.svg', 'fallback-poster.svg', 'fallback-person.svg', 'logo.svg'],
  manifest: {
    id: '/',
    name: 'PET Movie Search',
    short_name: 'PET Movies',
    description: 'Пошук фільмів, мультфільмів і серіалів з добірками та улюбленими',
    theme_color: '#0b0f1a',
    background_color: '#0b0f1a',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    lang: 'uk-UA',
    categories: ['entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }
    ],
    shortcuts: [{ name: 'Улюблені', url: '/favorites' }]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
    // SSR pages are not in the precache, so a catch-all navigation fallback would hide them.
    navigateFallback: null,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
          precacheFallback: { fallbackURL: '/offline' }
        }
      },
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] }
        }
      },
      {
        urlPattern: /^https:\/\/image\.tmdb\.org\/t\/p\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'tmdb-images',
          expiration: { maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      }
    ]
  }
};
