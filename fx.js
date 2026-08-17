/*
 * Approximate CHF -> local currency, so "1 CHF" means something to a
 * visitor who has never held a franc.
 *
 * Two separate questions, answered separately:
 *
 * Which currency? The language picked in the site's own switcher. Reading
 * the region off navigator.language instead pinned the figure to whatever
 * the operating system was set to, so a Romanian laptop quoted lei in all
 * thirty-eight languages -- switching to Français changed every word on
 * the page except the one number the line exists to explain. The browser
 * region is still consulted, but only to choose between countries that
 * share the chosen language: English is pounds in Britain and dollars in
 * the States, and German stays silent in Switzerland because francs need
 * no translation there. Before the visitor has picked anything the site
 * is in English for everyone, so the language says nothing about them and
 * the browser region decides on its own, as it always did.
 *
 * Which rate? The daily reference rates from open.er-api.com, cached in
 * localStorage until the API's own next publication time -- one request
 * per visitor per day, and none at all while the cache is fresh. The
 * table below is the fallback: it carries the first paint before the
 * response lands, offline visits, and any day the request fails.
 *
 * When no local currency can be determined -- the browser names no
 * region we know and no language has been chosen, or the region has no
 * entry in the table -- the hint falls back to US dollars, the one
 * currency a reader anywhere can be expected to place. Only Swiss (and
 * Liechtenstein) visitors see nothing at all: for them the CHF figure
 * needs no translation.
 *
 * Nothing here charges anyone. Stripe's Adaptive Pricing does the real
 * conversion at checkout, which is why every figure is prefixed with "≈".
 */
(function (global) {
  // 1 CHF expressed in each currency. Snapshot: 16 August 2026. Only the
  // fallback now, but keep it roughly current -- it is what an offline
  // visitor sees. Refresh with: curl -s "https://open.er-api.com/v6/latest/CHF"
  var FALLBACK_RATES = {
    AED: 4.518, ARS: 1831.45, AUD: 1.7384, BDT: 151.12,
    BRL: 6.372, CAD: 1.707, CLP: 1124.11, CNY: 8.3145, COP: 3860.22,
    CZK: 25.766, DKK: 7.9603, EGP: 61.74, EUR: 1.0635, GBP: 0.9091,
    HUF: 386.26, IDR: 21911.28, ILS: 3.6395, INR: 117.47, ISK: 151.34,
    JPY: 195.88, KES: 159.24, KRW: 1740.66, MXN: 20.937, MYR: 5.027,
    NGN: 1673.88, NOK: 11.627, NZD: 2.0905, PEN: 4.148, PHP: 75.573,
    PKR: 341.4, PLN: 4.5814, RON: 5.5811, RUB: 102.85, SAR: 4.6134,
    SEK: 11.717, SGD: 1.5733, THB: 40.787, TRY: 58.92, UAH: 55.025,
    USD: 1.2302, VND: 32054.03, ZAR: 19.907
  };

  // BG joined on 1 January 2026; there is no lev to convert to any more.
  var EURO = ["AT","BE","BG","CY","DE","EE","ES","FI","FR","GR","HR","IE",
              "IT","LT","LU","LV","MT","NL","PT","SI","SK"];

  var REGION_CURRENCY = {
    US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY",
    CN: "CNY", HK: "USD", TW: "USD", IN: "INR", BR: "BRL", MX: "MXN",
    SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF",
    RO: "RON", TR: "TRY", ZA: "ZAR", KR: "KRW", SG: "SGD",
    TH: "THB", ID: "IDR", MY: "MYR", PH: "PHP", VN: "VND", AE: "AED",
    SA: "SAR", IL: "ILS", UA: "UAH", RU: "RUB", NG: "NGN", KE: "KES",
    EG: "EGP", PK: "PKR", BD: "BDT", CL: "CLP", CO: "COP", AR: "ARS",
    PE: "PEN", IS: "ISK", CH: "CHF", LI: "CHF"
  };
  EURO.forEach(function (cc) { REGION_CURRENCY[cc] = "EUR"; });

  // Each language in the switcher -> the countries that speak it, most
  // likely first. The first entry is the one the switcher's own flag
  // shows and the one everybody gets; the rest only matter when the
  // visitor's browser already says they are in one of them, which is how
  // Português becomes reais in Brazil and euros everywhere else.
  //
  // CH and LI appear under de/fr/it on purpose: they resolve to CHF, and
  // approx() prints nothing for CHF. A visitor in Zurich reading German
  // is already looking at their own currency.
  var LANG_REGIONS = {
    en: ["GB","US","CA","AU","NZ","IE","IN","ZA","SG","PH","MY","NG","KE"],
    it: ["IT","CH"],
    ro: ["RO"],
    es: ["ES","MX","AR","CL","CO","PE","US"],
    fr: ["FR","CA","CH","BE","LU"],
    de: ["DE","AT","CH","LI","LU"],
    pt: ["PT","BR"],
    zh: ["CN","TW","HK","SG"],
    ar: ["SA","AE","EG"],
    ja: ["JP"],
    ko: ["KR"],
    ru: ["RU"],
    ms: ["MY","SG"],
    hi: ["IN"],
    sw: ["KE"],
    vi: ["VN"],
    th: ["TH"],
    id: ["ID"],
    tr: ["TR"],
    bn: ["BD","IN"],
    ur: ["PK","IN"],
    bg: ["BG"],
    cs: ["CZ"],
    hr: ["HR"],
    da: ["DK"],
    et: ["EE"],
    fi: ["FI"],
    el: ["GR","CY"],
    ga: ["IE"],
    lv: ["LV"],
    lt: ["LT"],
    hu: ["HU"],
    mt: ["MT"],
    nl: ["NL","BE"],
    pl: ["PL"],
    sk: ["SK"],
    sl: ["SI"],
    sv: ["SE","FI"]
  };

  // The visitor's region, from the browser's own locale. There is no
  // geolocation here by design -- a wrong guess would only mislabel a
  // price, so the safe failure is the USD fallback, never a guess.
  var cachedRegion;
  function region() {
    if (cachedRegion !== undefined) return cachedRegion;
    var tags = [];
    try {
      var resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) tags.push(resolved);
    } catch (e) { /* older browsers */ }
    if (global.navigator) {
      if (navigator.languages) tags = tags.concat(navigator.languages);
      if (navigator.language) tags.push(navigator.language);
    }
    cachedRegion = "";
    for (var i = 0; i < tags.length && !cachedRegion; i++) {
      var parts = String(tags[i]).toUpperCase().replace(/_/g, "-").split("-");
      // Start at 1: the first subtag is the language, and several language
      // codes double as region codes. Reading "de-CH" as Germany would
      // quote euros to someone standing in Switzerland.
      for (var j = 1; j < parts.length; j++) {
        if (/^[A-Z]{2}$/.test(parts[j]) && REGION_CURRENCY[parts[j]]) {
          cachedRegion = parts[j];
          break;
        }
      }
    }
    return cachedRegion;
  }

  // The language the visitor chose, or "" if they never opened the
  // switcher. index.html writes this key; browse.html and account.html
  // read it too, so every page agrees without passing anything around.
  function chosenLang() {
    var code = "";
    try { code = localStorage.getItem("rotabo_lang") || ""; } catch (e) { /* private mode */ }
    return String(code).toLowerCase().split("-")[0];
  }

  // "USD" is the answer of last resort throughout: better a hint in the
  // world's reference currency than no hint at all.
  function currency() {
    var lang = chosenLang();
    if (!lang) return REGION_CURRENCY[region()] || "USD";

    var list = LANG_REGIONS[lang];
    if (!list) return REGION_CURRENCY[region()] || "USD";

    var here = region();
    if (here && list.indexOf(here) !== -1) return REGION_CURRENCY[here];
    return REGION_CURRENCY[list[0]] || "USD";
  }

  // ----- daily rates -----

  var LIVE_URL = "https://open.er-api.com/v6/latest/CHF";
  var CACHE_KEY = "rotabo_fx_rates";
  var rates = FALLBACK_RATES;
  var listeners = [];
  var lastShown = null;

  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) { /* one bad caller must not stop the rest */ }
    }
  }

  // EUR is the sanity check: every source that knows CHF knows EUR, so a
  // payload missing it is truncated or an error page, not rates.
  function usable(table) {
    return !!table && typeof table.EUR === "number" && table.EUR > 0;
  }

  function load() {
    var cached = null;
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) { /* absent, unparseable, or storage denied */ }

    // Yesterday's real rates still beat a snapshot from months ago, so an
    // expired cache is adopted first and only then refreshed.
    if (cached && usable(cached.rates)) rates = cached.rates;
    if (cached && usable(cached.rates) && cached.until > now()) return;

    if (!global.fetch) return;
    fetch(LIVE_URL, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        if (!json || json.result !== "success" || !usable(json.rates)) return;
        rates = json.rates;
        // The API publishes once a day and states when the next set lands.
        // Honour that instead of guessing an interval; if it ever stops
        // saying, half a day keeps the figure honest without hammering it.
        var until = Number(json.time_next_update_unix) * 1000;
        if (!(until > now())) until = now() + 12 * 60 * 60 * 1000;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ until: until, rates: json.rates }));
        } catch (e) { /* this session still has them in memory */ }
        emit();
      })
      .catch(function () { /* offline or blocked: the fallback stands */ });
  }

  function now() { return new Date().getTime(); }

  // ----- formatting -----

  // The code, not the symbol. "$" is shared by USD, CAD, MXN, AUD and
  // more, and a Mexican reading "$20.94" as US dollars would think the
  // site is seventeen times pricier than it is. It also matches how the
  // price itself is written -- "1 CHF", never "1 Fr.".
  function format(value, cur, locale) {
    var digits = value >= 100 ? 0 : 2;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
        currencyDisplay: "code",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(value);
    } catch (e) {
      return "";
    }
  }

  // "≈ USD 1.23" for a CHF amount, or "" only when the visitor is Swiss
  // -- everyone else always gets a figure, in their currency when we know
  // it and in dollars when we don't. Callers append it to a price that is
  // already shown in CHF, so an empty string just means the CHF figure
  // stands alone.
  function approx(chf) {
    var cur = currency();
    if (cur === "CHF") return "";
    var rate = rates[cur] || FALLBACK_RATES[cur];
    if (!rate) {
      // A currency we can name but not price. Dollars again: USD is in
      // every payload this file has ever seen, fallback table included.
      cur = "USD";
      rate = rates.USD || FALLBACK_RATES.USD;
    }

    var value = chf * rate;
    // Group separators follow the chosen language, so the number reads
    // the way the rest of the page does. An unsupported tag falls back to
    // the browser's own formatting rather than to no formatting at all.
    var text = format(value, cur, chosenLang() || undefined) || format(value, cur, undefined);
    return "≈ " + (text || (Math.round(value) + " " + cur));
  }

  // ----- change notifications -----

  // Prices are drawn once, but both inputs can arrive late: the day's
  // rates land after the first paint, and the currency itself changes the
  // moment someone picks a language. Callers register here and redraw.
  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  // index.html calls this from the language switcher. Silent when the new
  // language shares the old currency -- picking Italiano over Français
  // leaves euros as euros, and there is nothing to redraw.
  function refresh() {
    var cur = currency();
    if (cur === lastShown) return;
    lastShown = cur;
    emit();
  }

  lastShown = currency();
  load();

  global.RotaboFx = {
    approx: approx,
    currency: currency,
    onChange: onChange,
    refresh: refresh
  };
})(window);
