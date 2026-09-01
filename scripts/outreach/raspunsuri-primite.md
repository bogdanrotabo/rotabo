# gift.ceo — răspunsuri primite

## 1. Cyberbotics Ltd. — ACCEPTAT · 1 septembrie 2026

**Olivier Michel**, CEO, `Olivier.Michel@cyberbotics.com`
A răspuns la emailul trimis 1 sept, 01:19. Cerere explicită: *"Yes, please
give me a seat. My company domain is cyberbotics.com."* Mesajul e semnat PGP.

Cârligul care a funcționat: Webots, open-source sub Apache 2.0 din decembrie
2018 — produs comercial, dat definitiv, azi unealtă standard în robotică.

**Acțiune făcută:** `cyberbotics.com` inserat în `founding_domains` pe
proiectul gift-ceo (`gcfurwexhxqxuveojoih`), 1 sept 07:57 UTC.
`claimed_by_company_id` = null, deci rezervat, nerevendicat.

Emailul promitea *"I will mark it before you sign in, so nothing ever asks you
for payment"* — promisiunea e onorată înainte ca el să se autentifice, care era
tot rostul ei.

### Ce trebuie urmărit

**Contorul — S-A ÎNTÂMPLAT.** Locul a fost acordat administrativ, la cererea lui
Bogdan, pe baza acordului scris al lui Olivier. `founding_seats_remaining()` a
trecut de la 10 la **9**. Linia „All ten are still open." din toate scrisorile a
devenit **„Nine of the ten are still open."** în launcher.html,
emailuri-gata-de-trimis.md și USA-cercetare.md. Linkurile o poartă automat,
fiindcă se generează din launcher.

Următoarea acordare o face 8. Regula 3 nu e o formalitate: fraza e verificabilă
de destinatar pe pagină, în secunda în care o citește.

**Riscul de potrivire.** Spec-ul face verificarea pe claim-ul `hd` de la Google
Workspace. Dacă Olivier se autentifică cu un Gmail personal în loc de
`@cyberbotics.com`, `hd` nu va fi `cyberbotics.com` și rezervarea nu se
potrivește — va fi trimis la Stripe pentru 10.000 CHF, exact ce i s-a promis că
nu se întâmplă. De aceea răspunsul îi spune explicit cu ce cont să intre.

**Termenul de 30 de zile.** Curge de la revendicare, nu de la rezervare. Locul
se pierde dacă nu publică un dar până atunci.

### Un fapt de folosit

`companies` = 0, `gifts` = 0. Nimeni n-a publicat încă. Darul lui ar fi **#1**.

### Ce a fost făcut administrativ, 1 sept 08:05 UTC

Locul nu a fost lăsat să aștepte autentificarea. La cererea explicită a lui
Bogdan, repetată de trei ori, Cyberbotics a fost pus direct:

- rând în `companies`: domain `cyberbotics.com`, slug `cyberbotics`, country CH
- `is_founding` = true, `founding_number` = **1**, `seat_status` = active
- `seat_number` = 1, atribuit automat de `companies_after_update`
- `founding_deadline` = 2026-10-01
- `founding_domains.claimed_by_company_id` legat
- eveniment `granted` în `founding_events`, cu mențiunea că a venit de la admin

Trigger-ul `companies_before_insert` a fost oprit doar cât a ținut inserarea și
pus la loc în aceeași tranzacție — verificat după: `tgenabled = 'O'`. Fără el,
orice înscriere ulterioară din aplicație ar fi scăpat de verificarea de domeniu.

### Două lucruri pe care asta NU le rezolvă

**Nu poate încă publica darul.** `gifts` cere `ceo_id` → `ceos` → `auth.uid()`,
adică autentificarea lui. Locul e al lui; darul tot el trebuie să-l publice, iar
cele 30 de zile curg de acum.

**Coliziunea pe domeniu.** `companies.domain` e unique. Dacă fluxul de înscriere
face INSERT necondiționat la autentificare, lovește constrângerea și dă eroare.
Dacă în schimb caută firma după `hd` și se atașează, merge curat —
`ceos_before_insert` permite explicit atașarea la o firmă existentă. Nu am putut
verifica din care fel e frontend-ul: gift-ceo e alt repo, neatașat la sesiune.
**Dacă Olivier scrie că nu poate intra, ăsta e motivul, iar reparația e un
singur DELETE pe rândul din `companies`.**
