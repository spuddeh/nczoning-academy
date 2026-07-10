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
node scripts/parity/capture.mjs          # boot states + dashboard
node scripts/parity/capture-modals.mjs   # glossary + txn ledger
node scripts/parity/capture-record.mjs   # Service Record + eject/slot/purge
node scripts/parity/capture-cert.mjs     # certificate + name prompt + print CSS
node scripts/parity/capture-radio.mjs    # radio pill + panel + persisted audio
node scripts/parity/selftest.mjs         # driver refuses unrecognised pages
```

Screenshots and probe output land in `out/` (gitignored).

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
