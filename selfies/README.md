# selfies.lol

Site-ul selfies.lol: un Worker Cloudflare care servește fișierele din `public/`,
cu Supabase în spate. Domeniul e cumpărat de la Porkbun.

```
selfies/
  wrangler.toml          configurația Worker-ului (nume, domenii, assets, vars)
  src/worker.js          redirect www -> apex, headere de securitate, /api/*
  public/                tot ce vede vizitatorul (index.html, robots, sitemap, 404)
  public/config.js       URL-ul Supabase + cheia publică, citite de browser
  supabase/migrations/   schema bazei; 0001 e deja aplicată în proiect
```

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
5. Nu crea niciun record DNS pentru `selfies.lol` sau `www`: le face `wrangler deploy`
   singur, ca *Custom Domain* ale Worker-ului. Un CNAME pus de mână blochează pasul.

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

Pagina are deja: `<title>`, description, canonical, Open Graph, Twitter card, JSON-LD
(WebSite + WebPage), `robots.txt` cu sitemap, `404.html` cu `noindex`, iar `www`
face 301 către apex ca să existe o singură adresă de indexat. Lipsește
`public/og-image.png` (1200x630) -- până apare, previzualizările pe rețele sociale
n-au poză.

## 4. Când vine scriptul aplicației

- HTML/CSS/JS de client: în `public/`. Browser-ul are `window.SELFIES.supabaseUrl`
  și `window.SELFIES.supabaseKey` din `config.js`.
- Cod de server (chei secrete, Stripe, etc.): în `src/worker.js` sub `/api/*`;
  `env.SUPABASE_URL` și `env.SUPABASE_SERVICE_ROLE_KEY` sunt acolo.
- Schimbări de schemă: fișier nou `supabase/migrations/0002_*.sql`, aplicat în proiect.
  `0001_init.sql` a rulat deja și nu se mai editează.
- Pagini noi: adaugă-le în `public/sitemap.xml`; workflow-ul le anunță la push.
