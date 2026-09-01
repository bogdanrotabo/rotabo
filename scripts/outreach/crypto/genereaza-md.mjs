/* Scrie lista in formatul lotului 2, numerotata in continuare de la 102. */
import { writeFileSync } from "node:fs";
import { L, TAIL, FOUND, KICKER, SUBJECT } from "./lista.mjs";

const START = 102;
const idx = process.argv[2] ?? "0";

const corp = (r) => r.p + TAIL.replace("@FOUND@", FOUND[r.s])
                              .replace("@KICKER@", KICKER[r.s])
                              .replace("@CO@", r.co);

const link = (r) =>
  `https://mail.google.com/mail/u/${idx}/?view=cm&fs=1&tf=1` +
  `&to=${encodeURIComponent(r.em)}&su=${encodeURIComponent(SUBJECT)}` +
  `&body=${encodeURIComponent(corp(r))}`;

const SECT = { crypto:"crypto", ai:"AI", os:"open source", tech:"tech", listed:"bursă" };
const NIV = {
  A: ["Nivelul A — decidentul citește chiar el",
      "Fundații mici și menținători individuali. Aici un răspuns e posibil. **De trimis primele.**"],
  B: ["Nivelul B — companie mică, ajunge la el",
      "Încă destul de mici cât mesajul să fie înaintat cuiva care poate decide."],
  C: ["Nivelul C — filtru de presă",
      "Adrese de comunicare la companii mari. Binance a răspuns cu robot pe 1 septembrie: „this email address is for media and marketing inquiries only\". Bilete de loterie — **de trimis ultimele**."]
};

let n = START - 1;
const sect = ["A","B","C"].map(niv => {
  const [titlu, nota] = NIV[niv];
  const rows = L.filter(r => r.niv === niv).map(r => {
    n++;
    const par = r.p.split("\n").filter(Boolean).slice(1).join("\n").trim();
    return `## ${n}. ${r.co.replace(/^the /,"")} · ${SECT[r.s]}

| | |
|---|---|
| Către | ${r.to} |
| Adresa | ${r.em} |
| Unde | ${r.src} |

**Subiect:** ${SUBJECT}

> ${r.p.split("\n")[0]}
>
${par.split("\n").map(l => "> " + l).join("\n")}

[**Deschide în Gmail**](${link(r)})`;
  }).join("\n\n---\n\n");
  return `# ${titlu}\n\n${nota}\n\n---\n\n${rows}`;
}).join("\n\n---\n\n");

const md = `# gift.ceo — scrisorile ${START}–${n}

Continuarea lui \`lot2-scrisori.md\`, care ține 33–101.
Expeditor: **gift.ceo.support@gmail.com** · Contor la scriere: **8 din 10 libere**

Crypto, inteligență artificială, open source, hardware/software și companii
cotate la bursă. ${L.length} de scrisori.

## Ce e diferit față de loturile anterioare

Corpul nu mai e unul singur. Sunt **cinci argumente de sector**, fiindcă motivul
pentru care un CEO de crypto ar sta pe gift.ceo nu e motivul unui menținător de
open source:

| Sector | Argumentul |
|---|---|
| crypto | Un token se poate tipări. Un dar, nu. |
| AI | Industria e construită pe daruri pe care nu le-a plătit. |
| open source | Darul e atât de complet încât a devenit invizibil. |
| tech | La scara ta, nimeni nu te crede când spui că dai. |
| bursă | Nu poți dărui ce nu e al tău — și tocmai de aia excepțiile contează. |

## Cele cinci reguli, neschimbate

1. **Unul câte unul.** Niciodată CC, niciodată BCC.
2. **Maximum 15–20 pe zi.** Un val de mesaje identice către domenii mari intră
   în spam.
3. **Întâi contorul pe sit.** Dacă cifra s-a schimbat pe gift.ceo, schimb-o și
   în email înainte de trimitere.
4. **Nu insista.** Un singur mesaj. Dacă nu răspunde, nu retrimite.
5. **Ordinea contează.** Nivelul A întâi, C ultimul. Motivul e mai jos.

## Despre adrese

Toate sunt citite de pe situl companiei, cu sursa scrisă la fiecare. **Niciuna
nu e ghicită după tipar** — serviciile care vând adrese de CEO livrează tipare
deduse, iar fiecare ghicit e ori un bounce împotriva reputației expeditorului,
ori un străin care n-a cerut nimic.

**Niciuna nu e adresa personală a unui director, cu o excepție:**
\`drh@hwaci.com\`, D. Richard Hipp, publicată de el pe sqlite.org.

Din ~170 de companii verificate, atâtea au publicat o adresă. Randamentul a fost
invers proporțional cu mărimea companiei și direct proporțional cu cât dă pe
gratis: fundațiile open source publică adresa, marii producători o ascund după
formulare.

## Ce s-a scos deliberat

**Memecoinurile și pump.fun.** Locul următor pe tablou, lângă Cyberbotics,
ocupat de un memecoin, ar devaloriza tot. Publicul acela vrea insigna ca
instrument de pump.

**Elon Musk și X.** Nu există adresă publică. \`press@x.com\` răspunde automat
cu un emoji. Canalul real e X, nu emailul.

**Companiile cotate, aproape toate.** Un director angajat nu poate dărui — ține
în custodie proprietatea altora, iar a da un activ fără decizie de consiliu e
încălcare a obligației fiduciare. Au rămas patru, cele unde decizia a fost luată
o dată, demult, de cineva care avea atunci autoritatea.

---

${sect}
`;

writeFileSync(new URL("./lot3-scrisori.md", import.meta.url), md);
console.log(`Scris lot3-scrisori.md: scrisorile ${START}–${n} (${L.length} bucăți).`);
