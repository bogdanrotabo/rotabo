#!/usr/bin/env node
/*
 * CACHE_VERSION, computed from what the service worker actually precaches.
 *
 *   node scripts/build-sw.mjs           writes the version into service-worker.js
 *   node scripts/build-sw.mjs --check   exits 1 if it is stale
 *
 * It was a number someone had to remember to raise. Nobody did: locales/*.json
 * gained keys across many deploys while the version stayed at v207, so every
 * returning visitor kept being served the dictionaries from before -- the site
 * switched language correctly and the one new string on the page did not,
 * because the key was missing from the copy in their cache and the code leaves
 * a string alone rather than blank it.
 *
 * A hash of the precached files cannot be forgotten: change one of them and
 * the version changes with it.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fisier = join(root, "service-worker.js");
const src = readFileSync(fisier, "utf8");

/* The list is read out of the worker itself rather than kept in step by hand,
   so a URL added there is hashed here without a second edit. */
const lista = /const PRECACHE_URLS = \[([\s\S]*?)\]\s*\.concat/.exec(src);
const coduri = /const LOCALE_CODES = \[([\s\S]*?)\];/.exec(src);
if (!lista || !coduri) {
  console.error("build-sw: cannot find PRECACHE_URLS or LOCALE_CODES in service-worker.js.");
  process.exit(2);
}
const urls = [...lista[1].matchAll(/"([^"]+)"/g)].map(m => m[1])
  .concat([...coduri[1].matchAll(/"([^"]+)"/g)].map(m => `/locales/${m[1]}.json`));

const h = createHash("sha256");
const lipsa = [];
for (const u of urls.sort()) {
  const rel = u === "/" ? "index.html" : u.replace(/^\//, "");
  const p = join(root, rel);
  if (!existsSync(p)) { lipsa.push(u); continue; }
  h.update(u); h.update(readFileSync(p));
}
/* A precached URL with no file behind it is a 404 the worker will keep
   retrying on every install, so it is an error, not a warning. */
if (lipsa.length) {
  console.error("build-sw: precached but not on disk — " + lipsa.join(", "));
  process.exit(2);
}
// The worker itself is not in its own list, but a change to its logic must
// also reach visitors holding an old copy.
h.update(src.replace(/const CACHE_VERSION = "[^"]*";/, ""));

const versiune = "v" + h.digest("hex").slice(0, 10);
const out = src.replace(/const CACHE_VERSION = "[^"]*";/,
                        `const CACHE_VERSION = "${versiune}";`);
if (out === src) { console.log(`service-worker.js is up to date: ${versiune}.`); process.exit(0); }
if (process.argv.includes("--check")) {
  console.error(`service-worker.js is STALE — CACHE_VERSION should be ${versiune}. ` +
                `Run: node scripts/build-sw.mjs`);
  process.exit(1);
}
writeFileSync(fisier, out);
console.log(`service-worker.js: CACHE_VERSION = ${versiune} (${urls.length} precached files).`);
