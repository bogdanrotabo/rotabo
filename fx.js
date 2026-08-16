/*
 * Approximate CHF -> local currency, so "1 CHF" means something to a
 * visitor who has never held a franc.
 *
 * The rates are a static snapshot on purpose. Stripe already charges the
 * exact converted amount at checkout (Adaptive Pricing is always on for
 * Payment Links), so this is only a signpost -- a year of drift on a one
 * or two franc price is a couple of cents, which does not justify a live
 * exchange-rate dependency on every page load. Everything shown from
 * here is prefixed with "≈" and never used to charge anyone.
 *
 * To refresh: curl -s "https://open.er-api.com/v6/latest/CHF"
 */
(function (global) {
  // 1 CHF expressed in each currency. Snapshot: 16 August 2026.
  var RATES = {
    AED: 4.518, ARS: 1831.45, AUD: 1.7384, BDT: 151.12, BGN: 2.0801,
    BRL: 6.372, CAD: 1.707, CLP: 1124.11, CNY: 8.3145, COP: 3860.22,
    CZK: 25.766, DKK: 7.9603, EGP: 61.74, EUR: 1.0635, GBP: 0.9091,
    HUF: 386.26, IDR: 21911.28, ILS: 3.6395, INR: 117.47, ISK: 151.34,
    JPY: 195.88, KES: 159.24, KRW: 1740.66, MXN: 20.937, MYR: 5.027,
    NGN: 1673.88, NOK: 11.627, NZD: 2.0905, PEN: 4.148, PHP: 75.573,
    PKR: 341.4, PLN: 4.5814, RON: 5.5811, RUB: 102.85, SAR: 4.6134,
    SEK: 11.717, SGD: 1.5733, THB: 40.787, TRY: 58.92, UAH: 55.025,
    USD: 1.2302, VND: 32054.03, ZAR: 19.907
  };

  var EURO = ["AT","BE","CY","DE","EE","ES","FI","FR","GR","HR","IE","IT",
              "LT","LU","LV","MT","NL","PT","SI","SK"];

  var REGION_CURRENCY = {
    US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY",
    CN: "CNY", HK: "USD", TW: "USD", IN: "INR", BR: "BRL", MX: "MXN",
    SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF",
    RO: "RON", BG: "BGN", TR: "TRY", ZA: "ZAR", KR: "KRW", SG: "SGD",
    TH: "THB", ID: "IDR", MY: "MYR", PH: "PHP", VN: "VND", AE: "AED",
    SA: "SAR", IL: "ILS", UA: "UAH", RU: "RUB", NG: "NGN", KE: "KES",
    EG: "EGP", PK: "PKR", BD: "BDT", CL: "CLP", CO: "COP", AR: "ARS",
    PE: "PEN", IS: "ISK", CH: "CHF", LI: "CHF"
  };
  EURO.forEach(function (cc) { REGION_CURRENCY[cc] = "EUR"; });

  // The visitor's region, from the browser's own locale. There is no
  // geolocation here by design -- a wrong guess would only mislabel a
  // price, so the safe failure is to show nothing extra.
  function region() {
    var tags = [];
    try {
      var resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) tags.push(resolved);
    } catch (e) { /* older browsers */ }
    if (global.navigator) {
      if (navigator.languages) tags = tags.concat(navigator.languages);
      if (navigator.language) tags.push(navigator.language);
    }
    for (var i = 0; i < tags.length; i++) {
      var parts = String(tags[i]).toUpperCase().replace(/_/g, "-").split("-");
      // Start at 1: the first subtag is the language, and several language
      // codes double as region codes. Reading "de-CH" as Germany would
      // quote euros to someone standing in Switzerland.
      for (var j = 1; j < parts.length; j++) {
        if (/^[A-Z]{2}$/.test(parts[j]) && REGION_CURRENCY[parts[j]]) return parts[j];
      }
    }
    return "";
  }

  var cachedCurrency;
  function currency() {
    if (cachedCurrency === undefined) cachedCurrency = REGION_CURRENCY[region()] || "";
    return cachedCurrency;
  }

  // "≈ $1.23" for a CHF amount, or "" when the visitor is Swiss, the
  // region is unknown, or we have no rate. Callers append it to a price
  // that is already shown in CHF, so an empty string just means the
  // CHF figure stands alone.
  function approx(chf) {
    var cur = currency();
    if (!cur || cur === "CHF") return "";
    var rate = RATES[cur];
    if (!rate) return "";
    var value = chf * rate;
    try {
      return "≈ " + new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: cur,
        maximumFractionDigits: value >= 100 ? 0 : 2
      }).format(value);
    } catch (e) {
      return "≈ " + Math.round(value) + " " + cur;
    }
  }

  global.RotaboFx = { approx: approx, currency: currency };
})(window);
