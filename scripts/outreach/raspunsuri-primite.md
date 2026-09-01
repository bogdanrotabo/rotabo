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

**Contorul.** `founding_seats_remaining()` = 10 în continuare: numără firmele cu
`is_founding`, nu rezervările. Rămâne 10 până când Olivier se autentifică.
**În clipa în care o face, devine 9 — și linia "All ten are still open." din
toate scrisorile netrimise devine falsă.** E regula 3 din propriile reguli:
verifică contorul pe sit înainte de fiecare trimitere.

**Riscul de potrivire.** Spec-ul face verificarea pe claim-ul `hd` de la Google
Workspace. Dacă Olivier se autentifică cu un Gmail personal în loc de
`@cyberbotics.com`, `hd` nu va fi `cyberbotics.com` și rezervarea nu se
potrivește — va fi trimis la Stripe pentru 10.000 CHF, exact ce i s-a promis că
nu se întâmplă. De aceea răspunsul îi spune explicit cu ce cont să intre.

**Termenul de 30 de zile.** Curge de la revendicare, nu de la rezervare. Locul
se pierde dacă nu publică un dar până atunci.

### Un fapt de folosit

`companies` = 0, `gifts` = 0. Nimeni n-a publicat încă. Darul lui ar fi **#1**.
