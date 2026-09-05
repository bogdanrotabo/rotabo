#!/usr/bin/env node
/*
 * The contract address, everywhere a machine reads it.
 *
 *   node scripts/build-crypto.mjs           writes them from TOKEN.MINT
 *   node scripts/build-crypto.mjs --check   exits 1 if any is stale
 *
 * The page sets the address with JavaScript, which is right for the box the
 * reader copies from -- it is one string in one config block, and the three
 * states of the page turn on it. It is wrong for everyone else. Google will
 * render the script eventually and X never will: a link preview reads the
 * meta tags off the served HTML and nothing else, so the card for the page
 * whose whole purpose is publishing an address was showing everything about
 * the coin except the address.
 *
 * So the address is also written into the markup, into three descriptions and
 * into the JSON-LD -- and because a string copied five times is a string that
 * goes stale in four of them, none of those are edited by hand. They are
 * derived from TOKEN.MINT, and --check fails the moment one of them disagrees.
 *
 * It handles the empty mint too, which is the state this page shipped in and
 * the state it would go back to for another launch: no address anywhere, and
 * the wording that says so rather than a stale one left behind.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fisier = join(root, "crypto.html");
const src = readFileSync(fisier, "utf8");

const m = /MINT:\s*'([^']*)'/.exec(src);
if (!m) {
  console.error("build-crypto: cannot find TOKEN.MINT in crypto.html.");
  process.exit(2);
}
const MINT = m[1];

/* Solana addresses are base58 and 32-44 characters; pump.fun's own end in
   "pump". A typo caught here is a typo that never reaches a reader. */
if (MINT && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(MINT)) {
  console.error(`build-crypto: TOKEN.MINT is not a base58 Solana address: ${MINT}`);
  process.exit(2);
}

const descPagina = MINT
  ? `The Rotabo token on Solana. Official contract address: ${MINT}. ` +
    `Launched on pump.fun — how to buy it, and what it is and is not.`
  : `The Rotabo token, launching on pump.fun on Solana. The official contract ` +
    `address, how to buy it, and what it is and is not.`;

const descCard = MINT
  ? `Official contract address: ${MINT} — the Rotabo token, launched on ` +
    `pump.fun on Solana. Published here and nowhere else.`
  : `Launching on pump.fun. The official contract address is published here ` +
    `and nowhere else.`;

/* The whole "about" object, not just the address inside it: an earlier
   version spliced the two address lines in and out, and with no mint that
   left a comma with nothing after it -- invalid JSON, which Google throws
   away whole rather than reading the half that is still fine. */
const despre = MINT
  ? `"about": {
    "@type": "Thing",
    "name": "Rotabo",
    "alternateName": "Rotabo token",
    "url": "https://pump.fun/coin/${MINT}",
    "identifier": {
      "@type": "PropertyValue",
      "propertyID": "Solana contract address",
      "value": "${MINT}"
    }
  }`
  : `"about": {
    "@type": "Thing",
    "name": "Rotabo",
    "alternateName": "Rotabo token"
  }`;

/* Each rule is [what it is, the pattern, what it should be]. A pattern that
   does not match exactly once is a page that changed shape under this script,
   which is an error rather than something to guess around. */
const REGULI = [
  ["meta description",
   /<meta name="description" content="[^"]*">/g,
   `<meta name="description" content="${descPagina}">`],
  ["og:description",
   /<meta property="og:description" content="[^"]*">/g,
   `<meta property="og:description" content="${descCard}">`],
  ["twitter:description",
   /<meta name="twitter:description" content="[^"]*">/g,
   `<meta name="twitter:description" content="${descCard}">`],
  ["JSON-LD about",
   /"about": \{[\s\S]*?\n  \}/g,
   despre],
  ["addrV",
   /<div class="v" id="addrV">[^<]*<\/div>/g,
   `<div class="v" id="addrV">${MINT}</div>`],
];

let out = src;
let rele = 0;
for (const [nume, tipar, cum] of REGULI) {
  const gasite = src.match(tipar);
  if (!gasite || gasite.length !== 1) {
    console.error(`build-crypto: expected exactly 1 ${nume} in crypto.html, found ${gasite ? gasite.length : 0}.`);
    process.exit(2);
  }
  const inainte = out;
  out = out.replace(tipar, cum);
  if (out !== inainte) rele++;
}

/* The JSON-LD has to parse. It is the one thing on this page a person never
   sees, so a broken one stays broken until somebody checks a search result. */
const ld = /<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/.exec(out);
if (!ld) {
  console.error("build-crypto: no JSON-LD block in crypto.html.");
  process.exit(2);
}
try { JSON.parse(ld[1]); }
catch (e) {
  console.error(`build-crypto: the JSON-LD would not parse — ${e.message}`);
  process.exit(2);
}

if (out === src) {
  console.log(`crypto.html is up to date${MINT ? ` with ${MINT}` : " (no mint yet)"}.`);
  process.exit(0);
}
if (process.argv.includes("--check")) {
  console.error(`crypto.html is STALE — ${rele} place(s) do not match TOKEN.MINT. ` +
                `Run: node scripts/build-crypto.mjs`);
  process.exit(1);
}
writeFileSync(fisier, out);
console.log(`crypto.html: ${rele} place(s) rewritten${MINT ? ` from ${MINT}` : " for no mint"}.`);
