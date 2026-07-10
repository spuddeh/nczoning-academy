// Parity capture — certificate + name prompt + print CSS. Seeds a fully
// CERTIFIED record (all 9 modules incl. the m09 capstone), signs in, then
// drives: SERVICE RECORD → VIEW CERTIFICATE → print-media emulation probe →
// EDIT NAME → clear (ISSUE disabled) → new name → Enter (reissued) → CLOSE.
// See scripts/parity/README.md.
import path from 'node:path';
import { launchBrowser, targets, outDir, sleep, signIn, openApp, clickByText } from './lib/drive.mjs';
import { NAME, RECORD_CERTIFIED as RECORD } from './lib/fixtures.mjs';

const OUT = outDir();

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
  const page = await openApp(browser, { url: base, label: name, record: RECORD, name: NAME });
  await signIn(page, NAME);

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

const browser = await launchBrowser();
for (const t of targets()) await capture(browser, t.name, t.url);
await browser.disconnect();
console.log(`done → ${OUT}`);
