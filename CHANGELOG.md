# Changelog

Version headings in this file are the release record (no git tags or
GitHub Releases, matching the map repo's convention).

**A merged PR is a release.** `main` deploys straight to Cloudflare Pages, so
there is no window in which "unreleased" is true. Every PR that changes what the
deployed site does adds its own version heading; nothing merged sits under
`[Unreleased]`. Developer tooling (`scripts/`, CI, harnesses) gets no entry: this
file records what a visitor receives.

## [Unreleased]

## 0.12.0 - 2026-08-02

### Fixed

- The Academy works on a phone. The lock screen was the worst of it: the
  wordmark, the broadcast panel and the LOGIN button all hung off the right edge
  with no way to scroll to them, so the site could not be entered at all from a
  390px screen. The certificate hung 165px off the same edge, and on any screen
  narrower than a laptop the header pushed the balance, the bell and JACK OUT
  past the edge as well.
- The header now decides what gives way when it runs out of room, instead of
  overflowing. The controls never shrink, the two destinations scroll (and fade
  at the edge, so a clipped nav looks clipped rather than broken), and the brand
  truncates last. On a phone the destinations get a row to themselves as
  full-width tabs, rather than sharing 54px with everything else.
- NC Radio's corner pill becomes a single icon on a phone, so it no longer parks
  a 205px readout over the bottom-right of whatever you are reading, and it
  steps out of the way entirely while the module map drawer is open. The radio
  panel, the broadcast popover and every dialog now scroll on their own when
  they are taller than the screen; previously a phone held sideways could show a
  dialog with its buttons unreachable.
- Headings no longer run off the edge of their column: OPERATOR DASHBOARD ended
  in "DASHBOA" on a phone, and module and course titles did the same. Finger
  targets that were quietly under size (JACK OUT, the bell, the glossary) now
  meet the 44px floor, and the module completion notice, the certificate, the
  glossary search and the shard reader all fit a 320px screen.

## 0.11.0 - 2026-08-02

### Added

- `/admin`: announcements are now posted and managed on the site itself, from
  any device, with no git checkout and no shell. A form rather than a JSON
  editor, with verbs matching the real lifecycle (Post, Mark resolved, Clear)
  and the date filled in. Both channels are listed and every entry is editable,
  including ones an automated writer created. The two rules that were easy to
  get wrong are now the interface's job: an alert routes itself to the ops
  channel, and resolving an incident replaces the original banner instead of
  stacking a second one beside it.

## 0.10.0 - 2026-08-02

### Added

- An announcement written to the site is now checked before it lands.
  `/api/messages` reads, writes and clears the broadcast feed, and rejects
  anything that does not match the published contract, so a typo can no longer
  reach the panel a visitor reads first. Writing is restricted to an
  administrator authenticated through Cloudflare Access, verified by the
  endpoint itself rather than trusted from the edge.

## 0.9.3 - 2026-08-02

### Fixed

- A Workers KV outage no longer blanks the SYSTEM BROADCAST panel. `/messages.json`
  used to answer `200` with an empty list whichever way it failed, and the lock
  screen's fallback fires only on a failed response, so nothing rendered. Failure
  and emptiness now get different answers: an unreachable or unreadable store
  returns `503` and the panel falls back to its standing evergreen line, while a
  feed the administrator genuinely emptied still returns `200` and hides.

### Changed

- Announcements are served from Workers KV alone. The committed `messages.json`
  is no longer read at runtime: it becomes a one-time seed, so there is one place
  an announcement lives and nothing to keep in sync.

## 0.9.2 - 2026-07-22

### Changed

- House style: em dashes removed from the course and the shell UI (authoring
  guide rule 3). The lab banner now reads `SIMULATION MODE // RESPONSES ARE
  CANNED`, and pending modules on the Service Record read `○ PENDING`.

### Fixed

- The course's own v2.1.0 changelog claimed the re-audit landed on
  nc-zoning-board 1.6.0 at `916caf1`. It landed on 1.7.0 at `fef978a`, which is
  what all 114 project citations are pinned to. The 0.9.1 entry below is
  corrected the same way: it also described `API_VERSION` as a static deploy
  marker, the reading 1.7.0 superseded and the shipped course already replaced.

## 0.9.1 - 2026-07-22

### Changed

- TRANSMISSION PROTOCOLS course v2.1.0: re-audited against nc-zoning-board
  1.7.0. Adds the `archives` install-detection field (m01, m08) and the
  `/v1/health` cron heartbeat with the wedged-vs-failed distinction (m03, m04,
  m09); corrects the now-false "client-side fallback" story to the site's
  no-fallback canary posture (m08) and reworks `API_VERSION` from a static
  deploy marker into SemVer for the API surface, now 1.3.0 behind a CI drift
  guard (glossary, m03, m06, m09). Lab captures re-recorded live; every citation
  re-pinned to `fef978a`.

## 0.9.0 - 2026-07-16

### Added

- Courses carry a content version and changelog (new `version` / `changelog`
  fields in the course schema); the version renders as a chip on the course
  card.

### Changed

- TRANSMISSION PROTOCOLS course v2.0.0: rewritten for the per-location-records
  Data API (nc-zoning-board 1.4.0): one record shape (slim/full gone),
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
  rest stays literal on purpose: sub-4px optical nudges, per-view page-frame
  padding, and medium one-off gaps with no shared role. Values on the scale are
  unchanged; odd values snap 1px to the nearest rung. Only box-model properties
  move; colour, stacking and tracking are byte-identical.

## 0.4.2 - 2026-07-11

### Changed

- Letter-spacing now comes from a five-rung scale in `theme.css`
  (`--tracking-tight` … `--tracking-wide`) instead of 158 literals on 17 values.
  Because tracking is in `em` it scales with size, so many of those values were
  the same rendered spacing written differently; the near-duplicates collapse
  (e.g. `0.14em` → `0.12em`). Chosen at the rendered result, not the grep. Only
  letter-spacing moves; colour, stacking and layout are byte-identical.

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
  they now resolve through the semantic roles: directly, or as a tint/line/glow
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
  Spacing does not get a scale: the padding/margin literals are measured from
  the monolith and stay.

## 0.3.1 - 2026-07-10

### Fixed

- A stray `*/` in `theme.css` ended the type-roles comment early, and CSS
  bad-declaration recovery swallowed `--fs-title` with it. The module title and
  the eddies balance rendered at the inherited 16px instead of 34px.

## 0.3.0 - 2026-07-10

### Added

- Lock / standby screen at `/`: landing page with a `SYSTEM BROADCAST` feed.
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
  call sites; see `docs/type-system.md`.
- The app header and fixed satellites moved from `dashboard.css` to `style.css`.
  They render on every view, not just the dashboard.

### Fixed

- No autoplay warning on load: the radio engine (and its `AudioContext`) now
  builds on the LOGIN gesture rather than at app mount.
- The lock's `access` cue no longer races `AudioContext.resume()`, which
  dropped it silently on keyboard activation.
- `.chunk-table-caption` renamed `.chunk-table-body`: it renders the table
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
