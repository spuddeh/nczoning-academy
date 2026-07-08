# NC Zoning Academy

A personal, single-user micro-module LMS for deeply understanding the
[NC Zoning Board](https://nczoning.net) map project's own systems — starting
with the **Data API** as the proof-of-concept course.

Night Corp branded throughout. Free, static, hosted on Cloudflare Pages (no
build step). Course content is authored as JSON; the app shell renders it.
Future courses are new JSON files, not a redesign.

> Status: **P1 scaffold.** The app shell (Claude Design) and full course content
> are authored in later phases — see [`docs/plan.md`](docs/plan.md).

## Repo layout

```text
public/                    Cloudflare Pages output dir (no build step)
  index.html               shell — scaffold placeholder, real shell wired in P5
  config.js                ACADEMY_CONFIG (hosted profile: live + persist)
  courses/
    index.json             course registry the shell loads
    data-api.json          POC course (placeholder until P2)
schema/course.schema.json  academy-course/v1 JSON Schema — the content contract
scripts/validate-courses.mjs   node validator (ajv) over public/courses/
docs/plan.md               the full execution plan (P1-P6)
.github/workflows/validate.yml   schema-validates courses on push / PR
```

## Commands

```bash
npm install            # once — installs ajv + ajv-formats
npm run validate       # validate every course in public/courses/ against the schema
```

The validator fails on schema errors and warns (non-fatally) when content
`sources[]` are empty — a nudge toward the accuracy mandate below.

## Content model

Each course is one `academy-course/v1` JSON document: metadata, a clearance-rank
ladder, a `contentAudit` block pinning the project SHA all claims were verified
against, a two-tier glossary, external resources, and an ordered list of
**modules**. Each module follows the approved anatomy — hook, objectives,
single-concept chunks, a live lab, a knowledge check, a war-story scenario,
recap, and field notes. See the schema and [`docs/plan.md`](docs/plan.md) for
the full shape.

## Accuracy mandate

Project claims are authored from the **real implementation** on the map repo's
`origin/main` (`worker/src/*`), cited file + line + commit SHA — never from wiki
mirrors or derived docs. Every general concept is verified against official docs
(MDN, developers.cloudflare.com, docs.github.com, learn.openapis.org) and cited
section-deep. Canned lab responses are captured from real API calls.

## Hosting

Cloudflare Pages, free tier, Git integration, output directory `public/`, no
build command. Preview environments (e.g. Claude Design) must override
`ACADEMY_CONFIG` to `liveMode:false` / `persist:false` and render inlined sample
data so the sandbox never fetches or writes storage.

## Licence and fan content

NC Zoning Academy is unofficial **fan content** made under CD PROJEKT RED's
[Fan Content Guidelines](https://www.cdprojektred.com/en/fan-content). It is
not affiliated with, endorsed by, or sponsored by CD PROJEKT RED. Cyberpunk,
Cyberpunk 2077 and related marks (including in-universe names such as Night
Corp) are trademarks of CD PROJEKT S.A.

Site typography includes [Night Corp Display](https://github.com/spuddeh/nc-type-foundry)
(SIL OFL 1.1).
