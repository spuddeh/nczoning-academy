# NC Zoning Academy: App Shell Overview

A single-page shell rendering the whole training experience in the Night Corp
house style. The live app is a React + TypeScript + Vite build, rebuilt in-repo
from the original Claude Design monolith at verified parity.

## The frame

- **Look:** Corporate Navy ground (`#0a192f`), Zoning Cyan accent (`#00f0ff`),
  0px corners, uppercase letter-spaced labels, frosted panels, terminal/log
  framing, scanline overlay.
- **Display type:** a self-hosted **Night Corp Display** face (`@font-face` from
  `assets/font/`, no external dependency) sets the Tier 0 identity strings:
  the ZONING ACADEMY wordmark, the boot and modal titlebars, and the
  certificate heading. Titlebars run at a uniform 12px so
  `NIGHT CORP // URBAN PLANNING DIVISION` fits the boot and certificate cards
  without truncating. Body/UI copy stays in the existing Fira Code / system
  stack.
- **Favicons:** NC-monogram marks derived from the corp logo, one per property
  and accent (Map = cyan, Academy = gold), in `assets/`.
- **Config-driven:** reads `window.ACADEMY_CONFIG` (`public/config.js`).
  `liveMode` selects the live course fetch over the inlined SAMPLE_COURSE;
  `persist` gates all `localStorage` access (wrapped in try/catch, so it
  degrades to in-memory).
- **Labs** return canned responses only, behind a SIMULATION MODE banner.

## The views

- **Lock / standby (`/`)**: the landing page, in front of boot. States what
  the Academy is and renders a SYSTEM BROADCAST announcements feed from
  `public/messages.json` (fetched `no-store`, so posts go live without a
  rebuild; empty hides the panel, a failed fetch shows an evergreen fallback).
  The LOGIN click is the audio gate: it resumes the shared `AudioContext` and
  builds the radio engine, so boot inherits a running context instead of
  playing silently. The clock reports Night City's year (2077).
- **Boot splash / login (`/boot`)**: terminal boot sequence with a floppy-read
  tick sound; a pseudo-login where you enter an operator name (defaults to
  "S. Dorsett") before you can access the terminal; that name carries through
  to the certificate and the service record; plus a "SLOT SERVICE RECORD
  SHARD" import path that takes you straight in. Hard-guarded: reached only by
  passing through the lock, so a refresh or direct hit redirects to `/`.
- **Dashboard**: operator standing, eddies balance, course list, and quick
  links (map, Discord, Ko-fi, GitHub repos) with custom SVG icons; animated
  `SYSTEM_STATUS` telemetry sits in the bottom-left readout.
- **Module player**: left module map (collapses to a drawer on phone), streamed
  content blocks with keep-scrolled-to-bottom follow, all four quiz types (MCQ,
  multi-select, scenario, ordering), the lab runner, and a save/eject point both
  mid-module and at completion. The ordering/sequence quiz supports lift-and-carry
  drag reordering (pointer events, works on mouse and touch) alongside ▲/▼ arrow
  buttons kept for accessibility; the arrows flash the row that moved.
- **Glossary**: a modal (floating book-icon button top-right; drops into the
  mobile nav row) accessible from any view.
- **Progress / Service Record**: the single source of truth for all storage,
  with username editing, volume/mute prefs, and import/export.
- **Certificate**: name-gated (uses the login/operator name, with an inline
  prompt as fallback and an edit option), thematically stamped, exported with
  the record.

## Systems underneath

### Eddies economy
Right/wrong answers award or deduct with a fly-to-balance animation and a
count-up. A **transaction-history ledger** (click the balance) is grouped by
module; each line carries a timestamp, correct/incorrect tag, the question
prompt, a "jump to answer" link, the delta, and a running balance. Rows stack on
mobile so prompts wrap instead of clipping.

### Service Record Shard
A portable save file with a custom hexagonal shard SVG icon and an eject/slot
animation. All progress lives in one Progress module:
`setUser / load / save / snapshot / import / listUsers`.

- Import **replaces** (never merges), behind an overwrite confirm when current
  progress is non-empty.
- Exported shards are named `NCZA_<OPERATOR>_operator-shard.shard`.
- Version-tolerant: accepts `ncza-record/v1`, ignores unknown fields, has a
  migration branch for future schemas.
- The operator name is sanitized (control chars/newlines stripped, whitespace
  collapsed, 42-char cap) before it reaches the certificate.
- CERTIFIED status and stamps are **derived** from module completion at render
  time, not stored as independent flags, so a slotted shard restores them with
  no extra snapshot fields.
- Auto-saves to `localStorage` on every change when `persist` is on, and resumes
  on boot; the shard stays the portable backup/transfer copy.
- Resuming a module returns you to your saved progress point, not the start.

### NC Radio
A fully procedural Web Audio engine (no audio files) reading 5 stations from
`radio/stations.js` (array order = dial order); each station carries multiple
tracks.

- **Stations:** CHROME HORIZON (101.9, synthwave/outrun), KABUKI AFTER DARK
  (89.1, lo-fi/haze), J-TOWN GOLD (104.2, city pop/funk), NEON RAIN (88.3,
  ambient/dream), BADLANDS FM (95.8, 80s rock).
- **Transport:** instant track/station swaps (no fade/defer), a real
  play/pause that stops the sequencer (distinct from the MUSIC mute), a
  tempo-locked visualizer, and a track progress bar. The **collapsed mini pill**
  shows the station frequency (cyan) followed by the now-playing track title
  with a ♪ note glyph (gold, matching the full player); the title sits in a
  fixed-width clip box so the pill never changes width, and bounce-marquees
  back and forth only when the title overflows.
- **Dial:** next/prev step tracks within a station; the dial selects stations
  and resumes each one's last-played track. Auto-rotate scans the whole dial.
  A random station plays on fresh login; saved station/track/volume/mute prefs
  restore from the shard.
- **Section scheduler:** each track's `form`
  (`build` / `groove` / `anthem` / `haze` / `drift`) expands into an ordered
  arrangement of sections that gate drum rows and voices and drive an energy
  envelope (applied to the filter cutoff and a dedicated gain node, gliding at
  each bar boundary). Track length is **derived** from bars × bpm and chosen
  deterministically (~210s target; same track = same arrangement every play).
  `drift` never gates the beat to silence; it only swells and recedes. The
  arrangement presets live in the engine; `stations.js` carries only the
  per-track `form` choice.
- **Levels:** separate MUSIC and SYSTEM SOUNDS sliders + mute toggles (speaker
  icons that cross out when muted), right-click to reset to default; all saved
  to the shard.

### Responsive shell
Phone (≤640px), tablet (≤1024px) and desktop, plus two narrow blocks for the
places a 320px screen still runs out of room: ≤400px scales the shard reader
(`record.css`), ≤350px drops the brand monogram (`style.css`). Breakpoints are
bare pixel literals, not tokens: a custom property cannot be used in a media
condition. The sharp Night Corp look is preserved throughout (no softened
corners, borders, or type), touch targets are finger-sized, code blocks / tables
/ lab JSON scroll inside their own wrappers, and hover states have tap/active
equivalents.

Four rules the shell holds to, each of which was learned by breaking it (#5):

- **A view's type sizes are rebound in the view's own stylesheet.** Both
  `style.css` and `dashboard.css` bind the `--fs-*` roles on `.dash-scroll`,
  `dashboard.css` is linked later, and a media query adds no specificity — so
  the phone sizes that lived in `style.css` lost the cascade and did nothing.
  Rebinding the role is still the pattern; the file it happens in is part of it.
- **Decide who gives way.** In the header the controls never shrink, the nav
  scrolls, the brand truncates last. Three `flex: none` children under
  `space-between` have a hard minimum width and simply overflow below it, and
  hiding one more element per breakpoint only moves where that happens.
- **A height problem is capped by height.** The radio panel and the broadcast
  popover cap against `100vh`, not inside the ≤640px block: a phone in landscape
  is 844px wide and 390px tall.
- **Every fixed scrim owns its scroll.** `body { overflow: hidden }` means an
  overlay taller than the viewport is unreachable rather than merely awkward.
- **Judge a phone type size by the render, not the number.** Night Corp Display
  is a very wide identity face: TRANSACTION HISTORY measures ~250px at 12px in
  it. The phone titlebar sizes look small written down and are not on screen.
- **`text-overflow` does nothing on a flex container.** Both modal titles are
  flex rows, so the ellipsis has to sit on the text span inside; without that
  they hard-clip mid-letter and read as broken rather than truncated.

The phone header is two rows at every width — monogram plus controls, then the
two destinations as full-width tabs. `.hdr-meta` is the one thing in it that
never gives way (four 44px finger targets and the balance figure, 258px, none of
it decorative), so the second row is paid for out of everything else: the ZONING
ACADEMY wordmark goes, the GLOSSARY label drops to its icon, the gap to the now
empty brand column goes, and below 350px the monogram goes too. `src/lib/headerChrome.ts` adds the two behaviours CSS
cannot express:

- **`useNavTuck`** slides the destinations away on scroll down and back on
  scroll up. It listens on `document` in the capture phase, because `scroll`
  does not bubble and the app scrolls inside per-view containers, and it ignores
  everything that is not a view scroller so a modal's own scroll does not move
  the header. It also holds still for one transition after each change: **the
  tuck moves the thing it is measured from**, since collapsing a 44px row inside
  a `height: 100vh` flex column makes the scroll container 44px taller, which
  clamps `scrollTop` down, which reads as scrolling up. That oscillates.
- **`useHeaderHeightVar`** publishes the header's measured height as
  `--header-live-h`, which the bell popover anchors to. It takes the element,
  not a flag: the first version looked the header up by selector when `signedIn`
  flipped, which happens one commit before the shell exists, so it silently did
  nothing.

`npm run harness:overflow <label>` measures all of this — see
`scripts/parity/README.md`.

## Files

The live app is React + TypeScript under `src/` (`App.tsx`, `views/`,
`components/`, `lib/`), built by Vite. Static data and styles are `public/`
passthrough: course JSON under `public/courses/`, the radio data at
`public/radio/stations.js` (`window.RADIO_STATIONS`), the procedural engine at
`public/radio-engine.js`, the Progress adapter at `public/progress.js`, and
per-view CSS under `public/assets/css/`. The README's repo layout has the full
tree.
