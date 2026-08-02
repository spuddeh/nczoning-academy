# Changelog

Version headings in this file are the release record (no git tags or
GitHub Releases, matching the map repo's convention).

**A merged PR is a release.** `main` deploys straight to Cloudflare Pages, so
there is no window in which "unreleased" is true. Every PR that changes what the
deployed site does adds its own version heading; nothing merged sits under
`[Unreleased]`. Developer tooling (`scripts/`, CI, harnesses) gets no entry: this
file records what a visitor receives.

## [Unreleased]

## 0.17.0 - 2026-08-02

### Added

- **A course picker.** The dashboard reads `public/courses/index.json` and
  renders a card per course, so PERMANENT RECORD is reachable for the first
  time. The index had been sitting in the repo unread since the day it was
  written. Selecting a course loads it and swaps the operator's progress to
  that course's slice.
- **Prerequisites are enforced.** A course whose `requires` is unmet renders
  locked, dimmed and greyed, with the reason spelled out
  (`CLEARANCE WITHHELD // REQUIRES TRANSMISSION PROTOCOLS`) rather than colour
  alone. The card stays readable on purpose: the operator should learn the
  course exists and what opens it.
- `npm run validate` now cross-checks `requires` between the index and the
  course file, and fails if a course requires something the index does not list,
  or requires itself. The field is stored twice so the dashboard can gate
  without fetching every course, and two copies of one fact drift.

### Changed

- **The Service Record Shard is now `ncza-record/v2`**: one record per operator
  holding every course, rather than one course flattened into the top level.
  `operatorName` and the audio preferences are operator-level, so a record per
  course would store them twice and let them disagree about the same person.
  A v1 shard migrates on import, folding its flat progress under the course id
  it already carried, so nothing an operator earned is lost.
- Completing a course now unlocks what depends on it, and the shard carries both
  courses' progress in one file.

## 0.16.0 - 2026-08-02

### Added

- Module 04 gains a real incident, replacing an assumption. Both freshness
  signals the course teaches (`discovery_stale` and the cron heartbeat) rest on
  something writing down that a refresh failed. On 2026-08-02 four consecutive
  production cron ticks failed, alerted every five minutes, and left
  `discovery_stale` at `false` with a frozen `last_refresh_at` behind them: the
  failure handler only wrote its update if the previous read returned something,
  and a key-value read answers `null` both before the first run and when the
  stored value is unreadable. The recovery all-clear could not fire either,
  because it needs a stale flag to recover from. The transferable rule is now a
  recap line: a health flag is only as trustworthy as the code that sets it.

### Changed

- Both courses re-pinned to `nczoning/nc-zoning-board@20fc456`. Two worker
  commits landed after the previous pin, and every cited range in `refresh.js`
  and `nexus.js` moved with them. All 152 citations were re-verified and each
  moved range was checked to still land on the code it describes. No claim
  changed, which is what pinning is for: the previous URLs kept resolving to the
  code they described the whole time.

## 0.15.0 - 2026-08-02

### Added

- A second course: **PERMANENT RECORD**, seven modules on the D1 registry that
  TRANSMISSION PROTOCOLS reads from. Why the locations left git, the schema and
  the rules the database enforces, the join that replaced a JSON column and how
  that swap was proven safe, the public write path and its validation, the
  collaborator gate and its three outcomes, the materializer, and a capstone.
  It owns the write path: `POST /submissions`, Turnstile, the admin CRUD and the
  GitHub App gate are taught here, so the Data API course stays a read-contract
  course.
- The course assumes TRANSMISSION PROTOCOLS and says so in a new `requires`
  field. HTTP, JSON and the envelope are not re-taught; SQL and databases are
  taught from a plain baseline, since the audience floor assumes neither.

### Changed

- `npm run probe:glossary` reads which course to drive from `config.js` instead
  of hardcoding `data-api`, and takes the first module's id from the course
  instead of assuming `m01`. With a second course in the repo the old version
  would have checked one course's glossary against another course on screen, and
  every assertion would have failed for the wrong reason. `COURSE=<id>` probes a
  specific one. Both courses now pass all fourteen checks.

### Known gap

- The shell still loads a single course id from `config.js` and has no picker,
  so PERMANENT RECORD is not reachable in the app yet and `requires` is not
  enforced. Tracked separately; the course content and the shell work are
  deliberately separate changes.

## 0.14.0 - 2026-08-02

### Fixed

- The Data API course was teaching two things that had stopped being true. It
  said a breaking change would ship as `/v2` and that `MINOR` meant "a field was
  added". The API is in a pre-1.0 window where those rules are inverted: a
  breaking change bumps `MINOR`, an additive one bumps `PATCH`, and the path
  stays `/v1` throughout. The `1.3.0` the course reported as settled history was
  rolled back to `0.3.0` and the API is now at `0.5.1`. Module 06 carries the
  rule as a policy callout and a new question; module 01's contract callout no
  longer promises a `/v2` that is not coming.
- The `source` field and the synthetic `nczoning` tag were removed from the API
  and are gone from the record table and both canned lab responses.
- `/v1/meta.skipped` no longer means "mods whose metadata block failed to
  parse". It lists every open candidate: a tagged mod that is not on the map and
  has not been dismissed.
- Neither consumer sends `?full=1` any more. The website and the in-game mod
  dropped it separately, which is the no-op alias doing the job it was kept for,
  and module 08 now teaches it that way.

### Changed

- Module 03 stopped calling KV "the store". There are two stores with different
  jobs: D1 is the location registry of record, and KV is a derived copy the
  rebuild writes and the read routes serve. Delete KV and the next rebuild puts
  it back; lose D1 and the data is gone.
- Re-audited against `nczoning/nc-zoning-board` at `091b069` (49 worker commits
  and a six-phase migration to D1 since the last pin) and
  `spuddeh/nc-zoning-core` at `b8c2512`. All 131 project citations were
  line-verified, including the ones pointing into a file that has since been
  deleted.

## 0.13.1 - 2026-08-02

### Changed

- Glossary definitions are lookup cards again. Nine had grown into short
  articles, the longest running 688 characters over five sentences, which made
  the index slow to read exactly where it should have been quickest. Every
  definition now fits 200 characters. Nothing was lost: in all but one case the
  material the card had absorbed was already taught in the module, so the card
  had been repeating the course rather than carrying it.
- The whole glossary is 20 percent shorter to read, and the longest entry is now
  shorter than the old average.

### Added

- Module 06 now says plainly that `API_VERSION`, `dataset_version` and the
  in-game `ApiVersion()` are three different numbers that will not agree, and
  which question each one answers. This was the one genuinely useful thing
  buried in an over-long definition.
- Module 08 now covers how to read the `archives` list without getting it wrong:
  the entries are bare filenames rather than paths, and an empty list means the
  files could not be read, never that the mod ships nothing. Reading it the
  other way tells a player that mods they have installed are missing. It also
  explains why `.xl` files are listed at all: a removal-only mod ships no
  `.archive`, so its `.xl` is the only fingerprint there is.

## 0.13.0 - 2026-08-02

### Changed

- The Field Glossary no longer hands you all 45 entries before you have read a
  word. A term declassifies when you open the module that introduces it, so you
  meet 12 in module 01 and the rest arrive as you earn them. Terms you have not
  reached still hold a place in the index as a redacted row naming the module
  that will open them, because a glossary that quietly got shorter would read as
  broken rather than as filling in.
- Entries you can read now sort above the classified ones. Sorting the whole
  list alphabetically ordered redacted rows by a name you cannot see, which put
  blanks in between the terms you came for.
- Searching only reaches terms you have declassified. A definition you have not
  earned is not findable by typing a word out of it.

### Added

- **Field notes** close every module, between the recap and completion: the
  terms that module declassified, the further reading it cites, and the exact
  source files its claims were verified against. The term chips open the
  glossary. This block was in the original design and had never been built.
- Opening a module that declassifies new terms flashes `+N DECLASSIFIED` on the
  glossary button, so the unlock is visible rather than something you find later.
- `HTTP` and `status code` now belong to module 01. Both are defined in its
  opening page but were attached to no module, so neither would ever have
  declassified.

### Fixed

- A Service Record shard saved before this release keeps the terms it earned:
  modules you had completed or started count as opened.
- The NEXT MODULE button has lost its chevron. Orbitron draws that character
  small and sitting below the line the letters sit on, so it read as a
  misplaced speck; no other action in the player carried one anyway.

## 0.12.1 - 2026-08-02

### Fixed

- The dashboard would not scroll on a real phone, and its last rows sat under
  the browser's address bar with no way to reach them. The app shell was sized
  to `100vh`, which on a phone is the height the page would have if the address
  bar were hidden, not the height you can actually see. A view whose content was
  a little taller than the screen but shorter than that phantom height had
  nothing to scroll and simply hung its bottom off the visible area. Every
  view now measures against the visible height instead, and follows it as the
  address bar hides and returns.
- NC Radio's button no longer sits on top of CONTINUE in a module. It moves
  above the button on that view, and clears the home indicator on phones that
  have one.
- The radio's transport controls are drawn rather than typed. Android renders
  the play, pause and skip characters as full-colour emoji, which is not what
  the rest of the panel looks like.

### Added

- On a phone, DASHBOARD and SERVICE RECORD slide out of the way as you scroll
  down a page and come back the moment you scroll up. They are worth a row while
  you are choosing where to go and worth nothing while you are reading, so
  reading gets the space back.

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
  full-width tabs, rather than sharing 54px with everything else. The ZONING
  ACADEMY wordmark and the GLOSSARY label stand down so that row costs nothing:
  the monogram and the book icon say the same thing in a fifth of the width, and
  the header is two rows and shorter than it was before any of this. On a screen
  as narrow as an iPhone SE the monogram goes too, rather than spend a third row
  on it.
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
- Titles are sized for a phone rather than a desktop. SERVICE RECORD SHARD was
  set at 38px, which on a 390px screen filled the width and stood three lines
  tall before a word of the record itself; it now matches OPERATOR DASHBOARD.
  FIELD GLOSSARY and TRANSACTION HISTORY were the only titlebars in the app
  above 14px and were being cut off mid-word by their own CLOSE button, which
  in turn was carrying a keyboard shortcut no phone has. Both now fit, and where
  a title genuinely cannot, it ends in an ellipsis instead of mid-letter.
- The external-link buttons at the foot of the dashboard are centred icons on a
  phone. Spelled out they were up to 243px each in a 352px column, so five links
  became five full-width rows and the footer outgrew the course card above it.
  MAP REPOSITORY now carries the same cyan as the map's other two links, which
  both groups it with them and tells it apart from ACADEMY REPOSITORY — without
  labels the two were the same grey GitHub mark twice.
- The Service Record heading sits beside its shard icon rather than under it.
  At the desktop size the heading was pushed onto its own line and then wrapped
  again, so the icon and two lines of title took three rows; it now reads as one
  block, at the size that fits the space the icon leaves it.

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
