#!/usr/bin/env node
/**
 * Generates PWA icon PNGs and the Open Graph image from icon-source.png
 * (Kimber and Siona silhouettes). Run: npm run generate-icons
 */
import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'assets', 'app-icons');
const sourcePath = join(publicDir, 'icon-source.png');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  const outPath = join(publicDir, `icon-${size}.png`);
  await sharp(sourcePath).resize(size, size).png().toFile(outPath);
  console.log(`Generated ${outPath}`);
}

const ogPath = join(publicDir, 'social-og.png');
await sharp(sourcePath)
  .resize(630, 630)
  .extend({
    top: 0,
    bottom: 0,
    left: 285,
    right: 285,
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  })
  .png()
  .toFile(ogPath);
console.log(`Generated ${ogPath}`);

console.log('Done.');
