import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default [
  {
    // .astro files are checked by `astro check` (no eslint-plugin-astro here).
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.astro/**',
      '.vercel/**',
      'test-results/**',
      'playwright-report/**',
      '**/*.astro'
    ]
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: tsParser, extraFileExtensions: ['.svelte'] }
    }
  },
  {
    files: ['**/*.svelte'],
    rules: {
      // Components still use legacy `$:` statements (runes migration is in docs/ROADMAP.md, section 6);
      // these rules misread its guarded reload blocks. Local Date/Map/URLSearchParams are not state.
      'svelte/infinite-reactive-loop': 'off',
      'svelte/prefer-svelte-reactivity': 'off',
      'no-useless-assignment': 'off'
    }
  },
  {
    rules: {
      // `_name` marks a value that is unused on purpose (e.g. destructured away).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }
      ]
    }
  }
];
