// Parity capture — NC Radio pill + expanded panel. Seeds a record whose
// audio prefs pin the station (login otherwise randomises it), signs in,
// then drives: pill → open panel → pause/play → next track → station chip →
// music mute → volume slider + right-click reset → SFX mute → muted pill →
// persisted-audio probe (localStorage record after the debounced save).
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
const RECORD = {
  schema: 'ncza-record/v1',
  course: 'data-api',
  exportedAt: new Date(1751947800000).toISOString(),
  moduleDone: { m01: true },
  quiz: {},
  eddies: 1400,
  revealedBy: { m01: 12 },
  txns: [],
  operatorName: NAME,
  // Pins the radio so both apps land identically (fresh logins randomise).
  audio: { muted: false, musicOn: true, musicVol: 0.4, sfxVol: 0.8, stationIdx: 1, trackIdx: 0, stationTracks: { 1: 0 }, cycle: true },
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

const clickByTitle = (page, title) => page.evaluate((t) => {
  const el = document.querySelector(`button[title="${t}"]`);
  if (el) { el.click(); return true; }
  return false;
}, title);

const clickButton = (page, reSrc) => page.evaluate((src) => {
  const re = new RegExp(src);
  const el = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
  if (el) { el.click(); return true; }
  return false;
}, reSrc);

// nth mute/unmute speaker button: 0 = MUSIC row, 1 = SYSTEM SOUNDS row.
const clickSpeaker = (page, idx) => page.evaluate((i) => {
  const els = [...document.querySelectorAll('button[title="Mute"], button[title="Unmute"]')];
  if (els[i]) { els[i].click(); return true; }
  return false;
}, idx);

// Panel state probe — texts + the computed colours that flip with state.
// Scoped to the fixed 300px panel box (the dashboard behind it also has
// 26px leaf divs that would shadow the freq element).
const panelProbe = (page) => page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find((d) => {
    const cs = getComputedStyle(d);
    return cs.position === 'fixed' && cs.width === '300px' && cs.right === '22px';
  }) ?? document;
  const leaf = (re) => {
    const el = [...panel.querySelectorAll('div,span')].find(
      (d) => d.childElementCount === 0 && re.test(d.textContent.trim()),
    );
    return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  };
  const freqEl = [...panel.querySelectorAll('div')].find(
    (d) => d.childElementCount === 0 && getComputedStyle(d).fontSize === '26px',
  );
  const btn = (re) => {
    const el = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
    return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  };
  const freqs = (window.RADIO_STATIONS ?? []).map((s) => s.freq);
  const chips = [...document.querySelectorAll('button')].filter((b) => freqs.includes(b.textContent.trim()));
  const activeChip = chips.find((c) => getComputedStyle(c).backgroundColor === 'rgb(0, 240, 255)');
  return {
    freq: freqEl ? { text: freqEl.textContent.trim(), color: getComputedStyle(freqEl).color } : null,
    station: leaf(/^(CHROME HORIZON|KABUKI AFTER DARK|J-TOWN GOLD|NEON RAIN|BADLANDS FM)$/),
    title: leaf(/^♪ /),
    status: leaf(/^(‖ PAUSED|■ MUTED|▸ .+ BPM)$/),
    caption: leaf(/^TRACK \d+ \/ \d+/),
    playBtn: btn(/^(▶ PLAY|⏸ PAUSE)$/),
    cycleBtn: btn(/AUTO-ROTATE/),
    chipCount: chips.length,
    activeChip: activeChip?.textContent.trim() ?? null,
    volVals: [...document.querySelectorAll('span')].filter((s) => /^(\d+%|MUTED)$/.test(s.textContent.trim())).map((s) => ({ v: s.textContent.trim(), color: getComputedStyle(s).color })),
    times: leaf(/^\d+:\d\d$/),
  };
});

// Container chrome probe (panel box + titlebar), tag-agnostic.
const chromeProbe = (page) => page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find((d) => {
    const cs = getComputedStyle(d);
    return cs.position === 'fixed' && cs.width === '300px' && cs.right === '22px';
  });
  if (!panel) return null;
  const cs = getComputedStyle(panel);
  const bar = panel.firstElementChild ? getComputedStyle(panel.firstElementChild) : null;
  return {
    bg: cs.backgroundColor, border: cs.borderColor, shadow: cs.boxShadow.slice(0, 60),
    barBg: bar?.backgroundColor, barPad: bar?.padding,
  };
});

const pillProbe = (page) => page.evaluate(() => {
  const pill = document.querySelector('button[title="Open NC Radio"]');
  if (!pill) return null;
  const cs = getComputedStyle(pill);
  const spans = [...pill.querySelectorAll('span')];
  return {
    border: cs.borderColor, pad: cs.padding,
    freq: spans[0] ? { text: spans[0].textContent.trim(), color: getComputedStyle(spans[0]).color } : null,
    track: spans[1] ? { text: spans[1].textContent.trim().slice(0, 24), color: getComputedStyle(spans[1]).color } : null,
    eqBars: pill.querySelectorAll('div > div').length,
  };
});

// React-safe range setter (both apps are React — go through the native
// value setter so the synthetic onChange fires).
const setRange = (page, idx, v) => page.evaluate((i, val) => {
  const r = [...document.querySelectorAll('input[type="range"]')][i];
  if (!r) return false;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(r, String(val));
  r.dispatchEvent(new Event('input', { bubbles: true }));
  r.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, idx, v);

// Right-click the nth volume row (0 = MUSIC) → reset to default.
const rightClickVolRow = (page, idx) => page.evaluate((i) => {
  const rows = [...document.querySelectorAll('[title="Right-click to reset to default"]')];
  if (!rows[i]) return false;
  rows[i].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  return true;
}, idx);

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

  // ---- collapsed pill (dashboard) ----
  await page.screenshot({ path: path.join(OUT, `${name}-radio-pill.png`) });
  console.log(`[${name}] pill: ${JSON.stringify(await pillProbe(page))}`);

  // ---- open panel ----
  await clickByTitle(page, 'Open NC Radio');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-radio-panel.png`) });
  console.log(`[${name}] panel: ${JSON.stringify(await panelProbe(page))}`);
  console.log(`[${name}] chrome: ${JSON.stringify(await chromeProbe(page))}`);

  // ---- pause / play ----
  await clickButton(page, '^⏸ PAUSE$');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-radio-paused.png`) });
  const paused = await panelProbe(page);
  console.log(`[${name}] paused: status="${paused.status}" freq=${JSON.stringify(paused.freq)} play="${paused.playBtn}"`);
  await clickButton(page, '^▶ PLAY$');
  await sleep(300);

  // ---- next track ----
  await clickButton(page, '^⏭$');
  await sleep(300);
  const stepped = await panelProbe(page);
  console.log(`[${name}] next: caption="${stepped.caption}" title="${stepped.title}"`);

  // ---- station chip (J-TOWN GOLD, idx 2) ----
  await clickButton(page, '^104\\.2$');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-radio-station.png`) });
  const tuned = await panelProbe(page);
  console.log(`[${name}] station: freq=${JSON.stringify(tuned.freq)} station="${tuned.station}" active="${tuned.activeChip}" status="${tuned.status}"`);

  // ---- auto-rotate off/on ----
  await clickButton(page, 'AUTO-ROTATE · ON');
  await sleep(200);
  const cycleOff = (await panelProbe(page)).cycleBtn;
  await clickButton(page, 'AUTO-ROTATE · OFF');
  await sleep(200);
  console.log(`[${name}] cycle: off="${cycleOff}" back="${(await panelProbe(page)).cycleBtn}"`);

  // ---- music mute ----
  await clickSpeaker(page, 0);
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-radio-muted.png`) });
  const muted = await panelProbe(page);
  console.log(`[${name}] music-muted: status="${muted.status}" freq=${JSON.stringify(muted.freq)} vols=${JSON.stringify(muted.volVals)}`);
  await clickSpeaker(page, 0); // unmute
  await sleep(300);

  // ---- volume slider + right-click reset (MUSIC row) ----
  await setRange(page, 0, 0.77);
  await sleep(200);
  const bumped = (await panelProbe(page)).volVals;
  await rightClickVolRow(page, 0);
  await sleep(200);
  const reset = (await panelProbe(page)).volVals;
  console.log(`[${name}] volume: bumped=${JSON.stringify(bumped)} reset=${JSON.stringify(reset)}`);

  // ---- SFX mute ----
  await clickSpeaker(page, 1);
  await sleep(300);
  console.log(`[${name}] sfx-muted: vols=${JSON.stringify((await panelProbe(page)).volVals)}`);
  await clickSpeaker(page, 1); // unmute
  await sleep(200);

  // ---- muted pill (music muted, minimized) ----
  await clickSpeaker(page, 0);
  await sleep(200);
  await clickByTitle(page, 'Minimize');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-radio-pill-muted.png`) });
  console.log(`[${name}] muted pill: ${JSON.stringify(await pillProbe(page))}`);

  // ---- persisted audio (after the 400ms debounced save) ----
  await sleep(700);
  const persisted = await page.evaluate((nm) => {
    try { return JSON.parse(localStorage.getItem(`ncza:v1:progress:${nm}`))?.audio ?? null; } catch { return null; }
  }, NAME);
  console.log(`[${name}] persisted audio: ${JSON.stringify(persisted)}`);

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
