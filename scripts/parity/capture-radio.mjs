// Parity capture: NC Radio pill + expanded panel. Seeds a record whose audio
// prefs pin the station (login otherwise randomises it), signs in, then drives:
// pill → open panel → pause/play → next track → station chip → music mute →
// volume slider + right-click reset → SFX mute → muted pill → persisted-audio
// probe (localStorage record after the debounced save).
// See scripts/parity/README.md.
import path from 'node:path';
import { withBrowser, targets, outDir, sleep, signIn, openApp } from './lib/drive.mjs';
import { NAME, RECORD_RADIO as RECORD } from './lib/fixtures.mjs';

const OUT = outDir('radio', { clean: true });

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

// Panel state probe: texts + the computed colours that flip with state.
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

// React-safe range setter (both apps are React, go through the native
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
  const page = await openApp(browser, { url: base, label: name, record: RECORD, name: NAME });
  await signIn(page, NAME);

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

await withBrowser(async (browser) => {
  for (const t of targets()) await capture(browser, t.name, t.url);
});
console.log(`done → ${OUT}`);
