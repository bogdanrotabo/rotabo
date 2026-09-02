#!/usr/bin/env node
/*
 * lang.js carries the list of locale codes the site will detect. That list
 * and the /locales directory have to say the same thing, and nothing makes
 * them: add a dictionary and forget the list, and the language is simply
 * never detected -- the visitor is served English and nobody hears about it.
 *
 *   node scripts/check-locales.mjs     exits 1 on a mismatch
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const onDisk = readdirSync(join(root, "locales"))
  .filter(f => f.endsWith(".json"))
  .map(f => f.slice(0, -5))
  .sort();

const src = readFileSync(join(root, "lang.js"), "utf8");
const block = src.match(/var CODES = \[([\s\S]*?)\];/);
if (!block) {
  console.error("check-locales: could not find the CODES list in lang.js.");
  process.exit(2);
}
const inList = [...block[1].matchAll(/"([a-z]{2})"/g)].map(m => m[1]).sort();

const missing = onDisk.filter(c => !inList.includes(c));
const extra   = inList.filter(c => !onDisk.includes(c));

if (!missing.length && !extra.length) {
  console.log(`lang.js and /locales agree: ${onDisk.length} languages.`);
  process.exit(0);
}
if (missing.length) console.error(`On disk but NOT in lang.js (never detected): ${missing.join(", ")}`);
if (extra.length)   console.error(`In lang.js but NO dictionary on disk (404 on load): ${extra.join(", ")}`);
process.exit(1);
