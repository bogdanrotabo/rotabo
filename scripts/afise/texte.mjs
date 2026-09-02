/*
 * The poster's words, per language, in texte.json.
 *
 * `ro` is not a translation: it is the text read back out of the poster the
 * designer drew, and en, de, fr, es and it come out of the ones he had made
 * from it. Those six are the reference the other thirty-two were written
 * against, so the wording that was approved is the wording that spread.
 *
 * Data rather than code because it is 38 languages of prose and nothing else,
 * and because a missing quote in one of them should be a parse error at the
 * top and not a poster with a hole in it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const TEXTE = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "texte.json"), "utf8"));

/* Every language must carry every line: a key missing from one of them prints
   the word "undefined" across a poster somebody pins up. */
export const CHEI = [
  "cap1", "cap2", "corp", "nevoieK", "oferK", "nevoieT", "oferT",
  "nevoieL", "oferL", "punte1", "punte2", "cumTitlu",
  "pas1", "pas2", "pas3", "badge1", "badge2", "badge3",
  "azi", "maine", "browser",
];
