/*
 * The three bands that run across the top of the site: what fills them.
 *
 * One file because two pages carry them -- the front page and crypto.html.
 * Everything here is written to work on a page that has less than the front
 * page does: the translations, the country names and the company window are
 * all read through window.* with a fallback, and a band whose element is not
 * on the page simply does not run.
 *
 * Lifted out of index.html on 2026-09-05, unchanged apart from this note.
 */

/* ------------------------------------------- sponsors and listings, and
   the business band beside it ------------------------------------------ */

/* The band across the top: the sponsor first, then everyone who has listed
   themselves, with the city and country beside each one.

   Both calls are functions the database already grants to anon --
   sponsors_public() and list_public_numbers() -- so nothing had to be opened
   up for this and no token is involved. list_public_numbers() also returns a
   name; the band deliberately shows the Rotabo number instead, which is the
   identity this site already publishes and looks people up by. */
(function(){
  var strip    = document.getElementById("ticker");
  var bizStrip = document.getElementById("tickerBiz");
  if (!strip || !window.supabase) return;

  // Which side of the site this is. business.html is index.html with this
  // one attribute set, so everything that differs between the two hangs off
  // it rather than off a second copy of the page.
  var isBiz = document.documentElement.getAttribute("data-mode") === "business";

  var sb = window.supabase.createClient(
    "https://auth.rotabo.app",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcWZicHp3ZGdud2pvYWVkanJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDkwMzgsImV4cCI6MjEwMTc4NTAzOH0.nds6gT2P32WT0wKoeCFAWuGLX3oipGKtvuU2mwdxi3w"
  );

  var listings = [];
  var sponsors = [];
  var companies = [];
  var loaded = false;

  function T(key, fallback){
    try {
      if (window.rotaboT) {
        var v = window.rotaboT(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback;
  }

  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* People type their country in whatever language they were reading the site
     in, so the rows hold "Svizzera" next to "Switzerland" for the same place.
     countries.js maps either back to an ISO code and then out again in the
     language on screen, which is the whole reason a reader in Japan does not
     get "Germany" in the middle of a Japanese page. */
  function whereOf(row){
    var lang = document.documentElement.getAttribute("lang") || "en";
    var country = row.country || "";
    if (window.RotaboCountries) {
      var iso = window.RotaboCountries.isoFor(country);
      if (iso) country = window.RotaboCountries.nameForIsoIn(iso, lang) || country;
    }
    return [row.city, country].filter(Boolean).join(", ");
  }

  /* A sponsor's own mark, drawn as the sponsor draws it.
     gift.ceo's is a near-black rounded square with a pale g and a gold dot, and it is
     inline rather than a file: it is four shapes, so it costs less than the
     request it would take to fetch it, and it stays sharp at any size. The
     colours are topten's own, not Rotabo's -- a sponsor's mark that has been
     recoloured to match the page it sits on is not the sponsor's mark.

     Keyed by host, so it is the sponsor that carries a logo, not the row. A
     sponsor with no mark here shows its name, which is what it did before. */
  var SPONSOR_MARKS = {
    "gift.ceo":
      '<svg class="tick__logo" viewBox="0 0 64 64" aria-hidden="true">'
      + '<rect width="64" height="64" rx="14" fill="#1c1b19"/>'
      + '<rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#d9a63c" stroke-opacity=".28" stroke-width="2"/>'
      + '<text x="30" y="45" font-family="Helvetica,Arial,sans-serif" font-size="38" font-weight="700" fill="#f2f0ec" text-anchor="middle">g</text>'
      + '<circle cx="48" cy="42" r="5" fill="#d9a63c"/>'
      + '</svg>'
  };

  function markFor(name, url){
    var key = String(name || "").toLowerCase().replace(/^www\./, "");
    if (SPONSOR_MARKS[key]) return SPONSOR_MARKS[key];
    try {
      var h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      if (SPONSOR_MARKS[h]) return SPONSOR_MARKS[h];
    } catch (e) { /* no url, or not one: the name was the only chance */ }
    return "";
  }

  function sponsorCell(name, url){
    var inner = '<span class="tick__label">' + esc(T("ticker.sponsors", "Sponsors")) + '</span>'
              + markFor(name, url)
              + '<b>' + esc(name) + '</b>';
    return url
      ? '<a class="tick tick--sponsor" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>'
      : '<span class="tick tick--sponsor">' + inner + '</span>';
  }

  function listingCell(row){
    var seeking = row.role === "seeking";
    var verb = seeking ? T("ticker.seeks", "looking for") : T("ticker.offers", "offers");
    var cat  = T("categories." + row.category + ".name", row.category || "");
    var where = whereOf(row);
    /* First word only. Two people in one household share an email and so a
       number, and land in the band offering the same thing in the same town
       -- one word is enough to tell Mihaela from Lucretia, and a full name
       beside a town is a great deal more than this band needs to say about
       someone who only wanted to be findable. */
    var who = String(row.name || "").trim().split(/\s+/)[0] || "";
    return '<span class="tick' + (seeking ? " tick--seek" : "") + '">'
         + '<span class="tick__dot"></span>'
         + (who ? '<span class="tick__who">' + esc(who.slice(0, 40)) + '</span>' : "")
         + '<span>' + esc(verb) + '</span>'
         + '<span class="tick__cat">' + esc(cat) + '</span>'
         + (where ? '<span class="tick__where">' + esc(where) + '</span>' : "")
         + (row.number ? '<span class="tick__num">#' + esc(row.number) + '</span>' : "")
         + '</span>';
  }

  /* An invitation, in the shape of a ticker cell: the business band is not a
     list of anybody yet, and an empty band is worse than one that says what
     it is for. */
  function inviteCell(href){
    return '<a class="tick tick--invite" href="' + esc(href) + '">'
         + '<span class="tick__dot"></span>'
         + '<span class="tick__cat">' + esc(T("ticker.company", "Your company can be here — registration is free")) + '</span>'
         + '</a>';
  }

  /* Partners are not sponsors, and the band says so.

     A sponsor here has made a voluntary donation -- that is what the Terms
     define one as. Cyberbotics has not: Olivier Michel gave Webots away under
     Apache 2.0 and published it as the first gift on gift.ceo, and this row is
     Rotabo returning that. Filing him under "Sponsors" would be a small lie
     about a real person, told on the front page, to save writing one more
     label.

     Their own mark, from their own server, so it is theirs and stays current
     if they change it. If the file ever moves, the image removes itself and
     the name carries the cell alone -- the same thing a sponsor with no mark
     has always done. */
  var PARTNERS = [
    { name: "Cyberbotics", url: "https://cyberbotics.com",
      logo: "https://cyberbotics.com/assets/images/webots.png" },
    /* EduKiwi's mark is the one exception to serving a partner's logo from
       their own server. Theirs is a wordmark, 254x79, and this cell is a
       20px square: hotlinked it would arrive squashed to a smear no one
       could read. So it is their file, cropped to the stack on its cream
       base and given the white ground it is drawn for -- their mark, not a
       redrawing of it. The cost is that it no longer follows edukiwi.ro if
       they change it, which is a cost worth paying to have it legible. */
    { name: "EduKiwi", url: "https://edukiwi.ro",
      logo: "icons/edukiwi-mark.png" }
  ];

  function partnerCell(p){
    var logo = p.logo
      ? '<img class="tick__logo" src="' + esc(p.logo) + '" alt="" decoding="async"'
        + ' onerror="this.remove()">'
      : '';
    return '<a class="tick tick--sponsor" href="' + esc(p.url) + '" target="_blank" rel="noopener">'
         + '<span class="tick__label">' + esc(T("ticker.partner", "Partner")) + '</span>'
         + logo
         + '<b>' + esc(p.name) + '</b>'
         + '</a>';
  }

  function sponsorCells(){
    var out = [];
    // gift.ceo is the standing sponsor and is not in the table, so it is
    // written here. Anything the table does hold joins it rather than
    // replacing it, and this line needs no edit when the first one lands.
    out.push(sponsorCell("gift.ceo", "https://gift.ceo"));
    sponsors.forEach(function(s){
      if (s && s.display_name) out.push(sponsorCell(s.display_name, s.website_url || ""));
    });
    PARTNERS.forEach(function(p){ out.push(partnerCell(p)); });
    return out;
  }

  // The two bands carry different things, and which is which depends on the
  // side of the site being read. On the personal side the top band is the
  // people who have listed themselves and the second one is the business
  // side showing through; on the business side there is one band, and it is
  // the business one.
  /* The companies that have registered, in the band.

     The hundred-places box below is hidden for now, so this is the only place
     a firm appears -- which makes it the place that has to be worth
     registering for. Logo, name, field, town: the same four things the box
     showed, in a line.

     A button rather than a span, because on the business side there is
     somewhere to go: the same window the search opens, with what the company
     offers behind the gate. On the private side that function does not exist
     and the click quietly does nothing, which is better than a link to a page
     that is not there. */
  function companyCell(row){
    var where = whereOf(row);
    var lg = row.logo_path
      ? '<img class="tick__logo" src="' + esc(
          "https://auth.rotabo.app/storage/v1/object/public/company-logos/"
          + String(row.logo_path).split("/").map(encodeURIComponent).join("/")
        ) + '" alt="" decoding="async">'
      : '';
    return '<button type="button" class="tick tick--firm" data-firmcell="' + esc(row.id) + '">'
         + lg
         + '<b>' + esc(row.name || "") + '</b>'
         + '<span class="tick__cat">' + esc(T("domains." + row.domain, String(row.domain || "").replace(/_/g, " "))) + '</span>'
         + (where ? '<span class="tick__where">' + esc(where) + '</span>' : "")
         + '</button>';
  }

  function cells(){
    if (isBiz) return sponsorCells()
      .concat(companies.map(companyCell))
      .concat([inviteCell("#categories")]);
    var out = sponsorCells();
    listings.forEach(function(row){ out.push(listingCell(row)); });
    return out;
  }

  function bizCells(){
    return sponsorCells()
      .concat(companies.map(companyCell))
      .concat([inviteCell("/business.html")]);
  }

  function paintInto(el, base){
    if (!el) return;
    var trk = el.querySelector(".ticker__track");
    if (!base.length) { el.hidden = true; return; }
    el.hidden = false;

    /* One pass of the list can be narrower than the screen -- five listings on
       a desktop is -- and then the track slides off and leaves the band empty
       while it waits to come round. Repeat the pass until it is wider than the
       window, and only then print the whole thing twice for the -50% loop.
       The same string can be reused here: unlike the strip on topten.one,
       nothing in these cells mints an id as it is built. */
    trk.innerHTML = base.join("");
    var one = trk.scrollWidth || 1;
    var copies = Math.max(1, Math.ceil((window.innerWidth + 80) / one));
    var pass = "";
    for (var i = 0; i < copies; i++) pass += base.join("");
    trk.innerHTML = pass + pass;

    // Constant speed rather than constant duration, so the band reads the
    // same whether it is carrying six entries or six hundred.
    var half = trk.scrollWidth / 2;
    trk.style.animationDuration = Math.max(14, Math.round(half / 55)) + "s";
  }

  /* Delegated on the document, because the track is rewritten on every
     paint and a listener bound to a cell would not survive it. */
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-firmcell]");
    if (!b) return;
    var id = b.getAttribute("data-firmcell");
    var row = null;
    companies.forEach(function(c){ if (c.id === id) row = c; });
    if (row && window.RotaboOpenCompany) window.RotaboOpenCompany(row);
  });

  function paint(){
    if (!loaded) return;
    paintInto(strip, cells());
    // The second band only exists on the personal side. On the business side
    // the top band is already carrying it.
    if (!isBiz) paintInto(bizStrip, bizCells());
  }

  Promise.all([
    sb.rpc("list_public_numbers"),
    sb.rpc("sponsors_public"),
    sb.rpc("companies_public")
  ]).then(function(res){
    if (!res[0].error && Array.isArray(res[0].data)) listings = res[0].data;
    if (!res[1].error && Array.isArray(res[1].data)) sponsors = res[1].data;
    if (!res[2].error && Array.isArray(res[2].data)) companies = res[2].data;
  }).catch(function(){
    /* Offline or the database is down: the sponsor cell alone still runs,
       which is a band that looks deliberate instead of one that looks broken. */
  }).then(function(){
    loaded = true;
    paint();
  });

  // Chained, never assigned: something already owns this hook, and overwriting
  // it once cost this page its country list.
  var beforeTicker = window.__afterTranslate;
  window.__afterTranslate = function(d){
    if (beforeTicker) { try { beforeTicker(d); } catch (e) {} }
    paint();
  };

  // Only when the width actually changes: a phone fires resize on every
  // address-bar nudge, and repainting there restarts the animation mid-run.
  var lastWidth = window.innerWidth, resizeTimer = null;
  window.addEventListener("resize", function(){
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(paint, 250);
  });
})();

/* ------------------------------------------------- the token band --- */

/* ---------------------------------------------------------------------
   The token band.
   ---------------------------------------------------------------------
   It runs on a clock, not on a deploy: nobody has to be awake at 21:00 to
   push a change. Three states, and the difference between the last two is
   the whole reason this is not a single timer that flips a sentence --

     before the hour   the token is coming, at a time written out with its
                       offset so it is the same moment in every country
     after it, no mint the coin is being created; the band says "launching
                       now" and points at the page that will carry the
                       address
     after it, a mint  it is live, and the band says so beside pump.fun's
                       own mark

   A clock alone would announce a launch that had not happened yet if the
   hour passed and the coin did not appear. It says what is true instead,
   and the address is what moves it to the last state.

   MINT is the one thing to fill in, and crypto.html holds the same string
   in the same shape -- two places, on purpose: this band must keep working
   if that page is ever rewritten. */
(function () {
  var band  = document.getElementById('tokenBand');
  var track = document.getElementById('tokenTrack');
  if (!band || !track) return;

  var LANSARE = new Date('2026-09-04T21:00:00+02:00').getTime();
  var MINT = '8EdzHKSEGTp4cex8sTX55rGhVBiEoWWeih24VyeRpump';

  var MARCA = '<span class="mk" aria-hidden="true">'
    + '<svg viewBox="0 0 200 260"><use xlink:href="#diamondShape" href="#diamondShape" fill="url(#diamondGrad)"/></svg>'
    + '<svg viewBox="0 0 200 260"><use xlink:href="#diamondShape" href="#diamondShape" fill="url(#diamondGold)"/></svg>'
    + '</span>';
  var PUMP = '<img src="/pumpfun-logo.png" alt="" width="26" height="26" loading="lazy" decoding="async">';

  function stare() {
    if (Date.now() < LANSARE) return 'inainte';
    return MINT ? 'live' : 'acum';
  }

  function unitate(st) {
    if (st === 'inainte') {
      return MARCA + '<b>Rotabo Token</b>'
           + '<span class="when">launching today at 21:00, Swiss time</span>';
    }
    if (st === 'live') {
      return MARCA + '<b>Rotabo Token</b><span class="when">is live on</span>' + PUMP + '<b>pump.fun</b>';
    }
    return MARCA + '<b>Rotabo Token</b><span class="when">launching now on</span>' + PUMP + '<b>pump.fun</b>';
  }

  var ultima = null;
  function deseneaza() {
    var st = stare();
    if (st === ultima) return;          /* leave the animation alone */
    ultima = st;

    var u = '<a class="tick tick--token" href="/crypto.html">' + unitate(st) + '</a>';
    /* Three units, then the same three again: the keyframe walks the track
       to -50%, so the second half has to be the first half exactly. */
    track.innerHTML = u + u + u + u + u + u;

    /* Set from the measured width, like the other bands: a fixed duration
       makes a short band crawl and a long one sprint. */
    var jumatate = track.scrollWidth / 2;
    track.style.animationDuration = Math.max(20, Math.round(jumatate / 55)) + 's';
    band.hidden = false;
  }

  deseneaza();
  setInterval(deseneaza, 1000);
})();
