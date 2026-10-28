import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DICTIONARIES, LOCALES, parseLocale, tr, trf } from '../../src/lib/i18n';
import { JOBS_UK } from '../../src/lib/filmography';

const srcDir = path.resolve(__dirname, '../../src');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full);
    return /\.(svelte|astro|ts)$/.test(name) && !full.includes(`${path.sep}locales${path.sep}`)
      ? [full]
      : [];
  });
}

const LITERAL = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const CYRILLIC = /[а-яіїєґ]/i;
const unquote = (literal: string) => literal.slice(1, -1).replace(/\\'/g, "'");

/** English strings the UI can show: `tr`/`trf` calls, `{ uk, en }` pairs and `['uk', 'en']` tuples. */
function englishStrings(): { strings: Set<string>; dynamic: string[] } {
  const strings = new Set<string>(Object.keys(JOBS_UK));
  const dynamic: string[] = [];
  const patterns = [
    new RegExp(
      String.raw`\btrf?\(\s*[^,()]+(?:\([^()]*\))?\s*,\s*${LITERAL}\s*,\s*${LITERAL}`,
      'g'
    ),
    new RegExp(String.raw`\buk:\s*${LITERAL}\s*,\s*en:\s*${LITERAL}`, 'g'),
    new RegExp(String.raw`\[\s*${LITERAL}\s*,\s*${LITERAL}\s*\]`, 'g')
  ];

  for (const file of listFiles(srcDir)) {
    const source = readFileSync(file, 'utf8');
    patterns.forEach((pattern, index) => {
      for (const match of source.matchAll(pattern)) {
        const [uk, en] = [unquote(match[1]), unquote(match[2])];
        // Tuples are only translation pairs when the first item is Ukrainian.
        if (index === 2 && (!CYRILLIC.test(uk) || CYRILLIC.test(en))) continue;
        if (en.includes('${')) dynamic.push(`${path.relative(srcDir, file)}: ${en}`);
        else strings.add(en);
      }
    });
  }

  return { strings, dynamic };
}

describe('locales', () => {
  const { strings, dynamic } = englishStrings();

  it('finds the UI strings', () => {
    expect(strings.size).toBeGreaterThan(150);
    expect(strings.has('What to watch?')).toBe(true);
    expect(strings.has('Coming {date}')).toBe(true);
  });

  it('uses {placeholders}, not ${…}, so strings can be looked up', () => {
    expect(dynamic).toEqual([]);
  });

  for (const locale of LOCALES.filter((option) => DICTIONARIES[option.code])) {
    it(`${locale.name}: every English string is translated`, () => {
      const dictionary = DICTIONARIES[locale.code] ?? {};
      expect([...strings].filter((text) => !dictionary[text]?.trim())).toEqual([]);
    });

    it(`${locale.name}: no leftover entries and the same placeholders`, () => {
      const dictionary = DICTIONARIES[locale.code] ?? {};
      expect(Object.keys(dictionary).filter((text) => !strings.has(text))).toEqual([]);
      const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
      expect(
        Object.entries(dictionary).filter(([en, text]) => placeholders(en) !== placeholders(text))
      ).toEqual([]);
    });
  }
});

describe('tr / trf', () => {
  it('picks Ukrainian, English or the dictionary entry', () => {
    expect(tr('uk', 'Фільтри', 'Filters')).toBe('Фільтри');
    expect(tr('en', 'Фільтри', 'Filters')).toBe('Filters');
    expect(tr('de', 'Фільтри', 'Filters')).toBe(DICTIONARIES.de?.Filters);
    expect(tr('fr', 'Щось нове', 'Something new')).toBe('Something new');
  });

  it('fills placeholders', () => {
    expect(trf('en', 'Анонс · {date}', 'Coming {date}', { date: '1 May' })).toBe('Coming 1 May');
  });

  it('parses stored locales', () => {
    expect(parseLocale('bg')).toBe('bg');
    expect(parseLocale('ru')).toBe('uk');
  });
});
