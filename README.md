# NC Zoning Academy

A personal, single-user micro-module LMS for deeply understanding the
[NC Zoning Board](https://nczoning.net) map project's own systems, starting
with the **Data API** as the proof-of-concept course.

Night Corp branded throughout. Free, static, hosted on Cloudflare Pages. Course
content is authored as JSON; the app shell renders it. Future courses are new
JSON files, not a redesign.

> Status: **0.3.0.** The shell is a React + TypeScript + Vite app, rebuilt from
> the Claude Design monolith at verified parity. See [`CHANGELOG.md`](CHANGELOG.md).

## Repo layout

```text
index.html                 Vite entry: links the static global CSS + data globals
src/
  App.tsx                  routes, operator/record state, radio host, eddies economy
  views/                   Lock, Boot, Dashboard, Player, ServiceRecord, Admin
  components/              header, overlays, modals, music player, player primitives
  lib/                     academy (config/course/identity), sfx, player, types
                           messages (the read contract), admin (the write contract)
public/                    static passthrough, served as-is, never bundled
  assets/css/              theme.css (design tokens) + one stylesheet per view
  config.js                ACADEMY_CONFIG (hosted profile: live + persist)
  courses/
    index.json             course registry the shell loads
    data-api.json          the POC course (9 modules)
  radio/stations.js        window.RADIO_STATIONS: the 5-station dial
  radio-engine.js          procedural Web Audio synth (no audio files)
  progress.js              localStorage adapter (ncza:v1:*)
  _redirects               SPA fallback so deep links resolve
  _routes.json             which paths invoke a Function (/messages.json, /api/*)
functions/
  messages.json.ts         GET /messages.json: merges the two KV keys (503 if KV fails)
  api/messages.ts          admin API: GET/PUT/DELETE the KV keys, schema-validated
  api/_access.ts           Cloudflare Access JWT verification (the endpoint's own gate)
  tsconfig.json            Workers runtime types (separate from the app's)
schema/                    course, radio-station + messages JSON Schemas: the content contracts
scripts/                   ajv validators, freshness check, headless-browser harness
  seed-messages.json       SYSTEM BROADCAST seed: written to KV once, never read at runtime
docs/                      plan, app-shell overview, authoring guide, design-tokens, decisions/
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
the shared context and builds the radio engine; boot then inherits a running
context instead of playing silently. `/boot` is guarded: a refresh or a direct
hit redirects to `/`. Post-login routes redirect to `/` when signed out.

`/admin` sits outside all of that: no shell, no audio gate, no operator login,
because Cloudflare Access is its gate. See [Posting from `/admin`](#posting-from-admin).

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
`sources[]` are empty: a nudge toward the accuracy mandate below. CI runs
`validate` + `validate:radio` on any PR touching content; `freshness` runs
weekly.

## Content model

Each course is one `academy-course/v1` JSON document: metadata, a clearance-rank
ladder, a `contentAudit` block pinning the project SHA all claims were verified
against, a two-tier glossary, external resources, and an ordered list of
**modules**. Each module follows the approved anatomy: hook, objectives,
single-concept chunks, a live lab, a knowledge check, a war-story scenario,
recap, and field notes. See the schema for the full shape.

A course also carries a `changelog`, newest first, and each entry names the
modules whose taught content it changed. The shell renders that as a COURSE
REVISION LOG, and compares it against the version each module was certified at
to flag modules that have been rewritten under an operator who already cleared
them. Authoring rules for the list are in
[`docs/authoring-guide.md`](docs/authoring-guide.md) §12a.

## Announcements

The lock screen's SYSTEM BROADCAST panel fetches `/messages.json`. That path is
served by a Pages Function ([`functions/messages.json.ts`](functions/messages.json.ts)).
**Workers KV is the only runtime source.** Two keys, merged; an `ops` entry
shadows a `manual` one sharing an `id`:

| Source | Where | Goes live |
| --- | --- | --- |
| `messages:ops` | Workers KV | immediately (for a health check to write) |
| `messages:manual` | Workers KV | immediately (hand-written posts) |

There is no committed baseline underneath. `scripts/seed-messages.json` seeds
`messages:manual` once at setup (`npm run seed:messages`) so a fresh deployment
does not open on an empty panel; it is never read at runtime.

**Failure and emptiness are different answers.** Delete both keys and the
endpoint returns `200` with zero messages, so the panel hides, because that is
what the administrator meant. If KV is unreachable or holds unparseable JSON the
endpoint returns `503`, so the client falls back to the evergreen line inlined in
`Lock.tsx` rather than rendering a silently blank panel.

A message. **Every field is required.** There is no message worth broadcasting
that lacks one, and an omission only ever means the author forgot:

```json
{ "id": "b-2026-07-09", "level": "update", "date": "2026-07-09",
  "title": "ACADEMY ONLINE", "body": "…" }
```

| `level` | Colour | Ordering |
| --- | --- | --- |
| `alert` | amber | **pinned to the top**, above everything, regardless of date |
| `update` | cyan | by date, newest first |
| `resolved` | green | by date, newest first; ages out naturally |
| `info` | gray | by date, newest first |

Only `alert` pins. It does so by *level*, not date, so an unresolved incident can
never be the entry the four-item cap discards, and a bad timestamp cannot bury
it. `resolved` is its counterpart: the incident is over, so it stops pinning.

`date` takes `YYYY-MM-DD` or a full ISO 8601 datetime (a health check has one).
ISO strings compare lexicographically in chronological order, so a timestamp
sorts correctly against a bare date on the same day. Only the first ten
characters render.

### Posting

The KV namespace is bound as `MESSAGES` on the Pages project. **Adding a binding
does not affect existing deployments. Redeploy after you add one.** Seeding a
fresh deployment:

```bash
CLOUDFLARE_ACCOUNT_ID=<account> NCZA_MESSAGES_KV_ID=<id> npm run seed:messages
```

**Pin the account, do not let `wrangler` pick one.** Take the account id and the
namespace id from the Pages project that publishes `academy.nczoning.net`, not
from `wrangler kv namespace list`, which cannot tell you which account you are
looking at. This is written from experience: a second account once held a
namespace of the same name, the seed wrote to it and reported success, and the
live panel stayed empty. That duplicate is gone, but a write that lands in the
wrong place is indistinguishable from one that works, so the habit stays.

Posting by hand, which is now the fallback rather than the route (see the admin
API below):

```bash
npm run validate:messages -- payload.json          # check it BEFORE it goes live
npx wrangler kv key put --namespace-id=<id> messages:manual --path=payload.json --remote
npx wrangler kv key delete --namespace-id=<id> messages:ops --remote   # stand the key down
```

An incident's lifecycle runs through one key. Write the `alert` to
`messages:ops`; to stand it down, overwrite that key with the **same `id`** at
`level: "resolved"`, so the green banner replaces the amber one rather than
stacking beside it. Delete the key once it no longer matters. Never put both in
one payload: ids must be unique, and the validator rejects it.

`validate:messages` accepts a bare `[...]` array or `{ "messages": [...] }`, and
runs in CI against the seed file. KV values written by hand are **not** validated
by anything at runtime, so validate before you put. This panel is the first thing
a visitor reads: post only claims you can point at in the code.

### Posting from `/admin`

`academy.nczoning.net/admin` is the route an administrator actually uses,
including from a phone during an incident. It is a **form, not a JSON editor**:
pick a level, write a title and body, and the date fills itself in.

Two rules that were easy to forget are now enforced by the UI rather than by a
human:

- **Routing is implicit.** `alert` posts to `messages:ops`; every other level
  posts to `messages:manual`. That applies to new posts only.
- **Mark resolved rewrites the entry in place**, in the key it already lives in,
  reusing its `id`. Routing a resolved entry by level would move it to `manual`
  and leave the original alert alive in `ops`, where it shadows the same `id`
  and wins, so the amber banner would never change.

Both keys are listed and every entry is editable, **including ones an automated
writer created**: a health check writes `messages:ops`, and an operator can amend
its wording, resolve it or clear it without a shell. A key holding a value the
schema rejects is shown as such, with the raw value, so it can be cleared.

The page is standalone: no header, no radio, no operator login. The lock-screen
login is a named local profile rather than access control, so requiring it here
would be friction with no security value. Cloudflare Access is the gate.

### The admin API

`functions/api/messages.ts` is the writable door. Every payload is validated
against `schema/messages.schema.json` before it reaches KV, so validation stops
being a discipline and becomes a wall.

| Verb | Path | Does |
| --- | --- | --- |
| `GET` | `/api/messages` | Current state of **both** keys, unmerged |
| `PUT` | `/api/messages` | Write one key: `{ "key": "ops"\|"manual", "messages": [...] }` |
| `DELETE` | `/api/messages?key=ops` | Clear one key |

`GET` reports each key as `absent`, `ok`, or `invalid`. `invalid` is a state, not
an error: a direct `wrangler kv key put` can leave a value the endpoint would
never have accepted, and the administrator is exactly the person who needs to see
it and clear it.

Two ways the schema is enforced, one source. `scripts/validate-messages.mjs`
compiles it at runtime; the Function imports `functions/api/_messages-validator.mjs`,
compiled ahead of time by `npm run build:validator`, because the Workers runtime
forbids the `new Function` call Ajv needs. CI regenerates and diffs it. The rules
JSON Schema cannot express (unique ids, alert/resolved collisions, panel-capacity
warnings) live in `schema/messages-rules.mjs`, imported by both.

#### Access

The endpoint verifies the `Cf-Access-Jwt-Assertion` header **itself**, against
the team's JWKS. That is the defence, not defence in depth: an Access application
on `academy.nczoning.net` does not protect `nczoning-academy.pages.dev` or the
per-deployment preview URLs, which serve these same Functions. A second gate
rejects any request whose Host is not `ADMIN_HOST`.

Set on the Pages project (Settings > Variables and secrets), then **redeploy**:

| Variable | Value |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | `https://<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | The Access application's AUD tag |
| `ADMIN_HOST` | `academy.nczoning.net` |

Missing any of them is a `503`, never an allow.

The automated health check does **not** come through here. It writes
`messages:ops` directly with a scoped Cloudflare API token from GitHub Actions:
different writer, different door, no service token and no shared HTTP surface.

#### Working on it locally

You cannot obtain an Access JWT on localhost, so there is one bypass, and it
requires all three of: the deployment has **no** Access configuration, the Host is
loopback, and an explicit opt-in key exists in KV. The first condition is what
makes the others safe, since a Host header is caller-supplied.

```bash
npm run build
npx wrangler kv key put admin:dev-bypass 1 --namespace-id MESSAGES --local
npx wrangler pages dev dist --kv MESSAGES
```

It is a KV key rather than an environment variable because `wrangler pages dev`
(4.118) lists `.dev.vars` secrets and `--binding` values in its startup table but
does not deliver them to a Function's `env`. KV bindings do arrive.

Two more things about KV. Writes are eventually consistent, so a change can take
up to about a minute to appear at an edge that recently read the old value. And
`Lock.tsx` fetches once on mount, so an already-open tab needs a refresh.

## Accuracy mandate

Project claims are authored from the **real implementation** on the map repo's
`origin/main` (`worker/src/*`), cited file + line + commit SHA, never from wiki
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
