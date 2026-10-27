<script lang="ts">
  import { localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';

  export let active: 'search' | 'favorites' | null = null;
</script>

<nav class="bottom-nav" aria-label={tr($localeMode, 'Основна навігація', 'Main navigation')}>
  <a
    href="/"
    class:active={active === 'search'}
    aria-current={active === 'search' ? 'page' : undefined}
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5" />
    </svg>
    <span>{tr($localeMode, 'Пошук', 'Search')}</span>
  </a>
  <a
    href="/favorites"
    class:active={active === 'favorites'}
    aria-current={active === 'favorites' ? 'page' : undefined}
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1Z"
      />
    </svg>
    <span>{tr($localeMode, 'Улюблені', 'Favorites')}</span>
  </a>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    height: calc(var(--nav-h) + var(--nav-safe));
    padding-bottom: var(--nav-safe);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: var(--header-bg);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--border);
  }

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
  }

  a.active {
    color: var(--primary);
  }

  svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  a.active svg {
    fill: currentColor;
    fill-opacity: 0.18;
  }

  @media (min-width: 900px) {
    .bottom-nav {
      left: 50%;
      right: auto;
      bottom: 16px;
      width: 320px;
      transform: translateX(-50%);
      height: var(--nav-h);
      padding-bottom: 0;
      border: 1px solid var(--border);
      border-radius: 999px;
      box-shadow: var(--shadow);
    }
  }
</style>
