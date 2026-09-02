/*
 * The Rotabo poster as HTML, laid out in points, so Chromium can print it.
 *
 * The measurements are not invented: they were read out of the Romanian A4
 * the poster was first drawn as (scripts/afise/sablon.json), which is why
 * they carry decimals. Anything that moves here moves on 38 posters at once.
 *
 * Chromium rather than a PDF library because the poster has to come out in
 * Devanagari, Bengali, Arabic, Thai, Chinese, Japanese and Korean as well as
 * Latin. Those scripts need contextual shaping -- letters changing form by
 * position, marks stacking, syllables reordering -- and a library that places
 * one glyph after another produces text a reader of that language sees as
 * broken. Chromium shapes through HarfBuzz, the same engine the browser uses.
 */

// #7c349a is the fill the shapes were drawn with, #7c359b the colour the
// text was set in. One point apart in the file, so both are kept.
export const C = {
  fundal: "#f6ebf9", auriu: "#fdd321", violet: "#7c349a", violetText: "#7c359b",
  negru: "#1e1923", corp: "#4b4352", alb: "#ffffff",
};

export const A4 = { w: 595.28, h: 841.89 };

/* DejaVu Sans is what the poster was drawn in -- the seven the designer
   produced embed DejaVuSans and DejaVuSans-Bold -- so the generated ones use
   it too and a Polish poster next to the German one is the same poster.

   DejaVu covers Latin, Cyrillic and Greek and nothing else these languages
   need, so the scripts it lacks name their own face. Chromium would fall back
   on its own, but unguided fallback picks Unifont for Han -- a bitmap face
   that prints as a grid of blocks at poster size. DejaVu does carry Arabic
   glyphs, which is worse than not carrying them: they are unshaped and a
   reader sees disconnected letters, so ar and ur name Noto ahead of it. */
export const FONT = {
  zh: "'Noto Sans CJK SC'", ja: "'Noto Sans CJK JP'", ko: "'Noto Sans CJK KR'",
  hi: "'Noto Sans Devanagari'", bn: "'Noto Sans Bengali'", th: "'Noto Sans Thai'",
  ar: "'Noto Sans Arabic'", ur: "'Noto Sans Arabic'",
};
export const RTL = ["ar", "ur"];

export const LATIN = "'DejaVu Sans', 'Noto Sans', sans-serif";
export const fontFor = (lang) =>
  `${FONT[lang] ? FONT[lang] + ", " : ""}${LATIN}`;

/* Boxes rather than baselines. The extraction gives a baseline per line; a
   baseline cannot wrap, and every one of these strings is a different length
   in 38 languages. Each box is anchored where its first baseline was, less
   the ascent, and the text inside it wraps and centres on its own. */
const BOX = {
  claim:    { x: 442.59, y: 40.0,  w: 130,   size: 11,   bold: 1, color: C.violetText, align: "left" },
  cap1:     { x: 34,     y: 126.0, w: 527.28, size: 23,  bold: 1, color: C.negru,      align: "left", lh: 1.30 },
  cap2:     { x: 34,     y: 157.0, w: 527.28, size: 28,  bold: 1, color: C.violetText, align: "left", lh: 1.15 },
  corp:     { x: 34,     y: 216.0, w: 527.28, size: 10,  bold: 0, color: C.corp,       align: "left", lh: 1.40 },

  nevoieK:  { x: 49,     y: 286.0, w: 228,   size: 12,   bold: 1, color: C.alb,        align: "left" },
  oferK:    { x: 318.64, y: 286.0, w: 228,   size: 12,   bold: 1, color: C.negru,      align: "left" },
  nevoieT:  { x: 49,     y: 315.0, w: 228,   size: 13,   bold: 1, color: C.alb,        align: "left" },
  oferT:    { x: 318.64, y: 315.0, w: 228,   size: 13,   bold: 1, color: C.negru,      align: "left" },
  nevoieL:  { x: 49,     y: 341.5, w: 228,   size: 8.4,  bold: 0, color: C.alb,        align: "left", lh: 1.43 },
  oferL:    { x: 318.64, y: 341.5, w: 228,   size: 8.4,  bold: 0, color: C.negru,      align: "left", lh: 1.43 },

  punte1:   { x: 34,     y: 433.0, w: 527.28, size: 14,  bold: 1, color: C.negru,      align: "center" },
  punte2:   { x: 34,     y: 456.0, w: 527.28, size: 18,  bold: 1, color: C.violetText, align: "center" },

  cumTitlu: { x: 34,     y: 507.0, w: 527.28, size: 11,  bold: 1, color: C.negru,      align: "left" },
  pas1:     { x: 41,     y: 534.0, w: 520,   size: 9,    bold: 1, color: C.negru,      align: "left" },
  pas2:     { x: 41,     y: 557.0, w: 520,   size: 9,    bold: 1, color: C.negru,      align: "left" },
  pas3:     { x: 41,     y: 580.0, w: 520,   size: 9,    bold: 1, color: C.negru,      align: "left" },

  badge1:   { x: 40,     y: 631.5, w: 163,   size: 8.7,  bold: 1, color: C.violetText, align: "center" },
  badge2:   { x: 216,    y: 631.5, w: 163,   size: 8.7,  bold: 1, color: C.negru,      align: "center" },
  badge3:   { x: 392,    y: 631.5, w: 163,   size: 8.7,  bold: 1, color: C.violetText, align: "center" },

  azi:      { x: 34,     y: 695.0, w: 527.28, size: 10,  bold: 1, color: C.negru,      align: "center" },
  maine:    { x: 34,     y: 712.0, w: 527.28, size: 9.6, bold: 1, color: C.negru,      align: "center", lh: 1.30 },

  adresa:   { x: 34,     y: 776.0, w: 527.28, size: 24,  bold: 1, color: C.alb,        align: "center" },
  browser:  { x: 34,     y: 802.5, w: 527.28, size: 7.5, bold: 0, color: C.alb,        align: "center" },
};

const FORME = [
  { x: 0,      y: 0,   w: 595.28, h: 841.89, fill: C.fundal },
  { x: 0,      y: 0,   w: 595.28, h: 4,      fill: C.auriu  },
  { x: 34,     y: 264, w: 257.64, h: 150,    fill: C.violet },
  { x: 303.64, y: 264, w: 257.64, h: 150,    fill: C.auriu  },
  { x: 34,     y: 611, w: 527.28, h: 55,     fill: C.alb    },
  { x: 34,     y: 757, w: 527.28, h: 62,     fill: C.violet },
];
const LOGO = { x: 34, y: -1.98, w: 250, h: 73.98 };

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* The step number is set apart from its line the way it is on the poster:
   a fixed indent, so three lines of different lengths still line up. */
function pas(n, text) {
  return `<span style="display:inline-block;width:16pt">${n}</span>${esc(text)}`;
}

export function paginaHTML(lang, T, logoDataUri) {
  const rtl = RTL.includes(lang);
  const forme = FORME.map(f =>
    `<div style="position:absolute;left:${f.x}pt;top:${f.y}pt;` +
    `width:${f.w}pt;height:${f.h}pt;background:${f.fill}"></div>`).join("\n");

  const continut = {
    claim: "Need Me? Find Me!",           // untranslated on every poster
    cap1: T.cap1, cap2: T.cap2, corp: T.corp,
    nevoieK: T.nevoieK, oferK: T.oferK,
    nevoieT: T.nevoieT, oferT: T.oferT,
    nevoieL: T.nevoieL, oferL: T.oferL,
    punte1: T.punte1, punte2: T.punte2,
    cumTitlu: T.cumTitlu,
    pas1: pas(1, T.pas1), pas2: pas(2, T.pas2), pas3: pas(3, T.pas3),
    badge1: T.badge1, badge2: T.badge2, badge3: T.badge3,
    azi: T.azi, maine: T.maine,
    adresa: "rotabo.app",                 // untranslated on every poster
    browser: T.browser,
  };

  const texte = Object.entries(BOX).map(([k, b]) => {
    const val = continut[k];
    if (val === undefined) throw new Error(`${lang}: no text for box "${k}"`);
    const brut = k.startsWith("pas");     // already carries its own markup
    /* The claim and the address stay in Latin whatever the page language,
       so they keep the Latin face rather than inheriting a CJK one whose
       Latin glyphs are full-width. */
    const fam = (k === "claim" || k === "adresa") ? LATIN : fontFor(lang);
    /* dir on the box, not the page: an Arabic line reads right-to-left
       inside a layout whose columns keep their places. */
    const dir = rtl && k !== "claim" && k !== "adresa" ? ' dir="rtl"' : "";
    const ta = b.align === "center" ? "center" : (rtl && dir ? "right" : "left");
    return `<div${dir} style="position:absolute;left:${b.x}pt;top:${b.y}pt;` +
      `width:${b.w}pt;font-family:${fam};font-size:${b.size}pt;` +
      `font-weight:${b.bold ? 700 : 400};color:${b.color};text-align:${ta};` +
      `line-height:${b.lh || 1.25}">${brut ? val : esc(val)}</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  html, body { margin:0; padding:0; }
  body { width:${A4.w}pt; height:${A4.h}pt; position:relative; overflow:hidden;
         -webkit-print-color-adjust: exact; print-color-adjust: exact;
         text-rendering: geometricPrecision; }
  div { box-sizing: border-box; }
</style></head><body>
${forme}
<img src="${logoDataUri}" style="position:absolute;left:${LOGO.x}pt;top:${LOGO.y}pt;width:${LOGO.w}pt;height:${LOGO.h}pt">
${texte}
</body></html>`;
}
