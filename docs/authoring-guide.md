# NC Zoning Academy: Content Rulebook

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
  docs keep their original punctuation.) `npm run validate` **fails** on any em
  dash anywhere in a course JSON, changelog and `contentAudit` prose included.
  There is deliberately no exemption flag: the verbatim-quote carve-out has
  never been used, so add the escape hatch the day a real quote needs it.
- **Markdown-lite only** in body text: `**bold**`, `*italic*`, `` `code` ``,
  `[link](url)`. No headings, lists, tables, or images inside a body string;
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

1. It **hinges on the module's core concept**: getting the concept wrong is
   what causes the bad outcome.
2. The learner walks away with a **transferable rule** (a decision rule or
   failure mode), not trivia.
3. It is **grounded in real system behaviour**, even if the specific event is
   constructed.

If no real incident fits, **construct one** that satisfies 1-3 (label it as
constructed in the debrief and cite the real behaviour it rests on). Reject "an
interesting thing that happened" that fails the test. (Example of a failure:
the scrapped Nexus-v3 investigation: it was about Nexus's product, not our
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
  - `startingBalance`: a small signing balance.
  - `moduleReward`: credited on module completion, shown as the in-game
    two-phase money **TRANSFER** animation (red "TRANSFERRING FUNDS…" progress
    bar → amber "TRANSFER €$ N" with the balance counting up).
  - `rightReward`: credited per correct quiz/scenario answer (quick green flash
    + `+€$ N`).
  - `wrongPenalty`: debited per wrong answer (quick red flash + `-€$ N`).
  - **The balance may go negative** (in debt to Night Corp); do not clamp it.
- Capstone awards a **CERTIFIED** stamp + printable certificate.
- Current course values live in `economy` in the course JSON and are tunable in
  one place.

## 10. Two-tier glossary

- `tier: "project"`: terms specific to this system (envelope, dataset_version,
  slim list). `tier: "general"`: standard web terms (ETag, CORS, JSON).
- Define terms **in-body on first use as well**; do not rely on the glossary
  alone to carry a definition. This constrains the PROSE, which must stand on
  its own. It does **not** mean a term the prose defines is barred from the
  glossary: the glossary is a lookup index consulted out of order, and the
  terms a reader forgets and re-checks are the load-bearing ones the course
  teaches hardest. Both, not either.
- **Every term needs a home module.** A glossary entry must appear in exactly
  one module's `fieldNotes.glossaryTerms` first: that is what declassifies it
  (see `docs/app-shell-overview.md`). A term listed by no module never becomes
  readable. List it in the module that first defines it in prose.
- **A definition is a lookup card, not a lesson.** One sentence saying what the
  thing is and where it lives; a second **only** for a constraint a reader could
  otherwise get wrong. Hard ceiling **200 characters**, enforced by
  `npm run validate`. Rationale, history, comparisons against other concepts and
  edge-case behaviour go in module prose.
  - Nine entries had drifted past this, up to 688 characters and five
    sentences. In every case but one the prose they had absorbed was *already*
    in the module; the card was duplicating the course, not carrying it. Check
    the module before you write a long definition: what you are about to explain
    is probably already explained.
  - Project terms are where this goes wrong. General terms have MDN to hand off
    to; project terms have nowhere, so the temptation is to pack the card. Send
    the reader to the module instead.
- **No markdown in definitions.** The glossary is plain prose throughout: no
  backticks, no bold. Field and header names read fine unadorned at this length.

## 11. Before you commit a module

1. `npm run validate` is green with no warnings.
2. Every acronym is expanded on first use; a newcomer could follow it.
3. The scenario passes the war-story test.
4. Every claim resolves: project links to the SHA, official links load.
5. en-US, no em dashes.

## 12. Staying current (re-audit procedure)

Code changes; the course must not silently rot. Three guards keep it honest:

- **Pinned commits.** `contentAudit.repos` lists every source repo and the exact
  commit its project claims were verified against. Every `kind: project`
  citation URL uses that commit SHA, never a moving branch. The course currently
  pins two repos: `spuddeh/nc-zoning-board` (worker + site) and
  `spuddeh/nc-zoning-core` (in-game consumer).
- **The freshness check.** `npm run freshness` (and the weekly
  `.github/workflows/freshness.yml`) asks GitHub which files changed on each
  pinned repo's default branch since its pinned commit, and flags any file the
  course actually cites, naming the modules that cite it. A cited file changing
  fails the run; that failure email is the "content may be stale" alarm. Files
  that changed but are not cited are ignored.
- **The audit-SHA agreement check.** `npm run validate` fails if a citation URL
  is pinned to anything other than its repo's `contentAudit` commit, or if a SHA
  written in `changelog` / `auditNote` prose next to a pin cue ("pinned",
  "commit", "verified against") disagrees with a real pin. It needs no network,
  so it runs on the PR rather than on the weekly cron. It exists because v2.1.0
  shipped a changelog claiming a `916caf1` pin while every other copy of that
  fact said `fef978a`.

When it reports STALE:
1. Read the diff of each flagged file (`gh api repos/<repo>/compare/<pinned>...<HEAD>`).
2. For each affected module, decide whether the change alters a claim, a line
   number, a canned response, or nothing teachable.
3. Update the affected content and re-capture any changed lab responses.
4. Re-pin: set the relevant `contentAudit.repos[].commit` (and `projectCommit`)
   to the new HEAD, and bump `auditedAt`.
5. Add the changelog entry, including its `modules` (see below).
6. `npm run validate` green, then commit.

### 12a. The changelog entry, and its `modules`

Every version bump adds a `changelog` entry: `version`, `date`, `changes[]`, and
`modules[]`. The shell renders all of it, and it uses `modules` to tell an
operator that something they already certified has been rewritten under them.
That marker is only as honest as this list.

**What goes in `modules`:** the ids whose TAUGHT CONTENT changed. A claim, an
objective, a recap line, a canned lab response, a quiz answer, a version string
the reader is shown.

**What does not:** a re-pin that moved citation URLs and line ranges but changed
no claim. This is not a technicality; it is most of the diff. When v2.3.0
re-pinned to `20fc456`, the raw JSON of all nine modules changed and exactly one
module's teaching did. Listing nine would have been eight false alarms against
one real change, and:

> a spurious alarm is worse than no alarm, because it trains the reader to
> dismiss it, and the one time it is real it looks identical

which is the map's own rule, quoted from its code in PERMANENT RECORD m06. The
Academy does not get to teach it and then break it.

`"modules": []` is a legitimate, complete answer. `d1-database` v1.0.1 is
exactly that: every citation re-pinned, no claim touched.

**How to decide, rather than guess.** Diff the two versions of the course file
with the citation SHAs normalised away, and read what is left:

```sh
git show <before>:public/courses/<id>.json > /tmp/before.json
# then diff module-by-module, ignoring /sources/*/url and /sources/*/label
```

Every leaf that is not a citation is a candidate; judge each one against "would
a reader who certified this module now hold a wrong answer, or miss something
they were taught?" That is the bar, not "did any byte change".

`npm run validate` checks that every id exists, that the current `version` has
an entry, and that entries are unique and newest-first. It deliberately does NOT
check that the list is complete: completeness is the judgement above, and a
validator that guessed it would be back to flagging all nine.

If a repo only moved but no cited file changed, re-pin at your convenience.

