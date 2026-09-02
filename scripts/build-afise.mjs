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

const SIZES = [
  { code: "A4", dim: "210 × 297 mm", mm: [210, 297],
    use: "Se tipărește pe orice imprimantă de birou. Pentru aviziere de interior și ghișee." },
  { code: "A3", dim: "297 × 420 mm", mm: [297, 420],
    use: "Formatul obișnuit pentru panourile publice de informare." },
  { code: "A2", dim: "420 × 594 mm", mm: [420, 594],
    use: "Pentru panouri mari și afișaj stradal. Se citește de la distanță." },
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
  const cards = SIZES.map(s => `      <div class="card">
        <div class="fmt">${s.code}</div>
        <div class="dim">${s.dim}</div>
        <p class="use">${s.use}</p>
        <a class="dl" href="/afise/${found[lang][s.code]}" download>Descarcă PDF</a>
      </div>`).join("\n");
  const rtl = LANGS[lang].rtl ? ' dir="rtl"' : "";
  return `    <h2 class="lang-head"${rtl}>${LANGS[lang].name} <span>${LANGS[lang].note}</span></h2>
    <div class="grid">
${cards}
    </div>`;
}).join("\n\n");

const src = readFileSync(join(root, "afise.html"), "utf8");

// Everything between these two markers is generated; everything outside is
// written by hand and left alone.
const START = "<!-- BUILT BY scripts/build-afise.mjs — do not edit between the markers -->";
const END = "<!-- END BUILT -->";
const block = `${START}
${sections}

    <h2>Cum arată</h2>
    <div class="preview">
      <object data="/afise/${found[ready[0]].A4}#view=FitH" type="application/pdf">
        <div class="fallback">Previzualizarea PDF nu se poate afișa în acest browser.
          <a href="/afise/${found[ready[0]].A4}">Deschide afișul în format A4</a>.</div>
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
