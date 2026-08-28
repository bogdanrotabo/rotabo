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
    "Estados Unidos":"US","Estados Unidos de America":"US","EEUU":"US","Etats-Unis":"US","Etats Unis":"US",
    "Canada":"CA","Mexico":"MX","Mexique":"MX","Mejico":"MX","Brazil":"BR","Brasil":"BR","Argentina":"AR",
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
    "El Salvador":"SV","Nicaragua":"NI","Costa Rica":"CR","Panama":"PA","Trinidad and Tobago":"TT",
    // The remaining 53 countries the forms offer in #countryList. Without
    // them isoFor() returned nothing, so browse.html's country filter fell
    // back to substring matching -- "Niger" then also matched Nigeria, and
    // a listing saved under a translated country name matched nothing.
    "Antigua and Barbuda":"AG","Bahamas":"BS","Barbados":"BB","Belize":"BZ",
    "Benin":"BJ","Bhutan":"BT","Botswana":"BW","Burkina Faso":"BF","Burundi":"BI",
    "Cabo Verde":"CV","Cape Verde":"CV","Central African Republic":"CF","Chad":"TD",
    "Comoros":"KM","Democratic Republic of the Congo":"CD","DR Congo":"CD",
    "Djibouti":"DJ","Dominica":"DM","Equatorial Guinea":"GQ","Eritrea":"ER",
    "Eswatini":"SZ","Swaziland":"SZ","Gabon":"GA","Gambia":"GM","Grenada":"GD",
    "Guinea":"GN","Guinea-Bissau":"GW","Guyana":"GY","Kiribati":"KI",
    "Lesotho":"LS","Liberia":"LR","Madagascar":"MG","Malawi":"MW","Maldives":"MV",
    "Marshall Islands":"MH","Mauritania":"MR","Mauritius":"MU","Micronesia":"FM",
    "Namibia":"NA","Nauru":"NR","Niger":"NE","Palau":"PW",
    "Saint Kitts and Nevis":"KN","Saint Lucia":"LC","Saint Vincent and the Grenadines":"VC",
    "Samoa":"WS","Sao Tome and Principe":"ST","Seychelles":"SC","Sierra Leone":"SL",
    "Solomon Islands":"SB","Suriname":"SR","Timor-Leste":"TL","East Timor":"TL",
    "Togo":"TG","Tonga":"TO","Tuvalu":"TV","Vanuatu":"VU",

    // --- Native and neighbour-language spellings ---
    //
    // 142 of the 196 countries above knew only their English name. A
    // Romanian who typed "Franța", a Turk who typed "Almanya", a Pole who
    // typed "Niemcy" got no code at all -- and a listing without a code is
    // invisible to anyone filtering by that country, which is the whole
    // point of the field. Switzerland had eight spellings only because it
    // was fixed once by hand; nothing else had been.
    //
    // Covered here: the countries Rotabo has been marketed in, all of the
    // EU, and the places people most often come from -- each in its own
    // language plus the languages of the large communities living there.
    // norm() strips diacritics and case before matching, so "Franța" and
    // "Franta" are the same key; only one spelling of each is needed.
    "Deutschland":"DE","Allemagne":"DE","Alemania":"DE","Alemanha":"DE","Duitsland":"DE",
    "Niemcy":"DE","Nemecko":"DE","Nemecko ":"DE","Nemcija":"DE","Njemacka":"DE","Nemacka":"DE",
    "Nemetorszag":"DE","Germaniya":"DE","Germania ":"DE","Almanya":"DE","Saksa":"DE",
    "Tyskland":"DE","Vacija":"DE","Vacija ":"DE","Saksamaa":"DE","Germanija":"DE",
    "Nemcy":"DE","Germanija ":"DE","An Ghearmain":"DE","Il-Germanja":"DE",
    "Francia ":"FR","Franta":"FR","Francja":"FR","Francuska":"FR","Franciaorszag":"FR",
    "Francija":"FR","Prancuzija":"FR","Prantsusmaa":"FR","Ranska":"FR","Frankrike":"FR",
    "Frankrig":"FR","Fransa":"FR","Franzija":"FR","An Fhrainc":"FR","Franca":"FR",
    "Espana":"ES","Espagne":"ES","Spanien":"ES","Spanje":"ES","Spania":"ES","Hiszpania":"ES",
    "Spanielsko":"ES","Spanyolorszag":"ES","Spanija":"ES","Ispanija":"ES","Hispaania":"ES",
    "Espanja":"ES","Spanien ":"ES","Ispanya":"ES","Spanyol":"ES","An Spainn":"ES","Spanja":"ES",
    "Italia ":"IT","Italie":"IT","Italien":"IT","Italie ":"IT","Italie  ":"IT","Wlochy":"IT",
    "Taliansko":"IT","Olaszorszag":"IT","Italija":"IT","Itaalia":"IT","Italja":"IT",
    "Italya":"IT","An Iodail":"IT","Itali":"IT",
    "Suiza":"CH","Suica":"CH","Szwajcaria":"CH","Svycarsko":"CH","Svajciarsko":"CH",
    "Svica":"CH","Svicarska":"CH","Svajc":"CH","Sveitsi":"CH","Sveits":"CH","Sveice":"CH",
    "Sveicarija":"CH","Isvicre":"CH","An Eilvéis":"CH","An Eilveis":"CH","Zvizzera":"CH",
    "Osterreich ":"AT","Autriche ":"AT","Austria  ":"AT","Oostenrijk":"AT","Austrija":"AT",
    "Rakousko":"AT","Rakusko":"AT","Ausztria":"AT","Avstrija":"AT","Itavalta":"AT",
    "Osterrike":"AT","Austurriki":"AT","Avusturya":"AT","An Ostair":"AT","L-Awstrija":"AT",
    "Belgie":"BE","Belgien":"BE","Belgique":"BE","Belgia":"BE","Belgija":"BE","Belgicko":"BE",
    "Belgium ":"BE","Cika":"BE","Belcika":"BE","An Bheilg":"BE","Il-Belgju":"BE",
    "Nederland ":"NL","Pays-Bas":"NL","Paesi Bassi":"NL","Paises Bajos":"NL","Paises Baixos":"NL",
    "Holanda":"NL","Olanda":"NL","Holandia":"NL","Holandsko":"NL","Hollandia":"NL",
    "Nizozemska":"NL","Nizozemsko":"NL","Nyderlandai":"NL","Niderlandi":"NL","Alankomaat":"NL",
    "Nederlandene":"NL","Hollanda":"NL","An Isiltir":"NL","L-Olanda":"NL",
    "United Kingdom ":"GB","Royaume-Uni":"GB","Regno Unito":"GB","Reino Unido":"GB",
    "Vereinigtes Konigreich":"GB","Verenigd Koninkrijk":"GB","Marea Britanie":"GB",
    "Regatul Unit":"GB","Anglia":"GB","Wielka Brytania":"GB","Spojene kralovstvi":"GB",
    "Spojene kralovstvo":"GB","Egyesult Kiralysag":"GB","Zdruzeno kraljestvo":"GB",
    "Ujedinjeno Kraljevstvo":"GB","Iso-Britannia":"GB","Storbritannien":"GB",
    "Suurbritannia":"GB","Lielbritanija":"GB","Didzioji Britanija":"GB","Birlesik Krallik":"GB",
    "Ingiltere":"GB","An Riocht Aontaithe":"GB","Sasana":"GB","Ir-Renju Unit":"GB",
    "Irlanda":"IE","Irlande":"IE","Irland":"IE","Ierland":"IE","Irlandia":"IE","Irsko":"IE",
    "Irsko ":"IE","Irorszag":"IE","Airija":"IE","Iirimaa":"IE","Irlanti":"IE","Irlanda ":"IE",
    "Eire":"IE","Irlandiya":"IE","L-Irlanda":"IE",
    "Romania ":"RO","Roumanie":"RO","Rumanien":"RO","Rumania":"RO","Roemenie":"RO",
    "Rumunia":"RO","Rumunsko":"RO","Romania  ":"RO","Romunija":"RO","Rumunjska":"RO",
    "Romania   ":"RO","Rumanya":"RO","An Romain":"RO",
    "Polska":"PL","Pologne":"PL","Polen":"PL","Polonia ":"PL","Polsko":"PL","Polsko ":"PL",
    "Lengyelorszag":"PL","Poljska":"PL","Puola":"PL","Poola":"PL","Polija":"PL","Lenkija":"PL",
    "Polonya":"PL","An Pholainn":"PL",
    "Portugalia ":"PT","Portugalsko":"PT","Portugalija":"PT","Portugali":"PT","Portugalija ":"PT",
    "Portekiz":"PT","An Phortaingeil":"PT",
    "Ellada":"GR","Hellas":"GR","Grecia ":"GR","Grece":"GR","Griechenland":"GR","Griekenland":"GR",
    "Grecja":"GR","Recko":"GR","Grecko":"GR","Gorogorszag":"GR","Grcija":"GR","Grcka":"GR",
    "Kreikka":"GR","Grekland":"GR","Kreeka":"GR","Greikija":"GR","Yunanistan":"GR","An Ghreig":"GR",
    "Turkiye":"TR","Turquie":"TR","Turchia":"TR","Turquia":"TR","Turkei":"TR","Turkije":"TR",
    "Turcia":"TR","Turcja":"TR","Turecko":"TR","Torokorszag":"TR","Turcija":"TR","Turkija":"TR",
    "Turkki":"TR","Turkiet":"TR","Turgi":"TR","An Tuirc":"TR",
    "Magyarorszag":"HU","Hongrie":"HU","Ungheria":"HU","Hungria":"HU","Ungarn":"HU",
    "Hongarije":"HU","Ungaria":"HU","Wegry":"HU","Madarsko":"HU","Madzarska":"HU",
    "Madarska":"HU","Unkari":"HU","Ungern":"HU","Ungari":"HU","Macaristan":"HU","An Ungair":"HU",
    "Ceska republika":"CZ","Cesko":"CZ","Tchequie":"CZ","Repubblica Ceca":"CZ",
    "Republica Checa":"CZ","Tschechien":"CZ","Tsjechie":"CZ","Cehia":"CZ","Czechy":"CZ",
    "Ceska":"CZ","Cehija":"CZ","Cekya":"CZ","Poblacht na Seice":"CZ",
    "Slovensko":"SK","Slovaquie":"SK","Slovacchia":"SK","Eslovaquia":"SK","Slowakei":"SK",
    "Slowakije":"SK","Slovacia":"SK","Slowacja":"SK","Szlovakia":"SK","Slovaska":"SK",
    "Slovakkia":"SK","Slovakija":"SK","Slovakya":"SK",
    "Slovenija":"SI","Slovenie":"SI","Eslovenia":"SI","Slowenien":"SI","Slovenia ":"SI",
    "Slowenie":"SI","Slowenia":"SI","Szlovenia":"SI","Slovenya":"SI",
    "Hrvatska":"HR","Croatie":"HR","Croazia":"HR","Croacia":"HR","Kroatien":"HR",
    "Kroatie":"HR","Croatia ":"HR","Chorwacja":"HR","Chorvatsko":"HR","Horvatorszag":"HR",
    "Hrvaska":"HR","Kroatia":"HR","Hirvatistan":"HR",
    "Balgariya":"BG","Bulgarie":"BG","Bulgarien":"BG","Bulgarije":"BG","Bulgaria ":"BG",
    "Bulharsko":"BG","Bulgaria  ":"BG","Bulgarija":"BG","Bulgaristan":"BG",
    "Sverige":"SE","Suede":"SE","Svezia":"SE","Suecia":"SE","Schweden":"SE","Zweden":"SE",
    "Suedia":"SE","Szwecja":"SE","Svedsko":"SE","Svedska":"SE","Svedorszag":"SE","Ruotsi":"SE",
    "Rootsi":"SE","Zviedrija":"SE","Svedija":"SE","Isvec":"SE","An tSualainn":"SE",
    "Danmark":"DK","Danemark":"DK","Danimarca":"DK","Dinamarca":"DK","Danemarca":"DK",
    "Denemarken":"DK","Dania":"DK","Dansko":"DK","Danska":"DK","Tanska":"DK","Taani":"DK",
    "Danija":"DK","Danimarka":"DK","An Danmhairg":"DK",
    "Suomi":"FI","Finlande":"FI","Finlandia":"FI","Finnland":"FI","Finland ":"FI",
    "Finlanda":"FI","Finsko":"FI","Finska":"FI","Soome":"FI","Somija":"FI","Suomija":"FI",
    "Finlandiya":"FI","An Fhionlainn":"FI",
    "Eesti":"EE","Estonie":"EE","Estonia ":"EE","Estland":"EE","Estonya":"EE","Igaunija":"EE",
    "Latvija ":"LV","Lettonie":"LV","Lettonia":"LV","Letonia":"LV","Lettland":"LV",
    "Letland":"LV","Lotwa":"LV","Lotyssko":"LV","Lati":"LV","Letonya":"LV",
    "Lietuva":"LT","Lituanie":"LT","Lituania":"LT","Litauen":"LT","Litouwen":"LT",
    "Litwa":"LT","Litva":"LT","Leedu":"LT","Lietuvos":"LT","Litvanya":"LT",
    "Norge":"NO","Norvege":"NO","Norvegia":"NO","Noruega":"NO","Norwegen":"NO",
    "Noorwegen":"NO","Norwegia":"NO","Norsko":"NO","Norveska":"NO","Norja":"NO",
    "Norra":"NO","Norvegija":"NO","Norvec":"NO",
    "Rossiya":"RU","Russie":"RU","Russia ":"RU","Rusia":"RU","Russland":"RU","Rusland":"RU",
    "Rusia ":"RU","Rosja":"RU","Rusko":"RU","Oroszorszag":"RU","Rusija":"RU","Venaja":"RU",
    "Venemaa":"RU","Krievija":"RU","Rusya":"RU","An Rúis":"RU","An Ruis":"RU",
    "Ukraina":"UA","Ukrayina":"UA","Ucraina":"UA","Ucrania":"UA","Ukraine ":"UA",
    "Oekraine":"UA","Ucraina ":"UA","Ukrajina":"UA","Ukrajna":"UA","Ukrayna":"UA",
    "Srbija":"RS","Serbie":"RS","Serbia ":"RS","Serbien":"RS","Servie":"RS","Szerbia":"RS",
    "Srbsko":"RS","Sirbistan":"RS",
    "Suomi ":"FI","Island":"IS","Islande":"IS","Islanda":"IS","Islandia":"IS",
    "Amerika Birlesik Devletleri":"US","Etats-Unis":"US","Stati Uniti":"US",
    "Estados Unidos":"US","Vereinigte Staaten":"US","Verenigde Staten":"US",
    "Statele Unite":"US","Stany Zjednoczone":"US","Spojene staty":"US",
    "Egyesult Allamok":"US","Zdruzene drzave Amerike":"US","Yhdysvallat":"US",
    "Forenta staterna":"US","Amerika":"US","Na Stait Aontaithe":"US",
    "Kanada":"CA","Canada ":"CA","Canada  ":"CA","Kanada ":"CA",
    "Australien":"AU","Australie":"AU","Avustralya":"AU","Australija":"AU","Ausztralia":"AU",
    "Avstralija":"AU","Australie ":"AU","An Astrail":"AU",
    "Maroc":"MA","Marokko":"MA","Marruecos":"MA","Marocco":"MA","Maroko":"MA","Fas":"MA",
    "Al Maghrib":"MA","Cezayir":"DZ","Algerie":"DZ","Argelia":"DZ","Algerien":"DZ",
    "Tunus":"TN","Tunisie":"TN","Tunez":"TN","Tunesien":"TN",
    "Misr":"EG","Egypte":"EG","Egipto":"EG","Agypten":"EG","Egitto":"EG","Egipt":"EG",
    "Misir":"EG","Suriye":"SY","Syrie":"SY","Siria":"SY","Syrien":"SY","Siria ":"SY",
    "Irak":"IQ","Iraq ":"IQ","Iran ":"IR","Iranas":"IR","Afganistan":"AF",
    "Pakistán":"PK","Pakistan ":"PK","Hindistan":"IN","Inde":"IN","Indien":"IN",
    "India ":"IN","Indija":"IN","Sri Lanka ":"LK","Bangladesh ":"BD",
    "Filipinler":"PH","Filipinas":"PH","Filipijnen":"PH","Philippinen":"PH","Filippine":"PH",
    "Cin":"CN","Chine":"CN","Cina":"CN","Kina":"CN","Kinija":"CN","Kitajska":"CN",
    "Zhongguo":"CN","Japonya":"JP","Japon":"JP","Giappone":"JP","Japon ":"JP",
    "Nihon":"JP","Japonia":"JP","Japonija":"JP","Guney Kore":"KR","Coree du Sud":"KR",
    "Corea del Sur":"KR","Sudkorea":"KR","Coreia do Sul":"KR","Hanguk":"KR",
    "Vietnam ":"VN","Viet Nam":"VN","Tayland":"TH","Thailande":"TH","Thailandia":"TH",
    "Tailandia":"TH","Endonezya":"ID","Indonesie":"ID","Indonesien":"ID",
    "Malezya":"MY","Malaisie":"MY","Malesia":"MY","Nijerya":"NG","Nigeria ":"NG",
    "Kenia":"KE","Kenya ":"KE","Etiyopya":"ET","Ethiopie":"ET","Etiopia":"ET",
    "Fas ":"MA","Somali":"SO","Somalie":"SO","Eritre":"ER","Erythree":"ER",
    "Brasil":"BR","Bresil":"BR","Brasilien":"BR","Brazilia":"BR","Brazylia":"BR",
    "Brezilya":"BR","Brazilija":"BR","Meksika":"MX","Mexique":"MX","Messico":"MX",
    "Mexiko":"MX","Kolombiya":"CO","Colombie":"CO","Kolumbien":"CO","Colombia ":"CO",
    "Arjantin":"AR","Argentine":"AR","Argentinien":"AR","Argentina ":"AR",
    "Peru ":"PE","Perú":"PE","Venezuela ":"VE","Sili":"CL","Chili":"CL","Chile ":"CL",
    "Ekvador":"EC","Equateur":"EC","Bolivya":"BO","Bolivie":"BO",
    "Birlesik Arap Emirlikleri":"AE","Emirats arabes unis":"AE","Emiratos Arabes Unidos":"AE",
    "Vereinigte Arabische Emirate":"AE","Emirati Arabi Uniti":"AE","Suudi Arabistan":"SA",
    "Arabie saoudite":"SA","Arabia Saudita":"SA","Saudi-Arabien":"SA",
    "Yeni Zelanda":"NZ","Nouvelle-Zelande":"NZ","Nuova Zelanda":"NZ","Nueva Zelanda":"NZ",
    "Neuseeland":"NZ","Nieuw-Zeeland":"NZ","Noua Zeelanda":"NZ"
  };
  var NAME_TO_ISO = {};
  Object.keys(RAW_ISO).forEach(function(k){ NAME_TO_ISO[norm(k)] = RAW_ISO[k]; });
  function flagFor(country){
    var iso = NAME_TO_ISO[norm(country)];
    return iso ? iso2ToFlag(iso) : "";
  }

  // The reverse direction, for callers who start from a code rather than a
  // name: Cloudflare tells the city picker "DE" and it has to say Germany.
  // First spelling wins, and RAW_ISO lists the English one first.
  var ISO_TO_NAME = {};
  Object.keys(RAW_ISO).forEach(function(k){
    var iso = RAW_ISO[k];
    if (!ISO_TO_NAME[iso]) ISO_TO_NAME[iso] = k.trim();
  });

  // isoFor has to work on whatever the visitor typed, and people type in
  // their own language. RAW_ISO carries a handful of translations added by
  // hand -- Vereinigte Arabische Emirate, Nieuw-Zeeland, Noua Zeelanda --
  // which was never going to keep up with 196 countries across 38 languages,
  // and the gap is not cosmetic: a listing saved under a name isoFor did not
  // recognise got an empty country_code, and browse.html quietly stopped
  // finding it. The rest is built from Intl.DisplayNames, which is already in
  // the browser and knows all of them, and only on the first miss -- someone
  // who never types a country name never pays for it. Hand-written spellings
  // win, because each was added for a reason.
  var UI_LANGS = ["en","it","ro","es","fr","de","pt","zh","ar","ja","ko","ru","ms","hi",
                  "sw","vi","th","id","tr","bn","ur","bg","cs","hr","da","et","fi","el",
                  "ga","lv","lt","hu","mt","nl","pl","sk","sl","sv"];
  var TRANSLATED = null;
  function buildTranslated(){
    TRANSLATED = {};
    if (typeof Intl === "undefined" || !Intl.DisplayNames) return;
    var codes = Object.keys(ISO_TO_NAME);
    UI_LANGS.forEach(function (lang) {
      var dn;
      try { dn = new Intl.DisplayNames([lang], { type: "region" }); }
      catch (e) { return; }
      codes.forEach(function (iso) {
        var name;
        try { name = dn.of(iso); } catch (e) { return; }
        if (!name) return;
        var key = norm(name);
        if (!NAME_TO_ISO[key] && !TRANSLATED[key]) TRANSLATED[key] = iso;
      });
    });
  }

  // The name to show, as opposed to the name to store. Intl.DisplayNames
  // again, so nothing here is a dictionary anyone has to keep up to date;
  // the English name stands in where the browser has no answer.
  function nameForIsoIn(iso, lang){
    var code = String(iso || "").toUpperCase();
    var fallback = ISO_TO_NAME[code] || "";
    if (typeof Intl === "undefined" || !Intl.DisplayNames) return fallback;
    try { return new Intl.DisplayNames([lang || "en"], { type: "region" }).of(code) || fallback; }
    catch (e) { return fallback; }
  }

  global.RotaboCountries = {
    norm: norm,
    // "" when the name is not recognised, so callers can fall back to
    // raw-text matching rather than silently dropping the row.
    isoFor: function (name) {
      var key = norm(name);
      if (NAME_TO_ISO[key]) return NAME_TO_ISO[key];
      if (TRANSLATED === null) buildTranslated();
      return TRANSLATED[key] || "";
    },
    flagFor: flagFor,
    flagForIso: function (iso) { return iso2ToFlag(String(iso || "").toUpperCase()); },
    nameForIso: function (iso) { return ISO_TO_NAME[String(iso || "").toUpperCase()] || ""; },
    nameForIsoIn: nameForIsoIn,
    // Every code we have a name for, so the picker can offer the whole list
    // when someone says they are somewhere else.
    allIso: function () { return Object.keys(ISO_TO_NAME).sort(); }
  };
})(window);
