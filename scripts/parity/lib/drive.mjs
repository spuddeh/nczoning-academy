// Shared browser driver for the capture scripts.
//
// This is a general-purpose rig: launch a headless Chrome, seed a record, sign
// in, and probe the running app. It was built to A/B the rebuild against the
// 0.1.0 monolith, and the capture-*.mjs scripts still do that — but nothing
// here is parity-specific. Any script that needs to look at the real app in a
// real browser (computed styles, z-index ladders, overlay geometry) should
// import this rather than copy the boilerplate.
//
// THE RULE THIS FILE EXISTS TO ENFORCE (see #22):
//
//   Every step asserts where it is before acting.
//
// The old inline version did not. When the lock screen landed, its sign-in
// sequence stopped matching the app: it looked for a text input that no longer
// existed, skipped the focus, typed the callsign into the document, and
// screenshotted the lock screen as `rebuild-dashboard.png`. Exit 0. A stale
// driver that returns a plausible screenshot is worse than one that crashes,
// because the screenshot carries the authority of an artefact.
//
// So: if an element we expect is not there, we throw, and we say what we were
// looking for and what we found instead.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.CHROME_DEBUG_PORT ?? 9224);

/**
 * `scripts/parity/out/<bucket>`, created if absent. Gitignored.
 *
 * Each script writes into its own bucket and wipes it on the way in, so a rerun
 * REPLACES its artefacts instead of accumulating them. Two reasons, and the
 * second is the important one:
 *
 *   1. Screenshots are ~150KB each and five scripts × two targets × many states
 *      adds up fast.
 *   2. A leftover PNG from an older run is indistinguishable from one this run
 *      produced. That is the same trap as everything else in #22 — an artefact
 *      that looks like evidence and isn't.
 *
 * Called with no bucket it returns the root (for `chrome-profile`), which is
 * never cleaned.
 */
export function outDir(bucket, { clean = false } = {}) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
  if (clean && !bucket) throw new Error('refusing to clean the out/ root — it holds chrome-profile');
  const dir = bucket ? path.join(root, bucket) : root;
  if (clean) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Which apps to drive.
 *
 * `REBUILD_URL` (default :5173) is always driven. The monolith is driven ONLY
 * when `MONOLITH_URL` is set, because it has to be served out of git history
 * first (`git archive f16bd4f`) and most callers today are not doing parity.
 * It used to default to :4173, which meant every script failed at `goto` for
 * anyone who just wanted to probe the current app.
 */
export function targets() {
  const list = [];
  if (process.env.MONOLITH_URL) list.push({ name: 'monolith', url: process.env.MONOLITH_URL });
  list.push({ name: 'rebuild', url: process.env.REBUILD_URL ?? 'http://localhost:5173/' });
  if (!process.env.MONOLITH_URL) {
    console.log('note: MONOLITH_URL unset — driving the rebuild only. See scripts/parity/README.md to serve the monolith.');
  }
  return list;
}

/** Did WE spawn the Chrome we are attached to? Decides close vs disconnect. */
let weSpawnedChrome = false;

/** Pages this harness opened. Only these are ours to close. */
const ourPages = new Set();

/** A page tracked for teardown. Use instead of `browser.newPage()`. */
export async function newPage(browser) {
  const page = await browser.newPage();
  ourPages.add(page);
  return page;
}

/** Reuse a debug Chrome on PORT if one is up, else launch our own headless. */
async function wsEndpoint() {
  try {
    const r = await fetch(`http://localhost:${PORT}/json/version`);
    return (await r.json()).webSocketDebuggerUrl;
  } catch { /* not running */ }
  spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(outDir(), 'chrome-profile')}`,
    '--window-size=1440,900', '--no-first-run',
    // The app builds an AudioContext on the LOGIN click and starts the radio.
    // Headless Chrome still routes that to the system audio device, so a leaked
    // browser is a radio station playing forever with no window to close.
    '--mute-audio',
  ], { detached: true, stdio: 'ignore' }).unref();
  weSpawnedChrome = true;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch { /* retry */ }
  }
  throw new Error(`headless Chrome did not come up on :${PORT} (CHROME_BIN=${CHROME})`);
}

export async function launchBrowser({ width = 1440, height = 900 } = {}) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: await wsEndpoint(),
    defaultViewport: { width, height },
  });
  // Last line of defence: Ctrl-C, or a throw that escapes even the finally.
  if (weSpawnedChrome) {
    const panic = () => { try { browser.process()?.kill(); } catch { /* already gone */ } };
    process.once('SIGINT', () => { panic(); process.exit(130); });
    process.once('SIGTERM', () => { panic(); process.exit(143); });
  }
  return browser;
}

/**
 * Release the browser.
 *
 * `disconnect()` is NOT enough for one we spawned: it detaches the client and
 * leaves Chrome running with every page open. Each failed capture run leaked a
 * browser that way, and with it a radio station.
 *
 * A Chrome we merely attached to belongs to someone else — disconnect, never
 * close.
 */
export async function closeBrowser(browser) {
  if (!browser) return;
  try {
    if (weSpawnedChrome) {
      await browser.close();
    } else {
      // Someone else's debug Chrome. Close only the pages WE opened — never
      // their tabs — then let go of the browser itself.
      for (const page of ourPages) {
        try { if (!page.isClosed()) await page.close(); } catch { /* already gone */ }
      }
      await browser.disconnect();
    }
  } catch { /* already gone */ }
  ourPages.clear();
}

/**
 * Run `fn(browser)` and tear the browser down however it ends.
 *
 * Use this rather than launch/close by hand. A throw mid-drive is now the
 * EXPECTED behaviour when the app has moved (that is the whole point of the
 * assertions), so the teardown cannot live on the happy path.
 */
export async function withBrowser(fn, opts) {
  const browser = await launchBrowser(opts);
  try {
    return await fn(browser);
  } finally {
    await closeBrowser(browser);
  }
}

// ---------------------------------------------------------------------------
// assertions
// ---------------------------------------------------------------------------

/** What is actually on screen, for an error message a human can act on. */
async function describe(page) {
  return page.evaluate(() => {
    const live = (b) => !b.disabled;
    return {
      url: location.pathname,
      roots: ['lock-screen', 'boot-screen', 'dash-scroll', 'player-wrap', 'record-main']
        .filter((c) => document.querySelector(`.${c}`)),
      buttons: [...document.querySelectorAll('button')].filter(live)
        .map((b) => b.textContent.trim().slice(0, 24)).slice(0, 12),
      inputs: [...document.querySelectorAll('input')].map((i) => `${i.type || 'text'}[${i.placeholder ?? ''}]`),
    };
  });
}

export class DriveError extends Error {}

async function fail(page, what) {
  const seen = await describe(page);
  throw new DriveError(`${what}\n  page state: ${JSON.stringify(seen, null, 2).replace(/\n/g, '\n  ')}`);
}

/** Wait for `selector`, or throw with a dump of what was there instead. */
export async function expectSelector(page, selector, { timeout = 10000, what } = {}) {
  try {
    return await page.waitForSelector(selector, { timeout, visible: true });
  } catch {
    return fail(page, `${what ?? 'expected element'} not found: ${selector} (waited ${timeout}ms)`);
  }
}

/** Click the first `selector` whose text contains `txt`. Throws if absent. */
export async function clickByText(page, selector, txt, { what } = {}) {
  const hit = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find(
      (x) => !x.disabled && x.textContent.trim().includes(t),
    );
    if (!el) return false;
    el.click();
    return true;
  }, selector, txt);
  if (!hit) await fail(page, `${what ?? 'click target'} not found: ${selector} containing "${txt}"`);
  return true;
}

/**
 * Text of the first leaf element (no element children) whose trimmed text
 * matches `reSrc`. Tolerant of the monolith's inline-styled markup.
 * Returns null when absent — callers probe for presence, so this does not throw.
 */
export const leafText = (page, reSrc) => page.evaluate((src) => {
  const re = new RegExp(src);
  const el = [...document.querySelectorAll('div,span')].find(
    (d) => d.childElementCount === 0 && re.test(d.textContent.trim()),
  );
  return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
}, reSrc);

// ---------------------------------------------------------------------------
// driving the app
// ---------------------------------------------------------------------------

/**
 * Install the seed BEFORE the app's first document runs, via
 * `evaluateOnNewDocument` — it executes on the new document, on the right
 * origin, ahead of any page script.
 *
 * Why not `goto` then `page.evaluate`: `localStorage` needs an origin, so the
 * obvious order is to navigate first and write after. But the app has already
 * read its record into memory by then. The debug Chrome also reuses ONE profile
 * across runs, so `localStorage` survives between scripts. Together that means
 * a capture could run against whatever record the previous script happened to
 * leave behind. Observed directly: an unseeded `capture.mjs` rendered a "fresh"
 * dashboard showing 1400 eddies and 1/9 progress.
 *
 * Seeding here makes the rebuild deterministic — verified: `RECORD_CERTIFIED`
 * yields 9/9 modules and an enabled VIEW CERTIFICATE.
 *
 * Do NOT "fix" this by reloading after writing. That was tried; it does not help.
 *
 * KNOWN LIMITATION (monolith only): the archived monolith does not pick up a
 * seeded certified record even installed this early — it still boots at 1/9.
 * Its persistence semantics were not reverse-engineered, on purpose: it is
 * frozen at f16bd4f and nothing will ship against it. See README.md.
 *
 * Pass `record: null` to start the app from an empty record.
 */
export async function installState(page, record, name) {
  await page.evaluateOnNewDocument((rec, nm) => {
    try {
      localStorage.clear();
      if (rec) {
        localStorage.setItem(`ncza:v1:progress:${nm}`, JSON.stringify(rec));
        localStorage.setItem('ncza:v1:lastUser', nm);
      }
    } catch { /* opaque origin (about:blank) — nothing to seed */ }
  }, record ?? null, name);
}

/** The callsign field. Same placeholder in the rebuild and the monolith. */
const CALLSIGN = 'input[placeholder="e.g. S. DORSETT"], input[type="text"]';

/**
 * Which entry flow is this app on? Exactly two are known:
 *
 *   'lock'  — current: `/` is `.lock-screen`; LOGIN opens `/boot`.
 *   'boot'  — the 0.1.0 monolith: `/` IS the boot screen, typewriter first.
 *
 * The monolith's roots are inline-styled and carry no class names at all, so
 * it cannot be identified by a selector — only by the callsign field appearing
 * once the typewriter is skipped. Anything else is a third state we do not
 * understand, and we refuse to guess at it.
 */
async function detectFlow(page) {
  if (await page.waitForSelector('.lock-screen', { timeout: 4000 }).catch(() => null)) return 'lock';
  if (await page.$('.boot-screen')) return 'boot';

  // No known root. Could be the monolith mid-typewriter — prove it by skipping.
  await page.keyboard.press('Space');
  if (await page.waitForSelector(CALLSIGN, { timeout: 6000 }).catch(() => null)) return 'boot';

  return fail(page, 'no known entry flow: expected .lock-screen, .boot-screen, or a callsign field after skipping a typewriter');
}

/**
 * Drive from a freshly-loaded page to the dashboard, asserting each step.
 * Handles both known entry flows, so one script drives the rebuild and the
 * archived monolith. Returns the flow it took.
 *
 * `onState` is awaited at each named checkpoint — 'entry', 'boot-typing',
 * 'boot-form', 'welcome', 'dashboard'. That is how capture.mjs screenshots the
 * intermediate states WITHOUT re-implementing the flow. There is exactly one
 * definition of how you get into this app, and it is here. When the entry flow
 * changes again, this function is the only thing that changes.
 */
export async function signIn(page, name, { onState = async () => {} } = {}) {
  const flow = await detectFlow(page);
  await onState('entry', flow);

  if (flow === 'lock') {
    // The LOGIN click is also the audio-unlock gesture — don't bypass it.
    await clickByText(page, 'button', 'LOGIN', { what: 'lock screen LOGIN button' });
    await expectSelector(page, '.boot-screen', { what: 'boot screen after LOGIN' });
    await sleep(300);
  }
  await onState('boot-typing', flow);

  await page.keyboard.press('Space'); // any key skips the typewriter; idempotent
  const input = await expectSelector(page, CALLSIGN, { what: 'callsign field on the boot screen' });
  await sleep(400);
  await onState('boot-form', flow);

  await input.focus();
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type(name);

  // Both flows carry this button; the monolith also accepts Enter.
  await clickByText(page, 'button', 'ACCESS TERMINAL', { what: 'ACCESS TERMINAL button' });
  await sleep(500);
  await onState('welcome', flow); // mid 1.7s welcome readout

  await expectSelector(page, '.app-header', { timeout: 15000, what: 'app header after sign-in' });
  await expectSelector(page, '.dash-scroll', { timeout: 15000, what: 'dashboard after sign-in' });
  await sleep(1200); // dashboard settles
  await onState('dashboard', flow);
  return flow;
}

/**
 * Open a page with `record` already in storage, and load the app.
 *
 * Does NOT sign in — call `signIn(page, name)` next. capture.mjs wants the
 * intermediate sign-in states, so the two steps stay separate.
 *
 * `beforeGoto(page)` runs after the page exists but before navigation, for
 * things like a CDP session (see capture-record.mjs denying downloads).
 */
export async function openApp(browser, { url, label, record = null, name, beforeGoto }) {
  const page = await newPage(browser);
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${label}] console error: ${m.text().slice(0, 300)}`);
  });
  if (beforeGoto) await beforeGoto(page);
  await installState(page, record, name);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  return page;
}
