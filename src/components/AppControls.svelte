<script lang="ts">
  import { onMount } from 'svelte';
  import { initializePreferences, localeMode, themeMode } from '../lib/preferences';
  import { LOCALES, tr } from '../lib/i18n';

  onMount(() => {
    initializePreferences();
  });

  function toggleTheme() {
    themeMode.set($themeMode === 'dark' ? 'light' : 'dark');
  }

  let badge = $derived(LOCALES.find((option) => option.code === $localeMode)?.badge ?? 'UA');
</script>

<header class="app-header">
  <div class="inner">
    <a class="brand" href="/" aria-label={tr($localeMode, 'На головну', 'Go to home')}>
      <img src="/icons/icon.svg" alt="" width="30" height="30" />
    </a>

    <div class="actions">
      <!-- A native select under the pill: the phone shows its own picker. -->
      <label class="pill language">
        <span aria-hidden="true">{badge}</span>
        <select bind:value={$localeMode} aria-label={tr($localeMode, 'Мова', 'Language')}>
          {#each LOCALES as option (option.code)}
            <option value={option.code} lang={option.code}>{option.name}</option>
          {/each}
        </select>
      </label>
      <button
        type="button"
        class="pill icon"
        onclick={toggleTheme}
        aria-label={$themeMode === 'dark'
          ? tr($localeMode, 'Увімкнути світлу тему', 'Switch to light theme')
          : tr($localeMode, 'Увімкнути темну тему', 'Switch to dark theme')}
      >
        {#if $themeMode === 'dark'}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  .app-header {
    view-transition-name: app-header;
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
    min-height: 40px;
  }

  .brand img {
    border-radius: 8px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .pill {
    min-width: 40px;
    height: 34px;
    padding: 0 10px;
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

  .language {
    position: relative;
  }

  .language:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .language select {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
    font-size: 16px;
  }

  .pill svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
