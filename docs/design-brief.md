# NC Zoning Academy — Claude Design Handover Brief (Document A)

You are building the **app shell** for the NC Zoning Academy: a single-user,
static micro-learning site that renders course content supplied as JSON. Build
the shell only. The content, schema, validator and authoring rules stay in the
project repo and are never your concern; your job is the interface that renders
one course JSON document beautifully and interactively.

This brief is self-contained. It gives you the mission, the full Night Corp
brand system, a visual reference, all seven views, the interaction specs, the
exact data contract with an inlined sample course to build against, the runtime
constraints, accessibility rules, and what is out of scope.

---

## 1. Mission and audience

**Product**: a personal, free, single-user LMS ("NC Zoning Academy") that teaches
the maintainer, and onboards new contributors, about the NC Zoning Board project's
own systems. The first course is "The Data API". Future courses are new JSON files
rendered by this same shell — so the shell must be **content-driven and generic**,
never hard-coded to one course.

**Audience**: one learner at a time. Someone curious and technical-ish but not
assumed to know web APIs. The tone carries authority; the interface must stay
legible and calm, not busy.

**In-world framing**: the app is an internal **Night Corp** training terminal. The
learner is an **Operator** with a **clearance level** (1-9). Completing modules
raises standing and pays **eddies** (the in-game currency). It should feel like
booting a secure corporate terminal, not opening a courseware website.

---

## 2. Brand system (Night Corp)

### 2.1 Lore and feel

Night Corp is Richard Night's legacy: the "silent, watchful guardian" of Night
City's infrastructure. The interface should feel **bureaucratic but high-tech**
(clean lines, structured data, corporate authority), **civic-minded** (managing
the city for the public good), and **secretive and protected** (strictly
authorized access). It is the calm, controlled counterpoint to the neon chaos of
the rest of the city.

### 2.2 The 10-rule voice guide

1. **Night Corp is the narrator.** Official, authoritative, slightly sterile. It
   is a corporate system talking, not a friendly tutor.
2. **The learner is an Operator with a clearance level.** Address them through
   that lens ("OPERATOR CLEARANCE: LEVEL 2"), never "hey there".
3. **Terminal/log framing for system output.** Lines prefixed with `>`, in
   monospace, like a boot log or a readout.
4. **Uppercase + letter-spacing** for labels, section headers and buttons
   (`FILTER BY CATEGORY`, `LOCATIONS`, `TRANSMIT`).
5. **Bracket actionable controls**: `[ ACCESS TERMINAL ]`, `[ TRANSMIT ]`,
   `[ I ACKNOWLEDGE ]`, `[ CONTINUE ]`.
6. **Errors are emotionless bureaucracy**: e.g. "Error 404: Location data expunged
   or missing. Please contact your Night Corp liaison."
7. **en-US spelling, no em dashes** (Academy house style; use commas, colons,
   parentheses). Verbatim quotes from cited docs keep their original punctuation.
8. **Never break character** into "in this lesson you will learn". Stay in-world.
9. **Colour has meaning** (see palette): cyan = primary/active, amber = warning
   only, green = success/approval, gold = eddies/currency.
10. **Sharp, controlled, trustworthy.** Nothing soft, rounded, bouncy or playful.
    The restraint is the aesthetic.

### 2.3 Palette (discrepancies already resolved — use these exact values)

| Token | Hex | Use |
| --- | --- | --- |
| `--primary` Corporate Navy | `#0a192f` | Deep background, authoritative base |
| `--secondary` Zoning Cyan | `#00f0ff` | Primary buttons, active tabs, highlights, links |
| `--tertiary` Warning Amber | `#ffb300` | **Warnings/caution only** (and the "new-location" category) |
| Approval Green | `#00ff9d` | **Success** (correct answers, module complete, CERTIFIED). Adopt this; the map site never used it, the Academy needs it |
| Eddies Gold | `#ffd400` | **Eddies / currency** and the transfer animation (see 5.3). Distinct from warning amber |
| `--gray` Concrete Gray | `#8892b0` | Secondary text, inactive borders, disabled (NOT `#8a8d91`; that doc value is wrong, this is the implemented one) |
| `--white` Archival White | `#e6f1ff` | Primary text (not pure white, easier on dark) |
| `--dark-accent` | `#112240` | Raised surfaces |
| Danger Red | `#ff3355` | Wrong-answer debit + the "transferring funds" phase (see 5.3) |

Surfaces (frosted, dark): panel `rgba(10,25,47,0.9)`; solid panel `rgba(10,25,47,0.95)`;
tooltip `rgba(5,10,14,0.95)`. Use `backdrop-filter: blur(...)` on panels so the
background is faintly visible beneath, as on the live site.

### 2.4 Typography

- **Headings**: `Orbitron` (geometric, tech-forward). Load from Google Fonts (the
  hosted Academy site may use font CDNs).
- **Body/data**: `Rajdhani` (squarish, legible for dense data).
- **Terminal/code/coords**: `Fira Code`, falling back to a monospace stack.
- Uppercase + letter-spacing on labels and headings: roughly `0.04-0.08em` on
  small labels, `0.1-0.2em` on section headers and big titles. Type scale runs
  from `0.625rem` up to `3rem`.

### 2.5 UI element rules (motifs)

- **Sharp corners.** 0px radius by default (Night Corp does not do soft). Tiny
  2px radii are acceptable on small chips at most.
- **1px borders** in cyan or muted gray, often with **`[ ]` corner brackets** —
  both textually on buttons (`[ TRANSMIT ]`) and optionally as drawn corner
  framing on panels (your call).
- **Colour-inversion hovers**: e.g. navy panel with a cyan border flips to a solid
  cyan fill with navy text. Sharp and responsive, no soft fades.
- **Frosted panels** (see surfaces above) with backdrop blur.
- **Scanline overlay**: a subtle CRT scanline texture over the whole screen is
  on-brand. Keep it faint, and disable it under reduced motion.
- **Status LEDs**: small dots that encode state (see 5.2). Never colour-only.
- **Markers/vectors**: geometric — diamonds, hexagons, sharp squares — minimalist
  line-art SVG, never rounded map-pin blobs. (Relevant if you draw any iconography.)

### 2.6 Known discrepancies, resolved

- Concrete Gray: use the implemented `#8892b0`, not the brand doc's `#8a8d91`.
- Approval Green `#00ff9d`: in the brand doc but never used on the map site.
  **Adopt it in the Academy** for success states.
- Corner brackets: the map site expresses them textually (`[ BUTTON ]`). The
  Academy may also draw them as panel corner framing. Your call.

---

## 3. Visual reference (the live site is the anchor)

**Primary brand anchor**: feed the live site into your web-capture input:
**https://nczoning.net** (it loads in the default Night Corp theme). That rendered
page is the truest statement of the brand — spacing, glow, borders, type. Use it.

Supplementary targeted screenshots ship alongside this brief in
[`design-brief-assets/`](design-brief-assets/) for states a single capture misses:

- **[01-full-viewport.png](design-brief-assets/01-full-viewport.png)** — the whole
  interface: header with logo + `[SYSTEM_STATUS: NOMINAL]` status strip, sidebar
  section headers (`FILTER BY CATEGORY`, uppercase, cyan), category pills
  (NEW LOCATION = amber, OVERHAUL = cyan, OTHER = gray), frosted overlays panel,
  bottom control bar. This is your layout and colour bible.
- **[02-welcome-modal.png](design-brief-assets/02-welcome-modal.png)** — the boot
  gate. Cyan title bar `NIGHT CORP // INTERNAL ACCESS`, a terminal log
  (`> INITIALIZING...`, `> ACCESS GRANTED: INTERNAL_ACCESS_LEVEL_2`), body copy,
  amber dashed-border notices, a full-width `[ I ACKNOWLEDGE ]` button. **The
  Academy boot splash mirrors this exactly** (see view 1).
- **[03-mod-popup.png](design-brief-assets/03-mod-popup.png)** — a content card:
  image, category corner-tab, title with underline, cyan author badge, a tag pill,
  and cyan action buttons. Use its card treatment for course cards and lab panels.

---

## 4. The seven views

Build these seven views. The shell is a single-page app; navigation is internal.

### View 1 — Boot splash (skippable)
Mirrors the live welcome modal (screenshot 02). A typed terminal log boots the
terminal: `NIGHT CORP // URBAN PLANNING DIVISION`, `Terminal ID: NC-ACAD-01`,
`> ACCESS GRANTED: OPERATOR CLEARANCE LEVEL <n>`, a one-line mission, then
`[ ACCESS TERMINAL ]`. Typing animation is skippable (click/key) and disabled
under reduced motion. Leads to the dashboard.

### View 2 — Dashboard
Frosted **course cards** (one per course; the POC has one), each showing title,
subtitle, estimated time, and progress. A persistent **status bar** shows the
Operator's **clearance rank badge** and **eddies balance** (gold, `€$` prefix).
Selecting a course enters the module player.

### View 3 — Module player
A **left rail = the module map**: an ordered list of modules, each with a
**status LED** (see 5.2) and its clearance level. The main pane renders the
selected module through its anatomy, chunk by chunk, advanced with `[ CONTINUE ]`:
hook (terminal-log) → objectives (bracketed list) → chunks → lab → knowledge
check → war-story scenario → recap → field notes. At the end, a completion action
pays the module's eddies reward (see 5.3) and flips the LED to solid.

### View 4 — Lab runner
An embedded request/response console. Shows the request (`GET /v1/meta`), any
**editable fields** (e.g. an `If-None-Match` header), and a `[ TRANSMIT ]` button.
On transmit it shows the response: a **status line** (colour-coded: green 2xx,
amber 3xx, red 4xx/5xx), **headers of interest**, and **pretty-printed JSON body**.
A prominent **SIMULATION MODE** banner appears whenever the response is canned
(always, in preview). See 6.4 for how canned responses are selected.

### View 5 — Quiz and scenario interactions
Questions render as bracketed options. Four types: single-choice (`mcq`),
multi-select (`multi`), order-the-steps (`order`, with reorder controls), and
spot-the-wrong-statement (`spot-wrong`). On answer: **immediate per-option
feedback** with any citation links, a **green** treatment for correct and **red**
for wrong, and an **eddies credit or debit** (see 5.3). Scenarios are a terminal-log
situation followed by one question and a debrief.

### View 6 — Glossary
A searchable list of glossary terms with a **tier filter** (PROJECT vs GENERAL).
Each term shows its definition and citation links.

### View 7 — Progress / export
The Operator's record: clearance rank, module status LEDs, eddies balance,
earned stamps, and (on capstone completion) the **CERTIFIED** stamp. Provides
`[ EXPORT RECORD ]` and `[ IMPORT RECORD ]` (JSON download/upload of progress),
and a **print-friendly certificate view** for the capstone.

---

## 5. Interaction and gamification specs

### 5.1 Progress and persistence
All progress goes through a **single persistence adapter** (`Progress.*`) over
**one serializable, username-keyed progress object**. No view touches
`localStorage` directly, so login/resume, import/export, save-on-completion and
the certificate name all read one source of truth and cannot drift.

The progress object:
```json
{ "schemaVersion": "ncza:v1", "username": "…", "completedModules": [],
  "quiz": { "<questionId>": "correct|wrong" }, "eddies": 650, "stamps": [],
  "certified": false, "updatedAt": "…" }
```
The adapter interface: `Progress.setUser(name)`, `Progress.load()` (the current
user's object, or a fresh one), `Progress.save()`, `Progress.export()` (a JSON
string), `Progress.import(json)` (validate, replace, save), `Progress.listUsers()`.

**Keying and persistence**: when `persist` is true, store per user under
`ncza:v1:progress:<username>`, plus `ncza:v1:lastUser` for auto-resume on the next
visit. When `persist` is false (preview), the same object lives in memory only and
resets on reload. The boot screen's username **login is a named local profile, not
authentication** (anyone on the browser may pick any name); it is a convenience and
visibility layer, not access control. Because it all sits behind `Progress.*`, real
accounts can be added later by pointing the adapter at a Worker keyed by a
Cloudflare Access email, with no view changes.

### 5.2 Clearance, ranks and LEDs
- **Clearance ladder 1-9** with rank titles, supplied in the course JSON `ranks`.
  A module's `clearance` sets the level it awards. Show the current rank badge.
- **Status LED** per module: not-started = dim/hollow; in-progress = amber
  (blinking, blink disabled under reduced motion); complete = solid cyan (or
  green). **Never encode state by colour alone** — pair with shape/fill/label.

### 5.3 Eddies economy (in-game currency)
Config comes from the course JSON `economy` block: `symbol` (`€$`),
`startingBalance`, `moduleReward`, `rightReward`, `wrongPenalty`. Rules:
- **Correct** quiz/scenario answer: credit `rightReward` (quick green flash +
  floating `+€$ N`).
- **Wrong** answer: debit `wrongPenalty` (quick red flash + floating `-€$ N`).
- **Module completion**: credit `moduleReward` via the **in-game transfer
  animation** (below).
- **The balance may go negative** ("in debt to Night Corp"). Do not clamp it.

**The transfer animation** replicates the game's money-transfer UI, in two phases:
1. **Transferring** (red/crimson): a `TRANSFERRING FUNDS...` header, a filling
   progress bar, `CURRENT PROGRESS N %`, a warning glyph.
2. **Transfer** (amber/gold): switches to `TRANSFER   €$ <amount>` with a bright
   underline, and the running balance below **counting up** by the amount.
Both phases are monospace, uppercase, over a dark panel. Under reduced motion,
skip straight to the final numbers. (This is a distinctive, high-value moment —
give it care.)

### 5.4 Capstone
The capstone module carries `"capstone": true`. On completing it, show a
**CERTIFIED** stamp (green, stamped/rotated treatment) and enable the printable
certificate in view 7.

---

## 6. Data contract

### 6.1 What you consume
The shell loads **one course JSON document** (schema id `academy-course/v1`) and
renders it. In preview, render the inlined `SAMPLE_COURSE` (6.5). When hosted, the
shell fetches `courses/<config.course>.json`. You never validate or author content;
malformed content is the repo's problem, not the shell's. Render defensively
(missing optional fields are common).

### 6.2 Course shape (top level)
```jsonc
{
  "schemaVersion": "academy-course/v1",
  "id": "data-api",
  "title": "TRANSMISSION PROTOCOLS",
  "subtitle": "The NC Zoning Data API",
  "estMinutes": 120,
  "api": { "baseUrl": "https://api.nczoning.net", "rateLimit": "100 req / 10s / IP" },
  "economy": { "symbol": "€$", "startingBalance": 500, "moduleReward": 1000, "rightReward": 150, "wrongPenalty": 250 },
  "ranks": [ { "clearance": 1, "title": "PROBATIONARY OPERATOR" }, /* ...to 9 */ ],
  "glossary": [ { "term": "ETag", "tier": "general|project", "def": "…", "sources": [ /* see 6.3 */ ] } ],
  "resources": [ { "id": "mdn-etag", "label": "MDN: ETag header", "url": "https://…", "modules": ["m02"] } ],
  "modules": [ /* see 6.3 */ ]
}
```

### 6.3 Module shape
Every module renders in this fixed order. Every `chunk`, `lab`, quiz question and
`scenario` carries a `sources[]` array of citations you render as small links:
`{ "kind": "project|official", "label": "…", "url": "https://…" }`.

```jsonc
{
  "id": "m02", "order": 2, "title": "FRESHNESS DIRECTIVE",
  "subtitle": "HTTP caching, ETags & 304s",
  "clearance": 2, "estMinutes": 13, "reward": 1000, "capstone": false,
  "hook": { "type": "terminal-log", "lines": ["> …", "> …"] },
  "objectives": ["…", "…"],
  "chunks": [ /* 5 chunk types; see below */ ],
  "lab": { /* see 6.4 */ },
  "quiz": [ /* 4 question types; see below */ ],
  "scenario": { "id": "…", "title": "…", "situation": ["> …"],
                "question": { "type": "mcq", "prompt": "…", "options": [ /* … */ ] },
                "debrief": "…", "sources": [] },
  "recap": ["…", "…", "…"],
  "fieldNotes": { "glossaryTerms": ["ETag"], "resources": ["mdn-etag"], "renderCitations": true }
}
```

**Chunk types** (the `type` field): `text` (has `body`), `code` (has `body` +
`lang`), `table` (has `columns` + `rows`, `rows` is an array of string arrays,
optional caption `body`), `callout` (has `body` + `variant` one of
`info|warning|policy`), `terminal-log` (has `lines`). Bodies use **markdown-lite
only**: `**bold**`, `*italic*`, `` `code` ``, `[text](url)`. Render nothing else
(no headings/lists/images inside a body string).

**Question types** (the `type` field): `mcq` (single correct; `options[]` with
`text`/`correct`/`feedback`), `multi` (multiple correct), `order` (has `steps[]`,
the correct sequence; present shuffled and let the learner order them),
`spot-wrong` (an `mcq` where the "correct" option is the false statement).

### 6.4 Lab shape and canned selection
```jsonc
{
  "id": "m02-lab", "title": "CONDITIONAL RETRIEVAL", "briefing": "…", "steps": ["…"],
  "request": { "method": "GET", "path": "/v1/meta", "query": {}, "headers": { "If-None-Match": "" },
               "editable": ["headers.If-None-Match"] },
  "expected": { "status": [200, 304], "headersOfInterest": ["ETag", "Cache-Control"], "shapeHints": ["…"] },
  "canned": [
    { "when": "default", "status": 200, "headers": { "ETag": "\"…\"" }, "body": { /* … */ } },
    { "when": "if-none-match-matches", "status": 304, "headers": { "ETag": "\"…\"" }, "body": null }
  ],
  "debrief": "…", "sources": []
}
```
**In preview and whenever `liveMode` is false**, `[ TRANSMIT ]` returns a canned
entry, never a real fetch. Selection logic: start with the `when:"default"` entry;
if the learner set an editable field to a matching value, pick the corresponding
entry (e.g. `when:"if-none-match-matches"` when the `If-None-Match` field equals
the default entry's ETag; `when:"full=1"` when a `full` query field is `1`).
Show the **SIMULATION MODE** banner. A `body` of `null` means render "(no body)".

When hosted (`liveMode:true`), the lab performs the real request against
`config.apiBase + request.path`. Respect the API's rate limit; these labs are
single, spaced requests by design, never bursts.

### 6.5 Inlined SAMPLE_COURSE (build against this)
Ship the shell able to render this verbatim in preview (no fetch). It contains one
module exercising **every chunk type, a lab with a canned 200 and 304, and all
four question types**.

```js
window.SAMPLE_COURSE = {
  schemaVersion: "academy-course/v1",
  id: "sample", title: "TRANSMISSION PROTOCOLS", subtitle: "The NC Zoning Data API",
  estMinutes: 120,
  api: { baseUrl: "https://api.nczoning.net", rateLimit: "100 req / 10s / IP" },
  contentAudit: { projectCommit: "1bd41f5", auditedAt: "2026-07-06", auditNote: "Illustrative sample for the shell." },
  economy: { symbol: "€$", startingBalance: 500, moduleReward: 1000, rightReward: 150, wrongPenalty: 250 },
  ranks: [
    { clearance: 1, title: "PROBATIONARY OPERATOR" }, { clearance: 2, title: "OPERATOR" },
    { clearance: 9, title: "CERTIFIED FIELD OPERATOR" }
  ],
  glossary: [
    { term: "ETag", tier: "general", def: "An HTTP response header identifying a specific version of a resource.",
      sources: [ { kind: "official", label: "MDN - ETag", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag" } ] }
  ],
  resources: [
    { id: "mdn-etag", label: "MDN: ETag header", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag", modules: ["m02"] }
  ],
  modules: [{
    id: "m02", order: 2, title: "FRESHNESS DIRECTIVE", subtitle: "HTTP caching, ETags & 304s",
    clearance: 2, estMinutes: 13, reward: 1000,
    hook: { type: "terminal-log", lines: [
      "> NC-ACAD-01 // clearance check: LEVEL 2 granted",
      "> anomaly: client keeps re-downloading unchanged data",
      "> begin conditional-retrieval drill."
    ] },
    objectives: ["Trace a conditional GET end to end and produce a real 304", "Read Cache-Control: max-age plus stale-while-revalidate"],
    chunks: [
      { id: "c1", type: "text", heading: "The ETag is the content hash",
        body: "An **ETag** is an identifier for a specific version of a resource. Here it *is* the `dataset_version`, a fingerprint of the data. A stable ETag means nothing changed. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag).",
        sources: [ { kind: "official", label: "MDN - ETag", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag" } ] },
      { id: "c2", type: "code", lang: "http", heading: "The conditional handshake",
        body: "GET /v1/meta HTTP/1.1\nIf-None-Match: \"62eb...0ae3\"\n\nHTTP/1.1 304 Not Modified\nETag: \"62eb...0ae3\"\n(no body)",
        sources: [ { kind: "official", label: "MDN - 304", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304" } ] },
      { id: "c3", type: "table", heading: "Reading the Cache-Control line",
        columns: ["Directive", "Value", "Meaning"],
        rows: [ ["max-age", "300", "Fresh for 300 s after it was generated."],
                ["stale-while-revalidate", "3600", "May serve stale up to 3600 s while revalidating."] ],
        body: "So a client never blocks on a refresh.",
        sources: [ { kind: "official", label: "MDN - Cache-Control", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control" } ] },
      { id: "c4", type: "callout", variant: "warning", heading: "Two bodies must not share one ETag",
        body: "The slim and `?full=1` lists share a dataset, so the full variant's ETag gains a `-full` suffix. Same data, different shape, different ETag.",
        sources: [ { kind: "project", label: "worker/src/index.js L76-79", url: "https://github.com/spuddeh/nc-zoning-board/blob/1bd41f5/worker/src/index.js#L76-L79" } ] },
      { id: "c5", type: "terminal-log", heading: "Live readout",
        lines: [ "> GET /v1/meta  -> 200 OK  ETag \"62eb...0ae3\"", "> GET /v1/meta  If-None-Match match  -> 304 Not Modified" ],
        sources: [ { kind: "official", label: "MDN - Conditional requests", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests" } ] }
    ],
    lab: {
      id: "m02-lab", title: "CONDITIONAL RETRIEVAL",
      briefing: "TRANSMIT once to capture the ETag, then paste it into If-None-Match and TRANSMIT again for a 304.",
      steps: ["TRANSMIT with no If-None-Match", "Copy the ETag into If-None-Match", "TRANSMIT again"],
      request: { method: "GET", path: "/v1/meta", query: {}, headers: { "If-None-Match": "" }, editable: ["headers.If-None-Match"] },
      expected: { status: [200, 304], headersOfInterest: ["ETag", "Cache-Control"], shapeHints: ["a matching If-None-Match yields 304 with no body"] },
      canned: [
        { when: "default", status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600", "ETag": "\"62eb221ec48154cd1115b0d41992cefbf299735fa1b833183800000ab25e0ae3\"" },
          body: { schema: 1, generated_at: "2026-07-06T08:15:26.396Z", dataset_version: "62eb221ec48154cd1115b0d41992cefbf299735fa1b833183800000ab25e0ae3", data: { counts: { total: 291, manual: 282, auto: 9 }, discovery_stale: false, skipped: [] } } },
        { when: "if-none-match-matches", status: 304,
          headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600", "ETag": "\"62eb221ec48154cd1115b0d41992cefbf299735fa1b833183800000ab25e0ae3\"" },
          body: null }
      ],
      debrief: "The 304 carries the ETag and Cache-Control but no body. You moved a few header bytes instead of the whole dataset.",
      sources: [ { kind: "official", label: "MDN - 304", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304" } ]
    },
    quiz: [
      { id: "q1", type: "mcq", prompt: "Which field should a consumer watch to detect a change?",
        options: [ { text: "dataset_version", correct: true, feedback: "Correct: it is the content hash and the ETag value." },
                   { text: "generated_at", correct: false, feedback: "A timestamp can move without the data changing." } ],
        sources: [ { kind: "project", label: "worker/src/store.js L22-27", url: "https://github.com/spuddeh/nc-zoning-board/blob/1bd41f5/worker/src/store.js#L22-L27" } ] },
      { id: "q2", type: "multi", prompt: "Which appear ONLY in ?full=1? Select all.",
        options: [ { text: "description", correct: true, feedback: "Full only." },
                   { text: "credits", correct: true, feedback: "Full only." },
                   { text: "coordinates", correct: false, feedback: "In the slim list too." } ],
        sources: [ { kind: "official", label: "worker/openapi.json", url: "https://github.com/spuddeh/nc-zoning-board/blob/1bd41f5/worker/openapi.json" } ] },
      { id: "q3", type: "order", prompt: "Order the steps of a conditional GET.",
        steps: [ "Client GETs and receives 200 + ETag", "Client stores the ETag", "Client repeats with If-None-Match", "Server returns 304 if unchanged" ],
        sources: [ { kind: "official", label: "MDN - Conditional requests", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests" } ] },
      { id: "q4", type: "spot-wrong", prompt: "Which statement about a 304 is WRONG?",
        options: [ { text: "A 304 includes the full body.", correct: true, feedback: "Wrong: a 304 has no body." },
                   { text: "A 304 echoes the ETag.", correct: false, feedback: "True." },
                   { text: "A 304 still carries Cache-Control.", correct: false, feedback: "True." } ],
        sources: [ { kind: "official", label: "MDN - 304", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304" } ] }
    ],
    scenario: {
      id: "s1", title: "SIMULATED INCIDENT // CACHE-TTL OVERRIDE",
      situation: [ "> ticket: 'my submission still is not on the map after 3 minutes'", "> /v1/meta ETag unchanged; cron runs every 5 minutes" ],
      question: { type: "mcq", prompt: "Outage, or working as designed?",
        options: [ { text: "Working as designed: propagation is cron cadence plus cache freshness.", correct: true, feedback: "Correct. 3 minutes is inside the window." },
                   { text: "Outage: the ETag should change instantly.", correct: false, feedback: "The ETag only changes when the cron rebuilds." } ] },
      debrief: "Propagation is bounded by the 5-minute cron plus the cache window. Not an incident.",
      sources: [ { kind: "project", label: "worker/src/index.js L29-31", url: "https://github.com/spuddeh/nc-zoning-board/blob/1bd41f5/worker/src/index.js#L29-L31" } ]
    },
    recap: [ "The ETag is the content hash; If-None-Match yields a bodyless 304.", "max-age sets freshness; stale-while-revalidate serves stale while revalidating.", "Representations vary the ETag (the -full suffix)." ],
    fieldNotes: { glossaryTerms: ["ETag"], resources: ["mdn-etag"], renderCitations: true }
  }]
};
```

---

## 7. Runtime modes (hard constraint)

The shell reads a single global config object. **Implement it verbatim**:
```js
window.ACADEMY_CONFIG = {
  liveMode: false,                      // false = no network, canned labs only
  apiBase: "https://api.nczoning.net",  // used only when liveMode is true
  persist: false,                       // false = in-memory only, no localStorage
  course: "data-api"                    // course id to fetch when hosted
};
```
- **Preview (in your environment)**: `liveMode:false`, `persist:false`, and render
  the inlined `SAMPLE_COURSE`. **No `fetch()` of any kind. No `localStorage`.** The
  preview sandbox has neither; assume both are unavailable and the shell must still
  fully work (all labs canned, progress in memory).
- **Hosted (later, wired by the repo)**: the same shell is served with
  `liveMode:true`, `persist:true`, and it fetches `courses/<course>.json` and runs
  labs live. You do not build the hosting; just honour the flags.

Guard every fetch behind `liveMode`, every storage write behind `persist`, and
fall back to `SAMPLE_COURSE` if no course is available. A preview that tries to
fetch or touch storage will break in the sandbox.

---

## 8. Accessibility and responsive

- **Reduced motion**: `prefers-reduced-motion` disables scanlines, the typing
  animation, the LED blink, and the transfer count-up (jump to final values).
- **State never colour-only**: LEDs, correct/wrong, and status all pair colour with
  shape, icon, or text.
- **Keyboard operable**: the quiz (including order-the-steps reordering) and the lab
  (`[ TRANSMIT ]`, editable fields) work by keyboard, with visible focus states.
- **Responsive**: the module player's left rail collapses on narrow screens; wide
  content (code blocks, tables, JSON) scrolls inside its own container so the page
  never scrolls sideways. Use relative units.
- **Theme**: single committed dark Night Corp theme is correct here; this is a
  deliberately dark terminal world, not a light/dark toggle product.

---

## 9. Out of scope

No **server-side** authentication, no accounts, no backend, no analytics/telemetry,
and **no content-editing UI**. The shell renders course JSON; it never creates or
edits it. The boot-screen "login" is a **local username profile only** (see 5.1),
not real auth. Do not build a course authoring tool, a server, or a database.
Static hosting, progress in the browser.

---

## 10. Export

Deliver a **vanilla, no-build** static bundle (HTML/CSS/JS, assets inlined or
adjacent), so it can be dropped into the repo's `public/` and served by Cloudflare
Pages with no build step. Prefer the documented Design → Claude Code handoff
bundle; otherwise a zip or a standalone HTML file is fine. Do not require npm,
bundlers, or a framework build to run the output.

---

## 11. Radio (background audio engine)

The shell includes a Night Corp "radio": background 80s / lo-fi music generated
live in the browser with the Web Audio API (no audio files; every note is a
scheduled oscillator or noise burst). It ships a dial UI, a tempo-locked
visualizer, per-row mute/volume, station select and auto-cycle. Music/SFX volumes,
mute state and the current station persist in the Service Record (the progress
object / shard, see 5.1).

**Hard contract: stations are DATA, not code.** The engine must read its stations
from an **external source** — a `window.RADIO_STATIONS` array (loaded from a
separate `radio/stations.js` or `radio/stations.json`), never inline objects baked
into the engine. This keeps the synthesis engine generic and lets stations be
authored, validated and added in the repo without touching engine code, the same
way courses are data the shell renders.

Each station is one data object:
```jsonc
{ "id": "night-city-fm", "name": "NIGHT CITY FM", "frequency": "101.9",
  "genre": "Synthwave", "bpm": 70,
  "filterCutoff": 1200, "swing": 0.15, "crackle": 0.3,
  "chords": [ { "bass": "A2", "pad": ["A3","C#4","E4"], "lead": ["A4","E4"] } /* x4 */ ],
  "patterns": { "kick": [ /* 16 x 0|1 */ ], "snare": [], "clap": [], "hat": [] },
  "modes": { "bass": "sustain|deep|root8|eighths|funk",
             "lead": "arp|sparse|penta|bell", "pad": "gated|wash|stab|power" } }
```
Array order = dial order. In preview, ship the stations inline as the
`window.RADIO_STATIONS` global (works offline, no fetch); hosting reads the same
global from a repo file. **Division of labour**: Design owns the engine and the
radio UI; the station data is authored and validated in the repo (Claude Code)
against a `radio-station/v1` schema + validator. Keep realism **procedural** —
humanized timing and a synthesized-impulse convolution reverb are the levers; no
audio samples, to preserve the zero-asset property.

---

*Full course JSON, the JSON Schema, the validator and the authoring rulebook live
in the project repo and are intentionally not included here. You need only the
brand system, the seven views, the interaction specs, and the data contract with
the inlined `SAMPLE_COURSE` above.*
