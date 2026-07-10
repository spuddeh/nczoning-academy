// Parity capture — glossary + transaction-history modals. Seeds an m01 record,
// signs in, then drives: glossary open → search → tier filter → Escape, ledger
// open → jump-to-answer. Numeric probes alongside the screenshots.
// See scripts/parity/README.md.
import path from 'node:path';
import { withBrowser, targets, outDir, sleep, signIn, openApp, clickByText } from './lib/drive.mjs';
import { NAME, RECORD_M01 as RECORD } from './lib/fixtures.mjs';

const OUT = outDir('modals', { clean: true });

async function capture(browser, name, base) {
  const page = await openApp(browser, { url: base, label: name, record: RECORD, name: NAME });
  await signIn(page, NAME);

  // ---- glossary ----
  await page.click('.gloss-fab');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-glossary-open.png`) });
  const glossCount = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.childElementCount <= 1 && /^ENTRIES/.test(d.textContent.trim()));
    return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  });
  await page.type('input[placeholder="SEARCH TERMS"]', 'etag');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-glossary-search.png`) });
  await page.evaluate(() => {
    const i = document.querySelector('input[placeholder="SEARCH TERMS"]');
    if (i) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(i, '');
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(200);
  await clickByText(page, 'button', 'PROJECT');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}-glossary-tier.png`) });
  const tierCount = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.childElementCount <= 1 && /^ENTRIES/.test(d.textContent.trim()));
    return el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  });
  await page.keyboard.press('Escape');
  await sleep(300);
  const glossClosed = await page.evaluate(() => ![...document.querySelectorAll('span')].some((s) => s.textContent.trim() === 'FIELD GLOSSARY'));

  // ---- transaction history ----
  await page.click('#op-balance');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}-txn-open.png`) });
  const ledger = await page.evaluate(() => {
    const grab = (re) => [...document.querySelectorAll('div,span')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()).find((t) => re.test(t)) ?? null;
    return {
      ledgerLine: grab(/^LEDGER \[/),
      net: grab(/^NET /),
      rows: [...document.querySelectorAll('button')].filter((b) => /JUMP TO ANSWER/.test(b.textContent)).length,
    };
  });
  // jump from the CORRECT row (m01-q1)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /JUMP TO ANSWER/.test(x.textContent) && /detect when the dataset/.test(x.textContent));
    b?.click();
  });
  await sleep(700); // mid-flash (clears at 1400ms)
  await page.screenshot({ path: path.join(OUT, `${name}-txn-jump.png`) });
  const jump = await page.evaluate(() => {
    const el = document.getElementById('stg-m01-m01-q1');
    const main = document.querySelector('main');
    if (!el || !main) return { found: false };
    return {
      found: true,
      topOffset: Math.round(el.getBoundingClientRect().top - main.getBoundingClientRect().top),
      flash: el.style.boxShadow || '(none)',
    };
  });

  console.log(`[${name}] gloss all: ${glossCount} | project: ${tierCount} | escClosed: ${glossClosed}`);
  console.log(`[${name}] ledger: ${ledger.ledgerLine} | ${ledger.net} | jumpable rows: ${ledger.rows}`);
  console.log(`[${name}] jump: ${JSON.stringify(jump)}`);
  await page.close();
}

await withBrowser(async (browser) => {
  for (const t of targets()) await capture(browser, t.name, t.url);
});
console.log(`done → ${OUT}`);
