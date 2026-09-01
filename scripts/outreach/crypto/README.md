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

## Ordinea de trimitere — nivelul de acces

Pagina e grupată după singurul criteriu care contează: **poate omul care
citește inboxul ăla să spună „da"?**

| Nivel | Câți | Cine | Ce să aștepți |
|---|---:|---|---|
| **A** | 10 | fundații mici, menținători individuali | Un răspuns e posibil. Trimite-le primele. |
| **B** | 17 | companii încă mici | Mesajul ajunge la un om care decide. |
| **C** | 10 | adrese de presă la companii mari | Filtru de comunicare. Bilete de loterie. |

Nivelul C nu e o presupunere. **Binance a răspuns pe 1 septembrie 2026 cu un
robot** care spune, textual, că adresa e „for media and marketing inquiries
only" și că un om din echipa de PR va contacta expeditorul „shortly". Adresa e
vie și livrează — dar la comunicare, nu la director. Restul companiilor mari se
comportă la fel.

Concluzia practică: `pr@` verifică faptul că adresa există, nu că scrisoarea
ajunge unde trebuie. Randamentul real e la nivelul A, unde `contact@` e citit de
persoana care poate decide, și unde `drh@hwaci.com` e chiar el.

## Înainte de trimitere

- **15–20 pe zi**, nu 37 odată. Gmail limitează, iar un val de mesaje identice
  către domenii mari intră în spam.
- Adresele sunt de presă sau contact general. Scrisoarea e scrisă să reziste
  și dacă o citește întâi un om de comunicare, nu directorul.

---

## Companiile cotate la bursă — ce s-a găsit și ce s-a învățat

Aproximativ 100 de companii mari verificate: mega-capurile americane prin
paginile de investor relations, apoi Europa și Asia prin Impressum și contact.

**Randamentul, pe metodă:**

| Metodă | Verificate | Cu adresă publicată |
|---|---:|---:|
| Investor relations, SUA | 30 | 2 |
| Impressum, Germania/Elveția | 39 | 7 |
| Contact, restul Europei + Asia | 32 | 4 |

Impressum-ul bate investor relations de trei ori — legea germană (§5 TMG)
obligă la o adresă reală de contact, iar bursa americană nu obligă la nimic
echivalent. Aceeași metodă care a găsit primele două nume din lista veche
gift.ceo, Märkisches Landbrot și einhorn.

**Dar toate cele treisprezece găsite sunt nivel C.** Fără excepție: comunicare
corporativă sau relații cu investitorii. Niciuna nu ajunge la cineva care poate
decide. Am adăugat doar patru în listă — cele cu o poveste de dar adevărată și
verificabilă. Restul rămân adrese fără scrisoare, fiindcă un paragraf de
deschidere inventat e mai rău decât nicio scrisoare.

### Obstacolul de fond, care nu e tehnic

Un director angajat al unei companii cotate **nu poate dărui.** Ține în
custodie proprietatea altora. A da un activ fără decizie de consiliu nu e
generozitate, e încălcare a obligației fiduciare.

Asta explică de ce Cyberbotics a acceptat locul #1: companie condusă de
fondatori, care își pot da propriul lucru. Și prezice că S&P 100 nu va accepta.

**Concluzia practică pentru gift.ceo:** propunerea se potrivește companiilor
controlate de fondatori, nu celor cotate. Cele patru de mai jos sunt excepții
tocmai fiindcă decizia lor a fost luată o singură dată, demult, de un om care
avea atunci autoritatea s-o ia.

### Cele patru adăugate

| Companie | Darul | Când |
|---|---|---|
| Volvo | Brevetul centurii în trei puncte, dat gratuit tuturor constructorilor | 1959 |
| Merck | Mectizan donat pentru orbul râului — „cât e nevoie, cât timp e nevoie" | 1987, încă în curs |
| AstraZeneca | Vaccinul COVID la preț de cost, majoritatea spre țări sărace | 2020–2021 |
| Ørsted | Și-au demontat propria afacere pe cărbune, ieftinind eolianul pentru concurenți | 2017– |

### Toate cele treisprezece au scrisoare

La prima trecere am scris doar patru, lăsându-le pe restul ca adrese fără
scrisoare — nu aveam un fapt verificabil despre ce au dat, iar un paragraf de
deschidere inventat e mai rău decât nicio scrisoare.

Rezolvarea nu a fost să inventez. Două aveau un fapt pe care îl ratasem:

| Companie | Ce am ratat |
|---|---|
| Fresenius | Acționarul de control e Else Kröner-Fresenius-Stiftung, fundație caritabilă. Aceeași structură ca Bosch. |
| Henkel | Familia păstrează blocul de control printr-un acord pe care îl reînnoiesc. Proprietarii pot dărui; un director angajat, nu. |

Celelalte șapte — Adidas, Infineon, Symrise, Sartorius, Deutsche Telekom, Eni,
Chevron — au o deschidere care spune adevărul în loc să laude:

> I am writing without knowing what your company has given away, and that is the
> honest reason for the letter rather than an apology for it.

E o scrisoare mai bună decât una cu un compliment inventat, și e singura formă
onestă la o companie despre care nu am găsit un fapt.

### De urmărit

**Novo Nordisk** nu a răspuns la scanare, dar merită găsit manual: compania e
controlată de Novo Nordisk Foundation, cea mai mare fundație caritabilă din
lume după active. Aceeași structură ca Bosch — profitul se duce la scop, nu la
acționari. E cel mai bun candidat rămas nedescoperit.
