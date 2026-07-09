# NC Zoning Academy - Shell Rebuild Plan

Status: in progress (updated 2026-07-09). Branch: `feat/shell-rebuild`.
Live site (`main`) is unaffected and still serving the 0.1.0 baseline.

This doc records what has been done, the working method for getting each view
right, and the next steps. It is the resume point for the rebuild.

---

## 1. Summary of where we are

The Academy shell was prototyped in Claude Design and shipped as a working but
monolithic 0.1.0 baseline. We are rebuilding it in a maintainable, professional
stack (React + TypeScript + Vite), reproducing the prototype view by view. The
radio system is finished. The boot/login and dashboard views are rebuilt and
verified. The core work left is the module player and the remaining views.

Why the rebuild: the Claude Design export is a single ~180KB file with all styles
written inline in JavaScript, running on the design tool's own runtime and pulling
React from a CDN. That is fine as a visual prototype but hard to maintain and
impossible to theme with CSS custom properties. The chosen stack fixes all of
that and is the right foundation for growth and a possible port to a work LMS at
Concinnity. See `wiki/decisions/shell-rebuild-in-repo.md` for the full decision.

---

## 2. What has been done

### 2.1 Radio (finished)
- `radio-station/v2` data model: a station is `{id, name, freq, genre, tracks[]}`;
  each track carries the musical fields plus a `form` preset. Data in
  `public/radio/stations.js`, validated by `scripts/validate-radio.mjs` (CI).
- Five stations, three tracks each (15 tracks). The synth engine (built in Claude
  Design, `public/radio-engine.js`, `window.NCRadio`) expands each track's `form`
  into an intro/build/peak/dip/outro arrangement; track length is derived from
  bars x bpm, deterministic. Signed off by ear.

### 2.2 Architecture decision
- Chosen: React + TypeScript + Vite, client-side routing with react-router,
  plain CSS with custom properties for theming, no UI-component library.
- Rejected: keeping the monolith, hand-rolled vanilla JS, and Preact + htm. The
  deciding factors were that the module player (the core view) is the most
  stateful part and benefits most from components, that the project may grow and
  may port to a professional context, and that the build runs in CI on Cloudflare
  Pages so build tooling is not a manual burden.

### 2.3 The React migration (commit `2eece57`)
- Repo converted to a Vite project: root `index.html` entry, `vite.config.ts`,
  `tsconfig.json`, `package.json` scripts (`dev`, `build`, `preview`, `typecheck`)
  alongside the existing validators.
- `public/` is now static passthrough only; the monolith and the experiment files
  were removed (kept in git history).

### 2.4 Views rebuilt — and the parity correction (2026-07-09)
The boot and dashboard views were first built across `84743c2`/`d8bda22`
(pre-React) and `f71f5a7`/`ca72a55`, and this doc originally called them
"pixel-faithful". **That claim was wrong.** They had been verified against the
short reference-values list below (§6), not against the running monolith, and
the list was incomplete: the course card's blueprint hero, progress bar and
chips, relay icons and colour coding, the orientation card's mono body + shard
icon, the boot typewriter animation, the H1 font weight, the live SYNC_OFFSET
readout, the glossary FAB, the radio pill and the whole SFX layer were all
missing or wrong.

Fixed by the full parity rebuild (2026-07-09): the live monolith was served
from git history, its rendered DOM (inline styles = the complete spec) and app
script were extracted into `docs/monolith-parity-spec.md`, and every view and
satellite was rebuilt to the measured values and verified with paired
screenshots via `scripts/parity/` (see §4). Now matching the monolith:

- Boot: typewriter log (260ms lead-in; 12/34/140ms per-char delays; drive/
  drivehi/whoosh SFX), click-or-key skip + hint, gradient divider, gated
  two-state ACCESS button (`LOADING COURSE…` while the course JSON is in
  flight), slot hover states, `SHARD REJECTED // <reason>` import line
  (green/red), and the 1.7s green IDENTITY CONFIRMED welcome readout.
- Dashboard: blueprint hero (grid overlay, cyan tag, watermark module count),
  title underline bar, bordered chips, PROGRESS row + gradient bar, full-width
  BEGIN/RESUME cta with hover inversion, orientation card (shard icon, Fira
  body `#c3cfe2`, bordered dismiss, session-scoped show logic), relay links
  with icons + cyan/gold/gray colour coding + hover inversion, header nav
  active/inactive tab styles, balance button (label + icon row, hover), NCD
  weight 400 headings.
- Satellites: one-line SYSTEM_STATUS readout (2s telemetry roll, 85/10/5
  NOMINAL/ELEVATED/CRITICAL, coloured LED with statusblink), glossary FAB,
  radio pill (bpm-driven EQ bars, frequency, gold bouncing-marquee track name)
  wired to the real radio engine (random station on fresh login; music starts
  after leaving boot).
- Cross-cutting: the WebAudio UI SFX synth (tick on any clickable, nav/ok/err/
  access/chime/drive...), the global pointer-tick listener, the real
  `ncza-record/v1` schema (moduleDone/quiz/eddies/revealedBy/txns/operatorName/
  audio — replacing the invented `{user, progress}` shape), saved-record
  restore on login, debounced local save, and the monolith's responsive
  breakpoints (≤1024px, ≤640px).

### 2.5 Hardening (2026-07-09)
- `loadCourse()` fetch rooted to `/courses/...` so nested router URLs
  (`/module/:id`, coming with the player) can't silently resolve the fetch
  against the wrong path and mask it with the sample-course fallback.
- Shard import validated (`migrateRecord`, a port of the monolith's):
  unknown schema throws `unrecognized record schema`, non-objects throw
  `invalid file`, and the boot slot surfaces the reason instead of failing
  silently or logging in as the default operator.
- Deliberate fixes vs the monolith (user-approved): the courses counter shows
  the course count (`[ 1 ]`) — the monolith shows `modules.length` under an
  AVAILABLE COURSES label, which is a bug; the root favicon 404 and the
  missing input id/name are fixed; JS hover-style mutation became CSS
  `:hover` (same visual result).

---

## 3. The architecture (how it is built)

### 3.1 The stack, in plain terms
- **React**: the page is built from components, which are functions that return
  markup and own a slice of state. When state changes, React re-renders that part.
- **JSX**: HTML-like syntax written inside JavaScript.
- **TypeScript**: JavaScript with type labels. The types catch mistakes as the
  code is written. It compiles to plain JavaScript, so the code that runs in the
  browser is ordinary JS.
- **Vite**: the dev server and build tool. `npm run dev` gives a local server with
  hot reload; `npm run build` produces an optimised `dist/` folder.
- **react-router**: already installed (`react-router-dom` ^7) but not yet wired
  in. Gives each view a real URL so a module can be bookmarked and deep-linked.

### 3.2 File structure
```text
nczoning-academy/
  index.html              Vite entry: overlays + <div id="app"> + loads /src/main.tsx
  vite.config.ts          Vite config (build to dist)
  tsconfig.json           TypeScript settings
  package.json            deps + scripts (dev/build/preview/typecheck + validators)
  src/                    source you edit
    main.tsx              mounts <App/> onto #app
    App.tsx               operator/course state, Progress wiring, view switch
    views/                Boot.tsx, Dashboard.tsx (one per view)
    components/           AppHeader.tsx (shared chrome), and future shared bits
    lib/
      academy.ts          typed helpers over the window globals (cfg, loadCourse, ...)
      types.ts            data shapes: Course, ProgressRecord, ProgressAdapter, ...
  public/                 static passthrough, copied to dist untouched
    config.js             window.ACADEMY_CONFIG (hosted profile)
    progress.js           window.Progress storage adapter
    radio-engine.js       window.NCRadio synth engine
    radio/stations.js     window.RADIO_STATIONS
    courses/*.json        course content (fetched at runtime)
    assets/               css/ (theme, style, boot, dashboard), font/, favicons
  dist/                   build output (gitignored; Cloudflare builds it)
```

### 3.3 How data and modules connect
- `config.js`, `progress.js`, `radio/stations.js` and `radio-engine.js` load
  as classic scripts in `index.html` and publish globals.
  `src/lib/academy.ts` wraps those globals with
  typed functions so the React code never touches `window` directly.
- The course loads at runtime: in live mode the app fetches
  `/courses/<id>.json` (rooted, never relative — see §2.5); otherwise it falls
  back to an inline sample.
- CSS lives in `public/assets/css/*.css` and is linked in `index.html`. This keeps
  the design tokens and theming editable without a rebuild.

### 3.4 Theming
- `theme.css` defines semantic CSS custom properties (for example `--primary`,
  `--bg`, `--font-display`) scoped to an `html.theme-*` class. Components reference
  those variables, never raw colours. Adding a theme later means defining one more
  `html.theme-<name>` block that overrides the same variables.

### 3.5 Build and deploy
- Push to GitHub. Cloudflare Pages runs `npm install && npm run build` and serves
  `dist/` from its CDN. Build command `npm run build`, output directory `dist`
  (already configured in the Cloudflare dashboard).
- Local development: `npm run dev`.

---

## 4. The method (how we get each view exactly right)

The Claude Design prototype, running live, is the visual source of truth. The
whole point is that reproduction is a measurement job, not a design job. For each
view we follow the same loop:

1. **Reach the view in the live monolith.** Open the deployed prototype and drive
   it to the target screen (for example log in to reach the dashboard).
2. **Measure exact values.** Use Chrome DevTools to read the computed styles of
   each element: colours, fonts, sizes, spacing, borders, shadows, and positions.
   Never approximate from memory of how it looked.
3. **Reproduce.** Build the view as a React component plus a per-view CSS file,
   using the measured values and the shared theme tokens. Reuse the CSS,
   data, and no-DOM modules unchanged wherever possible.
4. **Verify.** `npm run typecheck`, `npm run build`, serve `dist/`, load it in a
   browser, and confirm zero console messages.
5. **Compare and fix by measuring.** Screenshot the rebuild, compare against the
   monolith, and fix any delta by measuring the difference, not by eyeballing.
6. **Commit the slice.** One coherent view or piece per commit, with the
   verification noted in the message.

Two rules that sit above the loop:
- **Decide once, build once.** For any choice with real trade-offs, lay out the
  pros, cons, and the understanding first, reach a decision, then build. Do not
  build, react, and rebuild.
- **Parity first, refine later.** Reproduce the current look and behaviour to
  reach parity (0.2.0), then treat polish, new interactions, and extra themes as
  separate later passes.

And the binding rule added after the 2026-07-09 parity correction:
- **No parity claims without artefacts.** A view is done only when paired
  monolith/rebuild screenshots from `scripts/parity/capture.mjs` exist and
  every visible monolith element is either reproduced or explicitly listed
  here as deferred. The measurement source is the running monolith (served
  from git `f16bd4f`) and the extracted spec in
  `docs/monolith-parity-spec.md` — never a from-memory summary. §6's short
  list is what allowed the first false "pixel-faithful" claim; it is now
  deprecated in favour of the spec doc.

---

## 5. Next steps

In priority order:

1. ~~Routing slice~~ **DONE (2026-07-09, `ad86574`).** react-router over `/`
   (boot) and `/dashboard` (guarded — deep links redirect to boot until
   signed in; unknown routes → `/`), `public/_redirects` shipped. Verified on
   the Cloudflare branch preview: `/dashboard` deep link serves the SPA (200),
   guard redirects, login navigates, zero console errors.
2. ~~Module player~~ **DONE (2026-07-09, `d4182d0`).** Spec extracted to the
   parity doc, then built: rail (+ drawer ≤640px), stage stream with gated
   CONTINUE and resume, all chunk types, the four quiz types (incl.
   lift-and-carry drag), lab runner (canned + ETag matching; per-lab state
   fixes the monolith's cross-module lab-state leak), war-story scenario,
   eddies economy (flyers, ledger, TRANSFER overlay, balance count-up/pulse),
   `/module/:moduleId` route, `partialFrac` restored to the dashboard.
   Verified against the monolith through the same headless drive (identical
   stage flow, award amounts and balances; rail row height exact) and on the
   Cloudflare preview end-to-end. Remaining player-adjacent pieces live with
   their own slices: txn-history modal + eject/slot overlay animations
   (Service Record), glossary modal, certificate flow from CERTIFIED.
3. ~~Glossary modal + transaction history~~ **DONE (2026-07-09).** Both
   overlay modals extracted to the parity spec and built on a shared
   `ModalShell` (scrim/box/title bar/[ ESC ] CLOSE): glossary with search +
   tier filter (query/tier persist in app state across open/close), txn
   ledger with summary cells, module grouping and jump-to-answer deep link
   back into the player (reveal + relative scroll + 1400ms flash). Openers
   wired (FAB + header button + balance chip); Escape closes from inside
   inputs; radio pill moved after the modals in DOM order (same z-index —
   the monolith wins by order). Harness-verified: identical counts
   (42/42, 16/42 project, LEDGER [ 3 ], NET +€$ 900), identical jump
   offset (24px) and flash, pixel-matched pairs. Fixed along the way (in
   the rebuild only): `resumeRevealed` now matches the monolith — a
   completed module reveals ALL stages (was resuming at the recorded
   reveal, so re-entering a certified module hid its tail).
4. ~~Service Record~~ **DONE (2026-07-09).** View + full shard I/O extracted
   to the parity spec and built: operator identity (live name edit), stat
   cards, module status rows, certification stamps, eject/slot/purge. One
   `ShardOverlay` component covers both reader animations (eject slides the
   chip out, slot slides it in; rAF bar + background-tab guard timeout);
   `ConfirmDialog` covers the red overwrite/purge confirms (deliberately not
   Escape-wired, like the monolith). Rail SAVE PROGRESS and the completion
   stage now route through the same eject overlay (the slice-2 bare download
   predated it). No operator list here — that was a plan error; `listUsers()`
   is adapter API only and the boot screen owns operator selection.
   Harness-verified end-to-end with a seeded record: view stats, eject
   (mid + settled + filename message), purge (confirm → wiped stats), slot
   (clean record → straight to animation → restored stats), slot-again
   (overwrite confirm → cancel message) — all probes identical, pairs
   pixel-matched. VIEW CERTIFICATE gating (disabled unless certified) is in;
   its onClick lands with slice 5.
5. ~~Certificate~~ **DONE (2026-07-09).** `CertificateOverlay` (no
   click-outside/Escape close — button only, like the monolith; rank on the
   cert is the TOP course rank, clearance is earned) + `NamePromptDialog`
   (cyan, click-outside cancels, Enter/Escape on the input, raw value until
   confirm) + print CSS in cert.css (`#cert-print` becomes the printed page;
   rebuild ids — `#vignette`, not the monolith's `#vign`). VIEW CERTIFICATE
   onClick wired (name-blank → prompt path). Harness-verified with a fully
   certified seed (capture-cert.mjs): view gating, cert content
   (CLEARANCE LEVEL 9 // CERTIFIED FIELD OPERATOR), print-media emulation
   (cert visible+absolute, chrome hidden, controls display:none), edit-name
   round trip (prefill → cleared disables ISSUE → reissue as new name →
   propagates to the record view) — all probes identical, pairs
   pixel-matched.
6. ~~Radio panel~~ **DONE (2026-07-09).** `MusicPlayer` replaces `RadioPill`
   (one component, collapsed pill + expanded panel, like the monolith's
   renderMusicPlayer): now-playing box (freq/station/10-bar EQ/track/status/
   progress with 400ms polling while open), transport, station chips,
   AUTO-ROTATE, MUSIC + SYSTEM SOUNDS volume rows (speaker mutes, sliders,
   right-click reset to defaults). Pill gains the muted variant (gray
   border/text) and opens the panel. App now mirrors the FULL engine state
   plus SFX prefs as React state and — closing a known spec gap — the record
   snapshot builds `audio` from live state instead of echoing the adopted
   value, so shards/persistence carry the operator's actual radio + SFX
   prefs (monolith default sfxVol 0.8 adopted too). The monolith's header
   MUSIC/SFX button props turned out to be dead code (never consumed in the
   DC markup), so the volume rows are the only mute UI — parity confirmed.
   Harness-verified (capture-radio.mjs, seeded audio pins the station):
   pill, panel, pause/play, next-track, station dial, cycle toggle, music
   mute, slider + right-click reset, SFX mute, muted pill, and the
   persisted audio object — byte-identical on both apps after the same
   interaction sequence; pairs pixel-matched.

Done as of the 2026-07-09 parity rebuild (previously listed here): the radio
pill, the glossary floating button, the animated SYNC_OFFSET, and the
stale-closure fix (the adapter callbacks now read live state via a ref).

Known simplification pending the module player: the course progress bar and
RESUME detection count completed modules only — the monolith also grants
partial credit for started modules via `buildStages`, which needs the player's
stage model. Port `partialFrac` with the player slice.

Path to release:
- All work goes through PRs (feature branch → `main`; no dev/main split, but
  the practice stands). [PR #1](https://github.com/spuddeh/nczoning-academy/pull/1)
  is the tracking PR for this rebuild; Cloudflare build comments land there.
- Branch preview: https://feat-shell-rebuild.nczoning-academy.pages.dev
- Merge PR #1 only at parity (this becomes 0.2.0). The 0.1.0 monolith keeps
  serving until then.

---

## 6. Reference values (measured from the monolith) — DEPRECATED

Superseded by `docs/monolith-parity-spec.md`, which is extracted from the
running monolith's rendered DOM and app script and is the only authoritative
reference. This short list is kept only as a record of what the first pass
verified against (and why that wasn't enough).

- **Reference URL** (the deployed 0.1.0 monolith): a Cloudflare Pages
  `*.pages.dev` deployment of `main`.
- **Palette** (from the monolith's `C` object): navy `#0a192f`, panel `#112240`,
  cyan `#00f0ff`, amber `#ffb300`, gold `#ffd400`, green `#00ff9d`, red `#ff3355`,
  grey `#8892b0`, white `#e6f1ff`, near-black field `#050a14`.
- **Fonts**: Night Corp Display (identity: wordmark, boot titlebar, headings),
  Orbitron (display headings and buttons), Rajdhani (body), Fira Code (terminal
  and mono labels).
- **Boot view**: card 640px wide, bg `rgba(10,25,47,0.92)`, 1px cyan border,
  glow `0 0 40px rgba(0,240,255,0.15)`; cyan titlebar with navy text; boot log in
  Fira Code 13.5px, line-height 1.85; input bg `#050a14` in Orbitron 700; ACCESS
  button dimmed cyan `rgba(0,240,255,0.55)`.
- **Dashboard**: header 62px, bg `rgba(10,25,47,0.9)` with `blur(8px)`, 1px cyan
  `0.2` bottom border; wordmark Night Corp Display 20px; content is a 1100px
  centred column; course cards are a two-column grid; orientation card bg
  `rgba(0,240,255,0.04)` with a `0.3` cyan border; SYSTEM_STATUS readout fixed
  bottom-left, Orbitron 10px.

---

*Related: `wiki/decisions/shell-rebuild-in-repo.md` (why in-repo),
`wiki/learnings/dc-export-visual-spec-not-codebase.md` (why the export is a spec,
not a codebase), `docs/decisions/radio-song-structure.md` (radio arrangement).*
