/* Pagina cu butoane + lista markdown, din lista.mjs. O singura sursa de adevar. */
import { writeFileSync } from "node:fs";
import { L, TAIL, FOUND, KICKER, SUBJECT } from "./lista.mjs";

const idx = process.argv[2] ?? "0";
const START = 152;                       // in continuarea lotului 3 (102-151)
const ARG = { brewery:"family", drink:"family" };   // berariile regionale sunt firme de familie
const arg = (t) => ARG[t] || t;

export const corp = (r) =>
  r.p + TAIL.replace("@FOUND@", FOUND[arg(r.t)])
            .replace("@KICKER@", KICKER[arg(r.t)])
            .replace("@CO@", r.co);

const url = (r) =>
  `https://mail.google.com/mail/u/${idx}/?view=cm&fs=1&tf=1` +
  `&to=${encodeURIComponent(r.em)}&su=${encodeURIComponent(SUBJECT)}` +
  `&body=${encodeURIComponent(corp(r))}`;

const GRUP = [
  ["trappist","Trappist — obligația de a dărui e în definiția produsului",
   "Regula appellation-ului: profitul acoperă nevoile comunității, restul se duce la caritate. Nu o promisiune — o condiție de a avea dreptul la nume."],
  ["public","Proprietate publică sau monahală",
   "Profitul nu se duce la acționari, fiindcă nu există. Statul, sau mănăstirea."],
  ["social","Firme construite ca să dăruiască",
   "Dăruitul nu e un program atașat afacerii, e motivul pentru care afacerea a fost desenată așa."],
  ["family","Familie, cu fapt verificabil",
   "Un fapt specific, verificabil într-un minut. Cele mai bune scrisori din lot."],
  ["water","Izvoare minerale",
   "Vând ceva ce cade din cer și e al tuturor până e îmbuteliat."],
  ["brewery","Berării regionale — deschidere onestă",
   "Nu am găsit un fapt verificabil despre ce a dăruit fiecare. Scrisoarea spune asta în loc să inventeze un compliment."],
  ["drink","Alte băuturi — deschidere onestă", ""]
];

/* ---------- pagina HTML ---------- */
const esc = (t) => t.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let n = 0;
const sect = GRUP.map(([k, titlu, nota]) => {
  const rows = L.filter(r => r.t === k);
  if (!rows.length) return "";
  const tr = rows.map(r => {
    n++;
    return `<tr><td class="n">${n}</td><td><b>${esc(r.co)}</b><div class="to">${esc(r.to)}</div></td>` +
           `<td class="em">${esc(r.em)}<div class="src">${esc(r.src)}</div></td>` +
           `<td><a class="go" href="${esc(url(r))}" target="_blank" rel="noopener">Deschide în Gmail</a></td></tr>`;
  }).join("\n");
  return `<h2>${esc(titlu)} <span>${rows.length}</span></h2>${nota?`<p class="sub">${esc(nota)}</p>`:""}\n<table>${tr}</table>`;
}).join("\n");

writeFileSync(new URL("./scrisori.html", import.meta.url), `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>gift.ceo — băuturi</title><style>
:root{--v1:#7c2d9c;--v2:#9b3fc0;--bd:#e2c3ee;--tx:#3a1650}
body{margin:0;background:linear-gradient(180deg,#f6ecf9,#f3e6f8);color:#6b5878;
 font:14px/1.55 'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;padding:1.5rem 1rem 4rem}
.w{max-width:1020px;margin:0 auto}
h1{color:var(--tx);font-size:1.6rem;margin:0 0 .3rem;letter-spacing:-.02em}
.lead{margin:0 0 2rem;max-width:64ch}
h2{color:var(--tx);font-size:1.05rem;margin:2.2rem 0 .3rem;border-bottom:1px solid var(--bd);padding-bottom:.4rem}
h2 span{color:#8a7a94;font-weight:400;font-size:.85rem;margin-left:.4rem}
.sub{margin:.1rem 0 .7rem;color:#8a7a94;font-size:.86rem;max-width:72ch}
table{width:100%;border-collapse:collapse;background:#f7edfa;border:1px solid var(--bd);border-radius:12px;overflow:hidden}
td{padding:.65rem .8rem;border-bottom:1px solid #eddcf5;vertical-align:top}
tr:last-child td{border-bottom:0}
.n{color:#a992b8;width:2.4rem;font-variant-numeric:tabular-nums}
.to{color:#8a7a94;font-size:.85rem}
.em{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.86rem;color:var(--v1)}
.src{font-family:'Segoe UI',sans-serif;color:#a992b8;font-size:.78rem;margin-top:.15rem}
.go{display:inline-block;background:#9333a8;color:#fff;text-decoration:none;font-weight:600;
 font-size:.85rem;padding:.45rem .8rem;border-radius:8px;white-space:nowrap}
.go:hover{background:var(--v1)}
.note{margin-top:2.5rem;padding:1.1rem 1.2rem;background:#faf4fd;border:1px solid var(--bd);border-radius:12px;font-size:.9rem}
.note b{color:var(--tx)}
</style></head><body><div class="w">
<h1>gift.ceo — ${L.length} de scrisori, băuturi</h1>
<p class="lead">Fiecare buton deschide Gmail cu destinatarul, subiectul și scrisoarea completate.
Se citește și se trimite manual.</p>
${sect}
<div class="note">
<p><b>Randamentul aici a fost 70%</b> — de departe cel mai bun din toate categoriile căutate.
Motivul: sunt firme de familie cu Impressum obligatoriu, nu corporații cotate cu formular de contact.</p>
<p><b>Și e categoria cu cea mai bună potrivire.</b> Un director angajat nu poate dărui — ține în
custodie proprietatea altora. Un proprietar de berărie poate.</p>
<p><b>15–20 pe zi.</b> Gmail limitează.</p>
</div></div></body></html>`);

/* ---------- lista markdown ---------- */
let m = START - 1;
const md = GRUP.map(([k, titlu, nota]) => {
  const rows = L.filter(r => r.t === k);
  if (!rows.length) return "";
  const body = rows.map(r => {
    m++;
    const [prima, ...rest] = r.p.split("\n").filter(Boolean);
    return `## ${m}. ${r.co}\n\n| | |\n|---|---|\n| Către | ${r.to} |\n| Adresa | ${r.em} |\n| Unde | ${r.src} |\n\n**Subiect:** ${SUBJECT}\n\n> ${prima}\n>\n${rest.map(l=>"> "+l).join("\n")}\n\n[**Deschide în Gmail**](${url(r)})`;
  }).join("\n\n---\n\n");
  return `# ${titlu}\n\n${nota}\n\n---\n\n${body}`;
}).filter(Boolean).join("\n\n---\n\n");

writeFileSync(new URL("./lot4-scrisori.md", import.meta.url),
`# gift.ceo — scrisorile ${START}–${m}, băuturi

Continuarea lui \`crypto/lot3-scrisori.md\`, care ține 102–151.
Expeditor: **gift.ceo.support@gmail.com** · Contor la scriere: **8 din 10 libere**

${L.length} de firme de băuturi alcoolice și nealcoolice. Adresele sunt citite de
pe situl fiecăreia, majoritatea din Impressum.

## De ce categoria asta e cea mai bună de până acum

**Randamentul căutării a fost 70%** — față de 10% la crypto și 13% la companiile
cotate. Firmele de familie își publică adresa; corporațiile o ascund după
formular.

**Și potrivirea e mai bună.** Un director angajat al unei companii cotate nu
poate dărui: ține în custodie proprietatea altora, iar a da un activ fără decizie
de consiliu e încălcare a obligației fiduciare. Un proprietar de berărie poate
decide și gata.

## Cinci argumente, după tipul firmei

| Tip | Argumentul |
|---|---|
| Trappist | Obligația de a dărui e în definiția produsului. |
| Public | Proprietarul e statul sau mănăstirea. Profitul iese deja. |
| Social | Firma a fost construită ca să dăruiască. |
| Familie | Ești unul dintre puținii care chiar *pot* dărui. |
| Izvor | Vinzi ceva ce cade din cer și e al tuturor până îl îmbuteliezi. |

## Onestitatea listei

**${L.filter(r=>["trappist","public","family","social"].includes(r.t)).length} au un fapt verificabil** despre ce a dăruit firma — scris în primul paragraf.

**${L.filter(r=>["brewery","water","drink"].includes(r.t)).length} nu au.** Acolo scrisoarea spune adevărul în loc să inventeze:
*„I am writing without knowing what your house has given away, and that is the
honest reason for the letter rather than an apology for it."*

O deschidere onestă e mai bună decât un compliment fabricat. Un proprietar de
berărie de familie recunoaște instant lauda inventată.

---

${md}
`);

console.log(`${L.length} de scrisori. HTML + lot4-scrisori.md (${START}–${m}).`);
