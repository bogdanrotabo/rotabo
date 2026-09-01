/* Construieste pagina cu linkuri de compose din lista.mjs. O singura sursa de
   adevar: daca se schimba scrisoarea acolo, linkurile se schimba odata cu ea. */
import { writeFileSync } from "node:fs";
import { L, TAIL, FOUND, KICKER, SUBJECT } from "./lista.mjs";

const idx = process.argv[2] ?? "0";           // indexul contului Gmail (u/0, u/1...)

export const corp = (r) =>
  r.p + TAIL.replace("@FOUND@", FOUND[r.s])
             .replace("@KICKER@", KICKER[r.s])
             .replace("@CO@", r.co);

const url = (r) =>
  `https://mail.google.com/mail/u/${idx}/?view=cm&fs=1&tf=1` +
  `&to=${encodeURIComponent(r.em)}` +
  `&su=${encodeURIComponent(SUBJECT)}` +
  `&body=${encodeURIComponent(corp(r))}`;

const esc = (t) => t.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SECT = { crypto:"crypto", ai:"AI", os:"open source", tech:"tech", listed:"bursă" };
const NUME = {
  A:"Nivelul A — decidentul citește chiar el",
  B:"Nivelul B — companie mică, ajunge la el",
  C:"Nivelul C — filtru de presă, răspuns automat"
};
const SUB = {
  A:"Fundații mici și menținători individuali. Aici un răspuns e posibil. Trimite-le primele.",
  B:"Companii încă destul de mici cât mesajul să fie înaintat unui om care poate decide.",
  C:"Adrese de presă la companii mari. Binance a răspuns cu robot pe 1 septembrie. Bilete de loterie — trimite-le ultimele."
};

let n = 0;
const sectiuni = ["A","B","C"].map(s => {
  const randuri = L.filter(r => r.niv === s).map(r => {
    n++;
    return `<tr><td class="n">${n}</td><td><b>${esc(r.co)}</b><div class="to">${esc(r.to)} · ${SECT[r.s]}</div></td>` +
           `<td class="em">${esc(r.em)}<div class="src">${esc(r.src)}</div></td>` +
           `<td><a class="go" href="${esc(url(r))}" target="_blank" rel="noopener">Deschide în Gmail</a></td></tr>`;
  }).join("\n");
  return `<h2>${NUME[s]} <span>${L.filter(r=>r.niv===s).length}</span></h2>\n<p class="sub">${SUB[s]}</p>\n<table>${randuri}</table>`;
}).join("\n");

const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>gift.ceo — ${L.length} scrisori</title><style>
:root{--v1:#7c2d9c;--v2:#9b3fc0;--bd:#e2c3ee;--tx:#3a1650;--bd2:#6b5878}
body{margin:0;background:linear-gradient(180deg,#f6ecf9,#f3e6f8);color:var(--bd2);
 font:14px/1.55 'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;padding:1.5rem 1rem 4rem}
.w{max-width:1000px;margin:0 auto}
h1{color:var(--tx);font-size:1.6rem;margin:0 0 .3rem;letter-spacing:-.02em}
.lead{margin:0 0 2rem;max-width:62ch}
h2{color:var(--tx);font-size:1.05rem;margin:2.2rem 0 .6rem;border-bottom:1px solid var(--bd);padding-bottom:.4rem}
h2 span{color:#8a7a94;font-weight:400;font-size:.85rem;margin-left:.4rem}
table{width:100%;border-collapse:collapse;background:#f7edfa;border:1px solid var(--bd);border-radius:12px;overflow:hidden}
td{padding:.7rem .8rem;border-bottom:1px solid #eddcf5;vertical-align:top}
tr:last-child td{border-bottom:0}
.n{color:#a992b8;width:2.2rem;font-variant-numeric:tabular-nums}
.to{color:#8a7a94;font-size:.85rem}
.em{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.86rem;color:var(--v1)}
.src{font-family:'Segoe UI',sans-serif;color:#a992b8;font-size:.78rem;margin-top:.15rem}
.sub{margin:.1rem 0 .7rem;color:#8a7a94;font-size:.86rem;max-width:70ch}
.go{display:inline-block;background:#9333a8;color:#fff;text-decoration:none;font-weight:600;
 font-size:.85rem;padding:.45rem .8rem;border-radius:8px;white-space:nowrap}
.go:hover{background:var(--v1)}
.note{margin-top:2.5rem;padding:1.1rem 1.2rem;background:#faf4fd;border:1px solid var(--bd);border-radius:12px;font-size:.9rem}
.note b{color:var(--tx)}
</style></head><body><div class="w">
<h1>gift.ceo — ${L.length} scrisori, gata de trimis</h1>
<p class="lead">Fiecare buton deschide Gmail cu destinatarul, subiectul și scrisoarea deja completate.
Se citește și se trimite manual. Nimic nu pleacă singur.</p>
${sectiuni}
<div class="note">
<p><b>Fiecare adresă e publicată de companie</b>, cu sursa scrisă sub ea. Niciuna nu e ghicită după tipar.</p>
<p><b>Trimite câte 15–20 pe zi</b>, nu toate odată. Gmail limitează, iar un val de mesaje identice către domenii mari intră în spam.</p>
<p><b>Adresele sunt de presă sau contact general</b>, nu personale ale directorilor — în aceste industrii adresele personale nu se publică. Scrisoarea e scrisă să reziste și dacă o citește întâi un om de comunicare.</p>
</div>
</div></body></html>`;

writeFileSync(new URL("./scrisori.html", import.meta.url), html);
console.log(`Generat: scrisori.html cu ${L.length} scrisori.`);
console.log(`Lungime corp (prima): ${corp(L[0]).length} caractere.`);
