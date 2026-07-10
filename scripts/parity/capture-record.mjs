// Parity capture — Service Record view + shard I/O. Seeds an m01 record, signs
// in, then drives: SERVICE RECORD nav → view probes → EJECT (mid + settled) →
// PURGE (confirm → wiped) → SLOT a .shard file (clean record → straight to the
// reader animation) → SLOT again (non-empty → overwrite confirm → cancel).
// Downloads are denied via CDP so ejects don't write files.
// See scripts/parity/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser, targets, outDir, sleep, signIn, openApp, clickByText, leafText } from './lib/drive.mjs';
import { NAME, RECORD_M01 as RECORD } from './lib/fixtures.mjs';

const OUT = outDir();

// The .shard the SLOT step uploads — the same record the app just ejected.
const SHARD_FILE = path.join(OUT, 'seed.shard');
fs.writeFileSync(SHARD_FILE, JSON.stringify(RECORD, null, 2));

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
  const page = await openApp(browser, {
    url: base, label: name, record: RECORD, name: NAME,
    // deny downloads so the EJECT step doesn't litter the filesystem
    beforeGoto: async (p) => {
      const cdp = await p.createCDPSession();
      try { await cdp.send('Page.setDownloadBehavior', { behavior: 'deny' }); } catch { /* older CDP */ }
    },
  });
  await signIn(page, NAME);

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

const browser = await launchBrowser();
for (const t of targets()) await capture(browser, t.name, t.url);
await browser.disconnect();
console.log(`done → ${OUT}`);
