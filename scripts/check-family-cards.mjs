#!/usr/bin/env node
// Guard the requested light panels and genuine, unfiltered brand assets.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
const root = new URL('../', import.meta.url);
for (const page of ['index.html', 'business.html']) {
  const html = readFileSync(new URL(page, root), 'utf8');
  const cards = html.match(/<div class="mp-brands" id="mainPartnerBrands">([\s\S]*?)<\/div>/)?.[1];
  assert(cards, `${page}: family panels present`);
  const brands = [['gift', 'gift.ceo', 'gift-mark.svg'], ['topten', 'topten.one', 'topten-mark.png'], ['selfies', 'selfies.lol', 'selfies-mark.png']];
  for (const [name, domain, asset] of brands) {
    assert(cards.includes(`class="mp-brand mp-${name}" href="https://${domain}"`), `${page}: preserved ${domain} link`);
    assert(cards.includes(`src="/icons/${asset}" width="40" height="40"`), `${page}: original ${domain} image`);
    assert(readFileSync(new URL(`icons/${asset}`, root)).length > 100);
  }
  assert.equal((cards.match(/<a /g) || []).length, 3);
  assert(!cards.includes('<svg'), `${page}: no substitute inline crown`);
  const common = html.match(/\.mp-brand\{([^}]+)\}/)?.[1] || '';
  assert(common.includes('background:#f6ecf9'), `${page}: lavender card background`);
  assert(!/\.mp-(gift|topten|selfies)\{/.test(html), `${page}: no dark per-brand override`);
  assert(html.includes('.mp-brand:focus-visible'), `${page}: visible keyboard focus`);
  for (const [i, script] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].entries()) {
    if (/\bsrc=|application\/ld\+json/.test(script[1])) continue;
    new Script(script[2], { filename: `${page}:inline-${i}` });
  }
}
const topTen = readFileSync(new URL('icons/topten-mark.png', root));
assert.equal(createHash('sha256').update(topTen).digest('hex'), '1da1c61f57862b846cd1f2deb3f01f1026955169b54421f4f660043ae40e0a9c', 'TopTen official 512px logo preserved byte-for-byte');
console.log('Family panels: two pages, three official logos/links, light backgrounds and inline scripts verified.');
