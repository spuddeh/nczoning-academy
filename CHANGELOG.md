# Changelog

Version headings in this file are the release record (no git tags or
GitHub Releases, matching the map repo's convention).

**A merged PR is a release.** `main` deploys straight to Cloudflare Pages, so
there is no window in which "unreleased" is true. Every PR that changes what the
deployed site does adds its own version heading — nothing merged sits under
`[Unreleased]`. Developer tooling (`scripts/`, CI, harnesses) gets no entry: this
file records what a visitor receives.

## [Unreleased]

## 0.9.0 - 2026-07-16

### Added

- Courses carry a content version and changelog (new `version` / `changelog`
  fields in the course schema); the version renders as a chip on the course
  card.

### Changed

- TRANSMISSION PROTOCOLS course v2.0.0: rewritten for the per-location-records
  Data API (nc-zoning-board 1.4.0) — one record shape (slim/full gone),
  server-computed `recently_updated`, `meta.counts` removed, all lab captures
  re-recorded live and every citation re-pinned.

## 0.8.1 - 2026-07-11

### Fixed

- The mail button's unread count is cyan (amber stays reserved for live
  alerts) and now persists per terminal: opening the feed marks messages
  read in localStorage, so the count no longer returns on refresh or
  re-login. Alert surfaces are unchanged.

## 0.8.0 - 2026-07-11

### Added

- SYSTEM BROADCAST now reaches signed-in operators: a mail button in the
  header (unread counter; blinking amber dot while an alert is live) opens
  the feed from any view, and a slim dismissible alert strip appears under
  the header while an alert-level incident is unresolved. The feed refreshes
  every five minutes. (#10)

### Changed

- Broadcast read/dismiss state lasts one signed-in session: jacking out (or
  purging) clears it, so the next operator at the terminal sees live alerts.

## 0.7.1 - 2026-07-11

### Added

- Slotting a shard at the boot screen now plays the shard-reader animation
  before the welcome readout, matching the Service Record slot. (#30)

## 0.7.0 - 2026-07-11

### Added

- The radio can be powered off entirely: a close button in the panel
  titlebar dismisses the pill and stops the music. Power it back on from
  the Service Record page; the off state persists in your record and your
  saved station resumes. (#34)

## 0.6.0 - 2026-07-11

### Added

- Lab scenario selector: labs with named canned server states show a
  SIMULATE chip row (m04 NOMINAL / STALE / NOT-READY, m05 NOMINAL /
  RATE-LIMITED) so TRANSMIT can serve failure responses that no request
  edit could reach. Value-keyed labs are unchanged. (#2)

## 0.5.2 - 2026-07-11

### Fixed

- Labs now render their authored step-by-step PROCEDURE between the briefing
  and the request console. The instructions existed in every lab's course
  data; the shell was silently dropping them. (#14)

## 0.5.1 - 2026-07-11

### Added

- The module completion card now carries one forward action: [ NEXT MODULE › ]
  mid-course, [ VIEW CERTIFICATE ] on the capstone. (#11)

### Changed

- The CERTIFIED stamp pins to the completion card's top-right corner, angled
  like a mark on the document. SAVE TO SHARD left the card; the rail's
  SAVE PROGRESS is the save affordance.

## 0.5.0 - 2026-07-11

### Added

- JACK OUT button in the app header ends the session and returns to the lock
  screen (icon-only on phones).

### Fixed

- Refreshing an in-app page now serves back the page you were on instead of
  ejecting to the lock screen; audio re-arms on your first click or keypress
  (browser autoplay policy forbids sooner), and until then the radio pill
  shows a red AUDIO STANDBY state with a warning triangle. (#9)
- Purging the local cache now signs you out to the lock screen for a genuine
  fresh start, instead of leaving you on the Service Record page. (#4)

## 0.4.3 - 2026-07-11

### Changed

- Spacing now comes from a scale in `theme.css` instead of 460 literals on 36
  values. Two layers: a 2px-step numeric scale over the dense region
  (`--space-2xs` … `--space-6xl`, 4–24px, mirroring the map), and named layout
  tokens for the large values that repeat by meaning (`--section-gap` 34px,
  `--scrim-pad` 32px, `--frame-gutter` 40px). 88% of spacing is tokenised; the
  rest stays literal on purpose — sub-4px optical nudges, per-view page-frame
  padding, and medium one-off gaps with no shared role. Values on the scale are
  unchanged; odd values snap 1px to the nearest rung. Only box-model properties
  move — colour, stacking and tracking are byte-identical.

## 0.4.2 - 2026-07-11

### Changed

- Letter-spacing now comes from a five-rung scale in `theme.css`
  (`--tracking-tight` … `--tracking-wide`) instead of 158 literals on 17 values.
  Because tracking is in `em` it scales with size, so many of those values were
  the same rendered spacing written differently; the near-duplicates collapse
  (e.g. `0.14em` → `0.12em`). Chosen at the rendered result, not the grep. Only
  letter-spacing moves — colour, stacking and layout are byte-identical.

## 0.4.1 - 2026-07-11

### Changed

- The 15-value z-index ladder is now a named token set in `theme.css`
  (`--z-view`, `--z-overlay`, `--z-dialog`, …) instead of magic numbers scattered
  across eight stylesheets. Values preserved exactly; the deliberate 9995 tie
  between the radio pill/panel and a modal scrim is one shared token, documented.
  Pure refactor: computed z-index is identical on every element.

## 0.4.0 - 2026-07-11

### Changed

- Colour is now themeable. The 185 colour literals and 107 raw-palette
  references outside `theme.css` were the reason a theme swap only half-worked;
  they now resolve through the semantic roles — directly, or as a tint/line/glow
  via relative colour syntax (`rgb(from var(--primary) r g b / 0.25)`). The
  derived tokens in `theme.css` (`--line*`, `--card-glow`, `--scanline`,
  `--primary-dim`, `--card-bg`) follow their role too. Re-binding one role now
  re-skins every value derived from it. Verified as a pure refactor: computed
  `color`, `background-color`, `border-color` and shadows are identical across
  every view (25,542 values). `--surface` reintroduced for the raised-panel
  value that was hardcoded eight times.

## 0.3.2 - 2026-07-10

### Removed

- Nine unused custom properties from `theme.css`: the six `--sp-*` spacing steps,
  plus `--surface`, `--panel-bg` and `--rail-w`. All had zero references.
  Spacing does not get a scale — the padding/margin literals are measured from
  the monolith and stay.

## 0.3.1 - 2026-07-10

### Fixed

- A stray `*/` in `theme.css` ended the type-roles comment early, and CSS
  bad-declaration recovery swallowed `--fs-title` with it. The module title and
  the eddies balance rendered at the inherited 16px instead of 34px.

## 0.3.0 - 2026-07-10

### Added

- Lock / standby screen at `/` — landing page with a `SYSTEM BROADCAST` feed.
  Boot moves to `/boot`, guarded so a refresh or direct hit returns to the lock.
- Announcements served by a Pages Function merging Workers KV (`messages:ops`,
  `messages:manual`) over the committed `public/messages.json`. Posts go live
  without a deploy; deleting a key reverts to the baseline.
- `alert` messages pin to the top of the panel by level, and a green `resolved`
  level stands them down. `messages.schema.json` + `validate:messages` (in CI)
  require every field, and accept an ISO timestamp for `date`.

### Changed

- Body text moved off the metadata grey onto `--text-body` (`#c3cfe2`, AAA) at
  18px/1.7, applied to every prose block a learner reads.
- Type is now driven by eight semantic `--fs-*` roles in `theme.css`, replacing
  every ad-hoc pixel size across all nine stylesheets. Card headings out-rank
  body text again. Views re-bind roles on their own root rather than overriding
  call sites — see `docs/type-system.md`.
- The app header and fixed satellites moved from `dashboard.css` to `style.css`.
  They render on every view, not just the dashboard.

### Fixed

- No autoplay warning on load: the radio engine (and its `AudioContext`) now
  builds on the LOGIN gesture rather than at app mount.
- The lock's `access` cue no longer races `AudioContext.resume()`, which
  dropped it silently on keyboard activation.
- `.chunk-table-caption` renamed `.chunk-table-body` — it renders the table
  chunk's teaching paragraph, and was styled as grey metadata.

## 0.2.0 - 2026-07-09

Shell rebuilt from the Claude Design 0.1.0 monolith into React + TypeScript
+ Vite (PR #1), at verified parity with the monolith.

### Added

- React + TS + Vite app shell: boot/login, dashboard, module player (all
  chunk, quiz and lab types), glossary + transaction ledger modals, Service
  Record with shard eject/slot/purge, certificate with print CSS, NC Radio
  pill + expanded panel
- Parity harness (`scripts/parity/`): paired monolith/rebuild captures with
  DOM/style probes; measured spec in `docs/monolith-parity-spec.md`

### Fixed (deliberate divergences from the frozen 0.1.0 baseline)

- Lab data contract implemented (editable fields + when conditions; the
  monolith hardcoded one If-None-Match input on every lab)
- Certificate print output restyled ink-on-paper (the monolith printed neon
  text on white with no backgrounds)
- Completed modules reveal all stages on re-entry; dashboard counter counts
  courses, not modules; record snapshot carries live audio prefs
- Login input a11y attributes; head favicon/manifest links completed

## 0.1.0 - 2026-07-08

Initial baseline: Claude Design DC-export monolith (`public/index.html` +
support.js runtime), authored data-api course (9 modules + capstone),
procedural NC Radio engine, local progress profiles, Cloudflare Pages.
