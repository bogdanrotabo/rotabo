/*
 * Which language the site opens in.
 *
 * Until 2026-09-01 the answer was: whatever the visitor had picked before,
 * and otherwise English. Always English. Thirty-seven translated
 * dictionaries, 976 keys each, and a first-time visitor anywhere in the
 * world was served the English one -- reachable only by noticing the flag
 * in the header and picking from a list of thirty-eight. Someone arriving
 * in Romanian, from a Romanian ad, landed on an English page.
 *
 * The browser has been saying which languages its owner reads since the
 * 1990s and fx.js already reads it, to decide which currency to quote in.
 * The site simply never asked it about language.
 *
 * Order of authority:
 *   1. A saved choice. The visitor said so; nothing overrides that.
 *   2. navigator.languages, in the visitor's own order of preference.
 *   3. English.
 *
 * A detected language is deliberately NOT saved. Only picking from the menu
 * writes to storage, so a visitor who changes their browser language is
 * followed rather than pinned to whatever they were served the first time.
 */
(function (global) {
  var STORAGE_KEY = "rotabo_lang";

  // Every locale that exists under /locales. Kept in step with that
  // directory by scripts/check-locales.mjs, which fails if they disagree --
  // a list like this drifts silently otherwise, and the failure is invisible
  // (a visitor is simply served English and nobody hears about it).
  var CODES = [
    "en","it","ro","es","fr","de","pt","zh","ar","ja","ko","ru","ms","hi","sw",
    "vi","th","id","tr","bn","ur","bg","cs","hr","da","et","fi","el","ga","lv",
    "lt","hu","mt","nl","pl","sk","sl","sv"
  ];

  function saved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  // Region subtags are dropped before matching: the site carries one Chinese
  // and one Portuguese, so pt-BR has to find "pt" and zh-TW has to find "zh"
  // or they find nothing at all.
  function fromBrowser(supported) {
    var tags = [];
    try {
      if (global.navigator && navigator.languages) tags = tags.concat(navigator.languages);
      if (global.navigator && navigator.language) tags.push(navigator.language);
    } catch (e) { /* no navigator: fall through to English */ }
    for (var i = 0; i < tags.length; i++) {
      var base = String(tags[i] || "").toLowerCase().split("-")[0];
      if (supported.indexOf(base) !== -1) return base;
    }
    return null;
  }

  global.RotaboLang = {
    CODES: CODES,
    STORAGE_KEY: STORAGE_KEY,
    // supported: optional list of codes the calling page actually offers.
    // index.html passes its own, so the page that owns the menu stays the
    // authority on what is in it.
    preferred: function (supported) {
      var list = (supported && supported.length) ? supported : CODES;
      var pick = saved();
      if (pick && list.indexOf(pick) !== -1) return pick;
      return fromBrowser(list) || "en";
    }
  };
})(window);
