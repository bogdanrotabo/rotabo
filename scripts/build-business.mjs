#!/usr/bin/env node
/*
 * business.html is index.html with four lines changed. Nothing else.
 *
 * They were kept as two hand-maintained copies of 5,659 lines, which works
 * exactly until someone fixes a bug in one of them: on 2026-09-01 the ideas
 * board was repaired in index.html and business.html silently kept the broken
 * version. Two copies of a page do not stay identical because everyone means
 * well; they stay identical because one is generated.
 *
 *   node scripts/build-business.mjs           writes business.html
 *   node scripts/build-business.mjs --check   exits 1 if it is stale
 *
 * Edit index.html. Never edit business.html -- it is overwritten.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each pair is [what index.html says, what business.html must say]. Every one
// has to match exactly once: a silent no-match is how a generator quietly
// stops generating what you think it does.
const BANNER =
  "<!-- GENERATED FILE. Do not edit.\n" +
  "     Written from index.html by scripts/build-business.mjs.\n" +
  "     Change index.html, then run: node scripts/build-business.mjs -->";

const SWAPS = [
  ['<!DOCTYPE html>',
   '<!DOCTYPE html>\n' + BANNER],

  ['<html lang="en">',
   '<html lang="en" data-mode="business">'],

  ['<title>Rotabo — Need Me? Find Me!</title>',
   '<title>Rotabo for business — Need Me? Find Me!</title>'],

  ['<link rel="canonical" href="https://rotabo.app/">',
   '<link rel="canonical" href="https://rotabo.app/business.html">'],

  // Everything a link preview shows. These were the homepage's until
  // 2026-09-01: the title, canonical and mode were swapped and the six
  // social tags were not, so anyone sharing the business page on LinkedIn,
  // WhatsApp or Slack posted the homepage's headline pointing at the
  // homepage's address. The business page could not be shared at all.
  //
  // The wording is the page's own, from business.idea in the dictionaries:
  // "People need companies. People have companies." -- the same sentence as
  // the homepage with the one word that makes it a different page.
  ['<meta name="description" content="People need things. People have things. Rotabo connects them.">',
   '<meta name="description" content="People need companies. People have companies. Rotabo connects them.">'],

  ['<meta property="og:title" content="Rotabo — Need Me? Find Me!">',
   '<meta property="og:title" content="Rotabo for business — Need Me? Find Me!">'],

  ['<meta property="og:description" content="People need things. People have things. Rotabo connects them.">',
   '<meta property="og:description" content="People need companies. People have companies. Rotabo connects them.">'],

  ['<meta property="og:url" content="https://rotabo.app/">',
   '<meta property="og:url" content="https://rotabo.app/business.html">'],

  ['<meta name="twitter:title" content="Rotabo — Need Me? Find Me!">',
   '<meta name="twitter:title" content="Rotabo for business — Need Me? Find Me!">'],

  ['<meta name="twitter:description" content="People need things. People have things. Rotabo connects them.">',
   '<meta name="twitter:description" content="People need companies. People have companies. Rotabo connects them.">'],

  ['<a class="biz" href="/business.html" data-i18n="nav.business">Business</a>',
   '<a class="biz" href="/" data-i18n="nav.personal">For people</a>'],
];

const src = readFileSync(join(root, "index.html"), "utf8");

let out = src;
for (const [from, to] of SWAPS) {
  const n = out.split(from).length - 1;
  if (n !== 1) {
    console.error(`build-business: "${from.slice(0, 60)}…" matched ${n} times in index.html, expected 1.`);
    console.error("The pages have moved apart in a way this script does not know about. Fix SWAPS, do not edit business.html.");
    process.exit(2);
  }
  out = out.replace(from, to);
}

const target = join(root, "business.html");

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(target, "utf8"); } catch { /* missing counts as stale */ }
  if (current === out) {
    console.log("business.html is up to date with index.html.");
    process.exit(0);
  }
  console.error("business.html is STALE. Run: node scripts/build-business.mjs");
  process.exit(1);
}

writeFileSync(target, out);
console.log(`business.html written from index.html (${SWAPS.length} substitutions, ${out.split("\n").length} lines).`);
