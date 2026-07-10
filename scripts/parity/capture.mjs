// Parity capture — boot states + dashboard. Drives each target through the
// same headless Chrome at the same viewport and input sequence.
// See scripts/parity/README.md.
import path from 'node:path';
import { withBrowser, targets, outDir, signIn, openApp } from './lib/drive.mjs';
import { NAME } from './lib/fixtures.mjs';

const OUT = outDir('boot', { clean: true });

async function capture(browser, { name, url }) {
  // record: null — this capture seeds nothing and must start from an empty record
  const page = await openApp(browser, { url, label: name, record: null, name: NAME });

  // signIn drives; we just photograph each checkpoint it announces. The 'entry'
  // shot is the lock screen on the rebuild and the boot typewriter on the
  // monolith — they are different surfaces, and that is the point.
  const flow = await signIn(page, NAME, {
    onState: (state) => page.screenshot({ path: path.join(OUT, `${name}-${state}.png`) }),
  });

  console.log(`[${name}] captured (${flow} flow)`);
  await page.close();
}

await withBrowser(async (browser) => {
  for (const t of targets()) await capture(browser, t);
});
console.log(`done → ${OUT}`);
