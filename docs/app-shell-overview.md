# NC Zoning Academy: App Shell Overview

A single-page shell rendering the whole training experience in the Night Corp
house style. Built as one Design Component (`NC Zoning Academy.dc.html`) that
opens directly in a browser and exports as vanilla HTML/CSS/JS with no build
step.

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
- **Config-driven:** reads `window.ACADEMY_CONFIG` and honours the two preview
  constraints: `liveMode:false` (renders the inlined SAMPLE_COURSE, no network
  fetch) and `persist:false` (in-memory only). All `localStorage` access is
  gated on the `persist` flag and wrapped in try/catch, so it degrades to
  in-memory without breaking in a sandboxed preview.
- **Labs** return canned responses only, behind a SIMULATION MODE banner.

## The views

- **Lock / standby (`/`)**: the landing page, in front of boot. States what
  the Academy is and renders a SYSTEM BROADCAST announcements feed from
  `public/messages.json` (fetched `no-store`, so posts go live without a
  rebuild; empty hides the panel, a failed fetch shows an evergreen fallback).
  The LOGIN click is the audio gate: it resumes the shared `AudioContext` and
  builds the radio engine, so boot inherits a running context instead of
  playing silently. The clock reports Night City's year (2077). See
  [`decisions/lock-screen-and-audio-gate.md`](decisions/lock-screen-and-audio-gate.md).
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
Phone (<~640px), tablet (~640–1024px), and desktop breakpoints preserving the
sharp Night Corp look (no softened corners, borders, or type). Finger-sized
touch targets, horizontally-scrolling wrappers for code blocks / tables / lab
JSON so the page never scrolls sideways, and gesture-proofed hover states with
tap/active equivalents.

## Files

- `NC Zoning Academy.dc.html`: the app shell (template + logic).
- `radio/stations.js`: the 5-station radio data (`window.RADIO_STATIONS`),
  loaded before the engine.
- `support.js`: Design Component runtime (do not edit).
- `assets/`: icons, SVGs, and the property/accent favicons.
- `assets/font/`: the self-hosted Night Corp Display face (woff2 + otf).

## Constraints honoured (brief §7)

1. Reads `window.ACADEMY_CONFIG`; in preview `liveMode:false` + `persist:false`:
   no network fetch, no localStorage; renders inlined SAMPLE_COURSE, progress
   in memory.
2. Labs return canned responses only, with a SIMULATION MODE banner.
3. Exports as vanilla HTML/CSS/JS, no build step.
