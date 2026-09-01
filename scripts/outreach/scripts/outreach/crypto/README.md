# gift.ceo — crypto, AI, open source, hardware & software

37 de scrisori, gata de trimis manual din Gmail.

    node genereaza.mjs 0      # scrie scrisori.html; 0 = indexul contului Gmail

Deschizi `scrisori.html`, apeși butonul unui rând, Gmail se deschide cu
destinatarul, subiectul și scrisoarea completate. Citești și trimiți tu.
Nimic nu pleacă singur.

## De ce 37 și nu 100

S-au verificat aproximativ 70 de companii. **Zece la sută dintre siturile crypto
publică o adresă de email**; restul folosesc formulare de contact. Adrese
personale de director: zero, în toate industriile căutate.

Serviciile care „vând" adrese de CEO (LeadIQ, RocketReach, Lusha) livrează
tipare ghicite — `nume@companie.com` dedus, nu verificat. Fiecare ghicit e ori
un bounce împotriva reputației expeditorului, ori un străin care n-a cerut
nimic. Regula e deja scrisă în README-ul launcher-ului: lista asta nu inventează
destinatari.

Randamentul a fost invers proporțional cu mărimea companiei și direct
proporțional cu cât dă pe gratis. Fundațiile open source publică adresa. Marii
producători de electronice o ascund după formulare regionale.

## Structura

| fișier | ce e |
|---|---|
| `lista.mjs` | destinatarii, argumentele pe sector, coada comună |
| `genereaza.mjs` | construiește pagina din listă |
| `scrisori.html` | pagina generată (nu se editează direct) |
| `scrisoare-crypto.txt` | scrisoarea în formă citibilă, pentru revizuit |

Scrisoarea are trei straturi: un paragraf personalizat pe companie (`p`), un
argument pe sector (`FOUND` + `KICKER`), și coada comună cu mecanica locului
gratuit. Sectorul se alege din câmpul `s`: `crypto`, `ai`, `os`, `tech`.

## Ce s-a scos deliberat

**Memecoinurile și pump.fun.** Nu din snobism: locul #2 pe gift.ceo, lângă
Cyberbotics, ocupat de un memecoin, devalorizează întregul tablou. Publicul
acela vrea insigna ca instrument de pump, nu ca angajament.

**Elon Musk și X.** Nu există adresă publică. `press@x.com` răspunde automat
cu un emoji. Canalul real e X însuși, nu emailul.

## Înainte de trimitere

- **15–20 pe zi**, nu 37 odată. Gmail limitează, iar un val de mesaje identice
  către domenii mari intră în spam.
- Adresele sunt de presă sau contact general. Scrisoarea e scrisă să reziste
  și dacă o citește întâi un om de comunicare, nu directorul.
