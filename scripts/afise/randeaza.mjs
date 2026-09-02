#!/usr/bin/env node
/*
 * Renders the poster to PDF, one language, three sizes.
 *
 *   node scripts/afise/randeaza.mjs ro            A4, A3 and A2 into /afise
 *   node scripts/afise/randeaza.mjs ro --png      also a PNG, to look at
 *   node scripts/afise/randeaza.mjs --toate       every language in texte.mjs
 *
 * A3 and A2 are the same page printed larger, not a redraw: Chromium is asked
 * for a page of that size and the whole A4 layout is scaled into it. The ISO
 * A ratio is constant, so nothing is cropped and nothing is stretched -- what
 * a primărie pins to a panel is the same poster the office printer produced.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { paginaHTML, ASEAZA, A4 } from "./sablon.mjs";
import { TEXTE, CHEI } from "./texte.mjs";

/* Playwright may be a dependency here or installed globally; try both rather
   than make the poster build depend on where node_modules happens to be. */
async function ceruPlaywright() {
  for (const spec of ["playwright", "playwright-core",
                      "/opt/node22/lib/node_modules/playwright/index.mjs"]) {
    try { return (await import(spec)).chromium; } catch (e) {}
  }
  throw new Error("playwright not found — npm i -D playwright");
}

/* PLAYWRIGHT_BROWSERS_PATH usually points playwright at its own browser; when
   the versioned directory does not match the installed package, name the
   binary directly instead of letting it try to download one. */
function ceruChromium() {
  const baza = process.env.PLAYWRIGHT_BROWSERS_PATH || "";
  if (!baza || !existsSync(baza)) return undefined;
  for (const d of readdirSync(baza).filter(d => d.startsWith("chromium")).sort().reverse()) {
    for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell"]) {
      const p = join(baza, d, rel);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const aici = dirname(fileURLToPath(import.meta.url));
const root = join(aici, "..", "..");
/* Renders land in a staging directory. /afise holds files a primărie is
   printing from, and a run started to try a wording out must not overwrite
   one of them; --publica is the deliberate step that does. */
const PROBA = join(aici, "proba");

/* Chromium will not take a page size in points, and asking for it in
   millimetres gives a page 0.6pt wider than A4 -- the request is converted
   through whole CSS pixels. Asking in pixels at 96 per inch lands on the
   ISO size exactly.

   The ISO A ratio is √2 between consecutive sizes, so the same A4 layout
   fills A3 at 1.4142 and A2 at exactly 2 -- no redraw, no crop, and the same
   proportions on a street panel as on the office printer. */
const px = (pt) => pt * 96 / 72;
const MARIMI = [
  { cod: "A4", w: px(595.28),  h: px(841.89),  scala: 1 },
  { cod: "A3", w: px(841.89),  h: px(1190.55), scala: Math.SQRT2 },
  { cod: "A2", w: px(1190.55), h: px(1683.78), scala: 2 },
];

const logo = "data:image/png;base64," +
  readFileSync(join(aici, "logo.png")).toString("base64");

const argv = process.argv.slice(2);
const png = argv.includes("--png");
const iesire = argv.includes("--publica") ? join(root, "afise") : PROBA;
const limbi = argv.includes("--toate")
  ? Object.keys(TEXTE)
  : argv.filter(a => !a.startsWith("--"));
if (!limbi.length) { console.error("randeaza: which language? (or --toate)"); process.exit(2); }

/* A missing key would render as the word "undefined" across a printed poster,
   so it is caught before the browser starts rather than after 84 files. */
for (const l of limbi) {
  if (!TEXTE[l]) { console.error(`randeaza: no text for "${l}" in texte.mjs`); process.exit(2); }
  const lipsa = CHEI.filter(k => !TEXTE[l][k]);
  if (lipsa.length) { console.error(`randeaza: ${l} missing ${lipsa.join(", ")}`); process.exit(2); }
}

mkdirSync(iesire, { recursive: true });
const chromium = await ceruPlaywright();
const b = await chromium.launch({
  executablePath: ceruChromium(),
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

for (const lang of limbi) {
  const html = paginaHTML(lang, TEXTE[lang], logo);
  const p = await b.newPage({ viewport: { width: Math.ceil(A4.w), height: Math.ceil(A4.h) } });
  await p.setContent(html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);

  /* Each block is moved onto the baseline the designer set, and shrunk if the
     language needs more room than the Romanian did. What had to shrink is
     printed: a block that reached the floor and still does not fit is a
     wording to shorten, not a poster to publish. */
  const raport = await p.evaluate(`(${ASEAZA.toString()})()`);
  if (raport.length) console.warn(`  ${lang}: ${raport.join("; ")}`);

  /* Anything sticking out of the page makes Chromium shrink the whole poster
     to fit -- silently, and by whatever the overflow happens to be. It cost
     one round of 4%-small posters that looked right until measured against
     the original, so it is checked rather than trusted. */
  const iesit = await p.evaluate(({ w, h }) => {
    const d = document.documentElement;
    return { w: d.scrollWidth - w * 96 / 72, h: d.scrollHeight - h * 96 / 72 };
  }, A4);
  if (iesit.w > 1 || iesit.h > 1) {
    console.error(`randeaza: ${lang} overflows the page by ` +
      `${(iesit.w * 72 / 96).toFixed(1)}x${(iesit.h * 72 / 96).toFixed(1)}pt — ` +
      `Chromium would shrink the whole poster to fit. Not written.`);
    await p.close();
    process.exitCode = 3;
    continue;
  }

  const nume = lang.toUpperCase();
  for (const m of MARIMI) {
    const pdf = await p.pdf({
      width: `${m.w}px`, height: `${m.h}px`,
      printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale: m.scala, pageRanges: "1",
    });
    writeFileSync(join(iesire, `Rotabo-afis-${nume}-${m.cod}.pdf`), pdf);
  }
  if (png) {
    await p.screenshot({ path: join(aici, `previzualizare-${lang}.png`),
                         clip: { x: 0, y: 0, width: A4.w, height: A4.h }, scale: "css" });
  }
  await p.close();
  console.log(`  ${nume}: A4, A3, A2`);
}
await b.close();
console.log(`written to ${iesire.replace(root + "/", "")}${iesire === PROBA ? "  (--publica writes into /afise)" : ""}`);
