# Google Ads — audit, reconstrucție, măsurare

## Ce s-a găsit (1 septembrie 2026)

Trei conturi, CHF 130/zi autorizați (~3.900/lună), CHF 240 cheltuiți efectiv în
30 de zile. Rezultat măsurat în baza de date: 11 anunțuri, dintre care mai multe
teste proprii.

**Situl nu avea niciun tag `AW-`.** Doar GA4 (`G-ZSR8ZKJ4RL`), pe 7 pagini. Tot
ce raporta Ads drept conversie venea din importul evenimentelor GA4. De acolo
cifra imposibilă: `Performance Max-1` raporta 5.758 conversii din 3.811 clicuri
(1,51 pe clic — semnătura unui eveniment de tip page_view) și ROAS 210.

**98% din bugetul de căutare pe un singur cuvânt.** Campania multilingvă a
cheltuit CHF 136; CHF 134 au mers pe `translator` în nouă limbi. `traductor`
singur: 105.779 afișări, 253 clicuri, CTR 0,24%. Cine scrie „traductor" vrea
Google Translate, nu să angajeze un om.

**Nota paginii de destinație era BELOW_AVERAGE la fiecare cuvânt punctat**, în
toate limbile. Cauza reală: 11 anunțuri în 11 orașe din 10 țări. Niciun vizitator
nu putea găsi pe cineva lângă el.

**gift.ceo:** CHF 30/zi autorizați, zero afișări în 30 de zile, 17 din 21 de
cuvinte „rarely shown". Nu e o problemă de licitație — „ceo giving pledge" nu se
caută.

## Măsurătoarea care contează

Nu depinde de Google. `site_visits.path` păstrează query string-ul întreg
(`safePath()` șterge doar tokenurile sensibile), deci parametrul `gclid` pe care
Google îl lipește pe fiecare clic plătit ajunge intact în bază. Aceeași
`session_id` care intră cu `gclid` și ajunge pe `/after-payment.html?free=1` este
o publicare atribuibilă reclamei.

Rezultatul, pe toată perioada 10 august – 1 septembrie:

| Sursă | Sesiuni | Au publicat | Rată |
|---|---:|---:|---:|
| Google Ads (plătit) | 5.075 | 2 | 0,039% |
| Restul (gratuit) | 1.322 | 9 | 0,681% |

Traficul gratuit convertește de 17 ori mai bine. CHF 240 / 2 anunțuri = CHF 120
pe anunț, pentru un anunț care nu aduce venit (publicarea e gratuită).

Al doilea rezultat, la fel de important: Google a facturat ~11.132 clicuri în
august; situl a văzut 9.094 încărcări de pagină cu `gclid`, de la 4.958 oameni.
Peste jumătate din clicurile plătite nu au ajuns niciodată pe pagină — semnătura
atingerilor accidentale pe inventarul de aplicații mobile.

## Ce s-a construit

Cele 11 campanii vechi: oprite, toate, pe toate trei conturile. Nu se pot șterge
prin conexiunea AdWhispr (nu există unealtă); rămân ca arhivă, datele se citesc
oricând pe interval de date.

Patru campanii noi de Search, **Manual CPC** — imune la conversiile false,
fiindcă licitarea manuală nu citește conversii. Toate pe pauză:

| Campanie | ID | Țintă | CHF/lună | Max/clic |
|---|---|---|---:|---:|
| `Rotabo - RO - Anunturi gratuite` | 24203633495 | România | 15 | 0,60 |
| `Rotabo - AR - Anunturi gratuite (AE+SA)` | 24203665334 | Emiratele | 15 | 0,70 |
| `Rotabo - EN - Florida - Free listings` | 24197871801 | Statele Unite | 60 | 1,20 |
| `Rotabo - DE - Frankfurt - Kostenlos inserieren` | 24208788154 | Frankfurt | 15 | 0,80 |

Numele a două dintre ele au rămas în urma țintirii: cea „Florida" țintește toată
America, cea „(AE+SA)" doar Emiratele. Redenumirea nu e posibilă prin unealtă.

Cuvintele sunt de **ofertă**, nu de cerere: la 11 anunțuri, doar partea care
oferă poate converti — cine caută nu găsește pe nimeni și pleacă. Volumul acestei
piețe e însă mic peste tot: în Germania, toate cuvintele de tip „îmi ofer
serviciile" adună ~1.400 căutări pe lună, în toată țara.

## Campania activă

`Rotabo - PMax - Trafic` — id **24208821754**, pornită 1 septembrie 2026, 21:31 UTC.
CHF 3,45/zi (105/lună). România, Emiratele, Statele Unite, Frankfurt.

Aleasă deliberat de proprietar, cu obiecția documentată mai sus pusă pe masă:
scopul declarat e volumul de oameni pe sit, iar aceiași bani cumpără ~170 de
clicuri reale pe Search sau ~26.000 pe Performance Max.

Performance Max nu are CPC manual — licitează pe „Maximize Conversions", deci
**această campanie citește conversiile false**, spre deosebire de cele patru de
Search. În cazul de față direcția coincide: conversia falsă se comportă ca o
încărcare de pagină, deci „maximizează conversiile" înseamnă practic
„maximizează încărcările de pagină".

### Linia de bază la pornire

    momentul     2026-09-01 21:31:36 UTC
    vizite_total          14.388
    vizite_gclid           9.231
    sesiuni_gclid          5.075
    publicari                 14
    anunturi                  11

### Interogarea de verificat

```sql
with s as (
  select session_id,
         bool_or(path ilike '%gclid=%')                    as din_ads,
         bool_or(path ilike '/after-payment.html%free=1%') as a_publicat
  from public.site_visits
  where created_at > '2026-09-01 21:31:36+00'
  group by session_id
)
select case when din_ads then 'platit' else 'gratuit' end as sursa,
       count(*) as sesiuni,
       count(*) filter (where a_publicat) as au_publicat
from s group by din_ads;
```

Testul: câte clicuri facturează Google față de câte sesiuni ajung efectiv pe sit.
Data trecută raportul a fost 11.132 facturate / 4.958 ajunse.

## Rămas de făcut

- **Curățenia conversiilor** — doar din interfață; conexiunea AdWhispr nu expune
  conversiile nici la citire, nici la scriere. Întâi se taie sursa (importul GA4
  din Tools > Linked accounts, plus acțiunile create automat), abia apoi se șterg,
  altfel se refac.
- **Tagul `AW-`** — codul e scris în `after-payment.html`, inert până când
  `window.ROTABO_ADS.id` primește ID-ul și eticheta din cont.
- **Igiena datelor** — „Elveția"/„Svizzera" și „Târgu Jiu"/„Tg jiu" sunt aceleași
  locuri scrise diferit. Cât timp orașul e text liber, „lângă tine" nu poate
  funcționa și nu se poate raporta pe geografie.
