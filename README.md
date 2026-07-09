# NC Zoning Academy

A personal, single-user micro-module LMS for deeply understanding the
[NC Zoning Board](https://nczoning.net) map project's own systems — starting
with the **Data API** as the proof-of-concept course.

Night Corp branded throughout. Free, static, hosted on Cloudflare Pages. Course
content is authored as JSON; the app shell renders it. Future courses are new
JSON files, not a redesign.

> Status: **0.2.0.** The shell is a React + TypeScript + Vite app, rebuilt from
> the Claude Design monolith at verified parity. See [`CHANGELOG.md`](CHANGELOG.md).

## Repo layout

```text
index.html                 Vite entry — links the static global CSS + data globals
src/
  App.tsx                  routes, operator/record state, radio host, eddies economy
  views/                   Lock, Boot, Dashboard, Player, ServiceRecord
  components/              header, overlays, modals, music player, player primitives
  lib/                     academy (config/course/identity), sfx, player, types
public/                    static passthrough — served as-is, never bundled
  assets/css/              theme.css (tokens) + one stylesheet per view
  config.js                ACADEMY_CONFIG (hosted profile: live + persist)
  messages.json            SYSTEM BROADCAST feed on the lock screen
  courses/
    index.json             course registry the shell loads
    data-api.json          the POC course (9 modules)
  radio/stations.js        window.RADIO_STATIONS — the 5-station dial
  radio-engine.js          procedural Web Audio synth (no audio files)
  progress.js              localStorage adapter (ncza:v1:*)
  _redirects               SPA fallback so deep links resolve
schema/                    course + radio-station JSON Schemas — the content contracts
scripts/                   ajv validators, freshness check, parity harness
docs/                      plan, app-shell overview, authoring guide, decisions/
dist/                      Vite build output (gitignored; Cloudflare builds it)
```

The CSS, course JSON, radio data, and `config.js` all live in `public/` on
purpose: they are linked, not imported, so they stay editable without touching
the bundle.

## Routes

`/` **Lock** → (click LOGIN) → `/boot` **Boot** → (login) → `/dashboard`,
`/record`, `/module/:moduleId`.

The lock screen is the landing page and the audio gate. Browsers keep an
`AudioContext` suspended until a user gesture, so the LOGIN click is what wakes
the shared context and builds the radio engine — boot then inherits a running
context instead of playing silently. `/boot` is guarded: a refresh or a direct
hit redirects to `/`. Post-login routes redirect to `/` when signed out. See
[`docs/decisions/lock-screen-and-audio-gate.md`](docs/decisions/lock-screen-and-audio-gate.md).

## Commands

```bash
npm install            # once
npm run dev            # Vite dev server
npm run build          # → dist/ (what Cloudflare Pages runs)
npm run preview        # serve the built dist/
npm run typecheck      # tsc --noEmit
npm run validate       # ajv: every course in public/courses/ against the schema
npm run validate:radio # ajv: public/radio/stations.js against radio-station/v2
npm run freshness      # are the contentAudit SHAs still current?
```

`validate` fails on schema errors and warns (non-fatally) when content
`sources[]` are empty — a nudge toward the accuracy mandate below. CI runs
`validate` + `validate:radio` on any PR touching content; `freshness` runs
weekly.

## Content model

Each course is one `academy-course/v1` JSON document: metadata, a clearance-rank
ladder, a `contentAudit` block pinning the project SHA all claims were verified
against, a two-tier glossary, external resources, and an ordered list of
**modules**. Each module follows the approved anatomy — hook, objectives,
single-concept chunks, a live lab, a knowledge check, a war-story scenario,
recap, and field notes. See the schema and [`docs/plan.md`](docs/plan.md) for
the full shape.

## Announcements

The lock screen's SYSTEM BROADCAST panel reads `public/messages.json`, fetched
at runtime with `cache: 'no-store'`. Editing it needs no code change, but it is
a committed file, so a post still goes live via commit → push → Pages deploy.

```json
{ "messages": [
  { "id": "b-2026-07-09", "level": "update", "date": "2026-07-09",
    "title": "ACADEMY ONLINE", "body": "…" }
] }
```

`level` is `update` (cyan) · `info` (gray) · `alert` (amber). Sorted
newest-first by `date`, capped at four; undated entries sort last, which suits
evergreen items. An empty array hides the panel; a failed fetch renders the
evergreen fallback inlined in `src/views/Lock.tsx`.

Nothing validates this file, and it is the first thing a visitor reads. Post
only claims you can point at in the code.

## Accuracy mandate

Project claims are authored from the **real implementation** on the map repo's
`origin/main` (`worker/src/*`), cited file + line + commit SHA — never from wiki
mirrors or derived docs. Every general concept is verified against official docs
(MDN, developers.cloudflare.com, docs.github.com, learn.openapis.org) and cited
section-deep. Canned lab responses are captured from real API calls.

## Hosting

Cloudflare Pages, free tier, Git integration. Build command `npm run build`,
output directory `dist/`. `public/_redirects` serves `index.html` for every path
so client-side routes survive a refresh.

Preview environments (e.g. Claude Design) must override `ACADEMY_CONFIG` to
`liveMode:false` / `persist:false` and render inlined sample data so the sandbox
never fetches or writes storage.

## Licence and fan content

NC Zoning Academy is unofficial **fan content** made under CD PROJEKT RED's
[Fan Content Guidelines](https://www.cdprojektred.com/en/fan-content). It is
not affiliated with, endorsed by, or sponsored by CD PROJEKT RED. Cyberpunk,
Cyberpunk 2077 and related marks (including in-universe names such as Night
Corp) are trademarks of CD PROJEKT S.A.

Site typography includes [Night Corp Display](https://github.com/spuddeh/nc-type-foundry)
(SIL OFL 1.1).
