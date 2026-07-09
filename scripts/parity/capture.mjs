// Parity capture: drive the monolith and the rebuild through one headless
// Chrome with identical viewport + input sequence, screenshotting each boot
// state and the dashboard. See scripts/parity/README.md.
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

async function wsEndpoint() {
  // reuse a running debug Chrome if one is up; otherwise launch our own
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

async function capture(browser, name, base) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console error: ${m.text().slice(0, 300)}`); });
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, `${name}-boot-typing.png`) });
  await page.keyboard.press('Space');                    // skip the typewriter
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, `${name}-boot-form.png`) });
  await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find((x) => (x.type || 'text') === 'text');
    if (i) i.focus();
  });
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('S. DORSETT');
  await page.keyboard.press('Enter');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, `${name}-boot-welcome.png`) }); // mid 1.7s welcome
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, `${name}-dashboard.png`) });
  console.log(`[${name}] captured`);
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
