#!/usr/bin/env node
/* The gift.ceo outreach launcher.
 *
 * A cold campaign fails in one of three ways, and only one of them is about
 * the writing. It sends to addresses that were never real, so the domain
 * earns a bounce rate that follows it forever. It sends the same person the
 * same letter twice, because a run was interrupted and nobody kept score. Or
 * it goes out without the postal address and the way out that the law asks
 * for, which is a fine per message in the United States and no way to recall
 * what already left.
 *
 * So this script is mostly refusals. It will not run without a physical
 * address to put at the foot of the letter. It will not send to an address
 * that does not parse, that appears twice, that sits in the suppression
 * file, or that a previous run already wrote to the log. And it does nothing
 * at all unless --send is passed: the default is a dry run that prints what
 * would leave and stops.
 *
 * Nothing here invents a recipient. The list is an input, and an empty list
 * is an empty campaign -- that is the intended behaviour, not a bug to work
 * around.
 *
 *   node launch.mjs                      # dry run, prints the plan
 *   node launch.mjs --limit 50           # dry run, first 50 after filtering
 *   node launch.mjs --send --limit 50    # actually sends, 50 at most
 *   node launch.mjs --send --delay 45    # 45s between messages
 */

import { readFileSync, appendFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTBOX = join(HERE, "outbox");

/* ---------- arguments ---------- */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || i === argv.length - 1 ? fallback : argv[i + 1];
};

const ARMED   = flag("send");
const LIMIT   = Number(value("limit", "50"));
const DELAY   = Number(value("delay", "40"));   // seconds between messages
const LIST    = value("list", join(HERE, "recipients.csv"));

/* ---------- config ---------- */

const cfg = JSON.parse(readFileSync(join(HERE, "campaign.json"), "utf8"));

/* The compliance gate. CAN-SPAM asks for three things this script can
 * actually check: a real postal address in the body, a working way to stop
 * receiving mail, and a subject line that is not a lie about the contents.
 * The first two are structural and are enforced here. The third is a
 * judgement about the copy and is left to whoever writes it -- but a subject
 * that opens "Re:" or "Fwd:" on a first contact is a lie by construction,
 * so that one is checked too. */
const problems = [];
if (!cfg.postalAddress || /TODO|FILL|xxx/i.test(cfg.postalAddress))
  problems.push("campaign.json: postalAddress is required and must be a real address (CAN-SPAM §7704(a)(5))");
if (!cfg.unsubscribe || /TODO|FILL|xxx/i.test(cfg.unsubscribe))
  problems.push("campaign.json: unsubscribe is required -- a working link or a monitored reply-to instruction");
/* Either "addr@domain" or the display form "Name <addr@domain>" -- the
 * second is what a recipient should actually see, so it is not the odd one
 * out here. */
const fromAddr = (cfg.from || "").match(/<([^>]+)>\s*$/)?.[1] ?? cfg.from ?? "";
if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(fromAddr.trim()))
  problems.push(`campaign.json: from ("${cfg.from}") must be an address, or "Name <address>"`);
if (/^\s*(re|fwd)\s*:/i.test(cfg.subject || ""))
  problems.push(`campaign.json: subject "${cfg.subject}" fakes a reply to a conversation that never happened`);
if (problems.length) {
  console.error("Refusing to run:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}

/* ---------- the list ---------- */

/* A CSV small enough to hold in memory and quoted the way a spreadsheet
 * exports it: commas inside quotes, doubled quotes for a literal one. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

if (!existsSync(LIST)) {
  console.error(
    `No recipient list at ${LIST}.\n` +
    `This script does not invent addresses. Put real ones in that file --\n` +
    `see recipients.sample.csv for the columns -- and run it again.`
  );
  process.exit(1);
}

const raw = parseCsv(readFileSync(LIST, "utf8"));

/* ---------- filtering ---------- */

const readLines = (p) =>
  existsSync(p)
    ? readFileSync(p, "utf8").split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith("#"))
    : [];

const suppressed = new Set(readLines(join(HERE, "suppression.txt")));
const alreadySent = new Set(
  readLines(join(OUTBOX, "sent.log")).map((l) => (l.split("\t")[1] || "").trim()).filter(Boolean)
);

const seen = new Set();
const skipped = [];
const queue = [];

for (const r of raw) {
  const email = (r.email || "").toLowerCase().trim();
  const why =
    !email                                                  ? "no email column" :
    !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)            ? "not a valid address" :
    seen.has(email)                                         ? "duplicate in list" :
    suppressed.has(email)                                   ? "on the suppression list" :
    alreadySent.has(email)                                  ? "a previous run already sent to it" :
    null;
  if (why) { skipped.push({ email: email || "(blank)", why }); continue; }
  seen.add(email);
  queue.push(r);
}

const batch = queue.slice(0, LIMIT);

/* ---------- rendering ---------- */

const template = readFileSync(join(HERE, "template.txt"), "utf8");

/* {{first_name}} and friends. A row that is missing a column the template
 * asks for is dropped rather than sent with a hole in it: "Hi ," is worse
 * than not writing at all, and it is the single clearest signal to the
 * reader that the letter was generated. The one exception is first_name,
 * which falls back to the greeting in campaign.json, because a good
 * fallback there is normal and reads as written. */
function render(text, row) {
  const missing = [];
  const out = text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = (row[key] ?? "").trim();
    if (v) return v;
    if (key === "first_name" && cfg.greetingFallback) return cfg.greetingFallback;
    missing.push(key);
    return "";
  });
  return { out, missing };
}

const messages = [];
for (const row of batch) {
  const body = render(template, row);
  const subject = render(cfg.subject, row);
  const missing = [...new Set([...body.missing, ...subject.missing])];
  if (missing.length) {
    skipped.push({ email: row.email, why: `row has no ${missing.join(", ")}` });
    continue;
  }
  messages.push({
    to: row.email.toLowerCase().trim(),
    subject: subject.out,
    body: body.out.trimEnd() + "\n\n--\n" + cfg.postalAddress + "\n" + cfg.unsubscribe + "\n",
  });
}

/* ---------- output ---------- */

mkdirSync(OUTBOX, { recursive: true });
writeFileSync(join(OUTBOX, "plan.json"), JSON.stringify({ from: cfg.from, messages }, null, 2));

console.log(`list        ${raw.length} rows read from ${LIST}`);
console.log(`skipped     ${skipped.length}`);
for (const s of skipped.slice(0, 12)) console.log(`              ${s.email} -- ${s.why}`);
if (skipped.length > 12) console.log(`              ... and ${skipped.length - 12} more`);
console.log(`ready       ${messages.length}${queue.length > LIMIT ? ` (of ${queue.length}, capped by --limit ${LIMIT})` : ""}`);
console.log(`plan        ${join(OUTBOX, "plan.json")}`);

if (!messages.length) {
  console.log("\nNothing to send.");
  process.exit(0);
}

console.log("\n---- first message, exactly as it would go out ----");
console.log(`From:    ${cfg.from}`);
console.log(`To:      ${messages[0].to}`);
console.log(`Subject: ${messages[0].subject}\n`);
console.log(messages[0].body);
console.log("--------------------------------------------------");

if (!ARMED) {
  console.log(
    `\nDry run. Nothing was sent.\n` +
    `Re-run with --send to transmit ${messages.length} message(s), ` +
    `${DELAY}s apart (about ${Math.round((messages.length * DELAY) / 60)} min).`
  );
  process.exit(0);
}

/* ---------- sending ---------- */

/* Fifty cold messages an hour out of a consumer mailbox is how a consumer
 * mailbox stops being one. This path wants a real sending domain behind it:
 * an API key for the domain in cfg.from, with SPF, DKIM and DMARC published,
 * so that a complaint lands on a domain that can answer for it. Without a key
 * the script stops and says so rather than falling back to something that
 * would work today and cost the domain its reputation by Friday. */
const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error(
    `\n--send needs RESEND_API_KEY (or another provider wired in here).\n` +
    `The plan is written to outbox/plan.json either way -- it can be handed\n` +
    `to any sender that can read it. Do not push 50 cold messages through a\n` +
    `personal Gmail: that is what gets the mailbox limited.`
  );
  process.exit(1);
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
let sent = 0, failed = 0;

for (const [i, m] of messages.entries()) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: cfg.from, to: [m.to], subject: m.subject, text: m.body,
        headers: { "List-Unsubscribe": cfg.listUnsubscribeHeader || cfg.unsubscribe },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    /* Logged the moment it leaves, before anything else can fail, so an
     * interrupted run can never re-send what already went out. */
    appendFileSync(join(OUTBOX, "sent.log"), `${new Date().toISOString()}\t${m.to}\tok\n`);
    sent++;
    console.log(`sent ${i + 1}/${messages.length}  ${m.to}`);
  } catch (err) {
    failed++;
    appendFileSync(join(OUTBOX, "sent.log"), `${new Date().toISOString()}\t${m.to}\tFAILED ${err.message}\n`);
    console.error(`fail ${i + 1}/${messages.length}  ${m.to} -- ${err.message}`);
  }
  if (i < messages.length - 1) await sleep(DELAY);
}

console.log(`\ndone. sent ${sent}, failed ${failed}. log: ${join(OUTBOX, "sent.log")}`);
