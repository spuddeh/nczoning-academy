// Horizontal-overflow audit at a phone viewport. Written for #5, where the
// report was "you can't see the buttons without scrolling sideways" and the
// first guess (227 hardcoded spacing literals) was wrong.
//
//   npm run dev
//   node scripts/parity/overflow-audit.mjs before
//   ...change the CSS...
//   node scripts/parity/overflow-audit.mjs after
//
// WHY A PROBE AND NOT A SCREENSHOT. `body { overflow: hidden }` and
// `.lock-screen { overflow-x: hidden }` CLIP the overflow rather than let it
// scroll, so an element 218px past the right edge looks, in a screenshot,
// exactly like an element that was designed to end at the edge. The bug is only
// visible to a measurement. This is the same lesson as the style differ: the
// artefact that looks like evidence is the dangerous one.
//
// WHAT COUNTS AS AN OFFENDER. An element at least partly inside the viewport
// whose border box crosses an edge, and which is not inside one of the handful
// of containers listed below as sideways scrollers ON PURPOSE.
//
// That list is hand-written, and it has to be. The first version of this probe
// inferred intent from computed `overflow-x: auto|scroll`, which looks rigorous
// and is not: `overflow-y: auto` makes `overflow-x` COMPUTE to `auto` on the
// same element, so every vertical scroller in the app — `.record-main`,
// `.gloss-body`, `.cert-scrim` — read as a deliberate horizontal scroller. It
// pardoned the certificate overflowing by 165px and reported the view clean.
// An allowlist is a claim about intent, which is the thing being asserted; a
// computed value is not. `overflow-x: hidden` is likewise NOT an excuse —
// silently clipping the overflow is the bug, not the fix.
import fs from 'node:fs';
import path from 'node:path';
import {
  withBrowser, openApp, signIn, outDir, sleep, clickByText, expectSelector, DriveError,
} from './lib/drive.mjs';
import { NAME, RECORD_SNAPSHOT } from './lib/fixtures.mjs';

const label = process.argv[2];
if (!label) {
  console.error('usage: node scripts/parity/overflow-audit.mjs <label>');
  process.exit(1);
}
const OUT = outDir('overflow');
const URL = process.env.REBUILD_URL ?? 'http://localhost:5173/';

/** iPhone 14 Pro CSS pixels: the viewport the issue was reported against. */
const WIDTH = Number(process.env.PROBE_WIDTH ?? 390);
const HEIGHT = Number(process.env.PROBE_HEIGHT ?? 844);

/** Sub-pixel slack: a 389.6px box in a 390px viewport is not a bug. */
const SLACK = 1;

/**
 * Containers whose contents scroll sideways deliberately. Anything inside one
 * of these is excused; the container itself still has to fit.
 *
 * Keep this short and keep it justified. Every entry is a decision that a
 * reader will be asked to swipe:
 *   .chunk-table-wrap  a data table at its `min-width: 420px` floor
 *   .chunk-code-pre    a code block that must not re-wrap
 *   .lab-json          a raw API response, likewise
 *   .hdr-nav           the phone header nav, scrolled rather than wrapped
 *   .shard-stage       an animation stage: the chip ends its travel 20px past
 *                      the stage edge, and .shard-reader's lip sits 2px past
 *                      its own, both clipped by .shard-stage-wrap on purpose
 *   .radio-track-window  a 96px marquee window; the track title is MEANT to be
 *                      wider than it and bounce (see applyMarquee)
 *   .complete-wrap     holds the CERTIFIED stamp, which is rotated 3°. A
 *                      rotated box's bounding box grows by its own height ×
 *                      sin(angle) no matter where the origin is — 2px here.
 *                      That is a paint artefact of the tilt, not a clip.
 */
const INTENTIONAL_X_SCROLLERS = [
  '.chunk-table-wrap', '.chunk-code-pre', '.lab-json', '.hdr-nav', '.shard-stage',
  '.radio-track-window', '.complete-wrap',
];

/** Runs in the page. Returns { viewport, root, scrollers, offenders }. */
function measure(slack, allowed) {
  const vw = document.documentElement.clientWidth;

  const idOf = (el) => {
    const cls = [...el.classList].join('.');
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}`;
  };

  const offenders = [];
  const scrollers = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // not rendered

    // CONTENT wider than its own box, which the rect test below cannot see: a
    // heading whose one long word outgrows its column keeps a border box that
    // fits perfectly while the word is clipped or pushed into a sideways
    // scroll. That is what "OPERATOR DASHBOAR" looked like on a 390px screen —
    // invisible to a rect check, obvious in a screenshot.
    const over = el.scrollWidth - el.clientWidth;
    if (over > slack) {
      const cs = getComputedStyle(el);
      const excused = allowed.some((s) => el.matches(s) || el.closest(s))
        // an ellipsis is a deliberate, legible truncation, not a clipped word
        || cs.textOverflow === 'ellipsis';
      scrollers.push({
        el: idOf(el), scrollWidth: Math.round(el.scrollWidth), clientWidth: Math.round(el.clientWidth),
        over: Math.round(over), overflowX: cs.overflowX, excused,
      });
    }

    // Parked entirely off-screen, so nothing of it is cut off: the closed
    // off-canvas rail sits at translateX(-100%) and is not a bug.
    if (r.right <= 0 || r.left >= vw) continue;

    const past = Math.round(Math.max(r.right - vw, -r.left));
    if (past <= slack) continue;

    // Clipped by a DECLARED TRUNCATION. A `text-overflow: ellipsis` ancestor
    // has already said "this may be cut, and it will say so with an ellipsis" —
    // the span inside it is not visible past the edge, and the ancestor itself
    // is measured separately. Note this is not the same as excusing any
    // `overflow: hidden` ancestor: the lock screen's bug was exactly that, a
    // silent clip with nothing to signal it, and it must still be reported.
    let truncated = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).textOverflow === 'ellipsis') { truncated = true; break; }
    }
    if (truncated) continue;

    const holder = allowed.map((s) => el.parentElement?.closest(s)).find(Boolean);
    offenders.push({
      el: idOf(el),
      left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
      past,
      allowedBy: holder ? idOf(holder) : null, // non-null => scrolls on purpose
    });
  }

  const de = document.documentElement;
  return {
    viewport: vw,
    root: { scrollWidth: Math.round(de.scrollWidth), clientWidth: Math.round(de.clientWidth) },
    scrollers,
    offenders: offenders.sort((a, b) => b.past - a.past),
  };
}

const states = {};
const record = async (page, state) => {
  await sleep(250);
  const data = await page.evaluate(measure, SLACK, INTENTIONAL_X_SCROLLERS);
  states[state] = data;
  const real = data.offenders.filter((o) => !o.allowedBy);
  const clipped = data.scrollers.filter((s) => !s.excused);
  const excused = data.offenders.length - real.length;
  const worst = real[0] ? ` worst ${real[0].el} +${real[0].past}px` : '';
  process.stdout.write(
    `  ${state.padEnd(16)} ${String(real.length).padStart(3)} offenders`
    + ` ${String(clipped.length).padStart(3)} clipped`
    + `${excused ? ` (${excused} excused)` : ''}`
    + ` root ${data.root.scrollWidth}px/${data.viewport}px${worst}\n`,
  );
  for (const c of clipped) {
    process.stdout.write(`      clipped: ${c.el} content ${c.scrollWidth}px in ${c.clientWidth}px (+${c.over}, overflow-x: ${c.overflowX})\n`);
  }
};

/**
 * Click whichever of `selectors` is actually visible.
 *
 * The app swaps chrome between desktop and phone (`.gloss-fab` hides at ≤640px
 * and `.gloss-hdr` takes over), so a probe that hardcodes one of them drives
 * fine at 1440px and silently does nothing at 390px. Asserting on visibility is
 * the #22 rule applied to a responsive DOM.
 */
async function clickVisible(page, selectors, what) {
  const hit = await page.evaluate((sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el && el.getClientRects().length) { el.click(); return s; }
    }
    return null;
  }, selectors);
  if (!hit) throw new DriveError(`${what}: none of ${selectors.join(', ')} was visible at ${WIDTH}px`);
  return hit;
}

/** Escape, then assert the overlay actually went away before moving on. */
async function dismiss(page, selector, what) {
  await page.keyboard.press('Escape');
  await sleep(350);
  if (await page.$(selector)) throw new DriveError(`${what} did not close on Escape: ${selector}`);
}

await withBrowser(async (browser) => {
  const page = await openApp(browser, {
    url: URL,
    label,
    record: RECORD_SNAPSHOT,
    name: NAME,
    // EJECT SHARD triggers a real download. Deny it: a headless run should not
    // litter the machine, and Chrome's download shelf is not part of the layout.
    beforeGoto: async (p) => {
      const cdp = await p.createCDPSession();
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' });
    },
  });

  // lock + boot come free from signIn's checkpoints
  await signIn(page, NAME, {
    onState: async (state) => {
      if (state === 'entry') await record(page, 'lock');
      if (state === 'boot-form') await record(page, 'boot');
      if (state === 'dashboard') await record(page, 'dashboard');
    },
  });

  // ---- glossary modal (FAB on desktop, header button on a phone) ----
  await clickVisible(page, ['.gloss-hdr', '.gloss-fab'], 'glossary opener');
  await expectSelector(page, '.modal-box', { what: 'glossary modal' });
  await record(page, 'glossary');
  await dismiss(page, '.modal-scrim', 'glossary modal');

  // ---- transaction ledger ----
  await page.click('#op-balance');
  await expectSelector(page, '.modal-box.gold', { what: 'txn ledger modal' });
  await record(page, 'ledger');
  await dismiss(page, '.modal-scrim', 'ledger modal');

  // ---- course revision log (#74) ----
  // Opened from the dashboard's version chip; the RE-RUN button beside a module
  // title is the widest thing in it, which is why it stacks below 640px.
  await page.click('.course-chip.link');
  await expectSelector(page, '.clog-body', { what: 'course revision log modal' });
  await record(page, 'changelog');
  await dismiss(page, '.modal-scrim', 'course revision log modal');

  // ---- broadcast popover ----
  await page.click('.hdr-bell');
  await expectSelector(page, '.broadcast-pop', { what: 'broadcast popover' });
  await record(page, 'broadcast');
  await page.click('.broadcast-pop-backdrop');
  await sleep(300);

  // ---- radio panel ----
  await page.click('.radio-pill');
  await expectSelector(page, '.radio-panel', { what: 'radio panel' });
  await record(page, 'radio-panel');
  // The panel has no Escape handler: it minimises back to the pill by button.
  await page.click('.radio-minimize');
  await expectSelector(page, '.radio-pill', { what: 'radio pill after minimising the panel' });

  // ---- service record ----
  await clickByText(page, 'button', 'SERVICE RECORD', { what: 'SERVICE RECORD nav' });
  await expectSelector(page, '.record-main', { what: 'service record view' });
  await record(page, 'record');

  // ---- certificate + name prompt (the record is seeded fully certified) ----
  await clickByText(page, 'button', 'VIEW CERTIFICATE', { what: 'VIEW CERTIFICATE button' });
  await expectSelector(page, '#cert-print', { what: 'certificate' });
  await record(page, 'certificate');
  await clickByText(page, 'button', 'EDIT NAME', { what: 'EDIT NAME button' });
  await expectSelector(page, '.nameprompt-scrim', { what: 'name prompt' });
  await record(page, 'nameprompt');
  // One Escape closes the prompt AND the certificate under it; only reach for
  // CLOSE if the certificate actually survived.
  await page.keyboard.press('Escape');
  await sleep(300);
  if (await page.$('#cert-print')) {
    await clickByText(page, 'button', 'CLOSE', { what: 'certificate CLOSE' });
    await sleep(400);
  }
  await expectSelector(page, '.record-main', { what: 'service record after closing the certificate' });

  // ---- shard eject overlay ----
  await clickByText(page, 'button', 'EJECT SHARD', { what: 'EJECT SHARD button' });
  await expectSelector(page, '.shard-scrim', { what: 'shard overlay' });
  await record(page, 'shard');
  await clickByText(page, 'button', 'CLOSE', { what: 'shard overlay CLOSE' }).catch(() => {});
  await sleep(400);

  // ---- purge confirm ----
  await clickByText(page, 'button', 'PURGE LOCAL CACHE', { what: 'PURGE LOCAL CACHE' });
  await expectSelector(page, '.confirm-scrim', { what: 'confirm scrim' });
  await record(page, 'confirm');
  await clickByText(page, 'button', 'CANCEL', { what: 'confirm CANCEL' });
  await sleep(300);

  // ---- module player ----
  // The seeded record has every module certified with revealedBy above the
  // stage count, so opening one reveals ALL stages at once: hook, objectives,
  // chunk (incl. the wide table), lab, quiz, scenario, recap and complete are
  // in the DOM together and one measurement covers the lot.
  await clickByText(page, 'button', 'DASHBOARD', { what: 'DASHBOARD nav' });
  await expectSelector(page, '.dash-scroll', { what: 'dashboard' });
  await clickByText(page, 'button', 'PROGRAM', { what: 'BEGIN/RESUME PROGRAM' });
  await expectSelector(page, '.player-wrap', { what: 'module player' });
  await expectSelector(page, '.complete-wrap', { what: 'the completion stage (all stages revealed)' });
  await sleep(600);
  await record(page, 'player');

  // ---- player rail drawer (a phone-only mode; on desktop the rail is fixed) ----
  const railToggle = await page.evaluate(() => {
    const el = document.querySelector('.rail-toggle');
    if (!el || !el.getClientRects().length) return false;
    el.click();
    return true;
  });
  if (railToggle) {
    await expectSelector(page, '.player-rail.open', { what: 'player rail drawer' });
    await sleep(400);
    await record(page, 'player-drawer');
  } else {
    process.stdout.write('  player-drawer      skipped (rail toggle is hidden above 640px)\n');
  }
}, { width: WIDTH, height: HEIGHT });

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

const file = path.join(OUT, `${label}.json`);
fs.writeFileSync(file, JSON.stringify({ width: WIDTH, height: HEIGHT, states }, null, 1));

const rows = Object.entries(states).map(([state, d]) => {
  const real = d.offenders.filter((o) => !o.allowedBy);
  const clipped = d.scrollers.filter((s) => !s.excused);
  return { state, real, clipped, root: d.root };
});
const total = rows.reduce((n, r) => n + r.real.length + r.clipped.length, 0);

console.log(`\n## Overflow at ${WIDTH}x${HEIGHT} (${label})\n`);
console.log('| State | Past the edge | Clipped content | Worst |');
console.log('| --- | --- | --- | --- |');
for (const r of rows) {
  const worst = r.real[0] ? `\`${r.real[0].el}\` +${r.real[0].past}px`
    : r.clipped[0] ? `\`${r.clipped[0].el}\` content +${r.clipped[0].over}px` : '-';
  console.log(`| ${r.state} | ${r.real.length ? `**${r.real.length}**` : '0'}`
    + ` | ${r.clipped.length ? `**${r.clipped.length}**` : '0'} | ${worst} |`);
}
console.log(`\n${total} finding(s) across ${rows.length} states → ${file}`);

// Non-zero exit is the point: a fixed app should be able to gate on this.
if (total > 0) process.exitCode = 1;
