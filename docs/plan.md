# NC Zoning Academy: personal micro-module LMS (POC: "The Data API")

## HOW TO EXECUTE THIS PLAN (read first, new session, Opus 4.8)

This plan was researched and written in a prior session; the executing session
has NONE of that context. Everything needed is in this file or at the paths it
names.

**EXECUTION-SURFACE DECISION (final): run LOCALLY in VS Code, primary workspace
= the map repo (`d:\Modding\cp2077-location-mods-map`).** The user needs the
local Obsidian wiki, graphify graph, and Claude Code memory (all machine-local)
because the course's WAR-STORY content is sourced from wiki `learnings/` +
memory (not from source code), and graphify aids codebase understanding during
authoring. The "Claude Code web / cloud" subsection below is a RETAINED
FALLBACK only, NOT the chosen path; ignore it unless the user later opts into
device-independence and accepts losing wiki/graphify/memory.

**Repo coexistence:** the new `nczoning-academy` repo is a SEPARATE repo but is
worked on as an **additional working directory** of this map workspace (so
memory + Obsidian wiki + graphify context is retained). Do not open the Academy
folder as its own workspace; that would switch memory/graphify context away
from the map project.

Execution discipline:

1. **Work one phase at a time (P1 → P6) and stop for a user checkpoint after
   each phase.** Do not run ahead. Each phase has a verification gate in the
   Verification section; pass it before declaring the phase done.
2. **Do not trust prior-session summaries over sources.** Re-read the named
   files before using them: brand = `d:\Modding\cp2077-location-mods-map\docs\branding.md`
   + `assets/css/theme.css` + `assets/css/style.css` + the live site
   https://nczoning.net; API truth = `git show origin/main:worker/src/<file>`
   run inside `d:\Modding\cp2077-location-mods-map` (the checkout may be on a
   feature branch WITHOUT worker/ (that is expected); use git show, or ask the
   user before switching branches).
3. **Accuracy rules are non-negotiable** (user mandate): no project claim
   sourced from `wiki/` or any mirror; only origin/main source and live API
   captures; every general concept verified against official docs (MDN,
   developers.cloudflare.com, docs.github.com, learn.openapis.org) via WebFetch
   at authoring time and cited section-deep in the content JSON.
4. **Safety**: Bash/PowerShell run on the user's own PC; every network request
   uses their home IP. The API has a WAF rule blocking >100 req/10s per IP on
   /v1/. Keep API captures to a handful of spaced single requests. Never burst.
5. **First action of P1**: copy this plan file into the new repo as
   `docs/plan.md` so it survives independently of the plans directory.
6. The map repo's `.gitignore` is a whitelist (`/*` + `!` entries): that
   pattern is specific to that repo; give `nczoning-academy` a normal ignore.

**Kickoff prompt for the new session (paste verbatim):**

> Execute the approved plan at
> `C:\Users\spudd\.claude\plans\my-next-task-is-fluttering-tome.md`
> (NC Zoning Academy: personal micro-module LMS, POC course "The Data API").
> Read the ENTIRE plan file first, including the "HOW TO EXECUTE" section and
> its execution discipline. Start with Phase P1 (repo scaffold) only, then
> stop for my review before P2.

### Running on Claude Code web / cloud (FALLBACK ONLY, not the chosen path)

> NOT the chosen execution path. The user chose LOCAL execution (see the
> EXECUTION-SURFACE DECISION above) to keep the Obsidian wiki, graphify, and
> memory, which the war-story content and authoring depend on. This subsection
> is retained only in case the user later trades those away for
> device-independence.

This project is git/web-based and could run on **Claude Code on the web
(claude.ai/code)** (any browser or the Claude iOS app), freeing it from one
PC. The desktop app runs LOCALLY by default and does NOT achieve this; the web
surface (or the desktop app's Remote mode) runs in the cloud. If ever taken:
**bootstrap P1 once on a local surface, then run P2→P6 on the web**, but you
lose wiki/graphify/memory (see the losses list below).

Adjustments for a cloud session (no local filesystem, no local MCP/hooks):

- **Map-repo source is on GitHub, read it from there, not local paths.** The
  map repo `spuddeh/nc-zoning-board` is PUBLIC and all needed files
  (`docs/branding.md`, `assets/css/theme.css`, `assets/css/style.css`,
  `worker/src/*.js`, `worker/openapi.json`, `worker/test/openapi.test.js`) are
  on `main`. In cloud, replace every `git show origin/main:<f>` /
  `d:\Modding\...` reference with a GitHub read, e.g.
  `gh api repos/spuddeh/nc-zoning-board/contents/worker/src/index.js?ref=main`
  (base64 `.content`), `raw.githubusercontent.com/spuddeh/nc-zoning-board/main/<f>`,
  or the github MCP (remote HTTP, works on web). Pin `sources[]` project links
  to the resolved commit SHA (`gh api repos/spuddeh/nc-zoning-board/commits/main --jq .sha`).
- **BOOTSTRAP (one-time, needs repo creation + this plan file):** web sessions
  cannot create GitHub repos and cannot read this plan off the local disk, so
  do P1 either (a) LOCALLY once (current VS Code extension): creates
  `nczoning-academy` and commits this plan to `docs/plan.md`; or (b) create an
  EMPTY `nczoning-academy` repo on github.com in a browser, start a web session
  on it, and paste this plan's full text into the first prompt so it writes
  `docs/plan.md`. After P1, everything the project needs is in-repo or public
  web.
- **Lost on cloud (none required by this project):** local MCP servers
  (Obsidian, chrome-devtools), hooks, IDE diagnostics, `@mention`. For P3
  reference screenshots of nczoning.net, capture them yourself or feed the live
  URL directly into Claude Design's web-capture (the primary approach anyway);
  do not depend on a local browser MCP.

## Context

The user (instructional designer at Concinnity) wants a personal micro-learning
LMS to deeply understand the map project's own systems (terminology, how the
pieces link), starting with the Data API as the POC and expanding later (JS,
three.js, WebGPU…). Built via Claude Design, Night Corp branded throughout,
free, single-user, hosted in its own repo on Cloudflare Pages. This plan covers
the whole POC pipeline: repo scaffold, verified course content, the Claude
Design handover brief, and post-export wiring.

**Accuracy mandate (user):** project claims authored from the REAL
implementation (`git show origin/main:worker/...`), never wiki mirrors; every
general concept verified against official docs (MDN, developers.cloudflare.com,
docs.github.com, learn.openapis.org) at authoring time and cited section-deep.
Content schema carries citations; a `contentAudit` block pins the origin/main
SHA all claims were verified against.

## User decisions (all confirmed)

- Content authored in Claude Code; Claude Design builds only the SHELL that
  renders course JSON files. Future courses = new JSON, no redesign.
- Live labs against the real API are IN (canned-response SIMULATION MODE in
  Claude Design previews: no external fetch there; live once hosted).
- Own repo from day one: **`nczoning-academy`**, Cloudflare Pages free tier,
  Git integration, output dir `public/`, no build step.
- Module anatomy: **approved as drafted** (see below).
- Learner persona: **Operator** ("OPERATOR CLEARANCE: LEVEL 2").
- Gamification: **extended set**, clearance levels 1–9 with rank titles per
  tier, per-module status LEDs, unlockable lore fragments per module,
  CERTIFIED capstone stamp + printable certificate (print-friendly view).
- Sequencing: **author everything first**, full verified course JSON before
  the Design brief is handed over.

## Course: "TRANSMISSION PROTOCOLS: The NC Zoning Data API" (id `data-api`)

9 modules + capstone, ~2 hrs. Sequence: contract → freshness → serving →
building → defending → shipping → documenting → consuming → capstone.

| # | Module (Night Corp / plain) | Anchors |
| --- | --- | --- |
| 01 | TRANSMISSION PROTOCOL: the API contract (envelope, stable ids, slim/full, /v1) | War story: Nexus v3 false alarm. Lab: /v1/meta + locations vs ?full=1 |
| 02 | FRESHNESS DIRECTIVE: caching, ETags, 304, SWR | Cache-TTL override story. Lab: If-None-Match → 304 |
| 03 | THE ENGINE ROOM: Workers + KV | No incident (deliberate): "field recon" guided source read. Lab: /v1/health + headers |
| 04 | SUPPLY LINE: cron refresh, hash-gate, last-known-good, discovery_stale, PIP enrichment | Parse-resilience saga (+ Nexus truncation). Lab: meta age/staleness + canned 503 |
| 05 | PERIMETER DEFENSE: rate limiting + bot protection | BFM false outage (+ rate-limit self-block). Lab: capped ≤15-req probe + CANNED 429 (never approach 100/10s by design) |
| 06 | LAUNCH AUTHORIZATION: CI/CD + Cloudflare tokens (code:10000 diagnosis, account_id, token template) | Two CI token failures. Lab: /v1/health version as deploy marker |
| 07 | THE SPEC IS THE LAW: OpenAPI + drift-guarding (Scalar, spec-vs-router test) | Authored scenario from openapi.test.js rationale. Lab: fetch /openapi.json, cross-verify a path |
| 08 | FIRST CUSTOMER: in-game consumer + B7 migration (threading invariant, ApiVersion handshake, API-primary + fallback) | Composite-UID thumbnail drop. Lab: consume slim list like the mod does |
| 09 | FIELD CERTIFICATION: capstone multi-endpoint diagnostic mission | Mixed scenario exam; CERTIFIED stamp + certificate |

Course-level: two-tier glossary (PROJECT/GENERAL), vetted external resources
(MDN caching + HTTP hub, learn.openapis.org, Cloudflare Workers/KV/cron docs +
learning path, GitHub Skills hello-github-actions, CF Learning Center
rate-limit/bot articles; expansion shortlist recorded for future courses).

## Module anatomy (APPROVED template)

Hook (terminal-log cold open, 30–60s) → 2–3 bracketed objectives → 2–4
single-concept chunks (≤90s / ≤250 words; types: text, code, table, callout,
terminal-log) → live lab (3–5 min; request builder + response inspector;
SIMULATION MODE banner when canned) → knowledge check (2–4 questions: MCQ,
multi-select, order-the-steps, spot-the-wrong-assumption; per-option feedback
with citation links) → war-story scenario (situation → decision → "what
actually happened" debrief) → recap (3 bullets) + field notes (glossary terms,
citations block, external resources).

## Content JSON schema (`academy-course/v1`)

Formalised as `schema/course.schema.json` + node validator in P1. Concrete
skeleton (the executor builds the JSON Schema from THIS, not from prose):

```jsonc
{
  "schemaVersion": "academy-course/v1",
  "id": "data-api",
  "title": "TRANSMISSION PROTOCOLS",
  "subtitle": "The NC Zoning Data API",
  "estMinutes": 120,
  "api": { "baseUrl": "https://api.nczoning.net", "rateLimit": "100 req / 10s / IP" },
  "ranks": [ { "clearance": 1, "title": "PROBATIONARY OPERATOR" } /* …per tier, authored in P2 */ ],
  "contentAudit": {
    "projectCommit": "<origin/main SHA at authoring time>",
    "auditedAt": "<date>",
    "auditNote": "All project claims traced to worker/src/* at this commit"
  },
  "glossary": [ { "term": "envelope", "tier": "project|general", "def": "…", "sources": [] } ],
  "resources": [ { "id": "mdn-caching", "label": "MDN: HTTP caching", "url": "…", "modules": ["m02"] } ],
  "modules": [ {
    "id": "m02", "order": 2,
    "title": "FRESHNESS DIRECTIVE", "subtitle": "HTTP caching, ETags & 304s",
    "clearance": 2, "estMinutes": 13,
    "lore": "<flavour fragment unlocked on completion>",
    "hook": { "type": "terminal-log", "lines": ["> anomaly: client shows stale district data", "…"] },
    "objectives": ["Trace a conditional GET end to end", "…"],
    "chunks": [ {
      "id": "m02-c1",
      "type": "text|code|table|callout|terminal-log",
      "heading": "…",
      "body": "…markdown-lite (bold/code/links only)…",
      "variant": "info|warning|policy",      // callout only
      "lang": "http",                         // code only
      "columns": [], "rows": [],              // table only
      "sources": [
        { "kind": "project", "label": "worker/src/index.js L72-91",
          "url": "https://github.com/spuddeh/nc-zoning-board/blob/<sha>/worker/src/index.js#L72-L91" },
        { "kind": "official", "label": "MDN — ETag",
          "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag" }
      ]
    } ],
    "lab": {
      "id": "m02-lab", "title": "CONDITIONAL RETRIEVAL",
      "briefing": "…", "steps": ["…"],
      "request": { "method": "GET", "path": "/v1/districts", "query": {}, "headers": {},
                   "editable": ["headers.If-None-Match"] },
      "expected": { "status": [200, 304], "headersOfInterest": ["ETag", "Cache-Control"],
                    "shapeHints": ["data is an array"] },
      "canned": [
        { "when": "default", "status": 200, "headers": { "ETag": "\"<real>\"" }, "body": { /* captured */ } },
        { "when": "if-none-match-matches", "status": 304, "headers": {}, "body": null }
      ],
      "debrief": "…", "sources": []
    },
    "quiz": [ {
      "id": "m02-q1", "type": "mcq|multi|order|spot-wrong",
      "prompt": "…",
      "options": [ { "text": "…", "correct": true, "feedback": "…" } ],
      "steps": ["…"],                          // order type only: correct sequence
      "sources": []
    } ],
    "scenario": {
      "id": "m02-s1", "title": "INCIDENT LOG // CACHE-TTL OVERRIDE",
      "situation": ["> …typed log lines…"],
      "question": { "type": "mcq", "prompt": "…", "options": [] },
      "debrief": "What actually happened: …", "sources": []
    },
    "recap": ["…", "…", "…"],
    "fieldNotes": { "glossaryTerms": ["etag"], "resources": ["mdn-caching"], "renderCitations": true }
  } ]
}
```

Rules: every chunk/lab/question/scenario carries `sources[]`; `kind: project`
links pin the commit SHA (never a moving branch); canned lab responses are
captured from REAL API calls in P2.

## App shell spec (input to the Design brief)

7 views: boot splash (skippable typed-log) → dashboard (frosted course cards,
progress, clearance rank badge) → module player (left-rail module map with
LEDs; chunk-by-chunk [ CONTINUE ] advance) → lab runner ([ TRANSMIT ], status/
headers/pretty-JSON inspector, SIMULATION MODE banner) → quiz/scenario
interactions (bracketed options, reorder controls, immediate feedback +
citations) → glossary (searchable, tier filter) → progress/export (rank +
stamps + lore archive, [ EXPORT RECORD ]/[ IMPORT RECORD ] JSON, printable
certificate view).

Progress: localStorage `ncza:v1:*` (in-memory in preview). Hard requirement
for Design: `ACADEMY_CONFIG = { liveMode, apiBase, persist, course }`, preview
defaults = canned data + no fetch + no persistence; hosting flips all three.
Gamification: clearance 1–9 + rank titles, LEDs (amber blink → solid cyan),
lore fragment unlock per module, capstone CERTIFIED stamp + print-friendly
certificate. A11y: prefers-reduced-motion kills scanlines/typing/blink; LED
state never colour-only; keyboard-operable quiz + lab.

## Branding (canonical source: `docs/branding.md` + `theme.css` as code truth)

The Design brief's brand section is assembled from the repo's **brand
guidelines doc (`docs/branding.md`)**: lore & background (Night Corp as
Richard Night's legacy, "silent watchful guardian"; bureaucratic-high-tech,
civic-minded, secretive), voice & tone rules with verbatim examples ("Class 3
Corporate Offense", emotionless-bureaucracy errors), named palette (Corporate
Navy / Zoning Cyan / Concrete Gray / Archival White / Warning Amber), fonts
(Orbitron / Rajdhani / Fira Code-or-monospace), UI element rules (sharp 0px
corners, colour-inversion hovers, 1px cyan borders with `[ ]` corner
brackets, frosted rgba(10,25,47,.9) panels, geometric vector markers:
diamonds/hexagons, line-art SVG), and the Welcome-modal pattern
(`NIGHT CORP // URBAN PLANNING DIVISION`, `Terminal ID: NC-ZB-01`,
`[ ACCESS TERMINAL ]`) which the Academy boot splash mirrors (e.g. Terminal
ID `NC-ACAD-01`); **plus** the implemented token/motif extraction from
`theme.css`/`style.css` (surface tints, derived alpha tints, scanline
overlay, status LEDs, type scale, letter-spacing rules).

Known doc-vs-code discrepancies, resolved:
- Concrete Gray: doc says `#8a8d91`, code uses `#8892b0` → **use code**.
- **Approval Green `#00ff9d`**: in the brand doc but never implemented on the
  site → **adopt it in the Academy** for success states (correct answers,
  module completion, CERTIFIED): an LMS genuinely needs a success colour and
  it's on-brand per the guidelines. Amber stays warnings-only per code usage.
- Corner brackets: site expresses them textually (`[ BUTTON ]`); the Academy
  may ALSO draw them as panel corner framing per the doc. Design's call.

## Repo layout (`nczoning-academy`)

```text
public/            ← Pages output (no build step)
  index.html       ← shell (Design export, wired in P5)
  config.js        ← ACADEMY_CONFIG (liveMode: true here)
  courses/index.json + data-api.json
schema/course.schema.json
scripts/validate-courses.mjs
docs/design-brief.md + authoring-guide.md + wiring-notes.md
.github/workflows/validate.yml   ← schema-validate courses on push
```

## Handover package (Document A → Claude Design)

Sections: mission/audience · brand system (assembled from `docs/branding.md`
lore/voice/palette/UI rules + theme.css tokens/motifs, discrepancies resolved
per the Branding section above; includes the 10-rule voice guide) ·
**visual reference: the live site itself**, the brief instructs the user to
feed https://nczoning.net (Night Corp default theme) into Claude Design via
its web-capture input as the rendered brand anchor, supplemented by targeted
screenshots produced in P3 (welcome modal, sidebar section headers, a mod
popup, the status bar) for states a single capture misses · 7 views
screen-by-screen · interaction specs · data contract
(full schema + INLINED compact sample course: 1 module with every chunk type,
a lab with canned 200+304, all four question types) · runtime-modes hard
constraints (preview = no fetch/no localStorage, render inlined
SAMPLE_COURSE; implement ACADEMY_CONFIG verbatim) · a11y/responsive · out of
scope (no auth/backend/analytics/editing UI) · export instructions (prefer
the documented Design→Claude Code handoff bundle; else zip/standalone HTML;
vanilla, no build step). Full course JSON, schema, validator, authoring guide
stay in the repo, never sent to Design.

## Execution phases (author-first per user decision)

| Phase | Who | Output | Size |
| --- | --- | --- | --- |
| P1 | Claude Code | `nczoning-academy` repo scaffold: layout, schema, validator, CI, README. First action: copy this plan to `docs/plan.md`. Ask the user: repo visibility (public/private) before `gh repo create` | S |
| P2 | Claude Code | Full `data-api.json` (9 modules + capstone) via the verification pipeline: project claims from `git show origin/main:worker/*` cited file+line+SHA; general concepts verified via WebFetch against official docs and cited; canned lab responses captured from the real API (gentle, rate-limit-aware); external URLs re-verified; `contentAudit` stamped; validator green | L |
| P3 | Claude Code | `docs/design-brief.md` (Document A) with sample module extracted from the finished course + reference screenshot set captured from the live site (welcome modal, sidebar, popup, status bar; Night Corp theme) | M |
| P4 | User in Claude Design | Iterate the shell against the brief; preview runs entirely on sample data; export (handoff bundle preferred) | M |
| P5 | Claude Code | Wire export into `public/`, swap SAMPLE_COURSE → course registry, flip ACADEMY_CONFIG, connect Cloudflare Pages, live-lab smoke test (respecting the 100/10s rule: small, spaced requests) | M |
| P6 | Claude Code + user | QA: content re-check against pinned SHA, lab burst caps, reduced-motion/keyboard pass, export/import round-trip, certificate print view | S |

## Risks

- Design export format unknown → brief mandates vanilla/no-build; the
  documented Design→Code handoff is the primary route; P5 budgets rework.
- Preview sandbox (no fetch/storage) → structurally handled by
  ACADEMY_CONFIG preview defaults.
- Rate-limit self-block repeat → labs client-throttled, hard caps, 429
  experience canned by design.
- Content staleness as the API evolves → contentAudit SHA + re-audit
  procedure in authoring-guide.md.
- Accuracy trap → P2 explicitly forbids sourcing project claims from wiki/
  or derived docs.
- Shell scope creep → 7-view list + out-of-scope section freezes the surface.

## Verification

- P1: `node scripts/validate-courses.mjs` green on the skeleton; CI runs on push.
- P2: validator green; spot-audit: every module's `sources[]` resolve (project
  links pinned to SHA render on GitHub; official links fetch 200); canned
  responses byte-compared against live captures.
- P3: brief self-check: sample course parses; every shell behaviour in the
  brief maps to a schema field.
- P5: hosted smoke test: module 02 lab performs a real conditional GET and
  renders a genuine 304; progress persists across reload; export/import
  round-trip; certificate prints.
- P6: user walkthrough of one full module end-to-end (their ID judgement is
  the final gate on the learning experience).
