// Regression guard for #22: the driver must REFUSE to proceed on a page it
// does not recognise, rather than screenshotting whatever is on screen.
//
// This is the check that would have caught the stale drive loop. It needs no
// server — it drives a data: URL that is definitely not the app.
//
//   node scripts/parity/selftest.mjs
import { launchBrowser, signIn, DriveError } from './lib/drive.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
let failures = 0;

await page.goto('data:text/html,<h1>definitely not the academy</h1>');
try {
  await signIn(page, 'S. DORSETT');
  console.log('FAIL  signIn() returned on a page that is not the app');
  failures++;
} catch (e) {
  if (e instanceof DriveError) {
    console.log('PASS  signIn() threw DriveError on an unrecognised page');
    console.log(`      ${e.message.split('\n')[0]}`);
  } else {
    console.log(`FAIL  signIn() threw ${e.constructor.name}, expected DriveError`);
    failures++;
  }
}

await page.close();
await browser.disconnect();
console.log(failures ? `\n${failures} failure(s)` : '\nselftest ok');
process.exitCode = failures ? 1 : 0;
