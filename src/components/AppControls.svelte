<script lang="ts">
  import { onMount } from 'svelte';
  import { initializePreferences, localeMode, themeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';

  onMount(() => {
    initializePreferences();
  });

  function toggleTheme() {
    themeMode.set($themeMode === 'dark' ? 'light' : 'dark');
  }

  function toggleLocale() {
    localeMode.set($localeMode === 'uk' ? 'en' : 'uk');
  }
</script>

<header class="app-header">
  <div class="inner">
    <a class="brand" href="/" aria-label={tr($localeMode, 'На головну', 'Go to home')}>
      <img src="/icons/icon.svg" alt="" width="28" height="28" />
      <span>PET Movies</span>
    </a>

    <div class="actions">
      <button
        type="button"
        class="pill"
        on:click={toggleLocale}
        aria-label={tr($localeMode, 'Змінити мову на English', 'Switch language to Українська')}
      >
        {$localeMode === 'uk' ? 'UA' : 'EN'}
      </button>
      <button
        type="button"
        class="pill icon"
        on:click={toggleTheme}
        aria-label={$themeMode === 'dark'
          ? tr($localeMode, 'Увімкнути світлу тему', 'Switch to light theme')
          : tr($localeMode, 'Увімкнути темну тему', 'Switch to dark theme')}
      >
        {#if $themeMode === 'dark'}
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  .app-header {
    position: sticky;
    top: 0;
    z-index: 40;
    padding-top: var(--safe-top);
    background: var(--header-bg);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }

  .inner {
    width: min(1120px, 100%);
    margin: 0 auto;
    height: var(--header-h);
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-weight: 800;
    font-size: 1.05rem;
  }

  .brand img {
    border-radius: 8px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .pill {
    min-width: 44px;
    height: 40px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    display: inline-grid;
    place-items: center;
  }

  .pill svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
