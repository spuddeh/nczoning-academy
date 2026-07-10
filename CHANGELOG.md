# Changelog

Version headings in this file are the release record (no git tags or
GitHub Releases, matching the map repo's convention).

## [Unreleased]

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
