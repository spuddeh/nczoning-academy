// Parity capture — certificate + name prompt + print CSS. Seeds a fully
// CERTIFIED record (all 9 modules incl. the m09 capstone), signs in, then
// drives: SERVICE RECORD → VIEW CERTIFICATE → print-media emulation probe →
// EDIT NAME → clear (ISSUE disabled) → new name → Enter (reissued) → CLOSE.
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
const MODS = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09'];
const RECORD = {
  schema: 'ncza-record/v1',
  course: 'data-api',
  exportedAt: new Date(T0 + 9_000_000).toISOString(),
  moduleDone: Object.fromEntries(MODS.map((id) => [id, true])),
  quiz: {},
  eddies: 11000, // 500 start + 8×1000 + 2500 capstone
  revealedBy: Object.fromEntries(MODS.map((id) => [id, 20])),
  txns: MODS.map((id, i) => ({
    id: `t${i + 1}`, ts: T0 + i * 600_000, kind: 'module', moduleId: id,
    moduleTitle: id.toUpperCase(), qid: null, qPrompt: '', correct: true,
    delta: id === 'm09' ? 2500 : 1000,
    balanceAfter: 500 + Math.min(i + 1, 8) * 1000 + (id === 'm09' ? 2500 : 0),
  })),
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

async function clickByText(page, selector, txt) {
  return page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, txt);
}

const leafText = (page, reSrc) => page.evaluate((src) => {
  const re = new RegExp(src);
  const el = [...document.querySelectorAll('div,span')].find(
    (d) => d.childElementCount === 0 && re.test(d.textContent.trim()),
  );
  return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
}, reSrc);

const certProbe = (page) => page.evaluate(() => {
  const cert = document.getElementById('cert-print');
  if (!cert) return { open: false };
  const grab = (re) => [...cert.querySelectorAll('div,span')].map((d) => d.textContent.replace(/\s+/g, ' ').trim())
    .find((t) => re.test(t)) ?? null;
  return {
    open: true,
    kicker: grab(/^CERTIFICATE OF FIELD CERTIFICATION$/),
    course: grab(/^TRANSMISSION PROTOCOLS$/),
    name: [...cert.querySelectorAll('div')].map((d) => d.textContent.trim())
      .find((t, i, a) => a[i - 1] === 'AWARDED TO') ?? null,
    clearance: grab(/^CLEARANCE LEVEL /),
    issued: grab(/^ISSUED /),
    auth: grab(/^AUTH /),
  };
});

async function capture(browser, name, base) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console error: ${m.text().slice(0, 300)}`); });
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

  // ---- certified Service Record view ----
  await clickByText(page, 'button', 'SERVICE RECORD');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, `${name}-cert-view.png`) });
  const view = await page.evaluate(() => {
    const certBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('VIEW CERTIFICATE'));
    return {
      certDisabled: certBtn ? certBtn.disabled : null,
      bigStamp: [...document.querySelectorAll('div')].some((d) => d.childElementCount === 1 && d.textContent.trim().startsWith('CERTIFIED') && d.textContent.includes('FIELD OPERATOR')),
      lockedHint: [...document.querySelectorAll('div')].some((d) => /CERTIFICATE LOCKED/.test(d.textContent) && d.childElementCount === 0),
    };
  });
  console.log(`[${name}] view: ${JSON.stringify(view)}`);

  // ---- open certificate ----
  await clickByText(page, 'button', 'VIEW CERTIFICATE');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, `${name}-cert-open.png`) });
  console.log(`[${name}] cert: ${JSON.stringify(await certProbe(page))}`);

  // ---- print-media emulation: cert is the page, chrome hidden ----
  await page.emulateMediaType('print');
  const printProbe = await page.evaluate(() => {
    const vis = (el) => (el ? getComputedStyle(el).visibility : null);
    return {
      cert: vis(document.getElementById('cert-print')),
      balanceChip: vis(document.getElementById('op-balance')),
      controls: document.getElementById('cert-controls') ? getComputedStyle(document.getElementById('cert-controls')).display : null,
      certPos: getComputedStyle(document.getElementById('cert-print')).position,
    };
  });
  await page.emulateMediaType('screen');
  console.log(`[${name}] print: ${JSON.stringify(printProbe)}`);

  // ---- edit name: prefilled → cleared (ISSUE disabled) → reissue ----
  await clickByText(page, 'button', 'EDIT NAME');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-cert-nameprompt.png`) });
  const prompt1 = await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find((x) => x.placeholder === 'e.g. S. DORSETT');
    const issue = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('ISSUE CERTIFICATE'));
    return { value: i?.value ?? null, issueDisabled: issue?.disabled ?? null };
  });
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await sleep(150);
  const prompt2 = await page.evaluate(() => {
    const issue = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('ISSUE CERTIFICATE'));
    return { issueDisabled: issue?.disabled ?? null };
  });
  await page.keyboard.type('V. SILVERHAND');
  await page.keyboard.press('Enter');
  await sleep(400);
  const reissued = await certProbe(page);
  await page.screenshot({ path: path.join(OUT, `${name}-cert-reissued.png`) });
  console.log(`[${name}] prompt: prefilled="${prompt1.value}" issueDisabled(prefilled/cleared)=${prompt1.issueDisabled}/${prompt2.issueDisabled} reissuedName="${reissued.name}"`);

  // ---- close ----
  await clickByText(page, 'button', 'CLOSE');
  await sleep(300);
  const closed = !(await page.evaluate(() => !!document.getElementById('cert-print')));
  const recordName = await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find((x) => x.placeholder === 'e.g. S. DORSETT');
    return i?.value ?? null;
  });
  console.log(`[${name}] closed: ${closed} | record view name now: "${recordName}"`);

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
