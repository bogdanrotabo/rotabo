#!/usr/bin/env node
/**
 * The two pictures pump.fun asks for when a token is created.
 *
 *   crypto-logo.png     1000 x 1000, the coin's image
 *   crypto-banner.png   1500 x 500,  the banner on the coin's page
 *
 * Nothing here is designed. Both are the official mark and the official card,
 * to the number: the same path, the same three-stop radial, the same 7% gap
 * between the gems, the same 4% inset, the same #fdf5ff-to-#f4e6f9 ground,
 * the same #a239c9 violet and #ffd41a gold split across "Need me? Find me."
 * -- every one of them read out of scripts/make-icons.ps1 and og-image.png,
 * which are what made the icons the site already wears.
 *
 * The coin image is icons/icon-512.png at 1000px and on nothing: transparent,
 * because that is what the official icon is. It carries the mark alone -- it
 * is shown at about forty pixels in a list, where a word is a smudge and a
 * shape is still a shape.
 *
 * Neither picture carries the ticker or the launch time. A picture with a
 * date in it is wrong the day after, and the ticker is not decided here.
 *
 *   npm i --no-save sharp
 *   node scripts/make-token-art.mjs          writes both
 *   node scripts/make-token-art.mjs --check  fails if either is missing or
 *                                            the wrong size; needs no sharp
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* scripts/make-icons.ps1 and index.html -- the values the site already uses. */
const VIOLET_1 = '#c264e0';   /* the radial's lit centre */
const VIOLET_2 = '#a239c9';   /* its middle stop, and the violet of the words */
const VIOLET_3 = '#7c2596';   /* its deep rim */
const GOLD     = '#ffd41a';   /* one colour at every stop, and the gold words */
const GREY     = '#6b5470';   /* the card's second line */
const GROUND_A = '#fdf5ff';   /* the card's ground, top */
const GROUND_B = '#f4e6f9';   /* and bottom */

/* The mark, character for character as the pages draw it, in its 200x260 box. */
const DIAMANT = 'M118.15,28.88 Q100,5 81.85,28.88 L23.15,106.12 Q5,130 23.15,153.88 ' +
                'L81.85,231.12 Q100,255 118.15,231.12 L176.85,153.88 Q195,130 176.85,106.12 Z';

const SANS = 'Liberation Sans, Segoe UI, Helvetica, Arial, DejaVu Sans, sans-serif';

function grad() {
  return `<radialGradient id="g" cx="50%" cy="50%" r="75%">
    <stop offset="0%" stop-color="${VIOLET_1}"/>
    <stop offset="45%" stop-color="${VIOLET_2}"/>
    <stop offset="100%" stop-color="${VIOLET_3}"/>
  </radialGradient>`;
}

/* The pair, laid out the way Draw-Pair lays it out: one gem is dw wide, the
   gap between them is 0.07*dw, so the pair spans 2.07*dw and stands 1.3*dw --
   and it is fitted into the box on whichever of the two runs out first. */
function pereche(boxX, boxY, boxW, boxH) {
  const dw = Math.min(boxW / 2.07, boxH / 1.3);
  const dh = dw * 1.3;
  const gap = dw * 0.07;
  const x0 = boxX + (boxW - (dw * 2 + gap)) / 2;
  const y0 = boxY + (boxH - dh) / 2;
  const gem = (x, fill) =>
    `<g transform="translate(${x} ${y0}) scale(${dw / 200} ${dh / 260})"><path d="${DIAMANT}" fill="${fill}"/></g>`;
  return gem(x0, 'url(#g)') + '\n  ' + gem(x0 + dw + gap, GOLD);
}

/* The coin image: Save-Icon 1000 0.04, with no background, which is exactly
   what icons/icon-512.png is -- its corner pixel has alpha 0. */
function logo() {
  const S = 1000, inset = S * 0.04;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>${grad()}</defs>
  ${pereche(inset, inset, S - inset * 2, S - inset * 2)}
</svg>
`;
}

/* The banner: the official card at 3:1. Same ground, same mark on the left,
   same words in the same two colours, in the same order. */
function banner() {
  const W = 1500, H = 500, X = 580;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${grad()}
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${GROUND_A}"/>
    <stop offset="100%" stop-color="${GROUND_B}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#ground)"/>
  ${pereche(70, 95, 440, 310)}
  <text x="${X}" y="200" font-family="${SANS}" font-size="78" font-weight="700" fill="${VIOLET_2}">Need <tspan fill="${GOLD}">me?</tspan></text>
  <text x="${X}" y="288" font-family="${SANS}" font-size="78" font-weight="700" fill="${VIOLET_2}">Find <tspan fill="${GOLD}">me.</tspan></text>
  <text x="${X}" y="350" font-family="${SANS}" font-size="30" font-weight="400" fill="${GREY}">Translators, drivers, movers, tutors, handymen - worldwide.</text>
  <text x="${X}" y="414" font-family="${SANS}" font-size="34" font-weight="700" fill="${VIOLET_2}">rotabo.<tspan fill="${GOLD}">app</tspan></text>
</svg>
`;
}

const IESIRI = [
  ['crypto-logo.png', 1000, 1000, logo()],
  ['crypto-banner.png', 1500, 500, banner()],
];

/* Width and height out of a PNG's first chunk, so --check needs no library. */
function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

if (process.argv.includes('--check')) {
  let rele = 0;
  for (const [f, w, h] of IESIRI) {
    const cale = join(root, f);
    const am = existsSync(cale) ? pngSize(readFileSync(cale)) : null;
    if (!am || am[0] !== w || am[1] !== h) {
      console.error(`make-token-art: ${f} is ${am ? am.join('x') : 'missing'}, expected ${w}x${h}`);
      rele++;
    }
  }
  if (rele) { console.error('make-token-art: run npm i --no-save sharp && node scripts/make-token-art.mjs'); process.exit(1); }
  console.log('make-token-art: both pictures present and the right size.');
  process.exit(0);
}

let sharp;
try { sharp = (await import('sharp')).default; }
catch { console.error('make-token-art: needs sharp. Run: npm i --no-save sharp'); process.exit(2); }

for (const [f, w, h, svg] of IESIRI) {
  await sharp(Buffer.from(svg), { density: 144 }).resize(w, h).png({ compressionLevel: 9 }).toFile(join(root, f));
  console.log(`  ${f}  (${w} x ${h})`);
}
console.log('make-token-art: done.');
