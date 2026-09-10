# selfies.lol

Site-ul selfies.lol: un Worker Cloudflare care servește fișierele din `public/`,
cu Supabase în spate. Domeniul e cumpărat de la Porkbun.

```
selfies/
  wrangler.toml          configurația Worker-ului (nume, domenii, assets, vars)
  src/worker.js          tot serverul: /api, /i, /s/<id>, sitemap, /api/admin
  public/index.html      peretele
  public/app.js          clientul: cameră, redimensionare, feed, like, raport
  public/app.css         stilurile, folosite și de paginile randate de Worker
  public/admin.html      moderarea, deschisă cu tokenul de admin
  supabase/migrations/   schema; 0001 și 0002 sunt aplicate în proiect
```

## Cum e făcut

Browserul nu vorbește niciodată cu Supabase. Vorbește doar cu `/api` pe
selfies.lol, iar Worker-ul ține singura cheie care există (service role, pusă cu
`wrangler secret put`). Toate tabelele au RLS pornit **fără nicio politică**, deci
cheia publicabilă nu poate citi și nu poate scrie nimic; singura intrare e prin
Worker.

Identitatea e un cookie și nimic altceva: la prima postare, Worker-ul face un rând
în `posters`, un token opac în `poster_sessions`, și îl pune în cookie. Fără email,
fără parolă, fără așteptat un mesaj. Am ales asta pentru că proiectul are doar
autentificare pe email, cu confirmare, prin mailer-ul intern al Supabase, care
trimite câteva mesaje pe oră: un perete de selfie-uri la care trebuie să aștepți un
email e un perete gol. Prețul e că identitatea ține de browser -- ștergi cookie-ul,
ești altcineva. Când asta devine o problemă, Supabase Auth se poate adăuga peste
aceeași tabelă `posters`.

Pozele stau în bucket-ul public `selfies`, dar se servesc prin `/i/...` de pe
domeniul propriu, cu cache lung la Cloudflare, ca adresa pe care o vede Google să
fie a noastră.

Fiecare selfie are pagina lui la `/s/<id>`, randată de Worker cu titlu, descriere,
Open Graph și JSON-LD proprii. `sitemap.xml` e generat din rânduri, nu ținut la zi
de mână: fiecare poză nouă intră singură în el, iar workflow-ul anunță IndexNow.

Redimensionarea se face în browser, înainte de trimitere: o poză de telefon are
patru megabytes de detaliu pe care nimeni nu-i vede pe un perete, iar trecerea prin
canvas lasă EXIF-ul în urmă -- adică și locul unde ai stat când ai făcut-o.

### Moderare

Trei rapoarte de la trei persoane scot poza de pe perete pe loc și o lasă în coada
de la `/admin`. Tokenul de admin nu e în cod: în baza de date stă doar amprenta lui
sha256, iar tokenul în clar e la tine. Din pagina de moderare poți ascunde, șterge
definitiv (rând plus fișier) sau bloca autorul, ceea ce îi ascunde tot ce a pus.

Un site pe care oricine poate încărca poze fără cont are nevoie de ochi. Coada de
la `/admin` e minimul; pasul următor, dacă vine trafic, e clasificarea automată a
imaginilor (Workers AI are un model pentru asta) înainte ca poza să apară.

### Limite

Douăsprezece poze pe oră de la un browser, treizeci de la o adresă IP. Adresa nu se
păstrează: în `selfies.ip_hash` stă sha256 din adresă plus o sare care e în
`app_config`, adică destul cât să limitezi, nu destul cât să afli cine a fost.

Zona Cloudflare: `selfies.lol`, Zone ID `c4dda510e4c17d721a263e88490bc1b3`, nameservere
`jeremy.ns.cloudflare.com` și `ullis.ns.cloudflare.com` (puse la Porkbun pe 2026-09-07).

Proiect Supabase: **selfies** (`uwpsdbymmwwoeltlvtic`, eu-central-1, 10 $/lună).
URL: `https://uwpsdbymmwwoeltlvtic.supabase.co`.

## 1. Domeniul: Porkbun -> Cloudflare (o singură dată, de mână)

1. Cloudflare dashboard -> **Add a domain** -> `selfies.lol` -> planul Free.
2. Cloudflare afișează două nameservere (`xxx.ns.cloudflare.com`).
3. Porkbun -> Domain Management -> selfies.lol -> **Authoritative Nameservers**
   -> șterge ce e acolo, pune cele două de la Cloudflare, salvează.
4. Așteaptă până zona apare **Active** în Cloudflare (de obicei minute, maxim o zi).
5. Cloudflare -> DNS -> Records: **șterge** cele două recorduri A importate de la
   Porkbun (`selfies.lol` și `www`, spre 172.67.x / 104.21.x, pagina de parcare
   "Coming Soon"). Nu pune nimic în loc: `wrangler deploy` creează singur cele două
   hostname-uri ca *Custom Domain* ale Worker-ului, iar un record existent pe
   același nume blochează pasul.
6. HTTPS merge abia după ce Cloudflare emite certificatul Universal SSL, de regulă
   în câteva minute după activarea zonei, uneori până la o zi. Până atunci
   `https://selfies.lol` dă "handshake failure"; nu e o eroare de configurare.

Stare la 2026-09-07 23:56 UTC: nameserverele propagate, zona activă, certificatul
încă neemis, recordurile de parcare încă prezente (pasul 5 e de făcut).

## 2. Primul deploy

Local, din `selfies/`:

```
npm install
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # din Supabase -> Settings -> API Keys
npm run deploy
```

Sau din GitHub Actions (`.github/workflows/selfies.yml`), la fiecare push pe `main`
care atinge `selfies/`. Are nevoie de două secrete în repo (Settings -> Secrets ->
Actions):

| secret | de unde |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare -> My Profile -> API Tokens -> Create Token -> șablonul "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | `cf7a850abe1776336a7e82de730c5e12` (contul în care rulează și Worker-ul rotabo) |

Alternativă fără token: repo-ul e deja legat la **Workers Builds** pentru Worker-ul
rotabo. Cloudflare -> Workers & Pages -> Create -> Import a repository -> `rotabo`,
cu *Root directory* `selfies`, *Deploy command* `npx wrangler deploy`, branch `main`.
Atunci Cloudflare face deploy singur la fiecare push, iar pasul "Deploy" din workflow
devine de prisos (poate fi șters, lăsând doar IndexNow).

Până când zona nu e activă (pasul 1), deploy-ul cade la rutele `custom_domain`.
Pentru test înainte de asta: `npm run dev` (http://localhost:8787), sau comentează
temporar cele două blocuri `[[routes]]` și folosește adresa `*.workers.dev`.

## 3. Google

IndexNow (Bing, Yandex, Seznam, Naver) se face singur din workflow, cu cheia
`public/4239de776831bf877ed25e870b96aa4c.txt`. Google nu participă la IndexNow;
Google se face prin Search Console, o singură dată:

1. https://search.google.com/search-console -> **Add property** -> tipul **Domain**
   -> `selfies.lol`.
2. Google dă un record TXT (`google-site-verification=...`). Cloudflare -> DNS ->
   Records -> Add: Type `TXT`, Name `@`, Content textul dat. Salvează, apoi **Verify**.
3. Search Console -> **Sitemaps** -> trimite `https://selfies.lol/sitemap.xml`.
4. Search Console -> **URL Inspection** -> `https://selfies.lol/` -> **Request indexing**.
   Asta e ce grăbește prima apariție; restul vine din sitemap.

Pagina de start și fiecare pagină de selfie au titlu, description, canonical, Open
Graph, Twitter card și JSON-LD proprii. `robots.txt` trimite la sitemap, `404.html`
e `noindex`, iar `www` face 301 către apex ca să existe o singură adresă de
indexat.

## 4. Mai departe

- Client: `public/app.js` și `public/index.html`.
- Server: `src/worker.js`. `env.SUPABASE_URL` e în `wrangler.toml`,
  `env.SUPABASE_SERVICE_ROLE_KEY` e secret de Worker.
- Schimbări de schemă: fișier nou în `supabase/migrations/`, aplicat în proiect.
  Cele existente au rulat deja și nu se mai editează.
- Pagini noi statice: adaugă-le în ruta `sitemap()` din Worker. Selfie-urile intră
  singure.
- Local: `npm run dev`. Are nevoie de `selfies/.dev.vars` cu
  `SUPABASE_SERVICE_ROLE_KEY="..."`; fișierul e în `.gitignore` și nu se comite.
  Fără el, paginile merg și `/api` răspunde curat că baza nu e accesibilă.

Un lucru de știut despre `wrangler dev`: îi dă Worker-ului hostname-ul real
(`selfies.lol`) peste http simplu, și simulează inclusiv `cf-connecting-ip` și
`request.cf`. De aceea redirectul http -> https **nu** e în Worker: acolo ar porni
la fiecare cerere locală, iar dev server-ul rescrie `Location` înapoi spre
localhost, deci ar fi o buclă. Îl fac setarea *Always Use HTTPS* din zonă, care e
pornită, și antetul HSTS pe care Worker-ul îl pune pe orice răspuns. Dacă acea
setare se stinge vreodată, repornește-o -- Worker-ul nu o acoperă.

<!-- build: workers builds connected 2026-09-08 -->
