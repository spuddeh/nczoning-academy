# Browser harness

A headless-Chrome driver for the Academy, plus the capture scripts built on it.

Despite the folder name, **this is not a parity-only tool.** `lib/drive.mjs` is
a general rig: launch Chrome, seed a record, sign in, probe the running app. Use
it for anything that needs the real app in a real browser — computed styles,
z-index ladders, overlay geometry, before/after snapshots for a refactor. The
`capture-*.mjs` scripts are one consumer, not the purpose.

It was originally built to prove the React rebuild against the 0.1.0 monolith,
which is where the name and the `MONOLITH_URL` plumbing come from.

## The rule this harness exists to keep

**Every step asserts where it is before acting.** If an expected element is not
there, `signIn`/`clickByText`/`expectSelector` throw a `DriveError` naming what
they wanted and dumping what was actually on the page.

This is not politeness. Before #22 the sign-in sequence had gone stale — it
looked for a text input the lock screen no longer had, typed the callsign into
the document, and screenshotted the lock screen as `rebuild-dashboard.png`.
Exit 0, four PNGs, no warning. A stale driver that emits a plausible screenshot
is worse than one that crashes, because the screenshot carries the authority of
an artefact, and `wiki/learnings/parity-claims-need-artifacts.md` says artefacts
are what settle a parity claim.

`node scripts/parity/selftest.mjs` is the regression guard: it drives a page
that is definitely not the app and asserts the driver refuses to proceed. It
needs no server.

## Run

```bash
npm run dev                              # rebuild on :5173
node scripts/parity/capture.mjs          # boot states + dashboard   → out/boot/
node scripts/parity/capture-modals.mjs   # glossary + txn ledger     → out/modals/
node scripts/parity/capture-record.mjs   # Service Record + shard IO → out/record/
node scripts/parity/capture-cert.mjs     # certificate + print CSS   → out/cert/
node scripts/parity/capture-radio.mjs    # radio pill + panel        → out/radio/
npm run harness:selftest                 # driver refuses unrecognised pages
npm run harness:clean                    # delete out/ entirely (incl. chrome-profile)
```

Each script wipes its own bucket on the way in, so a rerun **replaces** its
artefacts rather than accumulating them. That bounds `out/`, and it means a PNG
in `out/record/` is always from the last `capture-record` run. A stale screenshot
is indistinguishable from a fresh one — the same trap as everything else here.

`out/` is gitignored. `out/chrome-profile` is the reused browser profile; only
`harness:clean` removes it.

## Proving a CSS refactor changed nothing

Screenshots cannot settle "pure refactor, zero visual change" — you cannot eyeball
25,000 property values, and a modal nobody opened is not in the picture.

```bash
node scripts/parity/snapshot-styles.mjs before   # on main
# ...change the CSS...
node scripts/parity/snapshot-styles.mjs after
node scripts/parity/compare-styles.mjs before after   # exit 0 = identical
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
  run and `rgb(239,183,16)` on the next — a colour caught mid-transition.
  Computed colour is a function of *when* you look. The snapshot injects
  `transition: none; animation: none` into `<head>`.
- **`.sys-readout`.** It rolls `Math.random()` every 2s and swaps its tier class,
  giving three different colours. It is pinned to NOMINAL for the ordinary
  views, and the ELEVATED and CRITICAL tiers get their own snapshots — so those
  colours are covered deliberately rather than by whatever the dice rolled.

Always run the control first (`before` vs a second `before`, expecting zero
differences) **and** a negative control (change one token, expect it to scream).
"No differences" is also what a blind tool reports.

## Cleanup

Scripts run through `withBrowser(fn)`, which tears the browser down in a
`finally`. This is not tidiness. A throw mid-drive is the **expected** outcome
when the app has moved — that is what the assertions are for — so teardown
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
| `REBUILD_URL` | `http://localhost:5173/` | always driven |
| `MONOLITH_URL` | *unset* | opt-in; when set, driven first, as a pair |
| `CHROME_BIN` | standard Chrome install path | |
| `CHROME_DEBUG_PORT` | `9224` | reuses a debug Chrome on this port if one is up |

### Driving the monolith too

```bash
git archive f16bd4f public/ | tar -x -C /tmp/ncza-monolith
npx serve -l 4173 --no-clipboard /tmp/ncza-monolith/public
MONOLITH_URL=http://localhost:4173/ node scripts/parity/capture.mjs
```

`MONOLITH_URL` has no default on purpose. It used to default to `:4173`, so
every script failed at `goto` for anyone who just wanted to probe the current
app.

## Writing a new script

```js
import { launchBrowser, targets, outDir, signIn, openApp, clickByText } from './lib/drive.mjs';
import { NAME, RECORD_M01 as RECORD } from './lib/fixtures.mjs';

const browser = await launchBrowser();
for (const { name, url } of targets()) {
  const page = await openApp(browser, { url, label: name, record: RECORD, name: NAME });
  await signIn(page, NAME);
  // ... drive and probe
}
```

`signIn` takes an `onState` callback fired at each checkpoint — `entry`,
`boot-typing`, `boot-form`, `welcome`, `dashboard`. That is how `capture.mjs`
photographs intermediate states without re-implementing the flow. **There is one
definition of how you get into this app, and it is `signIn`.** When the entry
flow changes again, that function is the only thing that changes.

## Things that cost someone a day

**Seed before the app boots.** `openApp` installs `localStorage` via
`evaluateOnNewDocument`, ahead of any page script. Do not `goto` then write, and
do not write then reload. The debug Chrome reuses one profile, so `localStorage`
survives between runs; an unseeded capture once rendered a "fresh" dashboard
showing 1400 eddies and 1/9 progress, inherited from the previous script.

**Two entry flows exist.** `signIn` detects which:

- `lock` — the current app. `/` is `.lock-screen`; LOGIN opens `/boot`. The
  LOGIN click is also the audio-unlock gesture, so don't bypass it.
- `boot` — the archived monolith. `/` *is* the boot typewriter, and its roots
  are inline-styled with **no class names at all**, so it can only be identified
  by the callsign field appearing after a keypress.

**`public/assets/css/*.css` are static assets.** Vite does not hot-reload them.
Use `page.setCacheEnabled(false)` or a hard reload when probing CSS changes.

**Reaching the transfer overlay means completing a module.** Click
`.complete-transmit`, not a button whose text starts with CONTINUE. The
multi-select stage keeps its options clickable as toggles until `.quiz-submit`
fires, so "click the first enabled option" loops forever.

## Known limitation: the monolith and seeded records

The monolith does not pick up a seeded **certified** record, even installed
before its first script runs — it boots at 1/9 and leaves VIEW CERTIFICATE
disabled, so `capture-cert.mjs` throws on the monolith half.

That is left unfixed deliberately. The monolith is frozen at `f16bd4f`, parity
was reached and signed off at 0.2.0, and the rebuild has since diverged on
purpose (lock screen, type roles, AAA body text). Reverse-engineering its
persistence buys nothing anyone will ship.

Note what the old harness did here instead: its `clickByText` did not skip
disabled buttons, so it "clicked" a disabled VIEW CERTIFICATE, carried on, and
reported `{open: false}` without complaint. That monolith capture never worked
and never said so. Throwing is the improvement.

The other four scripts drive both targets.
