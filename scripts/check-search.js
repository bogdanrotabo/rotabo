// Ruleaza cautarea paginii peste fisierele de limba, fara browser.
//
//   node scripts/check-search.js              -- lista de regresie
//   node scripts/check-search.js de Rigips    -- ce gaseste un cuvant anume
//
// fold(), stemMatch() si rank() de mai jos sunt copiate din index.html. Daca
// se schimba acolo, se schimba si aici -- altfel scriptul spune ca merge ceva
// ce nu mai merge.
//
// Rostul lui: eticheta unei meserii se vede pe card, sinonimele nu se vad
// niciodata. Singurul mod de a sti daca "Rigips" ajunge la Trockenbau e sa
// rulezi potrivirea, si singurul mod de a sti ca a ajuns din cauza
// sinonimului e sa o rulezi si fara el.

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "locales");

function fold(s) {
  return String(s == null ? "" : s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss").replace(/ø/g, "o")
    .replace(/đ/g, "d").replace(/ł/g, "l");
}

function stemMatch(w, words) {
  if (w.length < 4) return words.some(hw => hw.indexOf(w) === 0);
  return words.some(hw => {
    if (hw.indexOf(w) === 0) return true;
    const n = Math.min(w.length, hw.length, 6);
    return n >= 5 && hw.slice(0, n) === w.slice(0, n);
  });
}

const SPLIT = /[\s,.\/()'"-]+/;

// withSyn false = cum arata cautarea fara sinonime, adica starea de dinainte.
function search(dict, q, withSyn = true) {
  const words = fold(q).trim().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const slug of Object.keys(dict.domains || {})) {
    const name = fold(dict.domains[slug]).split(SPLIT).filter(Boolean);
    const syn = withSyn
      ? fold((dict.domsyn || {})[slug] || "").split(SPLIT).filter(Boolean)
      : [];
    if (words.every(w => stemMatch(w, name.concat(syn)))) hits.push(slug);
  }
  return hits;
}

const load = lang => JSON.parse(fs.readFileSync(path.join(DIR, lang + ".json"), "utf8"));

// ------------------------------------------------------------ mod interactiv

const [argLang, ...argWords] = process.argv.slice(2);
if (argLang) {
  const q = argWords.join(" ");
  if (!q) { console.log("folosire: node scripts/check-search.js <limba> <cuvant>"); process.exit(1); }
  const d = load(argLang);
  const hits = search(d, q);
  console.log(argLang + '  "' + q + '"  ->  ' + (hits.length || "niciun rezultat"));
  for (const s of hits.slice(0, 12)) console.log("   " + s + "  =  " + d.domains[s]);
  process.exit(0);
}

// --------------------------------------------------------- lista de regresie

// Cuvinte pe care le tasteaza cineva din meserie, nu eticheta de pe card.
const CASES = [
  ["de", "Rigips", "drywall"], ["de", "Hebamme", "midwifery"],
  ["es", "pladur", "drywall"], ["es", "fontanero", "plumbing"],
  ["fr", "placo", "drywall"], ["fr", "huissier", "bailiff"],
  ["ro", "instalator", "plumbing"], ["ro", "avocat", "legal_services"],
  ["cs", "sadrokarton", "drywall"], ["pl", "hydraulik", "plumbing"],
  ["pl", "komornik", "bailiff"], ["hu", "vízvezeték", "plumbing"],
  ["sv", "rörmokare", "plumbing"], ["fi", "putkimies", "plumbing"],
  ["tr", "tesisatçı", "plumbing"], ["ga", "pluiméir", "plumbing"],
  ["mt", "plamer", "plumbing"], ["sw", "fundi bomba", "plumbing"],
  ["el", "υδραυλικός", "plumbing"], ["ru", "сантехник", "plumbing"],
  ["ar", "سباك", "plumbing"], ["ur", "پلمبر", "plumbing"],
  ["hi", "प्लंबर", "plumbing"], ["bn", "প্লাম্বার", "plumbing"],
  ["th", "ช่างประปา", "plumbing"], ["vi", "luật sư", "legal_services"],
  ["zh", "律师", "legal_services"], ["ja", "弁護士", "legal_services"],
  ["ko", "변호사", "legal_services"],
];

let pass = 0, fail = 0, onlySyn = 0;

for (const [lang, q, want] of CASES) {
  const d = load(lang);
  const ok = search(d, q).includes(want);
  const okWithout = search(d, q, false).includes(want);
  if (ok) {
    pass++;
    if (!okWithout) onlySyn++;   // gasit doar datorita sinonimului
  } else {
    fail++;
    console.log('PICAT  ' + lang + '  "' + q + '"  nu ajunge la ' + want);
  }
}

console.log(pass + "/" + (pass + fail) + " cautari reusite");
console.log(onlySyn + " dintre ele functioneaza doar datorita sinonimelor "
  + "(eticheta singura nu le-ar fi gasit).");
process.exit(fail ? 1 : 0);
