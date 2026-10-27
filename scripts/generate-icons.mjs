// Renders public/icons/icon.svg into the PNG sizes required for PWA install (Android + iOS).
// Run manually after changing the SVG: node scripts/generate-icons.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(root, 'public', 'icons');
const svg = await readFile(path.join(iconsDir, 'icon.svg'), 'utf8');

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { file, size } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  await page.screenshot({ path: path.join(iconsDir, file), omitBackground: false });
  console.log(`generated ${file}`);
}

await browser.close();
