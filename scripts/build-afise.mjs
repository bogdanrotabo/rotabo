#!/usr/bin/env node
/*
 * afise.html, built from whatever is in /afise.
 *
 * The page began as one poster in three sizes, written by hand. It is now
 * four languages in three sizes and the next language is three files away, so
 * the page is generated: drop Rotabo-afis-XX-A4.pdf, -A3 and -A2 into /afise,
 * run this, and the language appears. Editing the HTML by hand instead is how
 * a twelfth file ends up on disk and not on the page.
 *
 *   node scripts/build-afise.mjs           writes afise.html
 *   node scripts/build-afise.mjs --check   exits 1 if it is stale
 *
 * Every PDF is opened and its page size read before it is listed. A file
 * named A3 whose page is A2 is a wrong print at somebody else's expense --
 * a primărie prints six of them and finds out at the panel. The build stops
 * rather than publish one.
 *
 * A language is listed only with all three sizes present. Half a set on the
 * page is a visitor clicking a format that isn't there.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "afise");

// Native names, so a Frenchman recognises his own section without knowing
// what the page around it says.
const LANGS = {
  RO: { name: "Română",   note: "Limba română." },
  EN: { name: "English",  note: "English." },
  FR: { name: "Français", note: "Langue française." },
  ES: { name: "Español",  note: "Idioma español." },
  IT: { name: "Italiano", note: "Lingua italiana." },
  DE: { name: "Deutsch",  note: "Deutsche Sprache." },
  // dir="rtl" on the heading, not on the section: the label reads
  // right-to-left, the cards around it stay in the page's own direction.
  AR: { name: "العربية", note: "اللغة العربية.", rtl: true },
};

// The English in `use` and `dl` is what a visitor sees for the fraction of a
// second before locales/<code>.json lands, and all a crawler ever sees. The
// text the reader actually gets comes from the key in data-i18n.
const SIZES = [
  { code: "A4", dim: "210 × 297 mm", mm: [210, 297], key: "use_a4",
    use: "Prints on any office printer. For indoor notice boards and counters." },
  { code: "A3", dim: "297 × 420 mm", mm: [297, 420], key: "use_a3",
    use: "The usual size for public information boards." },
  { code: "A2", dim: "420 × 594 mm", mm: [420, 594], key: "use_a2",
    use: "For large boards and street display. Readable from a distance." },
];

// The page box the file actually declares, in millimetres. One MediaBox is
// expected: an earlier generation of these files carried two — the new page's
// and a leftover from the object it was scaled out of — and whichever a reader
// picked was a coin toss.
function pageSize(file) {
  const buf = readFileSync(file);
  const text = buf.toString("latin1");
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g)]
    .map(m => [
      Math.round((parseFloat(m[3]) - parseFloat(m[1])) * 25.4 / 72),
      Math.round((parseFloat(m[4]) - parseFloat(m[2])) * 25.4 / 72),
    ]);
  const uniq = [...new Set(boxes.map(b => b.join("x")))];
  return { ok: buf.subarray(0, 5).toString() === "%PDF-", boxes: uniq };
}

/* The button in a language's block is written in that language, not in the
   page's. The block already announces itself as "Deutsch"; a German who
   scrolled to it to fetch the German poster should not have to read a
   Japanese word to find the button. Taken from that language's own
   dictionary, so it is the same wording the site uses everywhere else. */
function descarca(lang) {
  const cod = lang.toLowerCase();
  const dict = JSON.parse(readFileSync(join(root, "locales", cod + ".json"), "utf8"));
  const val = dict.posters && dict.posters.download;
  if (!val) { console.error(`build-afise: locales/${cod}.json has no posters.download.`); process.exit(2); }
  return val;
}

const found = {};
for (const f of readdirSync(dir)) {
  const m = /^Rotabo-afis-([A-Z]{2})-(A[234])\.pdf$/.exec(f);
  if (!m) continue;
  (found[m[1]] ||= {})[m[2]] = f;
}

const problems = [];
const ready = [];
for (const [lang, files] of Object.entries(found).sort()) {
  if (!LANGS[lang]) { problems.push(`${lang}: files on disk but no entry in LANGS.`); continue; }
  const missing = SIZES.filter(s => !files[s.code]).map(s => s.code);
  if (missing.length) { problems.push(`${lang}: incomplete, missing ${missing.join(", ")} — not listed.`); continue; }
  for (const s of SIZES) {
    const { ok, boxes } = pageSize(join(dir, files[s.code]));
    const want = s.mm.join("x");
    if (!ok) problems.push(`${files[s.code]}: not a PDF.`);
    else if (boxes.length !== 1) problems.push(`${files[s.code]}: ${boxes.length} MediaBox entries (${boxes.join(", ")}), expected one.`);
    else if (boxes[0] !== want) problems.push(`${files[s.code]}: page is ${boxes[0]}mm, name says ${s.code} (${want}mm).`);
  }
  ready.push(lang);
}

const fatal = problems.filter(p => !p.includes("not listed"));
if (fatal.length) {
  console.error("build-afise: refusing to write the page.");
  fatal.forEach(p => console.error("  " + p));
  process.exit(2);
}
problems.filter(p => p.includes("not listed")).forEach(p => console.warn("  note: " + p));
if (!ready.length) { console.error("build-afise: no complete language set in /afise."); process.exit(2); }

// Romanian first — the 219 primării were sent here — then the rest in the
// order they were added to LANGS.
ready.sort((a, b) => (a === "RO" ? -1 : b === "RO" ? 1 : Object.keys(LANGS).indexOf(a) - Object.keys(LANGS).indexOf(b)));

const sections = ready.map(lang => {
  const dl = descarca(lang);
  /* lang so a screen reader switches voice for it, dir so "تنزيل PDF" puts
     the Latin word where an Arabic reader expects it -- without it the bidi
     algorithm lays the line out as if it were a phrase in the page's own
     direction. */
  const btn = ` lang="${lang.toLowerCase()}"` + (LANGS[lang].rtl ? ' dir="rtl"' : "");
  const cards = SIZES.map(s => `      <div class="card">
        <div class="fmt">${s.code}</div>
        <div class="dim">${s.dim}</div>
        <p class="use" data-i18n="posters.${s.key}">${s.use}</p>
        <a class="dl" href="/afise/${found[lang][s.code]}"${btn} download>${dl}</a>
      </div>`).join("\n");
  const rtl = LANGS[lang].rtl ? ' dir="rtl"' : "";
  // data-lang is what the reordering script on the page matches against: a
  // visitor reading the site in German should not have to scroll past six
  // other languages to find the poster they came for.
  return `    <section class="lang-set" data-lang="${lang.toLowerCase()}">
      <h2 class="lang-head"${rtl}>${LANGS[lang].name} <span>${LANGS[lang].note}</span></h2>
      <div class="grid">
${cards}
      </div>
    </section>`;
}).join("\n\n");

const src = readFileSync(join(root, "afise.html"), "utf8");

// Everything between these two markers is generated; everything outside is
// written by hand and left alone.
const START = "<!-- BUILT BY scripts/build-afise.mjs — do not edit between the markers -->";
const END = "<!-- END BUILT -->";
// lang code -> its A4 file, for the script that swaps the preview to the
// language the visitor is reading the site in. Built here because only the
// build knows which languages have files; the script must not guess a
// filename and embed a dead PDF in the page.
const previewMap = JSON.stringify(Object.fromEntries(
  ready.map(l => [l.toLowerCase(), found[l].A4])));

const block = `${START}
${sections}

    <h2 data-i18n="posters.preview">What it looks like</h2>
    <div class="preview" id="preview" data-posters='${previewMap}'>
      <object data="/afise/${found[ready[0]].A4}#view=FitH" type="application/pdf">
        <div class="fallback"><span data-i18n="posters.preview_fallback">The PDF preview cannot be shown in this browser.</span>
          <a href="/afise/${found[ready[0]].A4}" data-i18n="posters.preview_open">Open the poster in A4</a>.</div>
      </object>
    </div>
    ${END}`;

const re = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END}`);
if (!re.test(src)) {
  console.error("build-afise: markers not found in afise.html. Add them around the generated block.");
  process.exit(2);
}
const out = src.replace(re, block);

if (process.argv.includes("--check")) {
  if (out === src) { console.log(`afise.html is up to date: ${ready.join(", ")}.`); process.exit(0); }
  console.error("afise.html is STALE. Run: node scripts/build-afise.mjs");
  process.exit(1);
}
writeFileSync(join(root, "afise.html"), out);
console.log(`afise.html written: ${ready.length} languages (${ready.join(", ")}), ${ready.length * 3} files.`);
