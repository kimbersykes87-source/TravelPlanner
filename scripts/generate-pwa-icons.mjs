#!/usr/bin/env node
/**
 * Generates PWA icon PNGs from icon-pwa.svg
 * Run: npm run generate-icons
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public', 'assets', 'app-icons');
const svgPath = join(publicDir, 'icon-pwa.svg');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = readFileSync(svgPath);

for (const size of SIZES) {
  const outPath = join(publicDir, `icon-${size}.png`);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Generated ${outPath}`);
}

// Social / Open Graph image: 1200x630 (white US on black)
const ogPath = join(publicDir, 'social-og.png');
await sharp(svg)
  .resize(630, 630)
  .extend({
    top: 0,
    bottom: 0,
    left: 285,
    right: 285,
    background: { r: 0, g: 0, b: 0, alpha: 1 }
  })
  .png()
  .toFile(ogPath);
console.log(`Generated ${ogPath}`);

console.log('Done.');
