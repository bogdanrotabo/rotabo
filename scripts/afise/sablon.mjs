/*
 * The Rotabo poster as HTML, laid out in points, so Chromium can print it.
 *
 * The measurements are not invented: they were read out of the Romanian A4
 * the poster was first drawn as (sablon.json), which is why they carry
 * decimals. Anything that moves here moves on every poster at once.
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
   glyphs, which is worse than not carrying them: unhinted and unshaped, so ar
   and ur name Noto ahead of it. */
export const FONT = {
  zh: "'Noto Sans CJK SC'", ja: "'Noto Sans CJK JP'", ko: "'Noto Sans CJK KR'",
  hi: "'Noto Sans Devanagari'", bn: "'Noto Sans Bengali'", th: "'Noto Sans Thai'",
  ar: "'Noto Sans Arabic'", ur: "'Noto Sans Arabic'",
};
export const RTL = ["ar", "ur"];
export const LATIN = "'DejaVu Sans', 'Noto Sans', sans-serif";
export const fontFor = (lang) => `${FONT[lang] ? FONT[lang] + ", " : ""}${LATIN}`;

/* Each block is anchored on the baseline the designer set it on -- `bl` -- and
   given the vertical room it may use before it runs into what is under it.
   Baselines rather than box tops because where a box top falls depends on the
   font's own ascent, and the poster is set in seven different faces: the same
   top puts Devanagari and Latin on different lines. The browser works out the
   real baseline and the block is moved onto the designer's, so every language
   lines up with the Romanian original.

   Read out of Rotabo-afis-RO-A4.pdf itself, from each line's text origin. Not
   from sablon.json, whose y is the bottom of the line's bounding box -- a
   descent below the baseline, which put every block that much low and the
   28pt line 6.7pt low.

   `h` is what the block may grow to. A sentence that is three words in
   Romanian can be twice that in German, and a block that outgrows its room
   would print over the next one; the render shrinks the type instead, and
   says so when it has to. */
const BOX = {
  claim:    { x: 361.28, w: 200,    bl:  47.00, size: 11,  bold: 1, color: C.violetText, align: "right", h: 18 },
  cap1:     { x:  34,    w: 527.28, bl: 140.00,  size: 23,  bold: 1, color: C.negru,      align: "left",  h: 31 },
  cap2:     { x:  34,    w: 527.28, bl: 171.00,  size: 28,  bold: 1, color: C.violetText, align: "left",  h: 40 },
  corp:     { x:  34,    w: 527.28, bl: 222.00,  size: 10,  bold: 0, color: C.corp,       align: "left",  h: 44, lh: 1.40 },

  nevoieK:  { x:  49,    w: 227.64, bl: 292.00,  size: 12,  bold: 1, color: C.alb,        align: "left",  h: 20 },
  oferK:    { x: 318.64, w: 227.64, bl: 292.00,  size: 12,  bold: 1, color: C.negru,      align: "left",  h: 20 },
  nevoieT:  { x:  49,    w: 227.64, bl: 322.00,  size: 13,  bold: 1, color: C.alb,        align: "left",  h: 24 },
  oferT:    { x: 318.64, w: 227.64, bl: 322.00,  size: 13,  bold: 1, color: C.negru,      align: "left",  h: 24 },
  nevoieL:  { x:  49,    w: 227.64, bl: 347.00,  size: 8.4, bold: 0, color: C.alb,        align: "left",  h: 62, lh: 1.4286 },
  oferL:    { x: 318.64, w: 227.64, bl: 347.00,  size: 8.4, bold: 0, color: C.negru,      align: "left",  h: 62, lh: 1.4286 },

  punte1:   { x:  34,    w: 527.28, bl: 442.00,  size: 14,  bold: 1, color: C.negru,      align: "center", h: 23 },
  punte2:   { x:  34,    w: 527.28, bl: 467.00,  size: 18,  bold: 1, color: C.violetText, align: "center", h: 40 },

  cumTitlu: { x:  34,    w: 527.28, bl: 514.00,  size: 11,  bold: 1, color: C.negru,      align: "left",  h: 21 },
  pas1:     { x:  41,    w: 520,    bl: 539.00,  size: 9,   bold: 1, color: C.negru,      align: "left",  h: 21 },
  pas2:     { x:  41,    w: 520,    bl: 562.00,  size: 9,   bold: 1, color: C.negru,      align: "left",  h: 21 },
  pas3:     { x:  41,    w: 520,    bl: 585.00,  size: 9,   bold: 1, color: C.negru,      align: "left",  h: 21 },

  // Three equal thirds of the white strip: 527.28 / 3 = 175.76.
  badge1:   { x:  34,    w: 175.76, bl: 637.00,  size: 8.7, bold: 1, color: C.violetText, align: "center", h: 30 },
  badge2:   { x: 209.76, w: 175.76, bl: 637.00,  size: 8.7, bold: 1, color: C.negru,      align: "center", h: 30 },
  badge3:   { x: 385.52, w: 175.76, bl: 637.00,  size: 8.7, bold: 1, color: C.violetText, align: "center", h: 30 },

  azi:      { x:  34,    w: 527.28, bl: 702.00,  size: 10,  bold: 1, color: C.negru,      align: "center", h: 16 },
  maine:    { x:  34,    w: 527.28, bl: 719.00,  size: 9.6, bold: 1, color: C.negru,      align: "center", h: 32, lh: 1.30 },

  adresa:   { x:  34,    w: 527.28, bl: 791.00,  size: 24,  bold: 1, color: C.alb,        align: "center", h: 30 },
  browser:  { x:  34,    w: 527.28, bl: 807.00,  size: 7.5, bold: 0, color: C.alb,        align: "center", h: 13 },
};
export const CUTII = BOX;

/* The two full-bleed shapes run past the page on every side. Chromium will
   not cut a sheet to the point: asked for A4 it returns a page 0.6pt wider,
   and a background stopping at 595.28 leaves an unpainted hairline down the
   right edge of every printed poster. Bleed costs nothing and the press
   trims it, which is what bleed is for. */
const FORME = [
  { x: -20,    y: -20, w: 640,    h: 900,    fill: C.fundal },
  { x: -20,    y: 0,   w: 640,    h: 4,      fill: C.auriu  },
  // Radii fitted off the corners of Rotabo-afis-RO-A4.pdf at 600dpi: the
  // extraction records fills and rectangles and drops the rounding, and a
  // poster with square corners next to one with round ones is a different
  // poster.
  { x: 34,     y: 264, w: 257.64, h: 150,    fill: C.violet, r: 10.2 },
  { x: 303.64, y: 264, w: 257.64, h: 150,    fill: C.auriu,  r: 10.2 },
  { x: 34,     y: 611, w: 527.28, h: 55,     fill: C.alb,    r: 9.1  },
  { x: 34,     y: 757, w: 527.28, h: 62,     fill: C.violet, r: 10.3 },
];
const LOGO = { x: 34, y: -1.98, w: 250, h: 73.98 };

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* The step number and its line, spaced as on the original. Non-breaking so
   the gap survives HTML's collapsing of runs of spaces. */
const pas = (n, text) => `${n}&#160;&#160;&#160;${esc(text)}`;

export function paginaHTML(lang, T, logoDataUri) {
  const rtl = RTL.includes(lang);
  const forme = FORME.map(f =>
    `<div style="position:absolute;left:${f.x}pt;top:${f.y}pt;` +
    `width:${f.w}pt;height:${f.h}pt;background:${f.fill}` +
    `${f.r ? `;border-radius:${f.r}pt` : ""}"></div>`).join("\n");

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
    /* The claim and the address stay in Latin whatever the page language, so
       they keep the Latin face rather than inheriting a CJK one whose Latin
       glyphs are full-width. */
    const latin = k === "claim" || k === "adresa";
    const fam = latin ? LATIN : fontFor(lang);
    /* dir on the block, not the page: an Arabic line reads right-to-left
       inside a layout whose columns keep their places. */
    const dir = rtl && !latin ? ' dir="rtl"' : "";
    const ta = b.align === "center" ? "center"
             : b.align === "right"  ? "right"
             : (dir ? "right" : "left");
    /* An inline-block of zero height sits with its bottom margin edge on the
       line's baseline, so its measured top IS the baseline -- the one thing
       the browser will not tell you directly, and the thing the whole layout
       is anchored on. */
    return `<div class="t" data-k="${k}" data-bl="${b.bl}" data-h="${b.h}"` +
      ` data-size="${b.size}"${dir} style="position:absolute;left:${b.x}pt;` +
      `top:${b.bl}pt;width:${b.w}pt;font-family:${fam};font-size:${b.size}pt;` +
      `font-weight:${b.bold ? 700 : 400};color:${b.color};text-align:${ta};` +
      `line-height:${b.lh || 1.25}">${brut ? val : esc(val)}</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  html, body { margin:0; padding:0; }
  html { background: ${C.fundal}; }
  body { width:${A4.w}pt; height:${A4.h}pt; position:relative;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  div { box-sizing: border-box; }
</style></head><body>
${forme}
<img src="${logoDataUri}" style="position:absolute;left:${LOGO.x}pt;top:${LOGO.y}pt;width:${LOGO.w}pt;height:${LOGO.h}pt">
${texte}
</body></html>`;
}

/* Runs inside the page. Returns what it had to shrink, so the caller can
   report it rather than discover it on a printed sheet. */
export function ASEAZA() {
  const PT = 96 / 72;                          // CSS px per point
  const masura = document.createElement("canvas").getContext("2d");
  const raport = [];

  /* Where the first baseline falls below the block's top, in px.

     Not measured off a marker element: an empty inline-block does not sit on
     the baseline in Chromium, it sits a descent above it, and the error grows
     with the type size -- 6.75pt out on the 28pt line. Computed instead from
     the metrics the layout engine itself uses, which canvas reports for the
     exact font and size in play: the line box is line-height tall, the type
     occupies ascent+descent of it, and the leftover is split above and below.
     Font-independent, so a Devanagari block lands on the same line the Latin
     one does. */
  function subTop(el, size) {
    const cs = getComputedStyle(el);
    masura.font = `${cs.fontWeight} ${size}pt ${cs.fontFamily}`;
    const m = masura.measureText("Hxg");
    const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    const lh = parseFloat(cs.lineHeight);      // px, resolved from the number
    return (lh - (asc + desc)) / 2 + asc;
  }

  document.querySelectorAll("div.t").forEach(el => {
    const tinta = parseFloat(el.dataset.bl);   // pt
    const maxH  = parseFloat(el.dataset.h) * PT;
    const baza  = parseFloat(el.dataset.size);

    let size = baza;
    for (let pas = 0; pas < 14; pas++) {
      el.style.fontSize = size + "pt";
      el.style.top = (tinta - subTop(el, size) / PT) + "pt";
      const prea_lat = el.scrollWidth > el.clientWidth + 1;
      const prea_inalt = el.getBoundingClientRect().height > maxH + 0.5;
      if (!prea_lat && !prea_inalt) break;
      if (size <= baza * 0.78) {               // floor: below it stops reading as a poster
        raport.push(`${el.dataset.k} at ${size.toFixed(1)}pt still ` +
          (prea_lat ? "too wide" : "too tall"));
        break;
      }
      size = Math.max(baza * 0.78, size - baza * 0.02);
    }
    if (size < baza - 0.001 && !raport.some(r => r.startsWith(el.dataset.k)))
      raport.push(`${el.dataset.k} ${baza}pt -> ${size.toFixed(1)}pt`);
  });
  return raport;
}
