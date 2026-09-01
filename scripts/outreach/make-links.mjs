/* Scoate linkurile de compose din launcher.html, ca sa existe o singura sursa
   de adevar pentru textul scrisorii. Daca se schimba o scrisoare in pagina,
   linkurile de aici se schimba odata cu ea -- nu exista a doua copie care sa
   ramana in urma. */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./launcher.html", import.meta.url), "utf8");

const tailSrc = html.match(/var TAIL = ([\s\S]*?);\n\n/)[1];
const s1Src   = html.match(/var S1 = (".*?");/)[1];
const listSrc = html.match(/var L = (\[[\s\S]*?\n  \]);/)[1];

const TAIL = eval(tailSrc);
const S1   = eval(s1Src);
const L    = eval(listSrc);

const idx = process.argv[2] || "1";
const from = Number(process.argv[3] || 1);
const to   = Number(process.argv[4] || L.length);

const body = (r) => r.p + TAIL.replace("@CO@", r.co);
const url  = (r) =>
  `https://mail.google.com/mail/u/${idx}/?view=cm&fs=1&tf=1` +
  `&to=${encodeURIComponent(r.em)}` +
  `&su=${encodeURIComponent(r.su)}` +
  `&body=${encodeURIComponent(body(r))}`;

L.slice(from - 1, to).forEach((r, i) => {
  const n = from + i;
  const flag = r.flag ? `  ⚠ ${r.flagT}` : "";
  console.log(`${n}|${r.co}|${r.cc}|${r.em}|${r.flag || ""}|${r.flagT || ""}|${url(r)}`);
});
