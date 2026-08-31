// Verifica ca toate fisierele de limba au exact aceleasi chei ca en.json.
//
//   node scripts/check-locales.js
//
// Treizeci si opt de fisiere nu se pot tine minte cu ochiul. O cheie adaugata
// in en.json si uitata in restul nu se vede pe pagina -- rotaboT cade pe
// engleza si textul apare, doar ca in limba gresita, ceea ce e mai greu de
// observat decat un gol.
//
// Iese cu cod 1 daca gaseste ceva, ca sa poata fi pus intr-un hook.

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "locales");

function flat(o, pre = "", out = {}) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    const kk = pre ? pre + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, kk, out);
    else out[kk] = v;
  }
  return out;
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith(".json")).sort();
const data = {};
let problems = 0;

for (const f of files) {
  try {
    data[f.replace(".json", "")] = flat(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
  } catch (e) {
    console.log("JSON STRICAT  " + f + ": " + e.message);
    problems++;
  }
}

const en = data.en;
if (!en) { console.log("lipseste en.json"); process.exit(1); }
const enKeys = Object.keys(en);

console.log(files.length + " fisiere, " + enKeys.length + " chei in en.json\n");

for (const [lang, d] of Object.entries(data)) {
  if (lang === "en") continue;
  const has = new Set(Object.keys(d));
  const missing = enKeys.filter(k => !has.has(k));
  const extra = Object.keys(d).filter(k => !(k in en));
  if (missing.length || extra.length) {
    problems++;
    console.log(lang + ": lipsesc " + missing.length + ", in plus " + extra.length);
    if (missing.length) console.log("   lipsa: " + missing.slice(0, 6).join(", ")
      + (missing.length > 6 ? " ..." : ""));
    if (extra.length) console.log("   plus:  " + extra.slice(0, 6).join(", ")
      + (extra.length > 6 ? " ..." : ""));
  }
}

for (const [lang, d] of Object.entries(data)) {
  const empty = Object.keys(d).filter(k => typeof d[k] === "string" && d[k].trim() === "");
  if (empty.length) {
    problems++;
    console.log(lang + ": " + empty.length + " valori goale -- " + empty.slice(0, 4).join(", "));
  }
}

// Sinonimele de cautare se sparg pe [\s,./()'"-], deci o virgula araba sau
// chinezeasca lasa toata linia un singur bloc pe care nu il gaseste nimeni.
for (const [lang, d] of Object.entries(data)) {
  const bad = Object.keys(d)
    .filter(k => k.startsWith("domsyn.") && /[،、，٫]/.test(d[k]));
  if (bad.length) {
    problems++;
    console.log(lang + ": virgula non-ASCII in " + bad.length + " sinonime -- " + bad.slice(0, 3).join(", "));
  }
}

console.log(problems ? "\n" + problems + " PROBLEME" : "\nToate limbile au aceleasi chei ca en.json.");
process.exit(problems ? 1 : 0);
