// Computed-style snapshot: walk every element on every view and record the four
// properties a colour refactor can move. Written for #17, where the whole claim
// is "pure refactor, zero visual change" and screenshots cannot prove it.
//
//   node scripts/parity/snapshot-styles.mjs before
//   ...change the CSS...
//   node scripts/parity/snapshot-styles.mjs after
//   node scripts/parity/compare-styles.mjs before after
//
// NORMALISATION IS THE POINT. Relative colour syntax computes as
// `color(srgb 0 0.94 1 / 0.25)` while the literal it replaces computes as
// `rgba(0, 240, 255, 0.25)`. Those are the same colour and different strings, so
// a string diff false-positives on every single line and tells you nothing. We
// parse both to numeric RGBA and compare numbers.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowser, openApp, signIn, outDir, sleep, clickByText, expectSelector } from './lib/drive.mjs';
import { NAME, RECORD_SNAPSHOT } from './lib/fixtures.mjs';

const label = process.argv[2];
if (!label) {
  console.error('usage: node scripts/parity/snapshot-styles.mjs <label>');
  process.exit(1);
}
const OUT = outDir('styles');
const URL = process.env.REBUILD_URL ?? 'http://localhost:5173/';

/** Properties a token refactor can move: colour (+ longhands) and stacking. */
const PROPS = [
  'color', 'background-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'box-shadow', 'text-shadow', 'outline-color', 'fill', 'stroke',
  'z-index', // #18: computed z-index on every positioned element must be identical
  'letter-spacing', // #19: tracking scale — diff must contain ONLY intended collapses
  // #27 box model: spacing scale — diff must be ONLY these, ONLY the intended snaps
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'row-gap', 'column-gap',
];

/**
 * Pin live state that a snapshot cannot otherwise reproduce.
 *
 * `.sys-readout` rolls `Math.random()` every 2s and swaps its tier class
 * (NOMINAL / ELEVATED / CRITICAL), which drives three different colours. A
 * control run of the SAME css reported that span as red, then cyan, then green.
 * Pin it to NOMINAL for the ordinary views; the other two tiers get their own
 * dedicated snapshot below, so their colours are still covered — deliberately,
 * rather than by whatever the dice rolled.
 *
 * Run immediately before the walk: the interval could otherwise fire in the gap.
 */
function pinLiveState() {
  for (const el of document.querySelectorAll('.sys-readout')) {
    el.classList.remove('elevated', 'critical');
  }
}

/** Runs in the page. Returns a flat map of stable-path -> {prop: rawValue}. */
function walk(props, rootSel) {
  // A stable identity for an element that survives a CSS-only change: its
  // index path from documentElement. Class names would be stabler to read but
  // are exactly what a refactor might touch.
  const pathOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      parts.unshift(`${n.tagName.toLowerCase()}:${[...n.parentElement.children].indexOf(n)}`);
    }
    return parts.join('/') || 'html';
  };
  const root = rootSel ? document.querySelector(rootSel) : document;
  if (!root) throw new Error(`snapshot root not found: ${rootSel}`);
  const els = rootSel ? [root, ...root.querySelectorAll('*')] : [...document.querySelectorAll('*')];
  const out = {};
  for (const el of els) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue;
    const cs = getComputedStyle(el);
    const rec = {};
    for (const p of props) rec[p] = cs.getPropertyValue(p);
    out[pathOf(el)] = rec;
  }
  return out;
}

/**
 * Freeze every transition and animation.
 *
 * Without this the snapshot is not reproducible: a control run of the SAME css
 * twice reported a `.player` span as `rgb(0,240,255)` once and
 * `rgb(239,183,16)` the next — a colour captured mid-transition. Computed
 * colour is a function of *when* you look. A before/after diff would then be
 * full of phantom changes, and the one real regression would be buried in them.
 *
 * Injected into <head>, so it survives SPA route changes.
 */
async function freezeAnimations(page) {
  await page.evaluate(() => {
    if (document.getElementById('snapshot-freeze')) return;
    const s = document.createElement('style');
    s.id = 'snapshot-freeze';
    s.textContent = `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
      caret-color: transparent !important;
    }`;
    document.head.appendChild(s);
  });
}

const views = {};
const record = async (page, view, rootSel = null) => {
  await freezeAnimations(page); // re-assert: some views mount after the last call
  await sleep(250);
  await page.evaluate(pinLiveState); // last thing before the walk — see above
  const data = await page.evaluate(walk, PROPS, rootSel);
  views[view] = data;
  process.stdout.write(`  ${view}: ${Object.keys(data).length} elements\n`);
};

/** Force a `.sys-readout` tier and snapshot only that subtree. */
const recordTier = async (page, tier) => {
  await page.evaluate((t) => {
    const el = document.querySelector('.sys-readout');
    el.classList.remove('elevated', 'critical');
    if (t) el.classList.add(t);
  }, tier);
  await sleep(150);
  await freezeAnimations(page);
  const data = await page.evaluate(walk, PROPS, '.sys-readout');
  const view = `sysreadout-${tier || 'nominal'}`;
  views[view] = data;
  process.stdout.write(`  ${view}: ${Object.keys(data).length} elements\n`);
};

await withBrowser(async (browser) => {
  const page = await openApp(browser, { url: URL, label, record: RECORD_SNAPSHOT, name: NAME });

  // lock + boot come free from signIn's checkpoints
  await signIn(page, NAME, {
    onState: async (state) => {
      if (state === 'entry' || state === 'boot-form' || state === 'dashboard') await record(page, state);
    },
  });

  // ---- glossary modal ----
  await page.click('.gloss-fab');
  await expectSelector(page, '.modal-box', { what: 'glossary modal' });
  await record(page, 'glossary');
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- transaction ledger ----
  await page.click('#op-balance');
  await expectSelector(page, '.modal-box', { what: 'txn ledger modal' });
  await record(page, 'ledger');
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- service record ----
  await clickByText(page, 'button', 'SERVICE RECORD', { what: 'SERVICE RECORD nav' });
  await expectSelector(page, '.record-main', { what: 'service record view' });
  await record(page, 'record');

  // ---- certificate (record is seeded fully certified) ----
  await clickByText(page, 'button', 'VIEW CERTIFICATE', { what: 'VIEW CERTIFICATE button' });
  await expectSelector(page, '#cert-print', { what: 'certificate' });
  await record(page, 'certificate');

  // ---- name prompt (its own root, mounted at App root) ----
  await clickByText(page, 'button', 'EDIT NAME', { what: 'EDIT NAME button' });
  await expectSelector(page, '.nameprompt-scrim', { what: 'name prompt' });
  await record(page, 'nameprompt');
  // One Escape closes the name prompt AND the certificate beneath it. Only
  // reach for CLOSE if the certificate actually survived.
  await page.keyboard.press('Escape');
  await sleep(300);
  if (await page.$('#cert-print')) {
    await clickByText(page, 'button', 'CLOSE', { what: 'certificate CLOSE' });
    await sleep(400);
  }
  await expectSelector(page, '.record-main', { what: 'service record after closing the certificate' });

  // ---- purge confirm (.confirm-scrim, mounted at App root) ----
  await clickByText(page, 'button', 'PURGE LOCAL CACHE', { what: 'PURGE LOCAL CACHE' });
  await expectSelector(page, '.confirm-scrim', { what: 'confirm scrim' });
  await record(page, 'confirm');
  await clickByText(page, 'button', 'CANCEL', { what: 'confirm CANCEL' });
  await sleep(300);

  // ---- radio panel (docked chrome, re-binds roles on its own root) ----
  await page.click('.radio-pill');
  await expectSelector(page, '.radio-panel', { what: 'radio panel' });
  await record(page, 'radio');
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- module player ----
  await clickByText(page, 'button', 'DASHBOARD', { what: 'DASHBOARD nav' });
  await expectSelector(page, '.dash-scroll', { what: 'dashboard' });
  await clickByText(page, 'button', 'PROGRAM', { what: 'BEGIN/RESUME PROGRAM' });
  await expectSelector(page, '.player-wrap', { what: 'module player' });
  await sleep(600);
  await record(page, 'player');

  // The three telemetry tiers, pinned rather than left to Math.random().
  await recordTier(page, null);
  await recordTier(page, 'elevated');
  await recordTier(page, 'critical');
});

const file = path.join(OUT, `${label}.json`);
fs.writeFileSync(file, JSON.stringify(views, null, 1));
const total = Object.values(views).reduce((n, v) => n + Object.keys(v).length, 0);
console.log(`\n${Object.keys(views).length} views, ${total} elements → ${file}`);
