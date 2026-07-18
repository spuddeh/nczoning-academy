// Regression guard for #22: the driver must REFUSE to proceed on a page it does
// not recognise, rather than screenshotting whatever is on screen, and it must
// not leave a browser behind when it refuses.
//
// This is the check that would have caught the stale drive loop. It needs no
// server: it drives a data: URL that is definitely not the app.
//
//   npm run harness:selftest
import { withBrowser, newPage, signIn, DriveError } from './lib/drive.mjs';

let failures = 0;
const check = (ok, msg, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) failures++;
};

// withBrowser's finally tears the browser down even though signIn throws inside.
await withBrowser(async (browser) => {
  const page = await newPage(browser);
  await page.goto('data:text/html,<h1>definitely not the academy</h1>');
  try {
    await signIn(page, 'S. DORSETT');
    check(false, 'signIn() returned on a page that is not the app');
  } catch (e) {
    check(e instanceof DriveError,
      `signIn() threw ${e.constructor.name} on an unrecognised page`,
      e instanceof DriveError ? e.message.split('\n')[0] : 'expected a DriveError');
  }
});

console.log(failures ? `\n${failures} failure(s)` : '\nselftest ok');
process.exitCode = failures ? 1 : 0;
