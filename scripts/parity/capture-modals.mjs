// Parity capture — glossary + transaction-history modals. Seeds an identical
// ncza-record/v1 into localStorage (both apps have persist:true), signs in,
// then drives: glossary open → search → tier filter → Escape, ledger open →
// jump-to-answer. Numeric probes alongside the screenshots.
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

// Seeded record: module m01 certified, three answers logged (one wrong),
// fixed timestamps so both apps render identical times.
const NAME = 'S. DORSETT';
const T0 = 1751947800000; // fixed epoch base
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

const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);

async function clickByText(page, selector, txt) {
  return page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, txt);
}

async function capture(browser, name, base) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console error: ${m.text().slice(0, 300)}`); });
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  // seed the record before sign-in (both apps load it via progress.load(name))
  await page.evaluate((rec, nm) => {
    localStorage.clear();
    localStorage.setItem(`ncza:v1:progress:${nm}`, JSON.stringify(rec));
    localStorage.setItem('ncza:v1:lastUser', nm);
  }, RECORD, NAME);
  await page.keyboard.press('Space'); // skip the typewriter
  await sleep(1000);
  await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find((x) => (x.type || 'text') === 'text');
    if (i) i.focus();
  });
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type(NAME);
  await page.keyboard.press('Enter');
  await sleep(2600); // welcome (1.7s) + dashboard settle

  // ---- glossary ----
  await page.click('.gloss-fab');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-glossary-open.png`) });
  const glossCount = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.childElementCount <= 1 && /^ENTRIES/.test(d.textContent.trim()));
    return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  });
  await page.type('input[placeholder="SEARCH TERMS"]', 'etag');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-glossary-search.png`) });
  await page.evaluate(() => {
    const i = document.querySelector('input[placeholder="SEARCH TERMS"]');
    if (i) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(i, '');
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(200);
  await clickByText(page, 'button', 'PROJECT');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-glossary-tier.png`) });
  const tierCount = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.childElementCount <= 1 && /^ENTRIES/.test(d.textContent.trim()));
    return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  });
  await page.keyboard.press('Escape');
  await sleep(300);
  const glossClosed = await page.evaluate(() => ![...document.querySelectorAll('span')].some((s) => s.textContent.trim() === 'FIELD GLOSSARY'));

  // ---- transaction history ----
  await page.click('#op-balance');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-txn-open.png`) });
  const ledger = await page.evaluate(() => {
    const grab = (re) => [...document.querySelectorAll('div,span')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()).find((t) => re.test(t)) ?? null;
    return {
      ledgerLine: grab(/^LEDGER \[/),
      net: grab(/^NET /),
      rows: [...document.querySelectorAll('button')].filter((b) => /JUMP TO ANSWER/.test(b.textContent)).length,
    };
  });
  // jump from the CORRECT row (m01-q1)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /JUMP TO ANSWER/.test(x.textContent) && /detect when the dataset/.test(x.textContent));
    b?.click();
  });
  await sleep(700); // mid-flash (clears at 1400ms)
  await page.screenshot({ path: path.join(OUT, `${name}-txn-jump.png`) });
  const jump = await page.evaluate(() => {
    const el = document.getElementById('stg-m01-m01-q1');
    const main = document.querySelector('main');
    if (!el || !main) return { found: false };
    return {
      found: true,
      topOffset: Math.round(el.getBoundingClientRect().top - main.getBoundingClientRect().top),
      flash: el.style.boxShadow || '(none)',
    };
  });

  console.log(`[${name}] gloss all: ${glossCount} | project: ${tierCount} | escClosed: ${glossClosed}`);
  console.log(`[${name}] ledger: ${ledger.ledgerLine} | ${ledger.net} | jumpable rows: ${ledger.rows}`);
  console.log(`[${name}] jump: ${JSON.stringify(jump)}`);
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
