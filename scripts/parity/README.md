# Browser harness

A headless-Chrome **computed-style differ** for proving a CSS refactor changed
nothing visible, plus the small driver (`lib/drive.mjs`) it is built on.

Despite the folder name, `lib/drive.mjs` is a general rig: launch Chrome, seed a
record, sign in, probe the running app. Use it for anything that needs the real
app in a real browser: computed styles, z-index ladders, overlay geometry,
before/after snapshots for a refactor. It was originally built to prove the React
rebuild against the 0.1.0 monolith; that job is done (the monolith is frozen at
`f16bd4f` and the rebuild has diverged on purpose), and the monolith-pairing
capture scripts have been retired. What remains is the differ and the driver.

## The rule this harness exists to keep

**Every step asserts where it is before acting.** If an expected element is not
there, `signIn`/`clickByText`/`expectSelector` throw a `DriveError` naming what
they wanted and dumping what was actually on the page.

This is not politeness. Before #22 the sign-in sequence had gone stale: it
looked for a text input the lock screen no longer had, typed the callsign into
the document, and screenshotted the lock screen as `rebuild-dashboard.png`.
Exit 0, four PNGs, no warning. A stale driver that emits a plausible screenshot
is worse than one that crashes, because the screenshot carries the authority of
an artefact, and artefacts are what settle a parity claim.

`npm run harness:selftest` is the regression guard: it drives a page that is
definitely not the app and asserts the driver refuses to proceed. It needs no
server.

## Proving a CSS refactor changed nothing

Screenshots cannot settle "pure refactor, zero visual change": you cannot eyeball
25,000 property values, and a modal nobody opened is not in the picture.

```bash
npm run dev                                        # rebuild on :5173
node scripts/parity/snapshot-styles.mjs before     # before the change
# ...change the CSS...
node scripts/parity/snapshot-styles.mjs after
node scripts/parity/compare-styles.mjs before after   # exit 0 = identical
npm run harness:clean                              # delete out/ (incl. chrome-profile)
```

`snapshot-styles.mjs` drives 14 view states (lock, boot, dashboard, glossary,
ledger, service record, certificate, name prompt, confirm scrim, radio panel,
player, and the three `.sys-readout` telemetry tiers) and records `color`,
`background-color`, all four `border-*-color`, `box-shadow`, `text-shadow`,
`outline-color`, `fill` and `stroke` for every element.

**Normalisation is the whole point.** Relative colour syntax computes as
`color(srgb 0 0.9412 1 / 0.25)`; the literal it replaces computes as
`rgba(0, 240, 255, 0.25)`. Same colour, different string. A string diff
false-positives on every touched line and buries the one line that actually
moved. `compare-styles.mjs` parses both to numeric RGBA and compares within half
a channel step.

**Two things had to be pinned before the snapshot was reproducible**, and both
were found by running it against unchanged CSS twice:

- **Transitions and animations.** A `.player` span read `rgb(0,240,255)` on one
  run and `rgb(239,183,16)` on the next: a colour caught mid-transition.
  Computed colour is a function of *when* you look. The snapshot injects
  `transition: none; animation: none` into `<head>`.
- **`.sys-readout`.** It rolls `Math.random()` every 2s and swaps its tier class,
  giving three different colours. It is pinned to NOMINAL for the ordinary
  views, and the ELEVATED and CRITICAL tiers get their own snapshots, so those
  colours are covered deliberately rather than by whatever the dice rolled.

Always run the control first (`before` vs a second `before`, expecting zero
differences) **and** a negative control (change one token, expect it to scream).
"No differences" is also what a blind tool reports.

Each script wipes its own bucket in `out/` on the way in, so a rerun replaces its
artefacts rather than accumulating them. `out/` is gitignored; `out/chrome-profile`
is the reused browser profile, and only `harness:clean` removes it.

## Writing a new probe

```js
import { withBrowser, openApp, signIn, outDir } from './lib/drive.mjs';
import { NAME, RECORD_SNAPSHOT as RECORD } from './lib/fixtures.mjs';

await withBrowser(async (browser) => {
  const page = await openApp(browser, { url: process.env.REBUILD_URL, record: RECORD, name: NAME });
  await signIn(page, NAME);
  // ... drive and probe
});
```

`signIn` takes an `onState` callback fired at each checkpoint: `entry`,
`boot-typing`, `boot-form`, `welcome`, `dashboard`. **There is one definition of
how you get into this app, and it is `signIn`.** When the entry flow changes
again, that function is the only thing that changes.

## Things that cost someone a day

**Seed before the app boots.** `openApp` installs `localStorage` via
`evaluateOnNewDocument`, ahead of any page script. Do not `goto` then write, and
do not write then reload. The debug Chrome reuses one profile, so `localStorage`
survives between runs; an unseeded run once rendered a "fresh" dashboard showing
1400 eddies and 1/9 progress, inherited from the previous run.

**The entry flow is the LOGIN click.** `/` is `.lock-screen`; LOGIN opens
`/boot`. The LOGIN click is also the audio-unlock gesture, so don't bypass it.

**`public/assets/css/*.css` are static assets.** Vite does not hot-reload them.
Use `page.setCacheEnabled(false)` or a hard reload when probing CSS changes.

**Reaching the transfer overlay means completing a module.** Click
`.complete-transmit`, not a button whose text starts with CONTINUE. The
multi-select stage keeps its options clickable as toggles until `.quiz-submit`
fires, so "click the first enabled option" loops forever.

## Cleanup

Scripts run through `withBrowser(fn)`, which tears the browser down in a
`finally`. This is not tidiness. A throw mid-drive is the **expected** outcome
when the app has moved (that is what the assertions are for), so teardown
cannot live on the happy path.

`browser.disconnect()` is not enough for a Chrome we spawned: it detaches the
client and leaves Chrome running with every page open. Each failed run leaked
one, and the app starts a radio station on the LOGIN click, so the leak was
audible: a dozen headless browsers playing NC Radio with no window to close.
`closeBrowser` calls `browser.close()` when we spawned it, and when we merely
attached to someone else's debug Chrome it closes only the pages we opened and
leaves their tabs alone. `SIGINT`/`SIGTERM` kill a spawned browser too.

The browser also launches with `--mute-audio`, because headless Chrome still
routes `AudioContext` output to the system audio device.

| Env var | Default | Notes |
| --- | --- | --- |
| `REBUILD_URL` | `http://localhost:5173/` | the app under test |
| `CHROME_BIN` | standard Chrome install path | |
| `CHROME_DEBUG_PORT` | `9224` | reuses a debug Chrome on this port if one is up |
