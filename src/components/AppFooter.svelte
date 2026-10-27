<script lang="ts">
  import { localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';
</script>

<footer class="app-footer">
  <p>
    {tr($localeMode, 'Дані про фільми та серіали надає', 'Movie and TV data provided by')}
    <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>.
  </p>
  <!-- Wording required by the TMDB API terms of use; keep it in English. -->
  <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
</footer>

<style>
  .app-footer {
    width: min(1120px, 100%);
    margin: 0 auto;
    padding: 8px 16px 24px;
    color: var(--muted);
    font-size: 0.78rem;
    text-align: center;
  }

  p {
    margin: 4px 0;
  }
</style>
