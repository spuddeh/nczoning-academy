// Parity capture — Service Record view + shard I/O. Seeds the same
// ncza-record/v1 as capture-modals (m01 certified, eddies 1400), signs in,
// then drives: SERVICE RECORD nav → view probes → EJECT (mid + settled) →
// PURGE (confirm → wiped) → SLOT a .shard file (clean record → straight to
// the reader animation) → SLOT again (non-empty → overwrite confirm →
// cancel). Downloads are denied via CDP so ejects don't write files.
// Servers + Chrome as per scripts/parity/README.md.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const MONOLITH_URL = process.env.MONOLITH_URL ?? 'http://localhost:4173/';
const REBUILD_URL = process.env.REBUILD_URL ?? 'http://localhost:5173/';
const CHROME = process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.CHROME_DEBUG_PORT ?? 9224);
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NAME = 'S. DORSETT';
const T0 = 1751947800000;
const RECORD = {
  schema: 'ncza-record/v1',
  course: 'data-api',
  exportedAt: new Date(T0 + 4_000_000).toISOString(),
  moduleDone: { m01: true },
  quiz: {
    'm01-q1': { answered: true, selected: 0 },
    'm01-q3': { answered: true, selected: 1 },
  },
  eddies: 1400,
  revealedBy: { m01: 12 },
  txns: [
    { id: 't1', ts: T0, kind: 'answer', moduleId: 'm01', moduleTitle: 'The Living Map', qid: 'm01-q1', qPrompt: 'A consumer wants to detect when the dataset has changed. Which response header should it read?', correct: true, delta: 150, balanceAfter: 650 },
    { id: 't2', ts: T0 + 600_000, kind: 'answer', moduleId: 'm01', moduleTitle: 'The Living Map', qid: 'm01-q3', qPrompt: 'A new consumer is being written against /v1. Which assumption is WRONG?', correct: false, delta: -250, balanceAfter: 400 },
    { id: 't3', ts: T0 + 1_200_000, kind: 'module', moduleId: 'm01', moduleTitle: 'The Living Map', qid: null, qPrompt: '', correct: true, delta: 1000, balanceAfter: 1400 },
  ],
  operatorName: NAME,
  audio: null,
};
const SHARD_FILE = path.join(OUT, 'seed.shard');
fs.writeFileSync(SHARD_FILE, JSON.stringify(RECORD, null, 2));

async function wsEndpoint() {
  try {
    const r = await fetch(`http://localhost:${PORT}/json/version`);
    return (await r.json()).webSocketDebuggerUrl;
  } catch { /* not running */ }
  const profile = path.join(OUT, 'chrome-profile');
  spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1440,900', '--no-first-run',
  ], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch { /* retry */ }
  }
  throw new Error('headless Chrome did not come up');
}

async function clickByText(page, selector, txt) {
  return page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, txt);
}

// Text of the first element (any tag) whose trimmed text matches re and has
// no element children (leaf) — tolerant of monolith inline-style markup.
const leafText = (page, reSrc) => page.evaluate((src) => {
  const re = new RegExp(src);
  const el = [...document.querySelectorAll('div,span')].find(
    (d) => d.childElementCount === 0 && re.test(d.textContent.trim()),
  );
  return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
}, reSrc);

const statProbe = (page) => page.evaluate(() => {
  const out = {};
  for (const lbl of ['CLEARANCE', 'RANK', 'MODULES CLEAR', 'EDDIES BALANCE']) {
    const el = [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && d.textContent.trim() === lbl);
    out[lbl] = el?.nextElementSibling?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  }
  out.modRows = [...document.querySelectorAll('div,span')].filter((d) => d.childElementCount === 0 && /^CLR \d+ \/\//.test(d.textContent.trim())).length;
  out.certRows = [...document.querySelectorAll('div,span')].filter((d) => d.childElementCount === 0 && d.textContent.trim() === '✓ CERTIFIED').length;
  out.stamps = [...document.querySelectorAll('div')].filter((d) => d.textContent.trim().startsWith('MODULE CLEAR') && d.childElementCount === 1).length;
  const certBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('VIEW CERTIFICATE'));
  out.certDisabled = certBtn ? certBtn.disabled : null;
  return out;
});

async function capture(browser, name, base) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console error: ${m.text().slice(0, 300)}`); });
  const cdp = await page.createCDPSession();
  try { await cdp.send('Page.setDownloadBehavior', { behavior: 'deny' }); } catch { /* older CDP */ }
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  await page.evaluate((rec, nm) => {
    localStorage.clear();
    localStorage.setItem(`ncza:v1:progress:${nm}`, JSON.stringify(rec));
    localStorage.setItem('ncza:v1:lastUser', nm);
  }, RECORD, NAME);
  await page.keyboard.press('Space');
  await sleep(1000);
  await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find((x) => (x.type || 'text') === 'text');
    if (i) i.focus();
  });
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type(NAME);
  await page.keyboard.press('Enter');
  await sleep(2600);

  // ---- the view ----
  await clickByText(page, 'button', 'SERVICE RECORD');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, `${name}-record-view.png`) });
  const stats = await statProbe(page);
  console.log(`[${name}] view: ${JSON.stringify(stats)}`);

  // ---- eject ----
  await clickByText(page, 'button', 'EJECT SHARD');
  await sleep(430); // mid-write (bar ~50%)
  await page.screenshot({ path: path.join(OUT, `${name}-record-eject-mid.png`) });
  const ejectTitle = await leafText(page, '^(WRITING SERVICE RECORD SHARD|SHARD EJECTED)');
  await sleep(900); // settled (820ms + phase flip)
  await page.screenshot({ path: path.join(OUT, `${name}-record-eject-done.png`) });
  const ejectResult = await leafText(page, '^> NCZA_');
  const ejectMsg = await leafText(page, '^> SHARD EJECTED //');
  console.log(`[${name}] eject: mid="${ejectTitle}" result="${ejectResult}" msg="${ejectMsg}"`);
  await sleep(2200); // overlay auto-clear (2300ms after settle)

  // ---- purge ----
  await clickByText(page, 'button', 'PURGE LOCAL CACHE');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-record-purge-confirm.png`) });
  const purgeTitle = await leafText(page, 'PURGE LOCAL CACHE$');
  await clickByText(page, 'button', 'PURGE RECORD');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, `${name}-record-purged.png`) });
  const purged = await statProbe(page);
  const purgeMsg = await leafText(page, '^> LOCAL CACHE PURGED');
  console.log(`[${name}] purge: title="${purgeTitle}" msg="${purgeMsg}" stats=${JSON.stringify(purged)}`);

  // ---- slot (clean record → straight to reader animation) ----
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(SHARD_FILE);
  await sleep(430); // mid-read
  await page.screenshot({ path: path.join(OUT, `${name}-record-slot-mid.png`) });
  const slotTitle = await leafText(page, '^(READING SERVICE RECORD SHARD|RECORD SLOTTED)');
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, `${name}-record-slotted.png`) });
  const slotResult = await leafText(page, '^> RECORD RESTORED');
  const slotMsg = await leafText(page, '^> SHARD SLOTTED //');
  const restored = await statProbe(page);
  console.log(`[${name}] slot: mid="${slotTitle}" result="${slotResult}" msg="${slotMsg}" stats=${JSON.stringify(restored)}`);
  await sleep(1700); // overlay auto-clear

  // ---- slot again (non-empty → overwrite confirm → cancel) ----
  const fileInput2 = await page.$('input[type="file"]');
  await fileInput2.uploadFile(SHARD_FILE);
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-record-slot-confirm.png`) });
  const confirmTitle = await leafText(page, 'OVERWRITE WARNING$');
  const confirmDetail = await leafText(page, '^> Incoming shard:');
  await clickByText(page, 'button', 'CANCEL');
  await sleep(300);
  const cancelMsg = await leafText(page, '^> SLOT CANCELLED');
  console.log(`[${name}] slot-confirm: title="${confirmTitle}" detail="${confirmDetail}" cancel="${cancelMsg}"`);

  await page.close();
}

const browser = await puppeteer.connect({
  browserWSEndpoint: await wsEndpoint(),
  defaultViewport: { width: 1440, height: 900 },
});
await capture(browser, 'monolith', MONOLITH_URL);
await capture(browser, 'rebuild', REBUILD_URL);
await browser.disconnect();
console.log(`done → ${OUT}`);
