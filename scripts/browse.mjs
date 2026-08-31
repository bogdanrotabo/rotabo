#!/usr/bin/env node
// Open a page in headless Chromium and report what it did.
//
// Why the detour: the browser's own TLS handshake is refused by the sandbox
// egress (its ClientHello is ~1.7 kB and the tunnel resets on it), while
// Node's is not. So every request the page makes is intercepted and replayed
// from Node through the proxy, then handed back to the page.
//
//   node scripts/browse.mjs <url> [options]
//     --out <file.png>     screenshot (default: skipped)
//     --full               full-page screenshot
//     --size 1280x900      viewport, or "mobile" for 390x844 + touch
//     --wait 3000          extra ms to settle after load
//     --click "<sel>"      click a selector after load (repeatable)
//     --text               dump the visible text of the page
//
// Note: WebSockets are not intercepted, so Supabase realtime stays offline.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { execSync } = require('node:child_process');

let pw;
for (const root of [process.env.PLAYWRIGHT_ROOT, () => execSync('npm root -g').toString().trim()]) {
  const dir = typeof root === 'function' ? root() : root;
  if (!dir) continue;
  try { pw = require(`${dir}/playwright`); break; } catch { /* keep looking */ }
}
if (!pw) { try { pw = require('playwright'); } catch { throw new Error('playwright not found — npm i -g playwright'); } }

const argv = process.argv.slice(2);
const url = argv[0];
if (!url || url.startsWith('-')) { console.error('usage: node scripts/browse.mjs <url> [--out shot.png] [--full] [--size 1280x900|mobile] [--wait ms] [--click sel] [--text]'); process.exit(2); }
const flag = (name, fallback) => { const i = argv.indexOf(name); return i === -1 ? fallback : argv[i + 1]; };
const has = name => argv.includes(name);
const clicks = argv.reduce((acc, a, i) => (a === '--click' ? [...acc, argv[i + 1]] : acc), []);

const size = flag('--size', '1280x900');
const mobile = size === 'mobile';
const [width, height] = mobile ? [390, 844] : size.split('x').map(Number);
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;

const api = await pw.request.newContext(proxy ? { proxy: { server: proxy } } : {});
const direct = await pw.request.newContext();   // loopback never goes through the proxy

const isLocal = host =>
  host === 'localhost' || host === '::1' || host.endsWith('.local') ||
  /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(host);
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});

const failed = [];
await ctx.route('**/*', async route => {
  const req = route.request();
  try {
    const fetcher = isLocal(new URL(req.url()).hostname) ? direct : api;
    const res = await fetcher.fetch(req.url(), {
      method: req.method(),
      headers: req.headers(),
      data: req.postDataBuffer() ?? undefined,
      maxRedirects: 0,          // let the page follow its own redirects
      timeout: 20000,
    });
    const headers = { ...res.headers() };
    delete headers['content-encoding'];   // body arrives decoded
    delete headers['content-length'];
    await route.fulfill({ status: res.status(), headers, body: await res.body() });
  } catch (e) {
    failed.push(`${req.url()} — ${e.message.split('\n')[0]}`);
    await route.abort();
  }
});

const page = await ctx.newPage();
const consoleErrors = [], pageErrors = [], badStatus = [];
page.on('response', r => { if (r.status() >= 400) badStatus.push(`${r.status()} ${r.url()}`); });
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('load').catch(() => {});
await page.waitForTimeout(Number(flag('--wait', 2500)));

for (const sel of clicks) {
  await page.click(sel, { timeout: 10000 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1500);
  console.log(`clicked ${sel} -> ${page.url()}`);
}

console.log(`status  ${res.status()}  ${page.url()}`);
console.log(`title   ${await page.title()}`);
if (has('--text')) console.log('\n' + (await page.locator('body').innerText()).trim() + '\n');
const list = (label, xs) => xs.length && console.log(`${label} (${xs.length})\n  ` + [...new Set(xs)].slice(0, 8).join('\n  '));
list('page errors', pageErrors);
list('console errors', consoleErrors);
list('404s and other bad statuses', badStatus);
list('requests that never landed', failed);
if (!pageErrors.length && !consoleErrors.length && !failed.length && !badStatus.length)
  console.log('clean — no errors, every request served');

const out = flag('--out');
if (out) { await page.screenshot({ path: out, fullPage: has('--full') }); console.log(`shot    ${out}`); }

await browser.close();
await api.dispose();
await direct.dispose();
