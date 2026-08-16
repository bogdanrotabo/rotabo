/*
 * Shared country mapping: free-text country name (English or native
 * spelling) -> ISO-3166 alpha-2 -> flag emoji.
 *
 * This lived inline in index.html while browse.html had no copy at all,
 * which is why browse's country filter compared raw strings: a listing
 * saved as "Elvetia" or "Svizzera" was invisible to anyone filtering for
 * "Switzerland". One map, loaded by both pages, is what makes matching by
 * code possible.
 */
(function (global) {
  // --- country name -> flag emoji (English + key native/EU spellings) ---
  function iso2ToFlag(cc){
    if (!cc || cc.length !== 2) return "";
    var A = 0x1F1E6, base = 65;
    return String.fromCodePoint(A + cc.charCodeAt(0) - base, A + cc.charCodeAt(1) - base);
  }
  function norm(s){
    return (s == null ? "" : String(s)).trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[.'’]/g, "").replace(/\s+/g, " ");
  }
  var RAW_ISO = {
    "Albania":"AL","Shqiperia":"AL","Shqiperi":"AL","Andorra":"AD",
    "Austria":"AT","Osterreich":"AT","Autriche":"AT","Austria ":"AT",
    "Belarus":"BY","Belgium":"BE","Belgie":"BE","Belgique":"BE","Belgien":"BE",
    "Bosnia and Herzegovina":"BA","Bosnia":"BA","Bulgaria":"BG",
    "Croatia":"HR","Hrvatska":"HR","Cyprus":"CY",
    "Czechia":"CZ","Czech Republic":"CZ","Cesko":"CZ","Ceska republika":"CZ",
    "Denmark":"DK","Danmark":"DK","Estonia":"EE","Eesti":"EE",
    "Finland":"FI","Suomi":"FI","France":"FR","Francia":"FR","Frankreich":"FR","Frankrijk":"FR",
    "Germany":"DE","Deutschland":"DE","Germania":"DE","Allemagne":"DE","Alemania":"DE","Duitsland":"DE",
    "Greece":"GR","Ellada":"GR","Hellas":"GR","Grecia":"GR","Griechenland":"GR",
    "Hungary":"HU","Magyarorszag":"HU","Iceland":"IS","Island":"IS",
    "Ireland":"IE","Eire":"IE","Italy":"IT","Italia":"IT","Italie":"IT","Italien":"IT","Italie ":"IT",
    "Kosovo":"XK","Latvia":"LV","Latvija":"LV","Liechtenstein":"LI",
    "Lithuania":"LT","Lietuva":"LT","Luxembourg":"LU","Luxemburg":"LU","Malta":"MT",
    "Moldova":"MD","Republica Moldova":"MD","Monaco":"MC","Montenegro":"ME","Crna Gora":"ME",
    "Netherlands":"NL","Nederland":"NL","Holland":"NL","Paesi Bassi":"NL","Pays-Bas":"NL","Niederlande":"NL",
    "North Macedonia":"MK","Macedonia":"MK","Norway":"NO","Norge":"NO",
    "Poland":"PL","Polska":"PL","Polen":"PL","Pologne":"PL","Portugal":"PT",
    "Romania":"RO","Rumanien":"RO","Roumanie":"RO","Rumania":"RO","Rumunia":"RO",
    "Russia":"RU","Russian Federation":"RU","Rossiya":"RU",
    "San Marino":"SM","Serbia":"RS","Srbija":"RS","Slovakia":"SK","Slovensko":"SK",
    "Slovenia":"SI","Slovenija":"SI","Spain":"ES","Espana":"ES","Espagne":"ES","Spanien":"ES","Spagna":"ES",
    "Sweden":"SE","Sverige":"SE",
    "Switzerland":"CH","Svizzera":"CH","Suisse":"CH","Schweiz":"CH","Svizra":"CH","Elvetia":"CH","Confoederatio Helvetica":"CH","CH":"CH",
    "Ukraine":"UA","Ukraina":"UA","United Kingdom":"GB","UK":"GB","Great Britain":"GB","England":"GB","Britain":"GB",
    "Vatican City":"VA","Vatican":"VA",
    "United States":"US","USA":"US","United States of America":"US","America":"US",
    "Canada":"CA","Mexico":"MX","Brazil":"BR","Brasil":"BR","Argentina":"AR",
    "Chile":"CL","Colombia":"CO","Peru":"PE","Venezuela":"VE","Ecuador":"EC","Bolivia":"BO","Paraguay":"PY","Uruguay":"UY",
    "China":"CN","Japan":"JP","Nippon":"JP","South Korea":"KR","Korea":"KR","Republic of Korea":"KR","North Korea":"KP",
    "India":"IN","Bharat":"IN","Pakistan":"PK","Bangladesh":"BD","Sri Lanka":"LK","Nepal":"NP",
    "Indonesia":"ID","Malaysia":"MY","Singapore":"SG","Thailand":"TH","Vietnam":"VN","Viet Nam":"VN",
    "Philippines":"PH","Cambodia":"KH","Laos":"LA","Myanmar":"MM","Burma":"MM","Brunei":"BN",
    "Turkey":"TR","Turkiye":"TR","Israel":"IL","Palestine":"PS","Lebanon":"LB","Syria":"SY","Jordan":"JO",
    "Iraq":"IQ","Iran":"IR","Saudi Arabia":"SA","United Arab Emirates":"AE","UAE":"AE","Qatar":"QA","Kuwait":"KW",
    "Bahrain":"BH","Oman":"OM","Yemen":"YE",
    "Egypt":"EG","Morocco":"MA","Maroc":"MA","Algeria":"DZ","Algerie":"DZ","Tunisia":"TN","Tunisie":"TN",
    "Libya":"LY","Sudan":"SD","South Sudan":"SS",
    "Nigeria":"NG","Ghana":"GH","Kenya":"KE","Ethiopia":"ET","Tanzania":"TZ","Uganda":"UG","South Africa":"ZA",
    "Zimbabwe":"ZW","Zambia":"ZM","Angola":"AO","Mozambique":"MZ","Cameroon":"CM","Ivory Coast":"CI","Cote dIvoire":"CI",
    "Senegal":"SN","Mali":"ML","Somalia":"SO","Rwanda":"RW","DR Congo":"CD","Congo":"CG",
    "Australia":"AU","New Zealand":"NZ","Fiji":"FJ","Papua New Guinea":"PG",
    "Kazakhstan":"KZ","Uzbekistan":"UZ","Turkmenistan":"TM","Kyrgyzstan":"KG","Tajikistan":"TJ",
    "Azerbaijan":"AZ","Armenia":"AM","Georgia":"GE","Afghanistan":"AF","Mongolia":"MN",
    "Cuba":"CU","Dominican Republic":"DO","Haiti":"HT","Jamaica":"JM","Guatemala":"GT","Honduras":"HN",
    "El Salvador":"SV","Nicaragua":"NI","Costa Rica":"CR","Panama":"PA","Trinidad and Tobago":"TT"
  };
  var NAME_TO_ISO = {};
  Object.keys(RAW_ISO).forEach(function(k){ NAME_TO_ISO[norm(k)] = RAW_ISO[k]; });
  function flagFor(country){
    var iso = NAME_TO_ISO[norm(country)];
    return iso ? iso2ToFlag(iso) : "";
  }

  global.RotaboCountries = {
    norm: norm,
    // "" when the name is not recognised, so callers can fall back to
    // raw-text matching rather than silently dropping the row.
    isoFor: function (name) { return NAME_TO_ISO[norm(name)] || ""; },
    flagFor: flagFor
  };
})(window);
