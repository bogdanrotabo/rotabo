#!/usr/bin/env node
// Compose around the shipped original SVG; never redraw the two-diamond mark.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'og-image.png');
if (process.argv.includes('--check')) {
  const b = readFileSync(out);
  if (b.toString('ascii', 1, 4) !== 'PNG' || b.readUInt32BE(16) !== 1200 || b.readUInt32BE(20) !== 630) throw new Error('Expected 1200x630 PNG');
  console.log('Brand card: 1200x630 PNG verified.');
  process.exit(0);
}
const require = createRequire(process.env.BRAND_RENDERER_NODE_MODULES
  ? join(process.env.BRAND_RENDERER_NODE_MODULES, '__brand.cjs') : import.meta.url);
const sharp = require('sharp');
const mark = readFileSync(join(root, 'icons/rotabo-mark.svg')).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f6ecf9"/>
  <circle cx="60" cy="310" r="250" fill="none" stroke="#e2c3ee" stroke-width="2"/>
  <circle cx="1140" cy="310" r="250" fill="none" stroke="#e2c3ee" stroke-width="2"/>
  <image x="480" y="48" width="240" height="140" xlink:href="data:image/svg+xml;base64,${mark}"/>
  <g text-anchor="middle" font-family="Arial, sans-serif" fill="#7c2d9c">
    <text x="600" y="277" font-size="80" font-weight="800">Rotabo</text>
    <text x="600" y="352" font-size="44" font-weight="700">Need Me? Find Me!</text>
    <text x="600" y="425" font-size="30">People need things.</text>
    <text x="600" y="466" font-size="30">People have things.</text>
    <text x="600" y="517" font-size="30" font-weight="700">Rotabo connects them.</text>
  </g>
</svg>`;
await sharp(Buffer.from(svg), { density: 144 }).resize(1200, 630).png().toFile(out);
console.log('Original Rotabo mark composed into og-image.png.');
