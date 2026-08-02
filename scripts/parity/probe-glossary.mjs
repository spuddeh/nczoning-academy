// Probe: glossary declassification + the field-notes footer (issue #65).
//
// Drives the real app from an EMPTY record and asserts the gate at each step:
// a fresh operator sees a mostly-classified index; opening m01 declassifies
// exactly the terms m01 introduces and no more; the field-notes stage renders;
// a classified term is not reachable by searching its definition text.
//
// Run: npm run dev, then `node scripts/parity/probe-glossary.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import {
  closeBrowser, expectSelector, launchBrowser, openApp, signIn, sleep, outDir,
} from './lib/drive.mjs';
import { NAME, RECORD_M01 } from './lib/fixtures.mjs';

// The first module's id, from the course rather than spelled 'm01': a second
// course numbers its modules differently (d01..), and a hardcoded id navigates
// to a route that does not exist while every assertion reports the wrong cause.

const APP = process.env.REBUILD_URL ?? 'http://localhost:5173/';
// Which course the app will actually load, so the probe's expectations come
// from the same file the shell renders. Read from config.js rather than
// hardcoded: with a second course in the repo, a hardcoded id silently checks
// data-api's glossary against whatever course is on screen, and every
// assertion fails for the wrong reason. Override with COURSE=<id> to probe
// another one without editing config.
const CONFIG = fs.readFileSync(new URL('../../public/config.js', import.meta.url), 'utf8');
const COURSE_ID = process.env.COURSE ?? CONFIG.match(/course:\s*"([a-z0-9-]+)"/)?.[1] ?? 'data-api';
const OUT = outDir(`glossary-${COURSE_ID}`, { clean: true });
const course = JSON.parse(fs.readFileSync(new URL(`../../public/courses/${COURSE_ID}.json`, import.meta.url), 'utf8'));
const FIRST = course.modules[0].id;
// The legacy shard fixture is keyed on a module id. Re-key it onto whichever
// module is first in THIS course, so the backfill check exercises the same
// pre-modulesSeen path for any course.
const seedRecord = {
  ...RECORD_M01,
  moduleDone: { [FIRST]: true },
  revealedBy: { [FIRST]: course.modules[0].fieldNotes.glossaryTerms.length },
};

const fail = [];
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        want ${JSON.stringify(want)}\n        got  ${JSON.stringify(got)}`}`);
  if (!ok) fail.push(name);
};

/** Read the glossary modal's counts and row states. */
const readGlossary = (page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll('.gloss-card')].map((c) => ({
    term: c.querySelector('.gloss-term')?.textContent ?? '',
    locked: c.classList.contains('locked'),
  }));
  const firstLocked = rows.findIndex((r) => r.locked);
  const lastOpen = rows.map((r) => r.locked).lastIndexOf(false);
  return {
    count: document.querySelector('.gloss-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    total: rows.length,
    open: rows.filter((r) => !r.locked).map((r) => r.term).sort(),
    locked: rows.filter((r) => r.locked).length,
    // true when every readable row precedes every redacted one
    grouped: firstLocked === -1 || lastOpen === -1 || lastOpen < firstLocked,
  };
});

const openGlossary = async (page) => {
  await page.evaluate(() => document.querySelector('.gloss-fab, .gloss-hdr')?.click());
  await expectSelector(page, '.gloss-body', { what: 'glossary modal' });
  await sleep(250);
};
const closeGlossary = async (page) => {
  await page.keyboard.press('Escape');
  await sleep(250);
};

const browser = await launchBrowser();
try {
  const page = await openApp(browser, { url: APP, label: 'gloss', record: null, name: 'PROBE' });
  await signIn(page, 'PROBE');

  // ---- 1. fresh operator: nothing opened, so nothing declassified ----
  await openGlossary(page);
  const fresh = await readGlossary(page);
  console.log(`\n  fresh: ${fresh.count}`);
  check('fresh operator has 0 unlocked terms', fresh.open.length, 0);
  check('every entry still renders as a row', fresh.total, course.glossary.length);
  check('redacted rows are redacted', [...new Set(fresh.open)], []);
  await page.screenshot({ path: path.join(OUT, '1-fresh-classified.png') });

  // a classified definition must not be searchable
  await page.evaluate(() => {
    const el = document.querySelector('.gloss-search input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, 'envelope');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);
  const searched = await readGlossary(page);
  check('classified entries are not searchable', searched.total, 0);
  await page.evaluate(() => {
    const el = document.querySelector('.gloss-search input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await closeGlossary(page);

  // ---- 2. open m01: its terms declassify, and only its terms ----
  await page.goto(`${APP.replace(/\/$/, '')}/module/${FIRST}`, { waitUntil: 'networkidle2' });
  await expectSelector(page, '.player-wrap', { what: 'module player' });
  await sleep(900);

  const m01Terms = course.modules[0].fieldNotes.glossaryTerms;
  const flash = await page.evaluate(() => {
    const el = document.querySelector('.gloss-fab.declass, .gloss-hdr.declass');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  console.log(`\n  declassification flash: ${JSON.stringify(flash)}`);
  check('opening m01 flashes the declassification badge', /\+\d+ DECLASSIFIED|\+\d+/.test(flash ?? ''), true);
  await page.screenshot({ path: path.join(OUT, '2-declass-flash.png') });

  await openGlossary(page);
  const afterM01 = await readGlossary(page);
  console.log(`  after m01: ${afterM01.count}`);
  check('m01 declassifies exactly its own terms', afterM01.open, [...m01Terms].sort());
  check('the rest stay classified', afterM01.locked, course.glossary.length - m01Terms.length);
  check('readable entries sort above the classified tail', afterM01.grouped, true);
  await page.screenshot({ path: path.join(OUT, '3-after-m01.png') });
  await closeGlossary(page);

  // ---- 3. the field-notes stage renders at the module footer ----
  // A SECOND page, seeded with the legacy m01-certified shard: a completed
  // module reveals every stage, so the footer is reachable without answering
  // the quiz. RECORD_M01 predates modulesSeen, so this doubles as the
  // backfill check: a returning operator must not lose earned terms.
  const seeded = await openApp(browser, { url: APP, label: 'seeded', record: seedRecord, name: NAME });
  await signIn(seeded, NAME);
  await seeded.goto(`${APP.replace(/\/$/, '')}/module/${FIRST}`, { waitUntil: 'networkidle2' });
  await expectSelector(seeded, '.player-wrap', { what: 'module player (seeded)' });
  await sleep(1200);

  await openGlossary(seeded);
  const legacy = await readGlossary(seeded);
  console.log(`\n  legacy shard: ${legacy.count}`);
  check('a pre-modulesSeen shard backfills its earned terms', legacy.open, [...m01Terms].sort());
  await closeGlossary(seeded);

  const fn = await seeded.evaluate(() => {
    const block = document.querySelector('.fn-terms');
    return {
      present: !!document.querySelector('.fn-label'),
      terms: block ? [...block.querySelectorAll('.fn-term')].map((b) => b.textContent.trim()) : [],
      links: [...document.querySelectorAll('.fn-link')].length,
    };
  });
  console.log(`\n  field notes: ${fn.terms.length} terms, ${fn.links} links`);
  check('field-notes stage renders', fn.present, true);
  check('field notes list the module terms', fn.terms, m01Terms);
  check('field notes render further reading + citations', fn.links > 0, true);
  await seeded.evaluate(() => document.querySelector('.fn-label')?.scrollIntoView({ block: 'center' }));
  await sleep(400);
  await seeded.screenshot({ path: path.join(OUT, '4-field-notes.png') });

  // ---- 4. a term chip opens the glossary ----
  await seeded.evaluate(() => document.querySelector('.fn-term')?.click());
  await sleep(400);
  const opened = await seeded.evaluate(() => !!document.querySelector('.gloss-body'));
  check('a field-notes term chip opens the glossary', opened, true);

  // ---- 5. phone: the header badge must survive the dropped GLOSSARY label ----
  await seeded.keyboard.press('Escape');
  await seeded.setViewport({ width: 390, height: 844 });
  await sleep(600);
  await seeded.evaluate(() => document.querySelector('.fn-label')?.scrollIntoView({ block: 'start' }));
  await sleep(400);
  await seeded.screenshot({ path: path.join(OUT, '5-field-notes-390.png') });
  const overflow = await seeded.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  check('field notes do not overflow a 390px viewport', overflow.doc <= overflow.win, true);

  await openGlossary(seeded);
  await seeded.screenshot({ path: path.join(OUT, '6-glossary-390.png') });
  const glossOverflow = await seeded.evaluate(() => {
    const el = document.querySelector('.gloss-body');
    return el ? el.scrollWidth <= el.clientWidth : false;
  });
  check('the glossary does not overflow a 390px viewport', glossOverflow, true);

  console.log(`\nscreenshots: ${OUT}`);
} finally {
  await closeBrowser(browser);
}

if (fail.length) {
  console.error(`\n${fail.length} check(s) failed: ${fail.join(', ')}`);
  process.exit(1);
}
console.log('\nall checks passed.');
