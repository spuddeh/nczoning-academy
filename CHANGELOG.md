# Changelog

Version headings in this file are the release record (no git tags or
GitHub Releases, matching the map repo's convention).

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
