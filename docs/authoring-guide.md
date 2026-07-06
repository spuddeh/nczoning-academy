# NC Zoning Academy — Content Rulebook

The standard for every course and module. If a rule here conflicts with an old
module, the module is wrong; fix it. Keep this file updated as new rules are
agreed. The machine-checkable half of these rules lives in
[`schema/course.schema.json`](../schema/course.schema.json) and
[`scripts/validate-courses.mjs`](../scripts/validate-courses.mjs); this document
covers the judgement half.

## 1. Audience and floor

Two readers at once: the maintainer learning the system, and a **new
contributor being onboarded with no prior knowledge of it**.

- **Assume NO prior web/API knowledge.** Do not assume the reader knows what an
  API, endpoint, request, response, header, status code, cache, hash, or
  serverless function is. Introduce each from a plain baseline before using it.
- **Expand every acronym on first use**: API (Application Programming
  Interface), JSON (JavaScript Object Notation), DTO (Data Transfer Object), KV
  (key-value), CORS (Cross-Origin Resource Sharing), UUID, HTTP, ETag (entity
  tag), CDN, SHA-256, WAF, CI/CD, BFM (Bot Fight Mode), and so on.
- **Gloss project jargon** the first time it appears (RedData, envelope, slim vs
  full, auto-discovery, discovery_stale).
- Each module (or at least module 01) opens with a plain-language **"field
  manual" orientation** chunk that defines the baseline vocabulary it will use.
- Keep it lean. Define what the reader needs for this module, not an
  intro-to-everything.

## 2. Accuracy mandate (non-negotiable)

- **Project claims come only from the real implementation on `origin/main`**
  (`worker/src/*`, `worker/*.json`, workflows), never from the wiki, memory, or
  derived docs. Cite `file + line`, with the URL pinned to the audited **commit
  SHA** (never a moving branch).
- **General concepts are verified against official docs** (MDN,
  developers.cloudflare.com, docs.github.com, learn.openapis.org) at authoring
  time via a live fetch, and cited section-deep. Quote the doc's own defining
  sentence where practical.
- **Canned lab responses are captured from the real API**, not invented. Note
  the capture date.
- Every course carries a **`contentAudit`** block pinning the SHA all project
  claims were verified against. Re-audit when the API changes.
- If a claim cannot be sourced to `origin/main` (e.g. Cloudflare edge config
  like the rate limit), say so explicitly in-content and cite the next-best
  source (dashboard value or incident record), labelled as such.

## 3. Voice and writing style

- **Night Corp terminal voice**: bureaucratic-high-tech, clipped, in-world.
  Clearance levels, transmissions, field reports. Never break character into
  "in this lesson you will...".
- **en-US spelling** (Night Corp is an American corporation). No em dashes;
  use commas, colons, parentheses, or a rewrite. (Verbatim quotes from external
  docs keep their original punctuation.)
- **Markdown-lite only** in body text: `**bold**`, `*italic*`, `` `code` ``,
  `[link](url)`. No headings, lists, tables, or images inside a body string —
  use the dedicated chunk types for those.

## 4. Module anatomy (fixed order)

Hook (terminal-log cold open) → 2-3 bracketed objectives → 2-4 single-concept
chunks → live lab → knowledge check (quiz) → war-story scenario → recap
(3 bullets) → field notes (glossary terms + resources + citations).

Keep each chunk to one concept, roughly 90 seconds / 250 words.

### Chunk types and when to use each

| type | use for |
| --- | --- |
| `text` | prose explanation of one concept |
| `code` | a real request/response or code excerpt (set `lang`) |
| `table` | a small comparison (columns + rows) |
| `callout` | a boxed aside: `info` (aside), `warning` (gotcha), `policy` (a frozen rule) |
| `terminal-log` | an in-world log (hooks, scenario situations) |

## 5. The war-story test

A module's scenario earns its place only if ALL THREE hold:

1. It **hinges on the module's core concept** — getting the concept wrong is
   what causes the bad outcome.
2. The learner walks away with a **transferable rule** (a decision rule or
   failure mode), not trivia.
3. It is **grounded in real system behavior**, even if the specific event is
   constructed.

If no real incident fits, **construct one** that satisfies 1-3 (label it as
constructed in the debrief and cite the real behavior it rests on). Reject "an
interesting thing that happened" that fails the test. (Example of a failure:
the scrapped Nexus-v3 investigation — it was about Nexus's product, not our
contract, and taught no rule.)

## 6. Labs

- The request targets a real endpoint; the `canned` responses are captured
  live. Preview/Design runs on the canned data with a **SIMULATION MODE**
  banner; hosted, the same lab goes live.
- Expose one or two `editable` fields so the learner changes something real
  (a query flag, an `If-None-Match` header) and sees the effect.
- **Safety**: never author a lab that encourages bursts. The API has a WAF rule
  (100 requests / 10 s / IP). The 429 experience is canned by design; never
  drive the learner toward triggering it.

## 7. Knowledge checks

- Types: `mcq`, `multi` (select all), `order` (sequence), `spot-wrong` (pick the
  false statement).
- **Every option carries per-option feedback** that says why it is right or
  wrong; wrong-answer feedback teaches, it does not just say "no".
- Questions carry `sources[]` like everything else.

## 8. Citations

- Every chunk, lab, question, and scenario carries a `sources[]` array. The
  validator warns on empty content sources.
- `kind: "project"` → a `file + line` label and a GitHub blob URL pinned to the
  audited SHA. `kind: "official"` → a docs page, ideally deep-linked to the
  relevant section.

## 9. Gamification and economy

- **Clearance ladder 1-9** with rank titles (`ranks`); a module's `clearance`
  sets the level. Module map shows a status **LED** (never colour-only; pair
  with shape/label).
- **Eddies economy** (`economy`), in-game eurodollars, symbol `€$`:
  - `startingBalance` — a small signing balance.
  - `moduleReward` — credited on module completion, shown as the in-game
    two-phase money **TRANSFER** animation (red "TRANSFERRING FUNDS…" progress
    bar → amber "TRANSFER €$ N" with the balance counting up).
  - `rightReward` — credited per correct quiz/scenario answer (quick green flash
    + `+€$ N`).
  - `wrongPenalty` — debited per wrong answer (quick red flash + `-€$ N`).
  - **The balance may go negative** (in debt to Night Corp); do not clamp it.
- Capstone awards a **CERTIFIED** stamp + printable certificate.
- Current course values live in `economy` in the course JSON and are tunable in
  one place.

## 10. Two-tier glossary

- `tier: "project"` — terms specific to this system (envelope, dataset_version,
  slim list). `tier: "general"` — standard web terms (ETag, CORS, JSON).
- Define terms **in-body on first use as well**; do not rely on the glossary
  alone to carry a definition.

## 11. Before you commit a module

1. `npm run validate` is green with no warnings.
2. Every acronym is expanded on first use; a newcomer could follow it.
3. The scenario passes the war-story test.
4. Every claim resolves: project links to the SHA, official links load.
5. en-US, no em dashes.
